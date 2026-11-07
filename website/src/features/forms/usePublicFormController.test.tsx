import {Blob as NodeBlob} from "node:buffer";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, fireEvent, render, renderHook, screen, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {MemoryRouter, Route, Routes} from "react-router";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const beginOrganizerFormResponse = vi.hoisted(() => vi.fn());
const beginPublicEventPhoneVerification = vi.hoisted(() => vi.fn());
const promoteFormCommunicationIntent = vi.hoisted(() => vi.fn());
const saveOrganizerFormResponseDraft = vi.hoisted(() => vi.fn());
const submitOrganizerFormResponse = vi.hoisted(() => vi.fn());
const listParticipantFormActivity = vi.hoisted(() => vi.fn());
const getPublicOrganizerForm = vi.hoisted(() => vi.fn());
const watchPublicFormAuthState = vi.hoisted(() => vi.fn());
const findOrganizerFormPayment = vi.hoisted(() => vi.fn());
const createOrganizerFormAssetIntent = vi.hoisted(() => vi.fn());
const uploadOrganizerFormAsset = vi.hoisted(() => vi.fn());
const finalizeOrganizerFormAsset = vi.hoisted(() => vi.fn());

vi.mock("../../firebase", () => ({
  beginOrganizerFormResponse,
  beginPublicEventPhoneVerification,
  completePublicFormEmailSignIn: vi.fn(),
  createOrganizerFormAssetIntent,
  finalizeOrganizerFormAsset,
  getPublicOrganizerForm,
  listParticipantFormActivity,
  promoteFormCommunicationIntent,
  findOrganizerFormPayment,
  saveOrganizerFormResponseDraft,
  sendPublicFormEmailSignInLink: vi.fn(),
  submitOrganizerFormResponse,
  uploadOrganizerFormAsset,
  watchPublicFormAuthState,
  withdrawOrganizerFormResponse: vi.fn(),
}));

import {usePublicFormController} from "./usePublicFormController";
import {PublicFormPage} from "./PublicFormPage";
import type {PublicFormQuestion} from "./publicFormModel";

beforeEach(() => {findOrganizerFormPayment.mockResolvedValue({payment: null});});
afterEach(() => {cleanup(); vi.restoreAllMocks();});

function wrapper() {
  const client = new QueryClient({
    defaultOptions: {mutations: {retry: false}, queries: {retry: false}},
  });
  return function Wrapper({children}: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("usePublicFormController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    watchPublicFormAuthState.mockImplementation((listener) => {
      listener(null);
      return vi.fn();
    });
  });

  it("fails closed with a useful status when the public form cannot load", async () => {
    getPublicOrganizerForm.mockRejectedValue(new Error("Form unavailable"));
    const {result} = renderHook(
      () => usePublicFormController("public-form-1"),
      {wrapper: wrapper()}
    );

    await waitFor(() => expect(result.current.stage).toBe("unavailable"));
    expect(result.current.status).toEqual({
      message: "Form unavailable",
      tone: "is-error",
    });
    expect(getPublicOrganizerForm).toHaveBeenCalledWith({
      publicFormId: "public-form-1",
      sourceToken: null,
    });
  });

  it("starts the public form fetch before loading the Auth observer", async () => {
    let finishFetch!: (value: typeof form) => void;
    getPublicOrganizerForm.mockImplementation(() => new Promise((resolve) => {
      finishFetch = resolve;
    }));
    const view = renderHook(() => usePublicFormController(
      "public-form-1"), {wrapper: wrapper()});
    expect(getPublicOrganizerForm).toHaveBeenCalledOnce();
    expect(watchPublicFormAuthState).not.toHaveBeenCalled();
    await act(async () => finishFetch(form));
    await waitFor(() => expect(view.result.current.stage).toBe("form"));
    expect(watchPublicFormAuthState).toHaveBeenCalledOnce();
  });
});

const form = {
  publicFormId: "public-form-1", formId: "form-1", versionId: "version-1",
  availabilityStatus: "active", organizer: {name: "Demo organizer"},
  definition: {identityPolicy: "phoneVerified", payment: null, logicRules: [],
    consent: {consentCopy: "Share my answers"},
    sections: [{sectionId: "details", title: "Details", questions: []}]},
  messagingOffer: {termsVersion: "form-whatsapp-v1",
    organizerWhatsapp: "Organizer WhatsApp", catchWhatsapp: "Catch WhatsApp"},
};
const draft = {draftId: "draft-1", draftToken: null, revision: 1, form,
  answers: {}, consentAccepted: false, expiresAtMillis: 100000};

