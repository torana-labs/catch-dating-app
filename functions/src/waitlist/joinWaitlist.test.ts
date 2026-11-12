import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import * as admin from "firebase-admin";
import {
  joinWaitlist, createJoinWaitlistHandler,
  normalizeHostApplication,
  normalizeMarketingAnalytics,
  normalizeMarketingAttribution,
  normalizeProgrammeApplication,
  normalizeWaitlistRole,
  waitlistSubmissionId,
  resolveWaitlistCorsOrigin,
  waitlistAllowedOrigins,
  whatsappLaunchNoticeId,
} from "./joinWaitlist";
import {hostConsentKey, newHostConsentAuthority} from
  "../acquisition/consentPolicy";
import type {JoinWaitlistHTTPRequest} from
  "../shared/generated/joinWaitlistHttpRequest";
import type {JoinWaitlistHTTPResponse} from
  "../shared/generated/joinWaitlistHttpResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validateJoinWaitlistHTTPRequest =
  contractValidator<JoinWaitlistHTTPRequest>("JoinWaitlistHTTPRequest");
const validateJoinWaitlistHTTPResponse =
  contractValidator<JoinWaitlistHTTPResponse>("JoinWaitlistHTTPResponse");

const contractRoot = fs.existsSync(path.resolve(process.cwd(), "contracts")) ?
  path.resolve(process.cwd(), "contracts") :
  path.resolve(process.cwd(), "..", "contracts");

function readFixture(relativePath: string): unknown {
  return JSON.parse(
    fs.readFileSync(path.resolve(contractRoot, relativePath), "utf8")
  );
}

test(
  "join waitlist schemas cover member, host, and runner compatibility",
  () => {
    for (const fixture of [
      "fixtures/valid/join_waitlist_request_member.json",
      "fixtures/valid/join_waitlist_request_host.json",
      "fixtures/valid/join_waitlist_request_runner_compatibility.json",
      "fixtures/valid/join_waitlist_request_whatsapp.json",
      "fixtures/valid/join_waitlist_request_weddings.json",
      "fixtures/valid/join_waitlist_request_host_phone_only.json",
      "fixtures/valid/join_waitlist_request_whatsapp_city_id.json",
      "fixtures/valid/join_waitlist_request_whatsapp_city_other.json",
    ]) {
      assert.equal(validateJoinWaitlistHTTPRequest(readFixture(fixture)), true);
    }
    for (const fixture of [
      "fixtures/invalid/join_waitlist_request_missing_city.json",
      "fixtures/invalid/join_waitlist_request_member_missing_email.json",
      "fixtures/invalid/join_waitlist_request_whatsapp_host.json",
      "fixtures/invalid/join_waitlist_request_whatsapp_marketing_unset.json",
      "fixtures/invalid/join_waitlist_request_weddings_member.json",
      "fixtures/invalid/join_waitlist_request_host_missing_contact.json",
      "fixtures/invalid/join_waitlist_request_city_id_not_catalog_shape.json",
      "fixtures/invalid/join_waitlist_request_unknown_city_source.json",
    ]) {
      assert.equal(
        validateJoinWaitlistHTTPRequest(readFixture(fixture)), false, fixture);
    }
  }
);

