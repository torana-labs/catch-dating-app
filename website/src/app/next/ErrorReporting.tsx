"use client";
import {brand} from "@catch/brand";
import {startErrorReporting} from "@catch/web-config/errorReporting";
import {isPrivateEventUpdatePath} from "../../analytics/privateRoutes";

// At load rather than in an effect, so errors while the page hydrates are caught.
if (typeof window !== "undefined") startErrorReporting({
  dsn: "https://db6cd0f7856596ac80b243ef95a3c6ee@o4512361461907456.ingest.de.sentry.io/4512361469247568",
  hosts: [new URL(brand.web.origin).hostname, new URL(brand.web.wwwOrigin).hostname],
  isPrivatePath: isPrivateEventUpdatePath,
});

export function ErrorReporting() {
  return null;
}
