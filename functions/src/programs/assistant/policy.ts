/* eslint-disable max-len */
// The wedding assistant's policy: which language it answers in, what it
// refuses before any model call, what an answer may not contain, and the
// holding reply a guest gets when the message is passed to the planner.
// Deterministic and pure; the board's "What it never does" lives here.

export const ASSISTANT_LANGUAGES = ["en", "hi", "gu", "mr", "ta"] as const;
export type AssistantLanguage = typeof ASSISTANT_LANGUAGES[number];
export const DEFAULT_LANGUAGES: AssistantLanguage[] = ["en", "hi"];

export const LANGUAGE_NAMES: Record<AssistantLanguage, string> = {
  en: "English", hi: "Hindi", gu: "Gujarati", mr: "Marathi", ta: "Tamil",
};

export type ReplyWithin = "hour" | "fourHours" | "sameDay";

/** Why a message went to the planner instead of being answered. */
export const ESCALATION_REASONS = [
  "assistantOff", "plannerHandling", "outsideWindow", "media", "askedForPerson",
  "distress", "giftsOrMoney", "changeRequest", "notInFacts", "budgetExhausted",
  "providerError", "unsafeAnswer", "factsUnavailable", "uncertainRetry",
] as const;
export type EscalationReason = typeof ESCALATION_REASONS[number];

/**
 * What the assistant never does, whatever the settings say (the settings'
 * neverDoes[] is this fixed list for display). Each rule is enforced in
 * code where code can (no tools, so it cannot book or change anything; the
 * fact pack holds no other guest; the answer check) and in the prompt.
 */
export const NEVER_DOES = [
  {id: "changesBookings", text: "Never changes anyone's replies, rooms or flights"},
  {id: "sharesOtherGuests", text: "Never shares another guest's details"},
  {id: "guesses", text: "Never guesses: if it isn't in the itinerary, it asks you"},
  {id: "promisesForPlanner", text: "Never promises anything on the planner's behalf"},
] as const;

export function normalizeLanguages(value: unknown): AssistantLanguage[] {
  if (!Array.isArray(value)) return [...DEFAULT_LANGUAGES];
  const out = value.filter((code): code is AssistantLanguage =>
    (ASSISTANT_LANGUAGES as readonly string[]).includes(code as string));
  const unique = [...new Set(out)];
  return unique.length ? unique : [...DEFAULT_LANGUAGES];
}

type Script = "latin" | "devanagari" | "gujarati" | "tamil" | "other";

export function dominantScript(text: string): Script {
  const counts: Record<Script, number> = {latin: 0, devanagari: 0, gujarati: 0,
    tamil: 0, other: 0};
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (/[A-Za-z]/u.test(char)) counts.latin++;
    else if (code >= 0x0900 && code <= 0x097f) counts.devanagari++;
    else if (code >= 0x0a80 && code <= 0x0aff) counts.gujarati++;
    else if (code >= 0x0b80 && code <= 0x0bff) counts.tamil++;
    else if (/\p{L}/u.test(char)) counts.other++;
  }
  let best: Script = "latin";
  for (const script of ["devanagari", "gujarati", "tamil", "other"] as Script[]) {
    if (counts[script] > counts[best]) best = script;
  }
  return best;
}

/**
 * The reply language: the language the guest writes in when the programme
 * offers it, else the programme's first language. Devanagari reads as
 * Hindi unless only Marathi is offered.
 */
export function chooseLanguage(text: string,
  languages: ReadonlyArray<AssistantLanguage>): AssistantLanguage {
  const offered = languages.length ? languages : DEFAULT_LANGUAGES;
  const has = (code: AssistantLanguage) => offered.includes(code);
  switch (dominantScript(text)) {
  case "devanagari":
    if (has("hi")) return "hi";
    if (has("mr")) return "mr";
    break;
  case "gujarati":
    if (has("gu")) return "gu";
    break;
  case "tamil":
    if (has("ta")) return "ta";
    break;
  case "latin":
    if (has("en")) return "en";
    break;
  default:
    break;
  }
  return offered[0];
}

const ASKS_FOR_PERSON = [
  /\b(talk|speak|chat)\s+(to|with)\s+(a\s+)?(human|person|someone|somebody|planner|team|manager|organi[sz]er)\b/iu,
  /\b(real|actual)\s+(person|human)\b/iu,
  /\bcall\s+me\b/iu,
  /\b(are\s+you\s+a\s+bot|is\s+this\s+a\s+bot)\b/iu,
  /\bconnect\s+me\b/iu,
  /किसी\s*(इंसान|व्यक्ति)?\s*से\s*बात/u,
  /(प्लानर|मैनेजर)\s*से\s*बात/u,
  /मुझे\s*कॉल/u,
];

