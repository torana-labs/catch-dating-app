/**
 * Published host stories: the cards the `stories` source of a playbook cards
 * band draws (/stories/), one per story page (`story_detail/<slug>`).
 *
 * Empty on purpose. A story is published only with the organiser's written
 * consent, real figures with a source and photos the site has the rights to
 * (./README.md). A cards band with the stories source does not render while
 * this list is empty (features/playbook/playbookBindings.ts), and /stories/
 * stays shelved until there are real stories to show
 * (content/playbook/pages/resources/index.ts). Fictional stories for
 * Storybook and tests live in website/src/stories/fixtures/hostStories.ts,
 * never here.
 */
export interface HostStory {
  /** The story page's slug: /stories/<slug>/, content key `story_detail/<slug>`. */
  readonly slug: string;
  /** The story's title, as its card and page show it. */
  readonly title: string;
  /** The format and the area, such as "Run club · the organiser's city". */
  readonly meta: string;
  /** A sentence or two under the title. */
  readonly summary: string;
  /** One figure from the organiser's records or their own account, with where it comes from. */
  readonly figure?: {readonly value: string; readonly label: string; readonly source: "catchRecords" | "selfReported"};
  /** A photo the site has the rights to, under /assets/. */
  readonly photo?: {readonly asset: string; readonly alt: string};
  /** When the organiser gave written consent to publish this story (ISO date), and where that consent is filed. */
  readonly consent: {readonly writtenOn: string; readonly record: string};
}

export const publishedHostStories: readonly HostStory[] = [];
