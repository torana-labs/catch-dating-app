/**
 * Values of the generated tokens the activity artwork reads, for SVG rendered
 * where CSS custom properties do not resolve (link-preview cards on the
 * server). activityArtworkParity.test.ts pins every entry to
 * packages/web-config/generated/catch-tokens.css, so a token change that skips
 * this map fails the web-ui tests.
 */
export const activityArtworkTokenValues: Readonly<Record<string, string>> = {
  "--catch-activity-social-run-accent": "#D85A3C",
  "--catch-activity-social-run-deep": "#B33B1F",
  "--catch-activity-running-accent": "#C9482E",
  "--catch-activity-running-deep": "#97321E",
  "--catch-activity-walking-accent": "#6E9A5A",
  "--catch-activity-walking-deep": "#4F743E",
  "--catch-activity-pickleball-accent": "#2F9E7A",
  "--catch-activity-pickleball-deep": "#1D6E54",
  "--catch-activity-padel-accent": "#2E9AA0",
  "--catch-activity-padel-deep": "#1C6B6F",
  "--catch-activity-tennis-accent": "#4E9A4E",
  "--catch-activity-tennis-deep": "#347134",
  "--catch-activity-badminton-accent": "#4F70C8",
  "--catch-activity-badminton-deep": "#2E4FA6",
  "--catch-activity-cycling-accent": "#3A6FD0",
  "--catch-activity-cycling-deep": "#2251A5",
  "--catch-activity-spin-class-accent": "#3E55C0",
  "--catch-activity-spin-class-deep": "#2A3C92",
  "--catch-activity-yoga-accent": "#8A5FB0",
  "--catch-activity-yoga-deep": "#69408D",
  "--catch-activity-strength-training-accent": "#B0573C",
  "--catch-activity-strength-training-deep": "#823D28",
  "--catch-activity-dinner-accent": "#C44D6A",
  "--catch-activity-dinner-deep": "#9F2F4B",
  "--catch-activity-pub-quiz-accent": "#4356A8",
  "--catch-activity-pub-quiz-deep": "#2D3C7C",
  "--catch-activity-bar-crawl-accent": "#B14488",
  "--catch-activity-bar-crawl-deep": "#852E64",
  "--catch-activity-singles-mixer-accent": "#D85A6E",
  "--catch-activity-singles-mixer-deep": "#C72942",
  "--catch-activity-open-activity-accent": "#7A7166",
  "--catch-activity-open-activity-deep": "#595045",
  "--catch-color-light-surface": "#FFFFFF",
  "--catch-opacity-activity-artwork-pattern": "0.22",
  "--catch-opacity-activity-artwork-glyph": "0.2",
};

/** Resolves an artwork token name to its generated value. */
export function resolveActivityArtworkToken(name: string): string {
  const value = activityArtworkTokenValues[name];
  if (value === undefined) throw new Error(`No pinned value for activity artwork token ${name}.`);
  return value;
}
