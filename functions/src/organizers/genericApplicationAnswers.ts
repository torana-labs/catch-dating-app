import type {
  OrganizerApplicationResponseDocument,
  OrganizerFormResponseDocument,
  OrganizerFormVersionDocument,
} from "../shared/generated/firestoreAdminTypes";

type ApplicationAnswers = OrganizerApplicationResponseDocument["answers"];
type ApplicationAnswer = ApplicationAnswers[number];
type FormQuestion = OrganizerFormVersionDocument["definition"]["sections"][
  number]["questions"][number];

/**
 * The application-review view of a submitted Generic Forms response, built
 * from the response and its published version when it is read. Generic-form
 * applications keep no copy of their answers: organizerFormResponses is the
 * only store, and this projection replaces the compatibility snapshot that
 * conversion used to write into organizerApplicationResponses.
 * @param {OrganizerFormResponseDocument} response Submitted form response.
 * @param {OrganizerFormVersionDocument} version The response's version.
 * @return {ApplicationAnswers} Application-shaped answers, at most 100.
 */
export function genericApplicationAnswers(
  response: OrganizerFormResponseDocument,
  version: OrganizerFormVersionDocument
): ApplicationAnswers {
  const questions = new Map(version.definition.sections
    .flatMap((section) => section.questions)
    .map((question) => [question.questionId, question]));
  return response.answerSnapshots.flatMap((answer) => {
    const question = questions.get(answer.questionId);
    return question ? [{
      questionId: answer.questionId,
      questionKey: answer.key,
      questionLabel: answer.label,
      questionKind: applicationQuestionKind(question.kind),
      canonicalFieldId: question.canonicalFieldId,
      privacyClass: question.privacyClass,
      hostPresentation: question.hostPresentation,
      value: applicationAnswerValue(question.kind, answer.answer),
    }] : [];
  }).slice(0, 100);
}

function applicationQuestionKind(
  kind: FormQuestion["kind"]
): ApplicationAnswer["questionKind"] {
  if (kind === "acknowledgement") return "boolean";
  if (kind === "signature") return "file";
  return kind;
}

function applicationAnswerValue(
  kind: FormQuestion["kind"],
  answer: OrganizerFormResponseDocument["answers"][string]
): ApplicationAnswer["value"] {
  const empty = {
    textValue: null,
    numberValue: null,
    booleanValue: null,
    dateValue: null,
    optionValues: [] as string[],
    assetIds: [] as string[],
  };
  if (answer === null || answer === "" ||
      Array.isArray(answer) && answer.length === 0) {
    return {valueKind: "empty", ...empty};
  }
  if (kind === "file" || kind === "signature") {
    return {valueKind: "assets", ...empty, assetIds: Array.isArray(answer) ?
      answer : [String(answer)]};
  }
  if (kind === "singleChoice" || kind === "multiChoice") {
    return {valueKind: "options", ...empty, optionValues:
      Array.isArray(answer) ? answer : [String(answer)]};
  }
  if (kind === "date") {
    return {valueKind: "date", ...empty, dateValue: String(answer)};
  }
  if (typeof answer === "number") {
    return {valueKind: "number", ...empty, numberValue: answer};
  }
  if (typeof answer === "boolean") {
    return {valueKind: "boolean", ...empty, booleanValue: answer};
  }
  return {valueKind: "text", ...empty, textValue: String(answer)};
}
