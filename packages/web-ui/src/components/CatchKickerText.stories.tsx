import type {Meta, StoryObj} from "@storybook/react-vite";
import type {CSSProperties} from "react";
import {CatchKickerText, CatchMetadataText} from "./CatchKickerText";
import {CatchGap} from "./CatchGap";
import {CatchPageBody} from "./CatchPageBody";
const meta = {title: "Web UI/CatchKickerText", component: CatchKickerText, args: {label: "Tonight · 8:50 pm"}} satisfies Meta<typeof CatchKickerText>;
export default meta;
type Story = StoryObj<typeof meta>;
function States() {
  return <CatchGap size="formField">
    <CatchKickerText label="Tonight · 8:50 pm" />
    <CatchKickerText label="Tonight's pick" variant="lg" />
    <CatchKickerText label="Your preferences" variant="fieldSection" />
    <CatchKickerText label="Tinted primary" color="primary" />
    <div style={{maxWidth: "180px"}}><CatchKickerText label="A long section label in a constrained host" /></div>
    <div style={{maxWidth: "220px"}}><CatchKickerText label="A long editorial label that may reflow across several lines" maxLines={null} /></div>
    <CatchMetadataText label="18 guests · 5 km" color="ink2" />
    <CatchMetadataText label="18 guests · 5 km" color="primary" uppercase />
    <div style={{maxWidth: "180px"}}><CatchMetadataText label="A long factual label in a constrained host" color="ink" /></div>
  </CatchGap>;
}
export const Contract: Story = {render: () => <>
  <CatchPageBody constrainToContentWidth><States /></CatchPageBody>
  <div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}><CatchPageBody constrainToContentWidth><States /></CatchPageBody></div>
</>};
export const Md: Story = {};
export const Lg: Story = {args: {variant: "lg"}};
export const FieldSection: Story = {args: {variant: "fieldSection"}};
export const Tinted: Story = {args: {color: "primary"}};
export const Unbounded: Story = {args: {label: "A long editorial label that reflows in the available width", maxLines: null}};
export const Metadata: Story = {render: () => <CatchMetadataText label="18 guests · 5 km" color="ink2" />};
export const MetadataUppercase: Story = {render: () => <CatchMetadataText label="18 guests · 5 km" color="primary" uppercase />};
export const LargeText: Story = {render: () => <div style={{"--catch-typography-brand-kicker-size": "22px", "--catch-typography-brand-kicker-lg-size": "24px", "--catch-typography-brand-field-section-kicker-size": "22px", "--catch-typography-brand-mono-label-size": "22px", "--catch-typography-brand-mono-caps-label-size": "22px"} as CSSProperties}><States /></div>};
