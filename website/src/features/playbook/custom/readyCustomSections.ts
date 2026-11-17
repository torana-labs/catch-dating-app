import type {playbookCustomComponents} from "../../../content/playbook/playbookContract.ts";

export type PlaybookCustomComponent = (typeof playbookCustomComponents)[number];

/**
 * The custom section components that exist. A page naming one not listed
 * here is not rendered (it 404s, like a page with a section no kit component
 * draws). The PR that builds a component adds its key here and the component
 * to ./customSections.tsx; the types fail if the two disagree.
 */
export const readyPlaybookCustomComponents = ["pricingCalculator", "pricingExamples", "pricingCap", "pricingIncluded", "pricingOrganisations"] as const satisfies readonly PlaybookCustomComponent[];
export type ReadyPlaybookCustomComponent = (typeof readyPlaybookCustomComponents)[number];
