import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import * as admin from "firebase-admin";
import {SecretVersionReferenceGuard} from "../shared/secretVersionReference";
import {HttpsError} from "firebase-functions/v2/https";
import {operationContentHash} from "../operations/durableActions";
import type {OrganizerMessageTemplateDocument} from
  "../shared/generated/firestoreAdminTypes";
import {BRAND_ORIGIN_PATTERN} from "../shared/generated/brand";

const inviteButtonUrlPattern =
  new RegExp(`^${BRAND_ORIGIN_PATTERN}/invite/\\{\\{1\\}\\}/?$`, "u");

export interface MetaWhatsappConfig {
  appId: string;
  appSecret: string;
  configId: string;
  graphVersion: string;
}

export interface MetaPhoneMetadata {
  id: string;
  businessId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  qualityRating: OrganizerMessageTemplateDocument["status"] | string | null;
  messagingLimitTier: string | null;
}

export interface MetaTemplateSnapshot {
  providerTemplateId: string;
  name: string;
  language: string;
  category: OrganizerMessageTemplateDocument["category"];
  status: OrganizerMessageTemplateDocument["status"];
  variableNames: string[];
  parameterBindings: Array<{
    variableName: string;
    component: "header" | "body" | "button";
    position: number;
    buttonIndex: number | null;
  }>;
  hasMediaHeader: boolean;
  buttonKinds: OrganizerMessageTemplateDocument["buttonKinds"];
  buttonLabels?: Array<string | null>;
  parameterFormat?: "NAMED" | "POSITIONAL" | "UNKNOWN";
  buttonUrls?: Array<string | null>;
  contentHash?: string;
}

export interface MetaQuickReplyPayload {
  buttonIndex: number;
  label: string;
  payload: string;
}

export interface MetaSendResult {
  providerMessageId: string;
}

export class MetaProviderError extends Error {
  constructor(
    message: string,
    readonly providerCode: number | null,
    readonly httpStatus: number | null,
    readonly disposition: "requestNotSent" | "outcomeUnknown" =
    "outcomeUnknown",
  ) {
    super(message);
  }
}

export class OrganizerTokenStore {
  constructor(
    private readonly client = new SecretManagerServiceClient(),
    private readonly secretId = (
      process.env.ORGANIZER_WHATSAPP_TOKEN_SECRET_ID ??
        "ORGANIZER_WHATSAPP_ACCESS_TOKENS"
    ),
    private readonly references = new SecretVersionReferenceGuard(),
  ) {}

  async store(params: {
    organizerId: string;
    connectionId: string;
    accessToken: string;
  }): Promise<string> {
    const projectId =
      process.env.GCLOUD_PROJECT ?? admin.app().options.projectId;
    if (!projectId) throw new Error("Firebase project id is unavailable.");
    const secretResource = `projects/${projectId}/secrets/${this.secretId}`;
    const credential = JSON.stringify({
      schema: "catch.organizer-whatsapp-token/v1",
      organizerId: params.organizerId,
      connectionId: params.connectionId,
      accessToken: params.accessToken,
    });
    const [version] = await this.client.addSecretVersion({
      parent: secretResource,
      payload: {data: Buffer.from(credential, "utf8")},
    });
    if (!version.name) throw new Error("Secret Manager returned no version.");
    await this.references.assert(version.name, this.secretId);
    return version.name;
  }

  async access(versionResource: string): Promise<string> {
    await this.references.assert(versionResource, this.secretId);
    const [version] = await this.client.accessSecretVersion({
      name: versionResource,
    });
    const value = version.payload?.data?.toString("utf8") ?? "";
    const credential = parseStoredCredential(value);
    if (!credential.accessToken) {
      throw new Error("Organizer sender credential is empty.");
    }
    return credential.accessToken;
  }

  async disable(versionResource: string): Promise<void> {
    await this.references.assert(versionResource, this.secretId);
    await this.client.disableSecretVersion({name: versionResource});
  }

  /** New dispatches require a pinned version and its exact sender envelope. */
  async accessBound(params: {
    versionResource: string; organizerId: string; connectionId: string;
  }): Promise<string> {
    try {
      await this.references.assert(params.versionResource, this.secretId);
      if (!params.organizerId || !params.connectionId) {
        throw new Error("Invalid credential scope");
      }
      const [version] = await this.client.accessSecretVersion({
        name: params.versionResource,
      });
      const data = version.payload?.data;
      if (!data || data.length > 8192) throw new Error("Invalid credential");
      const value = recordValue(JSON.parse(data.toString("utf8")));
      if (Object.keys(value).sort().join(",") !==
          "accessToken,connectionId,organizerId,schema" ||
          value.schema !== "catch.organizer-whatsapp-token/v1" ||
          value.organizerId !== params.organizerId ||
          value.connectionId !== params.connectionId ||
          typeof value.accessToken !== "string" ||
          value.accessToken.length < 1 || value.accessToken.length > 4096 ||
          /\s/u.test(value.accessToken)) {
        throw new Error("Invalid credential binding");
      }
      return value.accessToken;
    } catch {
      throw new Error("Organizer sender credential unavailable.");
    }
  }
}

