import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {catchSizeClasses, catchThemeModes} from "./catchCoreVocabulary";
import {useCatch} from "./catchRootContext";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchRoot",
  component: CatchRoot,
  args: {children: null},
} satisfies Meta<typeof CatchRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A plain block with the lg padding, so each root's ground shows around its content. */
function Padded({children}: {children: ReactNode}) {
  return <CatchSurface block="plain" padding="lg">{children}</CatchSurface>;
}

/** What the root tells everything inside it. */
function Readout() {
  const {theme, sizeClass, register, ground, format} = useCatch();
  return (
    <CatchStack gap={4}>
      <CatchText variant="page-title">{`${theme}, ${sizeClass}`}</CatchText>
      <CatchText tone="secondary" variant="body-small">
        {`Ground ${ground}, register ${register}${format ? `, format ${format}` : ""}.`}
      </CatchText>
      <CatchSurface>
        <CatchText variant="title-row">A tile on this ground</CatchText>
      </CatchSurface>
    </CatchStack>
  );
}

/**
 * catch.root on the web: day and night at each size class, and a format.
 * Each root is given its size, so the page-title role resizes with it.
 */
export const Contract: Story = {
  render: () => (
    <CatchStack gap={0}>
      {catchThemeModes.map((theme) =>
        catchSizeClasses.map((size) => (
          <CatchRoot key={`${theme}-${size}`} size={size} theme={theme}>
            <Padded><Readout /></Padded>
          </CatchRoot>
        )),
      )}
      <CatchRoot format="courts" size="medium">
        <Padded>
          <Readout />
          <CatchSurface block="spotlight" color="courts">
            <CatchText variant="section-title">The format colours the spotlight</CatchText>
          </CatchSurface>
        </Padded>
      </CatchRoot>
    </CatchStack>
  ),
};

/** size="auto" measures the root's own width. */
export const Auto: Story = {
  render: () => (
    <CatchRoot>
      <Padded><Readout /></Padded>
    </CatchRoot>
  ),
};

/** Admin's quiet register. */
export const Quiet: Story = {
  render: () => (
    <CatchRoot register="quiet" size="expanded">
      <Padded><Readout /></Padded>
    </CatchRoot>
  ),
};
