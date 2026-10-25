import type {ComponentProps} from "react";
import {Form} from "./forms";
import {PlainButton} from "./actions";
export function ExplorePageLayout(props: ComponentProps<"div">) {return <div {...props} className="consumer-home explore-page" />;}
export function ExploreIntro(props: ComponentProps<"section">) {return <section {...props} className="explore-intro" />;}
export function ExploreSearchForm(props: ComponentProps<typeof Form>) {return <Form {...props} className="explore-search" />;}
export function ExploreToolbar(props: ComponentProps<"div">) {return <div {...props} className="explore-toolbar" />;}
export function ExploreExperience(props: ComponentProps<"details">) {return <details {...props} className="explore-experience" />;}
export function ExploreResults(props: ComponentProps<"section">) {return <section {...props} className="explore-results" />;}
export function ExploreResultsHeading(props: ComponentProps<"div">) {return <div {...props} className="explore-results-heading" />;}
export function ExploreExperienceFilter(props: ComponentProps<typeof PlainButton>) {return <PlainButton {...props} className="explore-experience-filter" />;}
export function ExploreFooterInvite(props: ComponentProps<"section">) {return <section {...props} className="explore-footer-invite" />;}
