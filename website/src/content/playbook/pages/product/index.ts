import type {PlaybookPageIndex} from "../../playbookContract.ts";

/**
 * How it works, the product pages under /product/, and /pricing/.
 *
 * This section's page index: one entry per page, keyed by its content key
 * (the route id, or for a family page the route id and its parameters joined
 * with `/`). A section PR adds its JSON files beside this index and their
 * entries here, and touches nothing else. Every route is already registered
 * in features/playbook/playbookRoutes.ts and design/website/routes.json.
 */
export const productPlaybookPages: PlaybookPageIndex = {
  how_it_works: {file: "how-it-works.json", load: () => import("./how-it-works.json")},
  product_night: {file: "night.json", load: () => import("./night.json")},
  product_bookings: {file: "bookings.json", load: () => import("./bookings.json")},
  product_your_page: {file: "your-page.json", load: () => import("./your-page.json")},
  product_door: {file: "door.json", load: () => import("./door.json")},
  product_messages: {file: "messages.json", load: () => import("./messages.json")},
  product_guests: {file: "guests.json", load: () => import("./guests.json")},
  product_forms: {file: "forms.json", load: () => import("./forms.json")},
  product_reports: {file: "reports.json", load: () => import("./reports.json")},
  pricing: {file: "pricing.json", load: () => import("./pricing.json")},
};
