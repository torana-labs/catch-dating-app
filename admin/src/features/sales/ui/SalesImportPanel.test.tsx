import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, expect, it, vi} from "vitest";
import {SalesImportWorkspace} from "./SalesImportPanel";
import type {SalesWorkspaceController} from "../controllers/useSalesWorkspaceController";
import type {SalesImportPreview} from "../api/salesTypes";

vi.mock("../../../shared/api/dataMode", () => ({dataMode: () => "live"}));
afterEach(cleanup);

it("discards a late preview when the operator changes the import", async () => {
  let resolve!: (value: SalesImportPreview) => void;
  const response = new Promise<SalesImportPreview>((done) => {resolve = done;});
  const controller = {isSaving: false, importPreviewPending: false,
    previewImport: vi.fn(() => response), applyImport: vi.fn()};
  render(<SalesImportWorkspace controller={controller as unknown as SalesWorkspaceController} />);
  expect(screen.queryByLabelText("Applied import ID")).toBeNull();
  const csv = "name,status\nExample Host,Needs research\n";
  const bytes = new TextEncoder().encode(csv);
  const file = new File([csv], "example.csv", {type: "text/csv"});
  Object.defineProperties(file, {
    text: {value: async () => csv},
    arrayBuffer: {value: async () => bytes.buffer},
  });
  fireEvent.change(screen.getByLabelText("Choose CSV"), {target: {files: [file]}});
  const preview = await screen.findByRole("button", {name: "Preview batch on server"});
  fireEvent.click(preview);
  await waitFor(() => expect(controller.previewImport).toHaveBeenCalledOnce());
  fireEvent.change(screen.getByLabelText("Import name"), {target: {value: "changed-import"}});
  await act(async () => resolve({previewHash: "a".repeat(64), rows: [],
    counts: {created: 0, matched: 0, duplicate: 0, unresolved: 1, rejected: 0},
    effectsApplied: false}));
  expect(screen.queryByRole("button", {name: "Apply reviewed batch"})).toBeNull();
  expect(controller.applyImport).not.toHaveBeenCalled();
});
