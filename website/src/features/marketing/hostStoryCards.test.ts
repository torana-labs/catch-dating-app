import {describe, expect, it} from "vitest";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {fixtureHostStories} from "../../stories/fixtures/hostStories";
import {hostStoryCards} from "./hostStoryCards";

describe("hostStoryCards", () => {
  it("draws each story as a card linking its page, with its figure's source named", () => {
    const cards = hostStoryCards(fixtureHostStories, playbookCopy.storyFigure);
    expect(cards.map((card) => [card.id, card.href])).toEqual([
      ["driftwood-bay-runners", "/stories/driftwood-bay-runners/"],
      ["lantern-lane-supper", "/stories/lantern-lane-supper/"],
      ["harbour-line-quizzers", "/stories/harbour-line-quizzers/"],
    ]);
    expect(cards[0].stat?.label).toBe(`a placeholder figure · ${playbookCopy.storyFigure.sources.catchRecords}`);
    expect(cards[1].stat?.label).toBe(`a placeholder figure · ${playbookCopy.storyFigure.sources.selfReported}`);
    expect(cards[2].stat).toBeUndefined();
    expect(hostStoryCards([], playbookCopy.storyFigure)).toEqual([]);
  });
});
