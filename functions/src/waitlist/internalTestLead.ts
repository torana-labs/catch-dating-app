/**
 * Whether a salesInboundIntents row is an internal test: an explicit
 * internal QA submission id or "[QA]" name, or an email at a reserved test
 * domain. Staff are not alerted about these, and Catch's own automatic
 * WhatsApp to a lead skips them too.
 * @param {Record<string, unknown>} intent The intent document.
 * @return {boolean} True for an internal test lead.
 */
export function isInternalTestLead(intent: Record<string, unknown>): boolean {
  return /^internal_qa_/iu.test(String(intent.submissionId)) ||
    /^\[QA\]/iu.test(String(intent.fullName ?? "").trim()) ||
    /@(?:[^@]*\.)?(?:example\.(?:com|net|org|test)|invalid|test)$/iu
      .test(String(intent.email ?? ""));
}
