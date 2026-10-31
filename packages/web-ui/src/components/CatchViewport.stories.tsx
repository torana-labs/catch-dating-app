import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchPaneLayout} from "./CatchPaneLayout";
import {CatchTabBar, type CatchTabBarItem} from "./CatchTabBar";
import {CatchText} from "./CatchText";
import {CatchViewport} from "./CatchViewport";
import {CatchWorkspaceHeader} from "./CatchWorkspaceHeader";

const meta = {
  title: "Web UI/CatchViewport",
  component: CatchViewport,
  args: {fill: "parent"},
} satisfies Meta<typeof CatchViewport>;

export default meta;
type Story = StoryObj<typeof meta>;

const items: CatchTabBarItem[] = [
  {value: "now", label: "Needs you", icon: "notifications", badge: 6, section: "Work", pinned: true},
  {value: "inbox", label: "Inbox", icon: "conversations", badge: 23, section: "Work", pinned: true},
  {value: "money", label: "Money", icon: "payment", badge: 2, section: "Work"},
  {value: "organizers", label: "Organizers", icon: "organizer", section: "Records", pinned: true},
  {value: "events", label: "Events", icon: "event", section: "Records"},
  {value: "settings", label: "Settings", icon: "settings", section: "Settings"},
];

function Shell({register, size}: {register: "app" | "quiet"; size: "compact" | "expanded"}) {
  const label = `${register} ${size}`;
  return (
    <div style={{border: "var(--catch-stroke-hairline) solid var(--catch-theme-line2)", height: size === "compact" ? 640 : 560, width: size === "compact" ? 390 : "100%"}}>
      <CatchViewport
        fill="parent"
        navigation={<CatchTabBar active="inbox" footer={{title: "Suvrat", note: "Owner"}} header={{title: "Catch Admin"}} items={items} label={label} />}
        register={register}
        sizeClass={size}
      >
        <CatchPaneLayout
          detail={<CatchWorkspaceHeader kicker="Inbox" position={{label: "1 of 23"}} title="Harbor Social" />}
          main={(
            <>
              <CatchWorkspaceHeader
                count={23}
                filters={{chips: [{label: "All", count: 23, selected: true}, {label: "Listings", count: 12}, {label: "Claims", count: 4}], search: {placeholder: "Search"}}}
                note="oldest 3 days"
                title="Inbox"
                views={{items: [{value: "waiting", label: "Waiting", count: 23}, {value: "done", label: "Done"}], value: "waiting"}}
              />
              <CatchText as="p" color="ink2" variant="bodyS">The queue's table goes here.</CatchText>
            </>
          )}
          pattern="queue"
        />
      </CatchViewport>
    </div>
  );
}

/** catch.viewport on the web: the quiet register (Admin) and the app register, on a desktop and a phone. */
export const Contract: Story = {
  render: () => (
    <div style={{display: "grid", gap: 24}}>
      <Shell register="quiet" size="expanded" />
      <Shell register="app" size="expanded" />
      <Shell register="quiet" size="compact" />
    </div>
  ),
};
