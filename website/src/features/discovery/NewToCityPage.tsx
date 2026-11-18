import {
  CatchAppCaptureImage,
  CatchBand,
  CatchBandHeader,
  CatchCardGrid,
  CatchEmptyState,
  CatchFaqSection,
  CatchFeatureTile,
  CatchGrid,
  CatchHeroSection,
  CatchRoot,
  CatchScreenPreview,
  CatchSplitSection,
  CatchStack,
  type CatchBandGround,
} from "@catch/web-ui";
import {explorePageCopy} from "@content/explorePage";
import {useNavigate} from "react-router";
import {captureSlot, type CaptureSlots} from "../../shared/media/captureSlot";
import type {HomeCatalog} from "../home/homeTypes";
import {CitySiteChrome} from "../home/sections/cityChrome";
import {CityAlertsCapture} from "./CityAlertsCapture";
import {DiscoveryDock} from "./DiscoveryDock";
import {planGridItems} from "./discoveryCards";
import {newcomerPlansAnchor, useNewToCityPageController, type NewToCityPageController} from "./useNewToCityPageController";

type Page = NewToCityPageController;
// The board's first month runs through the run, quiz, supper and courts accents.
const monthGrounds: readonly CatchBandGround[] = ["coral", "yellow", "pink", "mint"];

/** The pink hero, with a real plan from the list as the board's tilted card. */
function NewToCityHero({page}: {page: Page}) {
  const {card} = page.hero;
  return (
    <CatchHeroSection
      actions={page.hero.actions}
      ground="pink"
      kicker={page.hero.kicker}
      lead={page.hero.lead}
      media={card ? (
        <CatchScreenPreview cover={card.photo ?? undefined} kind="card" label={card.label} rows={[{title: card.price}]}
          semanticsLabel={`${card.title}. ${card.subtitle}`} subtitle={card.subtitle} tilt="right" title={card.title} />
      ) : undefined}
      title={page.hero.title}
    />
  );
}

/** "What happens when you walk in alone": three tiles on the ink panel. */
function NewToCityAlone({page}: {page: Page}) {
  return (
    <CatchBand aria-labelledby="new-to-city-alone" as="section" ground="ink">
      <CatchStack gap={24}>
        <CatchBandHeader ground="ink" kicker={page.alone.kicker} kickerAccent="yellow" size="section" title={page.alone.title} titleId="new-to-city-alone" />
        <CatchGrid columns={3}>
          {page.alone.items.map((item) => <CatchFeatureTile body={item.body} ground="ink" key={item.title} title={item.title} />)}
        </CatchGrid>
      </CatchStack>
    </CatchBand>
  );
}

/** "A first month in {city}": four weeks, each on its format's accent, under a centred header. */
function NewToCityMonth({page}: {page: Page}) {
  return (
    <CatchBand aria-labelledby="new-to-city-month" as="section">
      <CatchStack gap={24}>
        <CatchBandHeader align="center" kicker={page.month.kicker} kickerAccent="indigo" size="section" title={page.month.title} titleId="new-to-city-month" />
        <CatchGrid columns={4}>
          {page.month.items.map((item, index) => (
            <CatchFeatureTile body={item.body} ground={monthGrounds[index % monthGrounds.length]} key={item.label} title={item.title} />
          ))}
        </CatchGrid>
      </CatchStack>
    </CatchBand>
  );
}

/**
 * The new-to-the-city page (/new-to-<city>/, the PlaybookNewToCity board):
 * the pink hero, this week's newcomer plans, walking in alone on ink, a
 * first month, why the hosts can be trusted on the tint panel, the
 * questions, the pink WhatsApp band beside a guest's phone after checking
 * in (the board's phone), the footer and the phone action bar. It arranges
 * library parts and binds the controller (D18).
 */
function NewToCityPageSections({captures, page}: {captures: CaptureSlots; page: Page}) {
  const checkedIn = captureSlot(captures, "guest-checked-in");
  return (
    <CitySiteChrome cities={page.cities} city={page.city} dock={<DiscoveryDock href={page.dock.href} label={page.dock.label} message={page.notify.message} />}
      exploreHref={page.exploreHref} onChooseCity={page.chooseCity} showWhatsOn={page.showWhatsOn}>
      <NewToCityHero page={page} />
      {page.unavailable ? (
        <CatchBand aria-label={page.plans.title} as="section" id={newcomerPlansAnchor}>
          <CatchEmptyState announce="polite" message={explorePageCopy.unavailableBody} surface title={explorePageCopy.unavailable} />
        </CatchBand>
      ) : (
        <CatchCardGrid
          actions={[{label: page.plans.seeAll.label, href: page.plans.seeAll.href, variant: "secondary"}]}
          empty={page.plans.empty}
          id={newcomerPlansAnchor}
          items={planGridItems(page.plans.cards)}
          kicker={page.plans.kicker}
          kind="plan"
          lead={page.plans.lead}
          title={page.plans.title}
        />
      )}
      <NewToCityAlone page={page} />
      <NewToCityMonth page={page} />
      <CatchSplitSection
        actions={[{label: page.trust.action, href: page.trust.actionHref, variant: "secondary"}]}
        checks={page.trust.items}
        ground="paper"
        kicker={page.trust.kicker}
        kickerAccent="mint"
        lead={page.trust.lead}
        title={page.trust.title}
      />
      <CatchFaqSection items={page.faq.items} kicker={page.faq.kicker} title={page.faq.title} />
      <CityAlertsCapture ground="pink" interests={page.notify.interests} kicker={page.notify.kicker} place={page.notify.place} title={page.notify.title}
        media={checkedIn ? <CatchAppCaptureImage {...checkedIn} bezel caption={undefined} size="md" /> : undefined} />
    </CitySiteChrome>
  );
}

/** The route: the selected city's catalog (matchDiscoveryRoute names the city). */
export function NewToCityPage({captures = {}, catalog}: {captures?: CaptureSlots; catalog: HomeCatalog}) {
  const navigate = useNavigate();
  const page = useNewToCityPageController(catalog, (href) => navigate(href));
  return <CatchRoot theme="day"><NewToCityPageSections captures={captures} page={page} /></CatchRoot>;
}
