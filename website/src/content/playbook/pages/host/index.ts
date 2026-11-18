import type {PlaybookPageIndex} from "../../playbookContract.ts";

/**
 * Organiser types under /host/<segment>/, and the host's ways in under /host/ (start, walkthrough, first event and its plans, switch) with /programmes/.
 *
 * This section's page index: one entry per page, keyed by its content key
 * (the route id, or for a family page the route id and its parameters joined
 * with `/`). A section PR adds its JSON files beside this index and their
 * entries here, and touches nothing else. Every route is already registered
 * in features/playbook/playbookRoutes.ts and design/website/routes.json.
 */
export const hostPlaybookPages: PlaybookPageIndex = {
  host_run_clubs: {file: "run-clubs.json", load: () => import("./run-clubs.json")},
  host_racket_sports: {file: "racket-sports.json", load: () => import("./racket-sports.json")},
  host_supper_clubs: {file: "supper-clubs.json", load: () => import("./supper-clubs.json")},
  host_quiz_nights: {file: "quiz-nights.json", load: () => import("./quiz-nights.json")},
  host_venues: {file: "venues.json", load: () => import("./venues.json")},
  host_studios: {file: "studios.json", load: () => import("./studios.json")},
  host_nightlife: {file: "nightlife.json", load: () => import("./nightlife.json")},
  host_workshops: {file: "workshops.json", load: () => import("./workshops.json")},
  host_communities: {file: "communities.json", load: () => import("./communities.json")},
  host_creators: {file: "creators.json", load: () => import("./creators.json")},
  host_teams: {file: "teams.json", load: () => import("./teams.json")},
  host_outdoors: {file: "outdoors.json", load: () => import("./outdoors.json")},
  host_facilities: {file: "facilities.json", load: () => import("./facilities.json")},
  host_colleges: {file: "colleges.json", load: () => import("./colleges.json")},
  host_brands: {file: "brands.json", load: () => import("./brands.json")},
  host_walkthrough: {file: "walkthrough.json", load: () => import("./walkthrough.json")},
};
