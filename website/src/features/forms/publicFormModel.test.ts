import {describe, expect, it} from "vitest";
import {publicFormsCopy} from "../../content/forms";
import {activeMarket} from "../../content/markets";
import {
  answerSummary,
  validatePublicFormAnswers,
  visiblePublicFormSections,
  type PublicFormDefinition,
  type PublicFormAnswers,
  type PublicFormQuestion,
} from "./publicFormModel";

describe("public form model", () => {
  it("applies matching question and section visibility rules", () => {
    const value = definition();
    value.logicRules = [
      {
        ruleId: "hide-details",
        conditionMode: "all",
        conditions: [{
          questionId: "attending",
          operator: "equals",
          expectedValues: [false],
        }],
        action: "hideSection",
        targetQuestionId: null,
        targetSectionId: "details",
      },
      {
        ruleId: "hide-note",
        conditionMode: "all",
        conditions: [{
          questionId: "attending",
          operator: "notAnswered",
          expectedValues: [],
        }],
        action: "hideQuestion",
        targetQuestionId: "note",
        targetSectionId: null,
      },
    ];

    expect(visiblePublicFormSections(value, {})).toHaveLength(2);
    expect(visiblePublicFormSections(value, {})[0].questions).toHaveLength(1);
    expect(visiblePublicFormSections(value, {attending: false})).toHaveLength(1);
  });

  it("validates required, contact, and numeric answers", () => {
    const email = question("email", "Email", "email", true);
    const count = question("count", "Group size", "number", false);
    count.validation.minNumber = 2;
    const errors = validatePublicFormAnswers(
      [email, count],
      {email: "invalid", count: 1}
    );
    expect(errors.email).toBe("Email is invalid.");
    expect(errors.count).toBe("Group size is invalid.");
    expect(validatePublicFormAnswers([email], {})).toEqual({
      email: "Email is required.",
    });
  });

  it("renders stable human-readable answer summaries", () => {
    const text = question("note", "Note", "shortText", false);
    expect(answerSummary(text, ["Walks", "Quiz nights"])).toBe(
      "Walks, Quiz nights"
    );
    expect(answerSummary(text, true)).toBe("Yes");
    expect(answerSummary(text, false)).toBe("No");
    expect(answerSummary(text, 0)).toBe("0");
    expect(answerSummary(text, 12)).toBe("12");
    for (const empty of [undefined, null, "", []]) {
      expect(answerSummary(text, empty)).toBe("");
    }
  });

  it("uses canonical city metadata only for the corresponding profile field", () => {
    const city = {...question("city", "Home city", "shortText", false),
      canonicalFieldId: "city" as const, answerDestination: "catchProfile" as const};
    const cities = [{marketId: "in-mh-mumbai", cityId: "city-mumbai",
      label: activeMarket.cities.find((city) => city.id === "in-mh-mumbai")!.label,
      regionName: "Maharashtra", countryIsoCode: "IN"}];
    expect(answerSummary(city, "in-mh-mumbai", cities)).toBe("Mumbai, Maharashtra");
    expect(answerSummary(city, "city-mumbai", cities)).toBe("city-mumbai");
    expect(answerSummary(city, "retired-city", cities)).toBe("retired-city");
    expect(answerSummary(city, "in-mh-mumbai")).toBe("in-mh-mumbai");
    expect(answerSummary(city, "Pune (manual)", cities)).toBe("Pune (manual)");
    for (const answerDestination of [undefined, "organizerOnly", "organizerCard"] as const) {
      expect(answerSummary({...city, answerDestination}, "in-mh-mumbai", cities))
        .toBe("in-mh-mumbai");
    }
    expect(answerSummary({...city, canonicalFieldId: null}, "in-mh-mumbai", cities))
      .toBe("in-mh-mumbai");
  });

  it("maps choice values to this question's labels and preserves missing options", () => {
    const single = question("pace", "Pace", "singleChoice", false);
    single.options = [
      {optionId: "option-relaxed", value: "pace_easy", label: publicFormsCopy.yes},
      {optionId: "option-brisk", value: "pace_fast", label: publicFormsCopy.no},
    ];
    const multi = {...single, kind: "multiChoice" as const};
    expect(answerSummary(single, "pace_easy")).toBe("Yes");
    expect(answerSummary(single, "option-relaxed")).toBe("option-relaxed");
    expect(answerSummary(single, "removed_value")).toBe("removed_value");
    expect(answerSummary({...single, options: []}, "pace_easy")).toBe("pace_easy");
    expect(answerSummary({...single, options: [{...single.options[0],
      label: publicFormsCopy.review}]}, "pace_easy")).toBe(publicFormsCopy.review);
    expect(answerSummary(multi, ["pace_fast", "removed_value", "pace_easy"]))
      .toBe("No, removed_value, Yes");
    expect(answerSummary({...multi, options: []}, ["pace_easy", "pace_fast"]))
      .toBe("pace_easy, pace_fast");
    expect(answerSummary({...single, kind: "longText"}, "pace_easy")).toBe("pace_easy");
    expect(answerSummary({...multi, kind: "file"}, ["pace_easy"]))
      .toBe("pace_easy");
  });

  it("formats without changing serialized answer values", () => {
    const choices = question("choices", "Choices", "multiChoice", false);
    choices.options = [{optionId: "walk", label: publicFormsCopy.yes, value: "walk_id"}];
    const answers: PublicFormAnswers = {choices: ["walk_id", "retired_id"]};
    const serialized = JSON.stringify(answers);
    expect(answerSummary(choices, answers.choices)).toBe("Yes, retired_id");
    expect(JSON.stringify(answers)).toBe(serialized);
  });

  it("routes and finishes with the same forward-only semantics as submission", () => {
    const value = definition();
    value.sections.push({
      sectionId: "finish",
      title: publicFormsCopy.completionKicker,
      description: null,
      pageBreak: true,
      questions: [question("final", "Final", "shortText", false)],
    });
    value.logicRules = [{
      ruleId: "route",
      conditionMode: "all",
      conditions: [{
        questionId: "attending",
        operator: "equals",
        expectedValues: [true],
      }],
      action: "routeToSection",
      targetQuestionId: null,
      targetSectionId: "finish",
    }];
    expect(visiblePublicFormSections(value, {attending: true})
      .map((section) => section.sectionId)).toEqual(["intro", "finish"]);
    value.logicRules[0].action = "finish";
    value.logicRules[0].targetSectionId = null;
    expect(visiblePublicFormSections(value, {attending: true})
      .map((section) => section.sectionId)).toEqual(["intro"]);
  });

  it("validates dates, option limits, patterns, and answer types", () => {
    const date = question("date", "Date", "date", false);
    date.validation.earliestDate = "2026-01-01";
    date.validation.latestDate = "2026-12-31";
    const choices = question("choices", "Choices", "multiChoice", false);
    choices.options = [
      {optionId: "a", label: publicFormsCopy.yes, value: "a"},
      {optionId: "b", label: publicFormsCopy.no, value: "b"},
    ];
    choices.validation.minSelections = 1;
    choices.validation.maxSelections = 1;
    const handle = question("handle", "Handle", "shortText", false);
    handle.validation.patternPreset = "handle";
    const errors = validatePublicFormAnswers([date, choices, handle], {
      date: "2027-01-01",
      choices: ["a", "b"],
      handle: "bad handle",
    });
    expect(Object.keys(errors)).toEqual(["date", "choices", "handle"]);
    expect(validatePublicFormAnswers([date], {date: 20260101})).toHaveProperty(
      "date"
    );
  });
});

