import {parseSmsCredentials, type SmsCredentials,
  GupshupSmsTransport,
  type SmsSubmissionOutcome,
} from "../../platform/delivery/gupshupSmsTransport";
export {parseSmsCredentials, type SmsCredentials} from
  "../../platform/delivery/gupshupSmsTransport";
import {SecretVersionReferenceGuard} from "../../shared/secretVersionReference";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {operationContentHash} from "../../operations/durableActions";
import type {LiveDispatchPermit} from "./messageOutbox";
import type {RenderedSms, SmsConfig} from "./smsProtocol";
import {parseSmsConfig, smsEndpointId} from "./smsProtocol";
import {smsSegments} from "../../platform/delivery/smsSegments";
import {parseDeliveryAttempt} from "./messageProtocol";
import {
  smsProviderCorrelation,
  smsReportTokenHash,
} from "../../platform/delivery/smsReportCredentials";

export type {SmsSubmissionOutcome} from
  "../../platform/delivery/gupshupSmsTransport";
export {parseGupshupSubmission} from
  "../../platform/delivery/gupshupSmsTransport";

/** Exact numbered secret version; no token is stored in an outbox or error. */
export class SmsCredentialStore {
  constructor(
    private readonly client = new SecretManagerServiceClient(),
    private readonly references = new SecretVersionReferenceGuard(),
  ) {}

  async access(config: SmsConfig): Promise<SmsCredentials> {
    parseSmsConfig(config);
    try {
      await this.references.assert(
        config.credentialVersion,
        /^[A-Za-z0-9_-]+$/u,
      );
      const [version] = await this.client.accessSecretVersion({
        name: config.credentialVersion,
      });
      const data = version.payload?.data;
      if (!data || data.length > 8192) {
        throw new Error("Invalid credential");
      }
      return parseSmsCredentials(
        JSON.parse(data.toString("utf8")),
        config.senderId,
      );
    } catch {
      throw new Error("SMS sender credential unavailable");
    }
  }
}

/** HTTPS POST only. A lost response never triggers another submission here. */
export class GupshupSmsProvider {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly clock: () => number = Date.now,
  ) {}

  async send(input: {
    permit: LiveDispatchPermit;
    config: SmsConfig;
    credentials: SmsCredentials;
    phoneE164: string;
    rendered: RenderedSms;
    reportToken: string;
  }): Promise<SmsSubmissionOutcome> {
    const {permit, config, credentials, phoneE164, rendered} = input;
    parseSmsConfig(config);
    parseSmsCredentials(credentials, config.senderId);
    smsReportTokenHash(input.reportToken);
    parseDeliveryAttempt(permit.attempt);
    const binding = permit.attempt.binding;
    if (
      permit.intent.context.mode !== "live" ||
      permit.attempt.mode !== "live" ||
      binding.routeId !== "catchEventSms" ||
      binding.provider !== "gupshup" ||
      binding.senderId !== config.senderId ||
      binding.bindingRevision !== config.revision ||
      binding.fallbackOwner !== "catch" ||
      binding.recipientEndpointId !==
        smsEndpointId(
          permit.intent.context,
          permit.intent.attendeeId,
          phoneE164,
        ) ||
      permit.attempt.state.kind !== "unknown" ||
      !/^\+91[6-9][0-9]{9}$/.test(phoneE164)
    ) {
      throw new Error("SMS submission does not match its dispatch permit");
    }
    const approved = config.templates.find(
      (t) =>
        t.templateId === rendered.template.templateId &&
        t.status === "approved",
    );
    const length = smsSegments(rendered.text);
    if (
      !approved ||
      operationContentHash(approved) !==
        operationContentHash(rendered.template) ||
      length.encoding !== rendered.encoding ||
      length.segments !== rendered.segments ||
      length.units !== rendered.units ||
      length.segments > config.maxSegments ||
      rendered.maxCostMicros !==
        length.segments * config.quote.maxMicrosPerSegment ||
      rendered.payloadHash !==
        operationContentHash([
          config.senderId,
          config.revision,
          approved.templateId,
          approved.revision,
          rendered.text,
          length.encoding,
        ])
    ) {
      throw new Error("SMS submission material changed after preparation");
    }
    const form = new URLSearchParams({
      userid: credentials.userid,
      password: credentials.password,
      send_to: phoneE164.slice(1),
      msg: rendered.text,
      method: "sendMessage",
      msg_type: rendered.encoding === "gsm7" ? "text" : "Unicode_Text",
      format: "TEXT",
      auth_scheme: "plain",
      v: "1.1",
      mask: config.mask,
      principalEntityId: config.principalEntityId,
      dltTemplateId: rendered.template.dltTemplateId,
      msg_id: smsProviderCorrelation(permit.attempt.attemptId),
      extra: input.reportToken,
    });
    // Check immediately before I/O, after credential loading and transaction.
    const now = this.clock();
    const deadline = Math.min(permit.validUntil, rendered.validUntil);
    if (
      !Number.isSafeInteger(now) ||
      now < permit.attempt.state.at ||
      now >= deadline
    ) {
      return {kind: "withheld", reason: "permitExpired"};
    }
    return new GupshupSmsTransport(this.fetchImpl, this.clock).submit(
      form,
      phoneE164,
      deadline,
    );
  }
}
