import {useState} from "react";
import {CatchButton, CatchMenu, CatchSearchField, CatchSheet, CatchStack, CatchText} from "@catch/web-ui";
import {homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {countryName} from "@content/markets";
import {cityGroups, cityPickerSublabel, citySearchThreshold, filterCityGroups, type CityGroup} from "../homeModel";
import type {HomeCity} from "../homeTypes";

function groupItems(group: CityGroup, selected: HomeCity, firstRowNote?: string) {
  return group.cities.map((item, index) => ({
    value: item.slug,
    label: item.label,
    sublabel: cityPickerSublabel(item, group) ?? (index === 0 ? firstRowNote : undefined),
    selected: item.slug === selected.slug,
    variant: "choice" as const,
  }));
}

/**
 * The header's city picker on the homepage, Explore and the city pages. One
 * country with up to eight cities opens a menu under the trigger; more
 * countries open a sheet grouped by country, which searches once there are
 * more than eight cities. A country with no city open says "launching soon"
 * once instead of marking every city.
 */
export function CityPicker({cities, onChoose, selected}: {
  cities: readonly HomeCity[];
  onChoose: (slug: string) => void;
  selected: HomeCity;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const groups = cityGroups(cities, countryName);
  const countrySoon = (group: CityGroup) => fill(copy.header.countrySoon, {country: group.name});

  if (groups.length === 1 && cities.length <= citySearchThreshold) {
    const [group] = groups;
    return (
      <CatchMenu
        align="end"
        builder={(menu) => (
          <CatchButton {...menu.triggerProps} label={selected.label} onPressed={menu.toggle} size="sm" trailingIcon="expand" variant="secondary" />
        )}
        items={groupItems(group, selected, group.anyLive ? undefined : countrySoon(group))}
        label={copy.header.cityMenu}
        onSelected={onChoose}
        recipe="anchored"
        width={300}
      />
    );
  }

  const searching = cities.length > citySearchThreshold;
  const shown = filterCityGroups(groups, searching ? query : "");
  const close = () => {
    setOpen(false);
    setQuery("");
  };
  return <>
    <CatchButton label={selected.label} onPressed={() => setOpen(true)} size="sm" trailingIcon="expand" variant="secondary" />
    <CatchSheet label={copy.header.cityMenu} onClose={close} open={open} recipe="standard" title={copy.header.cityMenu}>
      <CatchStack gap={16}>
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
            <CatchMenu
              items={groupItems(group, selected)}
              label={group.name}
              onSelected={(slug) => {
                close();
                onChoose(slug);
              }}
            />
          </CatchStack>
        ))}
        {shown.length === 0 ? <CatchText tone="secondary" variant="body">{fill(copy.header.citySearch.none, {query: query.trim()})}</CatchText> : null}
      </CatchStack>
    </CatchSheet>
  </>;
}
