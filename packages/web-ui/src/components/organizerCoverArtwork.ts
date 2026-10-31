/**
 * The typographic organiser cover (G7): the organiser's activity artwork with
 * its name and city set over it. Pure, so the website draws it in React and
 * link-preview cards set the same layout on the server.
 */
import {
  activityArtworkSvg,
  activityArtworkTokenNames,
  activityKindFromValue,
  type ActivityCover,
  type CatchActivityKind,
} from "./activityArtwork";
import {resolveActivityArtworkToken} from "./activityArtworkTokens";

export interface OrganizerPlaceholderCoverInput {
  name: string;
  city?: string | null;
  /** A stored activity value; unknown values draw the open format. */
  activityKind: string;
}

export interface OrganizerPlaceholderCoverLayout {
  activityKind: CatchActivityKind;
  name: string;
  /** Null when the organiser has no city. */
  city: string | null;
  /** Up to two initials, for covers too small to set the name. */
  monogram: string;
}

/** Same input, same cover: nothing here is random or time-dependent. */
export function organizerPlaceholderCoverLayout({name, city, activityKind}: OrganizerPlaceholderCoverInput): OrganizerPlaceholderCoverLayout {
  const trimmedName = name.trim();
  return {
    activityKind: activityKindFromValue(activityKind),
    name: trimmedName,
    city: city?.trim() || null,
    monogram: organizerMonogram(trimmedName),
  };
}

/** "AFTER FLY" → "AF", "Evening Club" → "EC", "Pickle" → "PI". */
export function organizerMonogram(name: string): string {
  const [first = "", second] = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  const letters = second ? [[...first][0], [...second][0]] : [...first].slice(0, 2);
  return letters.join("").toLocaleUpperCase();
}

/**
 * The G7 cover with the generated token values filled in, for rendering where
 * no stylesheet loads. `svg` is the artwork only: the caller sets the city and
 * name bottom-left in `ink`, city in the mono caps role above the name in the
 * display role, as OrganizerPlaceholderCover does.
 */
export function organizerPlaceholderCover(
  input: OrganizerPlaceholderCoverInput,
  {width = 1200, height = 630} = {},
): OrganizerPlaceholderCoverLayout & ActivityCover {
  const layout = organizerPlaceholderCoverLayout(input);
  const tokens = activityArtworkTokenNames(layout.activityKind);
  return {
    ...layout,
    svg: activityArtworkSvg({
      activityKind: layout.activityKind, width, height, mirrored: true, resolveToken: resolveActivityArtworkToken,
    }),
    background: resolveActivityArtworkToken(tokens.deep),
    ink: resolveActivityArtworkToken(tokens.mark),
  };
}
