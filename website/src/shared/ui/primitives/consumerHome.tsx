import type {ComponentProps} from "react";
import {PlainLink} from "./actionControls";

// What remains of the legacy consumer home: the Explore route, the organiser
// directory and the shared site chrome still render these until CAT-261
// rebuilds them on library parts and deletes consumer-home.css.
export function ConsumerHome(props: ComponentProps<"div">) { return <div {...props} className="consumer-home" />; }
export function ConsumerFilters(props: ComponentProps<"div">) { return <div {...props} className="consumer-filters" />; }
export function ConsumerEmpty(props: ComponentProps<"div">) { return <div {...props} className="consumer-empty" />; }
export function ConsumerEventGrid({showAll, ...props}: ComponentProps<"div"> & {showAll?: boolean}) { return <div {...props} className={`consumer-event-grid${showAll ? " consumer-event-grid--all" : ""}`} />; }
export function ConsumerEventLink(props: ComponentProps<typeof PlainLink>) { return <PlainLink {...props} className="consumer-event" />; }
export function ConsumerEventMedia(props: ComponentProps<"div">) { return <div {...props} className="consumer-event__media" />; }
export function ConsumerCategory({category, ...props}: ComponentProps<"span"> & {category: string}) { return <span {...props} className={`consumer-category consumer-category--${category}`} />; }
export function ConsumerAvailability(props: ComponentProps<"span">) { return <span {...props} className="consumer-availability" />; }
