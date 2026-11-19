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
  safety: {file: "safety.json", load: () => import("./safety.json")},
  host_demo: {file: "host-demo.json", load: () => import("./host-demo.json")},
  about: {file: "about.json", load: () => import("./about.json")},
  app_notify: {file: "app.json", load: () => import("./app.json")},
  tools_no_show_calculator: {file: "tools-no-show-calculator.json", load: () => import("./tools-no-show-calculator.json")},
  playbooks: {file: "playbooks.json", load: () => import("./playbooks.json")},
  "playbook_guide/run-club": {file: "playbook-run-club.json", load: () => import("./playbook-run-club.json")},
  "playbook_guide/supper-club": {file: "playbook-supper-club.json", load: () => import("./playbook-supper-club.json")},
  "playbook_guide/quiz-night": {file: "playbook-quiz-night.json", load: () => import("./playbook-quiz-night.json")},
  "playbook_guide/racket-sports": {file: "playbook-racket-sports.json", load: () => import("./playbook-racket-sports.json")},
};

/**
 * Pages that are written but shelved: validated by the content tests, never
 * served. No route resolves them, so they 404 and stay out of the static
 * heads and both sitemaps. Switching one on is moving its entry into the
 * index above (docs/marketing_website_architecture.md, Shelved pages).
 * /stories/ waits for real host stories (content/stories/README.md): its
 * cards band draws nothing until content/stories/hostStories.ts has some.
 */
export const shelvedResourcesPlaybookPages: PlaybookPageIndex = {
  stories: {file: "stories.json", load: () => import("./stories.json")},
};
