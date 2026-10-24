import {useState} from "react";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {EventRcsPreferencesCard} from "../features/eventMessaging/EventRcsPreferencesPanel";
import {rcsPreferenceFixture, rcsEnabledFixture} from "./fixtures/rcsPreferences";
import type {RcsPreferenceState} from "../features/eventMessaging/rcsPreferenceModel";
import {eventRcsMessagingCopy as copy} from "../content/eventMessaging";
import {EventRuntimeFrame, EventRuntimePanel} from "../shared/ui/primitives";
import {demoEventName} from "./fixtures/demoWorld";

const meta = {title: "Marketing Website/Event RCS preferences",
  parameters: {catchComponentRegistry: {path: "design/website/components.json"}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const ready: Extract<RcsPreferenceState, {kind: "ready"}> = {kind: "ready",
  view: {...rcsPreferenceFixture.view, eventTitle: demoEventName}, earlier: false, pending: false, uncertain: false, notice: ""};
const enabledView = {...rcsEnabledFixture.view, eventTitle: demoEventName};

export const Offer: Story = {
  parameters: {catchComponent: {id: "event_rcs_preferences_card",
    routeIds: ["event_runtime", "event_detail_canonical", "event_invite"],
    states: ["offer", "enabled", "earlier", "unavailable", "uncertain", "loading", "error"]}},
  render: () => <Preview initial={ready} />,
};
export const Enabled: Story = {render: () => <Preview initial={{...ready, view: enabledView}} />};
export const Earlier: Story = {render: () => <Preview initial={{...ready, earlier: true,
  view: {...enabledView, sender: {displayName: "Catch Socials"}}}} />};
export const Uncertain: Story = {render: () => <Preview initial={{...ready, uncertain: true, notice: copy.uncertain}} />};
export const Unavailable: Story = {render: () => <Preview initial={{...ready, view: {...ready.view,
  canEnable: false, availability: "subscriptionUnavailable"}}} />};
export const Loading: Story = {render: () => <Preview initial={{kind: "loading"}} />};
export const Error: Story = {render: () => <Preview initial={{kind: "error"}} />};

function Preview({initial}: {initial: RcsPreferenceState}) {
  const [state, setState] = useState(initial);
  const earlier = state.kind === "ready" && state.earlier;
  const save = (on: boolean) => setState({...ready, earlier, view: {
    ...(state.kind === "ready" ? state.view : ready.view),
    preference: on ? "enabled" : "disabled", revision: 1}, notice: on ? copy.savedOn : copy.savedOff});
  return <EventRuntimeFrame brandLabel="Catch events" brandWord="Catch">
    <EventRuntimePanel kicker={demoEventName} title="You’re registered"
      body="Your place on the guest list is confirmed.">
      <EventRcsPreferencesCard state={state} navigation={{earlier,
        showEarlier: !earlier, showCurrent: earlier, showPrevious: false, showNext: false,
        busy: state.kind === "ready" && (state.pending || state.uncertain)}}
        enable={() => save(true)} disable={() => save(false)} retry={() => save(true)}
        refresh={() => setState(ready)} current={() => setState(ready)}
        manageEarlier={() => setState({...ready, earlier: true, view: {...enabledView,
          sender: {displayName: "Catch Socials"}}})}
        next={async () => undefined} previous={() => undefined} />
    </EventRuntimePanel>
  </EventRuntimeFrame>;
}
