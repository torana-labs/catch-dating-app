import {
  CatchIndexRow,
  CatchPaneLayout,
  CatchWorkspaceHeader,
} from "@catch/web-ui";
import type {ReactNode} from "react";

export interface SettingsPage {
  id: string;
  title: string;
  subtitle: string;
}

/**
 * Settings (boards AdminSettings*): the settings pages on the left as
 * navigation, the open page beside them. Each area adds its own page; the
 * app composes them so no feature imports another.
 */
export function SettingsScreen({
  children,
  onSelectPage,
  pages,
  selectedPage,
}: {
  children: ReactNode;
  onSelectPage: (id: string) => void;
  pages: readonly SettingsPage[];
  selectedPage: string | null;
}) {
  return (
    <CatchPaneLayout
      detail={selectedPage ? children : undefined}
      detailOpen={selectedPage !== null}
      main={
        <>
          <CatchWorkspaceHeader title="Settings" />
          {pages.map((page) => (
            <CatchIndexRow
              key={page.id}
              onTap={() => onSelectPage(page.id)}
              selected={page.id === selectedPage}
              subtitle={page.subtitle}
              title={page.title}
            />
          ))}
        </>
      }
      pattern="list-detail"
    />
  );
}
