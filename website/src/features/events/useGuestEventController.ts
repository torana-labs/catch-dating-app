import {useEffect, useId, useReducer, useRef, useState, type FormEvent} from "react";
import {skipToken, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {beginPublicEventPhoneVerification, watchGuestEventDocuments,
  watchPublicFormAuthState, signOutGuestUser, type User, type PublicEventPhoneVerification} from "../../firebase";
import {guestEventCopy as copy} from "../../content/events";
import {activeCommunityMemberships, guestEventState, nextGuestEventChangeMillis, parseEventGuestEntry,
  parseGuestEventStatus, type GuestEventSources} from "./guestEventState";

type GuestEventFeed = {phase: "waiting"} | {phase: "ready"; sources: GuestEventSources} | {phase: "failed"};
const waiting: GuestEventFeed = {phase: "waiting"};

/**
 * Identity changes clear private projections. The guest's step comes from
 * listeners on the event's guest entry, their own row and their booking
 * facts, so it follows every change without a refresh; reading never
 * charges or admits.
 */
export function useGuestEventController(eventId: string) {
  const [user, setUser] = useState<User | null | undefined>();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const challenge = useRef<PublicEventPhoneVerification | null>(null);
  const scope = useRef({epoch: 0, mounted: false, uid: ""});
  const cache = useQueryClient();
  const recaptchaId = `guest-${useId().replace(/[^a-zA-Z0-9_-]/gu, "")}`;
  const mutation = useMutation({retry: false, gcTime: 0,
    mutationFn: (action: () => Promise<void>) => action()});
  const reset = mutation.reset;
  useEffect(() => {
    scope.current.mounted = true;
    const stop = watchPublicFormAuthState((next) => {
      const uid = next?.phoneNumber ? next.uid : "";
      if (scope.current.uid !== uid) {
        cache.removeQueries({queryKey: ["guest-event", eventId, scope.current.uid]});
        scope.current.epoch++;
        scope.current.uid = uid;
        challenge.current?.clear(); challenge.current = null;
        setCode(""); setCodeSent(false); setMessage(""); reset();
      }
      setUser(next);
    });
    return () => {
      scope.current.mounted = false;
      scope.current.epoch++;
      challenge.current?.clear(); stop();
      cache.removeQueries({queryKey: ["guest-event", eventId]});
    };
  }, [cache, eventId, reset]);
  const uid = user?.phoneNumber ? user.uid : "";
  const queryKey = ["guest-event", eventId, uid];
  const [attempt, retry] = useReducer((value: number) => value + 1, 0);
  const {data: feed = waiting} = useQuery<GuestEventFeed>({queryKey, queryFn: skipToken, gcTime: 0, initialData: waiting});
  useEffect(() => {
    if (!uid) return;
    let active = true;
    let stop: (() => void) | undefined;
    const key = ["guest-event", eventId, uid];
    cache.setQueryData(key, waiting);
    const failed = () => { if (active) cache.setQueryData<GuestEventFeed>(key, {phase: "failed"}); };
    watchGuestEventDocuments(eventId, uid, (documents) => {
      if (!active) return;
      const sources: GuestEventSources = {
        entry: parseEventGuestEntry(documents.entry),
        status: parseGuestEventStatus(documents.status, uid),
        activeMemberOf: activeCommunityMemberships(documents.bookingFacts),
      };
      const ready: GuestEventFeed = {phase: "ready", sources};
      cache.setQueryData(key, ready);
    }, failed).then((next) => {
      if (active) stop = next; else next();
    }).catch(failed);
    return () => { active = false; stop?.(); };
  }, [attempt, cache, eventId, uid]);
  // The step changes by itself when the event starts or an offer expires.
  const [now, setNow] = useState(() => Date.now());
  const sources = feed.phase === "ready" ? feed.sources : null;
  useEffect(() => {
    const next = sources ? nextGuestEventChangeMillis(sources, now) : null;
    if (next === null) return;
    const timer = setTimeout(() => setNow(Date.now()),
      Math.min(Math.max(0, next - Date.now() + 50), 2_147_483_647));
    return () => clearTimeout(timer);
  }, [sources, now]);
  const viewer = sources ? guestEventState(sources, eventId, now) : null;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const epoch = scope.current.epoch;
    const current = () => scope.current.mounted && scope.current.epoch === epoch;
    setMessage("");
    try {
      await mutation.mutateAsync(async () => {
        if (!codeSent) {
          const normalized = phone.replace(/[\s()-]/gu, "");
          if (!/^\+[1-9][0-9]{7,14}$/u.test(normalized)) throw new Error(copy.invalidPhone);
          challenge.current?.clear();
          const next = await beginPublicEventPhoneVerification(normalized, recaptchaId);
          if (!current()) { next.clear(); return; }
          challenge.current = next;
          setCodeSent(true);
        } else {
          if (!challenge.current || !/^\d{6}$/u.test(code)) throw new Error(copy.invalidCode);
          await challenge.current.confirm(code);
          // The shared auth observer owns the transition and next account read.
        }
      });
    } catch {
      if (current()) setMessage(codeSent ? copy.invalidCode : copy.verificationFailed);
    }
  }
  return {user, phone, setPhone, code, setCode, codeSent, submit, message,
    pending: mutation.isPending, recaptchaId,
    viewer: viewer ? {guest: viewer} : null,
    loading: user === undefined || Boolean(uid) && feed.phase === "waiting",
    changePhone: () => {
      if (mutation.isPending) return;
      scope.current.epoch++;
      challenge.current?.clear(); challenge.current = null;
      setCode(""); setCodeSent(false); setMessage(""); reset();
    },
    changeAccount: () => signOutGuestUser().catch(() => setMessage(copy.verificationFailed)),
    error: feed.phase === "failed", refresh: retry};
}
