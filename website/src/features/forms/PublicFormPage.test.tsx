import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {PublicFormQuestion} from "./publicFormModel";
import {publicFormsCopy} from "../../content/forms";

const usePublicFormController = vi.hoisted(() => vi.fn());
vi.mock("./usePublicFormController", () => ({usePublicFormController}));
const formApi = vi.hoisted(() => ({
  getPublicOrganizerForm: vi.fn(), beginOrganizerFormResponse: vi.fn(),
  saveOrganizerFormResponseDraft: vi.fn(), submitOrganizerFormResponse: vi.fn(),
  listParticipantFormActivity: vi.fn(), watchPublicFormAuthState: vi.fn(),
  findOrganizerFormPayment: vi.fn(),
}));
vi.mock("../../firebase", () => ({...formApi,
  beginPublicEventPhoneVerification: vi.fn(), completePublicFormEmailSignIn: vi.fn(),
  createOrganizerFormAssetIntent: vi.fn(), finalizeOrganizerFormAsset: vi.fn(),
  promoteFormCommunicationIntent: vi.fn(), sendPublicFormEmailSignInLink: vi.fn(),
  uploadOrganizerFormAsset: vi.fn(), withdrawOrganizerFormResponse: vi.fn(),
  getOrganizerFormPayment: vi.fn(), prepareOrganizerFormPayment: vi.fn(),
}));
import {PublicFormPage} from "./PublicFormPage";
import {brand} from "@catch/brand";

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

const cities = ["Mumbai", "Bangalore", "Hyderabad", "Ahmedabad", "Dubai"];
const city = {
  questionId: "city", label: "Event city", kind: "singleChoice", required: true,
  options: cities.map((value) => ({optionId: value, value, label: value})),
  validation: {},
} as PublicFormQuestion;

function renderForm(question = city, answer?: string,
  cityOptions?: Array<{marketId: string; cityId: string; label: string;
    regionName: string; countryIsoCode: string}>) {
  const updateAnswer = vi.fn();
  const blurQuestion = vi.fn();
  const section = {title: "Your city", questions: [question]};
  usePublicFormController.mockReturnValue({
    stage: "form", form: {organizer: {name: "Saket Run Club"}, cityOptions, definition: {
      title: "RSVP Escape — demo", appearance: {preset: "editorial"},
      sections: [section],
    }}, activeSection: section, visibleSections: [section], sectionIndex: 0,
    answers: {city: answer}, errors: {}, uploads: {}, updateAnswer,
    blurQuestion,
    status: {message: "", tone: ""},
  });
  render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
  return Object.assign(updateAnswer, {blurQuestion});
}