describe("form consent and authenticated draft ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    watchPublicFormAuthState.mockImplementation((listener) => {
      listener({uid: "person-1"});
      return vi.fn();
    });
    getPublicOrganizerForm.mockResolvedValue(form);
    beginOrganizerFormResponse.mockResolvedValue(draft);
    saveOrganizerFormResponseDraft.mockResolvedValue({revision: 2, expiresAtMillis: 200000});
    submitOrganizerFormResponse.mockResolvedValue({responseId: "response-1", formId: "form-1",
      status: "submitted", completion: {title: "Received"}});
  });

  it("shows a field error when focus leaves it and clears it while editing", async () => {
    const emailQuestion = {questionId: "email", label: "Email address",
      kind: "email", required: true, options: [], validation: {
        minLength: null, maxLength: null, patternPreset: null,
        customError: null}};
    const emailForm = {...form, definition: {...form.definition,
      sections: [{sectionId: "details", title: "Details",
        questions: [emailQuestion]}]}};
    getPublicOrganizerForm.mockResolvedValue(emailForm);
    beginOrganizerFormResponse.mockResolvedValue({...draft, form: emailForm});
    const {result} = renderHook(() => usePublicFormController(
      "public-form-1"), {wrapper: wrapper()});
    await waitFor(() => expect(result.current.stage).toBe("form"));
    act(() => result.current.updateAnswer("email", "wrong"));
    expect(result.current.errors).toEqual({});
    act(() => result.current.blurQuestion("email"));
    expect(result.current.errors.email).toBe("Email address is invalid.");
    act(() => result.current.updateAnswer("email", "person@example.com"));
    expect(result.current.errors).toEqual({});
    act(() => result.current.blurQuestion("email"));
    expect(result.current.errors).toEqual({});
  });

  it("recovers a paid response even when the current form is full and republished", async () => {
    getPublicOrganizerForm.mockResolvedValue({...form, availabilityStatus: "full", versionId: "version-2"});
    findOrganizerFormPayment.mockResolvedValue({payment: recoveredPayment});
    const {result} = renderHook(() => usePublicFormController("public-form-1"), {wrapper: wrapper()});
    await waitFor(() => expect(result.current.stage).toBe("complete"));
    expect(result.current.receipt?.versionId).toBe("version-1");
    expect(beginOrganizerFormResponse).not.toHaveBeenCalled();
  });

  it("allows phone verification to recover a closed form without creating a draft", async () => {
    let authChanged!: (value: {uid: string} | null) => void;
    watchPublicFormAuthState.mockImplementation((listener) => {
      authChanged = listener; listener(null); return vi.fn();
    });
    getPublicOrganizerForm.mockResolvedValue({...form, availabilityStatus: "paused"});
    const {result} = renderHook(() => usePublicFormController("public-form-1"), {wrapper: wrapper()});
    await waitFor(() => expect(result.current.stage).toBe("unavailable"));
    act(() => result.current.recoverPayment());
    expect(result.current.stage).toBe("identity");
    expect(result.current.recoveringPayment).toBe(true);
    findOrganizerFormPayment.mockResolvedValue({payment: recoveredPayment});
    act(() => authChanged({uid: "person-1"}));
    await waitFor(() => expect(result.current.stage).toBe("complete"));
    expect(beginOrganizerFormResponse).not.toHaveBeenCalled();
  });

  it("never begins a new draft after an unavailable recovery lookup", async () => {
    findOrganizerFormPayment.mockRejectedValue(new Error("Payment lookup unavailable"));
    const {result} = renderHook(() => usePublicFormController("public-form-1"), {wrapper: wrapper()});
    await waitFor(() => expect(result.current.status.message).toBe("Payment lookup unavailable"));
    expect(result.current.stage).toBe("unavailable");
    expect(beginOrganizerFormResponse).not.toHaveBeenCalled();
  });

  it("submits with an in-memory draft id when browser storage is unavailable", async () => {
    for (const method of ["getItem", "setItem", "removeItem"] as const) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => {throw new Error("Denied");});
    }
    const {result} = renderHook(() => usePublicFormController("public-form-1"), {wrapper: wrapper()});
    await waitFor(() => expect(result.current.stage).toBe("form"));
    act(() => result.current.updateConsent(true));
    await act(async () => {await result.current.submit();});
    expect(result.current.stage).toBe("complete");
  });

  it("restores a free receipt only for its cached account owner", async () => {
    window.localStorage.setItem("catch:form:public-form-1:receipt", JSON.stringify({
      ...recoveredPayment.receipt, cacheOwnerUid: "person-1",
    }));
    const first = renderHook(() => usePublicFormController("public-form-1"), {wrapper: wrapper()});
    await waitFor(() => expect(first.result.current.stage).toBe("complete"));
    expect(beginOrganizerFormResponse).not.toHaveBeenCalled();
    first.unmount();
    watchPublicFormAuthState.mockImplementation((listener) => {
      listener({uid: "other"}); return vi.fn();
    });
    const second = renderHook(() => usePublicFormController("public-form-1"), {wrapper: wrapper()});
    await waitFor(() => expect(second.result.current.stage).toBe("form"));
    expect(second.result.current.receipt).toBeNull();
  });

  it("starts unchecked and persists independent optional choices with the submitted snapshot", async () => {
    const {result} = renderHook(() => usePublicFormController("public-form-1"), {wrapper: wrapper()});
    await waitFor(() => expect(result.current.stage).toBe("form"));
    expect(result.current.messagingChoices).toEqual({termsVersion: "form-whatsapp-v1",
      organizerWhatsapp: false, catchWhatsapp: false});
    act(() => {
      result.current.updateConsent(true);
      result.current.updateMessagingChoice("organizerWhatsapp", true);
    });
    await act(async () => { await result.current.submit(); });
    expect(saveOrganizerFormResponseDraft).toHaveBeenLastCalledWith(expect.objectContaining({
      consentAccepted: true, messagingChoices: {termsVersion: "form-whatsapp-v1",
        organizerWhatsapp: true, catchWhatsapp: false},
    }));
    expect(result.current.stage).toBe("complete");
  });

  it("submits normally with neither optional choice selected", async () => {
    const {result} = renderHook(() => usePublicFormController("public-form-1"), {wrapper: wrapper()});
    await waitFor(() => expect(result.current.stage).toBe("form"));
    act(() => result.current.updateConsent(true));
    await act(async () => { await result.current.submit(); });
    expect(submitOrganizerFormResponse).toHaveBeenCalledTimes(1);
    expect(saveOrganizerFormResponseDraft.mock.calls[0][0].messagingChoices)
      .toEqual({termsVersion: "form-whatsapp-v1", organizerWhatsapp: false, catchWhatsapp: false});
  });

  it("does not propose activation after every v2 choice stays unchecked",
    async () => {
      const v2 = {...form, messagingOffer: {termsVersion:
        "form-whatsapp-v2", organizerWhatsapp: null, catchWhatsapp: null,
        organizerOperationsWhatsapp: "Application updates"}};
      getPublicOrganizerForm.mockResolvedValue(v2);
      beginOrganizerFormResponse.mockResolvedValue({...draft, form: v2});
      const {result} = renderHook(() => usePublicFormController(
        "public-form-1"), {wrapper: wrapper()});
      await waitFor(() => expect(result.current.stage).toBe("form"));
      act(() => result.current.updateConsent(true));
      await act(async () => {await result.current.submit();});
      expect(result.current.stage).toBe("complete");
      expect(result.current.pendingConsentResponseId).toBeNull();
      expect(window.localStorage.getItem(
        "catch:form:public-form-1:consent-intent-hint")).toBeNull();
    });

  for (const step of ["intent", "upload", "finalize"] as const) {
    for (const outcome of ["success", "failure"] as const) {
      it(`ignores an old account's ${step} ${outcome} after switching identity`, async () => {
        let authChanged!: (value: {uid: string}) => void;
        watchPublicFormAuthState.mockImplementation((listener) => {
          authChanged = listener; listener({uid: "person-1"}); return vi.fn();
        });
        const intent = {assetId: "old-private-photo", uploadToken: "old-upload"};
        createOrganizerFormAssetIntent.mockResolvedValue(intent);
        uploadOrganizerFormAsset.mockResolvedValue(undefined);
        finalizeOrganizerFormAsset.mockResolvedValue(undefined);
        const pendingStep = {intent: createOrganizerFormAssetIntent,
          upload: uploadOrganizerFormAsset, finalize: finalizeOrganizerFormAsset}[step];
        let finish!: (value?: unknown) => void;
        let reject!: (error: Error) => void;
        pendingStep.mockImplementationOnce(() => new Promise((resolve, fail) => {
          finish = resolve; reject = fail;
        }));
        const {result} = renderHook(() => usePublicFormController("public-form-1"), {wrapper: wrapper()});
        await waitFor(() => expect(result.current.stage).toBe("form"));
        let uploading!: Promise<void>;
        act(() => {
          uploading = result.current.uploadAnswer(photoQuestion, [photoFile]);
        });
        await waitFor(() => expect(pendingStep).toHaveBeenCalledTimes(1));
        beginOrganizerFormResponse.mockResolvedValue({...draft, draftId: "draft-2"});
        act(() => authChanged({uid: "person-2"}));
        await waitFor(() => expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(2));
        await act(async () => {
          if (outcome === "success") finish(intent);
          else reject(new Error("Old account upload failed"));
          await uploading;
        });
        expect(result.current.answers).toEqual({});
        expect(result.current.uploads).toEqual({});
        expect(result.current.uploadInProgress).toBe(false);
        expect(result.current.status.message).toBe("");
        if (step === "intent") expect(uploadOrganizerFormAsset).not.toHaveBeenCalled();
        if (step !== "finalize") expect(finalizeOrganizerFormAsset).not.toHaveBeenCalled();
      });
    }
  }

  it("keeps a successful upload on its original account's draft", async () => {
    createOrganizerFormAssetIntent.mockResolvedValue({assetId: "photo-1", uploadToken: "upload-1"});
    uploadOrganizerFormAsset.mockResolvedValue(undefined);
    finalizeOrganizerFormAsset.mockResolvedValue(undefined);
    const {result} = renderHook(() => usePublicFormController("public-form-1"), {wrapper: wrapper()});
    await waitFor(() => expect(result.current.stage).toBe("form"));
    await act(async () => {await result.current.uploadAnswer(photoQuestion, [photoFile]);});
    expect(result.current.answers).toEqual({photo: ["photo-1"]});
    expect(result.current.uploads.photo.status).toBe("ready");
    expect(finalizeOrganizerFormAsset).toHaveBeenCalledWith({draftId: "draft-1",
      draftToken: null, assetId: "photo-1", uploadToken: "upload-1"});
  });

  it("an old identity's draft result cannot populate the next identity's form", async () => {
    let authChanged: (value: {uid: string}) => void = () => undefined;
    watchPublicFormAuthState.mockImplementation((listener) => {
      authChanged = listener; listener({uid: "person-1"}); return vi.fn();
    });
    let finishOld: (value: unknown) => void = () => undefined;
    beginOrganizerFormResponse.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
    beginOrganizerFormResponse.mockResolvedValue({...draft, draftId: "draft-2"});
    const {result} = renderHook(() => usePublicFormController("public-form-1"), {wrapper: wrapper()});
    await waitFor(() => expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(1));
    act(() => authChanged({uid: "person-2"}));
    await waitFor(() => expect(result.current.stage).toBe("form"));
    await act(async () => { finishOld({...draft, answers: {secret: "private old answer"},
      messagingChoices: {termsVersion: "form-whatsapp-v1", organizerWhatsapp: true, catchWhatsapp: true}}); });
    expect(result.current.answers).toEqual({});
    expect(result.current.messagingChoices.organizerWhatsapp).toBe(false);
    expect(result.current.messagingChoices.catchWhatsapp).toBe(false);
  });

  it("waits for fresh auth before beginning a draft after the form route changes", async () => {
    const nextForm = {...form, publicFormId: "public-form-2",
      formId: "form-2", versionId: "version-2"};
    const listeners: Array<(user: {uid: string} | null) => void> = [];
    watchPublicFormAuthState.mockImplementation((listener) => {
      listeners.push(listener);
      if (listeners.length === 1) listener({uid: "person-1"});
      return vi.fn();
    });
    getPublicOrganizerForm.mockImplementation(({publicFormId}) =>
      Promise.resolve(publicFormId === "public-form-2" ? nextForm : form));
    beginOrganizerFormResponse.mockImplementation(({publicFormId}) =>
      Promise.resolve({...draft, form: publicFormId === "public-form-2" ?
        nextForm : form}));
    const {rerender} = renderHook(({id}) => usePublicFormController(id), {
      initialProps: {id: "public-form-1"}, wrapper: wrapper(),
    });
    await waitFor(() => expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(1));
    rerender({id: "public-form-2"});
    await waitFor(() => expect(watchPublicFormAuthState).toHaveBeenCalledTimes(2));
    expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(1);
    act(() => listeners[1](null));
    expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(1);
    act(() => listeners[1]({uid: "person-2"}));
    await waitFor(() => expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(2));
    expect(beginOrganizerFormResponse).toHaveBeenLastCalledWith(
      expect.objectContaining({publicFormId: "public-form-2"}));
  });

  it("does not reuse the previous viewer for an anonymous form route", async () => {
    const nextForm = {...form, publicFormId: "public-form-2",
      formId: "form-2", versionId: "version-2", definition: {
        ...form.definition, identityPolicy: "anonymous"}};
    const listeners: Array<(user: {uid: string} | null) => void> = [];
    watchPublicFormAuthState.mockImplementation((listener) => {
      listeners.push(listener);
      if (listeners.length === 1) listener({uid: "person-1"});
      return vi.fn();
    });
    getPublicOrganizerForm.mockImplementation(({publicFormId}) =>
      Promise.resolve(publicFormId === "public-form-2" ? nextForm : form));
    const {rerender} = renderHook(({id}) => usePublicFormController(id), {
      initialProps: {id: "public-form-1"}, wrapper: wrapper(),
    });
    await waitFor(() => expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(1));
    rerender({id: "public-form-2"});
    await waitFor(() => expect(watchPublicFormAuthState).toHaveBeenCalledTimes(2));
    expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(1);
    act(() => listeners[1](null));
    await waitFor(() => expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(2));
    expect(beginOrganizerFormResponse).toHaveBeenLastCalledWith(
      expect.objectContaining({publicFormId: "public-form-2"}));
  });
});

