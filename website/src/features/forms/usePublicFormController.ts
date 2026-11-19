import {type FormEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useInfiniteQuery, useMutation} from "@tanstack/react-query";
import {
  beginOrganizerFormResponse,
  beginPublicEventPhoneVerification,
  completePublicFormEmailSignIn,
  createOrganizerFormAssetIntent,
  finalizeOrganizerFormAsset,
  getPublicOrganizerForm,
  listParticipantFormActivity,
  promoteFormCommunicationIntent,
  saveOrganizerFormResponseDraft,
  sendPublicFormEmailSignInLink,
  submitOrganizerFormResponse,
  uploadOrganizerFormAsset,
  watchPublicFormAuthState,
  withdrawOrganizerFormResponse,
  type PublicEventPhoneVerification,
  type PublicOrganizerForm,
  type PublicOrganizerFormDraft,
  type PublicOrganizerFormReceipt,
  type User,
} from "../../firebase";
import {publicFormsCopy} from "../../content/forms";
import type {FormStatus} from "../../shared/forms/types";
import {usePublicFormPayment} from "./usePublicFormPayment";
import {readFormStorage, writeFormStorage, removeFormStorage} from "./publicFormStorage";
import {
  validatePublicFormAnswers,
  visiblePublicFormSections,
  type PublicFormAnswer,
  type PublicFormAnswers,
  type PublicFormQuestion,
} from "./publicFormModel";

import {acceptReviewedReuseAnswers, hasReusableOrganizerQuestions,
  reviewedReuseSuggestions, sameFormReuseSources,
  type PublicFormReuseSource} from "./publicFormAnswerReuse";
import {catchPhoneE164} from "@catch/web-ui/phone";
import {activePhoneCountry} from "@content/markets";

export type PublicFormStage =
  "loading" | "unavailable" | "identity" | "phoneCode" |
  "emailSent" | "form" | "review" | "payment" | "complete" | "withdrawn";

type MessagingChoices = NonNullable<PublicOrganizerFormDraft["messagingChoices"]>;
const uncheckedMessaging: MessagingChoices = {termsVersion: "form-whatsapp-v1",
  organizerWhatsapp: false, catchWhatsapp: false};
function uncheckedMessagingFor(form: PublicOrganizerForm): MessagingChoices {
  if (form.messagingOffer?.termsVersion === "form-whatsapp-v2") {
    return {termsVersion: "form-whatsapp-v2", organizerWhatsapp: false,
      catchWhatsapp: false, organizerOperationsWhatsapp: false,
      organizerMarketingWhatsapp: false, catchMarketingWhatsapp: false};
  }
  return uncheckedMessaging;
}

export interface PublicFormUploadState {
  status: "uploading" | "ready" | "error";
  label: string;
}

