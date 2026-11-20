import {CatchField} from "@catch/web-ui";
import {cleanup, render, screen} from "@testing-library/react";
import {beforeAll} from "vitest";
import {adminPhoneFieldCopy} from "../shared/ui/phoneFieldCopy";

/*
 * The phone field's lane loads on first use (it carries the country metadata),
 * so a test would otherwise meet an inert box. Each test file loads it once
 * here; web-ui's own tests cover the loading state.
 */
beforeAll(async () => {
  // Tests that run without a DOM render no fields.
  if (typeof document === "undefined") return;
  render(<CatchField copy={adminPhoneFieldCopy} countryCode="IN" recipe="phone" title={adminPhoneFieldCopy.country} />);
  await screen.findByRole("button", {name: new RegExp(adminPhoneFieldCopy.country, "u")});
  cleanup();
});
