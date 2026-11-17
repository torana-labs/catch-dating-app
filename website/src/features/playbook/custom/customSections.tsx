import type {ComponentType} from "react";
import type {PlaybookSectionOf} from "../../../content/playbook/playbookContract";
import type {CaptureSlots} from "../../../shared/media/captureSlot";
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
 * The closed registry of custom section components, by the key a page names
 * (`"component": "noShowCalculator"`, or a pricing section's
 * `"calculator": "pricingCalculator"`): the no-show calculator, the event
 * page from a link form, the walkthrough time slots and the pricing
 * calculator. Each is added with its own PR, beside its key in
 * ./readyCustomSections.ts.
 */
export const playbookCustomSections: {readonly [K in ReadyPlaybookCustomComponent]: ComponentType<PlaybookCustomSectionProps>} = {};
