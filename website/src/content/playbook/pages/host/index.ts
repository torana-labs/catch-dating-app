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
};