describe("early non-blocking phone verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("keeps answers entered while OTP arrives and binds them to the verified draft", async () => {
    let authChanged!: (user: {uid: string; phoneNumber: string} | null) => void;
    watchPublicFormAuthState.mockImplementation((listener) => {
      authChanged = listener;
      listener(null);
      return vi.fn();
    });
    const phoneQuestion = {questionId: "mobile", key: "mobile",
      label: "Mobile number", kind: "phone", required: true,
      canonicalFieldId: "phoneNumber", options: [], validation: {
        minLength: null, maxLength: null, patternPreset: null}};
    const verifiedForm = {...form, definition: {...form.definition,
      sections: [{sectionId: "details", title: "Details",
        questions: [phoneQuestion]}]}};
    getPublicOrganizerForm.mockResolvedValue(verifiedForm);
    beginOrganizerFormResponse.mockResolvedValue({...draft, form: verifiedForm,
      prefillSuggestions: {name: "Saved name", city: "in-mh-mumbai"}});
    saveOrganizerFormResponseDraft.mockResolvedValue({revision: 2,
      expiresAtMillis: 200000});
    const confirmed = {uid: "person-1", phoneNumber: "+919876543210"};
    beginPublicEventPhoneVerification.mockResolvedValue({
      clear: vi.fn(),
      confirm: vi.fn(async () => {
        authChanged(confirmed);
        return confirmed;
      }),
    });
    const {result} = renderHook(() => usePublicFormController(
      "public-form-1"), {wrapper: wrapper()});
    await waitFor(() => expect(result.current.stage).toBe("form"));
    expect(beginOrganizerFormResponse).not.toHaveBeenCalled();
    act(() => {
      result.current.updateAnswer("name", "Maya");
      result.current.updateAnswer("mobile", "+919876543210");
      result.current.setPhoneNumber("+919876543210");
    });
    await act(async () => {
      await result.current.handlePhoneSubmit({preventDefault: vi.fn()} as never);
    });
    expect(result.current.stage).toBe("form");
    expect(result.current.verificationStep).toBe("code");
    await act(async () => {
      await result.current.handleCodeSubmit({preventDefault: vi.fn()} as never);
    });
    await waitFor(() => expect(result.current.answers).toEqual({
      name: "Maya", mobile: "+919876543210", city: "in-mh-mumbai",
    }));
    expect(result.current.verifiedPhone).toBe("+919876543210");
    await waitFor(() => expect(saveOrganizerFormResponseDraft)
      .toHaveBeenCalledWith(expect.objectContaining({answers: {
        name: "Maya", mobile: "+919876543210", city: "in-mh-mumbai",
      }})));
  });
});

