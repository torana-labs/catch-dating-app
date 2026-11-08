import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useEffect, useRef, useState} from "react";
import {
  createProgramAssetUpload,
  getProgramHamperWebView,
  uploadProgramAsset,
  upsertProgramHamper,
  type ProgramHamperWebViewCallableResponse,
} from "../../firebase";
import {programmeHampersCopy as copy} from "../../content/programmes";
import {websiteQueryKeys} from "../../shared/query/queryKeys";
import {
  programmeRequestId,
  programmeUploadProblem,
  type ProgrammeLinkCredential,
  type ProgrammeUploadType,
} from "./programmeLinkModel";
import {useProgrammeLinkRead} from "./useProgrammeLinkRead";

export type HampersView = ProgramHamperWebViewCallableResponse;
export type HamperRoom = HampersView["rooms"][number];

export const HAMPER_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface HampersDraft {
  /** The room Placed was pressed on, waiting for its photo. */
  stayId: string | null;
  pending: boolean;
  notice: string;
}

export interface HampersDeps {
  read: typeof getProgramHamperWebView;
  createUpload: typeof createProgramAssetUpload;
  upload: typeof uploadProgramAsset;
  upsert: typeof upsertProgramHamper;
}

const defaultDeps: HampersDeps = {
  read: getProgramHamperWebView,
  createUpload: createProgramAssetUpload,
  upload: uploadProgramAsset,
  upsert: upsertProgramHamper,
};

/**
 * The porters' hampers: the hotel's rooms and their state. Placed picks a
 * room; the photo (through a signed upload) or Placed again marks it done.
 * The link's own token authorises every write.
 */
export function useProgrammeHampersController(credential: ProgrammeLinkCredential | null, deps: HampersDeps = defaultDeps) {
  const client = useQueryClient();
  const read = useProgrammeLinkRead("hampers", credential, deps.read);
  const [instanceId] = useState(() => crypto.randomUUID());
  const [stayId, setStayId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const view = read.screen.kind === "ready" ? read.screen.view : null;

  const mutation = useMutation({
    mutationKey: websiteQueryKeys.programmeLinks.write("hampers", instanceId),
    retry: false, gcTime: 0,
    mutationFn: async (input: {token: string; room: HamperRoom; photo: File | null}) => {
      let photoAssetId: string | undefined;
      if (input.photo) {
        const intent = await deps.createUpload({
          kind: "hamper", token: input.token, contentType: input.photo.type as ProgrammeUploadType,
          sizeBytes: input.photo.size, requestId: programmeRequestId(),
        });
        await deps.upload(intent, input.photo);
        photoAssetId = intent.assetId;
      }
      await deps.upsert({
        token: input.token, stayId: input.room.stayId, status: "placed",
        ...(photoAssetId ? {photoAssetId} : {}), requestId: programmeRequestId(),
      });
      return input.room;
    },
    onSuccess: async (room) => {
      if (!mounted.current) return;
      setStayId(null);
      setNotice(copy.savedRoom(copy.room(room.roomLabel)));
      await client.invalidateQueries({queryKey: read.queryKey});
    },
    onError: () => {
      if (mounted.current) setNotice(copy.failed);
    },
  });

  function place(room: HamperRoom, photo: File | null) {
    if (!credential || mutation.isPending) return;
    if (photo) {
      if (programmeUploadProblem(photo, HAMPER_PHOTO_TYPES)) {
        setNotice(copy.photoProblem);
        return;
      }
    }
    setNotice("");
    mutation.mutate({token: credential.token, room, photo});
  }

  const selected = view?.rooms.find((room) => room.stayId === stayId) ?? null;
  return {
    ...read,
    draft: {stayId: selected?.stayId ?? null, pending: mutation.isPending, notice} satisfies HampersDraft,
    /** Placed on a row: pick the room; Placed on the picked room marks it without a photo. */
    pick: (room: HamperRoom) => {
      if (mutation.isPending) return;
      if (room.stayId === stayId) place(room, null);
      else { setStayId(room.stayId); setNotice(""); }
    },
    photo: (file: File | null) => {
      if (!file) return;
      if (!selected) { setNotice(copy.pickRoom); return; }
      place(selected, file);
    },
  };
}