describe("public form choices", () => {
  it("uses canonical market ids for reusable Catch city answers", () => {
    const change = renderForm({...city, kind: "shortText", options: [],
      canonicalFieldId: "city", answerDestination: "catchProfile",
      label: "Where do you live?"}, "in-mh-mumbai", [{
      marketId: "in-mh-mumbai", cityId: "in-mh-mumbai", label: "Mumbai",
      regionName: "Maharashtra", countryIsoCode: "IN",
    }]);
    const select = screen.getByRole("combobox", {name: "Where do you live?"});
    expect((select as HTMLSelectElement).value).toBe("in-mh-mumbai");
    expect(screen.getByRole("option", {name: "Mumbai, Maharashtra"})).toBeTruthy();
    fireEvent.change(select, {target: {value: "in-mh-mumbai"}});
    expect(change).toHaveBeenCalledWith("city", "in-mh-mumbai");
  });
  it("shows an India country picker instead of asking people to type +91", () => {
    const change = renderForm({...city, label: "Phone number", kind: "phone",
      options: [], canonicalFieldId: null}, "+919876543210");
    const number = screen.getByRole("textbox", {name: "Phone number"}) as HTMLInputElement;
    const country = screen.getByRole("combobox", {name: "Country code"}) as HTMLSelectElement;
    expect(country.value).toBe("+91");
    expect(number.value).toBe("9876543210");
    fireEvent.change(number, {target: {value: "9876543211"}});
    expect(change).toHaveBeenCalledWith("city", "+919876543211");
  });

  it("puts phone verification within the first page without duplicating the phone field", () => {
    const updateAnswer = vi.fn();
    const setPhoneNumber = vi.fn();
    const question = {...city, questionId: "mobile", label: "Mobile number",
      kind: "phone", options: [], canonicalFieldId: "phoneNumber"} as PublicFormQuestion;
    const section = {sectionId: "details", title: "Your details", questions: [question]};
    usePublicFormController.mockReturnValue({
      stage: "form", form: {organizer: {name: "Saket Run Club"}, definition: {
        title: "RSVP Escape", appearance: {preset: "editorial"},
        identityPolicy: "phoneVerified", sections: [section],
      }}, activeSection: section, visibleSections: [section], sectionIndex: 0,
      answers: {}, errors: {mobile: "Mobile number is required."}, uploads: {}, updateAnswer,
      blurQuestion: vi.fn(), setPhoneNumber, phoneNumber: "",
      verifiedPhone: null, verificationStep: "phone", pending: false,
      recaptchaContainerId: "test-recaptcha", status: {message: "", tone: ""},
    });
    render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
    expect(screen.getAllByRole("textbox", {name: "Mobile number"})).toHaveLength(1);
    expect(screen.getByRole("alert").textContent).toBe("Mobile number is required.");
    expect(screen.getByRole("button", {name: "Send code"})).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", {name: "Mobile number"}),
      {target: {value: "9876543210"}});
    expect(setPhoneNumber).toHaveBeenCalledWith("+919876543210");
    expect(updateAnswer).toHaveBeenCalledWith("mobile", "+919876543210");
  });

  it("requests validation when a field loses focus", () => {
    const change = renderForm(city);
    fireEvent.blur(screen.getByRole("combobox", {name: "Event city"}));
    expect(change.blurQuestion).toHaveBeenCalledWith("city");
  });
  it("renders all five cities in an accessible dropdown and preserves values", () => {
    const change = renderForm(city, "Mumbai");
    const select = screen.getByRole("combobox", {name: "Event city"});
    expect((select as HTMLSelectElement).value).toBe("Mumbai");
    expect(screen.getAllByRole("option")).toHaveLength(6);
    fireEvent.change(select, {target: {value: "Dubai"}});
    expect(change).toHaveBeenCalledWith("city", "Dubai");
    fireEvent.change(select, {target: {value: ""}});
    expect(change).toHaveBeenLastCalledWith("city", null);
  });

  it("keeps short choices visible as buttons", () => {
    renderForm({...city, options: city.options.slice(0, 2)});
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("button", {name: "Mumbai"})).not.toBeNull();
  });

  it("labels optional questions and does not give them native required validation", () => {
    renderForm({...city, required: false});
    expect(screen.getByText("optional")).not.toBeNull();
    expect(screen.queryByText("required")).toBeNull();
    expect((screen.getByRole("combobox") as HTMLSelectElement).required).toBe(false);
  });

  it("keeps legacy canonical mappings organizer-only", () => {
    renderForm({...city, canonicalFieldId: "city"});
    expect(screen.getByText("Answers are sent only to the organizer named above.")).not.toBeNull();
    expect(screen.queryByText(/Saved privately until you claim/u)).toBeNull();
  });

  it("explains profile preparation and the claim-and-share boundary", () => {
    renderForm({...city, answerDestination: "catchProfile"});
    expect(screen.getByText(/Catch profile field\. Saved privately/u)).not.toBeNull();
    expect(screen.getByText(/Other users can see only the fields you choose/u)).not.toBeNull();
    expect(screen.queryByText("Answers are sent only to the organizer named above.")).toBeNull();
  });

  it("distinguishes organizer cards from the core profile", () => {
    renderForm({...city, answerDestination: "organizerCard"});
    expect(screen.getByText(/Organizer card field\. Private to you and this organizer/u)).not.toBeNull();
    expect(screen.queryByText(/Catch profile field\./u)).toBeNull();
  });
});

