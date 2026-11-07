import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import {CatchTicket, type CatchTicketProps} from "./CatchTicket";

const ticket: CatchTicketProps = {
  title: "Tuesday Trivia Night",
  format: "games",
  organiser: "Lantern Lane Social",
  formatLabel: "Trivia",
  facts: [{label: "When", value: "Tue 3 Nov"}, {label: "Doors", value: "7:30 PM"}, {label: "Places", value: "2"}],
  code: "CATCH-7KQ2",
  guest: "Tara Menon",
};

const meta = {title: "Web UI/CatchTicket", component: CatchTicket, args: ticket} satisfies Meta<typeof CatchTicket>;

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

/** catch.ticket: valid, without a code, used, refunded, and on night. */
export const Contract: Story = {
  render: () => (
    <CatchStack gap={0}>
      <CatchRoot size="expanded" theme="day">
        <CatchSurface block="plain" padding="lg">
          <CatchStack direction="row" equal gap={24}>
            <State label="valid"><CatchTicket {...ticket} /></State>
            <State label="no-code"><CatchTicket {...ticket} code={undefined} /></State>
            <State label="used"><CatchTicket {...ticket} status="used" /></State>
            <State label="refunded"><CatchTicket {...ticket} format="run" status="refunded" /></State>
          </CatchStack>
        </CatchSurface>
      </CatchRoot>
      <CatchRoot size="expanded" theme="night">
        <CatchSurface block="plain" padding="lg">
          <State label="night"><div style={{maxWidth: 360}}><CatchTicket {...ticket} format="nightsOut" /></div></State>
        </CatchSurface>
      </CatchRoot>
    </CatchStack>
  ),
};
