import {missingProfileFields} from "../../shared/contracts/generated/profileRequirements";
import {accountCopy} from "../../content/account";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect, useId, useRef, useState, type FormEvent} from "react";
import {beginWebsiteAccountPhoneVerification, manageWebsiteAccount,
  watchWebsiteAccountAuthState, type PublicEventPhoneVerification, type User, type WebsiteAccountSection} from "../../firebase";
import type {FormStatus} from "../../shared/forms/types";

/** Private account data is keyed by UID and discarded when its observer leaves. */
export function useWebsiteAccountController(scope: {organizerId?: string; eventId?: string;
  /** The account page's own-record reads; other callers read identity only. */
  sections?: readonly WebsiteAccountSection[];} = {}) {
  const {organizerId, eventId, sections} = scope;
  const sectionKey = sections?.join(",") ?? "";
  const id = useId();
  const queryClient = useQueryClient();
  const recaptchaId = `account-${id.replace(/:/gu, "")}`;
  const [identity, setIdentity] = useState<{user: User | null; loaded: boolean}>({user: null, loaded: false});
  const live = useRef({uid: null as string | null, epoch: 0, mounted: false});
  const challenge = useRef<PublicEventPhoneVerification | null>(null);
  const busy = useRef(false);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"details" | "code">("details");
  const [status, setStatus] = useState<FormStatus>({message: "", tone: ""});
  const mutation = useMutation({retry: false, gcTime: 0,
    mutationFn: (action: () => Promise<void>) => action()});
  useEffect(() => {
    live.current.mounted = true;
    const stop = watchWebsiteAccountAuthState((user) => {
      const previous = live.current.uid;
      if (previous !== (user?.uid ?? null)) {
        live.current.epoch++;
        // Keep the entered details across this form's own first OTP sign-in.
        if (previous !== null) {
          setDisplayName(""); setDateOfBirth(""); setCode(""); setStage("details");
          challenge.current?.clear(); challenge.current = null;
          setStatus({message: "", tone: ""});
        }
      }
      live.current.uid = user?.uid ?? null;
      setIdentity({user, loaded: true});
      if (user?.phoneNumber) setPhoneNumber(user.phoneNumber);
      else if (previous !== null) setPhoneNumber("");
    });
    return () => {live.current.mounted = false; live.current.epoch++; challenge.current?.clear(); stop();};
  }, []);
  const uid = identity.user?.uid ?? null;
  const query = useQuery({queryKey: ["website-account", uid, organizerId ?? null, eventId ?? null, sectionKey],
    enabled: Boolean(uid), gcTime: 0, staleTime: 0, retry: false,
    queryFn: () => manageWebsiteAccount({action: "read", ...(organizerId ? {organizerId} : {}), ...(eventId ? {eventId} : {}),
      ...(sections?.length ? {sections: [...sections]} : {})})});
  const account = uid && !query.error && query.data?.uid === uid ? query.data : undefined;
  const ready = Boolean(account?.accountReady && (!account.eventAge || account.eventAge.eligible));
  useEffect(() => {
    if (account) {
      setDisplayName(account.displayName);
      setDateOfBirth(account.dateOfBirth ?? "");
    }
  }, [account?.uid, account?.profileRevision]);

  function restartVerification() {
    challenge.current?.clear(); challenge.current = null;
    setCode(""); setStage("details"); setStatus({message: "", tone: ""});
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const name = displayName.trim();
    const phone = phoneNumber.replace(/[\s()-]/gu, "");
    const missing = missingProfileFields("account", (field) =>
      field === "name" ? Boolean(name) : field === "phoneNumber" ? /^\+[1-9][0-9]{7,14}$/u.test(phone) : false);
    if (missing.length > 0) {
      setStatus({message: accountCopy.invalidDetails, tone: "is-error"}); return;
    }
    if (account?.eventAge?.needsDateOfBirth && !dateOfBirth) {
      setStatus({message: accountCopy.requiredBirth, tone: "is-error"}); return;
    }
    if (stage === "code" && !/^[0-9]{6}$/u.test(code)) {
      setStatus({message: accountCopy.invalidCode, tone: "is-error"}); return;
    }
    let epoch = live.current.epoch;
    const current = () => live.current.mounted && live.current.epoch === epoch;
    busy.current = true;
    setStatus({message: "", tone: ""});
    await mutation.mutateAsync(async () => {
      try {
        if (!identity.user?.phoneNumber && stage === "details") {
          challenge.current?.clear();
          const next = await beginWebsiteAccountPhoneVerification(phone, recaptchaId);
          if (!current()) {next.clear(); return;}
          challenge.current = next; setStage("code");
          setStatus({message: accountCopy.codeSent, tone: "is-success"}); return;
        }
        let accountUid = live.current.uid;
        if (stage === "code") {
          if (!challenge.current) throw new Error(accountCopy.expired);
          const user = await challenge.current.confirm(code);
          if (!live.current.mounted || (live.current.uid && live.current.uid !== user.uid) || user.phoneNumber !== phone) return;
          accountUid = user.uid;
          epoch = live.current.epoch;
        }
        if (!accountUid || !current()) return;
        const requestScope = {...(organizerId ? {organizerId} : {}), ...(eventId ? {eventId} : {})};
        const latest = await manageWebsiteAccount({action: "read", ...requestScope});
        if (!current() || latest.uid !== accountUid) return;
        await manageWebsiteAccount({action: "complete", ...requestScope,
          displayName: latest.displayName || name, expectedUid: accountUid, expectedProfileRevision: latest.profileRevision,
          ...(!latest.dateOfBirth && dateOfBirth ? {dateOfBirth} : {})});
        if (!current()) return;
        challenge.current?.clear(); challenge.current = null; setStage("details");
        await queryClient.invalidateQueries({queryKey: ["website-account", accountUid]});
      } catch (error) {
        if (current() && typeof error === "object" && error !== null && "code" in error &&
          ["auth/code-expired", "auth/session-expired"].includes(String(error.code))) restartVerification();
        if (current()) setStatus({message: accountError(error), tone: "is-error"});
      } finally {busy.current = false;}
    });
  }
  return {id, uid, account, ready, loading: !identity.loaded || Boolean(uid && query.isPending),
    pending: mutation.isPending, status: query.error ? {message: accountError(query.error), tone: "is-error" as const} : status,
    displayName, setDisplayName, phoneNumber, setPhoneNumber, dateOfBirth, setDateOfBirth,
    code, setCode, stage, recaptchaId, verified: Boolean(identity.user?.phoneNumber),
    ageRequired: Boolean(account?.eventAge?.needsDateOfBirth),
    ageIneligible: Boolean(account?.eventAge && !account.eventAge.needsDateOfBirth && !account.eventAge.eligible),
    handleSubmit, restartVerification, refresh: query.refetch};
}
export type WebsiteAccountController = ReturnType<typeof useWebsiteAccountController>;
function accountError(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "auth/invalid-verification-code") return accountCopy.incorrectCode;
    if (error.code === "functions/aborted") return accountCopy.accountChanged;
  }
  return accountCopy.failed;
}
