import {createContext, useContext} from "react";
import type {EventPageData} from "./eventPageModel";

/** The event route's read model, from the live route catalog (PublicProviders). */
export const eventPageContext = createContext<EventPageData | null>(null);

export function useEventPage() {
  return useContext(eventPageContext);
}
