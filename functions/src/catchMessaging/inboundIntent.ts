/* eslint-disable max-len */
// What a person messaging Catch's WhatsApp number wants. One number serves
// several purposes for the same person: a registered nominator forwards
// organizers, and also asks the team questions. Hard rules come first (an
// explicit word wins), then what the message holds; when links arrive with
// a question, Catch asks rather than guesses. STOP never reaches this: the
// receipt dispatcher handles it before routing.

export type CatchInboundIntent =
  | {kind: "nomination"}
  | {kind: "nomination_without_links"}
  | {kind: "clarify"}
  | {kind: "support"}
  | {kind: "clarification_answer"; answer: "nominate" | "support"};

export interface CatchInboundFacts {
  text: string;
  /** The sender is a registered, currently authorized nominator. */
  isNominator: boolean;
  /** Organizer lines the nomination parser found in the text. */
  nominationCount: number;
  /** The text left once links and handles are removed, per nomination. */
  notes: Array<string | null>;
  /** Catch asked this sender "nominate or question?" and is waiting. */
  awaitingClarification: boolean;
}

const NOMINATE_PREFIX = /^\s*(?:nominate|nom|add|#n|#nominate)\b/iu;
const SUPPORT_PREFIX = /^\s*(?:help|support|question|q:)/iu;
const QUESTION_START = /^(?:what|why|how|when|where|who|which|is|are|can|could|does|do|did|should|will|would|has|have)\b/iu;
const ANSWER_NOMINATE = /^\s*(?:1|yes|y|nominate)\s*[.!]?\s*$/iu;
const ANSWER_SUPPORT = /^\s*(?:2|no|n|question|support)\s*[.!]?\s*$/iu;
// Notes longer than a short remark are a conversation, not a nomination.
const MAX_NOMINATION_NOTE_WORDS = 25;

export function classifyCatchInbound(facts: CatchInboundFacts): CatchInboundIntent {
  if (facts.awaitingClarification) {
    if (ANSWER_NOMINATE.test(facts.text)) return {kind: "clarification_answer", answer: "nominate"};
    if (ANSWER_SUPPORT.test(facts.text)) return {kind: "clarification_answer", answer: "support"};
  }
  if (!facts.isNominator) return {kind: "support"};
  if (SUPPORT_PREFIX.test(facts.text)) return {kind: "support"};
  if (NOMINATE_PREFIX.test(facts.text)) {
    return facts.nominationCount > 0 ? {kind: "nomination"} : {kind: "nomination_without_links"};
  }
  if (facts.nominationCount === 0) return {kind: "support"};
  return facts.notes.some(looksLikeConversation) ? {kind: "clarify"} : {kind: "nomination"};
}

function looksLikeConversation(note: string | null): boolean {
  if (!note) return false;
  const text = note.trim();
  return text.includes("?") || QUESTION_START.test(text) ||
    text.split(/\s+/u).filter(Boolean).length > MAX_NOMINATION_NOTE_WORDS;
}
