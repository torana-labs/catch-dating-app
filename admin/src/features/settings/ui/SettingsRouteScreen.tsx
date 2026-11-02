import type {ReactNode} from "react";
import {useTeamController} from "../controllers/useTeamController";
import {SettingsScreen, type SettingsPage} from "./SettingsScreen";
import {TeamSettingsWorkspace} from "./TeamSettingsWorkspace";

/**
 * Wires Settings to the URL: /settings/:page, and /settings/team/:uid to
 * open one person's job. Pages from other areas arrive as `pages`.
 */
export function SettingsRouteScreen({
  canManageTeam,
  currentUserUid,
  onError,
  onNavigate,
  onNotice,
  otherPages,
  selectedPage,
  teamMemberUid,
}: {
  canManageTeam: boolean;
  currentUserUid: string | null;
  onError: (message: string | null) => void;
  onNavigate: (path: string) => void;
  onNotice: (message: string | null) => void;
  otherPages: ReadonlyArray<SettingsPage & {render: () => ReactNode}>;
  selectedPage: string | null;
  teamMemberUid: string | null;
}) {
  const pages: SettingsPage[] = [
    ...otherPages.map(({id, title, subtitle}) => ({id, title, subtitle})),
    ...(canManageTeam ? [{id: "team", title: "Team and roles",
      subtitle: "Who has an Admin job"}] : []),
  ];
  const page = pages.some((item) => item.id === selectedPage) ?
    selectedPage : null;
  return (
    <SettingsScreen
      onSelectPage={(id) => onNavigate(`/settings/${id}`)}
      pages={pages}
      selectedPage={page}
    >
      {page === "team" ? (
        <TeamPage currentUserUid={currentUserUid} onError={onError}
          onNavigate={onNavigate} onNotice={onNotice}
          teamMemberUid={teamMemberUid} />
      ) : otherPages.find((item) => item.id === page)?.render() ?? null}
    </SettingsScreen>
  );
}

function TeamPage({
  currentUserUid,
  onError,
  onNavigate,
  onNotice,
  teamMemberUid,
}: {
  currentUserUid: string | null;
  onError: (message: string | null) => void;
  onNavigate: (path: string) => void;
  onNotice: (message: string | null) => void;
  teamMemberUid: string | null;
}) {
  const team = useTeamController({currentUserUid, onError, onNotice,
    selectedUid: teamMemberUid});
  return (
    <TeamSettingsWorkspace
      onClosePerson={() => onNavigate("/settings/team")}
      onOpenPerson={(uid) => onNavigate(
        `/settings/team/${encodeURIComponent(uid)}`)}
      team={team}
    />
  );
}
