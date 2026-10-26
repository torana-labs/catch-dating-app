import type {Meta, StoryObj} from "@storybook/react-vite";
import {type CSSProperties, type ReactNode, useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchMenu, type CatchMenuItem} from "./CatchMenu";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchMenu",
  component: CatchMenu,
  args: {items: [], label: "Menu"},
} satisfies Meta<typeof CatchMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const glyph = (path: string) => (
  <svg fill="none" focusable="false" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24"><path d={path} /></svg>
);
// Lucide "share-2", "link", "flag", "map-pin" and "chevron-down" (ISC).
const share = glyph("M18 8a3 3 0 1 0-2.8-4M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 13.5l6.8 4M15.4 6.5l-6.8 4");
const link = glyph("M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7");
const flag = glyph("M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7");
const pin = glyph("M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5");
const chevron = glyph("m6 9 6 6 6-6");

function State({children, label}: {children: ReactNode; label: string}) {
  return (
    <CatchGap size="related">
      <CatchText as="span" color="ink2" variant="bodyS">{label}</CatchText>
      {children}
    </CatchGap>
  );
}

const actions: CatchMenuItem<string>[] = [
  {icon: share, label: "Share event", value: "share"},
  {icon: link, label: "Copy link", sublabel: "catchdates.com/e/sunday-run", value: "copy"},
  {enabled: false, label: "Add to calendar", sublabel: "Available after booking", value: "calendar"},
  {danger: true, icon: flag, label: "Report event", startsSection: true, value: "report"},
];

const cityItems = (selected: string): CatchMenuItem<string>[] => [
  {label: "Mumbai", sublabel: "Live now", value: "mumbai"},
  {label: "Pune", sublabel: "Launching soon", value: "pune"},
  {label: "Bengaluru", sublabel: "Launching soon", value: "bengaluru"},
  {label: "Delhi NCR", sublabel: "Launching soon", value: "delhi"},
  {label: "Hyderabad", sublabel: "Launching soon", value: "hyderabad"},
].map((item) => ({...item, selected: item.value === selected, variant: "choice" as const}));

const many: CatchMenuItem<number>[] = Array.from({length: 24}, (_, index) => ({label: `Option ${index + 1}`, value: index, variant: "choice"}));

function States() {
  return (
    <CatchGrid columns={3} compactColumns={1}>
      <State label="action rows, icons, sublabels, a disabled row, a danger row in a new section"><CatchMenu items={actions} label="Event actions" width={300} /></State>
      <State label="choice rows, one selected"><CatchMenu items={cityItems("pune")} label="Choose your city" width={300} /></State>
      <State label="scrolling inside a short viewport"><div style={{display: "flex", flexDirection: "column", height: 280}}><CatchMenu items={many} label="Long list" width={300} /></div></State>
    </CatchGrid>
  );
}


const pillStyle: CSSProperties = {
  alignItems: "center",
  background: "var(--catch-theme-surface)",
  border: "var(--catch-stroke-underline) solid var(--catch-theme-line2)",
  borderRadius: "var(--catch-radius-pill)",
  color: "var(--catch-theme-ink)",
  cursor: "pointer",
  display: "inline-flex",
  font: "inherit",
  fontWeight: 600,
  gap: "var(--catch-space-s2)",
  height: "var(--catch-interaction-ios-minimum-extent)",
  padding: "0 var(--catch-space-micro14)",
};
const iconStyle: CSSProperties = {display: "inline-flex", height: 16, width: 16};

/** The homepage's city picker: a pill trigger the page draws, and the anchored menu of cities. */
function CityPicker() {
  const [city, setCity] = useState("mumbai");
  const name = cityItems(city).find((item) => item.selected)?.label;
  return (
    <CatchMenu
      align="end"
      items={cityItems(city)}
      label="Choose your city"
      onSelected={setCity}
      recipe="anchored"
      builder={({triggerProps}) => (
        <button style={pillStyle} type="button" {...triggerProps}>
          <span aria-hidden="true" style={iconStyle}>{pin}</span>{name}<span aria-hidden="true" style={iconStyle}>{chevron}</span>
        </button>
      )}
      width={300}
    />
  );
}

const formats = [
  {accent: "var(--catch-format-run-accent)", event: "Sunday Social Run", label: "Run club", value: "run"},
  {accent: "var(--catch-format-dinner-accent)", event: "Supper at Ode", label: "Supper club", value: "dinner"},
  {accent: "var(--catch-format-games-accent)", event: "Thursday Board Games", label: "Games night", value: "games"},
];

/** The host page's format picker on ink: a display trigger and options with their format dot. */
function FormatPicker() {
  const [format, setFormat] = useState("run");
  const items: CatchMenuItem<string>[] = formats.map((item) => ({
    icon: <span style={{background: item.accent, borderRadius: "var(--catch-radius-pill)", display: "block", height: 14, margin: 3, width: 14}} />,
    label: item.label,
    selected: item.value === format,
    sublabel: item.event,
    value: item.value,
    variant: "choice",
  }));
  return (
    <CatchMenu
      items={items}
      label="Event type"
      onSelected={setFormat}
      recipe="anchored"
      builder={({triggerProps}) => (
        <button style={{...pillStyle, background: "var(--catch-theme-raised)", borderRadius: "var(--catch-radius-md)", height: 60}} type="button" {...triggerProps}>
          <CatchText as="span" variant="displayXs">{formats.find((item) => item.value === format)?.label}</CatchText>
          <span aria-hidden="true" style={iconStyle}>{chevron}</span>
        </button>
      )}
      width={360}
    />
  );
}

/** An anchored action menu opened from a plain trigger: Flutter's anchored-trigger state. */
function ActionsTrigger() {
  return (
    <CatchMenu
      builder={({triggerProps}) => (
        <button style={pillStyle} type="button" {...triggerProps}>
          Event actions<span aria-hidden="true" style={iconStyle}>{chevron}</span>
        </button>
      )}
      items={actions}
      label="Event actions"
      recipe="anchored"
      width={300}
    />
  );
}

/**
 * catch.menu on the web: action and choice rows, icons, sublabels, sections,
 * disabled and danger rows and a scrolling panel, light and dark; then the
 * anchored recipe from a trigger and from a current selection. Flutter's
 * compact-selection-sheet is CatchSelectionMenu's adaptive sheet, which has
 * no web member yet.
 */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><States /></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><States /></CatchBand>
      <CatchBand aria-label="Anchored" pb="spacious" pt="compact">
        <CatchGap direction="horizontal" size="inline" wrap>
          <State label="anchored trigger"><ActionsTrigger /></State>
          <State label="anchored selection"><CityPicker /></State>
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};

/** Both v2 pickers. Open one with a click or the arrow keys; Escape returns to its trigger. */
export const Pickers: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="City" pb="spacious" pt="compact"><CatchGap crossAxisAlignment="end" size="inline"><CityPicker /></CatchGap></CatchBand>
      <CatchBand aria-label="Format" ground="ink" pb="spacious" pt="compact"><FormatPicker /></CatchBand>
    </StoryPage>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", {name: "Mumbai"});
    await userEvent.click(trigger);
    await userEvent.click(canvas.getByRole("option", {name: /Pune/}));
    await expect(canvas.getByRole("button", {name: "Pune"})).toHaveAttribute("aria-expanded", "false");
  },
};

/** The homepage header's city picker, closed as the board captures it. */
export const Reference: Story = {
  render: () => (
    <ReferenceComparison
      desktop={{capture: "home/mumbai_live/1280", height: 48, width: 140, x: 933, y: 18}}
      label="City picker"
      render={() => <CityPicker />}
    />
  ),
};
