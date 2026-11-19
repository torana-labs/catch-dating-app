import type {PublicOrganizerForm} from "../../firebase";
import {catchPhoneE164} from "@catch/web-ui/phone";
import {activePhoneCountry} from "@content/markets";

export type PublicFormDefinition = PublicOrganizerForm["definition"];
export type PublicFormQuestion =
  PublicFormDefinition["sections"][number]["questions"][number];
export type PublicFormAnswer = string | number | boolean | null | string[];
export type PublicFormAnswers = Record<string, PublicFormAnswer>;

export function visiblePublicFormSections(
  definition: PublicFormDefinition,
  answers: PublicFormAnswers
) {
  const matchingRules = definition.logicRules.filter((rule) =>
    ruleMatches(rule, answers));
  const allShowSections = ruleTargets(
    definition.logicRules, "showSection", "section"
  );
  const shownSections = ruleTargets(
    matchingRules, "showSection", "section"
  );
  const hiddenSections = ruleTargets(
    matchingRules, "hideSection", "section"
  );
  const allShowQuestions = ruleTargets(
    definition.logicRules, "showQuestion", "question"
  );
  const shownQuestions = ruleTargets(
    matchingRules, "showQuestion", "question"
  );
  const hiddenQuestions = ruleTargets(
    matchingRules, "hideQuestion", "question"
  );
  const visible = definition.sections.flatMap((section, originalIndex) => {
    const gated = allShowSections.has(section.sectionId) &&
      !shownSections.has(section.sectionId);
    if (gated || hiddenSections.has(section.sectionId)) return [];
    return [{
      originalIndex,
      section: {
        ...section,
        questions: section.questions.filter((question) => {
          const questionGated = allShowQuestions.has(question.questionId) &&
            !shownQuestions.has(question.questionId);
          return !questionGated && !hiddenQuestions.has(question.questionId);
        }),
      },
    }];
  });
  const questionSection = new Map<string, number>();
  definition.sections.forEach((section, sectionIndex) => {
    section.questions.forEach((question) =>
      questionSection.set(question.questionId, sectionIndex));
  });
  const result: typeof definition.sections = [];
  let cursor = 0;
  while (cursor < visible.length) {
    const current = visible[cursor];
    result.push(current.section);
    const navigation = matchingRules.find((rule) => {
      if (rule.action !== "routeToSection" && rule.action !== "finish") {
        return false;
      }
      const sourceIndex = Math.max(...rule.conditions.map((condition) =>
        questionSection.get(condition.questionId) ?? -1));
      return sourceIndex === current.originalIndex;
    });
    if (navigation?.action === "finish") break;
    if (navigation?.action === "routeToSection" &&
        navigation.targetSectionId) {
      const targetIndex = definition.sections.findIndex((section) =>
        section.sectionId === navigation.targetSectionId);
      const next = visible.findIndex((section) =>
        section.originalIndex >= targetIndex);
      if (next < 0 || next <= cursor) break;
      cursor = next;
      continue;
    }
    cursor += 1;
  }
  return result;
}

function ruleTargets(
  rules: PublicFormDefinition["logicRules"],
  action: "showSection" | "hideSection" | "showQuestion" | "hideQuestion",
  kind: "section" | "question"
) {
  return new Set(rules.flatMap((rule) => {
    if (rule.action !== action) return [];
    const target = kind === "section" ?
      rule.targetSectionId : rule.targetQuestionId;
    return target ? [target] : [];
  }));
}

export function validatePublicFormAnswers(
  questions: readonly PublicFormQuestion[],
  answers: PublicFormAnswers
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const question of questions) {
    const answer = answers[question.questionId];
    if (question.required && isEmptyAnswer(answer)) {
      errors[question.questionId] = `${question.label} is required.`;
      continue;
    }
    if (isEmptyAnswer(answer)) continue;
    const error = validateQuestion(question, answer);
    if (error) errors[question.questionId] = error;
  }
  return errors;
}

export function answerSummary(
  question: PublicFormQuestion,
  answer: PublicFormAnswer | undefined,
  cityOptions: PublicOrganizerForm["cityOptions"] = []
): string {
  if (answer === undefined || answer === null || answer === "") return "";
  if (typeof answer === "string" && question.canonicalFieldId === "city" &&
      question.answerDestination === "catchProfile") {
    const city = cityOptions.find((option) => option.marketId === answer);
    if (city) return `${city.label}, ${city.regionName}`;
  }
  if (question.kind === "singleChoice" && typeof answer === "string") {
    return question.options.find((option) => option.value === answer)?.label ?? answer;
  }
  if (question.kind === "multiChoice" && Array.isArray(answer)) {
    return answer.map((value) => question.options.find((option) =>
      option.value === value)?.label ?? value).join(", ");
  }
  if (Array.isArray(answer)) return answer.join(", ");
  if (typeof answer === "boolean") return answer ? "Yes" : "No";
  return String(answer);
}