describe("embedded public form resize", () => {
  it("sends dimensions only as the form grows and shrinks", () => {
    const postMessage = vi.fn();
    const originalParent = window.parent;
    const originalReferrer = Object.getOwnPropertyDescriptor(document, "referrer");
    const originalResizeObserver = globalThis.ResizeObserver;
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    let notify: (() => void) | undefined;
    let height = 780;
    try {
      Object.defineProperty(window, "parent", {value: {postMessage}, configurable: true});
      Object.defineProperty(document, "referrer", {value: "https://client.example/apply",
        configurable: true});
      window.history.replaceState({}, "", "/f/public-form-1/?embed=1&embedId=frame_1");
      globalThis.ResizeObserver = class {
        constructor(callback: ResizeObserverCallback) { notify = () => callback([], this); }
        observe() {}
        disconnect() {}
        unobserve() {}
      };
      HTMLElement.prototype.getBoundingClientRect = () => ({height} as DOMRect);
      usePublicFormController.mockReturnValue({embed: true, stage: "loading",
        form: null, status: {message: "", tone: ""}});
      render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
      expect(postMessage).toHaveBeenCalledWith({
        type: "catch:form:resize", version: 1, embedId: "frame_1", height: 780,
      }, "https://client.example");
      height = 420;
      notify?.();
      expect(postMessage).toHaveBeenLastCalledWith({
        type: "catch:form:resize", version: 1, embedId: "frame_1", height: 420,
      }, "https://client.example");
      expect(JSON.stringify(postMessage.mock.calls)).not.toMatch(/answer|draftToken|sourceToken/u);
    } finally {
      Object.defineProperty(window, "parent", {value: originalParent, configurable: true});
      if (originalReferrer) Object.defineProperty(document, "referrer", originalReferrer);
      globalThis.ResizeObserver = originalResizeObserver;
      HTMLElement.prototype.getBoundingClientRect = originalRect;
      window.history.replaceState({}, "", "/");
    }
  });
});

