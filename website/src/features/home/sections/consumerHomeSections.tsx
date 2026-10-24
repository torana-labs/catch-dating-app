import {ConsumerCity, ConsumerHero, ConsumerHeroCopy, ConsumerActions, ConsumerHeroImage, ConsumerEventsSection, ConsumerSectionHeading, ConsumerFilters, ConsumerSrOnly, ConsumerEmpty, ConsumerButton, ConsumerEventGrid, ConsumerEventLink, ConsumerEventMedia, ConsumerPhotoNote, ConsumerCategory, ConsumerEventArrow, ConsumerAvailability, ConsumerTextActionLink, ConsumerExperience, ConsumerExperienceImage, ConsumerExperienceCopy, ConsumerExperienceBadge, ConsumerExperienceReassurance, ConsumerPaperButton, ConsumerExperiencePrompt, ConsumerOrganisersSection, ConsumerOrganiserGrid, ConsumerOrganiserLink, ConsumerOrganiserMedia, ConsumerOrganiserLocation, ConsumerOrganiserDescription, ConsumerOrganizerAction, ConsumerFaqSection, ConsumerFaqItem, ConsumerHost, ConsumerHostCopy, ConsumerEyebrow, ConsumerHostAudience, ConsumerHostMedia, ConsumerClosingSection} from "../../../shared/ui/primitives/consumerHome";
import {useState} from "react";
import {ArrowRight, CalendarDays, MapPin, Users, MessageCircle, Shuffle, Plus, Minus} from "lucide-react";
import {consumerHomeCopy as copy} from "@content/consumerHome";
import {activeMarket} from "@content/markets";
import {interpolateContent as fill} from "@content/interpolate";
import {CatchField} from "@catch/web-ui";
import {ButtonLink, PlainButton, PlainLink} from "../../../shared/ui/primitives";
import {useConsumerHomeController} from "../useConsumerHomeController";
import {MediaSlot, type CaptureSlots} from "../../../shared/media/MediaSlot";
import {categoryForActivity, homeEditorialImage} from "../homeDiscovery";

