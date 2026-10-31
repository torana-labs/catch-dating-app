import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {CatchTabBar, type CatchTabBarItem} from "./CatchTabBar";
import {CatchViewport} from "./CatchViewport";

const items: CatchTabBarItem[] = [
  {value: "now", label: "Needs you", icon: "notifications", badge: 6, section: "Work", pinned: true},
  {value: "inbox", label: "Inbox", icon: "conversations", badge: 128, section: "Work", pinned: true},
  {value: "organizers", label: "Organizers", icon: "organizer", section: "Records", pinned: true},
  {value: "events", label: "Events", icon: "event", section: "Records"},
  {value: "system", label: "System", icon: "settings", section: "Settings"},
];

const meta = {
  title: "Web UI/CatchTabBar",
  component: CatchTabBar,
  args: {active: "inbox", items},
} satisfies Meta<typeof CatchTabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

function Frame({children, height = 420, width}: {children: ReactNode; height?: number; width?: number}) {
  return <div style={{display: "flex", height, width, border: "var(--catch-stroke-hairline) solid var(--catch-theme-line2)"}}>{children}</div>;
}

/** catch.tab_bar on the web: sidebar (app and quiet), rail with section rules, and the phone bar with More. */
export const Contract: Story = {
  render: (args) => (
    <div style={{alignItems: "start", display: "flex", flexWrap: "wrap", gap: 24}}>
      <Frame><CatchTabBar {...args} header={{title: "Catch Admin", note: "Owner"}} label="Sidebar" layout="sidebar" primaryAction={{label: "New event", onPressed: () => undefined}} /></Frame>
      <Frame><CatchViewport fill="parent" navigation={<CatchTabBar {...args} footer={{title: "Suvrat"}} header={{title: "Catch Admin"}} label="Quiet sidebar" layout="sidebar" />} register="quiet" sizeClass="expanded" /></Frame>
      <Frame><CatchTabBar {...args} header={{title: "Catch Admin"}} label="Rail" layout="rail" /></Frame>
      <Frame height={80} width={390}><CatchTabBar {...args} active="system" label="Phone bar" layout="bottom" more={{onPressed: () => undefined}} /></Frame>
    </div>
  ),
};
