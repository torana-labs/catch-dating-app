import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchTicket} from "./CatchTicket";

afterEach(cleanup);

const facts = [{label: "When", value: "Tue 3 Nov"}, {label: "Doors", value: "7:30 PM"}, {label: "Places", value: "2"}];

describe("CatchTicket", () => {
  it("names itself and shows the event, the facts and the code", () => {
    render(<CatchTicket code="CATCH-7KQ2" facts={facts} format="games" guest="Tara Menon" title="Tuesday Trivia Night" />);
    expect(screen.getByRole("region", {name: "Ticket"}).dataset.status).toBe("valid");
    expect(screen.getByRole("heading", {name: "Tuesday Trivia Night"})).toBeTruthy();
    expect(screen.getByText("7:30 PM")).toBeTruthy();
    expect(screen.getByText("CATCH-7KQ2")).toBeTruthy();
    expect(screen.getByRole("img", {name: "Ticket code"})).toBeTruthy();
  });

  it("leaves the code out without one and badges a used ticket", () => {
    render(<CatchTicket facts={facts} format="run" status="used" title="Sunday Run" />);
    expect(screen.queryByRole("img", {name: "Ticket code"})).toBeNull();
    expect(screen.getByText("Used")).toBeTruthy();
  });
});
