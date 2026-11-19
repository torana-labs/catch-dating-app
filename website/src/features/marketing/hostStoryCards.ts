import type {CatchStoryCardProps} from "@catch/web-ui";
import {interpolateContent as fill} from "@content/interpolate";
import type {HostStory} from "@content/stories/hostStories";

/** The words around a story's figure: the line template and each source's name. */
export interface HostStoryFigureCopy {
  readonly line: string;
  readonly sources: Readonly<Record<NonNullable<HostStory["figure"]>["source"], string>>;
}

/** One story card in a stories grid (CatchCardGrid kind "story"), keyed by its slug. */
export type HostStoryCard = CatchStoryCardProps & {id: string};

/**
 * The cards a stories band draws, in the order the stories are listed: the
 * title linking the story's page (/stories/<slug>/), its meta line and
 * summary, its one figure with its source named, and its photo.
 */
export function hostStoryCards(stories: readonly HostStory[], figureCopy: HostStoryFigureCopy): HostStoryCard[] {
  return stories.map((story) => ({
    id: story.slug,
    title: story.title,
    meta: story.meta,
    body: story.summary,
    href: `/stories/${encodeURIComponent(story.slug)}/`,
    ...(story.figure ? {stat: {value: story.figure.value, label: fill(figureCopy.line, {label: story.figure.label, source: figureCopy.sources[story.figure.source]})}} : {}),
    ...(story.photo ? {image: story.photo.asset, imageAlt: story.photo.alt} : {}),
  }));
}
