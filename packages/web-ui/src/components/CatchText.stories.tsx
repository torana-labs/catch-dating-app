import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {catchTextTones, catchTextVariants} from "./catchCoreVocabulary";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchText",
  component: CatchText,
  args: {children: "Come on your own. Leave knowing a few more people."},
} satisfies Meta<typeof CatchText>;

export default meta;
type Story = StoryObj<typeof meta>;

function State({label, children}: {label: string; children: ReactNode}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone="secondary" variant="label-kicker">{label}</CatchText>
      {children}
    </CatchStack>
  );
}

const sentence = "Come on your own. Leave knowing a few more people.";

/**
 * catch.text on the web, in the record's states: roles (the 22 variants: the
 * 19 roles and the three responsive ones, as headings where the role is one),
 * recolored (every tone), aligned, clamped (two lines) and numeric (tabular
 * figures).
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="plain" padding="lg">
        <CatchStack gap={32}>
          <State label="roles">
            <CatchStack gap={12}>
              {catchTextVariants.map((variant) => (
                <CatchStack align="baseline" direction="row" gap={16} key={variant}>
                  <CatchText tone="tertiary" variant="label-code">{variant}</CatchText>
                  <CatchText variant={variant}>{sentence}</CatchText>
                </CatchStack>
              ))}
            </CatchStack>
          </State>
          <State label="recolored">
            <CatchStack direction="row" gap={16} wrap>
              {catchTextTones.map((tone) => <CatchText key={tone} tone={tone} variant="title-row">{tone}</CatchText>)}
            </CatchStack>
          </State>
          <State label="aligned">
            <CatchSurface>
              {(["start", "center", "end"] as const).map((align) => <CatchText align={align} as="p" key={align} variant="body">{`Aligned ${align}`}</CatchText>)}
            </CatchSurface>
          </State>
          <State label="numeric">
            <CatchStack gap={2}>
              <CatchText numeric variant="display-sm">₹1,111.10</CatchText>
              <CatchText numeric variant="display-sm">₹8,888.80</CatchText>
            </CatchStack>
          </State>
          <State label="clamped">
            <CatchSurface>
              <CatchText maxLines={2} variant="body">{sentence.repeat(8)}</CatchText>
            </CatchSurface>
          </State>
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};

/** The responsive roles at each size class. */
export const Responsive: Story = {
  render: () => (
    <CatchStack gap={0}>
      {(["compact", "medium", "expanded"] as const).map((size) => (
        <CatchRoot key={size} size={size} theme="day">
          <CatchSurface block="plain" padding="lg">
            <CatchText variant="hero">{`Hero, ${size}`}</CatchText>
            <CatchText variant="page-title">{`Page title, ${size}`}</CatchText>
            <CatchText variant="section-title">{`Section title, ${size}`}</CatchText>
          </CatchSurface>
        </CatchRoot>
      ))}
    </CatchStack>
  ),
};

/** On night, inherited text takes the night ink. */
export const Night: Story = {
  render: () => (
    <CatchRoot theme="night">
      <CatchSurface block="plain" padding="lg">
        {catchTextTones.map((tone) => <CatchText key={tone} tone={tone} variant="body">{`${tone}: ${sentence}`}</CatchText>)}
      </CatchSurface>
    </CatchRoot>
  ),
};

/** The website-only role (proposal L4): display-giant, one figure carrying a band, on a wide and a phone-width band. */
export const WebOnly: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="band" color="courts">
        <CatchText as="h2" numeric variant="display-giant">5%</CatchText>
      </CatchSurface>
      <div style={{width: 390}}>
        <CatchSurface block="band" color="courts">
          <CatchText as="h2" numeric variant="display-giant">5%</CatchText>
        </CatchSurface>
      </div>
    </CatchRoot>
  ),
};
