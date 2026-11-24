import type {Meta, StoryObj} from "@storybook/react-vite";
import {useEffect, type ReactNode} from "react";
import {MemoryRouter} from "react-router";
import {ExplorePage} from "../features/home/ExplorePage";
import {mumbaiLiveCatalog} from "./fixtures/homeCatalogs";

// The city's What's on page as the marketing site's WhatsApp bands show it,
// in iPhone Safari (tool/marketing/capture_manifest.json, guest-web-whats-on).
// Its own file, so the Explore page's imports don't re-render the other web
// captures. It passes no capture slots: the page never shows itself.
const meta = {
  title: "Marketing Website/Web captures/Whats on",
  parameters: {layout: "fullscreen"},
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Scrolls the page to its plans, as a guest does after the heading and the
 * filters: the search field at the top of the screen, inside the filters'
 * 12px gap so no pill shows above it, then the count and the cards. It waits
 * for the fonts, which set the height of everything above.
 */
function ScrolledToPlans({children}: {children: ReactNode}) {
  useEffect(() => {
    void document.fonts.ready.then(() => {
      const search = document.querySelector("#explore-results input[type=\"search\"]")?.parentElement;
      if (search) window.scrollTo(0, search.getBoundingClientRect().top + window.scrollY - 10);
    });
  }, []);
  return children;
}

/** /mumbai/: the synthetic Mumbai fortnight of plans, nearest first, as a guest opens it from a WhatsApp link and scrolls. */
export const MumbaiPlans: Story = {
  render: () => (
    <MemoryRouter initialEntries={["/mumbai/"]}>
      <ScrolledToPlans><ExplorePage catalog={mumbaiLiveCatalog} /></ScrolledToPlans>
    </MemoryRouter>
  ),
};
