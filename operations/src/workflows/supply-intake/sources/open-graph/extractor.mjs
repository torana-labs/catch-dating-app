import {text} from "../schema-org.mjs";

// OpenGraph and meta tags never prove an event or an organizer on their own.
// This adapter always abstains and hands the page metadata to the extraction
// agent and to reviewers as context.
export const openGraphAdapter = Object.freeze({
  adapterId: "open-graph",
  platform: null,
  sourceProfileId: "open-graph",
  extractionMethod: "open_graph_metadata_v1",
  pageKinds: Object.freeze([]),
  extract(snapshot) {
    const meta = snapshot.meta ?? {};
    const metadata = {
      title: text(meta["og:title"]) ?? text(snapshot.title),
      description: text(meta["og:description"]) ?? text(meta.description),
      imageUrl: text(meta["og:image"]),
      siteName: text(meta["og:site_name"]),
      type: text(meta["og:type"]),
      url: text(meta["og:url"]) ?? text(snapshot.canonicalUrl) ?? text(snapshot.finalUrl),
    };
    return {
      abstained: true,
      abstainReason: Object.values(metadata).some(Boolean) ? "metadata_only" : "no_structured_data",
      templateFingerprint: null,
      metadata,
    };
  },
});