function ruleMatches(
  rule: PublicFormDefinition["logicRules"][number],
  answers: PublicFormAnswers
) {
  const matches = rule.conditions.map((condition) => {
    const answer = answers[condition.questionId];
    const values = Array.isArray(answer) ? answer : [answer];
    const expected = condition.expectedValues;
    switch (condition.operator) {
    case "answered": return !isEmptyAnswer(answer);
    case "notAnswered": return isEmptyAnswer(answer);
    case "equals": return expected.some((value) => answer === value);
    case "notEquals": return expected.every((value) => answer !== value);
    case "contains": return expected.some((value) => values.includes(value));
    case "notContains": return expected.every((value) => !values.includes(value));
    case "greaterThan": return typeof answer === "number" &&
        typeof expected[0] === "number" && answer > expected[0];
    case "lessThan": return typeof answer === "number" &&
        typeof expected[0] === "number" && answer < expected[0];
    }
  });
  return rule.conditionMode === "all" ? matches.every(Boolean) :
    matches.some(Boolean);
}

function validateQuestion(
  question: PublicFormQuestion,
  answer: PublicFormAnswer
): string | null {
  const invalid = question.validation.customError ??
    `${question.label} is invalid.`;
  const stringKind = question.kind === "shortText" ||
    question.kind === "longText" || question.kind === "date" ||
    question.kind === "phone" || question.kind === "email" ||
    question.kind === "url" || question.kind === "signature";
  if (stringKind && typeof answer !== "string") return invalid;
  if (question.kind === "number" &&
      (typeof answer !== "number" || !Number.isFinite(answer))) return invalid;
  if ((question.kind === "boolean" ||
       question.kind === "acknowledgement") &&
      typeof answer !== "boolean") return invalid;
  if (question.kind === "singleChoice" && typeof answer !== "string") {
    return invalid;
  }
  if ((question.kind === "multiChoice" || question.kind === "file") &&
      !Array.isArray(answer)) return invalid;
  if (question.kind === "email" &&
      (typeof answer !== "string" ||
       !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(answer))) return invalid;
  if (question.kind === "phone" &&
      (typeof answer !== "string" ||
       catchPhoneE164(answer, activePhoneCountry) === null)) {
    return invalid;
  }
  if (question.kind === "url" && typeof answer === "string") {
    try {
      const url = new URL(answer);
      if (url.protocol !== "https:" && url.protocol !== "http:") return invalid;
    } catch {
      return invalid;
    }
  }
  if (question.kind === "date" && typeof answer === "string") {
    const date = new Date(`${answer}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(answer) ||
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== answer ||
        (question.validation.earliestDate !== null &&
         answer < question.validation.earliestDate) ||
        (question.validation.latestDate !== null &&
         answer > question.validation.latestDate)) return invalid;
  }
  if (typeof answer === "string") {
    const length = answer.trim().length;
    if (question.validation.minLength !== null &&
        length < question.validation.minLength) return invalid;
    if (question.validation.maxLength !== null &&
        length > question.validation.maxLength) return invalid;
    const pattern = question.validation.patternPreset;
    const patterns = {
      lettersAndSpaces: /^[\p{L}\p{M} '\u2019-]+$/u,
      alphanumeric: /^[\p{L}\p{M}\p{N} _.'\u2019-]+$/u,
      postalCode: /^[\p{L}\p{N} -]{3,12}$/u,
      handle: /^@?[A-Za-z0-9_.-]{2,39}$/u,
    } as const;
    if (pattern !== null && !patterns[pattern].test(answer.trim())) {
      return invalid;
    }
  }
  if (typeof answer === "number") {
    if (question.validation.minNumber !== null &&
        answer < question.validation.minNumber) return invalid;
    if (question.validation.maxNumber !== null &&
        answer > question.validation.maxNumber) return invalid;
  }
  if (question.kind === "acknowledgement" && question.required &&
      answer !== true) return invalid;
  if (question.kind === "singleChoice" && typeof answer === "string" &&
      !question.options.some((option) => option.value === answer)) {
    return invalid;
  }
  if (question.kind === "multiChoice" && Array.isArray(answer)) {
    const allowed = new Set(question.options.map((option) => option.value));
    if (answer.some((value) => !allowed.has(value)) ||
        new Set(answer).size !== answer.length ||
        (question.validation.minSelections !== null &&
         answer.length < question.validation.minSelections) ||
        (question.validation.maxSelections !== null &&
         answer.length > question.validation.maxSelections)) return invalid;
  }
  if (question.kind === "file" && Array.isArray(answer) &&
      (answer.length > (question.validation.maxFileCount ?? 1) ||
       new Set(answer).size !== answer.length)) return invalid;
  return null;
}

function isEmptyAnswer(answer: PublicFormAnswer | undefined) {
  return answer === undefined || answer === null || answer === "" ||
    (Array.isArray(answer) && answer.length === 0);
}
