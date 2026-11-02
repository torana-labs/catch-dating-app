import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

describe("Support routes", () => {
  it("resolves a conversation", () => {
    const route = resolveAdminRoute("/support/whatsapp-abc");
    expect(route.nav).toBe("support");
    expect(route.params.supportConversationId).toBe("whatsapp-abc");
  });
});
