// CSS-free entry point (@catch/web-ui/artwork) for the cover artwork, so a
// server route such as a link-preview ImageResponse can render the same SVG
// without importing React components or CSS modules.
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
export {clubMonogram, clubPlaceholderCover, clubPlaceholderCoverLayout} from "./components/clubCoverArtwork";
export type {ClubPlaceholderCoverInput, ClubPlaceholderCoverLayout} from "./components/clubCoverArtwork";