it("keeps an anonymous receipt through same-number OTP and promotes its source",
  async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    let authChanged!: (user: {uid: string; phoneNumber: string} | null) => void;
    watchPublicFormAuthState.mockImplementation((listener) => {
      authChanged = listener;
      listener(null);
      return vi.fn();
    });
    const anonymousForm = {...form, definition: {...form.definition,
      identityPolicy: "anonymous", sections: [{sectionId: "details",
        title: "Details", questions: [{questionId: "mobile", key: "mobile",
          label: "Mobile number", kind: "phone", required: false,
          canonicalFieldId: "phoneNumber", options: [], validation: {
            minLength: null, maxLength: null, patternPreset: null}}]}]},
      messagingOffer: {
      termsVersion: "form-whatsapp-v2", organizerWhatsapp: null,
      catchWhatsapp: null, organizerOperationsWhatsapp: "Application updates",
      organizerMarketingWhatsapp: null, catchMarketingWhatsapp: null}};
    getPublicOrganizerForm.mockResolvedValue(anonymousForm);
    beginOrganizerFormResponse.mockResolvedValue({...draft, form: anonymousForm,
      draftToken: "draft-bearer", answers: {mobile: "+919000000001"}});
    saveOrganizerFormResponseDraft.mockResolvedValue({revision: 2,
      expiresAtMillis: 200000});
    submitOrganizerFormResponse.mockResolvedValue({responseId: "response-1",
      formId: "form-1", versionId: "version-1", status: "submitted",
      submittedAtMillis: 1000, withdrawalToken: "source-bearer",
      completion: {title: "Received", message: null, actionKind: "none",
        actionLabel: null, actionUrl: null}});
    const verified = {uid: "verified-person", phoneNumber: "+919000000001"};
    beginPublicEventPhoneVerification.mockResolvedValue({clear: vi.fn(),
      confirm: vi.fn(async () => {authChanged(verified); return verified;})});
    promoteFormCommunicationIntent.mockResolvedValue({responseId: "response-1",
      promotedPurposes: ["organizer:eventOperations"], replayed: false});
    const {result} = renderHook(() => usePublicFormController("public-form-1"),
      {wrapper: wrapper()});
    await waitFor(() => expect(result.current.stage).toBe("form"));
    act(() => {
      result.current.updateConsent(true);
      result.current.updateMessagingChoice("organizerOperationsWhatsapp", true);
    });
    await act(async () => {await result.current.submit();});
    expect(result.current.stage).toBe("complete");
    expect(result.current.pendingConsentResponseId).toBe("response-1");
    expect(window.localStorage.getItem(
      "catch:form:public-form-1:consent-intent-hint"))
      .toContain('"responseId":"response-1"');
    await act(async () => {await result.current.startConsentPromotion();});
    expect(result.current.stage).toBe("identity");
    expect(result.current.verifyingConsent).toBe(true);
    act(() => result.current.setPhoneNumber("+919000000001"));
    await act(async () => {await result.current.handlePhoneSubmit({
      preventDefault: vi.fn()} as never);});
    act(() => result.current.setCode("123456"));
    await act(async () => {await result.current.handleCodeSubmit({
      preventDefault: vi.fn()} as never);});
    expect(promoteFormCommunicationIntent).toHaveBeenCalledWith({
      responseId: "response-1", withdrawalToken: "source-bearer",
      requestId: expect.any(String),
    });
    expect(result.current.stage).toBe("complete");
    expect(result.current.receipt?.responseId).toBe("response-1");
    expect(result.current.pendingConsentResponseId).toBeNull();
    expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(1);
  });