function parseStoredCredential(value: string): {accessToken: string} {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return {
      accessToken: typeof parsed.accessToken === "string" ?
        parsed.accessToken : "",
    };
  } catch {
    // Accept the original raw-token versions during the vault migration.
    return {accessToken: value};
  }
}

/** Narrow Meta Graph adapter. Access tokens never enter logs or Firestore. */
export class MetaWhatsappProvider {
  constructor(
    private readonly config: MetaWhatsappConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly clock: () => number = Date.now,
  ) {}

  async exchangeAuthorizationCode(code: string): Promise<string> {
    const url = this.graphUrl("oauth/access_token");
    url.searchParams.set("client_id", this.config.appId);
    url.searchParams.set("client_secret", this.config.appSecret);
    url.searchParams.set("code", code);
    const body = await this.requestJson(url, {method: "GET"});
    const accessToken = stringValue(body.access_token);
    if (!accessToken) {
      throw new MetaProviderError(
        "Meta authorization did not return an access token.",
        null,
        null,
      );
    }
    return accessToken;
  }

  async verifyAndSubscribe(params: {
    accessToken: string;
    wabaId: string;
    phoneNumberId: string;
    businessId?: string | null;
  }): Promise<MetaPhoneMetadata> {
    const waba = await this.authorizedRequest(
      params.wabaId,
      params.accessToken,
      {method: "GET", query: {fields: "id,owner_business_info"}},
    );
    const ownerBusinessId = stringValue(
      recordValue(waba.owner_business_info).id,
    );
    if (
      ownerBusinessId &&
      params.businessId &&
      ownerBusinessId !== params.businessId
    ) {
      throw new HttpsError(
        "failed-precondition",
        "The selected WhatsApp account does not belong to the selected " +
          "business.",
      );
    }
    const phoneList = await this.authorizedRequest(
      `${params.wabaId}/phone_numbers`,
      params.accessToken,
      {
        method: "GET",
        query: {fields: "id", limit: "100"},
      },
    );
    const phoneIds = arrayValue(phoneList.data).map((item) =>
      stringValue(recordValue(item).id),
    );
    if (!phoneIds.includes(params.phoneNumberId)) {
      throw new HttpsError(
        "failed-precondition",
        "The selected phone number does not belong to the selected " +
          "WhatsApp account.",
      );
    }
    await this.authorizedRequest(
      `${params.wabaId}/subscribed_apps`,
      params.accessToken,
      {method: "POST"},
    );
    const phone = await this.authorizedRequest(
      params.phoneNumberId,
      params.accessToken,
      {
        method: "GET",
        query: {
          fields:
            "id,display_phone_number,verified_name,quality_rating," +
            "messaging_limit_tier",
        },
      },
    );
    return {
      id: params.phoneNumberId,
      businessId: ownerBusinessId ?? params.businessId ?? null,
      displayPhoneNumber: stringValue(phone.display_phone_number),
      verifiedName: stringValue(phone.verified_name),
      qualityRating: stringValue(phone.quality_rating),
      messagingLimitTier: stringValue(phone.messaging_limit_tier),
    };
  }

  async listTemplates(params: {
    accessToken: string;
    wabaId: string;
  }): Promise<MetaTemplateSnapshot[]> {
    const first = this.graphUrl(`${params.wabaId}/message_templates`);
    first.searchParams.set(
      "fields",
      "id,name,language,status,category,components,parameter_format",
    );
    first.searchParams.set("limit", "200");
    let next: URL | null = first;
    const templates: MetaTemplateSnapshot[] = [];
    for (let page = 0; next && page < 5; page += 1) {
      const body = await this.requestJson(next, {
        method: "GET",
        headers: {Authorization: `Bearer ${params.accessToken}`},
      });
      if (!Array.isArray(body.data)) {
        throw new MetaProviderError("Invalid Meta template inventory.",
          null, null);
      }
      for (const item of arrayValue(body.data)) {
        const parsed = parseTemplate(recordValue(item));
        if (parsed) templates.push(parsed);
      }
      const nextValue = stringValue(recordValue(body.paging).next);
      next = nextValue ? this.safePagingUrl(nextValue) : null;
    }
    return templates.slice(0, 200);
  }

