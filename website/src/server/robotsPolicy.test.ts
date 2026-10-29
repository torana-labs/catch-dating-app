import {expect, it} from "vitest";
import {ALLOWED_CRAWLERS, PRIVATE_PATHS, robotsPolicy} from "./robotsPolicy";

it("keeps every crawler out of a non-production site", () => {
  expect(robotsPolicy(false)).toEqual({rules: {userAgent: "*", disallow: "/"}});
});

it("lets search engines and link previews in, and turns every other crawler away", () => {
  const policy = robotsPolicy(true);
  const rules = Array.isArray(policy.rules) ? policy.rules : [policy.rules];
  expect(rules).toEqual([
    {userAgent: [...ALLOWED_CRAWLERS], allow: "/", disallow: [...PRIVATE_PATHS]},
    {userAgent: "*", disallow: "/"},
  ]);
  expect(ALLOWED_CRAWLERS).toEqual(expect.arrayContaining(["Googlebot", "Bingbot", "facebookexternalhit", "WhatsApp",
    "OAI-SearchBot", "PerplexityBot", "Claude-SearchBot"]));
  // AI-training and archive crawlers are never named, so the catch-all applies.
  for (const crawler of ["GPTBot", "CCBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "Bytespider",
    "meta-externalagent"]) {
    expect(ALLOWED_CRAWLERS).not.toContain(crawler);
  }
  expect(policy.sitemap).toBe("https://catchdates.com/sitemap.xml");
});
