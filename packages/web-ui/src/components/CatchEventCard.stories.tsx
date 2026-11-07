import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {CatchEventCard, catchEventCardStatuses} from "./CatchEventCard";
import {CatchRail} from "./CatchRail";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {title: "Web UI/CatchEventCard", component: CatchEventCard, args: {title: "Tuesday Trivia Night", format: "games"}} satisfies Meta<typeof CatchEventCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const people = [{name: "Asha Rao"}, {name: "Kabir Mehta"}, {name: "Neha Iyer"}, {name: "Rohan Das"}, {name: "Zara Khan"}];
const photo = "/assets/marketing/home-dinner.jpg";

function State({label, children}: {label: string; children: ReactNode}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone="secondary" variant="label-kicker">{label}</CatchText>
      {children}
    </CatchStack>
  );
}

/** catch.event_card: the poster with and without counts and faces, cover with and without a photo, compact in a rail, external, and the statuses. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="plain" padding="lg">
        <CatchStack gap={32}>
          <CatchStack direction="row" equal gap={16}>
            <State label="poster"><CatchEventCard format="games" formatLabel="Trivia" href="#" title="Tuesday Trivia Night" when="Tonight · doors 7:30" place="Harbour Room, Bandra West" /></State>
            <State label="poster-counts-people">
              <CatchEventCard counts={[{value: 26, label: "booked"}, {value: 4, label: "tables"}]} format="run" formatLabel="Social run" href="#"
                people={people} peopleTotal={26} place="Carter Road jetty" title="Carter Road Social Run" when="Sun 6:30 AM" />
            </State>
          </CatchStack>
          <CatchStack direction="row" equal gap={16}>
            <State label="cover"><CatchEventCard flag="Sold out" format="dinner" href="#" imageUrl={photo} place="Khar Table · Khar West" price="₹1,800" title="Strangers’ Supper" variant="cover" when="Thu 8:30 PM" /></State>
            <State label="cover-no-photo"><CatchEventCard format="nightsOut" formatLabel="Nights out" href="#" place="Four stops in Bandra" price="₹999" title="Friday Bandra Pub Crawl" variant="cover" when="Fri 7:30 PM" /></State>
            <State label="external"><CatchEventCard format="courts" formatLabel="Pickleball" href="#" place="Andheri West" source="Luma" title="Pickleball Social" variant="external" when="Sat 5:00 PM" /></State>
          </CatchStack>
          <State label="compact">
            <CatchRail itemWidth={240} label="This week" wrap="always">
              <CatchEventCard format="games" formatLabel="Games and quizzes" href="#" place="The Quizzicals · Khar Social" price="Free · 6 left" title="Thursday Evening Pub Quiz" variant="compact" when="Thu 7:30 PM" />
              <CatchEventCard format="run" formatLabel="Run clubs" href="#" place="Carter Road Runners · Carter Road, Bandra" price="Free · 9 left" title="Carter Road Social Run" variant="compact" when="Fri 6:30 AM" />
              <CatchEventCard format="dinner" href="#" imageUrl={photo} people={people} place="Khar Table · Khar West" price="₹1,800 · 2 left" title="Strangers’ Supper" variant="compact" when="Thu 8:30 PM" />
            </CatchRail>
          </State>
          <State label="statuses">
            <CatchStack direction="row" gap={16} wrap>
              {catchEventCardStatuses.map((status) => <CatchEventCard format="games" formatLabel={status} key={status} status={status} title="Saturday Game Night" variant="compact" when="Sat 6:30 PM" />)}
            </CatchStack>
          </State>
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};