  async sendTemplate(params: {
    accessToken: string;
    phoneNumberId: string;
    toE164: string;
    template: MetaTemplateSnapshot;
    variables: Record<string, string>;
    quickReplyPayloads?: MetaQuickReplyPayload[];
    callbackData?: string;
    deadline?: number;
  }): Promise<MetaSendResult> {
    assertRecipient(params.toE164);
    const components = renderComponents(params.template, params.variables);
    if (params.quickReplyPayloads !== undefined) {
      components.push(...renderQuickReplies(
        params.template, params.quickReplyPayloads,
      ));
    }
    assertCallbackData(params.callbackData);
    const body = await this.authorizedRequest(
      `${params.phoneNumberId}/messages`,
      params.accessToken,
      {
        method: "POST",
        deadline: params.deadline,
        maxResponseBytes: 8192,
        body: {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: params.toE164.slice(1),
          type: "template",
          ...(params.callbackData === undefined ? {} :
            {biz_opaque_callback_data: params.callbackData}),
          template: {
            name: params.template.name,
            language: {code: params.template.language},
            ...(components.length === 0 ? {} : {components}),
          },
        },
      },
    );
    return parseSendResult(body);
  }

  async sendText(params: {
    accessToken: string;
    phoneNumberId: string;
    toE164: string;
    body: string;
    deadline?: number;
  }): Promise<MetaSendResult> {
    assertRecipient(params.toE164);
    const response = await this.authorizedRequest(
      `${params.phoneNumberId}/messages`,
      params.accessToken,
      {
        method: "POST",
        deadline: params.deadline,
        maxResponseBytes: 8192,
        body: {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: params.toE164.slice(1),
          type: "text",
          text: {preview_url: false, body: params.body},
        },
      },
    );
    return parseSendResult(response);
  }

  async unsubscribe(params: {
    accessToken: string;
    wabaId: string;
  }): Promise<void> {
    await this.authorizedRequest(
      `${params.wabaId}/subscribed_apps`,
      params.accessToken,
      {method: "DELETE"},
    );
  }

  private async authorizedRequest(
    path: string,
    accessToken: string,
    options: {
      method: "GET" | "POST" | "DELETE";
      query?: Record<string, string>;
      body?: Record<string, unknown>;
      deadline?: number;
      maxResponseBytes?: number;
    },
  ): Promise<Record<string, unknown>> {
    const url = this.graphUrl(path);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      url.searchParams.set(key, value);
    }
    return this.requestJson(url, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.body ? {"Content-Type": "application/json"} : {}),
      },
      ...(options.body ? {body: JSON.stringify(options.body)} : {}),
    }, options.deadline, options.maxResponseBytes);
  }

  private graphUrl(path: string): URL {
    if (!/^v[1-9][0-9]*\.[0-9]+$/u.test(this.config.graphVersion) ||
        /\s/u.test(this.config.graphVersion) ||
        !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/u.test(path) ||
        /\s/u.test(path)) {
      throw new MetaProviderError("Invalid Meta request path.", null, null,
        "requestNotSent");
    }
    return new URL(
      `https://graph.facebook.com/${this.config.graphVersion}/${path}`,
    );
  }

  private safePagingUrl(value: string): URL {
    try {
      const url = new URL(value);
      if (url.origin !== "https://graph.facebook.com" ||
          url.username || url.password || url.hash) {
        throw new Error("Unsafe URL");
      }
      return url;
    } catch {
      throw new MetaProviderError("Unsafe Meta pagination URL.", null, null);
    }
  }

  private async requestJson(
    url: URL,
    init: RequestInit,
    deadline?: number,
    maxResponseBytes = 2 * 1024 * 1024,
  ): Promise<Record<string, unknown>> {
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0 || (deadline !== undefined &&
        (!Number.isSafeInteger(deadline) || now >= deadline))) {
      throw new MetaProviderError("Meta dispatch deadline expired.", null,
        null, "requestNotSent");
    }
    let response: Response;
    let body: Record<string, unknown>;
    try {
      response = await this.fetchImpl(url, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(Math.min(15_000,
          deadline === undefined ? 15_000 : deadline - now)),
      });
    } catch {
      throw new MetaProviderError(
        "Meta request outcome is unknown.",
        null,
        null,
      );
    }
    try {
      const parsed = JSON.parse(await boundedResponse(response,
        maxResponseBytes));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid response");
      }
      body = parsed;
    } catch {
      throw new MetaProviderError("Invalid Meta response.", null,
        response.status);
    }
    if (!response.ok || body.error) {
      const error = recordValue(body.error);
      throw new MetaProviderError(
        `Meta request failed (${response.status}).`,
        numberValue(error.code),
        response.status,
      );
    }
    return body;
  }
}

