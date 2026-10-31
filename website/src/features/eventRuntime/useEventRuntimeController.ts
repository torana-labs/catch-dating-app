import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {type FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState} from "react";
import type {User} from "../../firebase";
import {
  beginPublicEventPhoneVerification,
  checkInEventRuntime,
  claimEventRuntimeAccess,
  completeEventRuntimeFirstHello,
  createEventRuntimeAttendeeInviteLink,
  fetchEventRuntimeWingmanCandidates,
  getEventRuntimeBootstrap,
  getEventSuccessConversationGraph,
  heartbeatEventRuntimePresence,
  recordEventInviteLinkOpen,
  recordEventRuntimeShareIntent,
  saveEventRuntimeCompatibilityAnswers,
  saveEventRuntimeFeedback,
  startEventRuntimeFirstHello,
  submitEventRuntimeProfile,
  submitEventSuccessConversationGraph,
  submitEventRuntimeWingmanRequest,
  watchEventRuntimeAuthState,
  watchEventRuntimeLiveState,
  withdrawEventRuntimeWingmanRequest,
  type EventRuntimeLiveState,
  type EventRuntimeAttendeeInviteLink,
  type EventSuccessConversationGraph,
  type PublicEventPhoneVerification,
} from "../../firebase";
import {eventRuntimeCopy} from "../../content/eventRuntime";
import type {FormStatus} from "../../shared/forms/types";
import {websiteQueryKeys} from "../../shared/query/queryKeys";
import {
  eventRuntimeError,
  eventRuntimePreEventFieldId,
  eventRuntimeStageForParticipant,
  normalizeRuntimePhone,
  resolveEventRuntimeQuestionnaire,
  type EventRuntimeBootstrap,
  type EventRuntimeGender,
  type EventRuntimePaceBand,
  type EventRuntimeSkillBand,
} from "./eventRuntimeModel";
import {eventInviteSessionId, eventInviteTokenFromLocation} from
  "../../shared/eventInviteAttribution";

export type EventRuntimeStage =
  | "loading"
  | "phone"
  | "otp"
  | "profile"
  | "approval"
  | "venue"
  | "runtime"
  | "unavailable";

export interface WingmanCandidate {
  uid: string;
  displayName: string;
  gender: EventRuntimeGender | null;
}

const emptyLiveState: EventRuntimeLiveState = {
  assignments: [],
  compatibilityAnswerIds: [],
  feedback: null,
  mission: null,
  lateArrival: null,
  plan: null,
  standings: null,
  wingmanTargetUid: null,
};

