import previewCards from "../content/previewCards.json" with {type: "json"};
import {brand} from "@catch/brand";

// Rendered by website/scripts/renderPreviewCards.mjs; the version query
// changes with the card's inputs so chat apps fetch a re-rendered card.
export type PreviewCardId = keyof typeof previewCards.cards;

const cardForCanonicalPath: Record<string, PreviewCardId> = {
  "/": "home", "/explore/": "home", "/host/": "host", "/host/apply/": "apply",
  "/claim/": "claim", "/organizers/": "organizers", "/f/": "form",
};

export function previewCardFor(canonicalPath: string): PreviewCardId {
  return cardForCanonicalPath[canonicalPath] ?? "default";
}

export function previewCardImage(id: PreviewCardId) {
  const card = previewCards.cards[id];
  return {url: `${brand.web.origin}${card.path}?v=${card.version}`, width: previewCards.width, height: previewCards.height, alt: card.alt};
}
