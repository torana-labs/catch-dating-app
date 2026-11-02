import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

describe("Marketing routes", () => {
  it("resolves a draft", () => {
    const route = resolveAdminRoute("/marketing/drafts/draft%20one/copy");
    expect(route.nav).toBe("marketing-ops");
    expect(route.params.draftId).toBe("draft one");
  });

  it("preserves marketing workspace and draft-step defaults", () => {
    expect(resolveAdminRoute("/marketing").marketingTab).toBe("posts");
    expect(resolveAdminRoute("/marketing/media").marketingTab).toBe("media");
    expect(resolveAdminRoute("/marketing/drafts/a/copy")).toMatchObject({
      marketingTab: "draft", composerStep: "copy", title: "Marketing draft",
    });
    expect(resolveAdminRoute("/marketing/drafts/a/unknown")).toMatchObject({
      marketingTab: "draft", composerStep: "source", params: {draftId: "a"},
    });
  });
});