export function useEventRuntimeController(
  publicRuntimeId: string,
  venueSessionToken: string | null = null
) {
  const reactId = useId();
  const cache = useQueryClient();
  const session = useRef({epoch: 0, mounted: false});
  const currentSession = (epoch: number) => session.current.mounted && session.current.epoch === epoch;
  const recaptchaContainerId = `event-runtime-recaptcha-${reactId.replace(/:/gu, "")}`;
  const verificationRef = useRef<PublicEventPhoneVerification | null>(null);
  const userRef = useRef<User | null>(null);
  const loadingRef = useRef<Promise<void> | null>(null);
  const attendeeLinkEventIdRef = useRef<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [bootstrap, setBootstrap] = useState<EventRuntimeBootstrap | null>(null);
  const [stage, setStage] = useState<EventRuntimeStage>("loading");
  const [status, setStatus] = useState<FormStatus>({message: "", tone: ""});
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<EventRuntimeGender | null>(null);
  const [interestedInGenders, setInterestedInGenders] = useState<EventRuntimeGender[]>([]);
  const [preferenceProfileEnabled, setPreferenceProfileEnabled] = useState(false);
  const [sensitiveConsent, setSensitiveConsent] = useState(false);
  const [saveAsCatchPrefill, setSaveAsCatchPrefill] = useState(false);
  const [paceBand, setPaceBand] = useState<EventRuntimePaceBand | null>(null);
  const [skillBand, setSkillBand] = useState<EventRuntimeSkillBand | null>(null);
  const [dietaryAndSeatingNotes, setDietaryAndSeatingNotes] = useState("");
  const [teamName, setTeamName] = useState("");
  const [preEventConsent, setPreEventConsent] = useState(false);
  const [liveState, setLiveState] = useState<EventRuntimeLiveState>(emptyLiveState);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [wingmanCandidates, setWingmanCandidates] = useState<WingmanCandidate[]>([]);
  const [wingmanTargetUid, setWingmanTargetUid] = useState("");
  const [welcomeRating, setWelcomeRating] = useState(4);
  const [structureRating, setStructureRating] = useState(4);
  const [metNewPeopleCount, setMetNewPeopleCount] = useState(2);
  const [safetyConcern, setSafetyConcern] = useState(false);
  const [privateNote, setPrivateNote] = useState("");
  const [eventEnded, setEventEnded] = useState(false);
  const [selectedConversationUids, setSelectedConversationUids] =
    useState<string[]>([]);
  const actionMutation = useMutation<void, unknown, () => Promise<void>>({
    mutationFn: (action) => action(),
    retry: false, gcTime: 0,
  });
  const attendeeLinkMutation = useMutation<
    EventRuntimeAttendeeInviteLink,
    unknown,
    string
  >({
    mutationFn: (eventId) => createEventRuntimeAttendeeInviteLink(
      eventId,
      eventRuntimeCopy.shareLinkLabel
    ),
    onError: (error) => {
      setStatus({message: eventRuntimeError(error), tone: "is-error"});
    },
  });
  const pending = actionMutation.isPending;
  const attendeeInviteLink = attendeeLinkMutation.data ?? null;
  const inviteToken = useMemo(eventInviteTokenFromLocation, []);
  const recordedInviteOpenRef = useRef(false);
  const conversationGraphEventId = bootstrap?.participant?.eventId ?? "";
  const conversationGraphQuery = useQuery<EventSuccessConversationGraph>({
    enabled: stage === "runtime" &&
      eventEnded &&
      bootstrap?.participant?.attendanceStatus === "checkedIn",
    queryFn: () => getEventSuccessConversationGraph(conversationGraphEventId),
    gcTime: 0,
    queryKey: [...websiteQueryKeys.eventRuntime.conversationGraph(
      conversationGraphEventId || null
    ), user?.uid ?? null],
  });
  const conversationGraph = conversationGraphQuery.data ?? null;
  const conversationGraphLoading = conversationGraphQuery.isLoading;

  const questionnaire = useMemo(
    () => resolveEventRuntimeQuestionnaire(bootstrap?.event.questionnaireConfig ?? null),
    [bootstrap]
  );
  const offersPreferenceProfile = Boolean(
    bootstrap?.event.optionalFieldIds.includes("gender") &&
    bootstrap.event.optionalFieldIds.includes("interestedInGenders")
  );
  const preEventFieldId = bootstrap ?
    eventRuntimePreEventFieldId(bootstrap.event) : null;

  const loadAuthenticatedRuntime = useCallback(async (activeUser: User) => {
    if (userRef.current?.uid !== activeUser.uid) return;
    if (loadingRef.current) return loadingRef.current;
    const epoch = session.current.epoch;
    const request = (async () => {
      try {
        let next = await getEventRuntimeBootstrap({publicRuntimeId});
        if (!currentSession(epoch)) return;
        setBootstrap(next);
        hydrateProfile(next);
        let nextStage: EventRuntimeStage = eventRuntimeStageForParticipant(next.participant);
        if (nextStage === "runtime" && next.participant?.attendanceStatus !== "checkedIn") {
          if (!venueSessionToken) {
            nextStage = "venue";
          } else {
            try {
              await checkInEventRuntime({publicRuntimeId, venueSessionToken});
              if (!currentSession(epoch)) return;
              next = await getEventRuntimeBootstrap({publicRuntimeId});
              if (!currentSession(epoch)) return;
              setBootstrap(next);
              hydrateProfile(next);
              nextStage = eventRuntimeStageForParticipant(next.participant);
            } catch (error) {
              if (!currentSession(epoch)) return;
              setStatus({message: eventRuntimeError(error), tone: "is-error"});
              nextStage = "venue";
            }
          }
        }
        if (userRef.current?.uid === activeUser.uid) setStage(nextStage);
      } catch (error) {
        if (!currentSession(epoch)) return;
        setStatus({message: eventRuntimeError(error), tone: "is-error"});
        setStage("unavailable");
      }
    })();
    loadingRef.current = request;
    try {
      await request;
    } finally {
      if (loadingRef.current === request) loadingRef.current = null;
    }
  }, [publicRuntimeId, venueSessionToken]);

  const resetAction = actionMutation.reset;
  const resetLink = attendeeLinkMutation.reset;
  useEffect(() => {
    session.current.mounted = true;
    const unsubscribe = watchEventRuntimeAuthState((nextUser) => {
      const previousEvent = attendeeLinkEventIdRef.current;
      if (previousEvent) cache.removeQueries({queryKey:
        websiteQueryKeys.eventRuntime.conversationGraph(previousEvent)});
      const epoch = ++session.current.epoch;
      loadingRef.current = null;
      userRef.current = nextUser;
      setUser(nextUser);
      setBootstrap(null); setLiveState(emptyLiveState);
      setWingmanCandidates([]); setWingmanTargetUid("");
      setQuestionAnswers({}); setSelectedConversationUids([]);
      setDisplayName(""); setGender(null); setInterestedInGenders([]);
      setPreferenceProfileEnabled(false); setSensitiveConsent(false);
      setSaveAsCatchPrefill(false); setPreEventConsent(false);
      setPaceBand(null); setSkillBand(null); setDietaryAndSeatingNotes("");
      setTeamName(""); setPrivateNote(""); setSafetyConcern(false);
      setWelcomeRating(4); setStructureRating(4); setMetNewPeopleCount(2);
      attendeeLinkEventIdRef.current = null;
      resetAction(); resetLink();
      setStatus({message: "", tone: ""}); setStage("loading");
      if (nextUser) {
        void loadAuthenticatedRuntime(nextUser);
        return;
      }
      void getEventRuntimeBootstrap({publicRuntimeId}).then((next) => {
        if (!currentSession(epoch)) return;
        // Anonymous entry never retains a participant from an old session.
        setBootstrap({...next, participant: null});
        setStage("phone");

      }).catch((error) => {
        if (!currentSession(epoch)) return;
        setStatus({message: eventRuntimeError(error), tone: "is-error"});
        setStage("unavailable");
      });
    });
    return () => {
      session.current.mounted = false; session.current.epoch++;
      verificationRef.current?.clear(); unsubscribe();
    };
  }, [cache, inviteToken, loadAuthenticatedRuntime, publicRuntimeId, resetAction, resetLink]);

  useEffect(() => {
    if (!bootstrap || !inviteToken || recordedInviteOpenRef.current) return;
    recordedInviteOpenRef.current = true;
    void recordEventInviteLinkOpen({eventId: bootstrap.event.eventId,
      inviteLinkId: inviteToken, surface: "runtimeWeb",
      sessionId: eventInviteSessionId()}).catch(() => undefined);
  }, [bootstrap, inviteToken]);

  useEffect(() => {
    const endTimeMillis = bootstrap?.event.endTimeMillis;
    if (endTimeMillis === undefined) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refreshEndedState = () => {
      const remaining = endTimeMillis - Date.now();
      if (remaining <= 0) {
        setEventEnded(true);
        return;
      }
      setEventEnded(false);
      timer = setTimeout(
        refreshEndedState,
        Math.min(remaining, 2_147_000_000)
      );
    };
    refreshEndedState();
    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [bootstrap?.event.endTimeMillis]);

  useEffect(() => {
    const participant = bootstrap?.participant;
    if (stage !== "runtime" || !participant || !user) return undefined;
    let disposed = false;
    const epoch = session.current.epoch;
    let unsubscribe: () => void = () => undefined;
    void watchEventRuntimeLiveState({
      eventId: participant.eventId,
      organizerId: participant.organizerId,
      uid: user.uid,
    }, (next) => {
      if (disposed || !currentSession(epoch)) return;
      setLiveState(next);
      setWingmanTargetUid(next.wingmanTargetUid ?? "");
      if (next.feedback) {
        setWelcomeRating(next.feedback.welcomeRating);
        setStructureRating(next.feedback.structureRating);
        setMetNewPeopleCount(next.feedback.metNewPeopleCount);
        setSafetyConcern(next.feedback.safetyConcern);
        setPrivateNote(next.feedback.privateNote ?? "");
      }
      setQuestionAnswers((current) => answerMapForIds(
        questionnaire.questions,
        next.compatibilityAnswerIds,
        current
      ));
    }, (error) => {
      if (!disposed) setStatus({message: eventRuntimeError(error), tone: "is-error"});
    }).then((stop) => {
      if (disposed) stop();
      else unsubscribe = stop;
    }).catch((error) => {
      if (!disposed) setStatus({message: eventRuntimeError(error), tone: "is-error"});
    });
    if (bootstrap.event.moduleIds.includes("wingman_requests")) {
      void fetchEventRuntimeWingmanCandidates({eventId: participant.eventId})
        .then((response) => {
          if (!disposed) setWingmanCandidates(response.candidates ?? []);
        })
        .catch(() => {if (!disposed) setWingmanCandidates([]);});
    }
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [bootstrap, questionnaire.questions, stage, user]);

  useEffect(() => {
    if (conversationGraphQuery.data) {
      setSelectedConversationUids(conversationGraphQuery.data.selectedUids);
    }
  }, [conversationGraphQuery.data]);

  useEffect(() => {
    if (conversationGraphQuery.error) {
      setStatus({
        message: eventRuntimeError(conversationGraphQuery.error),
        tone: "is-error",
      });
    }
  }, [conversationGraphQuery.error]);

  useEffect(() => {
    const participant = bootstrap?.participant;
    if (
      stage !== "runtime" ||
      participant?.attendanceStatus !== "checkedIn" ||
      !bootstrap ||
      eventEnded
    ) return undefined;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sendHeartbeat = async () => {
      if (Date.now() > bootstrap.event.endTimeMillis) return;
      try {
        const response = await heartbeatEventRuntimePresence(
          participant.eventId
        );
        if (!disposed) {
          timer = setTimeout(
            sendHeartbeat,
            response.heartbeatIntervalSeconds * 1000
          );
        }
      } catch {
        if (!disposed) timer = setTimeout(sendHeartbeat, 10_000);
      }
    };
    void sendHeartbeat();
    return () => {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [bootstrap, eventEnded, stage]);

  useEffect(() => {
    if (stage !== "runtime" && stage !== "venue") return undefined;
    let disposed = false;
    const epoch = session.current.epoch;
    const timer = setInterval(() => {
      void getEventRuntimeBootstrap({publicRuntimeId})
        .then((next) => {
          if (!disposed && currentSession(epoch)) setBootstrap(next);
        })
        .catch(() => undefined);
    }, 15_000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [publicRuntimeId, stage]);

  useEffect(() => {
    const participant = bootstrap?.participant;
    if (stage !== "runtime" || !participant || attendeeInviteLink ||
        attendeeLinkEventIdRef.current === participant.eventId) return;
    attendeeLinkEventIdRef.current = participant.eventId;
    attendeeLinkMutation.mutate(participant.eventId);
  }, [
    attendeeInviteLink,
    attendeeLinkMutation,
    bootstrap?.participant,
    stage,
  ]);

  async function runAction(action: (current: () => boolean) => Promise<void>) {
    const epoch = session.current.epoch;
    const current = () => currentSession(epoch);
    try {
      await actionMutation.mutateAsync(() => action(current));
    } catch (error) {
      if (current()) setStatus({message: eventRuntimeError(error), tone: "is-error"});
    }
  }

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const phone = normalizeRuntimePhone(phoneNumber);
    if (!/^\+[1-9][0-9]{7,14}$/u.test(phone)) {
      setStatus({message: eventRuntimeCopy.invalidPhone, tone: "is-error"});
      return;
    }
    setStatus({message: "", tone: ""});
    await runAction(async (current) => {
      verificationRef.current?.clear();
      const verification = await beginPublicEventPhoneVerification(phone, recaptchaContainerId);
      if (!current()) {verification.clear(); return;}
      verificationRef.current = verification;
      setStage("otp");
    }).catch(() => undefined);
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!/^[0-9]{6}$/u.test(code.trim())) {
      setStatus({message: eventRuntimeCopy.invalidCode, tone: "is-error"});
      return;
    }
    const verification = verificationRef.current;
    if (!verification) {
      setStage("phone");
      setStatus({message: eventRuntimeCopy.verificationExpired, tone: "is-error"});
      return;
    }
    setStatus({message: "", tone: ""});
    await runAction(async () => {
      const verifiedUser = await verification.confirm(code.trim());
      verification.clear();
      if (verificationRef.current === verification) verificationRef.current = null;
      if (userRef.current?.uid !== verifiedUser.uid) return;
      await loadAuthenticatedRuntime(verifiedUser);
    }).catch(() => undefined);
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !bootstrap || !user) return;
    const name = displayName.trim();
    if (!name) {
      setStatus({message: eventRuntimeCopy.missingName, tone: "is-error"});
      return;
    }
    if (preferenceProfileEnabled && interestedInGenders.length === 0) {
      setStatus({message: eventRuntimeCopy.missingInterests, tone: "is-error"});
      return;
    }
    if (preferenceProfileEnabled && (!gender || !sensitiveConsent)) {
      setStatus({message: eventRuntimeCopy.missingSensitiveConsent, tone: "is-error"});
      return;
    }
    const preEventQuestionnaireAnswerIds = questionnaire.questions
      .map((question) => questionAnswers[question.id])
      .filter((answerId): answerId is string => Boolean(answerId));
    const hasPreEventAnswer = preEventFieldId === null ||
      (preEventFieldId === "paceBand" && paceBand !== null) ||
      (preEventFieldId === "skillBand" && skillBand !== null) ||
      (preEventFieldId === "dietaryAndSeatingNotes" &&
        dietaryAndSeatingNotes.trim().length > 0) ||
      (preEventFieldId === "questionnaireAnswerIds" &&
        preEventQuestionnaireAnswerIds.length === questionnaire.questions.length) ||
      (preEventFieldId === "teamName" && teamName.trim().length > 0);
    if (!hasPreEventAnswer) {
      setStatus({message: eventRuntimeCopy.missingPreEventAnswer, tone: "is-error"});
      return;
    }
    if (preEventFieldId && !preEventConsent) {
      setStatus({message: eventRuntimeCopy.missingSensitiveConsent, tone: "is-error"});
      return;
    }
    setStatus({message: "", tone: ""});
    await runAction(async (current) => {
      let accessStatus = bootstrap.participant?.accessStatus ?? "needsClaim";
      if (!bootstrap.participant || accessStatus === "needsClaim") {
        const claim = await claimEventRuntimeAccess({
          publicRuntimeId,
          displayName: name,
          runtimeTermsVersion: bootstrap.event.runtimeTermsVersion,
          inviteToken,
        });
        if (!current()) return;
        accessStatus = claim.status;
      }
      if (accessStatus === "pendingApproval") {
        await loadAuthenticatedRuntime(user);
        return;
      }
      await submitEventRuntimeProfile({
        publicRuntimeId,
        runtimeTermsVersion: bootstrap.event.runtimeTermsVersion,
        sensitiveDataTermsVersion: preferenceProfileEnabled || preEventFieldId ?
          "event-runtime-sensitive-v1" : null,
        saveAsCatchPrefill,
        fields: {
          displayName: name,
          gender: preferenceProfileEnabled ? gender : null,
          interestedInGenders: preferenceProfileEnabled ?
            interestedInGenders : [],
          relationshipGoal: preferenceProfileEnabled ? undefined : null,
          dateOfBirthMillis: preferenceProfileEnabled ? undefined : null,
          ...(preEventFieldId === "paceBand" ? {paceBand} : {}),
          ...(preEventFieldId === "skillBand" ? {skillBand} : {}),
          ...(preEventFieldId === "dietaryAndSeatingNotes" ? {
            dietaryAndSeatingNotes: dietaryAndSeatingNotes.trim(),
          } : {}),
          ...(preEventFieldId === "questionnaireAnswerIds" ? {
            questionnaireAnswerIds: preEventQuestionnaireAnswerIds,
          } : {}),
          ...(preEventFieldId === "teamName" ? {
            teamName: teamName.trim(),
          } : {}),
        },
      });
      if (current()) await loadAuthenticatedRuntime(user);
    }).catch(() => undefined);
  }

  async function handleRefresh() {
    if (!user || pending) return;
    setStatus({message: "", tone: ""});
    await runAction(async (current) => {
      if (current()) await loadAuthenticatedRuntime(user);
    }).catch(() => undefined);
  }

  async function shareEvent() {
    const participant = bootstrap?.participant;
    if (!participant || pending) return;
    setStatus({message: "", tone: ""});
    const link = attendeeInviteLink;
    if (!link) {
      setStatus({message: eventRuntimeCopy.shareNotReady, tone: ""});
      return;
    }
    const shareUrl = new URL(
      `/invite/${encodeURIComponent(link.inviteToken)}`,
      window.location.origin
    ).toString();
    const shareData = {
      title: bootstrap.event.title,
      text: eventRuntimeCopy.shareText(bootstrap.event.title),
      url: shareUrl,
    };
    if (typeof navigator.share === "function") {
      void recordEventRuntimeShareIntent({
        eventId: participant.eventId,
        inviteLinkId: link.inviteLinkId,
        channelHint: "systemShare",
      }).catch(() => undefined);
      try {
        await navigator.share(shareData);
        setStatus({message: eventRuntimeCopy.shareOpened, tone: "is-success"});
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setStatus({message: eventRuntimeCopy.shareCancelled, tone: ""});
          return;
        }
        setStatus({message: eventRuntimeError(error), tone: "is-error"});
      }
      return;
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch (error) {
        setStatus({message: eventRuntimeError(error), tone: "is-error"});
        return;
      }
      void recordEventRuntimeShareIntent({
        eventId: participant.eventId,
        inviteLinkId: link.inviteLinkId,
        channelHint: "copyLink",
      }).catch(() => undefined);
      setStatus({message: eventRuntimeCopy.shareCopied, tone: "is-success"});
      return;
    }
    setStatus({message: eventRuntimeCopy.shareManual(shareUrl), tone: ""});
  }

  function retryAttendeeInviteLink() {
    const participant = bootstrap?.participant;
    if (!participant || attendeeLinkMutation.isPending || attendeeInviteLink) return;
    setStatus({message: "", tone: ""});
    attendeeLinkMutation.mutate(participant.eventId);
  }

  function toggleInterest(nextGender: EventRuntimeGender) {
    if (pending) return;
    setInterestedInGenders((current) => current.includes(nextGender) ?
      current.filter((item) => item !== nextGender) : [...current, nextGender]);
  }

  function selectQuestionAnswer(questionId: string, answerId: string) {
    setQuestionAnswers((current) => ({...current, [questionId]: answerId}));
  }

  async function saveCompatibilityAnswers() {
    const participant = bootstrap?.participant;
    if (!participant || !user || pending) return;
    await runAction(async (current) => {
      await saveEventRuntimeCompatibilityAnswers({
        eventId: participant.eventId,
        organizerId: participant.organizerId,
        uid: user.uid,
      }, Object.values(questionAnswers));
      if (!current()) return;
      setStatus({message: eventRuntimeCopy.compatibilitySaved, tone: "is-success"});
    }).catch(() => undefined);
  }

  async function startFirstHello() {
    const participant = bootstrap?.participant;
    if (!participant || pending) return;
    if (!venueSessionToken) {
      setStatus({message: eventRuntimeCopy.venueBody, tone: "is-error"});
      return;
    }
    await runAction(async () => {
      await startEventRuntimeFirstHello({
        eventId: participant.eventId,
        venueSessionToken,
      });
    }).catch(() => undefined);
  }

  async function completeFirstHello(answerId: string) {
    const participant = bootstrap?.participant;
    if (!participant || pending) return;
    await runAction(async () => {
      await completeEventRuntimeFirstHello({
        eventId: participant.eventId,
        answerId,
      });
    }).catch(() => undefined);
  }

  async function submitWingmanRequest() {
    const participant = bootstrap?.participant;
    if (!participant || !wingmanTargetUid || pending) return;
    await runAction(async () => {
      await submitEventRuntimeWingmanRequest({
        eventId: participant.eventId,
        targetUid: wingmanTargetUid,
      });
    }).catch(() => undefined);
  }

  async function withdrawWingmanRequest() {
    const participant = bootstrap?.participant;
    if (!participant || pending) return;
    await runAction(async () => {
      await withdrawEventRuntimeWingmanRequest({eventId: participant.eventId});
    }).catch(() => undefined);
  }

  async function submitFeedback() {
    const participant = bootstrap?.participant;
    if (!participant || !user || pending) return;
    await runAction(async (current) => {
      await saveEventRuntimeFeedback({
        eventId: participant.eventId,
        organizerId: participant.organizerId,
        uid: user.uid,
      }, {
        welcomeRating,
        structureRating,
        metNewPeopleCount,
        safetyConcern,
        privateNote: privateNote.trim() || null,
      });
      if (!current()) return;
      setStatus({message: eventRuntimeCopy.feedbackSaved, tone: "is-success"});
    }).catch(() => undefined);
  }

  function toggleConversationUid(uid: string) {
    if (pending) return;
    setSelectedConversationUids((current) => current.includes(uid) ?
      current.filter((value) => value !== uid) :
      [...current, uid]);
  }

  async function submitConversationGraph(skipped = false) {
    const participant = bootstrap?.participant;
    if (!participant || !conversationGraph || pending) return;
    await runAction(async (current) => {
      const selectedUids = skipped ? [] : [...selectedConversationUids].sort();
      await submitEventSuccessConversationGraph({
        eventId: participant.eventId,
        selectedUids,
        skipped,
      });
      if (!current()) return;
      setSelectedConversationUids(selectedUids);
      const refreshedGraph = await conversationGraphQuery.refetch();
      if (!current()) return;
      if (refreshedGraph.error) throw refreshedGraph.error;
      setStatus({
        message: skipped ? eventRuntimeCopy.conversationSkipped :
          eventRuntimeCopy.conversationSaved,
        tone: "is-success",
      });
    }).catch(() => undefined);
  }

  function hydrateProfile(next: EventRuntimeBootstrap) {
    const profile = next.participant?.runtimeProfile;
    if (!profile) return;
    setDisplayName(profile.displayName);
    setGender(profile.gender);
    setInterestedInGenders(profile.interestedInGenders);
    setPreferenceProfileEnabled(
      profile.gender !== null || profile.interestedInGenders.length > 0
    );
    setPaceBand(profile.paceBand ?? null);
    setSkillBand(profile.skillBand ?? null);
    setDietaryAndSeatingNotes(profile.dietaryAndSeatingNotes ?? "");
    setTeamName(profile.teamName ?? "");
    setQuestionAnswers((current) => answerMapForIds(
      resolveEventRuntimeQuestionnaire(next.event.questionnaireConfig).questions,
      profile.questionnaireAnswerIds ?? [],
      current
    ));
  }

  return {
    bootstrap,
    attendeeInviteLink,
    attendeeInviteLinkLoading: attendeeLinkMutation.isPending,
    code,
    completeFirstHello,
    conversationGraph,
    conversationGraphLoading,
    displayName,
    dietaryAndSeatingNotes,
    eventEnded,
    gender,
    handleCodeSubmit,
    handlePhoneSubmit,
    handleProfileSubmit,
    handleRefresh,
    interestedInGenders,
    liveState,
    metNewPeopleCount,
    pending,
    paceBand,
    phoneNumber,
    publicRuntimeId,
    questionnaire,
    questionAnswers,
    recaptchaContainerId,
    retryAttendeeInviteLink,
    offersPreferenceProfile,
    privateNote,
    preferenceProfileEnabled,
    preEventConsent,
    preEventFieldId,
    saveAsCatchPrefill,
    saveCompatibilityAnswers,
    selectedConversationUids,
    shareEvent,
    selectQuestionAnswer,
    sensitiveConsent,
    setCode,
    setDisplayName,
    setDietaryAndSeatingNotes,
    setGender,
    setPhoneNumber,
    setPaceBand,
    setPreferenceProfileEnabled,
    setPreEventConsent,
    setMetNewPeopleCount,
    setPrivateNote,
    setSaveAsCatchPrefill,
    setSensitiveConsent,
    setSkillBand,
    setSafetyConcern,
    setStructureRating,
    setTeamName,
    setWelcomeRating,
    setWingmanTargetUid,
    stage,
    skillBand,
    startFirstHello,
    status,
    structureRating,
    teamName,
    submitFeedback,
    submitConversationGraph,
    submitWingmanRequest,
    toggleConversationUid,
    toggleInterest,
    safetyConcern,
    welcomeRating,
    wingmanCandidates,
    wingmanTargetUid,
    withdrawWingmanRequest,
  };
}

function answerMapForIds(
  questions: Array<{id: string; options: Array<{id: string}>}>,
  answerIds: string[],
  current: Record<string, string>
): Record<string, string> {
  const next = {...current};
  for (const question of questions) {
    const selected = question.options.find((option) => answerIds.includes(option.id));
    if (selected) next[question.id] = selected.id;
  }
  return next;
}
