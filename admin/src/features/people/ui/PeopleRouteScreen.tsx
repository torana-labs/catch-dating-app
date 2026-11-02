import {usePeopleSearchController} from
  "../controllers/usePeopleSearchController";
import {PeopleScreen} from "./PeopleScreen";

export function PeopleRouteScreen({
  onOpenSafety,
}: {
  onOpenSafety: (uid: string) => void;
}) {
  return (
    <PeopleScreen onOpenSafety={onOpenSafety}
      search={usePeopleSearchController()} />
  );
}