export function usePublicFormController(publicFormId: string) {
  const [stage, setStage] = useState<PublicFormStage>("loading");
  const [form, setForm] = useState<PublicOrganizerForm | null>(null);
  const [draft, setDraft] = useState<PublicOrganizerFormDraft | null>(null);
  const [receipt, setReceipt] = useState<PublicOrganizerFormReceipt | null>(
    () => storedReceipt(publicFormId)
  );
  const [consentActivationResponseId, setConsentActivationResponseId] = useState<
    string | null>(() => {
      const cached = storedReceipt(publicFormId);
      return cached && isPendingConsentResponse(publicFormId, cached) ?
        cached.responseId : null;
    });
  const receiptRef = useRef<PublicOrganizerFormReceipt | null>(receipt);
  const promotingConsentRef = useRef(false);
  const [verifyingConsent, setVerifyingConsent] = useState(false);
  const [answers, setAnswers] = useState<PublicFormAnswers>({});
  const [accountUid, setAccountUid] = useState<string | null>(null);
  const [reuseOpen, setReuseOpen] = useState(false);
  const [reuseSourceId, setReuseSourceId] = useState("");
  const [reuseSelectedIds, setReuseSelectedIds] = useState<string[]>([]);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [messagingChoices, setMessagingChoices] = useState<MessagingChoices>(uncheckedMessaging);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<FormStatus>({message: "", tone: ""});
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [verificationStep, setVerificationStep] = useState<"phone" | "code" | "verified">("phone");
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [email, setEmail] = useState(() =>
    readFormStorage("local", emailStorageKey(publicFormId)) ?? "");
  const [recoveringPayment, setRecoveringPayment] = useState(false);
  const recoveringPaymentRef = useRef(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [dirtyRevision, setDirtyRevision] = useState(0);
  const [uploads, setUploads] = useState<
    Record<string, PublicFormUploadState>
  >({});
  const formRef = useRef<PublicOrganizerForm | null>(null);
  const userRef = useRef<User | null>(null);
  const draftRef = useRef<PublicOrganizerFormDraft | null>(null);
  const answersRef = useRef<PublicFormAnswers>({});
  const consentRef = useRef(false);
  const messagingRef = useRef<MessagingChoices>(uncheckedMessaging);
  const authGenerationRef = useRef(0);
  const draftStartRequestIdRef = useRef<string | null>(null);
  const reuseOperationRef = useRef(0);
  const reuseFlightRef = useRef<number | null>(null);
  const verificationRef = useRef<PublicEventPhoneVerification | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const submitRequestIdRef = useRef(requestId());
  const startRequestIdRef = useRef(requestId());
  const showPayment = useCallback(() => setStage("payment"), []);
  const acceptReceipt = useCallback((submitted: PublicOrganizerFormReceipt) => {
    if (formRef.current && submitted.formId !== formRef.current.formId) return;
    receiptRef.current = submitted;
    setReceipt(submitted);
    persistReceipt(publicFormId, submitted, userRef.current?.uid ?? null);
    const pending = submitted.status === "submitted" &&
      bindPendingConsentResponse(publicFormId, submitted, draftRef.current);
    setConsentActivationResponseId(pending ? submitted.responseId : null);
    setStage(submitted.status === "withdrawn" ? "withdrawn" : "complete");
    setStatus({message: "", tone: ""});
  }, [publicFormId]);
  const payments = usePublicFormPayment(publicFormId, showPayment, acceptReceipt);
  const resumePayment = payments.resume;
  const resetPaymentSession = payments.resetSession;
  const sourceToken = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get("source");
    return value && /^[A-Za-z0-9_-]{20,160}$/u.test(value) ? value : null;
  }, []);
  const embed = useMemo(() =>
    new URLSearchParams(window.location.search).get("embed") === "1", []);
  const recaptchaContainerId = `public-form-recaptcha-${publicFormId}`;
  const visibleSections = useMemo(() => form ?
    visiblePublicFormSections(form.definition, answers) : [], [answers, form]);
  const activeSection = visibleSections[Math.min(
    sectionIndex,
    Math.max(0, visibleSections.length - 1)
  )] ?? null;
  const actionMutation = useMutation<void, unknown, () => Promise<void>>({
    mutationFn: (action) => action(),
    onError: (error) => {
      setStatus({message: publicFormError(error), tone: "is-error"});
    },
  });
  const pending = actionMutation.isPending;
  const uploadInProgress = Object.values(uploads).some(
    (upload) => upload.status === "uploading"
  );

  const canReuseAnswers = accountUid !== null && draft !== null &&
    draft.identityKind !== "anonymous" && stage === "form" &&
    form !== null && form.publicFormId === publicFormId &&
    draft.form.publicFormId === publicFormId &&
    draft.form.formId === form.formId && draft.form.versionId === form.versionId &&
    hasReusableOrganizerQuestions(form);
  const reuseActivity = useInfiniteQuery({
    queryKey: ["public-form-answer-reuse", publicFormId,
      form?.organizer.organizerId, form?.formId, form?.versionId, accountUid],
    queryFn: ({pageParam}) => listParticipantFormActivity({
      sourceKind: "formResponse", limit: 30, cursor: pageParam,
    }),
    initialPageParam: null as string | null,
    getNextPageParam: (last, _pages, _lastParam, params) =>
      last.nextCursor && !params.includes(last.nextCursor) ?
        last.nextCursor : undefined,
    enabled: reuseOpen && canReuseAnswers,
    retry: false,
  });
  const reuseSources = form ? sameFormReuseSources(
    reuseActivity.data?.pages ?? [], form) : [];
  const reusePreviewMutation = useMutation({
    mutationFn: async (input: {
      payload: Parameters<typeof beginOrganizerFormResponse>[0];
      current: PublicOrganizerFormDraft; source: PublicFormReuseSource;
      uid: string; generation: number; operation: number;
    }) => {
      const result = await beginOrganizerFormResponse(input.payload);
      return {source: input.source,
        answers: reviewedReuseSuggestions(result, input.current, input.source),
        uid: input.uid, draftId: input.current.draftId, generation: input.generation};
    },
    retry: false,
  });
  const reuseAttempt = reusePreviewMutation.variables;
  const ownsReuseAttempt = canReuseAnswers && reuseOpen &&
    reuseAttempt?.payload.publicFormId === publicFormId &&
    reuseAttempt?.uid === accountUid &&
    reuseAttempt?.generation === authGenerationRef.current &&
    reuseAttempt?.operation === reuseOperationRef.current &&
    reuseAttempt?.current.draftId === draft?.draftId &&
    reuseAttempt?.source.sourceId === reuseSourceId;
  const reusePending = ownsReuseAttempt && reusePreviewMutation.isPending;
  const reusePreview = ownsReuseAttempt ? reusePreviewMutation.data ?? null : null;
  const reuseStatus: FormStatus = ownsReuseAttempt && reusePreviewMutation.isError ?
    {message: publicFormError(reusePreviewMutation.error), tone: "is-error"} :
    {message: "", tone: ""};

  function dismissAnswerReuse() {
    reuseOperationRef.current++;
    reuseFlightRef.current = null;
    setReuseOpen(false);
    setReuseSourceId("");
    reusePreviewMutation.reset();
    setReuseSelectedIds([]);
  }

  function openAnswerReuse() {
    if (!canReuseAnswers || pending) return;
    dismissAnswerReuse();
    setReuseOpen(true);
  }

  function chooseReuseSource(id: string) {
    if (reuseFlightRef.current !== null) return;
    setReuseSourceId(id);
    reusePreviewMutation.reset();
    setReuseSelectedIds([]);
  }

  async function previewReusableAnswers() {
    const current = draftRef.current;
    const uid = userRef.current?.uid;
    const source = reuseSources.find((item) => item.sourceId === reuseSourceId);
    const startId = draftStartRequestIdRef.current;
    if (!canReuseAnswers || !reuseOpen || pending || !current ||
        !uid || uid !== accountUid || !source || !startId || reuseFlightRef.current !== null) return;
    const generation = authGenerationRef.current;
    const operation = ++reuseOperationRef.current;
    reuseFlightRef.current = operation;
    reusePreviewMutation.reset();
    setReuseSelectedIds([]);
    const stillCurrent = () => generation === authGenerationRef.current &&
      userRef.current?.uid === uid && reuseOperationRef.current === operation &&
      draftRef.current?.draftId === current.draftId;
    try {
      await reusePreviewMutation.mutateAsync({
        payload: {publicFormId, sourceToken, requestId: startId,
          reuseResponseId: source.sourceId},
        current, source, uid, generation, operation,
      });
    } catch {
      // The mutation owns errors; only the matching account/draft attempt is shown.
    } finally {
      if (stillCurrent()) reuseFlightRef.current = null;
    }
  }

  function selectReusableAnswer(id: string, selected: boolean) {
    if (!reusePreview || reusePending || pending ||
        reusePreview.uid !== userRef.current?.uid ||
        reusePreview.generation !== authGenerationRef.current ||
        !Object.hasOwn(reusePreview.answers, id) ||
        Object.hasOwn(answersRef.current, id)) return;
    setReuseSelectedIds((ids) => selected ? [...new Set([...ids, id])] :
      ids.filter((candidate) => candidate !== id));
  }

  function acceptReusableAnswers() {
    if (!reusePreview || !canReuseAnswers || pending || reusePending ||
        reusePreview.uid !== userRef.current?.uid ||
        reusePreview.generation !== authGenerationRef.current ||
        reusePreview.draftId !== draftRef.current?.draftId ||
        reusePreview.source.sourceId !== reuseSourceId) return;
    const chosenIds = reuseSelectedIds.filter((id) =>
      Object.hasOwn(reusePreview.answers, id) && !Object.hasOwn(answersRef.current, id));
    if (chosenIds.length === 0) return;
    const updated = acceptReviewedReuseAnswers(
      answersRef.current, reusePreview.answers, chosenIds);
    answersRef.current = updated;
    setAnswers(updated);
    setErrors((current) => Object.fromEntries(Object.entries(current)
      .filter(([id]) => !chosenIds.includes(id))));
    setDirtyRevision((value) => value + 1);
    dismissAnswerReuse();
    setStatus({message: publicFormsCopy.reuseSelected, tone: ""});
  }

  const startDraft = useCallback(async (nextForm: PublicOrganizerForm) => {
    if (startPromiseRef.current) return startPromiseRef.current;
    const generation = authGenerationRef.current;
    const operation = (async () => {
      let checkingPayment = true;
      try {
        if (await resumePayment(userRef.current?.uid ?? null)) return;
        checkingPayment = false;
        if (generation !== authGenerationRef.current) return;
        const savedReceipt = storedReceipt(publicFormId, userRef.current?.uid ?? null);
        if (!nextForm.definition.payment && savedReceipt?.formId === nextForm.formId &&
            savedReceipt.status === "submitted") {
          setReceipt(savedReceipt);
          receiptRef.current = savedReceipt;
          setConsentActivationResponseId(isPendingConsentResponse(
            publicFormId, savedReceipt) ? savedReceipt.responseId : null);
          setStage("complete");
          return;
        }
        if (recoveringPaymentRef.current || nextForm.availabilityStatus !== "active") {
          setStage("unavailable");
          if (recoveringPaymentRef.current) setStatus({tone: "", message:
            publicFormsCopy.paymentRecoveryEmpty});
          return;
        }
        const startId = stableStartRequestId(publicFormId, startRequestIdRef.current);
        const started = await beginOrganizerFormResponse({
          publicFormId, sourceToken, requestId: startId,
        });
        if (generation !== authGenerationRef.current) return;
        const localAnswers = answersRef.current;
        const mergedAnswers = {...started.prefillSuggestions,
          ...started.answers, ...localAnswers};
        const canonicalPhoneQuestion = nextForm.definition.sections.flatMap(
          (section) => section.questions).find((question) =>
          question.canonicalFieldId === "phoneNumber" &&
          question.kind === "phone");
        if (started.identityKind !== "anonymous" &&
            nextForm.definition.identityPolicy !== "anonymous" &&
            canonicalPhoneQuestion && userRef.current?.phoneNumber) {
          mergedAnswers[canonicalPhoneQuestion.questionId] =
            userRef.current.phoneNumber;
        }
        const mergedConsent = started.consentAccepted || consentRef.current;
        draftStartRequestIdRef.current = startId;
        draftRef.current = started;
        answersRef.current = mergedAnswers;
        consentRef.current = mergedConsent;
        setDraft(started);
        setAnswers(mergedAnswers);
        setConsentAccepted(mergedConsent);
        messagingRef.current = started.messagingChoices ??
          uncheckedMessagingFor(nextForm);
        setMessagingChoices(messagingRef.current);
        if (Object.keys(localAnswers).length > 0 ||
            mergedConsent !== started.consentAccepted) {
          setDirtyRevision((value) => value + 1);
        }
        setStatus({message: "", tone: ""});
        setStage("form");
      } catch (error) {
        if (generation !== authGenerationRef.current) return;
        setStatus({message: publicFormError(error), tone: "is-error"});
        const policy = nextForm.definition.identityPolicy;
        setStage((checkingPayment && userRef.current) || policy === "anonymous" ?
          "unavailable" : policy === "phoneVerified" ? "form" : "identity");
      }
    })();
    startPromiseRef.current = operation;
    try {
      await operation;
    } finally {
      if (startPromiseRef.current === operation) startPromiseRef.current = null;
    }
  }, [publicFormId, resumePayment, sourceToken]);

  useEffect(() => {
    let cancelled = false;
    authGenerationRef.current++;
    startPromiseRef.current = null;
    userRef.current = null;
    setAccountUid(null);
    draftStartRequestIdRef.current = null;
    dismissAnswerReuse();
    formRef.current = null;
    draftRef.current = null;
    answersRef.current = {};
    consentRef.current = false;
    messagingRef.current = uncheckedMessaging;
    recoveringPaymentRef.current = false;
    setRecoveringPayment(false);
    setForm(null);
    setDraft(null);
    setAnswers({});
    setConsentAccepted(false);
    setMessagingChoices(uncheckedMessaging);
    setErrors({});
    setSectionIndex(0);
    setUploads({});
    setReceipt(null);
    receiptRef.current = null;
    setConsentActivationResponseId(null);
    promotingConsentRef.current = false;
    setVerifyingConsent(false);
    setVerificationStep("phone");
    setVerifiedPhone(null);
    setStage("loading");
    setStatus({message: "", tone: ""});
    let unsubscribe: () => void = () => undefined;
    const subscribeAuth = () => {
      unsubscribe = watchPublicFormAuthState((user) => {
        if (cancelled) return;
        if (promotingConsentRef.current && receiptRef.current) {
          userRef.current = user;
          return;
        }
        const loaded = formRef.current;
        const keepUnverifiedAnswers = userRef.current === null && user !== null &&
          draftRef.current === null &&
          loaded?.definition.identityPolicy === "phoneVerified";
        if (userRef.current?.uid !== user?.uid) {
          authGenerationRef.current++;
          draftStartRequestIdRef.current = null;
          dismissAnswerReuse();
          startPromiseRef.current = null;
          if (!keepUnverifiedAnswers) {
            consentRef.current = false;
            setConsentAccepted(false);
            messagingRef.current = uncheckedMessaging;
            setMessagingChoices(uncheckedMessaging);
          }
          resetPaymentSession();
          draftRef.current = null;
          setDraft(null);
          setReceipt(null);
          receiptRef.current = null;
          setConsentActivationResponseId(null);
          if (!keepUnverifiedAnswers) setAnswers({});
          setUploads({});
          if (!keepUnverifiedAnswers) answersRef.current = {};
        }
        userRef.current = user;
        setAccountUid(user?.uid ?? null);
        setVerifiedPhone(user?.phoneNumber ?? null);
        if (!user && loaded) {
          const savedReceipt = storedReceipt(publicFormId, null);
          if (!loaded.definition.payment &&
              savedReceipt?.formId === loaded.formId &&
              savedReceipt.status === "submitted") {
            setReceipt(savedReceipt);
            receiptRef.current = savedReceipt;
            setConsentActivationResponseId(isPendingConsentResponse(
              publicFormId, savedReceipt) ? savedReceipt.responseId : null);
            setStage("complete");
            return;
          }
          if (loaded.availabilityStatus !== "active") {
            setStage("unavailable");
            return;
          }
          if (loaded.definition.identityPolicy === "anonymous") {
            void startDraft(loaded);
            return;
          }
          setVerificationStep("phone");
          setStage(loaded.definition.identityPolicy === "phoneVerified" &&
            !recoveringPaymentRef.current ? "form" : "identity");
        }
        if (user && loaded) {
          void startDraft(loaded);
        }
      });
    };
    void getPublicOrganizerForm({publicFormId, sourceToken})
      .then(async (loaded) => {
        if (cancelled) return;
        formRef.current = loaded;
        setForm(loaded);
        setStage(loaded.availabilityStatus !== "active" ? "unavailable" :
          loaded.definition.identityPolicy === "emailVerified" ?
            "identity" : "form");
        subscribeAuth();
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus({message: publicFormError(error), tone: "is-error"});
        setStage("unavailable");
      });
    return () => {
      cancelled = true;
      authGenerationRef.current++;
      reuseOperationRef.current++;
      reuseFlightRef.current = null;
      startPromiseRef.current = null;
      verificationRef.current?.clear();
      unsubscribe();
    };
  }, [publicFormId, resetPaymentSession, sourceToken, startDraft]);

  const flushSave = useCallback(() => {
    const generation = authGenerationRef.current;
    const operation = async () => {
      if (generation !== authGenerationRef.current) return;
      const current = draftRef.current;
      if (!current || current.form.versionId !== formRef.current?.versionId) return;
      setSaveState("saving");
      const savedAnswers = {...answersRef.current};
      const savedConsent = consentRef.current;
      const savedMessaging = {...messagingRef.current};
      try {
        const saved = await saveOrganizerFormResponseDraft({
          draftId: current.draftId,
          draftToken: current.draftToken,
          expectedRevision: current.revision,
          answers: savedAnswers,
          consentAccepted: savedConsent,
          ...(current.form.messagingOffer ? {messagingChoices: savedMessaging} : {}),
        });
        if (generation !== authGenerationRef.current ||
            draftRef.current?.draftId !== current.draftId) return;
        const updated = {...current, revision: saved.revision,
          expiresAtMillis: saved.expiresAtMillis,
          answers: savedAnswers,
          consentAccepted: savedConsent,
          messagingChoices: savedMessaging};
        draftRef.current = updated;
        setDraft(updated);
        setSaveState("saved");
      } catch (error) {
        if (generation !== authGenerationRef.current) return;
        setSaveState("idle");
        setStatus({message: publicFormError(error), tone: "is-error"});
        throw error;
      }
    };
    const next = saveChainRef.current.then(operation, operation);
    saveChainRef.current = next.catch(() => undefined);
    return next;
  }, []);

  useEffect(() => {
    if (dirtyRevision === 0 || stage !== "form") return undefined;
    setSaveState("saving");
    const timer = window.setTimeout(() => void flushSave(), 700);
    return () => window.clearTimeout(timer);
  }, [dirtyRevision, flushSave, stage]);

  function updateAnswer(questionId: string, value: PublicFormAnswer) {
    setAnswers((current) => {
      const updated = {...current, [questionId]: value};
      answersRef.current = updated;
      return updated;
    });
    setErrors((current) => {
      if (!(questionId in current)) return current;
      const updated = {...current};
      delete updated[questionId];
      return updated;
    });
    setDirtyRevision((value) => value + 1);
  }

  function blurQuestion(questionId: string) {
    const question = visibleSections.flatMap((section) => section.questions)
      .find((candidate) => candidate.questionId === questionId);
    if (!question) return;
    const error = validatePublicFormAnswers([question], answersRef.current)[questionId];
    setErrors((current) => {
      const updated = {...current};
      if (error) updated[questionId] = error;
      else delete updated[questionId];
      return updated;
    });
  }

  function updateConsent(value: boolean) {
    consentRef.current = value;
    setConsentAccepted(value);
    setDirtyRevision((current) => current + 1);
  }

  function updateMessagingChoice(scope: "organizerWhatsapp" | "catchWhatsapp" |
    "organizerOperationsWhatsapp" | "organizerMarketingWhatsapp" |
    "catchMarketingWhatsapp", value: boolean) {
    if (!formRef.current?.messagingOffer?.[scope]) return;
    if (value && formRef.current.messagingOffer.termsVersion ===
        "form-whatsapp-v2" && !hasMessagingEndpoint(formRef.current,
          answersRef.current, userRef.current?.phoneNumber ?? null)) return;
    const choices = {...messagingRef.current, [scope]: value};
    messagingRef.current = choices;
    setMessagingChoices(choices);
    setDirtyRevision((current) => current + 1);
  }

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = catchPhoneE164(phoneNumber, activePhoneCountry);
    if (!phone) {
      setStatus({message: publicFormsCopy.phoneInvalid, tone: "is-error"});
      return;
    }
    setStatus({message: "", tone: ""});
    await actionMutation.mutateAsync(async () => {
      verificationRef.current?.clear();
      verificationRef.current = await beginPublicEventPhoneVerification(
        phone,
        recaptchaContainerId
      );
      if (stage === "form" || stage === "review") {
        setVerificationStep("code");
      } else {
        setStage("phoneCode");
      }
    }).catch(() => undefined);
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const verification = verificationRef.current;
    if (!verification) return;
    await actionMutation.mutateAsync(async () => {
      const verifiedUser = await verification.confirm(code);
      verification.clear();
      verificationRef.current = null;
      setVerifiedPhone(verifiedUser.phoneNumber ?? catchPhoneE164(phoneNumber, activePhoneCountry));
      setVerificationStep("verified");
      if (promotingConsentRef.current && receiptRef.current) {
        try {
          await promoteSelectedConsent(verifiedUser);
        } catch (error) {
          userRef.current = verifiedUser;
          persistReceipt(publicFormId, receiptRef.current,
            verifiedUser.uid);
          promotingConsentRef.current = false;
          setVerifyingConsent(false);
          setStage("complete");
          throw error;
        }
        return;
      }
      if (formRef.current) await startDraft(formRef.current);
    }).catch(() => undefined);
  }

  function resetPhoneVerification() {
    verificationRef.current?.clear();
    verificationRef.current = null;
    setCode("");
    setVerificationStep("phone");
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({message: "", tone: ""});
    await actionMutation.mutateAsync(async () => {
      const key = emailStorageKey(publicFormId);
      const currentUrl = window.location.href;
      if (currentUrl.includes("mode=signIn")) {
        await completePublicFormEmailSignIn(email.trim(), currentUrl);
        removeFormStorage("local", key);
        if (formRef.current) await startDraft(formRef.current);
      } else {
        writeFormStorage("local", key, email.trim());
        await sendPublicFormEmailSignInLink(email.trim(), currentUrl);
        setStage("emailSent");
      }
    }).catch(() => undefined);
  }

  async function nextSection() {
    if (!activeSection || reuseFlightRef.current !== null) return;
    if (uploadInProgress) {
      setStatus({message: publicFormsCopy.uploadPending, tone: "is-error"});
      return;
    }
    const nextErrors = validatePublicFormAnswers(activeSection.questions, answers);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await flushSave().catch(() => undefined);
    if (sectionIndex >= visibleSections.length - 1) {
      setStage("review");
    } else {
      setSectionIndex((current) => current + 1);
      window.scrollTo({top: 0, behavior: "smooth"});
    }
  }

  async function uploadAnswer(
    question: PublicFormQuestion,
    files: Array<{blob: Blob; name: string}>
  ) {
    const current = draftRef.current;
    if (!current || files.length === 0) return;
    const generation = authGenerationRef.current;
    const stillOwnsDraft = () => generation === authGenerationRef.current &&
      draftRef.current?.draftId === current.draftId;
    const maximum = question.kind === "signature" ? 1 :
      question.validation.maxFileCount ?? 1;
    if (files.length > maximum) {
      setStatus({
        message: question.validation.customError ??
          `${question.label} accepts at most ${maximum} file${maximum === 1 ? "" : "s"}.`,
        tone: "is-error",
      });
      return;
    }
    setUploads((value) => ({
      ...value,
      [question.questionId]: {
        status: "uploading",
        label: publicFormsCopy.uploadingFile,
      },
    }));
    try {
      const assetIds: string[] = [];
      for (const file of files) {
        const sha256 = await sha256Hex(file.blob);
        if (!stillOwnsDraft()) return;
        const intent = await createOrganizerFormAssetIntent({
          draftId: current.draftId,
          draftToken: current.draftToken,
          questionId: question.questionId,
          requestId: requestId(),
          originalFileName: file.name,
          contentType: requireSupportedContentType(file.blob.type),
          sizeBytes: file.blob.size,
          sha256,
        });
        if (!stillOwnsDraft()) return;
        await uploadOrganizerFormAsset(intent, file.blob);
        if (!stillOwnsDraft()) return;
        await finalizeOrganizerFormAsset({
          draftId: current.draftId,
          draftToken: current.draftToken,
          assetId: intent.assetId,
          uploadToken: intent.uploadToken,
        });
        if (!stillOwnsDraft()) return;
        assetIds.push(intent.assetId);
      }
      updateAnswer(
        question.questionId,
        question.kind === "signature" ? assetIds[0] : assetIds
      );
      setUploads((value) => ({
        ...value,
        [question.questionId]: {
          status: "ready",
          label: question.kind === "signature" ?
            publicFormsCopy.signatureReady : publicFormsCopy.uploadedFile,
        },
      }));
      setStatus({message: "", tone: ""});
    } catch (error) {
      if (!stillOwnsDraft()) return;
      setUploads((value) => ({
        ...value,
        [question.questionId]: {
          status: "error",
          label: publicFormsCopy.uploadFailed,
        },
      }));
      setStatus({message: publicFormError(error), tone: "is-error"});
    }
  }

  function previousSection() {
    if (sectionIndex === 0) return;
    setSectionIndex((current) => Math.max(0, current - 1));
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  async function submit() {
    if (reuseFlightRef.current !== null) return;
    const questions = visibleSections.flatMap((section) => section.questions);
    const nextErrors = validatePublicFormAnswers(questions, answers);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStage("form");
      setSectionIndex(sectionForFirstError(visibleSections, nextErrors));
      return;
    }
    if (!consentRef.current) {
      setStatus({message: form?.definition.consent.consentCopy ??
        publicFormsCopy.genericError, tone: "is-error"});
      return;
    }
    if (!draftRef.current && formRef.current?.definition.identityPolicy ===
        "phoneVerified") {
      setStatus({message: publicFormsCopy.phoneVerificationRequired,
        tone: "is-error"});
      setSectionIndex(0);
      setStage("form");
      return;
    }
    if (formRef.current?.messagingOffer?.termsVersion === "form-whatsapp-v2" &&
        hasSelectedPurpose(messagingRef.current) &&
        !hasMessagingEndpoint(formRef.current, answersRef.current,
          userRef.current?.phoneNumber ?? null)) {
      setStatus({message: publicFormsCopy.messagingPhoneRequired,
        tone: "is-error"});
      return;
    }
    const generation = authGenerationRef.current;
    await actionMutation.mutateAsync(async () => {
      await flushSave();
      if (generation !== authGenerationRef.current) return;
      const current = draftRef.current;
      if (!current) throw new Error(publicFormsCopy.genericError);
      const payload = {
        draftId: current.draftId,
        draftToken: current.draftToken,
        expectedRevision: current.revision,
        requestId: submitRequestIdRef.current,
      };
      if (current.form.messagingOffer?.termsVersion === "form-whatsapp-v2" &&
          hasSelectedPurpose(messagingRef.current)) {
        writeFormStorage("local", consentIntentHintKey(publicFormId),
          JSON.stringify({draftId: current.draftId,
            versionId: current.form.versionId, responseId: null}));
      } else {
        removeFormStorage("local", consentIntentHintKey(publicFormId));
      }
      if (current.form.definition.payment) {
        const uid = userRef.current?.uid;
        if (!uid) throw new Error(publicFormsCopy.identityTitle);
        await payments.prepare(payload, uid);
      } else {
        const submitted = await submitOrganizerFormResponse(payload);
        if (generation === authGenerationRef.current) acceptReceipt(submitted);
      }
    }).catch(() => undefined);
  }

  async function withdraw() {
    if (!receipt) return;
    await actionMutation.mutateAsync(async () => {
      await withdrawOrganizerFormResponse({
        responseId: receipt.responseId,
        withdrawalToken: receipt.withdrawalToken,
        requestId: requestId(),
      });
      clearReceipt(publicFormId);
      setConsentActivationResponseId(null);
      setStage("withdrawn");
    }).catch(() => undefined);
  }

  async function promoteSelectedConsent(verifiedUser: User) {
    const submitted = receiptRef.current;
    if (!submitted) return;
    const result = await promoteFormCommunicationIntent({
      responseId: submitted.responseId,
      withdrawalToken: submitted.withdrawalToken,
      requestId: requestId(),
    });
    persistReceipt(publicFormId, submitted, verifiedUser.uid);
    removeFormStorage("local", consentIntentHintKey(publicFormId));
    setConsentActivationResponseId(null);
    userRef.current = verifiedUser;
    promotingConsentRef.current = false;
    setVerifyingConsent(false);
    setStage("complete");
    setStatus({tone: "", message: result.promotedPurposes.length > 0 ?
      publicFormsCopy.messagingActivated : publicFormsCopy.messagingNoChange});
  }

  async function startConsentPromotion() {
    if (!receiptRef.current ||
        consentActivationResponseId !== receiptRef.current.responseId) {
      return;
    }
    const currentUser = userRef.current;
    if (currentUser?.phoneNumber) {
      try {
        await actionMutation.mutateAsync(() =>
          promoteSelectedConsent(currentUser));
        return;
      } catch {
        // A signed-in number can differ from the one on this response.
      }
    }
    promotingConsentRef.current = true;
    setVerifyingConsent(true);
    setStatus({tone: "", message: publicFormsCopy.messagingVerifyHelp});
    setStage("identity");
  }

  async function restartAfterPayment() {
    await actionMutation.mutateAsync(async () => {
      if (!await payments.restart()) return;
      removeFormStorage("session", `catch:form:${publicFormId}:start`);
      startRequestIdRef.current = requestId();
      recoveringPaymentRef.current = false;
      setRecoveringPayment(false);
      clearReceipt(publicFormId);
      setConsentActivationResponseId(null);
      submitRequestIdRef.current = requestId();
      const current = await getPublicOrganizerForm({publicFormId, sourceToken});
      formRef.current = current;
      setForm(current);
      setSectionIndex(0);
      if (current.availabilityStatus !== "active") setStage("unavailable");
      else await startDraft(current);
    }).catch(() => undefined);
  }

  function recoverPayment() {
    recoveringPaymentRef.current = true;
    setRecoveringPayment(true);
    setStatus({message: "", tone: ""});
    if (userRef.current && formRef.current) {
      setStage("loading");
      void startDraft(formRef.current);
    }
    else setStage("identity");
  }

  return {
    canReuseAnswers,
    openAnswerReuse,
    dismissAnswerReuse,
    reuseOpen,
    reuseSources,
    reuseSourceId,
    chooseReuseSource,
    reusePreview,
    reuseSelectedIds,
    reusePending,
    reuseStatus,
    reuseActivity,
    previewReusableAnswers,
    selectReusableAnswer,
    acceptReusableAnswers,
    activeSection,
    answers,
    blurQuestion,
    code,
    consentAccepted,
    messagingChoices,
    messagingEndpointAvailable: form !== null &&
      hasMessagingEndpoint(form, answers, userRef.current?.phoneNumber ?? null),
    embed,
    email,
    errors,
    form,
    handleCodeSubmit,
    handleEmailSubmit,
    handlePhoneSubmit,
    nextSection,
    pending,
    payments,
    pendingConsentResponseId: consentActivationResponseId,
    phoneNumber,
    verificationStep,
    verifiedPhone,
    previousSection,
    receipt,
    restartAfterPayment,
    recoverPayment,
    recoveringPayment,
    recaptchaContainerId,
    resetPhoneVerification,
    saveState,
    sectionIndex,
    setCode,
    setEmail,
    setPhoneNumber,
    setSectionIndex,
    setStage,
    stage,
    status,
    startConsentPromotion,
    submit,
    updateAnswer,
    updateConsent,
    updateMessagingChoice,
    uploadAnswer,
    uploadInProgress,
    uploads,
    visibleSections,
    verifyingConsent,
    withdraw,
  };
}