const DISTRESS = [
  /\b(emergency|urgent(ly)?|ambulance|hospital|accident|injur(ed|y)|bleeding|fainted|unconscious|heart attack|police|stolen|robbed|harass(ed|ment)?|unsafe|scared|lost (my|our) (child|kid|son|daughter|passport|wallet))\b/iu,
  /\b(help me|please help|sos)\b/iu,
  /(आपातकाल|एम्बुलेंस|अस्पताल|दुर्घटना|चोट|पुलिस|चोरी|डर लग|मदद करो|बचाओ|तबीयत खराब)/u,
];

const GIFTS_OR_MONEY = [
  /\b(gift|gifts|shagun|money|cash|payment|pay|paid|refund|price|cost|fee|upi|bank|account number)\b/iu,
  /(तोहफ|उपहार|शगुन|पैसे|पैसा|नकद|भुगतान|रिफंड)/u,
];

const CHANGE_REQUEST = [
  /\b(change|cancel|move|switch|upgrade|book|reschedule|add|remove)\b.{0,40}\b(room|flight|pickup|car|rsvp|booking|ticket|seat|stay)\b/iu,
  /\b(we('| a)re|i('| a)m)\s+(\d+|one|two|three|four|five|six|seven|eight)\s+now\b/iu,
  /\b(not coming|can't come|cannot come|won't make it)\b/iu,
  /(बदल|कैंसल|रद्द|बुक कर)/u,
];

export interface InboundForPolicy {
  kind: string;
  text: string | null;
}

/**
 * Deterministic refusals before any model call: media (tickets and ID
 * photos are for the planner), asking for a person, sounding distressed,
 * gifts or money, and asks to change a booking.
 */
export function preCheck(message: InboundForPolicy): EscalationReason | null {
  if (message.kind !== "text") return "media";
  const text = (message.text ?? "").trim();
  if (!text) return "media";
  if (DISTRESS.some((pattern) => pattern.test(text))) return "distress";
  if (ASKS_FOR_PERSON.some((pattern) => pattern.test(text))) return "askedForPerson";
  if (GIFTS_OR_MONEY.some((pattern) => pattern.test(text))) return "giftsOrMoney";
  if (CHANGE_REQUEST.some((pattern) => pattern.test(text))) return "changeRequest";
  return null;
}

const MAX_ANSWER_CHARS = 1000;

/**
 * Rejects an answer that could leak or invent contact details: phone-like
 * digit runs and links that are not in the fact pack, or an over-long
 * reply. A rejected answer is never sent; the message goes to the planner.
 */
export function answerIsSafe(answer: string, factText: string): boolean {
  const text = answer.trim();
  if (!text || text.length > MAX_ANSWER_CHARS) return false;
  const runs = (value: string) => (value.match(/\+?[0-9][0-9\s-]{7,}[0-9]/gu) ?? [])
    .map((run) => run.replace(/[^0-9]/gu, "")).filter((digits) => digits.length >= 8);
  const known = runs(factText).join(" ");
  if (runs(text).some((digits) => !known.includes(digits))) return false;
  for (const link of text.match(/(https?:\/\/|www\.)\S+/giu) ?? []) {
    if (!factText.includes(link)) return false;
  }
  if (/[\w.+-]+@[\w-]+\.[\w.]+/u.test(text)) return false;
  return true;
}

const WITHIN: Record<ReplyWithin, {en: string; hi: string}> = {
  hour: {en: "within the hour", hi: "एक घंटे के भीतर"},
  fourHours: {en: "within four hours", hi: "चार घंटे के भीतर"},
  sameDay: {en: "today", hi: "आज ही"},
};

/**
 * The holding reply when a message goes to the planner: says it was
 * passed on and when to expect an answer, and promises nothing else.
 * Hindi and English are written out; other languages get English.
 */
export function holdingReply(language: AssistantLanguage, replyWithin: ReplyWithin,
  reason: EscalationReason): string {
  const within = WITHIN[replyWithin] ?? WITHIN.sameDay;
  if (language === "hi") {
    const lead = reason === "distress" ? "हमें खेद है। " : "";
    return `${lead}मैंने यह आपके प्लानर को भेज दिया है। वे ${within.hi} यहीं जवाब देंगे।`;
  }
  const lead = reason === "distress" ? "I'm sorry. " : "";
  return `${lead}I've passed this to your planner. They'll reply here ${within.en}.`;
}

export function normalizeReplyWithin(value: unknown): ReplyWithin {
  return value === "hour" || value === "fourHours" || value === "sameDay" ?
    value : "sameDay";
}
