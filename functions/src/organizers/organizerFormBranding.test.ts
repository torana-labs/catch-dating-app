import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {getPublicOrganizerFormHandler} from "./organizerFormResponses";
import {AudienceTestStore} from "./organizerAudienceTestStore";

const publicFormId = "organizer_branding_test_form";

async function publicOrganizer(media: Record<string, unknown>) {
  const store = new AudienceTestStore({
    "organizers/org-1": {name: "Neemwood Run Club", ...media},
    "organizerForms/form-1": {
      organizerId: "org-1", publicFormId, activeVersionId: "form-1_v1",
      publishedVersion: 1, status: "published", submittedResponseCount: 0,
    },
    "organizerFormVersions/form-1_v1": {
      organizerId: "org-1", formId: "form-1", version: 1,
      definition: {
        title: "Branding test", sections: [], logicRules: [],
        availability: {
          opensAt: null, closesAt: null, responseLimit: null,
          closedMessage: null,
        },
      },
    },
  });
  const result = await getPublicOrganizerFormHandler({
    data: {publicFormId, sourceToken: null},
  } as Parameters<typeof getPublicOrganizerFormHandler>[0], {
    firestore: () => store.asFirestore(),
    timestamp: () => admin.firestore.Timestamp.fromMillis(1000),
    checkRateLimit: async () => {},
    storageBucket: () => {
      throw new Error("Branding reads must not need Storage access");
    },
  });
  return result.organizer;
}

test("public form prefers the Host profile logo", async () => {
  assert.deepEqual(await publicOrganizer({
    logoPhoto: {url: "https://example.com/logo.png"},
    profileImageUrl: "https://example.com/legacy-logo.png",
    imageUrl: "https://example.com/gallery-cover.png",
  }), {
    organizerId: "org-1", name: "Neemwood Run Club",
    logoUrl: "https://example.com/logo.png",
  });
});

test("legacy organizer profile logos remain supported", async () => {
  const organizer = await publicOrganizer({
    logoPhoto: null, profileImageUrl: "https://example.com/legacy-logo.png",
  });
  assert.equal(organizer.logoUrl, "https://example.com/legacy-logo.png");
});

test("missing logos never fall back to gallery covers", async () => {
  for (const profileImageUrl of [undefined, null, "", "   "]) {
    const organizer = await publicOrganizer({
      logoPhoto: {url: "   "}, profileImageUrl,
      imageUrl: "https://example.com/gallery-cover.png",
    });
    assert.equal(organizer.name, "Neemwood Run Club");
    assert.equal(organizer.logoUrl, null);
  }
});