test("WhatsApp launch notices store the consented phone per city",
  async (context) => {
    if (!admin.apps.length) {
      admin.initializeApp({projectId: "demo-sales-intent"});
    }
    const database = admin.firestore();
    const records = new Map<string, Record<string, unknown>>();
    type TransactionRunner = (tx: unknown) => Promise<unknown>;
    context.mock.method(database,
      "runTransaction",
      async (run: TransactionRunner) => {
        const writes: Array<{path: string; value: Record<string, unknown>}> =
          [];
        const tx = {
          get: async (ref: {path: string}) => ({
            exists: records.has(ref.path),
            data: () => records.get(ref.path),
          }),
          create: (ref: {path: string}, value: Record<string, unknown>) => {
            assert.equal(records.has(ref.path), false);
            writes.push({path: ref.path, value});
          },
          update: (ref: {path: string}, value: Record<string, unknown>) => {
            assert.equal(records.has(ref.path), true);
            writes.push({path: ref.path,
              value: {...records.get(ref.path), ...value}});
          },
          set: (ref: {path: string}, value: Record<string, unknown>) => {
            writes.push({path: ref.path, value});
          },
        };
        await run(tx);
        for (const write of writes) records.set(write.path, write.value);
      });
    const body = readFixture(
      "fixtures/valid/join_waitlist_request_whatsapp.json") as
      Record<string, unknown>;
    const whatsapp = body.whatsapp as Record<string, unknown>;
    let attempt = 0;
    const submit = async (payload: unknown) => {
      let status = 0;
      let result: unknown;
      const response = {
        set: () => undefined,
        status: (value: number) => {
          status = value; return response;
        },
        json: (value: unknown) => {
          result = value; return response;
        },
        send: () => undefined,
      };
      await joinWaitlist({method: "POST",
        body: payload,
        ip: `synthetic-whatsapp-test-${++attempt}`,
        get: () => undefined} as never, response as never);
      return {status, result};
    };

    assert.deepEqual(await submit({...body,
      whatsapp: {...whatsapp, phone: "+91 98123-45678"}}),
    {status: 200, result: {ok: true, alreadyJoined: false}});
    const id = whatsappLaunchNoticeId("+919812345678", "Pune");
    const notice = records.get(`launchWaitlist/${id}`)!;
    assert.equal(notice.channel, "whatsapp");
    assert.equal(notice.phone, "+919812345678");
    assert.equal(notice.city, "Pune");
    assert.equal(notice.email, null);
    assert.equal(notice.fullName, null);
    assert.equal(notice.status, "pending");
    const consents = notice.consents as
      Record<string, Record<string, unknown>>;
    assert.equal(consents.launchNotice.granted, true);
    assert.equal(consents.launchNotice.channel, "whatsapp");
    assert.equal(consents.marketing.granted, false);
    assert.equal(consents.marketing.consentVersion, "city-launch-whatsapp-v1");
    assert.equal(
      records.get(`marketingConversionEvents/${id}`)?.eventName,
      "waitlist_submitted");

    // Asking again updates the same request; a choice made later replaces it.
    assert.deepEqual(await submit({...body,
      whatsapp: {...whatsapp, marketing: true}}),
    {status: 200, result: {ok: true, alreadyJoined: true}});
    const again = records.get(`launchWaitlist/${id}`)!;
    assert.equal(
      (again.consents as typeof consents).marketing.granted, true);
    assert.equal(again.status, "pending");

    // Another city is its own request.
    await submit({...body, city: "Jaipur"});
    assert.equal([...records.keys()].filter(
      (key) => key.startsWith("launchWaitlist/")).length, 2);

    const before = records.size;
    for (const rejected of [
      {...body, whatsapp: {...whatsapp, phone: "98123"}},
      {...body, role: "host"},
      {...body, city: ""},
      {...body, whatsapp: {...whatsapp, launchNotice: false}},
      {...body, whatsapp: {...whatsapp, marketing: undefined}},
    ]) {
      assert.equal((await submit(rejected)).status, 400);
    }
    assert.equal(records.size, before);
  });

