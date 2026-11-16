/* eslint-disable max-len */
import {canonicalMarkets, marketForIdOrAlias, type CanonicalMarket} from "../locations/marketConfig";
import type {DraftMarketOption} from "./model";

// Which launch market an instant draft belongs to. A city the submitter gave
// (on the first request, or picked after needs_city) is used as given; else
// the market is read from where its imported events happen: each event's
// locality, the city named in its address, or its coordinates near a market
// centre, mapped to the market catalog (contracts/catalogs/markets.json).
// Events that point at different markets, or at none, leave the choice to
// the submitter rather than to staff.

/** How far from a market's centre an event still counts as in that market. */
export const MARKET_RADIUS_KM = 60;

export interface DraftEventLocation {
  locality?: unknown;
  address?: unknown;
  venue?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}

export type InferredMarket =
  | {kind: "market"; market: CanonicalMarket}
  | {kind: "ambiguous"; marketIds: string[]}
  | {kind: "unknown"};

/** The markets a draft can be saved in, as the website lists them. */
export function openDraftMarkets(): DraftMarketOption[] {
  return canonicalMarkets.filter((market) => market.hostCreatable)
    .map((market) => ({marketId: market.marketId, label: market.label}))
    .sort((left, right) => left.label.localeCompare(right.label));
}

/** An open market for this id, city name or alias, or null. */
export function openDraftMarket(value: string | null | undefined): CanonicalMarket | null {
  const market = marketForIdOrAlias(value);
  return market?.hostCreatable ? market : null;
}

/** Pure: the one market every located event points at, if there is one. */
export function inferDraftMarket(events: readonly DraftEventLocation[], organizerLocality: unknown = null): InferredMarket {
  const found = new Set<string>();
  for (const event of events) {
    const market = eventMarket(event);
    if (market) found.add(market.marketId);
  }
  if (found.size === 0) {
    const organizer = localityMarket(organizerLocality);
    return organizer ? {kind: "market", market: organizer} : {kind: "unknown"};
  }
  if (found.size > 1) return {kind: "ambiguous", marketIds: [...found].sort()};
  const market = marketForIdOrAlias([...found][0]);
  return market ? {kind: "market", market} : {kind: "unknown"};
}

/** Pure: the market one event happens in, from its locality, address, venue or coordinates. */
export function eventMarket(event: DraftEventLocation): CanonicalMarket | null {
  return localityMarket(event.locality) ?? localityMarket(event.address) ?? localityMarket(event.venue) ??
    nearestMarket(event.latitude, event.longitude);
}

/**
 * A free-text place mapped to the catalog: the whole text, then each comma
 * or pipe separated part from the most general (the end) to the most
 * specific, so "Linking Road, Bandra West, Mumbai, Maharashtra" reads Mumbai.
 */
function localityMarket(value: unknown): CanonicalMarket | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const whole = marketForIdOrAlias(value);
  if (whole) return whole;
  const parts = value.split(/[,|]/u).map((part) => part.replace(/\b\d{5,6}\b/gu, "").trim()).filter(Boolean);
  for (const part of parts.reverse()) {
    const market = marketForIdOrAlias(part);
    if (market) return market;
  }
  return null;
}

function nearestMarket(latitude: unknown, longitude: unknown): CanonicalMarket | null {
  if (typeof latitude !== "number" || typeof longitude !== "number" ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  let best: {market: CanonicalMarket; km: number} | null = null;
  for (const market of canonicalMarkets) {
    const km = distanceKm(latitude, longitude, market.latitude, market.longitude);
    if (km <= MARKET_RADIUS_KM && (!best || km < best.km)) best = {market, km};
  }
  return best?.market ?? null;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
