import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {catchStackGaps} from "./catchCoreVocabulary";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchStack",
  component: CatchStack,
  args: {children: null},
} satisfies Meta<typeof CatchStack>;

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

function Tile({children}: {children: ReactNode}) {
  return <CatchSurface padding="sm"><CatchText variant="body-small">{children}</CatchText></CatchSurface>;
}

/** Two equal columns that stack below medium. */
function Collapsing() {
  return (
    <CatchStack collapseBelow="medium" direction="row" equal gap={16}>
      <Tile>Doors open at eight</Tile>
      <Tile>A longer second column that wraps onto more lines than the first</Tile>
    </CatchStack>
  );
}

/** catch.stack on the web: every gap, an equal row, a wrapping row, and a row collapsing on compact. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="plain" padding="lg">
        <CatchStack gap={32}>
          <State label="gaps">
            <CatchStack gap={12}>
              {catchStackGaps.map((gap) => (
                <CatchStack align="center" direction="row" gap={16} key={gap}>
                  <CatchText tone="tertiary" variant="label-code">{String(gap)}</CatchText>
                  <CatchStack direction="row" gap={gap}><Tile>A</Tile><Tile>B</Tile><Tile>C</Tile></CatchStack>
                </CatchStack>
              ))}
            </CatchStack>
          </State>
          <State label="equal">
            <CatchStack direction="row" equal gap={12}><Tile>One</Tile><Tile>Two, with more words in it</Tile><Tile>Three</Tile></CatchStack>
          </State>
          <State label="wrap">
            <CatchStack direction="row" gap={8} wrap>
              {["Run", "Dinner", "Games", "Courts", "Nights out", "Quizzes", "Padel", "Pickleball"].map((label) => <Tile key={label}>{label}</Tile>)}
            </CatchStack>
          </State>
          <State label="collapse">
            <CatchStack gap={16}>
              <Collapsing />
              <CatchRoot size="compact" theme="day"><Collapsing /></CatchRoot>
            </CatchStack>
          </State>
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};

/** gap="section" is 28 on compact and 40 wider. */
export const SectionGap: Story = {
  render: () => (
    <CatchStack gap={0}>
      {(["compact", "expanded"] as const).map((size) => (
        <CatchRoot key={size} size={size} theme="day">
          <CatchSurface block="plain" padding="lg">
            <CatchStack gap="section"><Tile>{`Section, ${size}`}</Tile><Tile>Next section</Tile></CatchStack>
          </CatchSurface>
        </CatchRoot>
      ))}
    </CatchStack>
  ),
};