test("a launch notice records its catalog city and counts each person " +
  "once per city", async (context) => {
  if (!admin.apps.length) {
    admin.initializeApp({projectId: "demo-sales-intent"});
  }
  const database = admin.firestore();
  const records = new Map<string, Record<string, unknown>>();
  const counted: string[] = [];
  context.mock.method(database, "runTransaction",
    async (run: (tx: unknown) => Promise<unknown>) => {
      const writes: Array<[string, Record<string, unknown>]> = [];
      await run({
        get: async (ref: {path: string}) => {
          assert.equal(writes.length, 0, "every read precedes the writes");
          return {exists: records.has(ref.path),
            data: () => records.get(ref.path)};
        },
        create: (ref: {path: string}, value: Record<string, unknown>) => {
          assert.equal(records.has(ref.path), false);
          writes.push([ref.path, value]);
        },
        update: (ref: {path: string}, value: Record<string, unknown>) => {
          writes.push([ref.path, {...records.get(ref.path), ...value}]);
        },
        set: (ref: {path: string}, value: Record<string, unknown>) => {
          if (ref.path.startsWith("cityInterest/")) counted.push(ref.path);
          writes.push([ref.path, value]);
        },
      });
      for (const [key, value] of writes) records.set(key, value);
    });
  const body = readFixture(
    "fixtures/valid/join_waitlist_request_whatsapp_city_id.json") as
    Record<string, unknown>;
  let attempt = 0;
  const submit = async (payload: unknown) => {
    let status = 0;
    let result: unknown;
    const response = {set: () => undefined,
      status: (value: number) => {
        status = value; return response;
      },
      json: (value: unknown) => {
        result = value; return response;
      },
      send: () => undefined};
    await joinWaitlist({method: "POST", body: payload,
      ip: `synthetic-city-interest-${++attempt}`,
      get: () => undefined} as never, response as never);
    return {status, result};
  };

  assert.equal((await submit(body)).status, 200);
  const notice = records.get(`launchWaitlist/${
    whatsappLaunchNoticeId("+919812345678", "Pune")}`)!;
  assert.equal(notice.cityId, "in-mh-pune");
  assert.equal(notice.countryIsoCode, "IN");
  assert.equal(notice.citySource, "network_guess");
  assert.equal(notice.cityOther, null);
  assert.deepEqual(counted, ["cityInterest/in-mh-pune"]);
  const markers = [...records.keys()]
    .filter((key) => key.startsWith("cityInterestMarkers/"));
  assert.equal(markers.length, 1);
  assert.equal(markers[0].includes("9812345678"), false,
    "the marker id never carries the number");

  // Asking again for the same city counts once.
  assert.equal((await submit({...body, citySource: "picked"})).status, 200);
  assert.deepEqual(counted, ["cityInterest/in-mh-pune"]);

  // A city the catalog does not have counts under its country's Other.
  const other = readFixture(
    "fixtures/valid/join_waitlist_request_whatsapp_city_other.json");
  assert.equal((await submit(other)).status, 200);
  assert.deepEqual(counted,
    ["cityInterest/in-mh-pune", "cityInterest/other-in"]);

  const before = records.size;
  for (const rejected of [
    {...body, cityId: "in-xx-atlantis"},
    {...body, cityId: "in-mh-pune", countryIsoCode: "NP"},
    {...body, cityId: null},
  ]) {
    assert.equal((await submit(rejected)).status, 400);
  }
  assert.equal(records.size, before);
});

test("join waitlist response schema distinguishes success and errors", () => {
  assert.equal(
    validateJoinWaitlistHTTPResponse(
      readFixture("fixtures/valid/join_waitlist_response_success.json")
    ),
    true
  );
  assert.equal(
    validateJoinWaitlistHTTPResponse(
      readFixture("fixtures/valid/join_waitlist_response_error.json")
    ),
    true
  );
  assert.equal(
    validateJoinWaitlistHTTPResponse(
      readFixture("fixtures/invalid/join_waitlist_response_missing_ok.json")
    ),
    false
  );
});

test("waitlistAllowedOrigins includes production custom domains", () => {
  const origins = waitlistAllowedOrigins("catch-dating-app-64e51");

  assert.equal(origins.has("https://catchdates.com"), true);
  assert.equal(origins.has("https://www.catchdates.com"), true);
  assert.equal(origins.has("http://127.0.0.1:5175"), true);
  assert.equal(origins.has("http://127.0.0.1:4187"), true);
  assert.equal(
    origins.has("https://catch-dating-app-64e51.web.app"),
    true
  );
});

test("waitlistAllowedOrigins scopes non-prod projects", () => {
  const origins = waitlistAllowedOrigins("catchdates-dev");

  assert.equal(origins.has("https://catchdates-dev.web.app"), true);
  assert.equal(origins.has("https://catchdates-dev.firebaseapp.com"), true);
  assert.equal(origins.has("https://catchdates.com"), false);
});

