import type {PlaybookPageDocument} from "@content/playbook/playbookContract";
import type {HostStory} from "@content/stories/hostStories";

/**
 * Fictional host stories for Storybook and tests only. Every organiser,
 * place and figure here is made up (the fictional set in
 * tool/third_party_names_allowlist.json). Shipped content holds no stories
 * (content/stories/hostStories.ts) until real ones, with written consent,
 * real figures and photos with rights, are added there.
 */
export const fixtureHostStories: readonly HostStory[] = [
  {
    slug: "driftwood-bay-runners",
    title: "Sample story: a Sunday run that kept its newcomers",
    meta: "Fictional run club · sample city",
    summary: "A fictional club moves its sign-ups off a group chat and plans pace groups before the start.",
    figure: {value: "Sample figure", label: "a placeholder figure", source: "catchRecords"},
    consent: {writtenOn: "2026-01-01", record: "fixture: no real consent"},
  },
  {
    slug: "lantern-lane-supper",
    title: "Sample story: a long table that fills itself",
    meta: "Fictional supper club · sample city",
    summary: "A fictional host takes payment at booking and asks about dietary needs before the night.",
    figure: {value: "Sample figure", label: "a placeholder figure", source: "selfReported"},
    consent: {writtenOn: "2026-01-01", record: "fixture: no real consent"},
  },
  {
    slug: "harbour-line-quizzers",
    title: "Sample story: fair teams on a weeknight",
    meta: "Fictional quiz night · sample city",
    summary: "A fictional quizmaster builds teams from who is coming, so nobody plays alone.",
    consent: {writtenOn: "2026-01-01", record: "fixture: no real consent"},
  },
];

/**
 * A fictional story page (`story_detail/driftwood-bay-runners`), the shape a
 * real story takes once there is one: a hero, the story in the organiser's
 * words with its figure footnoted, and the closing band. Storybook and the
 * content tests use it; it is never registered in a page index.
 */
export const fixtureHostStoryPage = {
  $schema: "../../playbookPage.schema.json",
  id: "story_detail/driftwood-bay-runners",
  route: "story_detail",
  meta: {title: "Sample story | {{brand.name}}", description: "A fictional host story for Storybook.", noindex: true},
  header: {variant: "host", breadcrumbs: {links: [{label: "For hosts", to: {route: "host"}}], current: "Sample story"}},
  footer: {variant: "host", footnotes: [{id: "sample-figure", text: "A fictional figure for Storybook, not a real record."}]},
  sections: [
    {
      type: "hero", id: "top", ground: "paper", kicker: "Host story · fictional sample",
      title: "A Sunday run that kept its newcomers.",
      lead: "A fictional club, a sample city and a placeholder figure, to show the shape of a story page.",
      actions: [{label: "Start free trial", to: {route: "host_start"}, emphasis: "primary"}],
    },
    {
      type: "story", id: "in-their-words", ground: "white", kicker: "In their words",
      name: "Sample organiser", initials: "SO", meta: "Fictional run club",
      quote: "A sample quote, approved by nobody, standing in for the organiser's own words.",
      metrics: [{label: "A placeholder figure", value: "Sample", footnote: "sample-figure"}],
    },
    {
      type: "cta", id: "start", ground: "coral", kicker: "Your story starts with one event", title: "Run your next night on {{brand.name}}.",
      lead: "Start the free trial, or book a walkthrough and we’ll set it up with you.",
      actions: [
        {label: "Start free trial", to: {route: "host_start"}, emphasis: "primary"},
        {label: "Book a walkthrough", to: {route: "host_walkthrough"}, emphasis: "secondary"},
      ],
    },
  ],
} as const satisfies PlaybookPageDocument;
