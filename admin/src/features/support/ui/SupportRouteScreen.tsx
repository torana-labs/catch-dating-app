import {useEffect} from "react";
import {useSupportInboxController} from
  "../controllers/useSupportInboxController";
import {SupportScreen} from "./SupportScreen";

/** Wires Support to the URL: /support and /support/:conversationId. */
export function SupportRouteScreen({
  conversationId,
  onError,
  onNavigate,
  onNotice,
  userUid,
}: {
  conversationId: string | null;
  onError: (message: string | null) => void;
  onNavigate: (path: string) => void;
  onNotice: (message: string | null) => void;
  userUid: string | null;
}) {
  const inbox = useSupportInboxController({onError, onNotice});
  const {select} = inbox;
  useEffect(() => {
    if (conversationId) select(conversationId);
  }, [conversationId, select]);
  return (
    <SupportScreen
      detailOpen={conversationId !== null}
      inbox={inbox}
      nowMs={Date.now()}
      onOpenTrial={() => onNavigate("/support/trial")}
      onSelect={(id) => onNavigate(`/support/${encodeURIComponent(id)}`)}
      userUid={userUid}
    />
  );
}
