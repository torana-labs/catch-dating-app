import type {ComponentProps} from "react";
import {ArrowRight} from "lucide-react";
import {PlainButton, PlainLink} from "./actionControls";

export function ConsumerHome(props: ComponentProps<"div">) { return <div {...props} className="consumer-home" />; }
export function ConsumerCity(props: ComponentProps<"div">) { return <div {...props} className="consumer-city" />; }
export function ConsumerHero(props: ComponentProps<"section">) { return <section {...props} className="consumer-hero" />; }
export function ConsumerHeroCopy(props: ComponentProps<"div">) { return <div {...props} className="consumer-hero__copy" />; }
export function ConsumerActions(props: ComponentProps<"div">) { return <div {...props} className="consumer-actions" />; }
export function ConsumerHeroImage(props: ComponentProps<"img">) { return <img {...props} className="consumer-hero__image" />; }
export function ConsumerEventsSection(props: ComponentProps<"section">) { return <section {...props} className="consumer-section consumer-events" />; }
export function ConsumerSectionHeading(props: ComponentProps<"div">) { return <div {...props} className="consumer-section__heading" />; }
export function ConsumerFilters(props: ComponentProps<"div">) { return <div {...props} className="consumer-filters" />; }
export function ConsumerSrOnly(props: ComponentProps<"div">) { return <div {...props} className="consumer-sr-only" />; }
export function ConsumerEmpty(props: ComponentProps<"div">) { return <div {...props} className="consumer-empty" />; }
export function ConsumerButton(props: ComponentProps<typeof PlainButton>) { return <PlainButton {...props} className="button" />; }
export function ConsumerEventGrid({showAll, ...props}: ComponentProps<"div"> & {showAll?: boolean}) { return <div {...props} className={`consumer-event-grid${showAll ? " consumer-event-grid--all" : ""}`} />; }
export function ConsumerEventLink(props: ComponentProps<typeof PlainLink>) { return <PlainLink {...props} className="consumer-event" />; }
export function ConsumerEventMedia(props: ComponentProps<"div">) { return <div {...props} className="consumer-event__media" />; }
export function ConsumerPhotoNote(props: ComponentProps<"span">) { return <span {...props} className="consumer-photo-note" />; }
export function ConsumerCategory({category, ...props}: ComponentProps<"span"> & {category: string}) { return <span {...props} className={`consumer-category consumer-category--${category}`} />; }
export function ConsumerEventArrow(props: ComponentProps<typeof ArrowRight>) { return <ArrowRight {...props} className="consumer-event__arrow" />; }
export function ConsumerAvailability(props: ComponentProps<"span">) { return <span {...props} className="consumer-availability" />; }
export function ConsumerTextActionLink(props: ComponentProps<typeof PlainLink>) { return <PlainLink {...props} className="consumer-text-action" />; }
export function ConsumerExperience(props: ComponentProps<"section">) { return <section {...props} className="consumer-experience" />; }
export function ConsumerExperienceImage(props: ComponentProps<"img">) { return <img {...props} className="consumer-experience__image" />; }
export function ConsumerExperienceCopy(props: ComponentProps<"div">) { return <div {...props} className="consumer-experience__copy" />; }
export function ConsumerExperienceBadge(props: ComponentProps<"span">) { return <span {...props} className="consumer-experience__badge" />; }
export function ConsumerExperienceReassurance(props: ComponentProps<"p">) { return <p {...props} className="consumer-experience__reassurance" />; }
export function ConsumerPaperButton(props: ComponentProps<typeof PlainButton>) { return <PlainButton {...props} className="button consumer-button--paper" />; }
export function ConsumerExperiencePrompt(props: ComponentProps<"div">) { return <div {...props} className="consumer-experience__prompt" />; }
export function ConsumerOrganisersSection(props: ComponentProps<"section">) { return <section {...props} className="consumer-section consumer-organisers" />; }
export function ConsumerOrganiserGrid(props: ComponentProps<"div">) { return <div {...props} className="consumer-organiser-grid" />; }
export function ConsumerOrganiserLink(props: ComponentProps<typeof PlainLink>) { return <PlainLink {...props} className="consumer-organiser" />; }
export function ConsumerOrganiserMedia(props: ComponentProps<"div">) { return <div {...props} className="consumer-organiser__media" />; }
export function ConsumerOrganiserLocation(props: ComponentProps<"p">) { return <p {...props} className="consumer-organiser__location" />; }
export function ConsumerOrganiserDescription(props: ComponentProps<"p">) { return <p {...props} className="consumer-organiser__description" />; }
export function ConsumerOrganizerAction({category, ...props}: ComponentProps<"span"> & {category: string}) { return <span {...props} className={`consumer-text-action consumer-category--${category}`} />; }
export function ConsumerFaqSection(props: ComponentProps<"section">) { return <section {...props} className="consumer-section consumer-faq" />; }
export function ConsumerFaqItem(props: ComponentProps<"div">) { return <div {...props} className="consumer-faq__item" />; }
export function ConsumerHost(props: ComponentProps<"section">) { return <section {...props} className="consumer-host" />; }
export function ConsumerHostCopy(props: ComponentProps<"div">) { return <div {...props} className="consumer-host__copy" />; }
export function ConsumerEyebrow(props: ComponentProps<"span">) { return <span {...props} className="consumer-eyebrow" />; }
export function ConsumerHostAudience(props: ComponentProps<"p">) { return <p {...props} className="consumer-host__audience" />; }
export function ConsumerHostMedia(props: ComponentProps<"div">) { return <div {...props} className="consumer-host__media" />; }
export function ConsumerClosingSection(props: ComponentProps<"section">) { return <section {...props} className="consumer-section consumer-close" />; }
