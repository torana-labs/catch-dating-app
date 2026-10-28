import type {HostListingCatchEvent, HostListingExternalEvent} from "./types";

/**
 * Catch is not a dating product (CAT-247): a public page never shows the
 * balanced admission label, the rotations experience, the singlesMixer
 * activity or an Event Success scorecard. The projectors stay in parity with
 * the Functions read-model builder, so the rule applies where events are
 * arranged for a page, as functions/src/publicPages/pageModel.ts does.
 */
const generatedMixerTitle = "Singles mixer";
const openActivityTitle = "Hosted event";

export function withoutDatingFraming(event: HostListingCatchEvent): HostListingCatchEvent {
  const {admissionLabels, catchExperienceActivities, scorecard: _scorecard, ...rest} = event;
  const labels = (admissionLabels ?? []).filter((label) => label !== "balanced");
  const experience = (catchExperienceActivities ?? []).filter((activity) => activity !== "rotations");
  const mixer = rest.activityKind === "singlesMixer";
  return {
    ...rest,
    ...(mixer ? {activityKind: "openActivity"} : {}),
    ...(mixer && rest.title === generatedMixerTitle ? {title: openActivityTitle} : {}),
    ...(labels.length ? {admissionLabels: labels} : {}),
    ...(experience.length ? {catchExperienceActivities: experience} : {}),
  };
}

export function withoutExternalDatingFraming(event: HostListingExternalEvent): HostListingExternalEvent {
  return event.activityKind === "singlesMixer" ? {...event, activityKind: "openActivity"} : event;
}
