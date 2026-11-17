import type {PlaybookPageIndex} from "../../playbookContract.ts";

/**
 * Stories, playbooks, comparisons, tools, ad landing pages, safety, about, refer, the public demo night and the guest app notice.
 *
 * This section's page index: one entry per page, keyed by its content key
 * (the route id, or for a family page the route id and its parameters joined
 * with `/`). A section PR adds its JSON files beside this index and their
 * entries here, and touches nothing else. Every route is already registered
 * in features/playbook/playbookRoutes.ts and design/website/routes.json.
 */
export const resourcesPlaybookPages: PlaybookPageIndex = {
};
