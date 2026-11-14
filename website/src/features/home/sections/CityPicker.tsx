import {useEffect, useRef, useState} from "react";
import {CatchAdaptiveSheet, CatchButton, CatchIcon, CatchMenu, CatchNotice, CatchNoticeRegion, CatchSearchField, CatchStack, CatchText,
  type CatchNoticeData} from "@catch/web-ui";
import {homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {countryName, websiteCities} from "@content/markets";
import {rememberCityChoice, type CityChoice} from "../cityChoice";
import {citiesHref, cityGroups, cityPickerSublabel, citySearchThreshold, filterCityGroups, type CityGroup} from "../homeModel";
import type {HomeCity} from "../homeTypes";
import {locateCity} from "../locateCity";

const locateValue = "__locate";
const locate = copy.header.locate;

function groupItems(group: CityGroup, selected: HomeCity, firstRowNote?: string) {
  return group.cities.map((item, index) => ({
    value: item.slug,
    label: item.label,
    sublabel: cityPickerSublabel(item, group) ?? (index === 0 ? firstRowNote : undefined),
    selected: item.slug === selected.slug,
    variant: "choice" as const,
  }));
}

/** One notice at a time, dismissed after a short read. */
function useLocateNotice() {
  const [current, setCurrent] = useState<CatchNoticeData | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return {
    current,
    show(notice: CatchNoticeData) {
      window.clearTimeout(timer.current);
      setCurrent(notice);
      timer.current = window.setTimeout(() => setCurrent(null), 6000);
    },
    dismiss() {
      window.clearTimeout(timer.current);
      setCurrent(null);
    },
  };
}

/**
 * "Use my location" for the cities on show: the browser is asked only when
 * the visitor taps it, and its answer is snapped to a city in the browser.
 */
function useLocate(cities: readonly HomeCity[], choose: (slug: string, source: CityChoice["source"]) => void,
  follow: (href: string) => void) {
  const [finding, setFinding] = useState(false);
  const notice = useLocateNotice();
  const shown = new Set(cities.map((city) => city.slug));
  const points = websiteCities.filter((city) => shown.has(city.slug));
  return {
    finding,
    notice,
    available: points.length > 0,
    async run() {
      if (finding) return;
      setFinding(true);
      const result = await locateCity(points);
      setFinding(false);
      if (result.kind === "city") {
        notice.dismiss();
        choose(result.city.slug, "precise");
      } else if (result.kind === "other") {
        notice.show({id: "locate", title: locate.otherTitle, message: locate.otherBody, tone: "status",
          actionLabel: locate.otherAction, onAction: () => follow(citiesHref)});
      } else {
        notice.show(result.kind === "denied" ?
          {id: "locate", title: locate.deniedTitle, message: locate.deniedBody, tone: "warning"} :
          {id: "locate", title: locate.unavailableTitle, message: locate.unavailableBody, tone: "warning"});
      }
    },
  };
}

/**
 * The header's city picker on the homepage, Explore and the city pages. One
 * country with up to eight cities opens a menu under the trigger; more
 * countries open a sheet grouped by country on phones and a 340px dropdown
 * under the trigger at 900px and wider, which searches once there are more
 * than eight cities and ends with every city. A country with no city open says "launching soon"
 * once instead of marking every city. A city picked here, or found with "Use
 * my location", is remembered (cityChoice) so the homepage opens on it.
 */
export function CityPicker({cities, follow = (href) => window.location.assign(href), onChoose, selected}: {
  cities: readonly HomeCity[];
  /** Opens a link; stories and tests pass a stand-in. */
  follow?: (href: string) => void;
  onChoose: (slug: string) => void;
  selected: HomeCity;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const groups = cityGroups(cities, countryName);
  const countrySoon = (group: CityGroup) => fill(copy.header.countrySoon, {country: group.name});
  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const choose = (slug: string, source: CityChoice["source"]) => {
    close();
    rememberCityChoice(slug, source);
    onChoose(slug);
  };
  const locator = useLocate(cities, choose, follow);
  const notice = locator.notice.current ? (
    <CatchNoticeRegion label={locate.region}>
      <CatchNotice dismissLabel={locate.close} notice={locator.notice.current} onDismiss={locator.notice.dismiss} />
    </CatchNoticeRegion>
  ) : null;
  const locateLabel = locator.finding ? locate.finding : locate.action;

  if (groups.length === 1 && cities.length <= citySearchThreshold) {
    const [group] = groups;
    const items = [
      ...groupItems(group, selected, group.anyLive ? undefined : countrySoon(group)),
      ...(locator.available ? [{value: locateValue, label: locateLabel, icon: <CatchIcon name="nearMe" />, variant: "action" as const,
        startsSection: true, enabled: !locator.finding}] : []),
    ];
    return <>
      <CatchMenu
        align="end"
        builder={(menu) => (
          <CatchButton {...menu.triggerProps} label={selected.label} onPressed={menu.toggle} size="sm" trailingIcon="expand" variant="secondary" />
        )}
        items={items}
        label={copy.header.cityMenu}
        onSelected={(value) => value === locateValue ? void locator.run() : choose(value, "picked")}
        recipe="anchored"
        width={300}
      />
      {notice}
    </>;
  }

  const searching = cities.length > citySearchThreshold;
  const shown = filterCityGroups(groups, searching ? query : "");
  return <>
    <CatchAdaptiveSheet align="end" closeLabel={locate.close} onClose={close} open={open} title={copy.header.cityMenu}
      trigger={<CatchButton label={selected.label} onPressed={() => open ? close() : setOpen(true)} size="sm" trailingIcon="expand" variant="secondary" />}
      wide="dropdown" width={340}>
      <CatchStack gap={16}>
        {locator.available ? (
          <CatchButton label={locateLabel} leadingIcon="nearMe" onPressed={() => void locator.run()}
            size="sm" status={locator.finding ? "loading" : "idle"} variant="secondary" />
        ) : null}
        {searching ? (
          <CatchSearchField
            autofocus
            copy={{searchLabel: copy.header.citySearch.label, clearTooltip: (value) => fill(copy.header.citySearch.clear, {query: value}),
              closeSearchLabel: copy.header.citySearch.close}}
            onChanged={setQuery}
            placeholder={copy.header.citySearch.placeholder}
            semanticLabel={copy.header.citySearch.label}
            value={query}
          />
        ) : null}
        {shown.map((group) => (
          <CatchStack gap={8} key={group.isoCode}>
            <CatchText as="h3" variant="title-row">{group.name}</CatchText>
            {group.anyLive ? null : <CatchText tone="secondary" variant="body-meta">{countrySoon(group)}</CatchText>}
            <CatchMenu items={groupItems(group, selected)} label={group.name} onSelected={(slug) => choose(slug, "picked")} />
          </CatchStack>
        ))}
        {shown.length === 0 ? <CatchText tone="secondary" variant="body">{fill(copy.header.citySearch.none, {query: query.trim()})}</CatchText> : null}
        <CatchButton href={citiesHref} label={copy.header.allCities} size="sm" trailingIcon="forward" variant="quiet" />
      </CatchStack>
    </CatchAdaptiveSheet>
    {notice}
  </>;
}
