import {forwardRef} from "react";
import type {ComponentProps} from "react";
import {PlainButton} from "./actionControls";

export function HostLanding(props: ComponentProps<"div">) { return <div {...props} className="consumer-home host-landing" />; }
export function HostLandingHero(props: ComponentProps<"section">) { return <section {...props} className="host-landing-hero" />; }
export function HostLandingHeroCopy(props: ComponentProps<"div">) { return <div {...props} className="host-landing-hero__copy" />; }
export function HostLandingMedia(props: ComponentProps<"div">) { return <div {...props} className="host-landing-media" />; }
export function HostLandingPhotoMessage(props: ComponentProps<"div">) { return <div {...props} className="host-landing-photo-message" />; }
export function HostLandingSection({variant, ...props}: ComponentProps<"section"> & {variant?: "formats" | "insights" | "adoption" | "participation" | "close" | "faq" | "apply"}) { return <section {...props} className={`host-landing-section${variant ? ` host-landing-section--${variant}` : ""}`} />; }
export function HostLandingHeading(props: ComponentProps<"div">) { return <div {...props} className="host-landing-heading" />; }
export function HostLandingNote(props: ComponentProps<"p">) { return <p {...props} className="host-landing-note" />; }
export function HostLandingActions(props: ComponentProps<"div">) { return <div {...props} className="host-landing-actions" />; }
export function HostLandingBenefits(props: ComponentProps<"div">) { return <div {...props} className="host-landing-benefits" />; }
export function HostLandingBenefit(props: ComponentProps<"article">) { return <article {...props} className="host-landing-benefit" />; }
export function HostLandingWorkflow(props: ComponentProps<"div">) { return <div {...props} className="host-landing-workflow" />; }
export function HostLandingPrompt(props: ComponentProps<"div">) { return <div {...props} className="host-landing-prompt" />; }
export function HostFormatTabs(props: ComponentProps<"div">) { return <div {...props} className="host-format-tabs" />; }
export const HostFormatTab = forwardRef<HTMLButtonElement, ComponentProps<typeof PlainButton>>(function HostFormatTab(props, ref) { return <PlainButton {...props} ref={ref} className="host-format-tab" />; });
export function HostFormatPanel(props: ComponentProps<"div">) { return <div {...props} className="host-format-panel" />; }
export function HostFormatStages(props: ComponentProps<"div">) { return <div {...props} className="host-format-stages" />; }
export function HostFormatStage(props: ComponentProps<"article">) { return <article {...props} className="host-format-stage" />; }
export function HostFormatStageCopy(props: ComponentProps<"div">) { return <div {...props} className="host-format-stage__copy" />; }
export function HostFormatStageLabel(props: ComponentProps<"span">) { return <span {...props} className="host-format-stage__label" />; }
export function HostFormatPhone(props: ComponentProps<"div">) { return <div {...props} className="host-format-phone" />; }
export function HostFormatHighlight(props: ComponentProps<"div">) { return <div {...props} className="host-format-highlight" />; }
export function HostFormatStatus(props: ComponentProps<"p">) { return <p {...props} className="host-format-status" />; }
export function HostFormatConnection(props: ComponentProps<"p">) { return <p {...props} className="host-format-connection" />; }
export function HostInsightGrid(props: ComponentProps<"div">) { return <div {...props} className="host-insight-grid" />; }
export function HostInsightExample(props: ComponentProps<"div">) { return <div {...props} className="host-insight-example" />; }
export function HostLandingSteps(props: ComponentProps<"ol">) { return <ol {...props} className="host-landing-steps" />; }
export function HostLandingDetails(props: ComponentProps<"details">) { return <details {...props} className="host-landing-details" />; }
export function HostLandingCloseGrid(props: ComponentProps<"div">) { return <div {...props} className="host-landing-close-grid" />; }

export function HostSectionNav(props: ComponentProps<"nav">) { return <nav {...props} className="host-section-nav" />; }
export function HostParticipationGrid(props: ComponentProps<"div">) { return <div {...props} className="host-participation-grid" />; }
export function HostPrivacyCopy(props: ComponentProps<"div">) { return <div {...props} className="host-privacy-copy" />; }
export function HostAdoptionLayout(props: ComponentProps<"div">) { return <div {...props} className="host-adoption-layout" />; }
export function HostAdoptionCircles(props: ComponentProps<"div">) { return <div {...props} className="host-adoption-circles" />; }
export function HostAdoptionCircle({layer, ...props}: ComponentProps<typeof PlainButton> & {layer: string}) { return <PlainButton {...props} className={`host-adoption-circle host-adoption-circle--${layer}`} />; }
export function HostAdoptionDetail(props: ComponentProps<"section">) { return <section {...props} className="host-adoption-detail" />; }
