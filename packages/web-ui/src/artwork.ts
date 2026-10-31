// CSS-free entry point (@catch/web-ui/artwork) for the cover artwork, so a
// server route such as a link-preview ImageResponse can render the same SVG
// without importing React components or CSS modules. Server code that needs
// an activity kind's format (the homepage's server catalog) reads it here too.
export {
  activityArtworkMarks,
  activityArtworkPatterns,
  activityArtworkSvg,
  activityArtworkTokenNames,
  activityCover,
  activityKindFromValue,
  catchActivityKinds,
} from "./components/activityArtwork";
export type {
  ActivityArtworkMark,
  ActivityArtworkPattern,
  ActivityArtworkSvgOptions,
  ActivityArtworkTokenNames,
  ActivityCover,
  CatchActivityKind,
} from "./components/activityArtwork";
export {activityArtworkTokenValues, resolveActivityArtworkToken} from "./components/activityArtworkTokens";
export {organizerMonogram, organizerPlaceholderCover, organizerPlaceholderCoverLayout} from "./components/organizerCoverArtwork";
export type {OrganizerPlaceholderCoverInput, OrganizerPlaceholderCoverLayout} from "./components/organizerCoverArtwork";
export {catchFormatOf} from "./components/palette";
