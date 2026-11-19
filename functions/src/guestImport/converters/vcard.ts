import type {GuestListConverter} from "../canonical";

/**
 * Contacts shared as a vCard (.vcf) file, the format WhatsApp and phone
 * address books use to share contacts. The file reader turns each card into
 * a "Name, Phone, Email" row; this converter is chosen by file type, never
 * by headers.
 */
export const vcardConverter: GuestListConverter = {
  id: "vcard-v1",
  provider: null,
  signature: ["name", "phone", "email"],
  detect: () => 0,
};

export const VCARD_HEADERS = ["Name", "Phone", "Email"];

/**
 * Reads vCard 2.1, 3.0 and 4.0 text into rows of name, first phone and
 * first email. Folded lines are unfolded; quoted-printable values decoded.
 * @return {string[][]} Header row first.
 */
export function vcardMatrix(source: string): string[][] {
  const text = source.startsWith("﻿") ? source.slice(1) : source;
  const lines = text.replace(/\r\n?/gu, "\n")
    .replace(/=\n/gu, "") // quoted-printable soft breaks
    .replace(/\n[ \t]/gu, "") // folded lines
    .split("\n");
  const rows: string[][] = [[...VCARD_HEADERS]];
  let card: {fn: string; n: string; tel: string; email: string} | null = null;
  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const [rawName, ...params] = line.slice(0, colon).split(";");
    const name = rawName.replace(/^item[0-9]+\./iu, "").toUpperCase();
    const value = decodeValue(line.slice(colon + 1), params);
    if (name === "BEGIN" && value.toUpperCase() === "VCARD") {
      card = {fn: "", n: "", tel: "", email: ""};
    } else if (name === "END" && card) {
      const displayName = card.fn ||
        card.n.split(";").slice(0, 2).reverse().join(" ").trim();
      if (displayName || card.tel || card.email) {
        rows.push([displayName, card.tel, card.email]);
      }
      card = null;
    } else if (card && name === "FN" && !card.fn) {
      card.fn = value.trim();
    } else if (card && name === "N" && !card.n) {
      card.n = value;
    } else if (card && name === "TEL" && !card.tel) {
      card.tel = value.replace(/^tel:/iu, "").trim();
    } else if (card && name === "EMAIL" && !card.email) {
      card.email = value.trim();
    }
  }
  return rows;
}

function decodeValue(value: string, params: string[]): string {
  const unescaped = (raw: string) => raw.replace(/\\([,;\\])/gu, "$1")
    .replace(/\\n/giu, " ");
  if (!params.some((param) => /quoted-printable/iu.test(param))) {
    return unescaped(value);
  }
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const hex = value.slice(index + 1, index + 3);
    if (value[index] === "=" && /^[0-9A-F]{2}$/iu.test(hex)) {
      bytes.push(parseInt(hex, 16));
      index += 2;
    } else {
      bytes.push(...Buffer.from(value[index], "utf8"));
    }
  }
  return unescaped(Buffer.from(bytes).toString("utf8"));
}
