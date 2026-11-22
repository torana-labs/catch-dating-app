import {useCallback, useEffect, useRef, useState, type FormEvent} from "react";
import {walkthroughBookingCopy as copy} from "@content/walkthroughBooking";
import {useWalkthroughDeps} from "./walkthroughClientContext";
import {
  readWalkthroughManageLink,
  walkthroughDayOf,
  walkthroughProblemFor,
  type WalkthroughManaged,
  type WalkthroughProblem,
  type WalkthroughSlots,
} from "./walkthroughModel";

/**
 * Where the manage page stands: `missing` (the link names no booking),
 * `signIn` (no token, so the booker confirms the number they booked with),
 * `refused` (the booking cannot be read), `ready` (the booking), `move`
 * (picking a new time) and `cancel` (confirming the cancellation).
 */
export type WalkthroughManageStage =
  | {name: "loading"}
  | {name: "missing"}
  | {name: "signIn"}
  | {name: "refused"; problem: WalkthroughProblem}
  | {name: "ready"}
  | {name: "move"}
  | {name: "cancel"};

/**
 * Owns the walkthrough manage page: the booking the link names (its id in
 * ?booking=, its token in #t=), read, moved or cancelled through
 * manageWalkthroughBooking. Without a token the booker confirms the number
 * they booked with on the one sign-in sheet and the page reads again. A
 * new time taken meanwhile reloads the slots and says so.
 */
export function useWalkthroughManageController({search, hash}: {search: string; hash: string}) {
  const {client, timeZone} = useWalkthroughDeps();
  const [link] = useState(() => readWalkthroughManageLink(search, hash));
  const [stage, setStage] = useState<WalkthroughManageStage>(() => link.bookingId ? {name: "loading"} : {name: "missing"});
  const [booking, setBooking] = useState<WalkthroughManaged | null>(null);
  const [slots, setSlots] = useState<WalkthroughSlots | null>(null);
  const [slotsProblem, setSlotsProblem] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [slotStartAt, setSlotStartAt] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<WalkthroughProblem | null>(null);
  const [busy, setBusy] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false;};
  }, []);

  const proof = link.manageToken ? {manageToken: link.manageToken} : {};

  const read = useCallback(async () => {
    if (!link.bookingId) return;
    setStage({name: "loading"});
    try {
      const next = await client.manage({bookingId: link.bookingId, action: "read", ...(link.manageToken ? {manageToken: link.manageToken} : {})});
      if (!mounted.current) return;
      setBooking(next);
      setStage({name: "ready"});
    } catch (error) {
      if (!mounted.current) return;
      const found = walkthroughProblemFor(error).problem;
      setStage(found === "not_yours" && !link.manageToken ? {name: "signIn"} : {name: "refused", problem: found});
    }
  }, [client, link]);

  useEffect(() => {void read();}, [read]);

  const loadSlots = useCallback(async (keepDay: string | null) => {
    setSlotsProblem(false);
    try {
      const next = await client.getSlots();
      if (!mounted.current) return;
      setSlots(next);
      setDay(next.days.some((entry) => entry.date === keepDay) ? keepDay : next.days[0]?.date ?? null);
      setSlotStartAt(null);
    } catch {
      if (mounted.current) setSlotsProblem(true);
    }
  }, [client]);

  function startMove() {
    setNotice(null);
    setProblem(null);
    setStage({name: "move"});
    void loadSlots(booking ? walkthroughDayOf(slots, booking.slot.startAt)?.date ?? null : null);
  }

  function startCancel() {
    setNotice(null);
    setProblem(null);
    setReason("");
    setStage({name: "cancel"});
  }

  function back() {
    setProblem(null);
    setNotice(null);
    setStage({name: "ready"});
  }

  async function change(payload: {action: "reschedule"; slotStartAt: string} | {action: "cancel"; reason?: string}) {
    if (!link.bookingId || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const next = await client.manage({bookingId: link.bookingId, ...proof, ...payload});
      if (!mounted.current) return;
      setBooking(next);
      setNotice(payload.action === "cancel" ? copy.manage.cancelled : copy.manage.moved);
      setStage({name: "ready"});
    } catch (error) {
      if (!mounted.current) return;
      const found = walkthroughProblemFor(error).problem;
      if (payload.action === "reschedule" && (found === "slot_taken" || found === "slot_unavailable")) {
        await loadSlots(day);
        if (mounted.current) setNotice(found === "slot_taken" ? copy.problems.slotTaken : copy.problems.slotUnavailable);
        return;
      }
      setProblem(found);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  function confirmMove(event?: FormEvent) {
    event?.preventDefault();
    if (!slotStartAt) {setNotice(copy.pickTime); return;}
    void change({action: "reschedule", slotStartAt});
  }

  function confirmCancel(event?: FormEvent) {
    event?.preventDefault();
    const text = reason.trim().slice(0, 300);
    void change({action: "cancel", ...(text ? {reason: text} : {})});
  }

  return {
    stage,
    booking,
    slots,
    slotsProblem,
    day,
    slotStartAt,
    timeZone,
    reason,
    notice,
    problem,
    busy,
    signIn,
    read: () => void read(),
    reloadSlots: () => void loadSlots(day),
    startMove,
    startCancel,
    back,
    pickDay: (date: string) => {setDay(date); setSlotStartAt(null); setNotice(null);},
    pickSlot: (startAt: string) => {setSlotStartAt(startAt); setNotice(null);},
    setReason,
    confirmMove,
    confirmCancel,
    openSignIn: () => setSignIn(true),
    closeSignIn: () => setSignIn(false),
    signedIn: () => {setSignIn(false); void read();},
  };
}
export type WalkthroughManageController = ReturnType<typeof useWalkthroughManageController>;
