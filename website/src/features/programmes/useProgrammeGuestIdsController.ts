import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useEffect, useRef, useState} from "react";
import {
  createProgramAssetUpload,
  getProgramGuestIdStatus,
  submitProgramGuestId,
  uploadProgramAsset,
  type ProgramGuestIdStatusCallableResponse,
  type SubmitProgramGuestIdCallablePayload,
} from "../../firebase";
import {programmeGuestIdsCopy as copy} from "../../content/programmes";
import {websiteQueryKeys} from "../../shared/query/queryKeys";
import {
  programmeRequestId,
  programmeUploadProblem,
  type ProgrammeLinkCredential,
  type ProgrammeUploadType,
} from "./programmeLinkModel";
import {useProgrammeLinkRead} from "./useProgrammeLinkRead";

export type GuestIdStatusView = ProgramGuestIdStatusCallableResponse;
export type GuestIdMember = GuestIdStatusView["members"][number];
export type GuestIdKind = SubmitProgramGuestIdCallablePayload["idKind"];
export const guestIdKinds: readonly GuestIdKind[] = ["aadhaar", "passport", "licence", "voterId"];

/** A member still to add: nothing sent, or asked for a clearer photo. */
export function guestIdNeeded(member: GuestIdMember): boolean {
  return member.status === "missing" || member.status === "askedAgain";
}

/** The ID being added: whose, which kind, and the photos chosen so far. */
export interface GuestIdDraft {
  guestId: string | null;
  kind: GuestIdKind;
  front: File | null;
  back: File | null;
  pending: boolean;
  notice: string;
}

export interface GuestIdsDeps {
  read: typeof getProgramGuestIdStatus;
  createUpload: typeof createProgramAssetUpload;
  upload: typeof uploadProgramAsset;
  submit: typeof submitProgramGuestId;
}

const defaultDeps: GuestIdsDeps = {
  read: getProgramGuestIdStatus,
  createUpload: createProgramAssetUpload,
  upload: uploadProgramAsset,
  submit: submitProgramGuestId,
};

/**
 * The household's ID page: the members and their status, and one ID at a
 * time. Each photo goes to a signed upload policy, then the ID is submitted
 * with the uploads' ids. Nothing is kept once the page closes.
 */
export function useProgrammeGuestIdsController(credential: ProgrammeLinkCredential | null, deps: GuestIdsDeps = defaultDeps) {
  const client = useQueryClient();
  const read = useProgrammeLinkRead("ids", credential, deps.read);
  const [instanceId] = useState(() => crypto.randomUUID());
  const [chosenGuestId, setChosenGuestId] = useState<string | null>(null);
  const [kind, setKind] = useState<GuestIdKind>("aadhaar");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [notice, setNotice] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const view = read.screen.kind === "ready" ? read.screen.view : null;
  const guestId = chosenGuestId ?? view?.members.find(guestIdNeeded)?.guestId ?? null;

  async function uploadOne(token: string, file: File): Promise<string> {
    const intent = await deps.createUpload({
      kind: "guestId", token, contentType: file.type as ProgrammeUploadType,
      sizeBytes: file.size, requestId: programmeRequestId(),
    });
    await deps.upload(intent, file);
    return intent.assetId;
  }

  const mutation = useMutation({
    mutationKey: websiteQueryKeys.programmeLinks.write("ids", instanceId),
    retry: false, gcTime: 0,
    mutationFn: async (input: {token: string; guestId: string; kind: GuestIdKind; front: File; back: File | null}) => {
      const [frontAssetId, backAssetId] = await Promise.all([
        uploadOne(input.token, input.front),
        input.back ? uploadOne(input.token, input.back) : Promise.resolve(null),
      ]);
      await deps.submit({
        token: input.token, guestId: input.guestId, idKind: input.kind, frontAssetId,
        ...(backAssetId ? {backAssetId} : {}), requestId: programmeRequestId(),
      });
      return input.guestId;
    },
    onSuccess: async (savedGuestId) => {
      if (!mounted.current) return;
      const name = view?.members.find((member) => member.guestId === savedGuestId)?.displayName ?? "";
      setFront(null);
      setBack(null);
      setChosenGuestId(null);
      setNotice(copy.saved(name));
      await client.invalidateQueries({queryKey: read.queryKey});
    },
    onError: () => {
      if (mounted.current) setNotice(copy.failed);
    },
  });

  function choose(side: "front" | "back", file: File | null) {
    if (mutation.isPending) return;
    const problem = file ? programmeUploadProblem(file) : null;
    if (problem) {
      setNotice(problem === "tooLarge" ? copy.tooLarge : copy.wrongType);
      return;
    }
    setNotice("");
    (side === "front" ? setFront : setBack)(file);
  }

  function open(nextGuestId: string) {
    if (mutation.isPending || nextGuestId === guestId) return;
    setChosenGuestId(nextGuestId);
    setFront(null);
    setBack(null);
    setNotice("");
  }

  function save() {
    if (!credential || !guestId || mutation.isPending) return;
    if (!front) {
      setNotice(copy.needFront);
      return;
    }
    setNotice("");
    mutation.mutate({token: credential.token, guestId, kind, front, back});
  }

  const draft: GuestIdDraft = {guestId, kind, front, back, pending: mutation.isPending, notice};
  return {
    ...read,
    draft,
    open,
    setKind: (next: GuestIdKind) => { if (!mutation.isPending) setKind(next); },
    choose,
    save,
  };
}