async function sha256Hex(blob: Blob) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    await blob.arrayBuffer()
  );
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function requireSupportedContentType(value: string) {
  if (value === "image/jpeg" || value === "image/png" ||
      value === "image/webp" || value === "application/pdf") return value;
  throw new Error("Choose a JPEG, PNG, WebP, or PDF file.");
}

function requestId() {
  return globalThis.crypto?.randomUUID?.() ??
    `request-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stableStartRequestId(publicFormId: string, fallback: string) {
  const key = `catch:form:${publicFormId}:start`;
  const existing = readFormStorage("session", key);
  if (existing) return existing;
  writeFormStorage("session", key, fallback);
  return fallback;
}

function emailStorageKey(publicFormId: string) {
  return `catch:form:${publicFormId}:email`;
}

function persistReceipt(
  publicFormId: string,
  receipt: PublicOrganizerFormReceipt,
  ownerUid: string | null
) {
  writeFormStorage("local",
    `catch:form:${publicFormId}:receipt`,
    JSON.stringify({...receipt, cacheOwnerUid: ownerUid})
  );
}

function clearReceipt(publicFormId: string) {
  removeFormStorage("local", `catch:form:${publicFormId}:receipt`);
  removeFormStorage("local", consentIntentHintKey(publicFormId));
}

function consentIntentHintKey(publicFormId: string) {
  return `catch:form:${publicFormId}:consent-intent-hint`;
}

function hasSelectedPurpose(value: MessagingChoices): boolean {
  return value.termsVersion === "form-whatsapp-v2" &&
    (value.organizerOperationsWhatsapp === true ||
      value.organizerMarketingWhatsapp === true ||
      value.catchMarketingWhatsapp === true);
}

function pendingConsentHint(publicFormId: string): Record<string, unknown> | null {
  const encoded = readFormStorage("local", consentIntentHintKey(publicFormId));
  if (!encoded) return null;
  try {
    const parsed: unknown = JSON.parse(encoded);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isPendingConsentResponse(publicFormId: string,
  receipt: PublicOrganizerFormReceipt): boolean {
  const hint = pendingConsentHint(publicFormId);
  return receipt.status === "submitted" &&
    hint?.responseId === receipt.responseId &&
    hint.versionId === receipt.versionId;
}

function bindPendingConsentResponse(publicFormId: string,
  receipt: PublicOrganizerFormReceipt,
  draft: PublicOrganizerFormDraft | null): boolean {
  const hint = pendingConsentHint(publicFormId);
  if (!hint || hint.versionId !== receipt.versionId ||
      (hint.responseId !== null && hint.responseId !== receipt.responseId) ||
      (draft && hint.draftId !== draft.draftId)) return false;
  writeFormStorage("local", consentIntentHintKey(publicFormId),
    JSON.stringify({...hint, responseId: receipt.responseId}));
  return true;
}

function storedReceipt(publicFormId: string, ownerUid: string | null = null): PublicOrganizerFormReceipt | null {
  const value = readFormStorage("local",
    `catch:form:${publicFormId}:receipt`
  );
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || typeof parsed.responseId !== "string" ||
        typeof parsed.formId !== "string" ||
        typeof parsed.versionId !== "string" ||
        parsed.status !== "submitted" ||
        typeof parsed.submittedAtMillis !== "number" ||
        !(parsed.withdrawalToken === null ||
          typeof parsed.withdrawalToken === "string") ||
        !isRecord(parsed.completion)) return null;
    // Legacy anonymous receipts retain their bearer withdrawal token. Verified
    // receipts need an explicit matching cache owner; never restore on sign-out.
    if ("cacheOwnerUid" in parsed ? parsed.cacheOwnerUid !== ownerUid :
        parsed.withdrawalToken === null) return null;
    return parsed as PublicOrganizerFormReceipt;
  } catch {
    return null;
  }
}

function hasMessagingEndpoint(form: PublicOrganizerForm,
  answers: PublicFormAnswers, verifiedPhone: string | null): boolean {
  if (form.definition.identityPolicy !== "anonymous" &&
      verifiedPhone && /^\+[1-9][0-9]{6,14}$/u.test(verifiedPhone)) {
    return true;
  }
  const question = form.definition.sections.flatMap((section) =>
    section.questions).find((candidate) =>
    candidate.canonicalFieldId === "phoneNumber");
  const answer = question ? answers[question.questionId] : null;
  return typeof answer === "string" && catchPhoneE164(answer, activePhoneCountry) !== null;
}

function sectionForFirstError(
  sections: ReturnType<typeof visiblePublicFormSections>,
  errors: Record<string, string>
) {
  const index = sections.findIndex((section) =>
    section.questions.some((question) => question.questionId in errors));
  return index < 0 ? 0 : index;
}

function publicFormError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return publicFormsCopy.genericError;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