function definition(): PublicFormDefinition {
  return {
    title: publicFormsCopy.brand,
    description: null,
    purpose: "intake",
    defaultTargetKind: "organizer",
    defaultTargetId: null,
    identityPolicy: "anonymous",
    sections: [
      {
        sectionId: "intro",
        title: publicFormsCopy.previous,
        description: null,
        pageBreak: false,
        questions: [
          question("attending", "Are you attending?", "boolean", false),
          question("note", "Anything else?", "shortText", false),
        ],
      },
      {
        sectionId: "details",
        title: publicFormsCopy.identityTitle,
        description: null,
        pageBreak: true,
        questions: [question("email", "Email", "email", true)],
      },
    ],
    logicRules: [],
    appearance: {
      preset: "minimal",
      logoAssetId: null,
      coverAssetId: null,
      activityKind: null,
    },
    availability: {
      opensAt: null,
      closesAt: null,
      responseLimit: null,
      closedMessage: null,
    },
    consent: {
      consentCopy: "I consent.",
      consentVersion: "v1",
      retentionCopy: "Retained for this form purpose.",
    },
    completion: {
      title: publicFormsCopy.completionKicker,
      message: null,
      actionKind: "none",
      actionLabel: null,
      actionUrl: null,
    },
  };
}

function question(
  questionId: string,
  label: string,
  kind: PublicFormQuestion["kind"],
  required: boolean
): PublicFormQuestion {
  return {
    questionId,
    key: questionId,
    label,
    helpText: null,
    kind,
    required,
    options: [],
    canonicalFieldId: null,
    privacyClass: "organizerCustom",
    prefillPolicy: "never",
    hostPresentation: "detailOnly",
    validation: {
      minLength: null,
      maxLength: null,
      minNumber: null,
      maxNumber: null,
      earliestDate: null,
      latestDate: null,
      minSelections: null,
      maxSelections: null,
      maxFileCount: null,
      maxFileSizeBytes: null,
      allowedMimeTypes: [],
      patternPreset: null,
      customError: null,
    },
  };
}
