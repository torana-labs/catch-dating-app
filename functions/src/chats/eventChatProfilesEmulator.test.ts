import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {UpdateEventChatProfileSharingCallablePayload as Payload} from
  "../shared/generated/updateEventChatProfileSharingCallablePayload";
import {validateGetEventChatProfileCallableResponse as validProfile} from
  "../shared/generated/validators/getEventChatProfileOutput";
import {
  validateGetEventChatProfileSharingCallableResponse as validSettings,
} from
  "../shared/generated/validators/getEventChatProfileSharingOutput";
import {
  getEventChatProfileSharingHandler as settings,
  updateEventChatProfileSharingHandler as update,
  getEventChatProfileHandler as profile,
} from "./eventChatProfiles";
import {
  eventChatMembershipId,
  updateEventChatAccessHandler as access,
} from "./eventChatAccess";
import {blockDocId} from "../safety/blocking";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test(
  "Firestore event profiles preserve explicit event and organizer boundaries",
  {skip: !emulator},
  async (t) => {
    assert.match(emulator!, /^(127\.0\.0\.1|localhost):[0-9]+$/u);
    const suffix = randomUUID();
    const eventId = `event-${suffix}`;
    const organizerId = `org-${suffix}`;
    const person = `person-${suffix}`;
    const host = `host-${suffix}`;
    const stranger = `other-${suffix}`;
    const responseId = `response-${suffix}`;
    const versionId = `version-${suffix}`;
    const formId = `form-${suffix}`;
    const foreign = `foreign-${suffix}`;
    const app = initializeApp(
      {projectId: "demo-catch-form-payments"},
      suffix,
    );
    const db = getEmulatorFirestore(app);
    const now = Timestamp.fromDate(new Date("2026-09-23T12:00:00Z"));
    const refs: FirebaseFirestore.DocumentReference[] = [];
    const ref = (collection: string, id: string) =>
      db.collection(collection).doc(id);
    const put = async (collection: string, id: string, data: object) => {
      const doc = ref(collection, id);
      refs.push(doc);
      await doc.set(data);
      return doc;
    };
    const deps = {
      db: () => db,
      now: () => now,
      rateLimit: async () => undefined,
      readPhoto: async () => ({
        contentType: "image/jpeg" as const,
        previewBase64: "YWJj",
        width: 1,
        height: 1,
      }),
    };
    const request = (uid: string, data: object) =>
      ({
        auth: {uid, token: {phone_number: "+919000000001"}},
        data: {eventId, expectedUid: uid, ...data},
      }) as CallableRequest<unknown>;
    let revision = 0;
    const chosen: NonNullable<Payload["selection"]> = {
      profileRevision: 1,
      membershipRevision: 1,
      coreFieldIds: ["age", "occupation"],
      photoId: null,
      card: {responseId, revision: 1, questionIds: ["cocktail"]},
      termsVersion: "event-profile-sharing-v2",
    };
    const saveRequest = (selection: Payload["selection"] = chosen) =>
      request(person, {
        requestId: randomUUID(),
        expectedRevision: revision,
        selection,
      });
    const save = async (selection: Payload["selection"] = chosen) => {
      const result = await update(saveRequest(selection), deps);
      revision = result.revision;
      return result;
    };
    const read = (uid = host) =>
      profile(request(uid, {participantUid: person}), deps);
    const change = (action: string, expectedRevision: number) =>
      access(
        request(person, {
          action,
          expectedRevision,
          requestId: randomUUID(),
          termsVersion: action === "join" ? "event-chat-v1" : null,
        }),
        deps,
      );
    try {
      await put("events", eventId, {
        organizerId,
        name: "RSVP coffee",
        status: "active",
      });
      await put("organizers", organizerId, {
        ownerUserId: host,
        hostUserId: host,
        hostUserIds: [],
        hostProfiles: [],
      });
      await put("eventChatRooms", eventId, {
        eventId,
        organizerId,
        status: "open",
        revision: 1,
      });
      for (const uid of [person, host]) {
        await put("users", uid, {
          displayName: uid === person ? "Sara" : "Host",
          profileComplete: false,
          profileClaimedAt: now,
          profileRevision: 1,
          dateOfBirth: Timestamp.fromDate(new Date("1994-06-15T00:00:00Z")),
          occupation: "Founder",
          phoneNumber: "+919000000001",
          email: "private@example.test",
          profilePhotos: [],
        });
        await put(
          "eventChatMemberships",
          eventChatMembershipId(eventId, uid),
          {
            uid,
            eventId,
            organizerId,
            status: "joined",
            revision: 1,
            termsVersion: "event-chat-v1",
            joinedAt: now,
            leftAt: null,
            createdAt: now,
            updatedAt: now,
          },
        );
      }
      const participation = await put(
        "eventParticipations",
        `${eventId}_${person}`,
        {
          uid: person,
          eventId,
          organizerId,
          status: "signedUp",
        },
      );
      const response = await put("organizerFormResponses", responseId, {
        responseId,
        respondentUid: person,
        organizerId,
        formId,
        versionId,
        identityKind: "phoneVerified",
        status: "submitted",
        withdrawnAt: null,
        submittedAt: now,
        consentVersion: "v1",
        answers: {
          cocktail: "tequila",
          private: "private answer",
          image: ["asset"],
        },
      });
      const proposal = await put(
        "participantFormProfileProposals",
        responseId,
        {
          uid: person,
          organizerId,
          responseId,
          formId,
          versionId,
          claimedAt: now,
          fields: [
            {
              questionId: "cocktail",
              destination: "organizerCard",
              canonicalFieldId: null,
            },
            {
              questionId: "image",
              destination: "organizerCard",
              canonicalFieldId: null,
            },
          ],
        },
      );
      const version = await put("organizerFormVersions", versionId, {
        organizerId,
        formId,
        definition: {
          title: "RSVP",
          identityPolicy: "phoneVerified",
          consent: {consentVersion: "v1"},
          eventProfile: {
            enabled: true,
            allowedSlots: ["displayName", "portrait", "introduction",
              "customRow"],
            maxCustomRows: 2,
            noticeVersion: "event-profile-sharing-v2",
          },
          sections: [
            {
              questions: [
                {
                  questionId: "cocktail",
                  label: "Favourite drink",
                  kind: "singleChoice",
                  answerDestination: "organizerCard",
                  answerAudience: {
                    mode: "eventMembersWithConsent",
                    eventProfileSlot: "customRow",
                  },
                  canonicalFieldId: null,
                  options: [{value: "tequila", label: "Tequila"}],
                },
                {
                  questionId: "private",
                  label: "Private CRM",
                  kind: "shortText",
                  answerDestination: "organizerOnly",
                  options: [],
                },
                {
                  questionId: "image",
                  label: "Private image",
                  kind: "file",
                  answerDestination: "organizerCard",
                  options: [],
                },
              ],
            },
          ],
        },
      });
      const card = await put("participantOrganizerCards", responseId, {
        uid: person,
        organizerId,
        responseId,
        revision: 1,
        questionIds: ["cocktail", "image"],
        createdAt: now,
        updatedAt: now,
      });
      await put("participantOrganizerCards", foreign, {
        uid: person,
        organizerId: foreign,
        responseId: foreign,
        revision: 1,
        questionIds: ["cocktail"],
        createdAt: now,
        updatedAt: now,
      });

      await t.test(
        "verified prejoin preview is exact and grants only the first join",
        async () => {
          const member = ref("eventChatMemberships",
            eventChatMembershipId(eventId, person));
          await member.delete();
          const proposed = {
            ...chosen,
            membershipRevision: 0,
            firstName: "Mira",
            introduction: "I like coffee and running.",
            termsVersion: "event-profile-sharing-v2" as const,
          };
          const own = await settings(request(person, {}), deps);
          assert.equal(own.canShare, true);
          assert.equal(own.membershipRevision, 0);
          const preview = await settings(request(person,
            {previewSelection: proposed}), deps);
          assert.equal(preview.preview?.displayName, "Mira");
          assert.equal(preview.preview?.introduction,
            "I like coffee and running.");
          assert.deepEqual(preview.preview?.cardFields,
            [{label: "Favourite drink", value: "Tequila"}]);
          assert.equal(JSON.stringify(preview.preview).includes("private"),
            false);
          await assert.rejects(read(), {code: "permission-denied"});
          await save(proposed);
          await change("join", 0);
          const visible = await read();
          assert.equal(visible.displayName, preview.preview?.displayName);
          assert.equal(visible.introduction, preview.preview?.introduction);
          assert.deepEqual(visible.coreFields, preview.preview?.coreFields);
          assert.deepEqual(visible.cardFields, preview.preview?.cardFields);
          await change("mute", 1);
          const muted = await read();
          assert.equal(muted.introduction, visible.introduction);
          assert.deepEqual(muted.cardFields, visible.cardFields);
          await change("unmute", 2);
          assert.deepEqual((await read()).cardFields, visible.cardFields);
          await change("leave", 3);
          await change("join", 4);
          const rejoined = await read();
          assert.equal(rejoined.displayName, "Sara");
          assert.equal(rejoined.introduction, null);
          assert.deepEqual(rejoined.cardFields, []);
          // Return the fixture to its original first membership for the
          // independent revocation cases below.
          await member.update({revision: 1});
          await ref("eventChatProfileShares",
            eventChatMembershipId(eventId, person)).delete();
          revision = 0;
        },
      );

      await t.test(
        "joining alone shares only the claimed display name",
        async () => {
          const before = await read();
          assert.ok(validProfile(before));
          assert.equal(before.displayName, "Sara");
          assert.deepEqual(before.coreFields, []);
          assert.deepEqual(before.cardFields, []);
          assert.equal(before.photo, null);
          const own = await settings(request(person, {}), deps);
          assert.ok(validSettings(own), JSON.stringify(validSettings.errors));
          assert.equal(own.canShare, true);
          assert.equal(own.selection, null);
          await assert.rejects(read(stranger), {code: "permission-denied"});
        },
      );
      await t.test(
        "muting does not revoke a choice made after joining",
        async () => {
          await save();
          const before = await read();
          assert.deepEqual(before.cardFields,
            [{label: "Favourite drink", value: "Tequila"}]);
          await change("mute", 1);
          assert.deepEqual((await read()).cardFields, before.cardFields);
          await change("unmute", 2);
          assert.deepEqual((await read()).cardFields, before.cardFields);
          await change("leave", 3);
          await change("join", 4);
          assert.deepEqual((await read()).cardFields, []);
          await ref("eventChatMemberships",
            eventChatMembershipId(eventId, person)).update({revision: 1});
          await ref("eventChatProfileShares",
            eventChatMembershipId(eventId, person)).delete();
          revision = 0;
        },
      );
      await t.test(
        "one idempotent choice reveals only reviewed selected fields",
        async () => {
          const req = saveRequest();
          const results = await Promise.all([
            update(req, deps),
            update(req, deps),
          ]);
          assert.deepEqual(results.map((r) => r.replayed).sort(), [
            false,
            true,
          ]);
          revision = results[0].revision;
          const visible = await read();
          assert.ok(validProfile(visible));
          assert.deepEqual(visible.coreFields, [
            {fieldId: "age", value: 32},
            {fieldId: "occupation", value: "Founder"},
          ]);
          assert.deepEqual(visible.cardFields, [
            {label: "Favourite drink", value: "Tequila"},
          ]);
          assert.equal(JSON.stringify(visible).includes("private"), false);
          const stored = (
            await ref(
              "eventChatProfileShares",
              eventChatMembershipId(eventId, person),
            ).get()
          ).data()!;
          assert.equal(JSON.stringify(stored).includes("Tequila"), false);
          assert.equal(Object.hasOwn(stored.selection, "firstName"), false);
          assert.equal(Object.hasOwn(stored.selection, "introduction"), false);
          await assert.rejects(save({...chosen,
            termsVersion: "event-profile-sharing-v1"}), {code: "aborted"});
          await save(null);
          assert.deepEqual((await read()).coreFields, []);
          await update(req, deps);
          assert.deepEqual(
            (await read()).cardFields,
            [],
            "old replay must not restore sharing",
          );
          await assert.rejects(
            update(
              {...req, data: {...(req.data as object), selection: null}},
              deps,
            ),
            {code: "already-exists"},
          );
          await save({...chosen, card: null,
            termsVersion: "event-profile-sharing-v1"});
          const legacy = (await ref("eventChatProfileShares",
            eventChatMembershipId(eventId, person)).get()).data()!;
          assert.equal(Object.hasOwn(legacy.selection, "firstName"), false);
          assert.equal(Object.hasOwn(legacy.selection, "introduction"), false);
          await save();
        },
      );
      await t.test(
        "foreign cards, unselected answers, images and stale edits fail closed",
        async () => {
          const definition = (await version.get()).data()!.definition;
          const oldDefinition = structuredClone(definition);
          delete oldDefinition.sections[0].questions[0].answerAudience;
          await version.update({definition: oldDefinition});
          assert.deepEqual((await read()).cardFields, [],
            "legacy versions do not grant attendee audience");
          await version.update({definition});
          for (const patch of [
            {responseId: foreign},
            {questionIds: ["private"]},
            {questionIds: ["image"]},
            {revision: 0},
          ]) {
            await assert.rejects(
              save({...chosen, card: {...chosen.card!, ...patch}}),
            );
          }
          await assert.rejects(save({...chosen, profileRevision: 0}), {
            code: "aborted",
          });
          await assert.rejects(save({...chosen, membershipRevision: 0}), {
            code: "aborted",
          });
          await card.update({revision: 2, questionIds: []});
          assert.deepEqual((await read()).cardFields, []);
          await card.update({revision: 3, questionIds: ["cocktail"]});
          assert.deepEqual(
            (await read()).cardFields,
            [],
            "reselection is not a new grant",
          );
          chosen.card!.revision = 3;
          await save();
        },
      );
      await t.test(
        "both block directions, source withdrawal and profile changes are live",
        async () => {
          for (const [a, b] of [
            [person, host],
            [host, person],
          ]) {
            const block = await put("blocks", blockDocId(a, b), {
              blockerUserId: a,
              blockedUserId: b,
            });
            await assert.rejects(read(), {code: "permission-denied"});
            await block.delete();
          }
          await response.update({withdrawnAt: now});
          assert.deepEqual((await read()).cardFields, []);
          await response.update({withdrawnAt: null});
          await ref("users", person).update({
            profileRevision: 2,
            occupation: "New role",
          });
          assert.deepEqual((await read()).coreFields, []);
          chosen.profileRevision = 2;
          await save();
        },
      );
      await t.test(
        "leave and rejoin never revive an earlier sharing choice",
        async () => {
          await change("leave", 1);
          await assert.rejects(read(), {code: "permission-denied"});
          await change("join", 2);
          assert.deepEqual((await read()).coreFields, []);
          assert.deepEqual((await read()).cardFields, []);
          chosen.membershipRevision = 3;
          await save();
        },
      );
      await t.test(
        "photo processing rechecks revocation and never returns bearer URLs",
        async () => {
          await ref("users", person).update({
            profilePhotos: [
              {
                id: "photo",
                position: 0,
                url: "https://example.test/secret",
                thumbnailUrl: "https://example.test/secret-thumb",
                storagePath: `users/${person}/photos/photo.jpg`,
                thumbnailStoragePath:
                  `users/${person}/photoThumbnails/photo.jpg`,
                createdAt: now,
                updatedAt: now,
                moderation: {status: "approved"},
              },
            ],
          });
          await save({...chosen, photoId: "photo"});
          const image = await read();
          assert.ok(validProfile(image));
          assert.equal(image.photo?.previewBase64, "YWJj");
          assert.equal(JSON.stringify(image).includes("https://"), false);
          await assert.rejects(
            profile(request(host, {participantUid: person}), {
              ...deps,
              readPhoto: async () => {
                await save(null);
                return deps.readPhoto();
              },
            }),
            {code: "permission-denied"},
          );
        },
      );
      await t.test(
        "revocation survives cancellation and missing events; deletion " +
          "fences reads",
        async () => {
          await save();
          await participation.update({status: "cancelled"});
          await assert.rejects(read(), {code: "permission-denied"});
          const own = await settings(request(person, {}), deps);
          assert.equal(own.canShare, false);
          await save(null);
          await ref("events", eventId).delete();
          await save(null);
          await put("deletedUsers", person, {status: "processing"});
          await assert.rejects(settings(request(person, {}), deps), {
            code: "permission-denied",
          });
          await assert.rejects(save(null), {code: "permission-denied"});
        },
      );
      // A proposal remains a private answer pointer, not a public profile copy.
      assert.ok((await proposal.get()).exists);
    } finally {
      const rows = await db
        .collection("eventChatAccessReceipts")
        .where("eventId", "==", eventId)
        .get();
      const batch = db.batch();
      for (const doc of [
        ...refs,
        ...rows.docs.map((row) => row.ref),
        ref("eventChatProfileShares", eventChatMembershipId(eventId, person)),
      ]) {
        batch.delete(doc);
      }
      await batch.commit();
      await deleteApp(app);
    }
  },
);