test("resolveWaitlistCorsOrigin rejects unknown origins", () => {
  assert.equal(
    resolveWaitlistCorsOrigin(
      "https://attacker.example",
      "catch-dating-app-64e51"
    ),
    null
  );
});

test("normalizeWaitlistRole maps legacy runner to member", () => {
  assert.equal(normalizeWaitlistRole("runner"), "member");
  assert.equal(normalizeWaitlistRole("member"), "member");
  assert.equal(normalizeWaitlistRole("host"), "host");
});

test("normalizeMarketingAttribution keeps known campaign fields", () => {
  const attribution = normalizeMarketingAttribution({
    firstTouch: {
      capturedAt: "2026-06-02T00:00:00.000Z",
      landingPath: "/?utm_source=meta&utm_campaign=mumbai",
      landingUrl: "https://catchdates.com/?utm_source=meta",
      referrer: "https://instagram.com/",
      values: {
        fbclid: "fb-1",
        ignored: "drop-me",
        utm_campaign: "mumbai_hosts",
        utm_source: "meta",
      },
    },
    lastTouch: {
      values: {
        gclid: "google-click",
      },
    },
  });

  assert.deepEqual(attribution, {
    firstTouch: {
      capturedAt: "2026-06-02T00:00:00.000Z",
      landingPath: "/?utm_source=meta&utm_campaign=mumbai",
      landingUrl: "https://catchdates.com/?utm_source=meta",
      referrer: "https://instagram.com/",
      values: {
        fbclid: "fb-1",
        utm_campaign: "mumbai_hosts",
        utm_source: "meta",
      },
    },
    lastTouch: {
      capturedAt: null,
      landingPath: null,
      landingUrl: null,
      referrer: null,
      values: {
        gclid: "google-click",
      },
    },
  });
});

test("normalizeMarketingAnalytics keeps consent and event metadata", () => {
  assert.deepEqual(
    normalizeMarketingAnalytics({
      consent: {
        analytics: true,
        choice: "accepted",
        marketing: true,
        updatedAt: "2026-06-02T00:00:00.000Z",
      },
      eventId: "waitlist_123",
      formVariant: "member",
      pagePath: "/?utm_source=meta",
      pageTitle: "Catch",
      submittedAt: "2026-06-02T00:01:00.000Z",
    }),
    {
      consent: {
        analytics: true,
        choice: "accepted",
        marketing: true,
        updatedAt: "2026-06-02T00:00:00.000Z",
      },
      eventId: "waitlist_123",
      formVariant: "member",
      pagePath: "/?utm_source=meta",
      pageTitle: "Catch",
      submittedAt: "2026-06-02T00:01:00.000Z",
    }
  );
});

test("normalizeHostApplication keeps bounded operating fields", () => {
  assert.equal(Object.hasOwn(normalizeHostApplication({
    organizationName: "Existing enquiry",
  })!, "eventPricing"), false, "legacy packets retain their replay hash");
  assert.deepEqual(
    normalizeHostApplication({
      organizationName: "  Sunday Table  ",
      organizationType: "Venue",
      operatingCity: "Mumbai",
      communityLink: "https://example.com/events",
      formats: ["Dinner", "Dinner", "Singles mixer"],
      eventCadence: "Monthly",
      eventPricing: "paid",
      nextEventName: "Long table no. 1",
      nextEventDate: "2026-06-21",
      eventLocation: "Bandra",
      expectedCapacity: "24",
      bookingPlatform: "Luma",
      guestListFormat: "CSV",
      priceRange: "₹1,000–₹2,000",
      admissionModel: "Request to join",
      waitlistPlan: "Ranked timed offers",
      paymentReadiness: "Need Catch payment onboarding",
      eventSuccessModules: [
        "Attendance and live roster",
        "Private catch window",
      ],
      hostGoals: "Improve review quality",
      operatingNotes: "Need help with arrival flow",
      ignored: "drop me",
    }),
    {
      organizationName: "Sunday Table",
      organizationType: "Venue",
      operatingCity: "Mumbai",
      communityLink: "https://example.com/events",
      formats: ["Dinner", "Singles mixer"],
      eventCadence: "Monthly",
      eventPricing: "paid",
      nextEventName: "Long table no. 1",
      nextEventDate: "2026-06-21",
      eventLocation: "Bandra",
      expectedCapacity: "24",
      bookingPlatform: "Luma",
      guestListFormat: "CSV",
      priceRange: "₹1,000–₹2,000",
      admissionModel: "Request to join",
      waitlistPlan: "Ranked timed offers",
      paymentReadiness: "Need Catch payment onboarding",
      eventSuccessModules: [
        "Attendance and live roster",
        "Private catch window",
      ],
      hostGoals: "Improve review quality",
      operatingNotes: "Need help with arrival flow",
    }
  );
});

