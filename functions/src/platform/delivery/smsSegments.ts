export type SmsEncoding = "gsm7" | "unicode";

// GSM default alphabet excludes ESC; extension characters use two septets.
const gsmDefault = new Set(Array.from(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./" +
  "0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§" +
  "¿abcdefghijklmnopqrstuvwxyzäöñüà"
));
const gsmExtension = new Set(Array.from("\f^{}\\[~]|€"));

/** Counts segment packing without splitting an extension or surrogate pair. */
export function smsSegments(text: string): {
  encoding: SmsEncoding; units: number; segments: number;
} {
  if (!text || text.length > 20_000 || Array.from(text).some((p) =>
    p.length === 1 && p.charCodeAt(0) >= 0xd800 &&
      p.charCodeAt(0) <= 0xdfff)) {
    throw new Error("Invalid SMS content");
  }
  const points = Array.from(text);
  const gsm = points.every((p) => gsmDefault.has(p) || gsmExtension.has(p));
  const widths = points.map((p) => gsm ? (gsmExtension.has(p) ? 2 : 1) :
    p.length);
  const units = widths.reduce((a, b) => a + b, 0);
  if (units <= (gsm ? 160 : 70)) {
    return {encoding: gsm ? "gsm7" : "unicode", units, segments: 1};
  }
  const limit = gsm ? 153 : 67;
  let segments = 1;
  let used = 0;
  for (const width of widths) {
    if (used + width > limit) {
      segments++; used = 0;
    }
    used += width;
  }
  return {encoding: gsm ? "gsm7" : "unicode", units, segments};
}
