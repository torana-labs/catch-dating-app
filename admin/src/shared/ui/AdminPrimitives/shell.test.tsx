import {cleanup, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";

import {
  AdminAccountMenu,
  AdminAppShell,
  AdminNavGroup,
  AdminSidebarToggle,
} from "./shell";

afterEach(() => cleanup());

describe("AdminAccountMenu", () => {
  it("reveals account details and returns focus when Escape closes it", async () => {
    const user = userEvent.setup();
    render(
      <AdminAccountMenu
        mode="live"
        onSignOut={() => undefined}
        roles={["admin", "analyticsViewer"]}
        userLabel="+91 91314 04263"
      />
    );

    const trigger = screen.getByRole("button", {name: "+91 91314 04263, account menu"});
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.textContent).toContain("+91 91314 04263");
    expect(trigger.textContent).not.toContain("Admin");
    expect(screen.queryByLabelText("Account details")).toBeNull();

    await user.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const details = screen.getByRole("region", {name: "Account details"});
    expect(details.textContent).toContain("+91 91314 04263");
    expect(details.textContent).toContain("Admin");
    expect(details.textContent).toContain("Analytics viewer");

    await user.keyboard("{Escape}");

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByLabelText("Account details")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps local preview context inside the disclosure", async () => {
    const user = userEvent.setup();
    render(
      <AdminAccountMenu
        mode="sample"
        roles={[]}
        userLabel="Local preview"
      />
    );

    expect(screen.queryByText(/Local preview data/u)).toBeNull();
    await user.click(screen.getByRole("button", {name: "Local preview, account menu"}));
    expect(screen.getByText(/Local preview data/u)).not.toBeNull();
  });

  it("closes the disclosure and invokes sign out", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    render(
      <AdminAccountMenu
        defaultOpen
        mode="live"
        onSignOut={onSignOut}
        roles={["admin"]}
        userLabel="admin@example.com"
      />
    );

    await user.click(screen.getByRole("button", {name: "Sign out"}));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Account details")).toBeNull();
  });
});

describe("AdminSidebarToggle", () => {
  it("announces the collapsed state and requests expansion", async () => {
    const user = userEvent.setup();
    const onCollapsedChange = vi.fn();
    render(
      <AdminAppShell sidebarCollapsed>
        <aside id="admin-sidebar">Sidebar content</aside>
        <AdminSidebarToggle
          collapsed
          controlsId="admin-sidebar"
          onCollapsedChange={onCollapsedChange}
        />
      </AdminAppShell>
    );

    const shell = screen.getByText("Sidebar content").parentElement;
    expect(shell?.classList.contains("sidebar-collapsed")).toBe(true);

    const trigger = screen.getByRole("button", {name: "Expand sidebar"});
    expect(trigger.getAttribute("aria-controls")).toBe("admin-sidebar");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await user.click(trigger);

    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });

  it("requests collapse from the expanded state", async () => {
    const user = userEvent.setup();
    const onCollapsedChange = vi.fn();
    render(
      <AdminSidebarToggle
        collapsed={false}
        controlsId="admin-sidebar"
        onCollapsedChange={onCollapsedChange}
      />
    );

    const trigger = screen.getByRole("button", {name: "Collapse sidebar"});
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    await user.click(trigger);

    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });
});

describe("AdminNavGroup", () => {
  it("keeps the group name available to assistive technology", () => {
    render(
      <AdminNavGroup label="Work queues">
        <button type="button">Safety</button>
      </AdminNavGroup>
    );

    const group = screen.getByRole("region", {name: "Work queues"});
    expect(group.textContent).toContain("Work queues");
    expect(group.textContent).toContain("Safety");
  });
});
