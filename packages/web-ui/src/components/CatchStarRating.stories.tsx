import type {Meta, StoryObj} from "@storybook/react-vite";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchStarRating} from "./CatchStarRating";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchStarRating",
  component: CatchStarRating,
  args: {label: "4 out of 5", value: 4},
} satisfies Meta<typeof CatchStarRating>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["organizer_listing_canonical", "event_detail_canonical"];

/** Every whole rating, at both sizes, on white, paper and ink. */
export const Ratings: Story = {
  parameters: {catchComponent: {id: "shared_star_rating", routeIds: storyRoutes, states: ["zero-to-five", "small", "medium", "on-paper", "on-ink"]}},
  render: () => (
    <StoryPage>
      {(["white", "paper", "ink"] as const).map((ground) => (
        <CatchBand aria-label={`Ratings on ${ground}`} ground={ground} key={ground} pb="compact" pt="compact">
          <CatchGap size="related">
            {[0, 1, 2, 3, 4, 5].map((value) => (
              <CatchGap crossAxisAlignment="center" direction="horizontal" key={value} size="related">
                <CatchStarRating label={`${value} out of 5`} value={value} />
                <CatchStarRating label={`${value} out of 5`} size="m" value={value} />
                <CatchText as="span" color="ink2" variant="bodyS">{`${value} out of 5`}</CatchText>
              </CatchGap>
            ))}
          </CatchGap>
        </CatchBand>
      ))}
    </StoryPage>
  ),
};

/** Fractions round to the nearest whole star, and values outside 0–5 clamp. */
export const Rounding: Story = {
  parameters: {catchComponent: {id: "shared_star_rating", routeIds: storyRoutes, states: ["rounding", "clamped"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Rounding" pb="compact" pt="compact">
        <CatchGap size="related">
          {[4.4, 4.5, 6, -1].map((value) => (
            <CatchGap crossAxisAlignment="center" direction="horizontal" key={value} size="related">
              <CatchStarRating label={`Rated ${value}`} value={value} />
              <CatchText as="span" color="ink2" variant="bodyS">{`value ${value}`}</CatchText>
            </CatchGap>
          ))}
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};