describe("public form payment", () => {
  it("offers recovery on a closed form without implying a new submission", () => {
    const recoverPayment = vi.fn();
    usePublicFormController.mockReturnValue({stage: "unavailable",
      form: {organizer: {name: "RSVP"}, definition: {sections: [],
        appearance: {preset: "minimal"}}}, status: {message: "", tone: ""}, recoverPayment});
    render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", {name: "Check an existing payment"}));
    expect(recoverPayment).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", {name: /Pay ₹/u})).toBeNull();
  });

  it("recovery requests the original phone even after the form changed to anonymous", () => {
    usePublicFormController.mockReturnValue({stage: "identity", recoveringPayment: true,
      form: {organizer: {name: "RSVP"}, definition: {sections: [], identityPolicy: "anonymous",
        appearance: {preset: "minimal"}}}, status: {message: "", tone: ""}, phoneNumber: "",
      setPhoneNumber: vi.fn(), handlePhoneSubmit: vi.fn()});
    render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
    expect(screen.getByRole("heading", {name: "Find your payment"})).not.toBeNull();
    expect(screen.getByRole("textbox", {name: "Mobile number"})).not.toBeNull();
    expect(screen.getByText(/This does not start another payment/u)).not.toBeNull();
  });
  function renderPayment(status: string, checkout = true) {
    const pay = vi.fn();
    const refresh = vi.fn();
    usePublicFormController.mockReturnValue({stage: "payment",
      form: {organizer: {name: "RSVP"}, definition: {sections: [],
        appearance: {preset: "minimal"}, payment: {amountPaise: 20000,
          refundPolicy: "Refunded if cancelled"}}},
      status: {message: "", tone: ""}, pending: false,
      payments: {pay, refresh, pending: false, status: {message: "", tone: ""},
        payment: {status, checkout: checkout ? {} : null, mode: "test",
          amountPaise: 20000, refundPolicy: "Refunded if cancelled"}},
    });
    render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
    return {pay, refresh};
  }

  it("shows the fee, refund policy and admission boundary before checkout", () => {
    const {pay} = renderPayment("checkoutReady");
    expect(screen.getByText("Refunded if cancelled")).not.toBeNull();
    expect(screen.getByText(/Payment does not guarantee acceptance/u)).not.toBeNull();
    expect(screen.getByText(/Test checkout/u)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Pay ₹200 and submit"}));
    expect(pay).toHaveBeenCalledWith("RSVP");
  });

  it("withholds payment and completion controls while verification is uncertain", () => {
    const {refresh} = renderPayment("orderUnknown", false);
    expect(screen.queryByRole("button", {name: /Pay ₹/u})).toBeNull();
    expect(screen.queryByText("Response received")).toBeNull();
    expect(screen.queryByRole("button", {name: "Start a new response"})).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Check payment status"}));
    expect(refresh).toHaveBeenCalledOnce();
  });
});

describe("review messaging choices", () => {
  it("shows two independent unchecked optional controls using the server's copy", () => {
    const updateMessagingChoice = vi.fn();
    usePublicFormController.mockReturnValue({stage: "review", answers: {},
      form: {organizer: {name: "RSVP"}, messagingOffer: {
        termsVersion: "form-whatsapp-v1", organizerWhatsapp: "From RSVP on WhatsApp (optional)",
        catchWhatsapp: "From Catch on WhatsApp (optional)",
      }, definition: {title: "Application", appearance: {preset: "minimal"}, sections: [],
        consent: {retentionCopy: "Keep until withdrawal", consentCopy: "Share answers"}}},
      visibleSections: [], consentAccepted: true,
      messagingChoices: {organizerWhatsapp: false, catchWhatsapp: false},
      updateMessagingChoice, status: {message: "", tone: ""}, pending: false,
    });
    render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
    for (const name of ["From RSVP on WhatsApp (optional)", "From Catch on WhatsApp (optional)"]) {
      const input = screen.getByRole("checkbox", {name}) as HTMLInputElement;
      expect(input.checked).toBe(false);
      expect(input.required).toBe(false);
    }
    fireEvent.click(screen.getByRole("checkbox", {name: "From Catch on WhatsApp (optional)"}));
    expect(updateMessagingChoice).toHaveBeenCalledWith("catchWhatsapp", true);
    expect(screen.getByText(/These choices do not affect your application or payment/u)).not.toBeNull();
  });

  it("keeps all three v2 purposes separate and optional", () => {
    const updateMessagingChoice = vi.fn();
    usePublicFormController.mockReturnValue({stage: "review", answers: {},
      form: {organizer: {name: "RSVP"}, messagingOffer: {
        termsVersion: "form-whatsapp-v2", organizerWhatsapp: null,
        catchWhatsapp: null, organizerOperationsWhatsapp: "Application updates",
        organizerMarketingWhatsapp: "Organizer future events",
        catchMarketingWhatsapp: "Catch future experiences",
      }, definition: {title: "Application", appearance: {preset: "minimal"},
        sections: [], consent: {retentionCopy: "Keep until withdrawal",
          consentCopy: "Share answers"}}},
      visibleSections: [], consentAccepted: true,
      messagingChoices: {organizerOperationsWhatsapp: false,
        organizerMarketingWhatsapp: false, catchMarketingWhatsapp: false},
      messagingEndpointAvailable: true, updateMessagingChoice,
      status: {message: "", tone: ""}, pending: false,
    });
    render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
    for (const name of ["Application updates", "Organizer future events",
      "Catch future experiences"]) {
      const checkbox = screen.getByRole("checkbox", {name}) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      expect(checkbox.required).toBe(false);
    }
    fireEvent.click(screen.getByRole("checkbox", {name: "Application updates"}));
    expect(updateMessagingChoice).toHaveBeenCalledWith(
      "organizerOperationsWhatsapp", true);
    expect(screen.getByText(/only after you verify the same mobile number/u))
      .not.toBeNull();
  });

  it("explains and disables v2 choices when no WhatsApp number is captured", () => {
    usePublicFormController.mockReturnValue({stage: "review", answers: {},
      form: {organizer: {name: "RSVP"}, messagingOffer: {
        termsVersion: "form-whatsapp-v2", organizerOperationsWhatsapp: "Application updates",
      }, definition: {title: "Application", appearance: {preset: "minimal"},
        sections: [], consent: {retentionCopy: "Keep until withdrawal",
          consentCopy: "Share answers"}}},
      visibleSections: [], consentAccepted: true,
      messagingChoices: {organizerOperationsWhatsapp: false},
      messagingEndpointAvailable: false, status: {message: "", tone: ""},
      pending: false,
    });
    render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
    expect((screen.getByRole("checkbox", {name: "Application updates"}) as
      HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(/leave these boxes unchecked/u)).not.toBeNull();
    expect(screen.getByRole("button", {name: "Submit response"})).not.toBeNull();
  });
});

describe("profile review after submission", () => {
  function complete(profileReviewAvailable?: boolean, paymentStatus?: string) {
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "catch-dating-app-64e51");
    usePublicFormController.mockReturnValue({stage: "complete",
      form: {organizer: {name: "RSVP"}, definition: {
        appearance: {preset: "minimal"}, sections: [],
      }}, pending: false, status: {message: "", tone: ""},
      receipt: {responseId: "response-id", profileReviewAvailable,
        completion: {title: "Received", message: "Thank you",
          actionUrl: "https://example.test/next", actionLabel: "Organizer next step"}},
      withdraw: vi.fn(),
      payments: paymentStatus ? {payment: {status: paymentStatus}} : undefined,
    });
    render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
  }
  it("does not claim an existing response disappeared after a refund", () => {
    complete(false, "refunded");
    expect(screen.getByText(/Your payment was refunded\. Your response is still submitted/u)).not.toBeNull();
    expect(screen.queryByText(/No response was submitted/u)).toBeNull();
  });
  it("offers owned review alongside the organizer action and withdrawal", () => {
    complete(true);
    expect(screen.getByRole("link", {name: "Review my profile in Catch"})
      .getAttribute("href")).toBe(`${brand.web.appOrigin}/#/you/forms/response-id`);
    expect(screen.getByText(/same verified phone number/u)).not.toBeNull();
    expect(screen.getByRole("link", {name: "Organizer next step"})).not.toBeNull();
    expect(screen.getByRole("button", {name: "Withdraw response"})).not.toBeNull();
  });
  it.each([false, undefined])("does not offer a claim for a missing proposal: %s", (available) => {
    complete(available);
    expect(screen.queryByRole("link", {name: "Review my profile in Catch"})).toBeNull();
  });
});

it("offers same-number verification for a submitted v2 choice", () => {
  const startConsentPromotion = vi.fn();
  usePublicFormController.mockReturnValue({stage: "complete",
    form: {organizer: {name: "RSVP"}, messagingOffer: {
      termsVersion: "form-whatsapp-v2"}, definition: {
      appearance: {preset: "minimal"}, sections: [],
    }}, pending: false, pendingConsentResponseId: "response-id",
    status: {message: "", tone: ""},
    receipt: {responseId: "response-id", completion: {
      title: "Received", message: "Thank you"}},
    startConsentPromotion, withdraw: vi.fn(),
  });
  render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", {
    name: "Verify number for WhatsApp choices"}));
  expect(startConsentPromotion).toHaveBeenCalledOnce();
});

