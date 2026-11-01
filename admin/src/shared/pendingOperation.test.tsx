import {CatchField} from "@catch/web-ui";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {useState} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {
  AdminButton,
  AdminLinkButton,
  AdminWorkspace,
} from "./ui/AdminPrimitives";
import {
  AdminPendingOperationProvider,
  useAdminPendingOperationGuard,
} from "./pendingOperation";

afterEach(() => cleanup());

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return {promise, resolve};
}

function PendingOperationHarness({
  pending,
  onConflictingStart,
  onLink,
  onSubmit,
}: {
  pending: Promise<void>;
  onConflictingStart: (started: boolean) => void;
  onLink: () => void;
  onSubmit: (payload: {note: string}) => void;
}) {
  const primaryOperation = useAdminPendingOperationGuard();
  const conflictingOperation = useAdminPendingOperationGuard();
  const [note, setNote] = useState("reviewed snapshot");

  const submit = async () => {
    const payload = {note};
    const token = primaryOperation.beginOperation();
    if (!token) return;
    onSubmit(payload);
    try {
      await pending;
    } finally {
      primaryOperation.endOperation(token);
    }
  };

  return (
    <>
      <AdminButton
        onClick={() => {
          const token = conflictingOperation.beginOperation();
          onConflictingStart(Boolean(token));
          if (token) conflictingOperation.endOperation(token);
        }}
      >
        Start conflicting operation
      </AdminButton>
      <AdminWorkspace>
        <CatchField recipe="input" title="Review note" onChanged={setNote} value={note} />
        <AdminButton onClick={() => void submit()}>Submit snapshot</AdminButton>
        <AdminLinkButton href="/other" onClick={onLink}>
          Leave workspace
        </AdminLinkButton>
      </AdminWorkspace>
    </>
  );
}

describe("AdminPendingOperationProvider", () => {
  it("freezes the visible workspace and rejects overlapping operations", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const onConflictingStart = vi.fn();
    const onLink = vi.fn();
    const onSubmit = vi.fn();

    render(
      <AdminPendingOperationProvider>
        <PendingOperationHarness
          onConflictingStart={onConflictingStart}
          onLink={onLink}
          onSubmit={onSubmit}
          pending={request.promise}
        />
      </AdminPendingOperationProvider>
    );

    await user.click(screen.getByRole("button", {name: "Submit snapshot"}));

    const workspace = screen.getByRole("main");
    const note = screen.getByRole("textbox", {name: "Review note"});
    const link = screen.getByRole("link", {name: "Leave workspace"});
    await waitFor(() => expect(workspace.getAttribute("aria-busy")).toBe("true"));

    expect(note.matches(":disabled")).toBe(true);
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("tabindex")).toBe("-1");

    await user.click(
      screen.getByRole("button", {name: "Start conflicting operation"})
    );
    fireEvent.click(link);
    await user.type(note, "changed after submit");
    const unload = new Event("beforeunload", {cancelable: true});
    window.dispatchEvent(unload);

    expect(onConflictingStart).toHaveBeenCalledWith(false);
    expect(onLink).not.toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledWith({note: "reviewed snapshot"});
    expect(note.getAttribute("value")).toBe("reviewed snapshot");
    expect(unload.defaultPrevented).toBe(true);

    request.resolve();
    await waitFor(() => expect(workspace.getAttribute("aria-busy")).toBeNull());
    expect(note.matches(":disabled")).toBe(false);
  });
});