test("normalizeHostApplication drops empty payloads", () => {
  assert.equal(normalizeHostApplication({formats: []}), null);
  assert.equal(normalizeHostApplication(null), null);
});


test("host intents preserve changes and exact retries", async (context) => {
  if (!admin.apps.length) admin.initializeApp({projectId: "demo-sales-intent"});
  const database = admin.firestore();
  const records = new Map<string, Record<string, unknown>>();
  let committedWrites = 0;
  type TransactionRunner = (tx: unknown) => Promise<unknown>;
  context.mock.method(database,
    "runTransaction",
    async (run: TransactionRunner) => {
      const writes: Array<{path: string; value: Record<string, unknown>}> = [];
      const tx = {
        get: async (ref: {path: string}) => ({exists: records.has(ref.path),
          data: () => records.get(ref.path)}),
        create: (ref: {path: string}, value: Record<string, unknown>) => {
          assert.equal(records.has(ref.path), false);
          writes.push({path: ref.path, value});
        },
        update: (ref: {path: string}, value: Record<string, unknown>) => {
          assert.equal(records.has(ref.path), true);
          writes.push({path: ref.path,
            value: {...records.get(ref.path),
              ...value}});
        },
        set: (ref: {path: string}, value: Record<string, unknown>) => {
          writes.push({path: ref.path, value});
        },
      };
      await run(tx);
      for (const write of writes) records.set(write.path, write.value);
      committedWrites += writes.length;
    });
  const body = readFixture("fixtures/valid/join_waitlist_request_host.json") as
    Record<string, unknown>;
  body.email = "synthetic-intent@example.test";
  const analytics = body.analytics as Record<string, unknown>;
  let attempt = 0;
  const submit = async (payload: unknown) => {
    let status = 0;
    let result: unknown;
    const response = {
      set: () => undefined,
      status: (value: number) => {
        status = value; return response;
      },
      json: (value: unknown) => {
        result = value; return response;
      },
      send: () => undefined,
    };
    await joinWaitlist({method: "POST",
      body: payload,
      ip: `synthetic-intent-test-${++attempt}`,
      get: () => undefined} as never, response as never);
    return {status, result};
  };
  const first = await submit(body);
  const firstReceipt = (first.result as {
    hostLead: {eventId: string; isNew: boolean};
  }).hostLead;
  assert.match(firstReceipt.eventId, /^host_lead_[0-9]{13}_[a-f0-9-]{36}$/);
  assert.equal(firstReceipt.isNew, true);
  assert.deepEqual(first, {status: 200,
    result: {ok: true, alreadyJoined: false, hostLead: firstReceipt}});
  const count = committedWrites;
  assert.deepEqual(await submit(body), first);
  assert.equal(committedWrites, count);
  const changed = {...body, city: "Different City"};
  assert.equal((await submit(changed)).status, 409);
  assert.equal(committedWrites, count);
  const next = {...changed,
    analytics: {...analytics,
      eventId: "distinct-submission"}};
  assert.deepEqual(
    await submit(next), {status: 200, result: {ok: true, alreadyJoined: true,
      hostLead: {...firstReceipt, isNew: false}}});
  assert.equal(
    [...records.keys()].filter(
      (key) => key.startsWith("salesInboundIntents/")).length,
    2);
  assert.equal(
    [...records.keys()].filter(
      (key) => key.startsWith("launchWaitlist/")).length,
    1);
  assert.equal(
    [...records.keys()].some((key) => key.startsWith("organizers/")), false);
  const captured =
    [...records.values()].filter(
      (row) => row.classification === "sales_private");
  assert.deepEqual(
    captured.map((row) => row.city), [body.city, "Different City"]);

  // An existing attendee is still a new Host acquisition.
  const attendeeEmail = "prior-attendee@example.test";
  const attendeeId = Buffer.from(attendeeEmail).toString("base64url");
  records.set(`launchWaitlist/${attendeeId}`, {role: "member"});
  const hostResult = await submit({...body, email: attendeeEmail});
  const accepted = hostResult.result as {alreadyJoined: boolean;
    hostLead: {isNew: boolean; eventId: string}};
  assert.equal(accepted.alreadyJoined, true);
  assert.equal(accepted.hostLead.isNew, true);
  assert.notEqual(accepted.hostLead.eventId, firstReceipt.eventId);

  // A pre-receipt enquiry carries the migrated not-new lead, so a later
  // member-role overwrite never turns it into a new acquisition.
  const preReceiptLead = "host_lead_1700000000000_" +
    "0d5f7c2a-1b3e-4c5d-8e9f-0a1b2c3d4e5f";
  records.get(`launchWaitlist/${attendeeId}`)!.hostLead =
    {eventId: preReceiptLead, isNew: false};
  records.get(`launchWaitlist/${attendeeId}`)!.role = "member";
  const revisit = await submit({...body, email: attendeeEmail,
    analytics: {...analytics, eventId: "pre-receipt-host-revisit"}});
  assert.equal(revisit.status, 200, JSON.stringify(revisit));
  assert.deepEqual((revisit.result as typeof accepted).hostLead,
    {eventId: preReceiptLead, isNew: false});

  const beforeTrap = committedWrites;
  const trap = await submit({...body, website: "bot"});
  assert.deepEqual(trap.result, {ok: true, alreadyJoined: false});
  assert.equal(committedWrites, beforeTrap);
});


