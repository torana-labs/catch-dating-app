import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {CatchTable, type CatchTableColumn} from "./CatchTable";
import {CatchViewport} from "./CatchViewport";

interface Row {
  key: string;
  item: {title: string; subtitle: string};
  type: {label: string};
  reply: {label: string; tone: "success" | "warning"};
  waiting: {text: string; tone?: "danger" | "warning"} | string;
}

const rows: Row[] = [
  {key: "moonmoth", item: {title: "Moonmoth", subtitle: "Weekly social nights · luma.com/moonmoth"}, type: {label: "Listing"}, reply: {label: "Replied", tone: "success"}, waiting: {text: "3 days", tone: "danger"}},
  {key: "brindle", item: {title: "Brindle Club", subtitle: "Claim by Arjun Bhatia, manager"}, type: {label: "Claim"}, reply: {label: "Waiting for a reply", tone: "warning"}, waiting: {text: "2 days", tone: "warning"}},
  {key: "harbor", item: {title: "Quayside Supper Club", subtitle: "Enquiry: We run 4 events a month"}, type: {label: "Enquiry"}, reply: {label: "Replied", tone: "success"}, waiting: "1 day"},
];

const columns: CatchTableColumn<Row>[] = [
  {key: "item", label: "Item", kind: "title"},
  {key: "type", label: "Type", kind: "badge", width: "110px"},
  {key: "reply", label: "Reply", kind: "marker", width: "72px"},
  {key: "waiting", label: "Waiting", sort: "desc", align: "end", width: "100px"},
];

const meta = {
  title: "Web UI/CatchTable",
  component: CatchTable<Row>,
  args: {columns, label: "Inbox", rows},
} satisfies Meta<typeof CatchTable<Row>>;

export default meta;
type Story = StoryObj<typeof meta>;

function Queue({size}: {size: "compact" | "expanded"}) {
  const [checked, setChecked] = useState<string[]>(["brindle"]);
  return (
    <section aria-label={`Queue, ${size}`} style={{border: "var(--catch-stroke-hairline) solid var(--catch-theme-line2)", height: 320, width: size === "compact" ? 390 : 900}}>
      <CatchViewport fill="parent" register="quiet" sizeClass={size}>
        <CatchTable
          bulk={[{label: "Assign", onPressed: () => undefined}, {label: "Approve", onPressed: () => undefined, variant: "primary"}]}
          checked={checked}
          columns={columns}
          density="compact"
          label={`Inbox, ${size}`}
          onChecked={setChecked}
          onRowPressed={() => undefined}
          rows={rows}
          selectable
          selectedKey="moonmoth"
        />
      </CatchViewport>
    </section>
  );
}

/** catch.table on the web: title, badge, marker and number cells, selection with the bulk bar, the selected row, sort and compact density; folded into rows on a phone. */
export const Contract: Story = {
  render: () => (
    <div style={{display: "grid", gap: 24}}>
      <Queue size="expanded" />
      <Queue size="compact" />
    </div>
  ),
};
