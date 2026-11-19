import {expect, fireEvent, within} from "storybook/test";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchCardGrid, CatchRoot} from "@catch/web-ui";
import {applyBrand} from "@content/brand";
import runClubs from "@content/playbook/pages/host/run-clubs.json";
import firstEvent from "@content/playbook/pages/host/first-event.json";
import programmes from "@content/playbook/pages/host/programmes.json";
import start from "@content/playbook/pages/host/start.json";
import switchPage from "@content/playbook/pages/host/switch.json";
import bookings from "@content/playbook/pages/product/bookings.json";
import event from "@content/playbook/pages/product/event.json";
import forms from "@content/playbook/pages/product/forms.json";
import guests from "@content/playbook/pages/product/guests.json";
import howItWorks from "@content/playbook/pages/product/how-it-works.json";
import messages from "@content/playbook/pages/product/messages.json";
import pricing from "@content/playbook/pages/product/pricing.json";
import reports from "@content/playbook/pages/product/reports.json";
import room from "@content/playbook/pages/product/room.json";
import yourPage from "@content/playbook/pages/product/your-page.json";
import about from "@content/playbook/pages/resources/about.json";
import app from "@content/playbook/pages/resources/app.json";
import playbookRunClub from "@content/playbook/pages/resources/playbook-run-club.json";
import playbooks from "@content/playbook/pages/resources/playbooks.json";
import stories from "@content/playbook/pages/resources/stories.json";
import noShowCalculator from "@content/playbook/pages/resources/tools-no-show-calculator.json";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {livePlaybookPage, validatedPlaybookPage, type PlaybookPageDocument} from "@content/playbook/playbookContract";
import {hostFeeCalculatorCopy} from "@content/pricing";
import {marketingCaptures} from "../app/marketingCaptures";
import {hostStoryCards} from "../features/marketing/hostStoryCards";
import {PlaybookPage} from "../features/playbook/PlaybookPage";
import {PageShell} from "../shared/site";
import {fixtureHostStories, fixtureHostStoryPage} from "./fixtures/hostStories";

const meta = {
  title: "Marketing Website/Playbook pages",
  parameters: {
    catchComponentRegistry: {
      path: "design/website/components.json",
    },
    catchRouteContract: {
      path: "design/website/routes.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// The page as the renderer gets it: validated, with its brand tokens resolved.
const runClubsPage = applyBrand(validatedPlaybookPage(runClubs));
const pricingPage = applyBrand(validatedPlaybookPage(pricing));
const aboutPage = applyBrand(validatedPlaybookPage(about));
const startPage = applyBrand(validatedPlaybookPage(start));
const firstEventPage = applyBrand(validatedPlaybookPage(firstEvent));
const switchPlaybookPage = applyBrand(validatedPlaybookPage(switchPage));
const programmesPage = applyBrand(validatedPlaybookPage(programmes));
// The product pages v2 as visitors get them: their live bands only (show-when-live).
const howItWorksPage = livePlaybookPage(applyBrand(validatedPlaybookPage(howItWorks)));
const yourPagePage = livePlaybookPage(applyBrand(validatedPlaybookPage(yourPage)));
const bookingsPage = livePlaybookPage(applyBrand(validatedPlaybookPage(bookings)));
const messagesPage = livePlaybookPage(applyBrand(validatedPlaybookPage(messages)));
const roomPage = livePlaybookPage(applyBrand(validatedPlaybookPage(room)));
const eventPage = livePlaybookPage(applyBrand(validatedPlaybookPage(event)));
const guestsPage = livePlaybookPage(applyBrand(validatedPlaybookPage(guests)));
const reportsPage = livePlaybookPage(applyBrand(validatedPlaybookPage(reports)));
const formsPage = livePlaybookPage(applyBrand(validatedPlaybookPage(forms)));

/** A playbook page at one of its board's widths: the bands' container queries read the frame. */
function PlaybookAt({width, page = runClubsPage}: {width: 390 | 1280; page?: PlaybookPageDocument}) {
  return (
    <div style={{margin: "0 auto", width}}>
      <PageShell pageClassName="home-page">
        <PlaybookPage captures={marketingCaptures} page={page} />
      </PageShell>
    </div>
  );
}

export const RunClubs: Story = {
  name: "/host/run-clubs/ · 1280",
  parameters: {
    catchRoute: {
      id: "host_run_clubs",
      path: "/host/run-clubs/",
      reviewStates: ["page"],
      stateCoverage: {
        storybook: ["page"],
        manual: [],
      },
    },
    catchComponent: {
      id: "route_playbook_page",
      routeIds: ["host_run_clubs"],
      states: ["run-clubs"],
    },
  },
  render: () => <PlaybookAt width={1280} />,
};

/** The PlaybookRunClubs phone board: every band stacks. */
export const RunClubs390: Story = {
  name: "/host/run-clubs/ · 390",
  parameters: {
    catchComponent: {
      id: "route_playbook_page",
      routeIds: ["host_run_clubs"],
      states: ["run-clubs"],
    },
  },
  render: () => <PlaybookAt width={390} />,
};

/** The PlaybookPricing board: the fee band with the calculator, the worked examples, the cap, what is included, the trial, organisations and the FAQ. */
export const Pricing: Story = {
  name: "/pricing/ · 1280",
  parameters: {
    catchRoute: {id: "pricing", path: "/pricing/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["pricing"], states: ["pricing"]},
  },
  render: () => <PlaybookAt page={pricingPage} width={1280} />,
};

/** The PlaybookPricing phone board: every band stacks. */
export const Pricing390: Story = {
  name: "/pricing/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["pricing"], states: ["pricing"]}},
  render: () => <PlaybookAt page={pricingPage} width={390} />,
};

/** The calculator at the cap: the fee stops at the cap for the month. */
export const PricingCapped: Story = {
  name: "/pricing/ · calculator at the cap",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["pricing"], states: ["pricing"]}},
  render: () => <PlaybookAt page={pricingPage} width={1280} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByRole("slider", {name: hostFeeCalculatorCopy.sales}), {target: {value: "500000"}});
    await expect(canvas.getByText(hostFeeCalculatorCopy.capped)).toBeInTheDocument();
  },
};

