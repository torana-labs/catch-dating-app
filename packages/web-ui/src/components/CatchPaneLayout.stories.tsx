import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchPaneLayout, type CatchPaneLayoutMode} from "./CatchPaneLayout";
import {CatchText} from "./CatchText";
import {CatchViewport} from "./CatchViewport";
import {CatchWorkspaceHeader} from "./CatchWorkspaceHeader";

const meta = {
  title: "Web UI/CatchPaneLayout",
  component: CatchPaneLayout,
  args: {main: null, pattern: "queue"},
} satisfies Meta<typeof CatchPaneLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

function Pane({title, body}: {title: string; body: string}) {
  return (
    <>
      <CatchWorkspaceHeader kicker="Inbox" title={title} />
      <CatchText as="p" color="ink2" variant="bodyS">{body}</CatchText>
    </>
  );
}

function Pattern({pattern, width = 1100}: {pattern: CatchPaneLayoutMode; width?: number}) {
  const second = <Pane body="The selected item or the side pane." title={pattern === "queue" || pattern === "list-detail" ? "Harbor Social" : "This week"} />;
  return (
    <div style={{border: "var(--catch-stroke-hairline) solid var(--catch-theme-line2)", height: 260, width}}>
      <CatchViewport fill="parent" register="quiet" sizeClass="expanded">
        <CatchPaneLayout
          aside={pattern === "feed" || pattern === "reading" ? second : undefined}
          detail={pattern === "queue" || pattern === "list-detail" ? second : undefined}
          main={<Pane body={`The ${pattern} pattern's main pane.`} title="Inbox" />}
          pattern={pattern}
        />
      </CatchViewport>
    </div>
  );
}

/** catch.pane_layout on the web: queue, list-detail, feed, reading and wide-table, and a narrow queue showing one pane. */
export const Contract: Story = {
  render: () => (
    <div style={{display: "grid", gap: 16}}>
      <Pattern pattern="queue" />
      <Pattern pattern="list-detail" />
      <Pattern pattern="feed" />
      <Pattern pattern="reading" />
      <Pattern pattern="wide-table" />
      <Pattern pattern="queue" width={640} />
    </div>
  ),
};
