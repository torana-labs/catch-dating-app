import {describe, expect, it, vi} from "vitest";
import {websiteCities} from "../content/markets";
import {guessCity, reportCityGuessHeaders} from "./cityGuess";

const city = (slug: string) => websiteCities.find((item) => item.slug === slug)!;

describe("guessCity", () => {
  it("snaps the network's coordinates to the nearest listed city", () => {
    const pune = city("pune");
    const guess = guessCity(new Headers({"cf-ipcountry": "IN", "cf-iplatitude": String(pune.latitude + 0.04),
      "cf-iplongitude": String(pune.longitude - 0.03)}));
    expect(guess).toEqual({cityId: pune.id, slug: "pune", countryIsoCode: "IN", basis: "coordinates"});
  });

  it("answers Other when the coordinates are far from every listed city, without falling back to the country", () => {
    const guess = guessCity(new Headers({"cf-ipcountry": "IN", "cf-iplatitude": "26.91", "cf-iplongitude": "75.79"}));
    expect(guess).toEqual({cityId: null, slug: null, countryIsoCode: "IN", basis: "coordinates"});
  });

  it("matches a listed city the network names, including its other spellings", () => {
    const bengaluru = city("bengaluru");
    const alias = bengaluru.aliases.find((name) => name !== bengaluru.label) ?? bengaluru.label;
    expect(guessCity(new Headers({"cf-ipcountry": "IN", "cf-ipcity": alias})).slug).toBe("bengaluru");
  });

  it("falls back to the country's default city when only the country is known", () => {
    const guess = guessCity(new Headers({"cf-ipcountry": "in"}));
    expect(guess.basis).toBe("country_default");
    expect(guess.countryIsoCode).toBe("IN");
    expect(websiteCities.some((item) => item.id === guess.cityId)).toBe(true);
  });

  it("guesses nothing for a country whose default city is not listed, an unknown country, or no headers", () => {
    expect(guessCity(new Headers({"cf-ipcountry": "NP"}))).toEqual({cityId: null, slug: null, countryIsoCode: "NP", basis: "none"});
    expect(guessCity(new Headers({"cf-ipcountry": "XX"})).countryIsoCode).toBeNull();
    expect(guessCity(new Headers())).toEqual({cityId: null, slug: null, countryIsoCode: null, basis: "none"});
  });
});

describe("reportCityGuessHeaders", () => {
  it("logs header names and the basis once per distinct set, never values", () => {
    const log = vi.fn();
    const headers = new Headers({"cf-ipcountry": "IN", "cf-ipcity": "Somewhere", "x-unrelated": "1"});
    const guess = guessCity(headers);
    reportCityGuessHeaders(headers, guess, log);
    reportCityGuessHeaders(headers, guess, log);
    expect(log).toHaveBeenCalledTimes(1);
    const line = JSON.parse(log.mock.calls[0][0] as string);
    expect(line).toEqual({event: "website_city_guess_headers", present: ["cf-ipcountry", "cf-ipcity"], basis: guess.basis});
    expect(log.mock.calls[0][0]).not.toContain("Somewhere");
  });
});