export function metaTemplateFromDocument(
  template: OrganizerMessageTemplateDocument,
): MetaTemplateSnapshot {
  return {...template};
}

function renderComponents(
  template: MetaTemplateSnapshot,
  variables: Record<string, string>,
): Array<Record<string, unknown>> {
  const groups = new Map<string, typeof template.parameterBindings>();
  for (const binding of template.parameterBindings) {
    const key = `${binding.component}|${binding.buttonIndex ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), binding]);
  }
  return [...groups.entries()].map(([key, bindings]) => {
    const [component, buttonIndex] = key.split("|");
    const sorted = [...bindings].sort((a, b) => a.position - b.position);
    return {
      type: component,
      ...(component === "button" ?
        {sub_type: "url", index: buttonIndex} :
        {}),
      parameters: sorted.map((binding) => ({
        type: "text",
        text: requiredVariable(variables, binding.variableName),
        ...(template.parameterFormat === "NAMED" && component !== "button" ?
          {parameter_name: binding.variableName} : {}),
      })),
    };
  });
}

function requiredVariable(
  variables: Record<string, string>,
  variableName: string,
): string {
  const value = variables[variableName];
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError(
      "failed-precondition",
      `Template variable ${variableName} is missing.`,
    );
  }
  return value;
}

function parseTemplate(
  item: Record<string, unknown>,
): MetaTemplateSnapshot | null {
  const providerTemplateId = stringValue(item.id);
  const name = stringValue(item.name);
  const language = stringValue(item.language);
  if (!providerTemplateId || !name || !language) return null;
  const bindings: MetaTemplateSnapshot["parameterBindings"] = [];
  const buttonKinds: MetaTemplateSnapshot["buttonKinds"] = [];
  const buttonLabels: Array<string | null> = [];
  const buttonUrls: Array<string | null> = [];
  let hasMediaHeader = false;
  for (const rawComponent of arrayValue(item.components)) {
    const component = recordValue(rawComponent);
    const type = (stringValue(component.type) ?? "").toUpperCase();
    if (type === "HEADER" && stringValue(component.format) !== "TEXT") {
      hasMediaHeader = true;
    }
    if (type === "BUTTONS") {
      arrayValue(component.buttons).forEach((rawButton, buttonIndex) => {
        const button = recordValue(rawButton);
        const kind = normalizeButtonKind(stringValue(button.type));
        buttonKinds.push(kind);
        const label = stringValue(button.text);
        buttonLabels.push(label && label.length <= 1024 ? label : null);
        const url = stringValue(button.url);
        buttonUrls.push(url && url.length <= 2048 ? url : null);
        if (kind === "URL") {
          urlButtonParameters(button, buttonIndex).forEach(
            (variableName, position) => {
              bindings.push({
                variableName,
                component: "button",
                position,
                buttonIndex,
              });
            },
          );
        }
      });
      continue;
    }
    if (type !== "HEADER" && type !== "BODY") continue;
    const componentName = type.toLocaleLowerCase("en") as "header" | "body";
    const names = namedParameters(component.example, componentName);
    names.forEach((variableName, position) =>
      bindings.push({
        variableName,
        component: componentName,
        position,
        buttonIndex: null,
      }),
    );
  }
  const dedupedNames = [...new Set(bindings.map((item) => item.variableName))];
  return {
    providerTemplateId,
    name,
    language,
    category: normalizeCategory(stringValue(item.category)),
    status: normalizeTemplateStatus(stringValue(item.status)),
    variableNames: dedupedNames,
    parameterBindings: bindings,
    hasMediaHeader,
    buttonKinds,
    buttonLabels,
    buttonUrls,
    contentHash: operationContentHash([providerTemplateId, name, language,
      item.category ?? null, item.parameter_format ?? null,
      item.components ?? null]),
    parameterFormat: item.parameter_format === "NAMED" ||
      item.parameter_format === "POSITIONAL" ? item.parameter_format :
      "UNKNOWN",
  };
}

function urlButtonParameters(
  button: Record<string, unknown>,
  buttonIndex: number,
): string[] {
  const url = stringValue(button.url) ?? "";
  if (inviteButtonUrlPattern.test(url)) {
    return ["invite_token"];
  }
  const named = namedParameters(button.example);
  if (named.length > 0) return named;
  const examples = arrayValue(button.example);
  return /\{\{\d+\}\}/u.test(url) || examples.length > 0 ?
    [`button_${buttonIndex + 1}_url`] :
    [];
}

function namedParameters(value: unknown,
  component: "header" | "body" = "body"): string[] {
  const example = recordValue(value);
  const named = arrayValue(example[`${component}_text_named_params`])
    .map((item) => stringValue(recordValue(item).param_name))
    .filter((item): item is string => item !== null);
  if (named.length > 0) return named;
  const positional = component === "body" ?
    arrayValue(example.body_text)[0] : example.header_text;
  return arrayValue(positional).map((_, index) => `${component}_${index + 1}`);
}

function renderQuickReplies(template: MetaTemplateSnapshot,
  replies: MetaQuickReplyPayload[]): Array<Record<string, unknown>> {
  const slots = template.buttonKinds.flatMap((kind, index) =>
    kind === "QUICK_REPLY" ? [index] : []);
  if (!Array.isArray(replies) || replies.length < 1 || replies.length > 10 ||
      replies.length !== slots.length ||
      template.buttonLabels?.length !== template.buttonKinds.length ||
      (template.parameterBindings.length > 0 &&
        template.parameterFormat !== "NAMED" &&
        template.parameterFormat !== "POSITIONAL")) {
    throw new HttpsError("failed-precondition",
      "Template reply metadata is unavailable.");
  }
  const used = new Set<number>();
  const payloads = new Set<string>();
  return replies.map((reply) => {
    if (!Number.isInteger(reply.buttonIndex) ||
        !slots.includes(reply.buttonIndex) || used.has(reply.buttonIndex) ||
        typeof reply.label !== "string" || !reply.label.trim() ||
        reply.label !== template.buttonLabels?.[reply.buttonIndex] ||
        typeof reply.payload !== "string" || !reply.payload.trim() ||
        reply.payload.length > 1024 || payloads.has(reply.payload) ||
        template.parameterBindings.some((b) =>
          b.component === "button" && b.buttonIndex === reply.buttonIndex)) {
      throw new HttpsError("failed-precondition",
        "Native reply does not match the approved template button.");
    }
    used.add(reply.buttonIndex);
    payloads.add(reply.payload);
    return {type: "button", sub_type: "quick_reply",
      index: String(reply.buttonIndex),
      parameters: [{type: "payload", payload: reply.payload}]};
  });
}

function assertRecipient(value: string): void {
  if (!/^\+[1-9][0-9]{6,14}$/u.test(value) || /\s/u.test(value)) {
    throw new MetaProviderError("Invalid WhatsApp recipient.", null, null,
      "requestNotSent");
  }
}

function parseSendResult(body: Record<string, unknown>): MetaSendResult {
  const messages = arrayValue(body.messages);
  const providerMessageId = stringValue(recordValue(messages[0]).id);
  if (messages.length !== 1 || !providerMessageId ||
      providerMessageId.length > 512 || /\s/u.test(providerMessageId)) {
    throw new MetaProviderError("Meta returned no unique message identifier.",
      null, null);
  }
  return {providerMessageId};
}

function assertCallbackData(value: string | undefined): void {
  if (value !== undefined && (typeof value !== "string" ||
      value.length < 1 || value.length > 512 || !value.trim())) {
    throw new MetaProviderError("Invalid WhatsApp callback data.", null, null,
      "requestNotSent");
  }
}

async function boundedResponse(response: Response,
  maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing Meta response body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw new Error("Oversized Meta response");
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function normalizeCategory(
  value: string | null,
): OrganizerMessageTemplateDocument["category"] {
  return ["MARKETING", "UTILITY", "AUTHENTICATION"].includes(value ?? "") ?
    (value as OrganizerMessageTemplateDocument["category"]) :
    "UNKNOWN";
}

function normalizeTemplateStatus(
  value: string | null,
): OrganizerMessageTemplateDocument["status"] {
  return [
    "APPROVED",
    "PENDING",
    "REJECTED",
    "PAUSED",
    "DISABLED",
    "DELETED",
  ].includes(value ?? "") ?
    (value as OrganizerMessageTemplateDocument["status"]) :
    "UNKNOWN";
}

function normalizeButtonKind(
  value: string | null,
): OrganizerMessageTemplateDocument["buttonKinds"][number] {
  return ["URL", "PHONE_NUMBER", "QUICK_REPLY", "COPY_CODE"].includes(
    value ?? "",
  ) ?
    (value as OrganizerMessageTemplateDocument["buttonKinds"][number]) :
    "UNKNOWN";
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ?
    (value as Record<string, unknown>) :
    {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
