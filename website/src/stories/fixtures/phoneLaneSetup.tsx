import {CatchField} from "@catch/web-ui";
import {activePhoneCountry} from "@content/markets";
import {phoneFieldCopy} from "@content/phoneField";
import {cleanup, render, screen} from "@testing-library/react";
import {beforeAll} from "vitest";

/*
 * The phone field's lane loads on first use (it carries the country metadata),
 * so a test would otherwise meet an inert box. Each test file loads it once
 * here; web-ui's own tests cover the loading state.
 */
beforeAll(async () => {
  // Server-side tests run without a DOM and render no fields.
  if (typeof document === "undefined") return;
  render(<CatchField copy={phoneFieldCopy} countryCode={activePhoneCountry} recipe="phone" title={phoneFieldCopy.country} />);
  await screen.findByRole("button", {name: new RegExp(phoneFieldCopy.country, "u")});
  cleanup();
});
