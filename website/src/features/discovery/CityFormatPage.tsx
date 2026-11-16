import {
  CatchBandHeader,
  CatchButton,
  CatchCardGrid,
  CatchChoiceInput,
  CatchEmptyState,
  CatchFaqSection,
  CatchFeatureTile,
  CatchGrid,
  CatchScreenPreview,
  CatchSplitSection,
  CatchStack,
  CatchSurface,
} from "@catch/web-ui";
import {explorePageCopy} from "@content/explorePage";
import {useNavigate} from "react-router";
import type {HomeCatalog} from "../home/homeTypes";
import {CitySiteChrome} from "../home/sections/cityChrome";
import {CityAlertsCapture} from "./CityAlertsCapture";
import {cityFormatFilters} from "./discoveryModel";
import {organizerGridItems, planGridItems} from "./discoveryCards";
import type {DiscoveryFormatKey} from "./discoveryTypes";
import {useCityFormatPageController, type CityFormatPageController} from "./useCityFormatPageController";

type Page = CityFormatPageController;

/** Above the bar: the format on its accent with the backend's three counts, as the board's tiles. */
function CityFormatHero({page}: {page: Page}) {
  return (
    <CatchSurface aria-labelledby="city-format-title" as="section" block="band" color="run">
      <CatchStack gap={24}>
        <CatchBandHeader kicker={page.hero.kicker} lead={page.hero.lead} level={1} title={page.hero.title} titleId="city-format-title" />
        {page.hero.stats.length ? (
          <CatchGrid columns={3}>
            {page.hero.stats.map((stat) => <CatchFeatureTile figure={stat.figure} ground="white" key={stat.title} level={2} title={stat.title} />)}
          </CatchGrid>
        ) : null}
      </CatchStack>
    </CatchSurface>
  );
}

function CityFormatPlans({page}: {page: Page}) {
  const {plans} = page;
  return (
    <CatchCardGrid
      actions={[{label: plans.seeAll.label, href: plans.seeAll.href, variant: "secondary"}]}
      columns={3}
      empty={{
        title: plans.empty.title,
        message: plans.empty.message,
        actions: plans.empty.clear ? <CatchButton label={plans.clearLabel} onPressed={() => plans.setFilter("all")} variant="secondary" /> : undefined,
      }}
      filters={(
        <CatchChoiceInput
          itemLabelBuilder={plans.filterLabel}
          mode="single"
          onChanged={(chosen) => plans.setFilter([...chosen][0] ?? "all")}
          selected={new Set([plans.filter])}
          values={cityFormatFilters}
        />
      )}
      items={planGridItems(plans.cards)}
      kicker={plans.kicker}
      kind="plan"
      title={plans.title}
    />
  );
}

function CityFormatOrganisers({page}: {page: Page}) {
  const {organisers} = page;
  return (
    <CatchCardGrid
      actions={[{label: organisers.join.label, href: organisers.join.href, variant: "secondary"}]}
      columns={4}
      ground="paper"
      items={organizerGridItems(organisers.cards)}
      kicker={organisers.kicker}
      kind="org"
      lead={organisers.lead}
      title={organisers.title}
    />
  );
}

/** Below the bar (the backend says noindex): what is here so far, and what else is on in the city. */
function CityFormatThin({page}: {page: Page}) {
  const {thin} = page;
  return (
    <CatchSplitSection
      actions={thin.actions}
      ground="paper"
      kicker={page.hero.kicker}
      lead={thin.lead}
      level={1}
      media={thin.popular ? (
        <CatchScreenPreview kind="card" rows={thin.popular.rows} semanticsLabel={thin.popular.title} title={thin.popular.title} />
      ) : undefined}
      ticks={thin.ticks}
      title={page.hero.title}
    />
  );
}

/**
 * The city-by-format page (/<city>/<format>/): the board's full layout when
 * the backend indexes the format in the city, its thin layout otherwise, and
 * in both the city's other format pages, the questions and the WhatsApp
 * capture. It arranges library parts and binds the controller (D18).
 */
function CityFormatPageSections({page}: {page: Page}) {
  return (
    <CitySiteChrome cities={page.cities} city={page.city} exploreHref={page.exploreHref} onChooseCity={page.chooseCity} showWhatsOn={page.showWhatsOn}>
      {page.status === "unavailable" ? (
        <CatchSurface aria-labelledby="city-format-title" as="section" block="band">
          <CatchStack gap={24}>
            <CatchBandHeader kicker={page.hero.kicker} level={1} title={page.hero.title} titleId="city-format-title" />
            <CatchEmptyState announce="polite" message={explorePageCopy.unavailableBody} title={explorePageCopy.unavailable} />
          </CatchStack>
        </CatchSurface>
      ) : <>
        {page.indexed ? <>
          <CityFormatHero page={page} />
          <CityFormatPlans page={page} />
          <CityFormatOrganisers page={page} />
          {page.firstTime ? <CatchSplitSection kicker={page.firstTime.kicker} ticks={page.firstTime.ticks} title={page.firstTime.title} /> : null}
        </> : <CityFormatThin page={page} />}
        <CatchCardGrid items={[]} kicker={page.more.kicker} kind="plan" links={page.more.links} title={page.more.title} />
        <CatchFaqSection items={page.faq.items} kicker={page.faq.kicker} title={page.faq.title} />
        <CityAlertsCapture interests={page.notify.interests} kicker={page.notify.kicker} place={page.notify.place} title={page.notify.title} />
      </>}
    </CitySiteChrome>
  );
}

/** The route: the selected city's catalog and the format the path names (matchDiscoveryRoute). */
export function CityFormatPage({catalog, format}: {catalog: HomeCatalog; format: DiscoveryFormatKey}) {
  const navigate = useNavigate();
  const page = useCityFormatPageController(catalog, format, (href) => navigate(href));
  return <CityFormatPageSections page={page} />;
}
