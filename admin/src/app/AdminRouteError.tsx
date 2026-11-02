import {CatchErrorState} from "@catch/web-ui";
import {useState} from "react";
import {useRouteError} from "react-router";
import {
  isStaleChunkError,
  isStaleChunkReloadPending,
  reloadOnceForStaleChunk,
} from "./staleChunkRecovery";

/** What a route shows when it throws, including when its chunk can't load. */
export function AdminRouteError() {
  const error = useRouteError();
  const stale = isStaleChunkError(error);
  // Renders nothing while the reload is under way, so the page doesn't flash.
  const [reloading] = useState(() =>
    isStaleChunkReloadPending() || (stale && reloadOnceForStaleChunk()));
  if (reloading) return null;
  return (
    <CatchErrorState
      message={stale ?
        "Admin was updated while this page was open. Reload to get the latest version." :
        "This page hit an error. Reload to try again."}
      onRetry={() => window.location.reload()}
      retryLabel="Reload"
      title={stale ? "Admin has been updated" : "Something went wrong"}
    />
  );
}
