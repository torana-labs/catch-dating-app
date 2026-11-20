import {
  CatchAppCaptureImage,
  CatchBand,
  CatchBandHeader,
  CatchButton,
  CatchCardGrid,
  CatchChip,
  CatchEmptyState,
  CatchFaqSection,
  CatchFeatureTile,
  CatchGrid,
  CatchRoot,
  CatchScreenPreview,
  CatchSplitSection,
  CatchStack,
} from "@catch/web-ui";
import {explorePageCopy} from "@content/explorePage";
import {useNavigate} from "react-router";
import {captureSlot, type CaptureSlots} from "../../shared/media/captureSlot";
import type {HomeCatalog} from "../home/homeTypes";
import {CitySiteChrome} from "../home/sections/cityChrome";
import {CityAlertsCapture} from "./CityAlertsCapture";
import {DiscoveryDock} from "./DiscoveryDock";
import {DiscoveryOrganisers} from "./DiscoveryOrganisers";
import {cityFormatFilters} from "./discoveryModel";
import {planGridItems} from "./discoveryCards";
import type {DiscoveryFormatKey} from "./discoveryTypes";
import {cityFormatPlansAnchor, useCityFormatPageController, type CityFormatPageController} from "./useCityFormatPageController";

type Page = CityFormatPageController;
const heroTitleId = "city-format-title";

/** Above the bar: the format on the coral panel with the backend's counts as white tiles (the board's KitTiles hero). */
function CityFormatHero({page}: {page: Page}) {
  return (
    <CatchBand aria-labelledby={heroTitleId} as="section" ground="coral">
      <CatchStack gap={24}>
        <CatchBandHeader ground="coral" kicker={page.hero.kicker} lead={page.hero.lead} level={1} size="hero" title={page.hero.title} titleId={heroTitleId} />
        {page.hero.stats.length ? (
          <CatchGrid columns={4}>
            {page.hero.stats.map((stat) => <CatchFeatureTile figure={stat.figure} ground="white" key={stat.title} level={2} title={stat.title} />)}
          </CatchGrid>
        ) : null}
      </CatchStack>
    </CatchBand>
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
        <CatchStack aria-label={plans.filtersLabel} direction="row" gap={8} role="radiogroup" wrap>
          {cityFormatFilters.map((value) => (
            <CatchChip colourWhenSelected key={value} kind="choice" label={plans.filterLabel(value)} onPressed={() => plans.setFilter(value)}
              selected={plans.filter === value} />
          ))}
        </CatchStack>
      )}
      id={cityFormatPlansAnchor}
      items={planGridItems(plans.cards)}
      kicker={plans.kicker}
      kind="plan"
      title={plans.title}
    />
  );
}

function CityFormatOrganisers({page}: {page: Page}) {
  const {organisers} = page;
  return <DiscoveryOrganisers cards={organisers.cards} claim={organisers.claim} kicker={organisers.kicker} lead={organisers.lead} title={organisers.title} />;
}

/** Below the bar (the backend says noindex): what is here so far, and what else is on in the city, on the tint panel. */
function CityFormatThin({page}: {page: Page}) {
  const {thin} = page;
  return (
    <CatchSplitSection
      actions={thin.actions}
      ground="paper"
      kicker={page.hero.kicker}
      kickerAccent="mint"
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
 * The city-by-format page (/<city>/<format>/, the PlaybookCityFormat
 * board): above the indexing bar, the coral hero with the backend's counts,
 * the plans, who runs them and the first-time guide; below it, the thin
 * layout. In both, the city's other format pages, the questions, the
 * WhatsApp band, the footer and the phone action bar. The first-time guide
 * shows a guest's phone after checking in and the WhatsApp band the app's
 * Explore screen, as the board's phones. It arranges library parts and binds
 * the controller (D18).
 */
function CityFormatPageSections({captures, page}: {captures: CaptureSlots; page: Page}) {
  const checkedIn = captureSlot(captures, "guest-checked-in");
  const explore = captureSlot(captures, "guest-explore");
  return (
    <CitySiteChrome cities={page.cities} city={page.city} discovery={page.discovery} dock={<DiscoveryDock href={page.dock.href} label={page.dock.label} message={page.notify.message} />}
      exploreHref={page.exploreHref} onChooseCity={page.chooseCity} showWhatsOn={page.showWhatsOn}>
      {page.status === "unavailable" ? (
        <CatchBand aria-labelledby={heroTitleId} as="section">
          <CatchStack gap={24}>
            <CatchBandHeader kicker={page.hero.kicker} level={1} size="hero" title={page.hero.title} titleId={heroTitleId} />
            <CatchEmptyState announce="polite" message={explorePageCopy.unavailableBody} surface title={explorePageCopy.unavailable} />
          </CatchStack>
        </CatchBand>
      ) : <>
        {page.indexed ? <>
          <CityFormatHero page={page} />
          <CityFormatPlans page={page} />
          <CityFormatOrganisers page={page} />
          {page.firstTime ? (
            <CatchSplitSection kicker={page.firstTime.kicker} kickerAccent="indigo" ticks={page.firstTime.ticks} title={page.firstTime.title}
              media={checkedIn ? <CatchAppCaptureImage {...checkedIn} caption={undefined} size="sm" /> : undefined} />
          ) : null}
        </> : <CityFormatThin page={page} />}
        <CatchCardGrid chips={page.more.links.map((link) => ({label: link.label, href: link.href}))} items={[]} kicker={page.more.kicker} kickerAccent="coral" kind="plan" title={page.more.title} />
        <CatchFaqSection items={page.faq.items} kicker={page.faq.kicker} title={page.faq.title} />
        <CityAlertsCapture interests={page.notify.interests} kicker={page.notify.kicker} place={page.notify.place} title={page.notify.title}
          media={explore ? <CatchAppCaptureImage {...explore} caption={undefined} size="md" /> : undefined} />
      </>}
    </CitySiteChrome>
  );
}

/** The route: the selected city's catalog and the format the path names (matchDiscoveryRoute). */
export function CityFormatPage({captures = {}, catalog, format}: {captures?: CaptureSlots; catalog: HomeCatalog; format: DiscoveryFormatKey}) {
  const navigate = useNavigate();
  const page = useCityFormatPageController(catalog, format, (href) => navigate(href));
  return <CatchRoot theme="day"><CityFormatPageSections captures={captures} page={page} /></CatchRoot>;
}
