import {cleanup, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter, useLocation} from "react-router";
import {afterEach, describe, expect, it, vi} from "vitest";
import {
  CustomFormDomainGate, isCatchWebsiteHost, publicFormIdForCustomHost,
} from "./CustomFormDomainGate";
import {brand} from "@catch/brand";

function Path() {
  return <p>Authorized path: {useLocation().pathname}</p>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("custom form hostname gate", () => {
  it("keeps Catch and Firebase preview hosts on the canonical routes", () => {
    expect(isCatchWebsiteHost(brand.web.domain)).toBe(true);
    expect(isCatchWebsiteHost("catchdates-dev.web.app")).toBe(true);
    expect(isCatchWebsiteHost("catchdates-dev--review.web.app")).toBe(true);
    expect(isCatchWebsiteHost("preview.web.app")).toBe(false);
    expect(isCatchWebsiteHost("apply.client.example")).toBe(false);
  });

  it("rejects a response for another host or an invalid public ID", () => {
    expect(publicFormIdForCustomHost("apply.client.example", {
      hostname: "other.client.example", publicFormId: "public-a",
    })).toBeNull();
    expect(publicFormIdForCustomHost("apply.client.example", {
      hostname: "apply.client.example", publicFormId: "../private",
    })).toBeNull();
  });

  it("renders no other tenant while lookup is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok: false}));
    render(<MemoryRouter initialEntries={["/f/other"]}>
      <CustomFormDomainGate hostname="apply.client.example">
        <Path />
      </CustomFormDomainGate>
    </MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", {
      name: "This form is unavailable",
    })).not.toBeNull());
    expect(screen.queryByText(/Authorized path/u)).toBeNull();
  });

  it("routes an active host only to its bound public form", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok: true,
      json: async () => ({hostname: "apply.client.example", publicFormId: "public-a"})}));
    render(<MemoryRouter initialEntries={["/f/other"]}>
      <CustomFormDomainGate hostname="apply.client.example">
        <Path />
      </CustomFormDomainGate>
    </MemoryRouter>);
    await waitFor(() => expect(screen.getByText(
      "Authorized path: /f/public-a")).not.toBeNull());
  });
});