const recoveredPayment = {paymentId: `fp_${"a".repeat(32)}`, status: "submitted",
  checkout: null, receipt: {responseId: "response-1", formId: "form-1", versionId: "version-1",
    status: "submitted", submittedAtMillis: 1000, withdrawalToken: null,
    completion: {title: "Received", message: null, actionKind: "none",
      actionLabel: null, actionUrl: null}}};

const photoQuestion: PublicFormQuestion = {
  questionId: "photo", key: "photo", label: "Photo", helpText: null,
  kind: "file", required: false, options: [], canonicalFieldId: null,
  privacyClass: "organizerCustom", prefillPolicy: "never", hostPresentation: "detailOnly",
  validation: {minLength: null, maxLength: null, minNumber: null, maxNumber: null,
    earliestDate: null, latestDate: null, minSelections: null, maxSelections: null,
    maxFileCount: 1, maxFileSizeBytes: null, allowedMimeTypes: ["image/png"],
    patternPreset: null, customError: null},
};
const photoFile = {blob: new NodeBlob(["synthetic photo"], {type: "image/png"}) as Blob,
  name: "photo.png"};

const reuseQuestion: PublicFormQuestion = {...photoQuestion, questionId: "intro",
  key: "intro", label: "Tell us about yourself", kind: "longText",
  prefillPolicy: "participantReviewRequired", answerDestination: "organizerOnly"};
const reuseForm = {...form, organizer: {organizerId: "organizer-1",
  name: "Demo organizer", logoUrl: null}, definition: {...form.definition,
  title: "Community application", description: null, purpose: "application",
  identityPolicy: "catchAccount", appearance: {preset: "minimal"},
  consent: {consentCopy: "Share these answers with this organizer",
    consentVersion: "v1", retentionCopy: "Until withdrawal"},
  sections: [{sectionId: "details", title: "Your details", questions: [
    reuseQuestion, {...reuseQuestion, questionId: "interest", key: "interest",
      label: "What would you like to try?"}]}]}};
const reuseDraft = {...draft, form: reuseForm, identityKind: "catchAccount"};
const reuseSource = {sourceKind: "formResponse", sourceId: "previous-1",
  organizerId: "organizer-1", formId: "form-1", versionId: "older-version",
  eventId: null, formTitle: "Community application", purpose: "application",
  submittedAtMillis: 1000};
const reuseResult = {...reuseDraft, prefillSource: {
  responseId: reuseSource.sourceId, versionId: reuseSource.versionId,
  submittedAtMillis: reuseSource.submittedAtMillis},
  prefillSuggestions: {intro: "I enjoy meeting people outdoors", interest: "Hiking"},
  consentAccepted: true, messagingChoices: {
    termsVersion: "form-whatsapp-v1", organizerWhatsapp: true, catchWhatsapp: true}};

