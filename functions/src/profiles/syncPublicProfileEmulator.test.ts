import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {syncOrganizerHostProfile} from "./syncPublicProfile";
import {addOrganizerManagerHandler, removeOrganizerManagerHandler,
  transferOrganizerOwnershipHandler} from "../organizers/manageOrganizerTeam";
import {getOrganizerEventSetupDefaultsHandler} from
  "../organizers/eventSetupDefaults/callables";
import {isOrganizerManager} from "../shared/organizerHosts";

// Load the browser rules client at runtime, as the existing CJS rules tests do;
// its Temporal types exceed the Functions ES2022 compilation target.
const requireTestClient = createRequire(__filename);
const {assertFails, assertSucceeds, initializeTestEnvironment} =
  requireTestClient("@firebase/rules-unit-testing");
const {doc, getDoc} = requireTestClient("firebase/firestore");

const emulator = process.env.FIRESTORE_EMULATOR_HOST;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return {promise, resolve};
}

/** Pause sync's team query after capturing the real emulator snapshot. */
function delayedDiscovery(db: FirebaseFirestore.Firestore) {
  const captured = deferred();
  const release = deferred();
  const syncDb = {
    collection: (name: string) => {
      assert.equal(name, "organizers");
      return {
        where: (field: string, op: FirebaseFirestore.WhereFilterOp,
          value: unknown) => ({get: async () => {
          const snapshot = await db.collection(name).where(field, op, value)
            .get();
          if (field === "hostUserIds") {
            captured.resolve();
            await release.promise;
          }
          return snapshot;
        }}),
      };
    },
    batch: () => db.batch(),
    runTransaction: db.runTransaction.bind(db),
  } as unknown as FirebaseFirestore.Firestore;
  return {syncDb, captured: captured.promise, release: release.resolve};
}

test("removal and transfer fence stale sync and callable/rules access",
  {skip: !emulator, timeout: 60000}, async () => {
    assert.match(emulator!, /^(127\.0\.0\.1|localhost):[0-9]+$/u);
    const projectId = "demo-catch-profile-authority";
    const suffix = randomUUID();
    const organizerId = `org-${suffix}`;
    const owner = `owner-${suffix}`;
    const manager = `manager-${suffix}`;
    const app = initializeApp({projectId}, suffix);
    const db = getEmulatorFirestore(app);
    const [host, port] = emulator!.split(":");
    const env = await initializeTestEnvironment({projectId, firestore: {
      host, port: Number(port),
      rules: readFileSync(
        resolve(__dirname, "../../../firestore.rules"), "utf8"),
    }});
    const organizerRef = db.collection("organizers").doc(organizerId);
    const teamRef = (uid: string) => db.collection("organizerTeamMemberships")
      .doc(`${organizerId}_${uid}`);
    const venueRef = db.collection("organizerEventVenues").doc(organizerId);
    const profileRef = (uid: string) => db.collection("hostProfiles").doc(uid);
    const deps = {firestore: () => db, checkRateLimit: async () => undefined};
    const request = (uid: string, target: string) => ({auth: {uid},
      data: {organizerId, uid: target}} as never);
    const view = (uid: string) => getOrganizerEventSetupDefaultsHandler({
      auth: {uid}, data: {organizerId},
    } as never, deps);
    const directRead = (uid: string) => getDoc(doc(
      env.authenticatedContext(uid).firestore(), venueRef.path));
    const seed = async () => {
      await organizerRef.set({ownerUserId: owner, hostUserId: owner,
        hostUserIds: [owner, manager], status: "active", archived: false,
        hostName: "Owner", hostAvatarUrl: null, hostProfiles: [
          {uid: owner, displayName: "Owner", avatarUrl: null, role: "owner"},
          {uid: manager, displayName: "Manager", avatarUrl: null, role: "host"},
        ]});
      await teamRef(manager).set({organizerId, uid: manager,
        status: "active", role: "manager"});
      await teamRef(owner).set({organizerId, uid: owner,
        status: "active", role: "owner"});
      await profileRef(manager).set({displayName: "Manager", avatarUrl: null});
      await profileRef(owner).set({displayName: "Owner", avatarUrl: null});
      await venueRef.set({organizerId});
    };
    const runDelayed = async (uid: string, mutate: () => Promise<unknown>) => {
      const gate = delayedDiscovery(db);
      const syncing = syncOrganizerHostProfile(uid,
        {hostName: "Updated", hostAvatarUrl: null},
        {firestore: () => gate.syncDb});
      await gate.captured;
      try {
        await mutate();
      } finally {
        gate.release();
        await syncing;
      }
    };
    try {
      for (const syncingUid of [manager, owner]) {
        await seed();
        await view(manager);
        await assertSucceeds(directRead(manager));
        await runDelayed(syncingUid, () => removeOrganizerManagerHandler(
          request(owner, manager), deps));
        const organizer = (await organizerRef.get()).data()!;
        assert.equal((await teamRef(manager).get()).data()?.status, "removed");
        assert.deepEqual(organizer.hostUserIds, [owner]);
        await assertFails(directRead(manager));
        await assert.rejects(view(manager), {code: "permission-denied"});
        assert.equal(isOrganizerManager(organizer as never, manager), false);
        assert.equal(isOrganizerManager(organizer as never, manager), false);
        const profileIds = organizer.hostProfiles
          .map((p: {uid: string}) => p.uid);
        assert.deepEqual(profileIds, [owner]);
        await view(owner);
        await assertSucceeds(directRead(owner));

        // Even a pre-existing stale projection must grant no callable access.
        await organizerRef.update({hostProfiles: [...organizer.hostProfiles,
          {uid: manager, displayName: "Stale", avatarUrl: null,
            role: "host"}]});
        await assert.rejects(view(manager), {code: "permission-denied"});
        await assertFails(directRead(manager));
        await assert.rejects(transferOrganizerOwnershipHandler(
          request(owner, manager), deps), {code: "failed-precondition"});
        // A deliberate team add still restores the seat through its writer.
        await addOrganizerManagerHandler(request(owner, manager), deps);
        assert.equal((await teamRef(manager).get()).data()?.status, "active");
        await view(manager);
        await assertSucceeds(directRead(manager));
      }
      await seed();
      await runDelayed(owner, () => transferOrganizerOwnershipHandler(
        request(owner, manager), deps));
      const transferred = (await organizerRef.get()).data()!;
      assert.equal(transferred.hostName, "Manager");
      const roles = transferred.hostProfiles
        .map((p: {uid: string; role: string}) => [p.uid, p.role]);
      assert.deepEqual(roles, [[manager, "owner"], [owner, "host"]]);
      assert.equal((await teamRef(manager).get()).data()?.role, "owner");
      assert.equal((await teamRef(owner).get()).data()?.role, "manager");
      await runDelayed(owner, () => removeOrganizerManagerHandler(
        request(manager, owner), deps));
      await assert.rejects(view(owner), {code: "permission-denied"});
      await assertFails(directRead(owner));
      await view(manager);
      await assertSucceeds(directRead(manager));
    } finally {
      await Promise.all([
        organizerRef, teamRef(owner), teamRef(manager), venueRef,
        profileRef(owner), profileRef(manager)].map((ref) => ref.delete()));
      await env.cleanup();
      await deleteApp(app);
    }
  });
