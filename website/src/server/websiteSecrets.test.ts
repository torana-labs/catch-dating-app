// @vitest-environment node
import {afterEach, describe, expect, it, vi} from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/app", () => ({applicationDefault: () => ({getAccessToken: async () => ({access_token: "unused"})})}));
import {forgetWebsiteSecrets, readWebsiteSecret, type SecretAccess} from "./websiteSecrets";

afterEach(forgetWebsiteSecrets);

const secretResponse = (value: string) =>
  Response.json({name: "projects/1/secrets/CATCH_TEST/versions/3", payload: {data: Buffer.from(value).toString("base64")}});

function access(responses: Response[], overrides: Partial<SecretAccess> = {}) {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => responses.shift() ?? new Response(null, {status: 500}));
  let now = 0;
  return {
    fetch,
    tick: (ms: number) => {now += ms;},
    access: {fetch: fetch as unknown as typeof globalThis.fetch, accessToken: async () => "fake-token",
      project: "catch-dating-app-64e51", now: () => now, ...overrides} satisfies SecretAccess,
  };
}

describe("readWebsiteSecret", () => {
  it("reads the latest version from the website's project with the service's token, then caches it", async () => {
    const fake = access([secretResponse(" fake-value \n")]);
    expect(await readWebsiteSecret("CATCH_TEST", fake.access)).toBe("fake-value");
    expect(await readWebsiteSecret("CATCH_TEST", fake.access)).toBe("fake-value");
    expect(fake.fetch).toHaveBeenCalledOnce();
    const [url, init] = fake.fetch.mock.calls[0];
    expect(url).toBe("https://secretmanager.googleapis.com/v1/projects/catch-dating-app-64e51/secrets/CATCH_TEST/versions/latest:access");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer fake-token");
  });

  it("treats a missing or unreadable secret as absent, and asks again a minute later", async () => {
    const fake = access([new Response(null, {status: 404}), secretResponse("created-later")]);
    expect(await readWebsiteSecret("CATCH_TEST", fake.access)).toBeNull();
    fake.tick(30_000);
    expect(await readWebsiteSecret("CATCH_TEST", fake.access)).toBeNull();
    fake.tick(31_000);
    expect(await readWebsiteSecret("CATCH_TEST", fake.access)).toBe("created-later");
  });

  it("refreshes a found secret every ten minutes and survives network and credential failures", async () => {
    const fake = access([secretResponse("first"), secretResponse("rotated")]);
    expect(await readWebsiteSecret("CATCH_TEST", fake.access)).toBe("first");
    fake.tick(10 * 60_000 + 1);
    expect(await readWebsiteSecret("CATCH_TEST", fake.access)).toBe("rotated");
    forgetWebsiteSecrets();
    expect(await readWebsiteSecret("CATCH_TEST", {...fake.access, accessToken: async () => {throw new Error("no ADC");}})).toBeNull();
    forgetWebsiteSecrets();
    expect(await readWebsiteSecret("CATCH_TEST", {...fake.access, project: undefined})).toBeNull();
    expect(await readWebsiteSecret("bad/name", fake.access)).toBeNull();
  });
});