describe("explicit organizer-answer reuse", () => {
  let authChanged: (user: {uid: string} | null) => void;
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    watchPublicFormAuthState.mockImplementation((listener) => {
      authChanged = listener;
      listener({uid: "person-1"});
      return vi.fn();
    });
    getPublicOrganizerForm.mockResolvedValue(reuseForm);
    beginOrganizerFormResponse.mockResolvedValue(reuseDraft);
    listParticipantFormActivity.mockResolvedValue({items: [reuseSource], nextCursor: null});
    saveOrganizerFormResponseDraft.mockResolvedValue({revision: 2, expiresAtMillis: 200000});
    submitOrganizerFormResponse.mockResolvedValue({responseId: "new-response",
      formId: "form-1", versionId: "version-1", status: "submitted",
      completion: {title: "Received", message: "Thank you"}});
  });

  async function controller() {
    const view = renderHook(() => usePublicFormController("public-form-1"),
      {wrapper: wrapper()});
    await waitFor(() => expect(view.result.current.canReuseAnswers).toBe(true));
    return view;
  }
  async function choose(view: {
    result: {current: ReturnType<typeof usePublicFormController>};
  }) {
    act(() => view.result.current.openAnswerReuse());
    await waitFor(() => expect(view.result.current.reuseSources).toHaveLength(1));
    act(() => view.result.current.chooseReuseSource("previous-1"));
  }

  it("loads bounded own metadata only after opening, including empty scanned pages", async () => {
    listParticipantFormActivity.mockResolvedValueOnce({items: [
      {...reuseSource, formId: "other"}], nextCursor: "next-source-page"});
    const view = await controller();
    expect(listParticipantFormActivity).not.toHaveBeenCalled();
    act(() => view.result.current.openAnswerReuse());
    await waitFor(() => expect(view.result.current.reuseActivity.hasNextPage).toBe(true));
    expect(view.result.current.reuseSources).toEqual([]);
    await act(async () => {await view.result.current.reuseActivity.fetchNextPage();});
    expect(listParticipantFormActivity.mock.calls.map(([payload]) => payload)).toEqual([
      {sourceKind: "formResponse", limit: 30, cursor: null},
      {sourceKind: "formResponse", limit: 30, cursor: "next-source-page"},
    ]);
    await waitFor(() => expect(view.result.current.reuseSources).toEqual([reuseSource]));
    expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(1);
  });

  it("requires both an explicit source and unchecked answer review without copying opt-ins", async () => {
    const view = await controller();
    await choose(view);
    expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(1);
    beginOrganizerFormResponse.mockResolvedValue(reuseResult);
    await act(async () => {await view.result.current.previewReusableAnswers();});
    expect(view.result.current.answers).toEqual({});
    expect(view.result.current.consentAccepted).toBe(false);
    expect(view.result.current.messagingChoices.organizerWhatsapp).toBe(false);
    expect(view.result.current.messagingChoices.catchWhatsapp).toBe(false);
    expect(view.result.current.reuseSelectedIds).toEqual([]);
    act(() => {
      view.result.current.selectReusableAnswer("interest", true);
    });
    act(() => view.result.current.acceptReusableAnswers());
    expect(view.result.current.answers).toEqual({interest: "Hiking"});
    expect(view.result.current.consentAccepted).toBe(false);
    expect(view.result.current.reuseOpen).toBe(false);
    expect(saveOrganizerFormResponseDraft).not.toHaveBeenCalled();
  });

  it("preserves manual edits made during the preview and after selecting an answer", async () => {
    const view = await controller();
    await choose(view);
    let resolve!: (value: unknown) => void;
    beginOrganizerFormResponse.mockImplementationOnce(() =>
      new Promise((done) => {resolve = done;}));
    let pending!: Promise<void>;
    act(() => {pending = view.result.current.previewReusableAnswers();});
    await waitFor(() => expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(2));
    act(() => view.result.current.updateAnswer("intro", "My updated introduction"));
    await act(async () => {resolve(reuseResult); await pending;});
    act(() => view.result.current.selectReusableAnswer("intro", true));
    expect(view.result.current.reuseSelectedIds).toEqual([]);
    act(() => view.result.current.selectReusableAnswer("interest", true));
    act(() => view.result.current.updateAnswer("interest", ""));
    act(() => view.result.current.acceptReusableAnswers());
    expect(view.result.current.answers).toEqual({
      intro: "My updated introduction", interest: "",
    });
  });

  it("keeps validation errors on manual answers when accepting another answer", async () => {
    const target = {...reuseForm, versionId: "current-tightened-version",
      definition: {...reuseForm.definition, sections: [{
        ...reuseForm.definition.sections[0], questions: [
          {...reuseQuestion, validation: {...reuseQuestion.validation, maxLength: 2}},
          reuseForm.definition.sections[0].questions[1]]}]}};
    const current = {...reuseDraft, form: target};
    getPublicOrganizerForm.mockResolvedValueOnce(target);
    beginOrganizerFormResponse.mockResolvedValueOnce(current);
    const view = await controller();
    act(() => view.result.current.updateAnswer("intro", "My manual introduction"));
    act(() => view.result.current.blurQuestion("intro"));
    const error = view.result.current.errors.intro;
    expect(error).toBeTruthy();
    await choose(view);
    beginOrganizerFormResponse.mockResolvedValueOnce({...reuseResult, form: target});
    await act(async () => {await view.result.current.previewReusableAnswers();});
    act(() => view.result.current.selectReusableAnswer("interest", true));
    act(() => view.result.current.acceptReusableAnswers());
    expect(view.result.current.answers.intro).toBe("My manual introduction");
    expect(view.result.current.answers.interest).toBe("Hiking");
    expect(view.result.current.errors.intro).toBe(error);
  });

  it("freezes a single preview request and retries the same draft/source after response loss", async () => {
    const view = await controller();
    await choose(view);
    const startPayload = beginOrganizerFormResponse.mock.calls[0][0];
    let reject!: (value: Error) => void;
    beginOrganizerFormResponse.mockImplementationOnce(() =>
      new Promise((_done, fail) => {reject = fail;}));
    let pending!: Promise<void>;
    act(() => {
      pending = view.result.current.previewReusableAnswers();
      void view.result.current.previewReusableAnswers();
      view.result.current.chooseReuseSource("not-the-confirmed-source");
    });
    await waitFor(() => expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(2));
    expect(view.result.current.reuseSourceId).toBe("previous-1");
    await act(async () => {reject(new Error("Response lost")); await pending;});
    const payload = {...startPayload, reuseResponseId: "previous-1"};
    expect(beginOrganizerFormResponse.mock.calls[1][0]).toEqual(payload);
    beginOrganizerFormResponse.mockResolvedValueOnce(reuseResult);
    await act(async () => {await view.result.current.previewReusableAnswers();});
    expect(beginOrganizerFormResponse.mock.calls[2][0]).toEqual(payload);
    expect(view.result.current.reuseStatus.message).toBe("");
    expect(view.result.current.answers).toEqual({});
  });

  it.each(["resolve", "reject"])("ignores a late preview %s after changing account", async (outcome) => {
    const view = await controller();
    await choose(view);
    let resolve!: (value: unknown) => void;
    let reject!: (value: Error) => void;
    beginOrganizerFormResponse.mockImplementationOnce(() =>
      new Promise((done, fail) => {resolve = done; reject = fail;}));
    let pending!: Promise<void>;
    act(() => {pending = view.result.current.previewReusableAnswers();});
    beginOrganizerFormResponse.mockResolvedValue({...reuseDraft, draftId: "other-account-draft"});
    act(() => authChanged({uid: "person-2"}));
    await waitFor(() => expect(view.result.current.canReuseAnswers).toBe(true));
    await act(async () => {
      if (outcome === "resolve") resolve(reuseResult);
      else reject(new Error("Previous account private error"));
      await pending;
    });
    expect(view.result.current.answers).toEqual({});
    expect(view.result.current.reusePreview).toBeNull();
    expect(view.result.current.reuseStatus.message).toBe("");
    expect(view.result.current.reuseOpen).toBe(false);
    expect(view.result.current.reusePending).toBe(false);
  });

  it("ignores a late preview after moving to another form on the same account", async () => {
    const view = renderHook(({id}) => usePublicFormController(id),
      {initialProps: {id: "public-form-1"}, wrapper: wrapper()});
    await waitFor(() => expect(view.result.current.canReuseAnswers).toBe(true));
    await choose(view);
    let resolve!: (value: unknown) => void;
    beginOrganizerFormResponse.mockImplementationOnce(() =>
      new Promise((done) => {resolve = done;}));
    let pending!: Promise<void>;
    act(() => {pending = view.result.current.previewReusableAnswers();});
    await waitFor(() => expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(2));
    const otherForm = {...reuseForm, publicFormId: "public-form-2", formId: "form-2"};
    getPublicOrganizerForm.mockResolvedValueOnce(otherForm);
    beginOrganizerFormResponse.mockResolvedValueOnce({...reuseDraft,
      draftId: "other-form-draft", form: otherForm});
    view.rerender({id: "public-form-2"});
    await waitFor(() => expect(view.result.current.form?.formId).toBe("form-2"));
    await act(async () => {resolve(reuseResult); await pending;});
    expect(view.result.current.reusePreview).toBeNull();
    expect(view.result.current.reuseSources).toEqual([]);
    expect(view.result.current.answers).toEqual({});
    expect(view.result.current.reuseStatus.message).toBe("");
  });

  it("does not show late metadata from an earlier account", async () => {
    const view = await controller();
    let resolve!: (value: unknown) => void;
    listParticipantFormActivity.mockImplementationOnce(() =>
      new Promise((done) => {resolve = done;}));
    act(() => view.result.current.openAnswerReuse());
    await waitFor(() => expect(listParticipantFormActivity).toHaveBeenCalledOnce());
    act(() => authChanged({uid: "person-2"}));
    await act(async () => resolve({items: [reuseSource], nextCursor: null}));
    expect(view.result.current.reuseSources).toEqual([]);
    expect(view.result.current.reuseOpen).toBe(false);
  });

  it("ignores a late preview after dismissal and blocks leaving the form while checking", async () => {
    const view = await controller();
    await choose(view);
    let resolve!: (value: unknown) => void;
    beginOrganizerFormResponse.mockImplementationOnce(() =>
      new Promise((done) => {resolve = done;}));
    let pending!: Promise<void>;
    act(() => {pending = view.result.current.previewReusableAnswers();});
    await act(async () => {await view.result.current.nextSection();});
    expect(view.result.current.stage).toBe("form");
    expect(saveOrganizerFormResponseDraft).not.toHaveBeenCalled();
    act(() => view.result.current.dismissAnswerReuse());
    await act(async () => {resolve(reuseResult); await pending;});
    expect(view.result.current.reusePreview).toBeNull();
    expect(view.result.current.answers).toEqual({});
  });

  it("keeps typed answers after a withdrawn source is rejected", async () => {
    const view = await controller();
    act(() => view.result.current.updateAnswer("intro", "Keep this"));
    await choose(view);
    beginOrganizerFormResponse.mockRejectedValueOnce(new Error("Form response unavailable."));
    await act(async () => {await view.result.current.previewReusableAnswers();});
    expect(view.result.current.answers).toEqual({intro: "Keep this"});
    expect(view.result.current.reusePreview).toBeNull();
    expect(view.result.current.reuseStatus.message).toBe("Form response unavailable.");
  });

  it("rejects a changed current version and makes no extra draft save", async () => {
    const view = await controller();
    await choose(view);
    beginOrganizerFormResponse.mockResolvedValueOnce({...reuseResult,
      form: {...reuseForm, versionId: "newer-current-version"}});
    await act(async () => {await view.result.current.previewReusableAnswers();});
    expect(view.result.current.reusePreview).toBeNull();
    expect(view.result.current.reuseStatus.message).toMatch(/form changed/u);
    expect(saveOrganizerFormResponseDraft).not.toHaveBeenCalled();
  });

  it("shows no reusable answers when server compatibility yields no origin", async () => {
    const view = await controller();
    await choose(view);
    beginOrganizerFormResponse.mockResolvedValueOnce({...reuseDraft,
      prefillSuggestions: {intro: "Unproven value"}});
    await act(async () => {await view.result.current.previewReusableAnswers();});
    expect(view.result.current.reusePreview?.answers).toEqual({});
    expect(view.result.current.answers).toEqual({});
  });

  it("completes a rendered keyboard flow with explicit review, edit and fresh consent", async () => {
    const user = userEvent.setup();
    const Provider = wrapper();
    render(<Provider><MemoryRouter initialEntries={["/f/public-form-1/"]}>
      <Routes><Route path="/f/:publicFormId/" element={<PublicFormPage />} /></Routes>
    </MemoryRouter></Provider>);
    const open = await screen.findByRole("button", {name: "Use answers from a previous response"});
    open.focus();
    await user.keyboard("{Enter}");
    const selector = await screen.findByRole("combobox", {name: "Previous response"});
    await user.selectOptions(selector, "previous-1");
    expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(1);
    beginOrganizerFormResponse.mockResolvedValueOnce(reuseResult);
    await user.click(screen.getByRole("button", {name: "Review this response"}));
    const intro = await screen.findByRole("checkbox", {name: "Tell us about yourself"});
    expect((intro as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("button", {name: "Use selected answers"}) as HTMLButtonElement).disabled).toBe(true);
    intro.focus();
    await user.keyboard(" ");
    await user.click(screen.getByRole("button", {name: "Use selected answers"}));
    const textarea = screen.getByRole("textbox", {name: /Tell us about yourself/u});
    expect((textarea as HTMLTextAreaElement).value).toBe("I enjoy meeting people outdoors");
    await user.clear(textarea);
    await user.type(textarea, "My current answer");
    await user.click(screen.getByRole("button", {name: "Review answers"}));
    expect(screen.getByText("My current answer")).not.toBeNull();
    const consent = screen.getByRole("checkbox", {name: "Share these answers with this organizer"});
    expect((consent as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("checkbox", {name: "Organizer WhatsApp"}) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("checkbox", {name: "Catch WhatsApp"}) as HTMLInputElement).checked).toBe(false);
    await user.click(consent);
    await user.click(screen.getByRole("button", {name: "Send"}));
    await screen.findByRole("heading", {name: "Received"});
    expect(saveOrganizerFormResponseDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({draftId: "draft-1", answers: {intro: "My current answer"},
        consentAccepted: true, messagingChoices: expect.objectContaining({
          organizerWhatsapp: false, catchWhatsapp: false})}));
    expect(submitOrganizerFormResponse).toHaveBeenCalledOnce();
  });
});

