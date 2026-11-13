import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import {afterEach, describe, expect, it, vi} from "vitest";
import {createContext} from "react";
const {feed} = vi.hoisted(() => ({feed: vi.fn(() => ({}))}));
vi.mock("../features/organizers/usePublicEventListingsController", () => ({
  usePublicEventListingsController: feed,
  publicEventListingsContext: createContext({}),
}));
import {PublicEventListingsProvider} from "./PublicEventListingsProvider";
afterEach(cleanup);
describe("public discovery feed", () => {
  it.each(["/", "/explore", "/explore/", "/organizers/", "/organizers/afterfly/", "/events/event-id"])("enables live events for %s", (route) => {
    render(<MemoryRouter initialEntries={[route]}><PublicEventListingsProvider><span /></PublicEventListingsProvider></MemoryRouter>);
    expect(feed).toHaveBeenLastCalledWith(true);
  });
  it.each(["/host/", "/claim/", "/booking/private-event"])("does not load discovery for %s", (route) => {
    render(<MemoryRouter initialEntries={[route]}><PublicEventListingsProvider><span /></PublicEventListingsProvider></MemoryRouter>);
    expect(feed).toHaveBeenLastCalledWith(false);
  });
});