type Controller = ReturnType<typeof useConsumerHomeController>;
const icons = [MessageCircle, Users, Shuffle];
function CityChoice({home, id}: {home: Controller; id: string}) {
 return <ConsumerCity >
  <CatchField recipe="select" id={id} title={copy.cityLabel} labelMode="hidden"
   leading={<MapPin size={19} aria-hidden="true" />}
   values={activeMarket.cities} itemLabelBuilder={city => city.label} itemValueBuilder={city => city.slug}
   value={home.city} onChanged={city => {if (city) home.selectCity(city.slug);}} />
 </ConsumerCity>;
}
export function renderConsumerHero(home: Controller) {
 return <ConsumerHero aria-labelledby="consumer-title">
  <ConsumerHeroCopy ><h1 id="consumer-title">{copy.hero.title}</h1><p>{copy.hero.body}</p>
   <ConsumerActions ><CityChoice home={home} id="hero-city" /><ButtonLink href={home.discoveryHref}>{copy.actions.find}<ArrowRight size={19} aria-hidden="true" /></ButtonLink></ConsumerActions>
  </ConsumerHeroCopy>
  <ConsumerHeroImage src="/assets/events/social-run-music-hero.jpg" srcSet="/assets/events/social-run-music-hero-960.jpg 960w, /assets/events/social-run-music-hero.jpg 1672w" sizes="(max-width: 700px) 100vw, 59vw" width={1672} height={941} alt={copy.hero.alt} fetchPriority="high" />
 </ConsumerHero>;
}
export function renderConsumerEvents(home: Controller, showAll = false) {
 const changeCity = () => {const select = document.getElementById("events-city") as HTMLSelectElement | null; select?.focus(); try {select?.showPicker();} catch {/* Focus is the keyboard fallback. */}};
 return <ConsumerEventsSection id="events" aria-labelledby="consumer-events-title">
  <ConsumerSectionHeading ><h2 id="consumer-events-title">{fill(copy.events.title, {city: home.city.label})}</h2><CityChoice home={home} id="events-city" /></ConsumerSectionHeading>
  {home.phase === "ready" && home.cityEvents.length > 0 ? <ConsumerFilters role="group" aria-label={copy.filtersLabel}>
   {copy.categories.map(item => <PlainButton key={item.id} aria-pressed={home.category === item.id} onClick={() => home.setCategory(item.id)}>{item.label}</PlainButton>)}
  </ConsumerFilters> : null}
  <ConsumerSrOnly aria-live="polite" aria-atomic="true" >{home.phase === "ready" ? fill(copy.events.count, {count: home.events.length}) : home.phase === "loading" ? copy.events.loading : copy.events.unavailable}</ConsumerSrOnly>
  {home.phase !== "ready" ? <ConsumerEmpty role="status"><CalendarDays size={36} aria-hidden="true" /><h3>{home.phase === "loading" ? copy.events.loading : copy.events.unavailable}</h3>
   {home.phase === "unavailable" ? <><p>{copy.events.unavailableBody}</p><ConsumerButton onClick={() => window.location.reload()}>{copy.actions.retry}</ConsumerButton></> : null}
  </ConsumerEmpty> : home.events.length ? <>
   <ConsumerEventGrid showAll={showAll}>
    {(showAll ? home.events : home.events.slice(0, 4)).map(event => <ConsumerEventLink key={event.id} href={event.href}>
     <ConsumerEventMedia ><img src={event.image} alt="" width={600} height={420} loading="lazy" />{event.illustrative ? <ConsumerPhotoNote >{copy.events.illustration}</ConsumerPhotoNote> : null}</ConsumerEventMedia>
     <ConsumerCategory category={event.category}>{copy.categories.find(category => category.id === event.category)?.label}</ConsumerCategory>
     <h3>{event.title}</h3>
     <p><CalendarDays size={17} aria-hidden="true" />{event.date}</p>
     <p><MapPin size={17} aria-hidden="true" /><span>{event.location}<span aria-hidden="true"> · </span>{event.priceLabel}</span></p>
     <p><Users size={17} aria-hidden="true" /><span>{fill(copy.events.by, {name: event.hostName})}</span><ConsumerEventArrow size={19} aria-hidden="true" /></p>
     {event.availability ? <ConsumerAvailability >{event.availability}</ConsumerAvailability> : null}
    </ConsumerEventLink>)}
   </ConsumerEventGrid>
   {!showAll ? <ConsumerTextActionLink href={home.discoveryHref}>{copy.actions.all}<ArrowRight size={19} aria-hidden="true" /></ConsumerTextActionLink> : null}
  </> : <ConsumerEmpty ><CalendarDays size={38} aria-hidden="true" />
   <h3>{fill(home.cityEvents.length ? copy.events.filtered : copy.events.empty, {city: home.city.label})}</h3>
   <p>{home.cityEvents.length ? copy.events.filteredBody : copy.events.emptyBody}</p>
   <ConsumerButton onClick={home.cityEvents.length ? () => home.setCategory("all") : changeCity}>{home.cityEvents.length ? copy.actions.clear : copy.actions.changeCity}</ConsumerButton>
   <ConsumerTextActionLink href="/organizers/">{copy.actions.organisers}<ArrowRight size={18} aria-hidden="true" /></ConsumerTextActionLink>
  </ConsumerEmpty>}
 </ConsumerEventsSection>;
}
function Experience() {
 const [expanded, setExpanded] = useState(false);
 return <ConsumerExperience aria-labelledby="experience-title">
  <ConsumerExperienceImage src="/assets/marketing/catch-hero-event-1680.jpg" width={1680} height={935} alt={copy.experience.alt} loading="lazy" />
  <ConsumerExperienceCopy ><ConsumerExperienceBadge >{copy.experience.badge}</ConsumerExperienceBadge><h2 id="experience-title">{copy.experience.title}</h2><p>{copy.experience.body}</p>
   <ul>{copy.experience.items.map((item, index) => {const Icon = icons[index]; return <li key={item.title}><Icon size={22} aria-hidden="true" /><span>{item.title}</span></li>;})}</ul>
   <ConsumerExperienceReassurance >{copy.experience.reassurance}</ConsumerExperienceReassurance>
   <ConsumerPaperButton aria-expanded={expanded} aria-controls="experience-explanation" onClick={() => setExpanded(!expanded)}>{copy.experience.action}{expanded ? <Minus size={19} aria-hidden="true" /> : <Plus size={19} aria-hidden="true" />}</ConsumerPaperButton>
   <div id="experience-explanation" hidden={!expanded}><p>{copy.experience.explanation}</p>{copy.experience.items.map(item => <p key={item.title}><strong>{item.title}</strong> {item.body}</p>)}</div>
  </ConsumerExperienceCopy>
  <ConsumerExperiencePrompt ><MessageCircle size={23} aria-hidden="true" /><span>{copy.experience.prompt}</span></ConsumerExperiencePrompt>
 </ConsumerExperience>;
}
function Organisers({home}: {home: Controller}) {
 return <ConsumerOrganisersSection aria-labelledby="home-organisers-title"><h2 id="home-organisers-title">{home.cityEvents.length ? copy.organisers.title : copy.organisers.across}</h2><p>{copy.organisers.body}</p>
  <ConsumerOrganiserGrid >{home.phase === "ready" ? home.organisers.map(listing => {
   const event = listing.catchEvents?.find(item => item.photoUrl);
   const category = categoryForActivity(listing.category);
   return <ConsumerOrganiserLink key={listing.id} href={listing.path}>
    <ConsumerOrganiserMedia ><img src={event?.photoUrl || homeEditorialImage(category)} alt="" width={600} height={330} loading="lazy" />{!event?.photoUrl ? <ConsumerPhotoNote >{copy.events.illustration}</ConsumerPhotoNote> : null}</ConsumerOrganiserMedia>
    <div><h3>{listing.name}</h3><ConsumerOrganiserLocation ><MapPin size={16} aria-hidden="true" />{listing.city}<span aria-hidden="true"> · </span>{listing.formats[0] || listing.category}</ConsumerOrganiserLocation><ConsumerOrganiserDescription >{listing.description}</ConsumerOrganiserDescription><ConsumerOrganizerAction category={category}>{copy.actions.organiser}<ArrowRight size={18} aria-hidden="true" /></ConsumerOrganizerAction></div>
   </ConsumerOrganiserLink>;
  }) : null}</ConsumerOrganiserGrid>
  {home.phase === "unavailable" ? <p>{copy.organisers.unavailable}</p> : home.phase === "ready" && home.organisers.length === 0 ? <p>{copy.organisers.empty}</p> : null}
  <ConsumerTextActionLink href="/organizers/">{copy.actions.organisers}<ArrowRight size={19} aria-hidden="true" /></ConsumerTextActionLink>
 </ConsumerOrganisersSection>;
}
function Questions() {
 const [open, setOpen] = useState<number | null>(0);
 return <ConsumerFaqSection aria-labelledby="home-faq-title"><h2 id="home-faq-title">{copy.faq.title}</h2>
  {copy.faq.items.map((item, index) => <ConsumerFaqItem key={item.question}><h3><PlainButton id={`faq-question-${index}`} aria-expanded={open === index} aria-controls={`faq-answer-${index}`} onClick={() => setOpen(open === index ? null : index)}>{item.question}{open === index ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}</PlainButton></h3>
   <div id={`faq-answer-${index}`} aria-labelledby={`faq-question-${index}`} hidden={open !== index}><p>{item.answer}</p>{index === copy.faq.items.length - 1 ? <PlainLink href="/help/">{copy.actions.help}</PlainLink> : null}</div>
  </ConsumerFaqItem>)}
 </ConsumerFaqSection>;
}
function HostInvitation({captures}: {captures: CaptureSlots}) {
 return <ConsumerHost aria-labelledby="consumer-host-title"><ConsumerHostCopy ><ConsumerEyebrow >{copy.host.eyebrow}</ConsumerEyebrow><h2 id="consumer-host-title">{copy.host.title}</h2><p>{copy.host.body}</p><ConsumerHostAudience >{copy.host.audience}</ConsumerHostAudience><ButtonLink href="/host/">{copy.actions.host}<ArrowRight size={19} aria-hidden="true" /></ButtonLink></ConsumerHostCopy>
  <ConsumerHostMedia ><MediaSlot captures={captures} id="host-live-console" /></ConsumerHostMedia>
 </ConsumerHost>;
}
export function renderConsumerStory(home: Controller, captures: CaptureSlots) {
 return <><Experience /><Organisers home={home} /><Questions /><HostInvitation captures={captures} /><ConsumerClosingSection ><h2>{copy.close}</h2><ButtonLink href={home.discoveryHref}>{copy.actions.find}<ArrowRight size={19} aria-hidden="true" /></ButtonLink></ConsumerClosingSection></>;
}
