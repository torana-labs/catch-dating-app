import type {HostMetaLeadPayload} from "./metaPayload";
import {brandWebUrl} from "../shared/generated/brand";

export const HOST_META_EVENTS_URL =
  "https://graph.facebook.com/v26.0/1844810253539672/events";

/** Fixed Catch destination. The caller supplies a server-held credential;
 * neither the token nor response bodies are logged. No redirects, retries,
 * contact matching or caller-selected destinations are supported. */
export function createHostMetaSender(input: {
  token: () => string;
  fetch?: typeof fetch;
  testEventCode?: string;
}) {
  const transport = input.fetch ?? fetch;
  if (input.testEventCode !== undefined &&
      !/^TEST[A-Z0-9]{3,32}$/u.test(input.testEventCode)) {
    throw new Error("Invalid Meta test-event code.");
  }
  return async (payload: HostMetaLeadPayload):
  Promise<{status: number; body: unknown}> => {
    const token = input.token();
    if (!token || /[\r\n]/u.test(token)) {
      throw new Error("Meta delivery credential unavailable.");
    }
    // Rebuild the wire object even for incorrectly typed runtime callers.
    const event = {
      event_name: "Lead", event_id: payload.event_id,
      event_time: payload.event_time, action_source: "website",
      event_source_url: brandWebUrl("/host/apply/"),
      user_data: {
        external_id: payload.user_data.external_id,
        client_user_agent: payload.user_data.client_user_agent,
        ...(payload.user_data.fbc ? {fbc: payload.user_data.fbc} : {}),
      },
    };
    const response = await transport(HOST_META_EVENTS_URL, {
      method: "POST", redirect: "error",
      headers: {"Content-Type": "application/json",
        "Authorization": `Bearer ${token}`},
      body: JSON.stringify({data: [event],
        ...(input.testEventCode ?
          {test_event_code: input.testEventCode} : {})}),
      signal: AbortSignal.timeout(10_000),
    });
    // Oversized/malformed acknowledgements never authorize automatic resend.
    const reader = response.body?.getReader();
    if (!reader) return {status: response.status, body: null};
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 16_384) {
          await reader.cancel();
          return {status: response.status, body: null};
        }
        chunks.push(value);
      }
      const text = Buffer.concat(chunks).toString("utf8");
      return {status: response.status, body: JSON.parse(text) as unknown};
    } catch {
      return {status: response.status, body: null};
    } finally {
      reader.releaseLock();
    }
  };
}
