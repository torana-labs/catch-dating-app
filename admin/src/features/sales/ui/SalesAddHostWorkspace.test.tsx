import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeAll, beforeEach, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {SalesAddHostWorkspace} from "./SalesAddHostWorkspace";

const repository = vi.hoisted(() => ({createSalesAccount: vi.fn(), nominateSalesOrganizer: vi.fn(), searchCanonicalOrganizers: vi.fn()}));
vi.mock("../api/salesRepository", () => repository);

afterEach(cleanup);
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
});
beforeEach(() => { Object.values(repository).forEach((mock) => mock.mockReset()); });

function draw(canAddExisting: boolean) {
  const {wrapper} = createQueryHarness();
  const props = {onAdded: vi.fn(), onClose: vi.fn(), onError: vi.fn(), onNotice: vi.fn()};
  render(<SalesAddHostWorkspace canAddExisting={canAddExisting} {...props} />, {wrapper});
  return props;
}

it("lets a sales associate nominate, trimming and de-duplicating links, and searches nothing", async () => {
  repository.nominateSalesOrganizer.mockResolvedValue({});
  const props = draw(false);
  expect(screen.queryByLabelText(/^Search organizers/u)).toBeNull();
  const nominate = screen.getByRole("button", {name: "Nominate"});
  expect(nominate).toHaveProperty("disabled", true);
  fireEvent.change(screen.getByLabelText(/^City/u), {target: {value: " Bengaluru "}});
  fireEvent.change(screen.getByLabelText(/^Links, one per line/u), {target: {value: "https://lu.ma/thebhag\n\n lu.ma/thebhag \nhttps://lu.ma/thebhag"}});
  expect(screen.getByRole("status").textContent).toContain('Check "lu.ma/thebhag"');
  fireEvent.change(screen.getByLabelText(/^Links, one per line/u), {target: {value: "https://lu.ma/thebhag\n https://thebhag.in \nhttps://lu.ma/thebhag"}});
  fireEvent.change(screen.getByLabelText(/^What should the reviewer know/u), {target: {value: "  Sunday long runs  "}});
  fireEvent.click(nominate);
  await waitFor(() => expect(props.onClose).toHaveBeenCalled());
  expect(repository.nominateSalesOrganizer.mock.calls[0]?.[0]).toMatchObject({
    name: null, market: "Bengaluru", urls: ["https://lu.ma/thebhag", "https://thebhag.in"], notes: "Sunday long runs", categories: []});
  expect(repository.searchCanonicalOrganizers).not.toHaveBeenCalled();
});

it("retries a failed nomination under the same request id, so the server replays it", async () => {
  repository.nominateSalesOrganizer.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({});
  const props = draw(false);
  fireEvent.change(screen.getByLabelText(/^Organizer name/u), {target: {value: "Bhag"}});
  fireEvent.change(screen.getByLabelText(/^City/u), {target: {value: "Mumbai"}});
  fireEvent.click(screen.getByRole("button", {name: "Nominate"}));
  await waitFor(() => expect(props.onError).toHaveBeenLastCalledWith("offline"));
  expect(props.onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name: "Nominate"}));
  await waitFor(() => expect(props.onClose).toHaveBeenCalled());
  const [first, second] = repository.nominateSalesOrganizer.mock.calls.map(([input]) => input);
  expect(second.requestId).toBe(first.requestId);
});

it("finds an organizer Catch lists and adds it to Sales", async () => {
  repository.searchCanonicalOrganizers.mockResolvedValue([{organizerId: "harbor", name: "Harbor", cityName: "Mumbai", publishStatus: "published"}]);
  repository.createSalesAccount.mockResolvedValue({});
  const props = draw(true);
  const add = () => screen.getByRole<HTMLButtonElement>("button", {name: "Add to Sales"});
  expect(add().disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/^Search organizers/u), {target: {value: "Harbor"}});
  fireEvent.change(await screen.findByLabelText(/^Organizer$/u), {target: {value: "harbor"}});
  fireEvent.click(add());
  await waitFor(() => expect(props.onAdded).toHaveBeenCalledWith("harbor"));
  expect(repository.createSalesAccount.mock.calls[0]?.[0]).toMatchObject({organizerId: "harbor"});
});
