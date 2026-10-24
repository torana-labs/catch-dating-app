import type {ComponentProps} from "react";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchGap, type CatchGapSize} from "./CatchGap";
import {CatchInset, type CatchInsetPadding} from "./CatchInset";
import {CatchPageBody} from "./CatchPageBody";
import {CatchSectionList} from "./CatchSectionList";
import {CatchText, type CatchTextVariant} from "./CatchText";

type FoundationStoryArgs = ComponentProps<typeof CatchText>;

const meta = {
  title: "Web UI/Foundations",
  component: CatchText,
  args: {children: "Catch", variant: "bodyM"},
} satisfies Meta<FoundationStoryArgs>;

export default meta;
type Story = StoryObj<FoundationStoryArgs>;

const textVariants: readonly CatchTextVariant[] = [
  "headline",
  "titleL",
  "sectionTitle",
  "titleS",
  "bodyLead",
  "bodyL",
  "bodyM",
  "bodyS",
  "supporting",
  "supportingStrong",
  "fieldLabel",
  "statusLabel",
  "metric",
];

const gapSizes: readonly CatchGapSize[] = [
  "headerTitleToSubtitle",
  "inline",
  "related",
  "formField",
  "section",
  "majorSection",
];

const insetPaddings: readonly CatchInsetPadding[] = [
  "content",
  "contentDense",
  "contentRelaxed",
  "contentSpacious",
  "contentBlock",
  "contentHorizontal",
  "contentVertical",
  "contentVerticalCompact",
  "contentVerticalRelaxed",
  "contentVerticalSpacious",
  "emptyStateContent",
  "pageHorizontal",
];

function TextRoles() {
  const variants = textVariants;
  return (
    <CatchGap size="related">
      {variants.map((variant) => (
        <CatchText key={variant} variant={variant}>
          {variant === "metric" ? "1,280" : `${variant}: Thursday supper club, 8 PM`}
        </CatchText>
      ))}
    </CatchGap>
  );
}

/** catch.text: every role in both themes, then the per-instance overrides. */
export const Text: Story = {
  render: () => (
    <>
      <CatchPageBody>
        <CatchGap size="majorSection">
          <TextRoles />
          <CatchGap size="related">
            <CatchText as="h2" variant="titleL">Heading element</CatchText>
            <CatchText color="danger" variant="supporting">Danger color</CatchText>
            <CatchText color="positiveText" variant="supporting">Positive color</CatchText>
            <CatchText color="attentionText" variant="supporting">Attention color</CatchText>
            <CatchText textAlign="center" variant="bodyM">Centred text</CatchText>
            <CatchText maxLines={2} variant="bodyL">
              Two-line clamp. A long description of the evening wraps onto more lines than
              the role allows, so the second line ends with an ellipsis instead of growing
              the card past its bounds on narrow screens.
            </CatchText>
          </CatchGap>
        </CatchGap>
      </CatchPageBody>
      <div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}>
        <CatchPageBody>
          <TextRoles />
        </CatchPageBody>
      </div>
    </>
  ),
};

function Swatch({label}: {label: string}) {
  return (
    <div style={{background: "var(--catch-theme-raised)", outline: "1px solid var(--catch-theme-line2)"}}>
      <CatchInset padding="contentDense">
        <CatchText variant="statusLabel">{label}</CatchText>
      </CatchInset>
    </div>
  );
}

function GapRoles() {
  return (
    <CatchSectionList emptyStateOmitted gap="formField">
      {gapSizes.map((size) => (
        <CatchGap key={size} size="inline">
          <CatchText variant="fieldLabel">{size}</CatchText>
          <CatchGap direction="horizontal" size={size} wrap>
            <Swatch label="One" />
            <Swatch label="Two" />
            <Swatch label="Three" />
          </CatchGap>
        </CatchGap>
      ))}
      <CatchGap crossAxisAlignment="center" direction="horizontal" mainAxisAlignment="spaceBetween"
        size="inline">
        <Swatch label="spaceBetween" />
        <Swatch label="centre-aligned" />
      </CatchGap>
    </CatchSectionList>
  );
}

function InsetRoles() {
  return (
    <CatchGap direction="horizontal" size="related" wrap>
      {insetPaddings.map((padding) => (
        <div key={padding} style={{outline: "1px dashed var(--catch-theme-line2)"}}>
          <CatchInset padding={padding}>
            <Swatch label={padding} />
          </CatchInset>
        </div>
      ))}
    </CatchGap>
  );
}

/** catch.screen_body on the web: CatchPageBody, CatchGap and CatchInset. */
export const Layout: Story = {
  render: () => (
    <div style={{background: "var(--catch-theme-raised)"}}>
      <CatchPageBody constrainToContentWidth>
        <CatchGap size="majorSection">
          <Swatch label="Constrained page body with gutter and default insets" />
          <GapRoles />
          <InsetRoles />
        </CatchGap>
      </CatchPageBody>
      <CatchPageBody gutter={false} pb="s8" pt="s0">
        <Swatch label="No gutter, pt s0, pb s8" />
      </CatchPageBody>
    </div>
  ),
};

export const SectionList: Story = {
  render: () => (
    <CatchPageBody>
      <CatchGap size="majorSection">
        <CatchSectionList emptyStateOmitted>
          <Swatch label="First section" />
          <Swatch label="Second section" />
          <Swatch label="Third section" />
        </CatchSectionList>
        <CatchSectionList
          emptyBuilder={() => <CatchText variant="supporting">No sections yet</CatchText>}
          emptyStateOmitted={false}
        >
          {[]}
        </CatchSectionList>
      </CatchGap>
    </CatchPageBody>
  ),
};
