import {createContext, useContext} from "react";
import type {EventPageData} from "./eventPageModel";

/** The event route's read model and its map, from the live route catalog (PublicProviders). */
export interface EventPageRoute {
  page: EventPageData;
  mapImageUrl?: string;
}

export const eventPageContext = createContext<EventPageRoute | null>(null);

export function useEventPage() {
  return useContext(eventPageContext);
}