test("enabled intake binds one queue row to a new consented Host receipt",
  async (context) => {
    if (!admin.apps.length) {
      admin.initializeApp({projectId: "demo-sales-intent"});
    }
    const database = admin.firestore();
    const priorProject = process.env.GCLOUD_PROJECT;
    process.env.GCLOUD_PROJECT = "catch-dating-app-64e51";
    context.after(() => {
      if (priorProject === undefined) delete process.env.GCLOUD_PROJECT;
      else process.env.GCLOUD_PROJECT = priorProject;
    });
    const capability = "c".repeat(64);
    const consentId = hostConsentKey(capability)!;
    const now = Date.now();
    const authority = newHostConsentAuthority({version: 1,
      purpose: "host_acquisition_measurement", analytics: true,
      advertising: true, chosenAt: now}, now);
    const stamp = admin.firestore.Timestamp.fromMillis(now);
    const records = new Map<string, Record<string, unknown>>([
      [`hostAcquisitionConsents/${consentId}`, {schemaVersion: 1,
        classification: "sales_private", consentId, status: "active",
        authority, createdAt: stamp, updatedAt: stamp,
        expiresAt: admin.firestore.Timestamp.fromMillis(authority.expiresAt)}],
    ]);
    context.mock.method(database, "runTransaction",
      async (run: (tx: unknown) => Promise<unknown>) => {
        const writes = new Map<string, Record<string, unknown>>();
        await run({
          get: async (ref: {path?: string}) => {
            assert.equal(writes.size, 0,
              "every authority read precedes writes");
            return ref.path ? {exists: records.has(ref.path),
              data: () => records.get(ref.path!)} : {size: 0};
          },
          create: (ref: {path: string}, value: Record<string, unknown>) => {
            assert.equal(records.has(ref.path), false);
            writes.set(ref.path, value);
          },
          set: (ref: {path: string}, value: Record<string, unknown>) => {
            writes.set(ref.path, value);
          },
          update: (ref: {path: string}, value: Record<string, unknown>) => {
            writes.set(ref.path, {...records.get(ref.path), ...value});
          },
        });
        for (const [key, value] of writes) records.set(key, value);
      });
    const handler = createJoinWaitlistHandler({measurementEnabled: true});
    const original = readFixture(
      "fixtures/valid/join_waitlist_request_host.json") as
      Record<string, unknown>;
    const body = {...original, email: "synthetic-measured-host@example.test",
      attribution: {firstTouch: {capturedAt: new Date(now).toISOString(),
        landingPath: "/host/", landingUrl: "https://catchdates.com/host/",
        referrer: null, values: {utm_source: "google", utm_medium: "cpc",
          utm_campaign: "host_acquisition_2026"}},
      lastTouch: {capturedAt: new Date(now).toISOString(),
        landingPath: "/host/apply/",
        landingUrl: "https://catchdates.com/host/apply/", referrer: null,
        values: {utm_source: "google", utm_medium: "cpc",
          utm_campaign: "host_acquisition_2026"}}},
      hostMeasurement: {capability, clientId: "123.1792512000"}};
    let calls = 0;
    const submit = async (payload: unknown) => {
      let status = 0;
      let result: {hostLead?: {eventId: string; isNew: boolean}} = {};
      const response = {set: () => undefined,
        status: (value: number) => {
          status = value; return response;
        },
        json: (value: typeof result) => {
          result = value;
        }, send: () => undefined};
      await handler({method: "POST", body: payload,
        ip: `synthetic-measurement-${++calls}`,
        get: (key: string) => key === "origin" ? "https://catchdates.com" :
          key === "user-agent" ? "Synthetic Host browser" : undefined,
      } as never, response as never);
      assert.equal(status, 200);
      return result;
    };
    const first = await submit(body);
    const queuePath = `hostAcquisitionDeliveries/${first.hostLead!.eventId}`;
    const queued = records.get(queuePath)!;
    assert.ok(queued);
    assert.equal(queued.consentId, consentId);
    assert.deepEqual(queued.context,
      {clientId: "123.1792512000", userAgent: "Synthetic Host browser"});
    const intent = records.get(`salesInboundIntents/${queued.intentId}`)!;
    assert.deepEqual(intent.hostLead, first.hostLead);
    const attributionSnapshot = structuredClone(intent.acquisitionAttribution);
    assert.ok(attributionSnapshot);
    assert.equal([...records.entries()].find(([key]) =>
      key.startsWith("launchWaitlist/"))![1].marketingAttribution, null);
    const privateQueue = JSON.stringify(queued);
    assert.equal(privateQueue.includes(capability), false);
    assert.equal(privateQueue.includes(String(body.email)), false);
    const size = records.size;
    assert.deepEqual(await submit(body), first);
    assert.equal(records.size, size, "exact replay never queues twice");
    const changedCampaign = {...body, attribution: {...body.attribution,
      lastTouch: {...body.attribution.lastTouch,
        values: {utm_source: "meta", utm_medium: "paid_social",
          utm_campaign: "host_acquisition_2026"}}}};
    assert.deepEqual(await submit(changedCampaign), first);
    assert.deepEqual(intent.acquisitionAttribution, attributionSnapshot,
      "campaign changes on replay cannot rewrite accepted attribution");
    const later = await submit({...changedCampaign, analytics: {
      ...(original.analytics as Record<string, unknown>),
      eventId: "later-host-lead",
    }});
    assert.equal(later.hostLead?.isNew, false);
    assert.equal([...records.entries()].filter(([key, row]) =>
      key.startsWith("salesInboundIntents/") && row.acquisitionAttribution)
      .length, 1, "repeat acquisition cannot create a replacement snapshot");
    records.get(`hostAcquisitionConsents/${consentId}`)!.status = "revoked";
    const denied = await submit({...body,
      email: "synthetic-revoked-host@example.test"});
    assert.equal(denied.hostLead?.isNew, true,
      "revocation never blocks operational intake");
    assert.equal(records.has(
      `hostAcquisitionDeliveries/${denied.hostLead!.eventId}`), false);
    const deniedEventId = denied.hostLead!.eventId;
    const deniedIntent = [...records.values()].find((row) =>
      (row.hostLead as {eventId?: string})?.eventId === deniedEventId);
    assert.equal(deniedIntent?.acquisitionAttribution, undefined);
  });


