// Firestore rules: organizers, and the legacy clubs collection they replace.
// Shared fixtures and the emulator lifecycle live in rulesHarness.cjs.
const {
  Timestamp,
  assert,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  deleteDoc,
  describe,
  doc,
  documentId,
  event,
  getDoc,
  getDocs,
  increment,
  it,
  limit,
  or,
  orderBy,
  organizer,
  organizerEventSuccessLayout,
  organizerEventVenue,
  query,
  review,
  seed,
  setDoc,
  startAfter,
  updateDoc,
  useRulesEnvironment,
  where,
} = require("./rulesHarness.cjs");

let testEnv;

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("organizers", () => {
    it("exposes organizer profiles but keeps profile writes callable-owned", async () => {
      await seed(["organizers", "organizer-1"], organizer({
        ownerUserId: "owner-1",
        hostUserIds: ["owner-1", "manager-1"],
        organizerType: "club",
        organizerPhotos: [],
        followerCount: 0,
      }));

      await assertSucceeds(
        getDoc(doc(
          testEnv.unauthenticatedContext().firestore(),
          "organizers",
          "organizer-1",
        )),
      );
      await assertFails(
        updateDoc(doc(authedDb("owner-1"), "organizers", "organizer-1"), {
          organizerType: "venue",
        }),
      );
      await assertFails(
        setDoc(doc(authedDb("owner-1"), "organizers", "organizer-2"), {
          name: "Direct organizer",
        }),
      );
      await assertFails(
        deleteDoc(doc(authedDb("owner-1"), "organizers", "organizer-1")),
      );
    });

    it("lists only organizers the app shows, or ones the reader hosts or owns", async () => {
      await seed(["organizers", "shown"], organizer({appVisibility: "discoverable", locationMarketId: "mumbai",
        hostUserIds: ["host-1"]}));
      await seed(["organizers", "draft"], organizer({appVisibility: "hidden", locationMarketId: "mumbai",
        hostUserId: null, ownerUserId: null, hostUserIds: [], provenance: {source: "supply_intake"}}));
      await seed(["organizers", "mine"], organizer({appVisibility: "hidden", locationMarketId: "mumbai",
        hostUserId: "host-2", ownerUserId: "host-2", hostUserIds: ["host-2"]}));
      const anonymous = testEnv.unauthenticatedContext().firestore();

      // Browse lists must ask for discoverable organizers.
      const shown = await assertSucceeds(getDocs(query(collection(anonymous, "organizers"),
        where("locationMarketId", "==", "mumbai"), where("appVisibility", "==", "discoverable"))));
      assert.deepEqual(shown.docs.map((document) => document.id), ["shown"]);
      await assertFails(getDocs(query(collection(anonymous, "organizers"),
        where("locationMarketId", "==", "mumbai"))));
      await assertFails(getDocs(collection(authedDb("member-1"), "organizers")));
      // An id-list query is checked against each matched document, so it
      // cannot reach a hidden organizer; the app reads by single id instead.
      await assertFails(getDocs(query(collection(anonymous, "organizers"),
        where(documentId(), "in", ["shown", "draft"]))));

      // Hosts and owners list their own organizers, hidden ones included.
      const hosted = await assertSucceeds(getDocs(query(collection(authedDb("host-2"), "organizers"),
        where("hostUserIds", "array-contains", "host-2"))));
      assert.deepEqual(hosted.docs.map((document) => document.id), ["mine"]);
      await assertSucceeds(getDocs(query(collection(authedDb("host-2"), "organizers"),
        where("ownerUserId", "==", "host-2"))));
      // The host app's own queries, as the repository sends them.
      await assertSucceeds(getDocs(query(collection(authedDb("host-2"), "organizers"),
        or(where("hostUserId", "==", "host-2"), where("hostUserIds", "array-contains", "host-2")))));
      await assertSucceeds(getDocs(query(collection(authedDb("host-2"), "organizers"),
        or(where("hostUserId", "==", "host-2"), where("ownerUserId", "==", "host-2")))));
      await assertFails(getDocs(query(collection(authedDb("member-1"), "organizers"),
        where("hostUserIds", "array-contains", "host-2"))));

      // A single organizer by id stays readable, so chats and deep links resolve.
      await assertSucceeds(getDoc(doc(anonymous, "organizers", "draft")));
    });

    it("serves publicOrganizers by id, lists only shown ones and never accepts writes", async () => {
      await seed(["publicOrganizers", "shown"], {name: "Shown", appVisibility: "discoverable",
        locationMarketId: "mumbai"});
      await seed(["publicOrganizers", "hidden"], {name: "Hidden", appVisibility: "hidden",
        locationMarketId: "mumbai"});
      const anonymous = testEnv.unauthenticatedContext().firestore();

      await assertSucceeds(getDoc(doc(anonymous, "publicOrganizers", "hidden")));
      const shown = await assertSucceeds(getDocs(query(collection(anonymous, "publicOrganizers"),
        where("locationMarketId", "==", "mumbai"), where("appVisibility", "==", "discoverable"))));
      assert.deepEqual(shown.docs.map((document) => document.id), ["shown"]);
      await assertFails(getDocs(query(collection(anonymous, "publicOrganizers"),
        where("locationMarketId", "==", "mumbai"))));
      await assertFails(setDoc(doc(authedDb("host-1"), "publicOrganizers", "mine"), {name: "Mine"}));
      await assertFails(updateDoc(doc(authedDb("host-1"), "publicOrganizers", "shown"), {name: "Edit"}));
      await assertFails(deleteDoc(doc(authedDb("host-1"), "publicOrganizers", "shown")));
    });

    it("scopes team and follow reads while keeping writes callable-owned", async () => {
      await seed(["organizers", "organizer-1"], {
        ownerUserId: "owner-1",
        hostUserId: "owner-1",
        hostUserIds: ["owner-1", "manager-1"],
      });
      await seed(["organizerTeamMemberships", "organizer-1_manager-1"], {
        organizerId: "organizer-1",
        uid: "manager-1",
        role: "manager",
        status: "active",
      });
      await seed(["organizerFollows", "organizer-1_runner-1"], {
        organizerId: "organizer-1",
        uid: "runner-1",
        status: "active",
        pushNotificationsEnabled: true,
      });

      await assertSucceeds(getDoc(doc(
        authedDb("manager-1"),
        "organizerTeamMemberships",
        "organizer-1_manager-1",
      )));
      await assertSucceeds(getDoc(doc(
        authedDb("owner-1"),
        "organizerTeamMemberships",
        "organizer-1_manager-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-1"),
        "organizerTeamMemberships",
        "organizer-1_manager-1",
      )));
      await assertSucceeds(getDoc(doc(
        authedDb("runner-1"),
        "organizerFollows",
        "organizer-1_runner-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-2"),
        "organizerFollows",
        "organizer-1_runner-1",
      )));
      await assertFails(updateDoc(doc(
        authedDb("runner-1"),
        "organizerFollows",
        "organizer-1_runner-1",
      ), {status: "inactive"}));
    });

    it("limits reusable Event Success layouts to organizer managers", async () => {
      await seed(["organizers", "organizer-1"], {
        ownerUserId: "owner-1",
        hostUserId: "owner-1",
        hostUserIds: ["owner-1", "manager-1"],
      });
      await seed(
        ["organizerEventSuccessLayouts", "organizer-1_layout-1"],
        organizerEventSuccessLayout(),
      );

      const managerDb = authedDb("manager-1");
      await assertSucceeds(getDoc(doc(
        managerDb,
        "organizerEventSuccessLayouts",
        "organizer-1_layout-1",
      )));
      await assertSucceeds(getDocs(query(
        collection(managerDb, "organizerEventSuccessLayouts"),
        where("organizerId", "==", "organizer-1"),
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-1"),
        "organizerEventSuccessLayouts",
        "organizer-1_layout-1",
      )));
      await assertFails(getDocs(query(
        collection(authedDb("runner-1"), "organizerEventSuccessLayouts"),
        where("organizerId", "==", "organizer-1"),
      )));
      await assertFails(updateDoc(doc(
        managerDb,
        "organizerEventSuccessLayouts",
        "organizer-1_layout-1",
      ), {label: "Client edit"}));
      await assertFails(setDoc(doc(
        managerDb,
        "organizerEventSuccessLayouts",
        "organizer-1_layout-2",
      ), organizerEventSuccessLayout({layoutId: "layout-2"})));
    });

    it("limits saved event venues to organizer managers", async () => {
      await seed(["organizers", "organizer-1"], {
        ownerUserId: "owner-1",
        hostUserId: "owner-1",
        hostUserIds: ["owner-1", "manager-1"],
      });
      await seed(
        ["organizerEventVenues", "organizer-1_venue-1"],
        organizerEventVenue(),
      );

      const managerDb = authedDb("manager-1");
      await assertSucceeds(getDoc(doc(
        managerDb,
        "organizerEventVenues",
        "organizer-1_venue-1",
      )));
      await assertSucceeds(getDocs(query(
        collection(managerDb, "organizerEventVenues"),
        where("organizerId", "==", "organizer-1"),
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-1"),
        "organizerEventVenues",
        "organizer-1_venue-1",
      )));
      await assertFails(updateDoc(doc(
        managerDb,
        "organizerEventVenues",
        "organizer-1_venue-1",
      ), {label: "Client edit"}));
      await assertFails(setDoc(doc(
        managerDb,
        "organizerEventVenues",
        "organizer-1_venue-2",
      ), organizerEventVenue({venueId: "venue-2"})));
    });

    it("keeps contact notes and manual-tag vocabularies callable-only", async () => {
      const createdAt = Timestamp.fromDate(
        new Date("2026-08-16T10:00:00.000Z"),
      );
      await seed(["organizers", "organizer-1"], {
        ownerUserId: "owner-1",
        hostUserId: "owner-1",
        hostUserIds: ["owner-1"],
      });
      await seed(["organizers", "organizer-2"], {
        ownerUserId: "owner-2",
        hostUserId: "owner-2",
        hostUserIds: ["owner-2"],
      });
      await seed(["organizerContactNotes", "note-2"], {
        organizerId: "organizer-2",
        contactId: "contact-2",
        authorUid: "owner-2",
        body: "Brings friends",
        revision: 1,
        createdAt,
        updatedAt: createdAt,
        updatedByUid: "owner-2",
      });
      await seed(["organizerContactTagVocabularies", "organizer-2"], {
        organizerId: "organizer-2",
        tags: [],
        updatedAt: createdAt,
      });
      await seed(["organizerContactOutreach", "outreach-2"], {
        organizerId: "organizer-2",
        contactId: "contact-2",
        authorUid: "owner-2",
        channel: "phoneCall",
        outcome: "noAnswer",
        occurredAt: createdAt,
        revision: 1,
        createdAt,
        updatedAt: createdAt,
        updatedByUid: "owner-2",
      });

      for (const uid of ["owner-2", "owner-1"]) {
        const db = authedDb(uid);
        await assertFails(getDoc(doc(db, "organizerContactNotes", "note-2")));
        await assertFails(getDocs(query(
          collection(db, "organizerContactNotes"),
          where("organizerId", "==", "organizer-2"),
        )));
        await assertFails(getDoc(doc(
          db,
          "organizerContactOutreach",
          "outreach-2",
        )));
        await assertFails(getDocs(query(
          collection(db, "organizerContactOutreach"),
          where("organizerId", "==", "organizer-2"),
        )));
        await assertFails(getDoc(doc(
          db,
          "organizerContactTagVocabularies",
          "organizer-2",
        )));
      }
      await assertFails(setDoc(doc(
        authedDb("owner-2"),
        "organizerContactNotes",
        "note-client",
      ), {
        organizerId: "organizer-2",
        contactId: "contact-2",
        body: "Client write",
      }));
      await assertFails(setDoc(doc(
        authedDb("owner-2"),
        "organizerContactOutreach",
        "outreach-client",
      ), {
        organizerId: "organizer-2",
        contactId: "contact-2",
        channel: "phoneCall",
        outcome: "reached",
      }));
      await assertFails(updateDoc(doc(
        authedDb("owner-2"),
        "organizerContactTagVocabularies",
        "organizer-2",
      ), {tags: ["client-write"]}));
    });

    it("keeps organizer claims and schedule locks server-only", async () => {
      await seed(["organizerClaimRequests", "claim-1"], {
        organizerId: "organizer-1",
        requesterUid: "owner-1",
        status: "pending",
      });
      await seed(["organizerScheduleLocks", "lock-1"], {
        organizerId: "organizer-1",
        eventId: "event-1",
      });

      await assertFails(getDoc(doc(
        authedDb("owner-1"),
        "organizerClaimRequests",
        "claim-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("owner-1"),
        "organizerScheduleLocks",
        "lock-1",
      )));
    });

    it("lets a requester follow only their own claim verification", async () => {
      await seed(["organizerClaimVerifications", "attempt-1"], {
        attemptId: "attempt-1",
        organizerId: "organizer-1",
        requesterUid: "owner-1",
        status: "awaitingProof",
        code: "482173",
      });
      await seed(["organizerClaimInstagramCodes", "482173"], {
        code: "482173",
        attemptId: "attempt-1",
      });
      await seed(["organizerClaimInstagramMessages", "message-1"], {
        messageKey: "message-1",
        outcome: "verified",
      });
      await seed(["instagramAccessTokens", "17841400000000001"], {
        accountId: "17841400000000001",
        secretVersion: null,
      });

      const own = doc(authedDb("owner-1"), "organizerClaimVerifications",
        "attempt-1");
      await assertSucceeds(getDoc(own));
      await assertFails(updateDoc(own, {status: "verified"}));
      await assertFails(getDoc(doc(authedDb("owner-2"),
        "organizerClaimVerifications", "attempt-1")));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),
        "organizerClaimVerifications", "attempt-1")));
      await assertFails(getDocs(collection(authedDb("owner-1"),
        "organizerClaimVerifications")));
      for (const [name, id] of [["organizerClaimInstagramCodes", "482173"],
        ["organizerClaimInstagramMessages", "message-1"],
        ["instagramAccessTokens", "17841400000000001"]]) {
        await assertFails(getDoc(doc(authedDb("owner-1"), name, id)));
        await assertFails(setDoc(doc(authedDb("owner-1"), name, id), {}));
      }
    });

    it("keeps public page read models and build markers server-only", async () => {
      // Published, withdrawn and suppressed pages are all Admin SDK reads.
      for (const [id, organizerId] of [["published", "organizer-1"],
        ["suppressed", "organizer-2"]]) {
        await seed(["organizerPublicPage", id], {
          schemaVersion: 1,
          organizerId,
          path: `/organizers/${id}/`,
          recommendable: true,
        });
        await seed(["eventPublicPage", `event-${id}`], {
          schemaVersion: 1,
          eventId: `event-${id}`,
          organizerId,
        });
      }
      await seed(["publicPageBuilds", "organizer-1"], {
        schemaVersion: 1,
        organizerId: "organizer-1",
        published: true,
        eventPageCount: 1,
      });

      for (const db of [authedDb("owner-1"),
        testEnv.unauthenticatedContext().firestore()]) {
        for (const [name, id] of [["organizerPublicPage", "published"],
          ["organizerPublicPage", "suppressed"],
          ["organizerPublicPage", "withdrawn"],
          ["eventPublicPage", "event-published"],
          ["publicPageBuilds", "organizer-1"]]) {
          await assertFails(getDoc(doc(db, name, id)));
          await assertFails(setDoc(doc(db, name, `client-${id}`), {
            schemaVersion: 1,
          }));
        }
        await assertFails(getDocs(query(
          collection(db, "organizerPublicPage"),
          where("path", "==", "/organizers/published/"),
          limit(2),
        )));
        await assertFails(getDocs(query(
          collection(db, "eventPublicPage"),
          where("organizerId", "==", "organizer-1"),
        )));
        await assertFails(updateDoc(doc(db, "organizerPublicPage",
          "published"), {recommendable: false}));
        await assertFails(deleteDoc(doc(db, "eventPublicPage",
          "event-published")));
      }
    });

    it("keeps city plans read models server-only", async () => {
      for (const [citySlug, status] of [["mumbai", "live"],
        ["pune", "launchingSoon"]]) {
        await seed(["cityPlans", citySlug], {
          schemaVersion: 1,
          citySlug,
          status,
          planCount: 0,
        });
      }

      for (const db of [authedDb("owner-1"),
        testEnv.unauthenticatedContext().firestore()]) {
        for (const id of ["mumbai", "pune", "missing"]) {
          await assertFails(getDoc(doc(db, "cityPlans", id)));
          await assertFails(setDoc(doc(db, "cityPlans", `client-${id}`), {
            schemaVersion: 1,
          }));
        }
        await assertFails(getDocs(query(collection(db, "cityPlans"),
          where("status", "==", "live"))));
        await assertFails(updateDoc(doc(db, "cityPlans", "mumbai"),
          {status: "launchingSoon"}));
        await assertFails(deleteDoc(doc(db, "cityPlans", "pune")));
      }
    });

    it("lets managers listen to their own open organizer attention rows", async () => {
      const managed = (overrides = {}) =>
        organizer({status: "active", archived: false, ...overrides});
      await seed(["organizers", "org"], managed({hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], managed({hostUserId: "other-host"}));
      const row = (organizerId, status, iso) => ({
        organizerId,
        kind: "eventWaitlistReview",
        status,
        dueAt: Timestamp.fromDate(new Date(iso)),
      });
      await seed(["organizerAttentionItems", "own-later"],
        row("org", "open", "2026-09-03T10:00:00.000Z"));
      await seed(["organizerAttentionItems", "own-sooner"],
        row("org", "open", "2026-09-02T10:00:00.000Z"));
      await seed(["organizerAttentionItems", "own-resolved"],
        row("org", "resolved", "2026-09-01T10:00:00.000Z"));
      await seed(["organizerAttentionItems", "foreign"],
        row("other", "open", "2026-09-02T10:00:00.000Z"));

      for (const uid of ["host-1", "manager"]) {
        const db = authedDb(uid);
        const items = collection(db, "organizerAttentionItems");
        // The Today listener's exact query shape.
        const open = await assertSucceeds(getDocs(query(items,
          where("organizerId", "==", "org"),
          where("status", "==", "open"),
          orderBy("dueAt"),
          orderBy(documentId()),
          limit(400))));
        assert.deepEqual(open.docs.map((item) => item.id),
          ["own-sooner", "own-later"]);
        await assertSucceeds(getDoc(doc(db, "organizerAttentionItems",
          "own-later")));
        await assertFails(getDocs(query(items,
          where("status", "==", "open"))));
        await assertFails(getDocs(items));
        await assertFails(getDoc(doc(db, "organizerAttentionItems",
          "foreign")));
        await assertFails(getDocs(query(items,
          where("organizerId", "==", "other"),
          where("status", "==", "open"))));
        await assertFails(setDoc(doc(db, "organizerAttentionItems",
          `client-${uid}`), row("org", "open", "2026-09-02T10:00:00.000Z")));
        await assertFails(updateDoc(doc(db, "organizerAttentionItems",
          "own-later"), {status: "resolved"}));
        await assertFails(deleteDoc(doc(db, "organizerAttentionItems",
          "own-later")));
      }
      await assertFails(getDoc(doc(authedDb("other-host"),
        "organizerAttentionItems", "own-later")));

      await seed(["deletedUsers", "host-1"], {deletedAt: Timestamp.now()});
      await assertFails(getDoc(doc(authedDb("host-1"),
        "organizerAttentionItems", "own-later")));
      await assertFails(getDocs(query(
        collection(authedDb("host-1"), "organizerAttentionItems"),
        where("organizerId", "==", "org"),
        where("status", "==", "open"))));
    });

    it("lets managers get their organizer attention schedule and nothing else", async () => {
      const managed = (overrides = {}) =>
        organizer({status: "active", archived: false, ...overrides});
      await seed(["organizers", "org"], managed({hostUserIds: ["manager"]}));
      await seed(["organizers", "fresh"], managed());
      await seed(["organizers", "other"], managed({hostUserId: "other-host"}));
      const schedule = (organizerId) => ({
        schemaVersion: 1,
        organizerId,
        policyVersion: 4,
        revision: 3,
        evaluatedAt: Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z")),
        nextEvaluationAt: null,
        sourceCoverage: "complete",
        incompleteSource: null,
        openItemCount: 0,
      });
      await seed(["organizerAttentionSchedules", "org"], schedule("org"));
      await seed(["organizerAttentionSchedules", "other"], schedule("other"));

      for (const uid of ["host-1", "manager"]) {
        const db = authedDb(uid);
        const own = await assertSucceeds(getDoc(doc(db,
          "organizerAttentionSchedules", "org")));
        assert.equal(own.exists(), true);
        await assertFails(getDocs(collection(db,
          "organizerAttentionSchedules")));
        await assertFails(getDocs(query(collection(db,
          "organizerAttentionSchedules"), where("organizerId", "==", "org"))));
        await assertFails(setDoc(doc(db, "organizerAttentionSchedules",
          "org"), schedule("org")));
        await assertFails(updateDoc(doc(db, "organizerAttentionSchedules",
          "org"), {sourceCoverage: "complete"}));
        await assertFails(deleteDoc(doc(db, "organizerAttentionSchedules",
          "org")));
        await assertFails(getDoc(doc(db, "organizerAttentionSchedules",
          "other")));
      }
      // Not evaluated yet: the manager reads it as missing.
      const missing = await assertSucceeds(getDoc(doc(authedDb("host-1"),
        "organizerAttentionSchedules", "fresh")));
      assert.equal(missing.exists(), false);
      await assertFails(getDoc(doc(authedDb("other-host"),
        "organizerAttentionSchedules", "org")));
      await assertFails(setDoc(doc(authedDb("host-1"),
        "organizerAttentionSchedules", "fresh"), schedule("fresh")));
    });

    describe("create flow setup reads", () => {
      const managed = (overrides = {}) =>
        organizer({status: "active", archived: false, ...overrides});
      const evaluatedAt = Timestamp.fromDate(
        new Date("2026-09-01T10:00:00.000Z"));
      async function seedOrganizers() {
        await seed(["organizers", "org"], managed({hostUserIds: ["manager"]}));
        await seed(["organizers", "fresh"], managed());
        await seed(["organizers", "other"],
          managed({hostUserId: "other-host"}));
      }
      async function assertGetOnly(collectionName, ownId, foreignId,
        document) {
        for (const uid of ["host-1", "manager"]) {
          const db = authedDb(uid);
          const own = await assertSucceeds(getDoc(doc(db, collectionName,
            ownId)));
          assert.equal(own.exists(), true);
          await assertFails(getDoc(doc(db, collectionName, foreignId)));
          await assertFails(getDocs(collection(db, collectionName)));
          await assertFails(getDocs(query(collection(db, collectionName),
            where("organizerId", "==", "org"))));
          await assertFails(setDoc(doc(db, collectionName, ownId), document));
          await assertFails(updateDoc(doc(db, collectionName, ownId),
            {revision: 9}));
          await assertFails(deleteDoc(doc(db, collectionName, ownId)));
          await assertFails(setDoc(doc(db, collectionName, "forged"),
            document));
        }
        await assertFails(getDoc(doc(authedDb("other-host"), collectionName,
          ownId)));
        await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
          .firestore(), collectionName, ownId)));
      }
      async function assertDeletedUserDenied(collectionName, ownId) {
        await seed(["deletedUsers", "host-1"], {deletedAt: Timestamp.now()});
        await assertFails(getDoc(doc(authedDb("host-1"), collectionName,
          ownId)));
      }
      async function assertArchivedDenied(collectionName, ownId) {
        await assertSucceeds(getDoc(doc(authedDb("host-1"), collectionName,
          ownId)));
        await seed(["organizers", "org"], managed({hostUserIds: ["manager"],
          status: "archived", archived: true}));
        await assertFails(getDoc(doc(authedDb("host-1"), collectionName,
          ownId)));
        await seed(["organizers", "org"], managed({hostUserIds: ["manager"],
          status: "inactive"}));
        await assertFails(getDoc(doc(authedDb("manager"), collectionName,
          ownId)));
      }

      it("lets active managers get their event setup views and nothing else", async () => {
        await seedOrganizers();
        const view = (organizerId, eventId) => ({schemaVersion: 1, eventId,
          organizerId, setupRevision: 2, revision: 1, evaluatedAt,
          sourceCoverage: "complete", incompleteSource: null, summary: null});
        await seed(["hostEventSetupViews", "own"], view("org", "own"));
        await seed(["hostEventSetupViews", "foreign"],
          view("other", "foreign"));
        await assertGetOnly("hostEventSetupViews", "own", "foreign",
          view("org", "own"));
        // Not written yet, just after create: it reads as missing.
        const missing = await assertSucceeds(getDoc(doc(authedDb("host-1"),
          "hostEventSetupViews", "just-created")));
        assert.equal(missing.exists(), false);
        await assertArchivedDenied("hostEventSetupViews", "own");
        await seed(["organizers", "org"], managed({hostUserIds: ["manager"]}));
        await assertDeletedUserDenied("hostEventSetupViews", "own");
      });

      it("lets active managers get their setup defaults view and nothing else", async () => {
        await seedOrganizers();
        const view = (organizerId) => ({schemaVersion: 1, organizerId,
          revision: 1, evaluatedAt, sourceCoverage: "complete",
          incompleteSource: null, view: null});
        await seed(["hostEventSetupDefaultViews", "org"], view("org"));
        await seed(["hostEventSetupDefaultViews", "other"], view("other"));
        await assertGetOnly("hostEventSetupDefaultViews", "org", "other",
          view("org"));
        const missing = await assertSucceeds(getDoc(doc(authedDb("host-1"),
          "hostEventSetupDefaultViews", "fresh")));
        assert.equal(missing.exists(), false);
        await assertArchivedDenied("hostEventSetupDefaultViews", "org");
        await seed(["organizers", "org"], managed({hostUserIds: ["manager"]}));
        await assertDeletedUserDenied("hostEventSetupDefaultViews", "org");
      });

      it("lets managers get event setup preferences and nothing else", async () => {
        await seedOrganizers();
        const preferences = (organizerId, eventId) => ({organizerId, eventId,
          revision: 1, preferences: {}, paymentTerms: {},
          updatedByUid: "host-1", updatedAt: evaluatedAt});
        await seed(["eventSetupPreferences", "own"], preferences("org", "own"));
        await seed(["eventSetupPreferences", "foreign"],
          preferences("other", "foreign"));
        await assertGetOnly("eventSetupPreferences", "own", "foreign",
          preferences("org", "own"));
        // An event without saved settings reads as missing.
        const missing = await assertSucceeds(getDoc(doc(authedDb("host-1"),
          "eventSetupPreferences", "unsaved")));
        assert.equal(missing.exists(), false);
        await assertDeletedUserDenied("eventSetupPreferences", "own");
      });

      it("lets managers get their rehearsal milestone and nothing else", async () => {
        await seedOrganizers();
        const milestone = (organizerId) => ({organizerId,
          completedAt: evaluatedAt});
        await seed(["eventRehearsalMilestones", "org"], milestone("org"));
        await seed(["eventRehearsalMilestones", "other"], milestone("other"));
        await assertGetOnly("eventRehearsalMilestones", "org", "other",
          milestone("org"));
        // Not completed yet: the manager reads it as missing.
        const missing = await assertSucceeds(getDoc(doc(authedDb("host-1"),
          "eventRehearsalMilestones", "fresh")));
        assert.equal(missing.exists(), false);
        await assertDeletedUserDenied("eventRehearsalMilestones", "org");
      });
    });

    it("lets managers get their door read models and nothing else", async () => {
      const managed = (overrides = {}) =>
        organizer({status: "active", archived: false, ...overrides});
      await seed(["organizers", "org"], managed({hostUserIds: ["manager"]}));
      await seed(["organizers", "fresh"], managed());
      await seed(["organizers", "other"], managed({hostUserId: "other-host"}));
      const evaluatedAt = Timestamp.fromDate(new Date("2026-09-01T10:00:00Z"));
      const byOrganizer = {
        hostProviderConnectionViews: (organizerId) => ({schemaVersion: 1,
          organizerId, revision: 1, evaluatedAt, sourceCoverage: "complete",
          incompleteSource: null, connections: []}),
        hostOrganizerSpendProjections: (organizerId) => ({schemaVersion: 1,
          organizerId, topQuartileThresholdByCurrency: {INR: 5000},
          spendCoverage: "catchPaymentsOnly", revision: 1, evaluatedAt}),
      };
      for (const [name, view] of Object.entries(byOrganizer)) {
        await seed([name, "org"], view("org"));
        await seed([name, "other"], view("other"));
        for (const uid of ["host-1", "manager"]) {
          const db = authedDb(uid);
          const own = await assertSucceeds(getDoc(doc(db, name, "org")));
          assert.equal(own.exists(), true);
          await assertFails(getDoc(doc(db, name, "other")));
          await assertFails(getDocs(collection(db, name)));
          await assertFails(getDocs(query(collection(db, name),
            where("organizerId", "==", "org"))));
          await assertFails(setDoc(doc(db, name, "org"), view("org")));
          await assertFails(updateDoc(doc(db, name, "org"), {revision: 2}));
          await assertFails(deleteDoc(doc(db, name, "org")));
        }
        // Not written yet: the manager reads it as missing.
        const missing = await assertSucceeds(getDoc(doc(authedDb("host-1"),
          name, "fresh")));
        assert.equal(missing.exists(), false);
        await assertFails(getDoc(doc(authedDb("operator-1"), name, "org")));
        await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
          .firestore(), name, "org")));
      }

      const rosterView = (organizerId) => ({schemaVersion: 1,
        eventId: `event-${organizerId}`, organizerId, cutoffAtMillis: 1,
        revision: 1, evaluatedAt, sourceCoverage: "exact",
        incompleteSource: null, rows: []});
      await seed(["hostEventRosterInsightViews", "event-org"], rosterView("org"));
      await seed(["hostEventRosterInsightViews", "event-other"],
        rosterView("other"));
      for (const uid of ["host-1", "manager"]) {
        const db = authedDb(uid);
        await assertSucceeds(getDoc(doc(db, "hostEventRosterInsightViews",
          "event-org")));
        await assertFails(getDoc(doc(db, "hostEventRosterInsightViews",
          "event-other")));
        await assertFails(getDocs(query(collection(db,
          "hostEventRosterInsightViews"), where("organizerId", "==", "org"))));
        await assertFails(setDoc(doc(db, "hostEventRosterInsightViews",
          "event-org"), rosterView("org")));
        await assertFails(deleteDoc(doc(db, "hostEventRosterInsightViews",
          "event-org")));
      }
      const unwritten = await assertSucceeds(getDoc(doc(authedDb("host-1"),
        "hostEventRosterInsightViews", "event-new")));
      assert.equal(unwritten.exists(), false);

      // The per-account totals behind the thresholds are never readable.
      await seed(["organizerSpendTotals", "org"], {organizerId: "org",
        byUid: {"runner-1": {byCurrency: {INR: {amountMinor: 9000,
          paidOrderCount: 2}}}}});
      for (const uid of ["host-1", "manager", "runner-1"]) {
        await assertFails(getDoc(doc(authedDb(uid), "organizerSpendTotals",
          "org")));
        await assertFails(setDoc(doc(authedDb(uid), "organizerSpendTotals",
          "org"), {organizerId: "org"}));
      }

      // The callables these replace refused no archived organizer.
      await seed(["organizers", "org"], managed({status: "archived",
        archived: true, hostUserIds: ["manager"]}));
      await assertSucceeds(getDoc(doc(authedDb("host-1"),
        "hostProviderConnectionViews", "org")));
      await assertSucceeds(getDoc(doc(authedDb("host-1"),
        "hostEventRosterInsightViews", "event-org")));
      await seed(["deletedUsers", "host-1"], {deletedAt: Timestamp.now()});
      for (const [name, id] of [["hostProviderConnectionViews", "org"],
        ["hostOrganizerSpendProjections", "org"],
        ["hostEventRosterInsightViews", "event-org"]]) {
        await assertFails(getDoc(doc(authedDb("host-1"), name, id)));
      }
    });

    it("lets managers get their own event's provider mapping only", async () => {
      await seed(["organizers", "org"], organizer({hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], organizer({hostUserId: "other-host"}));
      const mapping = (organizerId, eventId) => ({organizerId, eventId,
        connectionId: "opc_1", provider: "luma", externalEventId: "evt-1",
        status: "active", revision: 1, createdByUid: "host-1",
        lastSyncStatus: "never", lastSyncRunId: null});
      await seed(["externalEventMappings", "eem_own"], mapping("org", "own"));
      await seed(["externalEventMappings", "eem_foreign"],
        mapping("other", "foreign"));
      for (const uid of ["host-1", "manager"]) {
        const db = authedDb(uid);
        const own = await assertSucceeds(getDoc(doc(db,
          "externalEventMappings", "eem_own")));
        assert.equal(own.data().connectionId, "opc_1");
        await assertFails(getDoc(doc(db, "externalEventMappings",
          "eem_foreign")));
        await assertFails(getDocs(collection(db, "externalEventMappings")));
        await assertFails(getDocs(query(collection(db,
          "externalEventMappings"), where("organizerId", "==", "org"))));
        await assertFails(setDoc(doc(db, "externalEventMappings", "eem_own"),
          mapping("org", "own")));
        await assertFails(updateDoc(doc(db, "externalEventMappings",
          "eem_own"), {status: "disconnected"}));
        await assertFails(deleteDoc(doc(db, "externalEventMappings",
          "eem_own")));
      }
      // An event without a mapping reads as missing.
      const missing = await assertSucceeds(getDoc(doc(authedDb("host-1"),
        "externalEventMappings", "eem_none")));
      assert.equal(missing.exists(), false);
      await assertFails(getDoc(doc(authedDb("other-host"),
        "externalEventMappings", "eem_own")));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
        .firestore(), "externalEventMappings", "eem_own")));
    });

    it("lets managers list an event's presence and late-arrival placements", async () => {
      const managed = (overrides = {}) =>
        organizer({status: "active", archived: false, ...overrides});
      await seed(["organizers", "org"], managed({hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], managed({hostUserId: "other-host"}));
      const at = Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z"));
      const heartbeat = (organizerId, eventId, uid) => ({eventId,
        organizerId, uid, surface: "flutter", heartbeatAt: at, createdAt: at,
        updatedAt: at});
      const placement = (organizerId, eventId, uid) => ({eventId,
        organizerId, uid, resolvedByUid: "host-1",
        status: "heldForNextRound", targetRoundIndex: 2,
        assignmentDraftRevision: 1, reason: "Held for the next round.",
        createdAt: at, updatedAt: at});
      await seed(["eventSuccessPresence", "e1_b"], heartbeat("org", "e1", "b"));
      await seed(["eventSuccessPresence", "e1_a"], heartbeat("org", "e1", "a"));
      await seed(["eventSuccessPresence", "e2_c"],
        heartbeat("other", "e2", "c"));
      await seed(["eventSuccessLateArrivals", "e1_a"],
        placement("org", "e1", "a"));
      await seed(["eventSuccessLateArrivals", "e2_c"],
        placement("other", "e2", "c"));

      for (const uid of ["host-1", "manager"]) {
        const db = authedDb(uid);
        // The live console's exact query shapes.
        const presence = await assertSucceeds(getDocs(query(
          collection(db, "eventSuccessPresence"),
          where("organizerId", "==", "org"),
          where("eventId", "==", "e1"),
          orderBy(documentId()),
          limit(200))));
        assert.deepEqual(presence.docs.map((row) => row.id), ["e1_a", "e1_b"]);
        const placements = await assertSucceeds(getDocs(query(
          collection(db, "eventSuccessLateArrivals"),
          where("organizerId", "==", "org"),
          where("eventId", "==", "e1"),
          orderBy(documentId()),
          limit(200))));
        assert.deepEqual(placements.docs.map((row) => row.id), ["e1_a"]);
        for (const name of ["eventSuccessPresence", "eventSuccessLateArrivals"]) {
          await assertFails(getDocs(query(collection(db, name),
            where("eventId", "==", "e1"))));
          await assertFails(getDocs(query(collection(db, name),
            where("organizerId", "==", "other"),
            where("eventId", "==", "e2"))));
          await assertFails(getDocs(collection(db, name)));
        }
        await assertFails(getDoc(doc(db, "eventSuccessPresence", "e2_c")));
        await assertFails(setDoc(doc(db, "eventSuccessPresence", "e1_z"),
          heartbeat("org", "e1", "z")));
        await assertFails(updateDoc(doc(db, "eventSuccessPresence", "e1_a"),
          {heartbeatAt: at}));
        await assertFails(deleteDoc(doc(db, "eventSuccessPresence", "e1_a")));
        await assertFails(setDoc(doc(db, "eventSuccessLateArrivals", "e1_z"),
          placement("org", "e1", "z")));
      }
      await seed(["deletedUsers", "host-1"], {deletedAt: Timestamp.now()});
      await assertFails(getDocs(query(
        collection(authedDb("host-1"), "eventSuccessPresence"),
        where("organizerId", "==", "org"),
        where("eventId", "==", "e1"))));
    });

    it("lets managers list an event's help-request and delivery views", async () => {
      const managed = (overrides = {}) =>
        organizer({status: "active", archived: false, ...overrides});
      await seed(["organizers", "org"], managed({hostUserIds: ["manager"]}));
      await seed(["organizers", "archived"],
        managed({hostUserIds: ["manager"], archived: true}));
      await seed(["organizers", "other"], managed({hostUserId: "other-host"}));
      const at = Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z"));
      const caseView = (id, organizerId, status) => ({schemaVersion: 1,
        caseId: id, eventId: "e1", organizerId, status, receivedAt: 1,
        revision: 1, evaluatedAt: at, sourceCoverage: "complete",
        incompleteSource: null, view: null});
      const deliveryView = (id, organizerId) => ({schemaVersion: 1,
        messageId: id, eventId: "e1", organizerId, createdAt: 1,
        lifecycle: "active", revision: 1, evaluatedAt: at,
        sourceCoverage: "complete", incompleteSource: null,
        relevantUntilMillis: null, view: null});
      await seed(["hostEventCaseViews", "case:b"], caseView("case:b", "org",
        "open"));
      await seed(["hostEventCaseViews", "case:a"], caseView("case:a", "org",
        "open"));
      await seed(["hostEventCaseViews", "case:r"], caseView("case:r", "org",
        "resolved"));
      await seed(["hostEventCaseViews", "case:x"], caseView("case:x", "other",
        "open"));
      await seed(["hostEventCaseViews", "case:old"],
        caseView("case:old", "archived", "open"));
      await seed(["hostEventDeliveryViews", "outbox:a"],
        deliveryView("outbox:a", "org"));
      await seed(["hostEventDeliveryViews", "outbox:x"],
        deliveryView("outbox:x", "other"));

      for (const uid of ["host-1", "manager"]) {
        const db = authedDb(uid);
        const cases = collection(db, "hostEventCaseViews");
        // The help queue's exact query shape: one status, one page.
        const open = await assertSucceeds(getDocs(query(cases,
          where("organizerId", "==", "org"),
          where("eventId", "==", "e1"),
          where("status", "==", "open"),
          orderBy(documentId()),
          startAfter("case:0"),
          limit(51))));
        assert.deepEqual(open.docs.map((row) => row.id), ["case:a", "case:b"]);
        const deliveries = await assertSucceeds(getDocs(query(
          collection(db, "hostEventDeliveryViews"),
          where("organizerId", "==", "org"),
          where("eventId", "==", "e1"),
          orderBy(documentId()),
          limit(51))));
        assert.deepEqual(deliveries.docs.map((row) => row.id), ["outbox:a"]);
        await assertSucceeds(getDoc(doc(db, "hostEventCaseViews", "case:r")));
        for (const name of ["hostEventCaseViews", "hostEventDeliveryViews"]) {
          await assertFails(getDocs(query(collection(db, name),
            where("eventId", "==", "e1"))));
          await assertFails(getDocs(query(collection(db, name),
            where("organizerId", "==", "other"),
            where("eventId", "==", "e1"))));
        }
        await assertFails(getDoc(doc(db, "hostEventCaseViews", "case:x")));
        await assertFails(getDoc(doc(db, "hostEventDeliveryViews",
          "outbox:x")));
        await assertFails(setDoc(doc(db, "hostEventCaseViews", "case:new"),
          caseView("case:new", "org", "open")));
        await assertFails(updateDoc(doc(db, "hostEventCaseViews", "case:a"),
          {status: "resolved"}));
        await assertFails(deleteDoc(doc(db, "hostEventDeliveryViews",
          "outbox:a")));
      }
      // The retired callables refused no archived organizer, so neither do
      // the views.
      await assertSucceeds(getDoc(doc(authedDb("manager"),
        "hostEventCaseViews", "case:old")));
      await assertFails(getDoc(doc(authedDb("other-host"),
        "hostEventCaseViews", "case:a")));
      await seed(["deletedUsers", "manager"], {deletedAt: Timestamp.now()});
      await assertFails(getDocs(query(
        collection(authedDb("manager"), "hostEventCaseViews"),
        where("organizerId", "==", "org"),
        where("eventId", "==", "e1"),
        where("status", "==", "open"))));
    });

    it("lets managers read live movement views and nothing else", async () => {
      const managed = (overrides = {}) =>
        organizer({status: "active", archived: false, ...overrides});
      await seed(["organizers", "org"], managed({hostUserIds: ["manager"]}));
      // The retired reads refused no archived organizer; nor do the views.
      await seed(["organizers", "archived"], managed({archived: true,
        status: "archived", hostUserId: "archived-host"}));
      await seed(["organizers", "other"], managed({hostUserId: "other-host"}));
      const progressId = "progress:" + "a".repeat(64);
      const view = (organizerId, extra = {}) => ({schemaVersion: 1,
        eventId: "event-1", organizerId, groupId: "event:whole", revision: 1,
        evaluatedAt: Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z")),
        sourceCoverage: "complete", incompleteSource: null, view: null,
        ...extra});
      await seed(["hostEventGroupProgressViews", progressId],
        view("org", {progressId, eventEndAtMillis: 1}));
      await seed(["hostEventGroupProgressViews", "progress:foreign"],
        view("other", {progressId: "progress:foreign", eventEndAtMillis: 1}));
      await seed(["hostEventGroupProgressViews", "progress:archived"],
        view("archived", {progressId: "progress:archived",
          eventEndAtMillis: 1}));
      for (const revision of [1, 2, 3]) {
        await seed(["hostEventDepartureViews", `roster-${revision}`],
          view("org", {rosterId: `roster-${revision}`, progressId,
            progressRevision: revision, confirmedAt: revision}));
      }
      await seed(["hostEventDepartureViews", "roster-foreign"],
        view("other", {rosterId: "roster-foreign", progressId,
          progressRevision: 9, confirmedAt: 9}));
      await seed(["hostEventCheckpointViews", "checkpoint:own"],
        view("org", {checkpointViewId: "checkpoint:own"}));
      await seed(["hostEventCheckpointViews", "checkpoint:foreign"],
        view("other", {checkpointViewId: "checkpoint:foreign"}));

      for (const uid of ["host-1", "manager"]) {
        const db = authedDb(uid);
        await assertSucceeds(getDoc(doc(db, "hostEventGroupProgressViews",
          progressId)));
        await assertSucceeds(getDocs(query(
          collection(db, "hostEventGroupProgressViews"),
          where("organizerId", "==", "org"),
          where("eventId", "==", "event-1"))));
        await assertFails(getDoc(doc(db, "hostEventGroupProgressViews",
          "progress:foreign")));
        await assertFails(getDocs(collection(db,
          "hostEventGroupProgressViews")));
        // The departure history's exact query shape.
        const page = await assertSucceeds(getDocs(query(
          collection(db, "hostEventDepartureViews"),
          where("organizerId", "==", "org"),
          where("progressId", "==", progressId),
          where("progressRevision", "<", 3),
          orderBy("progressRevision", "desc"),
          limit(11))));
        assert.deepEqual(page.docs.map((row) => row.id),
          ["roster-2", "roster-1"]);
        await assertFails(getDocs(query(
          collection(db, "hostEventDepartureViews"),
          where("progressId", "==", progressId))));
        await assertFails(getDoc(doc(db, "hostEventDepartureViews",
          "roster-foreign")));
        await assertSucceeds(getDoc(doc(db, "hostEventCheckpointViews",
          "checkpoint:own")));
        await assertFails(getDocs(query(
          collection(db, "hostEventCheckpointViews"),
          where("organizerId", "==", "org"))));
        await assertFails(getDoc(doc(db, "hostEventCheckpointViews",
          "checkpoint:foreign")));
        for (const [name, id] of [
          ["hostEventGroupProgressViews", progressId],
          ["hostEventDepartureViews", "roster-1"],
          ["hostEventCheckpointViews", "checkpoint:own"],
        ]) {
          await assertFails(setDoc(doc(db, name, `client-${uid}`),
            view("org")));
          await assertFails(updateDoc(doc(db, name, id), {revision: 9}));
          await assertFails(deleteDoc(doc(db, name, id)));
        }
      }
      await assertSucceeds(getDoc(doc(authedDb("archived-host"),
        "hostEventGroupProgressViews", "progress:archived")));
      // Not written yet: any signed-in user reads it as missing, and a
      // signed-out one cannot.
      for (const name of ["hostEventGroupProgressViews",
        "hostEventCheckpointViews"]) {
        const missing = await assertSucceeds(getDoc(doc(authedDb("host-1"),
          name, "not-written-yet")));
        assert.equal(missing.exists(), false);
        await assertFails(getDoc(doc(
          testEnv.unauthenticatedContext().firestore(), name,
          "not-written-yet")));
      }
      await assertFails(getDoc(doc(authedDb("other-host"),
        "hostEventGroupProgressViews", progressId)));
      await seed(["deletedUsers", "host-1"], {deletedAt: Timestamp.now()});
      await assertFails(getDoc(doc(authedDb("host-1"),
        "hostEventCheckpointViews", "checkpoint:own")));
    });

    it("lets managers read live guest and settings views and nothing else",
      async () => {
        const managed = (overrides = {}) =>
          organizer({status: "active", archived: false, ...overrides});
        await seed(["organizers", "org"], managed({hostUserIds: ["manager"]}));
        // The retired reads refused no archived organizer; nor do the views.
        await seed(["organizers", "archived"], managed({archived: true,
          status: "archived", hostUserId: "archived-host"}));
        await seed(["organizers", "other"],
          managed({hostUserId: "other-host"}));
        const view = (organizerId, extra = {}) => ({schemaVersion: 1,
          eventId: "event-1", organizerId, revision: 1,
          evaluatedAt: Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z")),
          sourceCoverage: "complete", incompleteSource: null, view: null,
          ...extra});
        const collections = {
          hostEventAccountabilityViews: (id) => ({accountabilityViewId: id,
            attendeeId: "guest-1"}),
          hostEventMembershipViews: (id) => ({membershipId: id,
            attendeeId: "guest-1", eventEndAtMillis: 1, receivers: []}),
          hostEventAssistanceSettingViews: (id) => ({settingId: id,
            groupId: "event:whole", workflowKind: "lateJoin",
            eventEndAtMillis: 1}),
          hostEventRuntimeViews: (id) => ({runtimeId: id,
            eventEndAtMillis: 1, closed: false}),
        };
        for (const [name, fields] of Object.entries(collections)) {
          await seed([name, "own"], view("org", fields("own")));
          await seed([name, "foreign"], view("other", fields("foreign")));
          await seed([name, "archived"],
            view("archived", fields("archived")));
        }

        for (const uid of ["host-1", "manager"]) {
          const db = authedDb(uid);
          for (const [name, fields] of Object.entries(collections)) {
            await assertSucceeds(getDoc(doc(db, name, "own")));
            await assertFails(getDoc(doc(db, name, "foreign")));
            await assertFails(getDocs(query(collection(db, name),
              where("organizerId", "==", "org"))));
            await assertFails(getDocs(collection(db, name)));
            await assertFails(setDoc(doc(db, name, `client-${uid}`),
              view("org", fields(`client-${uid}`))));
            await assertFails(updateDoc(doc(db, name, "own"), {revision: 9}));
            await assertFails(deleteDoc(doc(db, name, "own")));
          }
        }
        for (const name of Object.keys(collections)) {
          await assertSucceeds(getDoc(doc(authedDb("archived-host"), name,
            "archived")));
          // Not written yet: any signed-in user reads it as missing, and a
          // signed-out one cannot.
          const missing = await assertSucceeds(getDoc(doc(authedDb("host-1"),
            name, "not-written")));
          assert.equal(missing.exists(), false);
          await assertFails(getDoc(doc(
            testEnv.unauthenticatedContext().firestore(), name,
            "not-written")));
          await assertFails(getDoc(doc(authedDb("stranger"), name, "own")));
        }
        await seed(["deletedUsers", "host-1"], {deletedAt: Timestamp.now()});
        await assertFails(getDoc(doc(authedDb("host-1"),
          "hostEventMembershipViews", "own")));
      });

    it("keeps organizer entitlement state server-only", async () => {
      await seed(["organizerTeamMemberships", "organizer-1_manager-1"], {
        organizerId: "organizer-1",
        uid: "manager-1",
        role: "manager",
        status: "active",
        createdAt: Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z")),
        removedAt: null,
      });
      await seed(["organizerEntitlements", "organizer-1"], {
        schemaVersion: 1,
        organizerId: "organizer-1",
        grants: [],
        meters: {
          flightDaysUsed: 0,
          waConversationsUsed: 0,
          periodStartsAt:
            Timestamp.fromDate(new Date("2026-09-01T00:00:00.000Z")),
        },
        revision: 1,
        createdAt: Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z")),
        updatedAt: Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z")),
      });
      await seed(["organizerEntitlementReceipts", "organizer-1_op-1"], {
        schemaVersion: 1,
        receiptId: "organizer-1_op-1",
        operationId: "op-1",
        organizerId: "organizer-1",
        actorUid: "admin-1",
        action: "grant",
        contentHash: "sha256:abc123",
        resultRevision: 1,
        grantId: "grant-1",
        createdAt: Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z")),
        expiresAt: Timestamp.fromDate(new Date("2026-10-01T10:00:00.000Z")),
      });

      const clients = [
        testEnv.unauthenticatedContext().firestore(),
        authedDb("guest-1"),
        authedDb("manager-1"),
      ];
      for (const db of clients) {
        await assertFails(getDoc(doc(
          db, "organizerEntitlements", "organizer-1")));
        await assertFails(getDocs(query(
          collection(db, "organizerEntitlements"),
          where("organizerId", "==", "organizer-1"),
        )));
        await assertFails(setDoc(doc(
          db, "organizerEntitlements", "organizer-1"), {
          organizerId: "organizer-1",
          grants: [],
        }));
        await assertFails(getDoc(doc(
          db, "organizerEntitlementReceipts", "organizer-1_op-1")));
        await assertFails(setDoc(doc(
          db, "organizerEntitlementReceipts", "organizer-1_op-2"), {
          organizerId: "organizer-1",
          action: "grant",
        }));
      }
    });

    it("lets members read only their own paid membership records", async () => {
      const membershipId = "hm_" + "a".repeat(64);
      await seed(["hostMemberships", membershipId], {
        organizerId: "organizer-1", uid: "member-1", status: "active",
      });
      await seed(["hostMembershipCheckouts", "hmc_AbCdEfGhIjKlMnOpQrSt"], {
        organizerId: "organizer-1", uid: "member-1", state: "open",
      });
      await seed(["hostMembershipBenefitUses", "event-1_member-1"], {
        organizerId: "organizer-1", uid: "member-1", savingsInPaise: 50000,
      });
      const member = authedDb("member-1");
      await assertSucceeds(getDoc(doc(member, "hostMemberships", membershipId)));
      await assertSucceeds(getDocs(query(collection(member, "hostMemberships"),
        where("uid", "==", "member-1"))));
      await assertSucceeds(getDoc(doc(
        member, "hostMembershipCheckouts", "hmc_AbCdEfGhIjKlMnOpQrSt")));
      await assertSucceeds(getDocs(query(
        collection(member, "hostMembershipBenefitUses"),
        where("uid", "==", "member-1"))));
      for (const db of [testEnv.unauthenticatedContext().firestore(),
        authedDb("other-1")]) {
        await assertFails(getDoc(doc(db, "hostMemberships", membershipId)));
        await assertFails(getDoc(doc(
          db, "hostMembershipCheckouts", "hmc_AbCdEfGhIjKlMnOpQrSt")));
        await assertFails(getDoc(doc(
          db, "hostMembershipBenefitUses", "event-1_member-1")));
      }
      for (const db of [member, authedDb("other-1")]) {
        await assertFails(setDoc(doc(db, "hostMemberships", membershipId),
          {organizerId: "organizer-1", uid: "member-1", status: "active"}));
        await assertFails(setDoc(doc(
          db, "hostMembershipBenefitUses", "event-2_member-1"),
        {organizerId: "organizer-1", uid: "member-1", savingsInPaise: 1}));
      }
    });

    it("publishes only published membership plans", async () => {
      await seed(["hostMembershipPlans", "hmp_PublishedPlan0000001"], {
        organizerId: "organizer-1", status: "published", name: "Runners",
      });
      await seed(["hostMembershipPlans", "hmp_DraftPlan00000000001"], {
        organizerId: "organizer-1", status: "draft", name: "Draft",
      });
      const viewer = authedDb("member-1");
      await assertSucceeds(getDoc(doc(
        viewer, "hostMembershipPlans", "hmp_PublishedPlan0000001")));
      await assertSucceeds(getDocs(query(
        collection(viewer, "hostMembershipPlans"),
        where("organizerId", "==", "organizer-1"),
        where("status", "==", "published"))));
      await assertFails(getDoc(doc(
        viewer, "hostMembershipPlans", "hmp_DraftPlan00000000001")));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
        .firestore(), "hostMembershipPlans", "hmp_PublishedPlan0000001")));
      await assertFails(setDoc(doc(
        viewer, "hostMembershipPlans", "hmp_PublishedPlan0000001"),
      {organizerId: "organizer-1", status: "published", name: "Free"}));
    });

    it("keeps membership billing state server-only", async () => {
      await seed(["hostMembershipPrograms", "organizer-1"], {
        organizerId: "organizer-1", state: "enabled",
      });
      await seed(["hostMembershipCharges", "pay_Test0001"], {
        organizerId: "organizer-1", uid: "member-1", amountPaise: 49900,
      });
      await seed(["hostMembershipWebhookReceipts", "hmwh_1"], {
        eventType: "subscription.charged",
      });
      await seed(["eventMembershipRules", "event-1"], {
        organizerId: "organizer-1", membersOnly: true,
      });
      for (const db of [testEnv.unauthenticatedContext().firestore(),
        authedDb("member-1"), authedDb("host-1")]) {
        for (const [path, id] of [["hostMembershipPrograms", "organizer-1"],
          ["hostMembershipCharges", "pay_Test0001"],
          ["hostMembershipWebhookReceipts", "hmwh_1"],
          ["eventMembershipRules", "event-1"]]) {
          await assertFails(getDoc(doc(db, path, id)));
          await assertFails(setDoc(doc(db, path, id), {organizerId: "x"}));
        }
      }
    });

    it("keeps organizer form state server-only", async () => {
      await seed(["organizerForms", "form-1"], {
        organizerId: "organizer-1",
        title: "Private form metadata",
      });
      await seed(["organizerFormDomains", "apply.example.test"], {
        organizerId: "organizer-1", hostname: "apply.example.test",
        ownershipChallenge: "private-challenge",
      });
      await seed(["organizerFormDrafts", "form-1"], {
        organizerId: "organizer-1",
        formId: "form-1",
        revision: 1,
      });
      await seed(["organizerFormVersions", "form-1_v1"], {
        organizerId: "organizer-1",
        formId: "form-1",
        version: 1,
      });

      for (const uid of ["owner-1", "owner-2"]) {
        const db = authedDb(uid);
        for (const [collectionName, documentId] of [
          ["organizerForms", "form-1"],
          ["organizerFormDomains", "apply.example.test"],
          ["organizerFormDrafts", "form-1"],
          ["organizerFormVersions", "form-1_v1"],
        ]) {
          await assertFails(getDoc(doc(db, collectionName, documentId)));
          await assertFails(updateDoc(
            doc(db, collectionName, documentId),
            {title: "Client mutation"},
          ));
        }
      }
      await assertFails(getDocs(query(
        collection(authedDb("owner-1"), "organizerForms"),
        where("organizerId", "==", "organizer-1"),
      )));
    });

    it("keeps organizer tracking settings server-only", async () => {
      await seed(["organizerTrackingSettings", "organizer-1"], {
        organizerId: "organizer-1", revision: 1, metaPixelId: "123456",
      });
      for (const db of [authedDb("owner-1"), authedDb("owner-2"),
        testEnv.unauthenticatedContext().firestore()]) {
        const ref = doc(db, "organizerTrackingSettings", "organizer-1");
        await assertFails(getDoc(ref));
        await assertFails(updateDoc(ref, {revision: 2}));
        await assertFails(deleteDoc(ref));
        await assertFails(setDoc(doc(db, "organizerTrackingSettings", "forged"), {
          organizerId: "organizer-1", revision: 1,
        }));
        await assertFails(getDocs(collection(db, "organizerTrackingSettings")));
      }
    });

    it("keeps held guest cues server-only", async () => {
      await seed(["eventSuccessDeferredCues", "event-1_guest-1"], {
        eventId: "event-1", organizerId: "organizer-1", uid: "guest-1",
        kind: "companionReady",
      });
      for (const db of [authedDb("guest-1"), authedDb("owner-1"),
        testEnv.unauthenticatedContext().firestore()]) {
        const ref = doc(db, "eventSuccessDeferredCues", "event-1_guest-1");
        await assertFails(getDoc(ref));
        await assertFails(updateDoc(ref, {kind: "companionReady"}));
        await assertFails(deleteDoc(ref));
        await assertFails(setDoc(
          doc(db, "eventSuccessDeferredCues", "event-1_forged"),
          {eventId: "event-1", organizerId: "organizer-1", uid: "forged",
            kind: "companionReady"}
        ));
        await assertFails(getDocs(collection(db, "eventSuccessDeferredCues")));
      }
    });

    it("keeps organizer meeting history server-only", async () => {
      await seed(["organizerMeetingHistory", "organizer-1_guest-1"], {
        organizerId: "organizer-1", uid: "guest-1",
        peers: {"guest-2": {meetings: 1, lastMetAtMs: 1}},
      });
      for (const db of [authedDb("guest-1"), authedDb("owner-1"),
        testEnv.unauthenticatedContext().firestore()]) {
        const ref = doc(db, "organizerMeetingHistory", "organizer-1_guest-1");
        await assertFails(getDoc(ref));
        await assertFails(updateDoc(ref, {peers: {}}));
        await assertFails(deleteDoc(ref));
        await assertFails(setDoc(
          doc(db, "organizerMeetingHistory", "organizer-1_forged"),
          {organizerId: "organizer-1", uid: "forged", peers: {}}
        ));
        await assertFails(getDocs(collection(db, "organizerMeetingHistory")));
      }
    });

    it("keeps waitlist city interest counters and markers server-only", async () => {
      for (const [collectionName, documentId] of [
        ["cityInterest", "in-mh-pune"],
        ["cityInterestMarkers", "a".repeat(64)],
      ]) {
        await seed([collectionName, documentId], {schemaVersion: 1, cityKey: "in-mh-pune"});
        for (const db of [authedDb("owner-1"), testEnv.unauthenticatedContext().firestore()]) {
          const ref = doc(db, collectionName, documentId);
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {total: 100}));
          await assertFails(deleteDoc(ref));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {schemaVersion: 1, cityKey: "in-mh-pune"}));
          await assertFails(getDocs(collection(db, collectionName)));
        }
      }
    });

    it("keeps organizer insights and follower message quotas server-only", async () => {
      for (const [collectionName, documentId] of [
        ["organizerInsights", "organizer-1_20261107"],
        ["organizerFollowerMessageQuotas", "organizer-1_202611"],
      ]) {
        await seed([collectionName, documentId], {organizerId: "organizer-1"});
        for (const db of [authedDb("owner-1"), authedDb("owner-2"),
          testEnv.unauthenticatedContext().firestore()]) {
          const ref = doc(db, collectionName, documentId);
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {organizerId: "organizer-2"}));
          await assertFails(deleteDoc(ref));
          await assertFails(setDoc(doc(db, collectionName, "forged"),
            {organizerId: "organizer-1"}));
          await assertFails(getDocs(collection(db, collectionName)));
        }
      }
    });

    it("keeps organizer event setup defaults and receipts server-only", async () => {
      for (const collectionName of ["organizerEventSetupDefaults",
        "organizerEventSetupDefaultReceipts",
        "eventOfferConfigurationReceipts"]) {
        await seed([collectionName, "organizer-1"], {
          organizerId: "organizer-1", revision: 1,
          eventSetup: {paymentInstructions: "Manager-only instructions"},
        });
        for (const uid of ["owner-1", "owner-2"]) {
          const db = authedDb(uid);
          const ref = doc(db, collectionName, "organizer-1");
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {revision: 2}));
          await assertFails(deleteDoc(ref));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {
            organizerId: "organizer-1", revision: 1,
          }));
          await assertFails(getDocs(query(collection(db, collectionName),
            where("organizerId", "==", "organizer-1"))));
        }
      }
    });

    it("keeps atomic form admission ownership and payment receipts server-only", async () => {
      for (const collectionName of ["organizerFormAdmissions",
        "organizerFormAdmissionReceipts", "organizerEventOfferRecipients",
        "organizerEventOfferPayments"]) {
        await seed([collectionName, "receipt-1"], {
          organizerId: "organizer-1", eventId: "event-1",
          responseId: "response-1", actorUid: "owner-1",
          manualPayment: {reviewNote: "Private bank reference"},
        });
        for (const db of [authedDb("owner-1"), authedDb("owner-2"),
          testEnv.unauthenticatedContext().firestore()]) {
          const ref = doc(db, collectionName, "receipt-1");
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {responseId: "forged"}));
          await assertFails(deleteDoc(ref));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {
            organizerId: "organizer-1", eventId: "event-1",
          }));
          await assertFails(getDocs(query(collection(db, collectionName),
            where("organizerId", "==", "organizer-1"))));
        }
      }
    });

    it("keeps public checkout and registration receipts server-only", async () => {
      for (const collectionName of ["publicEventPayments",
        "publicEventAdmissionReceipts", "eventRegistrationReceipts"]) {
        await seed([collectionName, "receipt-1"], {
          organizerId: "organizer-1", eventId: "event-1",
          responseId: "response-1", actorUid: "owner-1",
          manualPayment: {reviewNote: "Private bank reference"},
        });
        for (const db of [authedDb("owner-1"), authedDb("owner-2"),
          testEnv.unauthenticatedContext().firestore()]) {
          const ref = doc(db, collectionName, "receipt-1");
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {responseId: "forged"}));
          await assertFails(deleteDoc(ref));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {
            organizerId: "organizer-1", eventId: "event-1",
          }));
          await assertFails(getDocs(query(collection(db, collectionName),
            where("organizerId", "==", "organizer-1"))));
        }
      }
    });

    it("keeps event offers and evidence server-only", async () => {
      for (const collectionName of ["organizerEventOffers",
        "organizerEventOfferActionReceipts", "organizerEventOfferBatchReceipts",
        "organizerEventOfferAudits"]) {
        await seed([collectionName, "offer-1"], {
          organizerId: "organizer-1", eventId: "event-1", revision: 1,
          manualPayment: {status: "none"},
        });
        for (const uid of ["owner-1", "owner-2"]) {
          const db = authedDb(uid);
          const ref = doc(db, collectionName, "offer-1");
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {revision: 2}));
          await assertFails(deleteDoc(ref));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {
            organizerId: "organizer-1", revision: 1,
          }));
          await assertFails(getDocs(query(collection(db, collectionName),
            where("organizerId", "==", "organizer-1"))));
        }
      }
    });

    it("keeps private event setup receipts server-only", async () => {
      await seed(["eventSetupReceipts", "receipt-1"], {
        organizerId: "organizer-1", actorUid: "owner-1", eventId: "event-1",
        operation: "create", appliedRevision: 1,
      });
      for (const uid of ["owner-1", "owner-2"]) {
        const db = authedDb(uid);
        const ref = doc(db, "eventSetupReceipts", "receipt-1");
        await assertFails(getDoc(ref));
        await assertFails(deleteDoc(ref));
        await assertFails(updateDoc(ref, {appliedRevision: 2}));
        await assertFails(setDoc(doc(db, "eventSetupReceipts", "forged"), {
          organizerId: "organizer-1", actorUid: uid, appliedRevision: 1,
        }));
      }
    });

    it("keeps form payment state server-only", async () => {
      for (const collectionName of ["paymentRoutingPolicies", "organizerPaymentConnections",
        "organizerPaymentOauthStates", "organizerFormPayments",
        "organizerFormPaymentWebhooks"]) {
        await seed([collectionName, "payment-1"], {
          organizerId: "organizer-1", respondentUid: "owner-1",
          status: "submitted",
        });
        for (const uid of ["owner-1", "owner-2"]) {
          const db = authedDb(uid);
          const ref = doc(db, collectionName, "payment-1");
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {status: "captured"}));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {
            organizerId: "organizer-1", respondentUid: uid,
          }));
          await assertFails(getDocs(query(collection(db, collectionName),
            where("respondentUid", "==", uid))));
        }
      }
    });

    it("keeps commercial terms and their history server-only", async () => {
      for (const collectionName of ["commercialTerms",
        "commercialTermsRevisions"]) {
        await seed([collectionName, "platform"], {
          scope: "platform", organizerId: null, revision: 1,
        });
        for (const uid of ["owner-1", "owner-2"]) {
          const db = authedDb(uid);
          const ref = doc(db, collectionName, "platform");
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {revision: 2}));
          await assertFails(deleteDoc(ref));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {
            scope: "organizer", organizerId: "organizer-1", revision: 1,
          }));
          await assertFails(getDocs(query(collection(db, collectionName),
            where("organizerId", "==", "organizer-1"))));
        }
      }
    });

    it("keeps contact merge review decisions callable-only", async () => {
      const reviewedAt = Timestamp.fromDate(
        new Date("2026-08-16T10:00:00.000Z"),
      );
      await seed(["organizerContactMergeReviewDecisions", "decision-1"], {
        schemaVersion: 1,
        decisionId: "decision-1",
        organizerId: "organizer-1",
        contactIds: ["contact-1", "contact-2"],
        state: "differentPeople",
        reviewedByUid: "owner-1",
        reviewedAt,
        reopenedByUid: null,
        reopenedAt: null,
        revision: 1,
        updatedAt: reviewedAt,
      });

      const decisionRef = doc(
        authedDb("owner-1"),
        "organizerContactMergeReviewDecisions",
        "decision-1",
      );
      await assertFails(getDoc(decisionRef));
      await assertFails(updateDoc(decisionRef, {state: "reopened"}));
    });

    it("keeps retained WhatsApp thread bodies callable-only", async () => {
      const db = authedDb("owner-1");
      for (const [collectionName, documentId] of [
        ["organizerWhatsappThreads", "thread-1"],
        ["organizerWhatsappMessages", "message-1"],
        ["organizerWhatsappReplyOperations", "operation-1"],
      ]) {
        await seed([collectionName, documentId], {
          organizerId: "organizer-1",
          body: "Private inbound text",
        });
        const reference = doc(db, collectionName, documentId);
        await assertFails(getDoc(reference));
        await assertFails(setDoc(reference, {organizerId: "organizer-1"}));
      }
    });
  });

  describe("clubs", () => {
    it("denies direct club creates because creation is callable-owned", async () => {
      await assertFails(
        setDoc(doc(authedDb("host-1"), "clubs", "club-1"), organizer()),
      );
    });

    it("denies direct host profile edits because updates are callable-owned", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        updateDoc(doc(authedDb("host-1"), "clubs", "club-1"), {
          description: "Updated city loops.",
          tags: ["easy"],
          instagramHandle: "@sunsetstriders",
        }),
      );
    });

    it("rejects the older incomplete Club schema", async () => {
      const legacyOrganizer = {
        name: "Legacy Club",
        description: "Old shape.",
        location: "mumbai",
        hostUserId: "host-1",
        createdAt: Timestamp.fromDate(new Date("2026-04-28T10:00:00.000Z")),
        imageUrl: null,
        rating: 0,
        reviewCount: 0,
      };

      await assertFails(
        setDoc(doc(authedDb("host-1"), "clubs", "club-legacy"), legacyOrganizer),
      );
    });

    it("denies direct member joins because membership is callable-owned", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          organizer({
            memberCount: 2,
          }),
        ),
      );
    });

    it("rejects member updates that tamper with club profile fields", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          organizer({
            hostName: "Mallory",
            memberCount: 2,
          }),
        ),
      );
    });

    it("denies direct member count repairs", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          organizer({
            memberCount: 2,
          }),
        ),
      );
    });

    it("denies direct member leaves because membership is callable-owned", async () => {
      await seed(
        ["organizers", "club-1"],
        organizer({
          memberCount: 3,
        }),
      );

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          organizer({
            memberCount: 2,
          }),
        ),
      );
    });

    it("rejects members changing aggregate membership count", async () => {
      await seed(
        ["organizers", "club-1"],
        organizer({
          memberCount: 3,
        }),
      );

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          organizer({
            memberCount: 2,
          }),
        ),
      );
    });

    it("denies joining via direct aggregate updates", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "clubs", "club-1"), {
          memberCount: increment(1),
        }),
      );
    });

    it("denies leaving via direct aggregate updates", async () => {
      await seed(
        ["organizers", "club-1"],
        organizer({
          memberCount: 3,
        }),
      );

      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "clubs", "club-1"), {
          memberCount: increment(-1),
        }),
      );
    });

    it("denies direct club deletes", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        deleteDoc(doc(authedDb("host-1"), "clubs", "club-1")),
      );
    });
  });
});
