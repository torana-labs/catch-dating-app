import test from "node:test";
import assert from "node:assert/strict";
import {adminCallableNames} from "./callable_inventory.mjs";

test("catalog and validator discovery cover central and feature-owned APIs", () => {
  assert.deepEqual(adminCallableNames(`
    httpsCallable<Request, Response>(functions, "adminLegacy")(payload);
    call("adminSalesRead", {organizerId});
    call<Request, Response>("adminSalesWrite", payload);
    call("adminSalesRead", input);
    const unrelated = "adminNotInvoked";
  `), ["adminLegacy", "adminSalesRead", "adminSalesWrite"]);
});

test("the validated boundary also covers callables without the admin prefix", () => {
  assert.deepEqual(adminCallableNames(`
    function invokeAdminCallable<RequestData, ResponseData>(name: string, payload: RequestData) {}
    invokeAdminCallable<Request, Response>("manageCommercialTerms", payload);
    invokeAdminCallable("managePaymentRoutingPolicy", payload);
    httpsCallable(functions, "getOrganizerEntitlement");
    call("proposeSalesPartnerDemoWording", payload);
  `), ["manageCommercialTerms", "managePaymentRoutingPolicy"]);
});
