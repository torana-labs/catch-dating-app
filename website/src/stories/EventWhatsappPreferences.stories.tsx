import {EventSenderPreferencesCard} from "../features/eventMessaging/EventSenderPreferencesCard";
import {useState} from "react";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {EventWhatsappPreferencesCard} from "../features/eventMessaging/EventWhatsappPreferencesPanel";
import {whatsappPreferenceFixture, whatsappEnabledFixture} from "./fixtures/whatsappPreferences";
import type {WhatsappPreferenceState} from "../features/eventMessaging/whatsappPreferenceModel";
import {eventWhatsappMessagingCopy as copy} from "../content/eventMessaging";
import {EventRuntimeFrame, EventRuntimePanel} from "../shared/ui/primitives";
import {demoEventName, demoOrganizerName} from "./fixtures/demoWorld";

const meta = {title: "Marketing Website/Event WhatsApp preferences",
  parameters: {catchComponentRegistry: {path: "design/website/components.json"}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
// The organiser's own WhatsApp sender is the world's organiser.
const organizerSender = {...whatsappPreferenceFixture.view.sender!, displayName: demoOrganizerName};
const ready: Extract<WhatsappPreferenceState, {kind: "ready"}> = {kind: "ready",
  view: {...whatsappPreferenceFixture.view, sender: organizerSender}, earlier: false, pending: false, uncertain: false, notice: ""};
const enabledView = {...whatsappEnabledFixture.view, sender: organizerSender};

export const Offer: Story = {
  parameters: {catchComponent: {id: "event_whatsapp_preferences_card",
    routeIds: ["event_runtime", "event_detail_canonical", "event_invite"],
    states: ["offer", "enabled", "earlier", "unavailable", "uncertain", "loading", "error"]}},
  render: () => <Preview initial={ready} />,
};
export const Enabled: Story = {render: () => <Preview initial={{...ready, view: enabledView}} />};
export const Earlier: Story = {render: () => <Preview initial={{...ready, earlier: true,
  view: {...enabledView, sender: {...organizerSender, displayName: "Catch Socials", displayPhoneNumber: "+91 77777 77777"}}}} />};
export const Uncertain: Story = {render: () => <Preview initial={{...ready, uncertain: true, notice: copy.uncertain}} />};
export const Unavailable: Story = {render: () => <Preview initial={{...ready, view: {...ready.view,
  canEnable: false, availability: "senderUnavailable"}}} />};
export const Loading: Story = {render: () => <Preview initial={{kind: "loading"}} />};
export const Error: Story = {render: () => <Preview initial={{kind: "error"}} />};

export const SharedPreference: Story = {
  parameters: {catchComponent: {id: "event_sender_preferences_card",
    routeIds: ["event_runtime", "event_detail_canonical", "event_invite"],
    states: ["offer", "enabled", "earlier", "unavailable", "uncertain", "loading", "error"]}},
  render: () => <Preview initial={ready} shared />,
};

function Preview({initial, shared = false}: {initial: WhatsappPreferenceState; shared?: boolean}) {
  const [state, setState] = useState(initial);
  const earlier = state.kind === "ready" && state.earlier;
  const save = (on: boolean) => setState({...ready, earlier, view: {
    ...(state.kind === "ready" ? state.view : ready.view),
    preference: on ? "enabled" : "disabled", revision: 1}, notice: on ? copy.savedOn : copy.savedOff});
  const Card = shared ? EventSenderPreferencesCard : EventWhatsappPreferencesCard;
  return <EventRuntimeFrame brandLabel="Catch events" brandWord="Catch">
    <EventRuntimePanel kicker={demoEventName} title="You’re registered"
      body="Your place on the guest list is confirmed.">
      <Card copy={copy} unavailableText={copy.unavailable} state={state} navigation={{earlier,
        showEarlier: !earlier, showCurrent: earlier, showPrevious: false, showNext: false,
        busy: state.kind === "ready" && (state.pending || state.uncertain)}}
        enable={() => save(true)} disable={() => save(false)} retry={() => save(true)}
        refresh={() => setState(ready)} current={() => setState(ready)}
        manageEarlier={() => setState({...ready, earlier: true, view: {...enabledView,
          sender: {...organizerSender, displayName: "Catch Socials", displayPhoneNumber: "+91 77777 77777"}}})}
        next={async () => undefined} previous={() => undefined} />
    </EventRuntimePanel>
  </EventRuntimeFrame>;
}
