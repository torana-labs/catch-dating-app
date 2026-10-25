import {expect, it} from "vitest";
import {isPrivateShellPath, privateShellFamily, privateShellHead, privateShellSurface} from "./privateShellMetadata";

it("treats only the shell route itself as the terminal rewrite target", () => {
  expect(isPrivateShellPath("/private-shell")).toBe(true);
  expect(isPrivateShellPath("/private-shell/")).toBe(true);
  for (const path of ["/", "/f/token/", "/private-shell-x/", "/private-shell/f/", "/host/"]) {
    expect(isPrivateShellPath(path)).toBe(false);
  }
});

it("maps credential routes to a public family enum only", () => {
  expect(privateShellFamily("/f/secret-token/")).toBe("f");
  expect(privateShellFamily("/rsvp/abc/")).toBe("rsvp");
  expect(privateShellFamily("/offer/")).toBe("offer");
  expect(privateShellFamily("/offer/abc/")).toBeNull();
  expect(privateShellFamily("/private-shell/")).toBeNull();
});

it("writes family metadata and falls back to the bare title for unknown families", () => {
  const form = privateShellHead("f");
  expect(form.startsWith('<title>Organizer form | Catch</title><meta name="description" content="Complete a secure organizer form in your browser without downloading an app."><link rel="canonical" href="https://catchdates.com/f/">')).toBe(true);
  expect(form).toMatch(/<meta property="og:image" content="https:\/\/catchdates\.com\/assets\/og\/form\.png\?v=[0-9a-f]{12}">/);
  expect(form).toContain('<meta name="twitter:card" content="summary_large_image">');
  expect(privateShellHead("rsvp")).toMatch(/og:image" content="https:\/\/catchdates\.com\/assets\/og\/default\.png/);
  expect(privateShellHead(null)).toBe("<title>Catch</title>");
  expect(privateShellHead("constructor")).toBe("<title>Catch</title>");
});

it("finds the family whether Next proxies the shell rewrite or performs it internally", () => {
  const surface = (url: string) => privateShellSurface(new URL(url, "https://catchdates.com"));
  // Self-proxied rewrite: the shell URL carries the family enum.
  expect(surface("/private-shell/?surface=f")).toBe("f");
  expect(surface("/private-shell?surface=offer")).toBe("offer");
  // Internal rewrite (Cloud Run): the handler sees the visitor's original URL.
  expect(surface("/f/__catch_public_form_route_probe__/")).toBe("f");
  expect(surface("/booking/event/?razorpay_payment_id=pay_x")).toBe("booking");
  // Unknown hosts on public paths, and forged values, keep the bare shell.
  expect(surface("/organizers/club/")).toBeNull();
  expect(surface("/private-shell/")).toBeNull();
  expect(surface("/f/token/?surface=constructor")).toBeNull();
  expect(surface("/f/token/?surface=")).toBeNull();
});
