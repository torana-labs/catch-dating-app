import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeAll, expect, it, vi} from "vitest";
import type {SalesAccountDetail, SalesCustomFieldDefinition} from "../api/salesTypes";
import {SalesHostDetailsWorkspace, type SalesHostDetailsModel} from "./SalesHostDetailsWorkspace";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  HTMLDialogElement.prototype.close = function close() { this.open = false; };
});
afterEach(cleanup);

const fields: SalesCustomFieldDefinition[] = [
  {fieldId: "sales.events", label: "Events a month", type: "number", recordType: "account", helpText: "roughly", revision: 1},
  {fieldId: "sales.platform", label: "Ticket platform", type: "enum", recordType: "account", enumOptions: ["Luma", "UPI"], revision: 1},
  {fieldId: "sales.paid", label: "Sells tickets", type: "boolean", recordType: "account", revision: 1},
];
const host = (customValues: SalesAccountDetail["customValues"] = []) => ({organizerSummary: {name: "Harbor"}, customValues}) as unknown as SalesAccountDetail;
const model = (over: Partial<SalesHostDetailsModel> = {}): SalesHostDetailsModel => ({privateFields: fields, privateFieldsLoading: false,
  privateFieldsFailed: false, retryPrivateFields: vi.fn(), saveCustomValue: vi.fn(async () => true), isSaving: false, ...over});
const change = (index: number) => fireEvent.click(screen.getAllByRole("button", {name: "Change"})[index] as HTMLElement);
const save = () => screen.getByRole("button", {name: "Save"}) as HTMLButtonElement;

it("shows each field's value, in words, and says when it isn't set", () => {
  render(<SalesHostDetailsWorkspace model={model()} host={host([{fieldId: "sales.paid", value: true, revision: 2}])} />);
  expect(screen.getByText("Yes")).toBeTruthy();
  expect(screen.getAllByText("Not set")).toHaveLength(2);
});

it("saves a number as a number against the revision it opened with", async () => {
  const saveCustomValue = vi.fn(async () => true);
  render(<SalesHostDetailsWorkspace model={model({saveCustomValue})} host={host([{fieldId: "sales.events", value: 4, revision: 3}])} />);
  change(0);
  const input = screen.getByRole("textbox", {name: /Events a month/u});
  fireEvent.change(input, {target: {value: "lots"}});
  expect(screen.getByText("Enter a valid number.")).toBeTruthy();
  expect(save().disabled).toBe(true);
  fireEvent.change(input, {target: {value: "6"}});
  fireEvent.click(save());
  await waitFor(() => expect(saveCustomValue).toHaveBeenCalledWith("sales.events", 3, 6));
  await waitFor(() => expect(screen.queryByRole("button", {name: "Save"})).toBeNull());
});

it("offers a choice field's options and a yes-or-no as a boolean", async () => {
  const saveCustomValue = vi.fn(async () => true);
  render(<SalesHostDetailsWorkspace model={model({saveCustomValue})} host={host()} />);
  change(2);
  expect(save().disabled).toBe(true);
  fireEvent.change(screen.getByRole("combobox"), {target: {value: "false"}});
  fireEvent.click(save());
  await waitFor(() => expect(saveCustomValue).toHaveBeenCalledWith("sales.paid", 0, false));
});

it("stops the save when someone else changed the value, until the person takes the latest", () => {
  const {rerender} = render(<SalesHostDetailsWorkspace model={model()} host={host([{fieldId: "sales.platform", value: "Luma", revision: 1}])} />);
  change(1);
  rerender(<SalesHostDetailsWorkspace model={model()} host={host([{fieldId: "sales.platform", value: "UPI", revision: 2}])} />);
  expect(screen.getByRole("alert").textContent).toContain("It's now: UPI");
  expect(save().disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", {name: "Use the latest value"}));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(save().disabled).toBe(false);
});

it("says when fields can't load, with a retry, and where to add the first", () => {
  const retryPrivateFields = vi.fn();
  const {rerender} = render(<SalesHostDetailsWorkspace model={model({privateFields: [], privateFieldsFailed: true, retryPrivateFields})} host={host()} />);
  fireEvent.click(screen.getByRole("button", {name: "Try again"}));
  expect(retryPrivateFields).toHaveBeenCalled();
  rerender(<SalesHostDetailsWorkspace model={model({privateFields: []})} host={host()} />);
  expect(screen.getByText("No private fields yet")).toBeTruthy();
});
