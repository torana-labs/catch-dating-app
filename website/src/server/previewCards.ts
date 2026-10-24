import previewCards from "../content/previewCards.json" with {type: "json"};

// Rendered by website/scripts/renderPreviewCards.mjs; the version query
// changes with the card's inputs so chat apps fetch a re-rendered card.
export type PreviewCardId = keyof typeof previewCards.cards;

const cardForCanonicalPath: Record<string, PreviewCardId> = {"/host/": "host", "/host/apply/": "apply", "/f/": "form"};

export function previewCardFor(canonicalPath: string): PreviewCardId {
  return cardForCanonicalPath[canonicalPath] ?? "default";
}

export function previewCardImage(id: PreviewCardId) {
  const card = previewCards.cards[id];
  return {url: `https://catchdates.com${card.path}?v=${card.version}`, width: previewCards.width, height: previewCards.height, alt: card.alt};
}
