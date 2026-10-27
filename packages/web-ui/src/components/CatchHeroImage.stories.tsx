import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchHeroImage} from "./CatchHeroImage";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchHeroImage",
  component: CatchHeroImage,
  args: {imageUrl: "/assets/events/social-run-music-hero-960.jpg"},
} satisfies Meta<typeof CatchHeroImage>;

export default meta;
type Story = StoryObj<typeof meta>;

const photo = "/assets/events/social-run-music-hero-960.jpg";
const alt = "Runners on the Carter Road promenade at sunset";

function State({children, label}: {children: ReactNode; label: string}) {
  return (
    <CatchGap size="related">
      <span style={{display: "block", height: 180}}>{children}</span>
      <CatchText as="span" color="ink2" variant="bodyS">{label}</CatchText>
    </CatchGap>
  );
}

function States() {
  return (
    <CatchGrid columns={4} compactColumns={2}>
      <State label="photo, scrim"><CatchHeroImage imageUrl={photo} semanticLabel={alt} /></State>
      <State label="no-scrim"><CatchHeroImage imageUrl={photo} semanticLabel={alt} showScrim={false} /></State>
      <State label="image-error"><CatchHeroImage imageUrl="/assets/events/missing-photo.jpg" semanticLabel={alt} /></State>
      <State label="fallback-gradient"><CatchHeroImage /></State>
    </CatchGrid>
  );
}

/** catch.detail_media on the web: the graded photo, its scrim, and the no-photo gradient. Light and dark grade. */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><States /></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><States /></CatchBand>
    </StoryPage>
  ),
};

/** The event page's media, framed: 16:10 on a wide page and 4:3 on a phone. */
export const Reference: Story = {
  render: () => (
    <ReferenceComparison
      desktop={{capture: "event/catch_full/1280", height: 420, width: 660, x: 96, y: 234}}
      label="Event media"
      phone={{capture: "event/catch_full/390", height: 276, width: 366, x: 12, y: 394}}
      render={() => <CatchHeroImage framed imageUrl={photo} semanticLabel={alt} showScrim={false} />}
    />
  ),
};
