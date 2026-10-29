import type {HostListingCatchEvent, HostListingExternalEvent} from "./types";

/**
 * Catch is not a dating product (CAT-247). The public listing schema has no
 * balanced admission label, rotations experience or Event Success scorecard,
 * and the projectors never produce them. The activity kind is open text, so a
 * singlesMixer event is shown as an open activity where events are arranged
 * for a page, as functions/src/publicPages/pageModel.ts does.
 */
const generatedMixerTitle = "Singles mixer";
const openActivityTitle = "Hosted event";

export function withoutDatingFraming(event: HostListingCatchEvent): HostListingCatchEvent {
  if (event.activityKind !== "singlesMixer") return event;
  return {...event, activityKind: "openActivity", ...(event.title === generatedMixerTitle ? {title: openActivityTitle} : {})};
}

export function withoutExternalDatingFraming(event: HostListingExternalEvent): HostListingExternalEvent {
  return event.activityKind === "singlesMixer" ? {...event, activityKind: "openActivity"} : event;
}
