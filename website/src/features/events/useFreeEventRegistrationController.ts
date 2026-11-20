import {useMutation} from "@tanstack/react-query";
import {type FormEvent, useEffect, useId, useRef, useState} from "react";
import {eventDetailCopy} from "../../content/events";
import {beginPublicEventPhoneVerification, registerPublicEvent,
  watchPublicFormAuthState, type User, type PublicEventPhoneVerification} from "../../firebase";
import type {FormStatus as FormStatusModel} from "../../shared/forms/types";
import {eventInviteTokenFromLocation} from "../../shared/eventInviteAttribution";
import {catchPhoneE164} from "@catch/web-ui/phone";
import {activePhoneCountry} from "@content/markets";

export function useFreeEventRegistrationController(eventId: string, inviteTokenOverride?: string | null, initialDisplayName = "") {
  const reactId = useId();
  const recaptchaContainerId = `event-registration-recaptcha-${reactId.replace(/:/gu, "")}`;
  const verificationRef = useRef<PublicEventPhoneVerification | null>(null);
  const identity = useRef<{user: User | null; epoch: number; mounted: boolean}>({user: null, epoch: 0, mounted: false});
  const [verified, setVerified] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [whatsappUpdates, setWhatsappUpdates] = useState(false);
  const [smsUpdates, setSmsUpdates] = useState(false);
  const [stage, setStage] = useState<"details" | "code" | "success">("details");
  const [registeredScope, setRegisteredScope] = useState<{eventId: string; attendeeId: string} | null>(null);
  const busy = useRef(false);
  const {mutateAsync, isPending: pending, reset} = useMutation({retry: false, gcTime: 0,
    mutationFn: (action: () => Promise<void>) => action()});
  const [status, setStatus] = useState<FormStatusModel>({message: "", tone: ""});
  const copy = eventDetailCopy.hero.webRegistration;
  const inviteToken = inviteTokenOverride ?? eventInviteTokenFromLocation();

  useEffect(() => {
    identity.current.mounted = true;
    const stop = watchPublicFormAuthState((user) => {
      const previous = identity.current.user;
      if (previous?.uid === user?.uid && previous?.phoneNumber === user?.phoneNumber) return;
      identity.current.user = user;
      identity.current.epoch++;
      setVerified(Boolean(user?.phoneNumber));
      setPhoneNumber(user?.phoneNumber ?? "");
      setRegisteredScope(null);
      setStatus({message: "", tone: ""});
      setStage("details");
      busy.current = false;
      reset();
      // OTP sign-in may finish while confirm() is awaiting. Keep its challenge
      // until that continuation can check the exact returned account.
      if (previous) {
        verificationRef.current?.clear();
        verificationRef.current = null;
        setDisplayName("");
        setWhatsappUpdates(false);
        setSmsUpdates(false);
      }
    });
    return () => {
      identity.current.mounted = false;
      identity.current.epoch++;
      verificationRef.current?.clear();
      stop();
    };
  }, [reset]);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || stage === "success") return;
    const name = displayName.trim();
    const phone = catchPhoneE164(phoneNumber, activePhoneCountry) ?? "";
    if (name.length < 1) {
      setStatus({message: copy.missingName, tone: "is-error"});
      return;
    }
    if (!phone) {
      setStatus({message: copy.invalidPhone, tone: "is-error"});
      return;
    }
    if (stage === "code" && !/^[0-9]{6}$/u.test(code.trim())) {
      setStatus({message: copy.invalidCode, tone: "is-error"});
      return;
    }

    let epoch = identity.current.epoch;
    const current = () => identity.current.mounted && epoch === identity.current.epoch;
    busy.current = true;
    setStatus({message: "", tone: ""});
    await mutateAsync(async () => {
    try {
      if (stage === "details" && !identity.current.user?.phoneNumber) {
        verificationRef.current?.clear();
        const next = await beginPublicEventPhoneVerification(
          phone,
          recaptchaContainerId
        );
        if (!current()) { next.clear(); return; }
        verificationRef.current = next;
        setStage("code");
        setStatus({message: copy.codeSent, tone: "is-success"});
        return;
      }
      if (stage === "code") {
        const verification = verificationRef.current;
        if (!verification) throw new Error(copy.verificationExpired);
        const user = await verification.confirm(code.trim());
        if (!identity.current.mounted ||
            epoch !== identity.current.epoch && identity.current.user?.uid !== user.uid ||
            identity.current.user && identity.current.user.uid !== user.uid ||
            user.phoneNumber !== phone) return;
        identity.current.user = user;
        epoch = identity.current.epoch;
      }
      if (!current() || !identity.current.user?.phoneNumber) return;
      const response = await registerPublicEvent({
        eventId,
        displayName: name,
        organizerUpdates: {
          whatsapp: whatsappUpdates,
          sms: smsUpdates,
          termsVersion: "organizer-updates-v1",
        },
        inviteToken,
      });
      if (!current()) return;
      verificationRef.current?.clear();
      verificationRef.current = null;
      setStage("success");
      setRegisteredScope(response.status === "waitlisted" ? null :
        {eventId: response.eventId, attendeeId: response.attendeeId});
      setStatus({
        message: response.status === "alreadyRegistered" ?
          copy.alreadyRegistered : response.status === "waitlisted" ?
            copy.waitlisted : copy.success,
        tone: "is-success",
      });
    } catch (error) {
      if (!current()) return;
      if (["auth/code-expired", "auth/session-expired"].includes(errorCode(error))) {
        verificationRef.current?.clear();
        verificationRef.current = null;
        setStage("details");
      }
      setStatus({message: registrationError(error), tone: "is-error"});
    } finally {
      if (current()) busy.current = false;
    }
    });
  }

  return {reactId, recaptchaContainerId, displayName, setDisplayName,
    phoneNumber, setPhoneNumber, code, setCode, whatsappUpdates, setWhatsappUpdates,
    smsUpdates, setSmsUpdates, stage, registeredScope, pending, status,
    verified, handleSubmit};
}

function registrationError(error: unknown): string {
  const copy = eventDetailCopy.hero.webRegistration;
  switch (errorCode(error)) {
    case "auth/invalid-verification-code":
      return copy.invalidCode;
    case "auth/code-expired":
    case "auth/session-expired":
      return copy.verificationExpired;
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
    case "functions/resource-exhausted":
      return copy.tooManyRequests;
    case "functions/failed-precondition":
    case "functions/not-found":
      return copy.eventUnavailable;
    default:
      return copy.genericError;
  }
}

function errorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) return "";
  return typeof error.code === "string" ? error.code : "";
}