/** The PlaybookAbout board: the hero, why we built it, what we believe, the market’s cities, questions and the closing band. */
export const About: Story = {
  name: "/about/ · 1280",
  parameters: {
    catchRoute: {id: "about", path: "/about/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["about"], states: ["about"]},
  },
  render: () => <PlaybookAt page={aboutPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const About390: Story = {
  name: "/about/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["about"], states: ["about"]}},
  render: () => <PlaybookAt page={aboutPage} width={390} />,
};

/** The PlaybookStart board’s start state: menu-free, a QR code of the page and the host app’s store badges. */
export const HostStart: Story = {
  name: "/host/start/ · 1280",
  parameters: {
    catchRoute: {id: "host_start", path: "/host/start/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["host_start"], states: ["host-start"]},
  },
  render: () => <PlaybookAt page={startPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const HostStart390: Story = {
  name: "/host/start/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["host_start"], states: ["host-start"]}},
  render: () => <PlaybookAt page={startPage} width={390} />,
};

/** The PlaybookFirstEvent board: seven steps, the countdown, help on WhatsApp, formats, mistakes and questions. */
export const FirstEvent: Story = {
  name: "/host/first-event/ · 1280",
  parameters: {
    catchRoute: {id: "host_first_event", path: "/host/first-event/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["host_first_event"], states: ["first-event"]},
  },
  render: () => <PlaybookAt page={firstEventPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const FirstEvent390: Story = {
  name: "/host/first-event/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["host_first_event"], states: ["first-event"]}},
  render: () => <PlaybookAt page={firstEventPage} width={390} />,
};

/** The PlaybookSwitch board: what you are moving from as tabs, two ways to move, what comes with you and the first month. */
export const Switch: Story = {
  name: "/host/switch/ · 1280",
  parameters: {
    catchRoute: {id: "host_switch", path: "/host/switch/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["host_switch"], states: ["switch"]},
  },
  render: () => <PlaybookAt page={switchPlaybookPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const Switch390: Story = {
  name: "/host/switch/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["host_switch"], states: ["switch"]}},
  render: () => <PlaybookAt page={switchPlaybookPage} width={390} />,
};

/** The PlaybookProgrammes board, priced per programme after a walkthrough. */
export const Programmes: Story = {
  name: "/programmes/ · 1280",
  parameters: {
    catchRoute: {id: "programmes", path: "/programmes/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["programmes"], states: ["programmes"]},
  },
  render: () => <PlaybookAt page={programmesPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const Programmes390: Story = {
  name: "/programmes/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["programmes"], states: ["programmes"]}},
  render: () => <PlaybookAt page={programmesPage} width={390} />,
};

/** The ProductHowItWorks board: the seven feature groups and Forms, before, on and after the night, the loop and where to start. */
export const ProductHowItWorks: Story = {
  name: "/how-it-works/ · 1280",
  parameters: {
    catchRoute: {id: "how_it_works", path: "/how-it-works/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["how_it_works"], states: ["product-how-it-works"]},
  },
  render: () => <PlaybookAt page={howItWorksPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const ProductHowItWorks390: Story = {
  name: "/how-it-works/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["how_it_works"], states: ["product-how-it-works"]}},
  render: () => <PlaybookAt page={howItWorksPage} width={390} />,
};

/** The ProductYourPage board's live bands: the page, the owner's numbers, what's on it and claiming. */
export const ProductYourPage: Story = {
  name: "/product/your-page/ · 1280",
  parameters: {
    catchRoute: {id: "product_your_page", path: "/product/your-page/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["product_your_page"], states: ["product-your-page"]},
  },
  render: () => <PlaybookAt page={yourPagePage} width={1280} />,
};

/** The phone board: every band stacks. */
export const ProductYourPage390: Story = {
  name: "/product/your-page/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["product_your_page"], states: ["product-your-page"]}},
  render: () => <PlaybookAt page={yourPagePage} width={390} />,
};

/** The ProductBookings board's live bands: ways in, a balanced room, memberships and the checkout. */
export const ProductBookings: Story = {
  name: "/product/bookings-and-memberships/ · 1280",
  parameters: {
    catchRoute: {id: "product_bookings", path: "/product/bookings-and-memberships/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["product_bookings"], states: ["product-bookings"]},
  },
  render: () => <PlaybookAt page={bookingsPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const ProductBookings390: Story = {
  name: "/product/bookings-and-memberships/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["product_bookings"], states: ["product-bookings"]}},
  render: () => <PlaybookAt page={bookingsPage} width={390} />,
};

/** The ProductGrowth board's live bands: four ways to reach people, tracked links, invite links, messages and WhatsApp campaigns. */
export const ProductMessages: Story = {
  name: "/product/messages-and-growth/ · 1280",
  parameters: {
    catchRoute: {id: "product_messages", path: "/product/messages-and-growth/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["product_messages"], states: ["product-messages"]},
  },
  render: () => <PlaybookAt page={messagesPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const ProductMessages390: Story = {
  name: "/product/messages-and-growth/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["product_messages"], states: ["product-messages"]}},
  render: () => <PlaybookAt page={messagesPage} width={390} />,
};

/** The ProductRoom board's live bands: First Hello, groups by format, Help me say hi and the permission rules. */
export const ProductRoom: Story = {
  name: "/product/the-room/ · 1280",
  parameters: {
    catchRoute: {id: "product_room", path: "/product/the-room/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["product_room"], states: ["product-room"]},
  },
  render: () => <PlaybookAt page={roomPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const ProductRoom390: Story = {
  name: "/product/the-room/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["product_room"], states: ["product-room"]}},
  render: () => <PlaybookAt page={roomPage} width={390} />,
};

/** The ProductEvent board's live bands: the door, the live console, rehearsal, attendance and your team. */
export const ProductEvent: Story = {
  name: "/product/running-the-event/ · 1280",
  parameters: {
    catchRoute: {id: "product_event", path: "/product/running-the-event/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["product_event"], states: ["product-event"]},
  },
  render: () => <PlaybookAt page={eventPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const ProductEvent390: Story = {
  name: "/product/running-the-event/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["product_event"], states: ["product-event"]}},
  render: () => <PlaybookAt page={eventPage} width={390} />,
};

/** The ProductRecords board's live bands: groups with plain rules, one person's history, merges and privacy. */
export const ProductGuests: Story = {
  name: "/product/guest-records/ · 1280",
  parameters: {
    catchRoute: {id: "product_guests", path: "/product/guest-records/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["product_guests"], states: ["product-guests"]},
  },
  render: () => <PlaybookAt page={guestsPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const ProductGuests390: Story = {
  name: "/product/guest-records/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["product_guests"], states: ["product-guests"]}},
  render: () => <PlaybookAt page={guestsPage} width={390} />,
};

/** The ProductReports board's live bands: the report, payouts and the monthly bill. */
export const ProductReports: Story = {
  name: "/product/reports-and-payouts/ · 1280",
  parameters: {
    catchRoute: {id: "product_reports", path: "/product/reports-and-payouts/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["product_reports"], states: ["product-reports"]},
  },
  render: () => <PlaybookAt page={reportsPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const ProductReports390: Story = {
  name: "/product/reports-and-payouts/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["product_reports"], states: ["product-reports"]}},
  render: () => <PlaybookAt page={reportsPage} width={390} />,
};

/** The ProductForms board's live bands: kinds of form, templates, responses and form fees. */
export const ProductForms: Story = {
  name: "/product/forms/ · 1280",
  parameters: {
    catchRoute: {id: "product_forms", path: "/product/forms/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["product_forms"], states: ["product-forms"]},
  },
  render: () => <PlaybookAt page={formsPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const ProductForms390: Story = {
  name: "/product/forms/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["product_forms"], states: ["product-forms"]}},
  render: () => <PlaybookAt page={formsPage} width={390} />,
};

// Resources: the no-show calculator, the host playbooks, the guest app page, and the shelved stories pages with fictional fixtures.
// The pages as the renderer gets them: validated, with their brand tokens resolved.
const calculatorPage = applyBrand(validatedPlaybookPage(noShowCalculator));
const playbooksPage = applyBrand(validatedPlaybookPage(playbooks));
const runClubGuidePage = applyBrand(validatedPlaybookPage(playbookRunClub));
const appPage = applyBrand(validatedPlaybookPage(app));
const storiesPage = applyBrand(validatedPlaybookPage(stories));
const storyFixturePage = applyBrand(validatedPlaybookPage(fixtureHostStoryPage));


/** The PlaybookNoShow board: the hero, the calculator, the sums in plain words, what you can change and the closing band. */
export const NoShowCalculatorPage: Story = {
  name: "/tools/no-show-calculator/ · 1280",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["tools_no_show_calculator"], states: ["no-show-calculator"]}},
  render: () => <PlaybookAt page={calculatorPage} width={1280} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {level: 1, name: "What do empty places cost you?"})).toBeInTheDocument();
    await expect(canvas.getByRole("link", {name: "Book a walkthrough"})).toHaveAttribute("href", "/host/walkthrough/");
  },
};
/** The PlaybookNoShow390 board: the calculator's two columns stack. */
export const NoShowCalculatorPage390: Story = {
  name: "/tools/no-show-calculator/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["tools_no_show_calculator"], states: ["no-show-calculator"]}},
  render: () => <PlaybookAt page={calculatorPage} width={390} />,
};

/** The PlaybookPlaybooks board without its readership card and city band: the intro and one tile per guide. */
export const PlaybooksHub: Story = {
  name: "/playbooks/ · 1280",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["playbooks"], states: ["playbooks"]}},
  render: () => <PlaybookAt page={playbooksPage} width={1280} />,
};
export const PlaybooksHub390: Story = {
  name: "/playbooks/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["playbooks"], states: ["playbooks"]}},
  render: () => <PlaybookAt page={playbooksPage} width={390} />,
};

/** The PlaybookGuide board, city-neutral: the article with its contents, the pricing aside, keep reading and the closing band. */
export const RunClubGuide: Story = {
  name: "/playbooks/run-club/ · 1280",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["playbook_guide"], states: ["playbook-guide"]}},
  render: () => <PlaybookAt page={runClubGuidePage} width={1280} />,
};
export const RunClubGuide390: Story = {
  name: "/playbooks/run-club/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["playbook_guide"], states: ["playbook-guide"]}},
  render: () => <PlaybookAt page={runClubGuidePage} width={390} />,
};

/** The PlaybookStart board's app state: the guest app is coming, with the homepage's launch notice. */
export const AppPage: Story = {
  name: "/app/ · 1280",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["app_notify"], states: ["app"]}},
  render: () => <PlaybookAt page={appPage} width={1280} />,
};
export const AppPage390: Story = {
  name: "/app/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["app_notify"], states: ["app"]}},
  render: () => <PlaybookAt page={appPage} width={390} />,
};

/**
 * /stories/ is shelved (not served) until real stories exist. This is its
 * stories band with fictional fixture stories, then the rest of the page;
 * the shipped page draws no story and does not render without real ones.
 */
export const StoriesShelvedWithFixtures: Story = {
  name: "/stories/ · shelved · fictional stories",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["stories"], states: ["stories-fixture"]}},
  render: () => {
    const band = storiesPage.sections.find((section) => section.type === "cards");
    return (
      <div style={{margin: "0 auto", width: 1280}}>
        <CatchRoot theme="day">
          <CatchCardGrid columns={3} id="stories" items={hostStoryCards(fixtureHostStories, playbookCopy.storyFigure)} kicker={band?.kicker}
            kind="story" lead={band?.lead} level={2} title={band?.title} />
        </CatchRoot>
        <PageShell pageClassName="home-page">
          <PlaybookPage captures={marketingCaptures} page={{...storiesPage, sections: storiesPage.sections.filter((section) => section.type !== "cards")}} />
        </PageShell>
      </div>
    );
  },
};

/** A fictional story page (story_detail), the template a real story fills: never registered, Storybook only. */
export const StoryPageFixture: Story = {
  name: "/stories/<slug>/ · fictional story",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["story_detail"], states: ["story-fixture"]}},
  render: () => <PlaybookAt page={storyFixturePage} width={1280} />,
};
