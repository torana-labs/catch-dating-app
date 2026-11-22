/** Shared HTTP transport; source workers own dispatch authority. */
export type SmsSubmissionOutcome =
  | {kind: "accepted"; providerMessageId: string}
  | {
      kind: "rejected";
      code: string;
      classification: "invalidRecipient" | "policy" | "suppressed";
    }
  | {
      kind: "uncertain";
      reason: "transport" | "invalidResponse" | "providerPending";
      code: string | null;
    }
  | {kind: "withheld"; reason: "permitExpired"};

export class GupshupSmsTransport {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly clock: () => number = Date.now,
  ) {}
  async submit(
    form: URLSearchParams,
    phoneE164: string,
    deadline: number,
  ): Promise<SmsSubmissionOutcome> {
    const now = this.clock();
    if (
      !Number.isSafeInteger(now) ||
      !Number.isSafeInteger(deadline) ||
      now >= deadline
    ) {
      return {kind: "withheld", reason: "permitExpired"};
    }
    if (
      !/^\+91[6-9][0-9]{9}$/.test(phoneE164) ||
      form.get("send_to") !== phoneE164.slice(1)
    ) {
      throw new Error("Invalid SMS transport recipient");
    }
    try {
      const response = await this.fetchImpl(
        "https://enterprise.smsgupshup.com/GatewayAPI/rest",
        {
          method: "POST",
          redirect: "error",
          headers: {"Content-Type": "application/x-www-form-urlencoded"},
          body: form.toString(),
          signal: AbortSignal.timeout(Math.min(10_000, deadline - now)),
        },
      );
      const text = await boundedResponse(response);
      if (!response.ok) {
        return {kind: "uncertain", reason: "transport", code: null};
      }
      return parseGupshupSubmission(text, phoneE164);
    } catch {
      // Provider errors can echo phones, passwords and bearer links.
      return {kind: "uncertain", reason: "transport", code: null};
    }
  }
}

export function parseGupshupSubmission(
  text: string,
  phoneE164: string,
): SmsSubmissionOutcome {
  const parts = text
    .trim()
    .split("|")
    .map((p) => p.trim());
  if (
    parts.length !== 3 ||
    text.length > 8192 ||
    /[\r\n]/.test(text.trim())
  ) {
    return {kind: "uncertain", reason: "invalidResponse", code: null};
  }
  const [status, middle, last] = parts;
  if (
    status === "success" &&
    middle === phoneE164.slice(1) &&
    /^[0-9]+-[0-9]+$/.test(last) &&
    last.length <= 512
  ) {
    return {kind: "accepted", providerMessageId: last};
  }
  if (status !== "error" || !/^\d{3}$/.test(middle)) {
    return {kind: "uncertain", reason: "invalidResponse", code: null};
  }
  if (middle === "105") {
    return {
      kind: "rejected",
      code: middle,
      classification: "invalidRecipient",
    };
  }
  if (middle === "163") {
    return {kind: "rejected", code: middle, classification: "suppressed"};
  }
  // Explicit account/template/input rejections require operator resolution.
  if (
    [
      "101",
      "102",
      "103",
      "104",
      "106",
      "107",
      "108",
      "109",
      "110",
      "113",
      "114",
      "123",
      "124",
      "127",
      "130",
      "131",
      "132",
      "138",
      "139",
      "140",
      "141",
      "142",
      "143",
      "145",
      "170",
      "171",
      "172",
      "175",
      "239",
      "240",
    ].includes(middle)
  ) {
    return {kind: "rejected", code: middle, classification: "policy"};
  }
  // 125 explicitly resubmits automatically; 100/117 and unknown codes also
  // provide no reliable proof of non-delivery. They never enable fallback.
  return {kind: "uncertain", reason: "providerPending", code: middle};
}

async function boundedResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) throw new Error("Oversized SMS response");
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export interface SmsCredentials {
  schema: "catch.event-sms-credential/v1";
  senderId: string;
  userid: string;
  password: string;
}
export function parseSmsCredentials(
  value: unknown,
  senderId: string,
): SmsCredentials {
  const v = value as Partial<SmsCredentials> | null;
  if (
    !v ||
    typeof v !== "object" ||
    v.schema !== "catch.event-sms-credential/v1" ||
    v.senderId !== senderId ||
    typeof v.userid !== "string" ||
    !/^[0-9]{1,30}$/.test(v.userid) ||
    typeof v.password !== "string" ||
    v.password.length < 1 ||
    v.password.length > 2048 ||
    Object.keys(v).sort().join(",") !== "password,schema,senderId,userid"
  ) {
    throw new Error(
      "SMS credential unavailable or bound to another sender",
    );
  }
  return v as SmsCredentials;
}

