import {brand} from "./brand.ts";

export const routeRecoveryCopy = {
  title: "We couldn’t open this page",
  body: "Check your connection, then try opening this page again.",
  unavailable: "This page is still unavailable. Please try again later.",
  retry: "Try again",
  home: `Return to ${brand.name}`,
} as const;
