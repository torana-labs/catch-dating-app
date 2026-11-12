import type {
  OrganizerApplicationResponseDocument,
} from "../shared/generated/firestoreAdminTypes";

type ApplicationAnswer =
  OrganizerApplicationResponseDocument["answers"][number];

/**
 * Test support: the Generic Forms sources (submitted response answers and
 * version questions) that genericApplicationAnswers turns back into
 * `answers`. Tests describe a generic-form application by its
 * application-shaped answers and spread these fields into their response and
 * version fixtures.
 * @param {unknown[]} input Application-shaped answers.
 * @return {object} Response and version fields to merge into fixtures.
 */
export function genericApplicationSources(input: readonly unknown[]): {
  response: {answers: Record<string, unknown>; answerSnapshots: unknown[]};
  version: {sections: unknown[]};
} {
  const answers = input as ApplicationAnswer[];
  const formAnswer = (answer: ApplicationAnswer) => {
    const value = answer.value;
    switch (value.valueKind) {
    case "text": return value.textValue;
    case "number": return value.numberValue;
    case "boolean": return value.booleanValue;
    case "date": return value.dateValue;
    case "options": return answer.questionKind === "singleChoice" ?
      value.optionValues[0] ?? null : value.optionValues;
    case "assets": return value.assetIds;
    default: return null;
    }
  };
  return {
    response: {
      answers: Object.fromEntries(answers.map((answer) =>
        [answer.questionId, formAnswer(answer)])),
      answerSnapshots: answers.map((answer) => ({
        questionId: answer.questionId, key: answer.questionKey,
        label: answer.questionLabel, kind: answer.questionKind,
        answer: formAnswer(answer),
      })),
    },
    version: {
      sections: [{sectionId: "main", title: "Main", questions:
        answers.map((answer) => ({
          questionId: answer.questionId, key: answer.questionKey,
          label: answer.questionLabel, kind: answer.questionKind,
          canonicalFieldId: answer.canonicalFieldId,
          privacyClass: answer.privacyClass,
          hostPresentation: answer.hostPresentation,
        }))}],
    },
  };
}
