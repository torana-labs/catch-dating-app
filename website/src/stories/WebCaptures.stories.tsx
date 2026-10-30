import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchField, CatchGap} from "@catch/web-ui";
import {eventRuntimeCopy} from "../content/eventRuntime";
import {PageShell} from "../shared/site/PageShell";
import {Button} from "../shared/ui/primitives/actions";
import {EventRuntimeFrame, EventRuntimePanel} from "../shared/ui/primitives/eventRuntime";
import {Form} from "../shared/ui/primitives/forms";
import {demoEventName} from "./fixtures/demoWorld";

// Guest pages as the marketing site shows them, in iPhone Safari
// (tool/marketing/capture_manifest.json, kind web-capture). Each story imports
// only what its page draws, so a website change elsewhere doesn't re-render it.
const meta = {
  title: "Marketing Website/Web captures",
  parameters: {layout: "fullscreen"},
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** /join/: a booked guest checks in with their phone number, no app needed. */
export const JoinPhoneCheckIn: Story = {
  render: () => (
    <PageShell pageClassName="event-runtime-page">
      <EventRuntimeFrame brandLabel={eventRuntimeCopy.brand} brandWord={eventRuntimeCopy.brandWord} eventTitle={demoEventName}>
        <EventRuntimePanel body={eventRuntimeCopy.phoneBody} kicker={eventRuntimeCopy.phoneKicker} title={eventRuntimeCopy.phoneTitle}>
          <Form onSubmit={(event) => event.preventDefault()}><CatchGap size="formField">
            <CatchField recipe="input" id="web-capture-join-phone" title={eventRuntimeCopy.phoneLabel}
              inputHint={eventRuntimeCopy.phonePlaceholder} keyboardType="phone" />
            <Button type="submit">{eventRuntimeCopy.sendCode}</Button>
          </CatchGap></Form>
        </EventRuntimePanel>
      </EventRuntimeFrame>
    </PageShell>
  ),
};
