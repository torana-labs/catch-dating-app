import {PeopleScreen} from "../features/people/ui/PeopleScreen";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {noop} from "./adminRouteStoryKit";

const meta = {
  title: "Admin Dashboard/Routes",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const storyPeople = [
  {uid: "user_829", name: "Arjun M.", phone: "+91 ••••• 41120", city: "Mumbai", deleted: false},
  {uid: "user_830", name: "Arjun K.", phone: "+91 ••••• 22301", city: "Pune", deleted: false},
];

export const PeopleRouteStory: Story = {
  name: "People",
  parameters: {
    catchComponent: {id: "route_people", states: ["search-results", "person"]},
  },
  render: () => (
    <PeopleScreen
      onOpenSafety={noop}
      search={{
        draft: "Arjun", submitted: "Arjun", loadState: "ready",
        result: {kind: "name", rows: storyPeople}, rows: storyPeople,
        selected: storyPeople[0], setDraft: noop, search: noop, select: noop,
      }}
    />
  ),
};
