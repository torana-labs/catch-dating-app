import type {ComponentType} from "react";
import type {PlaybookSectionOf} from "../../../content/playbook/playbookContract";
import type {CaptureSlots} from "../../../shared/media/captureSlot";
import {PricingFeeCalculator} from "../../marketing/PricingFeeCalculator";
import {PricingCapBand, PricingExamplesBand, PricingFeeBand, PricingIncludedBand, PricingOrganisationsBand} from "../../marketing/PricingBands";
import type {PlaybookPageController} from "../usePlaybookPageController";
import type {ReadyPlaybookCustomComponent} from "./readyCustomSections";

/**
 * What a custom section component gets: the section it sits in (a custom
 * section, or the pricing section whose calculator slot it fills), its words
 * by key, and the page's controller and captures.
 */
export interface PlaybookCustomSectionProps {
  readonly section: PlaybookSectionOf<"custom"> | PlaybookSectionOf<"pricing">;
  readonly labels: Readonly<Record<string, string>>;
  readonly controller: PlaybookPageController;
  readonly captures: CaptureSlots;
}

/**
 * /pricing/'s fee band (pricingCalculator): the page headline over the rate,
 * how the fee works and the calculator, all from the shared fee model, with
 * the trial and WhatsApp actions from its labels. In a pricing section's
 * calculator slot it is the calculator alone.
 */
function PricingCalculatorSection({section, labels, controller}: PlaybookCustomSectionProps) {
  if (section.type !== "custom") return <PricingFeeCalculator />;
  const actions = controller.actions([
    {label: labels.start, to: {route: "host_start"}, emphasis: "primary"},
    {label: labels.talk, to: {kind: "whatsapp", message: labels.talkMessage}, emphasis: "secondary"},
  ], section.id);
  return <PricingFeeBand actions={actions ?? []} id={section.id} kicker={section.kicker ?? ""} title={section.pageTitle ? section.title : undefined} />;
}

/** /pricing/'s cap band (pricingCap): its words beside the cap chart the fee model works out. */
function PricingCapSection({section}: PlaybookCustomSectionProps) {
  if (section.type !== "custom" || !section.title) return null;
  return <PricingCapBand ground={section.ground} id={section.id} kicker={section.kicker} lead={section.lead} title={section.title} />;
}

/** /pricing/'s "Included" band (pricingIncluded): every label but `label` (the group's name) is a feature tag, in page order. */
function PricingIncludedSection({section, labels}: PlaybookCustomSectionProps) {
  if (section.type !== "custom" || !section.title) return null;
  const items = (section.labels ?? []).filter((item) => item.key !== "label").map((item) => item.text);
  return <PricingIncludedBand ground={section.ground} id={section.id} items={items} kicker={section.kicker} label={labels.label ?? section.title} lead={section.lead} title={section.title} />;
}

/** /pricing/'s worked examples (pricingExamples): its header over the fee on six kinds of night, from the fee model, with the foot line from its labels. */
function PricingExamplesSection({section, labels}: PlaybookCustomSectionProps) {
  if (section.type !== "custom" || !section.title) return null;
  return <PricingExamplesBand foot={labels.foot} ground={section.ground} id={section.id} kicker={section.kicker} title={section.title} />;
}

/** /pricing/'s organisations band (pricingOrganisations): its words beside a walkthrough on WhatsApp and the weddings page. */
function PricingOrganisationsSection({section, labels, controller}: PlaybookCustomSectionProps) {
  if (section.type !== "custom" || !section.title) return null;
  const actions = controller.actions([
    {label: labels.walkthrough, to: {kind: "whatsapp", message: labels.walkthroughMessage}, emphasis: "primary"},
    {label: labels.weddings, to: {route: "weddings"}, emphasis: "secondary"},
  ], section.id) ?? [];
  return <PricingOrganisationsBand actions={actions} ground={section.ground} id={section.id} kicker={section.kicker} lead={section.lead} title={section.title} />;
}

/**
 * The closed registry of custom section components, by the key a page names
 * (`"component": "noShowCalculator"`, or a pricing section's
 * `"calculator": "pricingCalculator"`). Each is added with its own PR, beside
 * its key in ./readyCustomSections.ts.
 */
export const playbookCustomSections: {readonly [K in ReadyPlaybookCustomComponent]: ComponentType<PlaybookCustomSectionProps>} = {
  pricingCalculator: PricingCalculatorSection,
  pricingExamples: PricingExamplesSection,
  pricingCap: PricingCapSection,
  pricingIncluded: PricingIncludedSection,
  pricingOrganisations: PricingOrganisationsSection,
};
