import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {SecretVersionReferenceGuard} from "../../shared/secretVersionReference";
import {ResendEmailProvider} from "../../email/resendEmailProvider";
import type {TransactionalEmailProvider} from "../../email/emailProvider";
import {
  MetaProviderError,
  MetaWhatsappProvider,
  OrganizerTokenStore,
  metaTemplateFromDocument,
} from "../../organizers/organizerWhatsappProvider";
import {metaWhatsappGraphVersion} from
  "../../organizers/organizerMessagingSetup";
import {GupshupSmsTransport, parseSmsCredentials} from
  "../../messaging/gupshupSmsTransport";
import {smsProviderCorrelation} from
  "../../eventSuccess/operations/smsReportCredentials";
import {smsSegments} from "../../eventSuccess/operations/smsProtocol";
import {whatsappStatusCorrelation} from
  "../../eventSuccess/operations/whatsappDeliveryProtocol";
import type {Snapshot} from "./facts";
import {approvalEmailText, eventUrl, type Binding, type Intent} from "./model";
export type Submission =
  | {kind: "accepted"; providerMessageId: string}
  | {kind: "unknown"}
  | {kind: "notSent"}
  | {
      kind: "failed";
      classification:
        | "technical"
        | "policy"
        | "suppressed"
        | "invalidRecipient";
    };
export interface PreparedTransport {
  submit(params: {
    intent: Intent;
    attemptId: string;
    endpoint: string;
    deadline: number;
    payloadHash: string;
  }): Promise<Submission>;
}
export type PrepareTransport = (
  route: Binding["routeId"],
  source: Snapshot,
) => Promise<PreparedTransport>;
/** Composition root only: replacing email requires another implementation of
 * TransactionalEmailProvider, never a change to approval or booking policy. */
export class ApprovalNotificationTransports {
  constructor(
    private readonly secrets = new SecretManagerServiceClient(),
    private readonly references = new SecretVersionReferenceGuard(),
    private readonly emailProvider: (
      key: string,
    ) => TransactionalEmailProvider = (key) => new ResendEmailProvider(key),
  ) {}
  private async credential(
    version: string,
  ): Promise<Record<string, unknown>> {
    await this.references.assert(version, /^[A-Za-z0-9_-]+$/u);
    const [result] = await this.secrets.accessSecretVersion({
      name: version,
    });
    const data = result.payload?.data;
    if (!data || data.length > 8192) {
      throw new Error("Credential unavailable");
    }
    return JSON.parse(data.toString("utf8")) as Record<string, unknown>;
  }
  readonly prepare: PrepareTransport = async (route, snapshot) => {
    const config = snapshot.settings;
    if (route === "approvalEmail") {
      const email = config.email!;
      const secret = await this.credential(email.credentialVersion);
      if (
        secret.schema !== "catch.transactional-email-credential/v1" ||
        secret.provider !== email.provider ||
        secret.accountId !== email.accountId ||
        typeof secret.apiKey !== "string"
      ) {
        throw new Error("Credential unavailable");
      }
      const provider = this.emailProvider(secret.apiKey);
      if (provider.id !== email.provider) {
        throw new Error("Email provider mismatch");
      }
      return {
        submit: async ({intent, endpoint, deadline}) => {
          const result = await provider.submit({
            from: email.from,
            to: endpoint,
            subject: "Your event application is approved",
            text: approvalEmailText(intent.context.eventId),
            idempotencyKey: intent.intentId,
            deadlineMillis: deadline,
          });
          if (result.kind === "accepted" || result.kind === "unknown") {
            return result;
          }
          if (result.kind === "withheld") return {kind: "notSent"};
          // Explicit rejection/quotas cannot buy capacity or switch transports.
          return {kind: "failed", classification: "policy"};
        },
      };
    }
    if (route === "approvalWhatsapp") {
      const connection = snapshot.connection!;
      const token = await new OrganizerTokenStore().accessBound({
        versionResource: connection.secretVersionResource!,
        organizerId: snapshot.preference.organizerId,
        connectionId: config.whatsapp!.connectionId,
      });
      const provider = new MetaWhatsappProvider({
        appId: "",
        appSecret: "",
        configId: "",
        graphVersion: metaWhatsappGraphVersion.value(),
      });
      const template = metaTemplateFromDocument(snapshot.template!);
      return {
        submit: async ({
          intent,
          endpoint,
          deadline,
          attemptId,
          payloadHash,
        }) => {
          try {
            const result = await provider.sendTemplate({
              accessToken: token,
              phoneNumberId: connection.phoneNumberId!,
              toE164: endpoint,
              template,
              variables: {eventUrl: eventUrl(intent.context.eventId)},
              callbackData: whatsappStatusCorrelation(
                attemptId,
                payloadHash,
              ),
              deadline,
            });
            return {
              kind: "accepted",
              providerMessageId: result.providerMessageId,
            };
          } catch (error) {
            return error instanceof MetaProviderError &&
              error.disposition === "requestNotSent" ?
              {kind: "notSent"} :
              {kind: "unknown"};
          }
        },
      };
    }
    const sms = config.sms!;
    const credentials = parseSmsCredentials(
      await this.credential(sms.credentialVersion),
      sms.senderId,
    );
    const transport = new GupshupSmsTransport();
    return {
      submit: async ({intent, endpoint, deadline, attemptId}) => {
        const text = sms.approvedText.replace(
          "{eventUrl}",
          eventUrl(intent.context.eventId),
        );
        const length = smsSegments(text);
        if (length.segments > 3) {
          return {kind: "failed", classification: "policy"};
        }
        const form = new URLSearchParams({
          userid: credentials.userid,
          password: credentials.password,
          send_to: endpoint.slice(1),
          msg: text,
          method: "sendMessage",
          msg_type: length.encoding === "gsm7" ? "text" : "Unicode_Text",
          format: "TEXT",
          auth_scheme: "plain",
          v: "1.1",
          mask: sms.mask,
          principalEntityId: sms.principalEntityId,
          dltTemplateId: sms.dltTemplateId,
          msg_id: smsProviderCorrelation(attemptId),
        });
        const result = await transport.submit(form, endpoint, deadline);
        if (result.kind === "accepted") return result;
        if (result.kind === "withheld") return {kind: "notSent"};
        if (result.kind === "rejected") {
          return {kind: "failed", classification: result.classification};
        }
        return {kind: "unknown"};
      },
    };
  };
}
