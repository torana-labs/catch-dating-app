import {
  CatchBandHeader,
  CatchCardGrid,
  CatchEmptyState,
  CatchFaqSection,
  CatchFeatureTile,
  CatchGrid,
  CatchHeroSection,
  CatchScreenPreview,
  CatchSplitSection,
  CatchStack,
  CatchSurface,
  type CatchBandGround,
} from "@catch/web-ui";
import {explorePageCopy} from "@content/explorePage";
import {useNavigate} from "react-router";
import type {HomeCatalog} from "../home/homeTypes";
import {CitySiteChrome} from "../home/sections/cityChrome";
import {CityAlertsCapture} from "./CityAlertsCapture";
import {planGridItems} from "./discoveryCards";
import {newcomerPlansAnchor, useNewToCityPageController, type NewToCityPageController} from "./useNewToCityPageController";

type Page = NewToCityPageController;
// The board's first month runs through the run, quiz, supper and courts accents.
const monthGrounds: readonly CatchBandGround[] = ["coral", "yellow", "pink", "mint"];

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

/** "What happens when you walk in alone": three tiles on the ink band. */
function NewToCityAlone({page}: {page: Page}) {
  return (
    <CatchSurface aria-labelledby="new-to-city-alone" as="section" block="band" color="ink">
      <CatchStack gap={24}>
        <CatchBandHeader kicker={page.alone.kicker} title={page.alone.title} titleId="new-to-city-alone" />
        <CatchGrid columns={3}>
          {page.alone.items.map((item) => <CatchFeatureTile body={item.body} key={item.title} title={item.title} />)}
        </CatchGrid>
      </CatchStack>
    </CatchSurface>
  );
}

/** "A first month in {city}": four weeks, each on its format's accent. */
function NewToCityMonth({page}: {page: Page}) {
  return (
    <CatchSurface aria-labelledby="new-to-city-month" as="section" block="band">
      <CatchStack gap={24}>
        <CatchBandHeader kicker={page.month.kicker} title={page.month.title} titleId="new-to-city-month" />
        <CatchGrid columns={4}>
          {page.month.items.map((item, index) => (
            <CatchFeatureTile body={item.body} figureNote={item.label} ground={monthGrounds[index % monthGrounds.length]} key={item.label} title={item.title} />
          ))}
        </CatchGrid>
      </CatchStack>
    </CatchSurface>
  );
}

/**
 * The new-to-the-city page (/new-to-<city>/): the board's hero, this week's
 * newcomer plans, walking in alone, a first month, why the hosts can be
 * trusted, the questions and the WhatsApp capture. It arranges library parts
 * and binds the controller (D18).
 */
function NewToCityPageSections({page}: {page: Page}) {
  return (
    <CitySiteChrome cities={page.cities} city={page.city} exploreHref={page.exploreHref} onChooseCity={page.chooseCity} showWhatsOn={page.showWhatsOn}>
      <NewToCityHero page={page} />
      {page.unavailable ? (
        <CatchSurface aria-label={page.plans.title} as="section" block="band" id={newcomerPlansAnchor}>
          <CatchEmptyState announce="polite" message={explorePageCopy.unavailableBody} title={explorePageCopy.unavailable} />
        </CatchSurface>
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
        lead={page.trust.lead}
        title={page.trust.title}
      />
      <CatchFaqSection items={page.faq.items} kicker={page.faq.kicker} title={page.faq.title} />
      <CityAlertsCapture ground="pink" interests={page.notify.interests} kicker={page.notify.kicker} place={page.notify.place} title={page.notify.title} />
    </CitySiteChrome>
  );
}

/** The route: the selected city's catalog (matchDiscoveryRoute names the city). */
export function NewToCityPage({catalog}: {catalog: HomeCatalog}) {
  const navigate = useNavigate();
  const page = useNewToCityPageController(catalog, (href) => navigate(href));
  return <NewToCityPageSections page={page} />;
}