describe("anonymous contact defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it.each(["anonymous", "phoneVerified"])(
    "keeps the %s policy on account changes and preserves deliberate contact",
    async (policy) => {
      let authChanged!: (user: {uid: string; phoneNumber: string} | null) => void;
      watchPublicFormAuthState.mockImplementation((listener) => {
        authChanged = listener;
        listener({uid: "person-1", phoneNumber: "+919876543210"});
        return vi.fn();
      });
      const phone: PublicFormQuestion = {...photoQuestion, questionId: "phone",
        key: "phone", label: "Phone", kind: "phone", required: false,
        canonicalFieldId: "phoneNumber"};
      const configured = {...form, definition: {...form.definition,
        identityPolicy: policy, sections: [{sectionId: "details", title: "Details",
          questions: [phone]}]}};
      getPublicOrganizerForm.mockResolvedValue(configured);
      beginOrganizerFormResponse.mockResolvedValue({...draft, form: configured,
        identityKind: policy, draftToken: policy === "anonymous" ? "bearer" : null});
      const view = renderHook(() => usePublicFormController("public-form-1"),
        {wrapper: wrapper()});
      await waitFor(() => expect(view.result.current.stage).toBe("form"));
      expect(view.result.current.answers.phone).toBe(
        policy === "anonymous" ? undefined : "+919876543210");
      expect(view.result.current.canReuseAnswers).toBe(false);
      expect(view.result.current.messagingEndpointAvailable).toBe(policy !== "anonymous");
      act(() => authChanged({uid: "person-2", phoneNumber: "+919876543211"}));
      await waitFor(() => expect(beginOrganizerFormResponse).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(view.result.current.stage).toBe("form"));
      expect(view.result.current.form?.definition.identityPolicy).toBe(policy);
      expect(view.result.current.answers.phone).toBe(
        policy === "anonymous" ? undefined : "+919876543211");
      act(() => view.result.current.updateAnswer(phone.questionId, "+919000000002"));
      expect(view.result.current.answers.phone).toBe("+919000000002");
      view.unmount();
    });
});
