import {useInboxController} from "../controllers/useInboxController";
import {InboxScreen} from "./InboxScreen";

/** The live inbox route: the controller and its queries, drawn by InboxScreen. */
export function InboxRouteScreen({selectedItemId, onSelect, uid, onError, onNotice, canFillIn}: {
  selectedItemId: string | null;
  onSelect: (itemId: string | null) => void;
  uid: string | null;
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
  canFillIn: boolean;
}) {
  const controller = useInboxController({onError, onNotice, selectedItemId, onSelect});
  return (
    <InboxScreen
      model={{...controller, detail: controller.detail.data ?? null, detailError: controller.detail.isError}}
      canFillIn={canFillIn}
      onSelect={onSelect}
      selectedItemId={selectedItemId}
      uid={uid}
    />
  );
}
