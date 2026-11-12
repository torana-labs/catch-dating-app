import {sampleCityInterest} from "../features/cityInterest/api/cityInterestRepository";
import {CityInterestScreen} from "../features/cityInterest/ui/CityInterestScreen";
import type {Meta, StoryObj} from "@storybook/react-vite";

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

export const CityInterestRouteStory: Story = {
  name: "Interest by city",
  parameters: {
    catchComponent: {
      id: "route_city_interest",
      states: ["by-city", "trends"],
    },
  },
  render: () => <CityInterestScreen controller={{data: sampleCityInterest(), loadState: "ready", loadError: null}} />,
};
