import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchAvatar, type CatchAvatarColors} from "./CatchAvatar";
import {CatchAvatarRow} from "./CatchAvatarRow";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchAvatar",
  component: CatchAvatar,
  args: {name: "Riya Sharma", size: 56},
} satisfies Meta<typeof CatchAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const run: CatchAvatarColors = {
  accent: "var(--catch-format-run-accent)",
  deep: "var(--catch-format-run-deep)",
  soft: "color-mix(in srgb, var(--catch-format-run-accent) 18%, var(--catch-palette-white))",
};
const dinner: CatchAvatarColors = {
  accent: "var(--catch-format-dinner-accent)",
  deep: "var(--catch-format-dinner-deep)",
  soft: "color-mix(in srgb, var(--catch-format-dinner-accent) 18%, var(--catch-palette-white))",
};
const countLabel = (count: number) => `+${count}`;

function State({children, label}: {children: ReactNode; label: string}) {
  return (
    <CatchGap crossAxisAlignment="center" size="inline">
      {children}
      <CatchText as="span" color="ink2" variant="bodyS">{label}</CatchText>
    </CatchGap>
  );
}

function States() {
  return (
    <CatchGap size="section">
      <CatchGap direction="horizontal" size="section" wrap>
        <State label="photo"><CatchAvatar imageUrl="/assets/events/social-run-music-hero-960.jpg" name="Aanya Rao" size={56} /></State>
        <State label="fallback-initials"><CatchAvatar name="Dev Malhotra" size={56} /></State>
        <State label="activity-context"><CatchAvatar colors={run} initials="RC" name="Run club" size={56} /></State>
        <State label="activity-dim"><CatchAvatar colors={dinner} dim initials="DN" name="Dinner" size={56} /></State>
        <State label="ring"><CatchAvatar borderColor="var(--catch-theme-primary)" borderWidth={2} name="Mira Shah" size={64} /></State>
        <State label="status-dot"><CatchAvatar name="Noor Khan" size={56} status="online" /></State>
        <State label="obscured"><CatchAvatar name="Private guest" obscured size={56} /></State>
        <State label="square"><CatchAvatar name="Host team" size={56} variant="square" /></State>
        <State label="count"><CatchAvatar count={19} countLabelBuilder={countLabel} recipe="count" size={48} /></State>
        <State label="veiled-run"><CatchAvatar borderColor="var(--catch-theme-surface)" borderWidth={2} colors={run} recipe="veiled" size={48} /></State>
        <State label="veiled-dinner"><CatchAvatar borderColor="var(--catch-theme-surface)" borderWidth={2} colors={dinner} recipe="veiled" size={48} /></State>
        <State label="monogram"><CatchAvatar ground="pink" name="Riya S." recipe="monogram" size={36} /></State>
        <State label="monogram-display">
          <CatchAvatar borderColor="var(--catch-palette-white)" borderWidth={4} ground="coral" initials="CR" recipe="monogram" size={88} />
        </State>
      </CatchGap>
      <CatchGap direction="horizontal" size="section" wrap>
        <State label="row">
          <CatchAvatarRow countLabelBuilder={countLabel} items={[{name: "Aanya Rao"}, {name: "Kabir Mehta"}, {name: "Isha Sen"}, {name: "Neha Kapoor"}]} totalCount={24} />
        </State>
        <State label="row-veiled">
          <CatchAvatarRow borderColor="var(--catch-ground-paper-fill)" borderWidth={3} countLabelBuilder={countLabel} items={[]} overlap={10} size={40} totalCount={27} veiledColors={run} veiledCount={4} />
        </State>
      </CatchGap>
    </CatchGap>
  );
}

/** catch.person_avatar on the web: every Flutter contract state, the monograms, and rows. Light and dark. */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><States /></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><States /></CatchBand>
    </StoryPage>
  ),
};

/** The organiser's mark on the page cover, and the event page's private attendee stack. */
export const Reference: Story = {
  render: () => (
    <>
      <ReferenceComparison
        desktop={{capture: "organizer/guest/1280", height: 96, width: 100, x: 116, y: 222}}
        label="Organiser monogram"
        phone={{capture: "organizer/guest/390", height: 96, width: 100, x: 32, y: 240}}
        render={() => <CatchAvatar borderColor="var(--catch-palette-white)" borderWidth={4} ground="coral" initials="CR" recipe="monogram" size={88} />}
      />
      <ReferenceComparison
        desktop={{capture: "event/catch_full/1280", height: 52, width: 170, x: 116, y: 2542}}
        label="Attendee stack"
        render={() => (
          <CatchAvatarRow borderColor="var(--catch-ground-paper-fill)" borderWidth={3} countLabelBuilder={countLabel} items={[]} overlap={10} size={40} totalCount={4} veiledColors={run} veiledCount={4} />
        )}
      />
    </>
  ),
};