it("does not prompt verification for unchecked or already promoted choices",
  () => {
    usePublicFormController.mockReturnValue({stage: "complete",
      form: {organizer: {name: "RSVP"}, messagingOffer: {
        termsVersion: "form-whatsapp-v2"}, definition: {
        appearance: {preset: "minimal"}, sections: [],
      }}, pending: false, pendingConsentResponseId: null,
      status: {message: "", tone: ""}, receipt: {
        responseId: "response-id", completion: {
          title: "Received", message: "Thank you"}},
      withdraw: vi.fn(),
    });
    render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
    expect(screen.queryByRole("button", {
      name: "Verify number for WhatsApp choices"})).toBeNull();
  });

describe("previous-response chooser states", () => {
  function chooser(overrides: Record<string, unknown> = {}) {
    const section = {sectionId: "details", title: "Details", questions: [city]};
    usePublicFormController.mockReturnValue({
      stage: "form", form: {organizer: {name: "Demo organizer"}, definition: {
        title: "Application", appearance: {preset: "minimal"}, sections: [section],
      }}, activeSection: section, sectionIndex: 0, visibleSections: [section],
      answers: {}, errors: {}, uploads: {}, status: {message: "", tone: ""},
      canReuseAnswers: true, reuseOpen: true, reuseSources: [], reuseSourceId: "",
      reusePreview: null, reuseSelectedIds: [], reusePending: false,
      reuseStatus: {message: "", tone: ""}, pending: false,
      reuseActivity: {isFetching: false, isPending: false, isError: false,
        hasNextPage: false}, ...overrides,
    });
    render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
  }
  it("keeps an empty scanned page navigable when the account cursor continues", () => {
    const fetchNextPage = vi.fn();
    chooser({reuseActivity: {isPending: false, isFetching: false,
      isError: false, hasNextPage: true, fetchNextPage}});
    expect(screen.getByText(/responses checked so far/u)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Show more previous responses"}));
    expect(fetchNextPage).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", {name: "Use selected answers"})).toBeNull();
  });
  it("offers a retry for a failed metadata read without blocking manual questions", () => {
    const refetch = vi.fn();
    chooser({reuseActivity: {isPending: false, isFetching: false,
      isError: true, hasNextPage: false, refetch}});
    fireEvent.click(screen.getByRole("button", {name: "Try checking again"}));
    expect(refetch).toHaveBeenCalledOnce();
    expect(screen.getAllByText("Event city").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", {name: "Review answers"})).not.toBeNull();
  });
  it("does not present account-owned reuse controls without current access", () => {
    chooser({canReuseAnswers: false});
    expect(screen.queryByText("Review previous answers")).toBeNull();
    expect(screen.getByRole("button", {name: "Review answers"})).not.toBeNull();
  });
});

const displayQuestion = {...city, validation: {
  minLength: null, maxLength: null, minNumber: null, maxNumber: null,
  earliestDate: null, latestDate: null, minSelections: null, maxSelections: null,
  maxFileCount: null, maxFileSizeBytes: null, allowedMimeTypes: [],
  patternPreset: null, customError: null,
}};
const canonicalCity = {...displayQuestion, questionId: "home", label: "Home city",
  kind: "shortText", options: [], canonicalFieldId: "city",
  answerDestination: "catchProfile"} as PublicFormQuestion;
const cityMetadata = [
  {marketId: "in-mh-mumbai", cityId: "city-mumbai", label: "Mumbai",
    regionName: "Maharashtra", countryIsoCode: "IN"},
  {marketId: "in-ka-bengaluru", cityId: "city-bengaluru", label: "Bengaluru",
    regionName: "Karnataka", countryIsoCode: "IN"},
];
const pace = {...displayQuestion, questionId: "pace", label: "Running pace", required: false,
  prefillPolicy: "participantReviewRequired", options: [
    {optionId: "easy-option", value: "pace_easy", label: "Relaxed"},
    {optionId: "fast-option", value: "pace_fast", label: "Brisk"},
  ]} as PublicFormQuestion;
const interests = {...pace, questionId: "interests", label: "Activities",
  kind: "multiChoice", options: [
    {optionId: "walk-option", value: "walk_id", label: "Walks"},
    {optionId: "quiz-option", value: "quiz_id", label: "Quiz nights"},
    {optionId: "cycle-option", value: "cycle_id", label: "Cycling"},
  ]} as PublicFormQuestion;
const organizerCity = {...pace, questionId: "destination", label: "Event city",
  canonicalFieldId: null, options: [
    {optionId: "pune-option", value: "destination_pune", label: "Pune"},
    {optionId: "delhi-option", value: "destination_delhi", label: "New Delhi"},
  ]} as PublicFormQuestion;
const note = {...pace, questionId: "note", label: "Your note", kind: "longText",
  options: []} as PublicFormQuestion;
const displaySection = {sectionId: "details", title: "Your details",
  questions: [canonicalCity, organizerCity, pace, interests, note]};
const displayForm = {
  publicFormId: "display-form", formId: "form-1", versionId: "version-1",
  availabilityStatus: "active", cityOptions: cityMetadata,
  organizer: {organizerId: "organizer-1", name: "Demo organizer"},
  definition: {title: "Application", identityPolicy: "emailVerified",
    appearance: {preset: "minimal"}, sections: [displaySection], logicRules: [],
    consent: {consentCopy: "Share my answers", retentionCopy: "Keep until withdrawal"}},
  messagingOffer: {termsVersion: "form-whatsapp-v1",
    organizerWhatsapp: "Organizer WhatsApp (optional)", catchWhatsapp: "Catch WhatsApp (optional)"},
};
const previousResponse = {sourceKind: "formResponse", sourceId: "previous-1",
  organizerId: "organizer-1", formId: "form-1", versionId: "previous-version",
  submittedAtMillis: 1000};

function reviewAnswer(label: string) {
  const term = screen.getByText(label, {selector: "dt"});
  return term.nextElementSibling?.textContent;
}

function expectUncheckedMessaging() {
  for (const name of ["Organizer WhatsApp (optional)", "Catch WhatsApp (optional)"]) {
    const checkbox = screen.getByRole("checkbox", {name}) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.required).toBe(false);
  }
}

describe("question-aware review and reuse displays", () => {
  beforeEach(async () => {
    const actual = await vi.importActual<typeof import("./usePublicFormController")>(
      "./usePublicFormController");
    usePublicFormController.mockImplementation(actual.usePublicFormController);
    window.localStorage.clear();
    window.sessionStorage.clear();
    formApi.getPublicOrganizerForm.mockResolvedValue(displayForm);
    formApi.watchPublicFormAuthState.mockImplementation((listener) => {
      listener({uid: "person-1"});
      return vi.fn();
    });
    formApi.findOrganizerFormPayment.mockResolvedValue({payment: null});
    formApi.beginOrganizerFormResponse.mockResolvedValue({
      draftId: "draft-1", draftToken: null, revision: 1, form: displayForm,
      answers: {}, consentAccepted: false, expiresAtMillis: 100000,
    });
    formApi.saveOrganizerFormResponseDraft.mockResolvedValue({revision: 2,
      expiresAtMillis: 200000});
    formApi.submitOrganizerFormResponse.mockResolvedValue({responseId: "response-1",
      formId: "form-1", versionId: "version-1", status: "submitted",
      completion: {title: "Received", message: "Thank you"}});
    formApi.listParticipantFormActivity.mockResolvedValue({items: [previousResponse],
      nextCursor: null});
  });

  async function load() {
    const client = new QueryClient({defaultOptions: {
      queries: {retry: false}, mutations: {retry: false},
    }});
    render(<QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/f/display-form/"]}>
        <Routes><Route path="/f/:publicFormId/" element={<PublicFormPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>);
    await waitFor(() => expect(formApi.beginOrganizerFormResponse).toHaveBeenCalledOnce());
    await screen.findByRole("button", {name: "Use answers from a previous response"});
  }

  async function review() {
    fireEvent.click(screen.getByRole("button", {name: "Review answers"}));
    await screen.findByRole("heading", {name: publicFormsCopy.reviewTitle});
  }

  it("keeps corrected edit/Review/Back values serialized as ids with fresh consent", async () => {
    await load();
    fireEvent.change(screen.getByRole("combobox", {name: "Home city"}),
      {target: {value: "in-mh-mumbai"}});
    fireEvent.click(screen.getByRole("button", {name: "Relaxed"}));
    fireEvent.click(screen.getByRole("button", {name: "Walks"}));
    fireEvent.click(screen.getByRole("button", {name: "Quiz nights"}));
    fireEvent.change(screen.getByRole("textbox", {name: "Your note"}),
      {target: {value: "My manual answer"}});
    await review();
    expect(reviewAnswer("Home city")).toBe("Mumbai, Maharashtra");
    expect(reviewAnswer("Running pace")).toBe("Relaxed");
    expect(reviewAnswer("Activities")).toBe("Walks, Quiz nights");
    expect(reviewAnswer("Your note")).toBe("My manual answer");
    expectUncheckedMessaging();
    expect(formApi.saveOrganizerFormResponseDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({answers: {home: "in-mh-mumbai", pace: "pace_easy",
        interests: ["walk_id", "quiz_id"], note: "My manual answer"},
      consentAccepted: false}));

    fireEvent.click(screen.getByRole("button", {name: "Back"}));
    expect((screen.getByRole("combobox", {name: "Home city"}) as HTMLSelectElement).value)
      .toBe("in-mh-mumbai");
    fireEvent.change(screen.getByRole("combobox", {name: "Home city"}),
      {target: {value: "in-ka-bengaluru"}});
    fireEvent.click(screen.getByRole("button", {name: "Brisk"}));
    fireEvent.click(screen.getByRole("button", {name: "Quiz nights"}));
    fireEvent.click(screen.getByRole("button", {name: "Cycling"}));
    await review();
    expect(reviewAnswer("Home city")).toBe("Bengaluru, Karnataka");
    expect(reviewAnswer("Running pace")).toBe("Brisk");
    expect(reviewAnswer("Activities")).toBe("Walks, Cycling");
    expectUncheckedMessaging();
    fireEvent.click(screen.getByRole("checkbox", {name: "Share my answers"}));
    fireEvent.click(screen.getByRole("button", {name: "Submit response"}));
    await screen.findByRole("heading", {name: "Received"});
    expect(formApi.saveOrganizerFormResponseDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({answers: {home: "in-ka-bengaluru", pace: "pace_fast",
        interests: ["walk_id", "cycle_id"], note: "My manual answer"},
      consentAccepted: true, messagingChoices: {termsVersion: "form-whatsapp-v1",
        organizerWhatsapp: false, catchWhatsapp: false}}));
    expect(formApi.submitOrganizerFormResponse).toHaveBeenCalledWith(
      expect.objectContaining({draftId: "draft-1", expectedRevision: 2}));
  });

  it("previews current labels then applies stored ids without replacing manual text or consent", async () => {
    await load();
    fireEvent.change(screen.getByRole("combobox", {name: "Home city"}),
      {target: {value: "in-mh-mumbai"}});
    fireEvent.change(screen.getByRole("textbox", {name: "Your note"}),
      {target: {value: "Keep my manual answer"}});
    fireEvent.click(screen.getByRole("button", {name: "Use answers from a previous response"}));
    fireEvent.change(await screen.findByRole("combobox", {name: "Previous response"}),
      {target: {value: "previous-1"}});
    formApi.beginOrganizerFormResponse.mockResolvedValueOnce({
      draftId: "draft-1", draftToken: null, revision: 1, form: displayForm,
      prefillSuggestions: {destination: "destination_pune", pace: "pace_easy",
        interests: ["walk_id", "quiz_id"], note: "Old manual text"},
      prefillSource: {responseId: "previous-1", versionId: "previous-version",
        submittedAtMillis: 1000},
    });
    fireEvent.click(screen.getByRole("button", {name: "Review this response"}));
    const previewCity = await screen.findByRole("checkbox", {name: "Event city"});
    expect(screen.getByText("Pune", {selector: "dd"})).toBeTruthy();
    expect(screen.getByText("Relaxed", {selector: "dd"})).toBeTruthy();
    expect(screen.getByText("Walks, Quiz nights", {selector: "dd"})).toBeTruthy();
    expect(screen.queryByRole("checkbox", {name: "Your note"})).toBeNull();
    expect((previewCity as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("button", {name: "Use selected answers"}) as HTMLButtonElement)
      .disabled).toBe(true);
    for (const name of ["Event city", "Running pace", "Activities"]) {
      fireEvent.click(screen.getByRole("checkbox", {name}));
    }
    fireEvent.click(screen.getByRole("button", {name: "Use selected answers"}));
    expect(screen.getByRole("button", {name: "Pune"}).getAttribute("aria-pressed"))
      .toBe("true");
    expect(screen.getByRole("button", {name: "Relaxed"}).getAttribute("aria-pressed"))
      .toBe("true");
    await review();
    expect(reviewAnswer("Event city")).toBe("Pune");
    expect(reviewAnswer("Home city")).toBe("Mumbai, Maharashtra");
    expect(reviewAnswer("Your note")).toBe("Keep my manual answer");
    expectUncheckedMessaging();
    expect((screen.getByRole("checkbox", {name: "Share my answers"}) as HTMLInputElement)
      .checked).toBe(false);
    expect(formApi.saveOrganizerFormResponseDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({answers: {home: "in-mh-mumbai", destination: "destination_pune",
        pace: "pace_easy", interests: ["walk_id", "quiz_id"], note: "Keep my manual answer"},
      consentAccepted: false, messagingChoices: {termsVersion: "form-whatsapp-v1",
        organizerWhatsapp: false, catchWhatsapp: false}}));
  });
});

it("renders honest review fallbacks for missing/deprecated metadata and scalar/empty answers", () => {
  const questions = [canonicalCity, pace, interests, note,
    {...pace, questionId: "count", label: "Count", kind: "number"},
    {...pace, questionId: "flag", label: "Flag", kind: "boolean"},
    {...pace, questionId: "empty", label: "Empty"},
  ];
  const section = {...displaySection, questions};
  usePublicFormController.mockReturnValue({stage: "review",
    form: {...displayForm, cityOptions: undefined,
      definition: {...displayForm.definition, sections: [section]}},
    visibleSections: [section], answers: {home: "in-mh-mumbai", pace: "retired_pace",
      interests: ["walk_id", "deleted_id"], note: "pace_easy", count: 0, flag: false},
    consentAccepted: false, messagingChoices: {organizerWhatsapp: false, catchWhatsapp: false},
    status: {message: "", tone: ""}, pending: false,
  });
  const view = render(<MemoryRouter><PublicFormPage /></MemoryRouter>);
  expect(reviewAnswer("Home city")).toBe("in-mh-mumbai");
  expect(reviewAnswer("Running pace")).toBe("retired_pace");
  expect(reviewAnswer("Activities")).toBe("Walks, deleted_id");
  expect(reviewAnswer("Your note")).toBe("pace_easy");
  expect(reviewAnswer("Count")).toBe("0");
  expect(reviewAnswer("Flag")).toBe("No");
  expect(reviewAnswer("Empty")).toBe("Not answered");
  expect(within(view.container).queryByText("Relaxed", {selector: "dd"})).toBeNull();
});