test("normalizeProgrammeApplication keeps only answered fields", () => {
  assert.equal(normalizeProgrammeApplication({tools: []}), null);
  assert.deepEqual(normalizeProgrammeApplication({
    planningCompany: "  Meher   Shah Weddings ", weddingDate: "12 Dec",
    functions: 5, hotels: 99, teamSize: 24.5, wants: ["Door", "Door"],
  }), {planningCompany: "Meher Shah Weddings", functions: 5,
    wants: ["Door"]});
  assert.equal(waitlistSubmissionId("", "+919820144718"),
    `phone_${Buffer.from("+919820144718").toString("base64url")}`);
  assert.equal(waitlistSubmissionId("a@example.test", "+919820144718"),
    Buffer.from("a@example.test").toString("base64url"));
});

test("a phone-only weddings application becomes a programme intent",
  async (context) => {
    if (!admin.apps.length) {
      admin.initializeApp({projectId: "demo-sales-intent"});
    }
    const validateIntent = contractValidator(
      "SalesInboundIntentsDocument");
    const database = admin.firestore();
    const records = new Map<string, Record<string, unknown>>();
    type TransactionRunner = (tx: unknown) => Promise<unknown>;
    context.mock.method(database, "runTransaction",
      async (run: TransactionRunner) => {
        const writes: Array<[string, Record<string, unknown>]> = [];
        await run({
          get: async (ref: {path?: string}) => ref.path ?
            {exists: records.has(ref.path),
              data: () => records.get(ref.path!)} : {size: 0},
          create: (ref: {path: string}, value: Record<string, unknown>) => {
            writes.push([ref.path, value]);
          },
          update: (ref: {path: string}, value: Record<string, unknown>) => {
            writes.push([ref.path, {...records.get(ref.path), ...value}]);
          },
          set: (ref: {path: string}, value: Record<string, unknown>) => {
            writes.push([ref.path, value]);
          },
        });
        for (const [path, value] of writes) records.set(path, value);
      });
    const submit = async (payload: unknown, ip: string) => {
      let status = 0;
      let result: unknown;
      const response = {
        set: () => undefined,
        status: (value: number) => {
          status = value; return response;
        },
        json: (value: unknown) => {
          result = value; return response;
        },
        send: () => undefined,
      };
      await joinWaitlist({method: "POST", body: payload, ip,
        get: () => undefined} as never, response as never);
      return {status, result};
    };
    const body = readFixture(
      "fixtures/valid/join_waitlist_request_weddings.json") as
      Record<string, unknown>;
    const accepted = await submit({...body, phone: "+91 98201 44718"},
      "synthetic-weddings-1");
    assert.equal(accepted.status, 200);
    const waitlistKey =
      `launchWaitlist/${waitlistSubmissionId("", "+919820144718")}`;
    assert.equal(records.get(waitlistKey)?.phone, "+919820144718");
    assert.equal(records.get(waitlistKey)?.email, null);
    assert.equal(records.get(waitlistKey)?.programme, "weddings");
    const [intent] = [...records.entries()]
      .filter(([key]) => key.startsWith("salesInboundIntents/"))
      .map(([, row]) => row);
    assert.equal(intent.programme, "weddings");
    assert.equal(intent.phone, "+919820144718");
    assert.equal(intent.email, null);
    assert.deepEqual(intent.programmeApplication,
      body.programmeApplication);
    const stored = {...intent,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()};
    assert.equal(validateIntent(stored), true,
      JSON.stringify(validateIntent.errors));
    // Without email or phone, there is no way to reply.
    const {phone: _phone, ...noContact} = body;
    assert.equal(_phone, "+919820144718");
    assert.equal((await submit(noContact, "synthetic-weddings-2")).status, 400);
    assert.equal((await submit({...body, phone: "12345"},
      "synthetic-weddings-3")).status, 400);
  });
