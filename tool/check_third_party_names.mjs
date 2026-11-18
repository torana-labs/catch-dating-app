#!/usr/bin/env node
// Keeps real third-party organisers out of the repository. Real organisers live
// only in the production database: never in code, fixtures, stories, docs,
// design packs, tests or generated demo data. This check needs no secret, so it
// cannot know real names. It enforces the structure that let them in:
//
// - social-url: an Instagram, Facebook, Luma or Meetup URL names an account or
//   page that is not on the fictional allowlist;
// - social-handle: an @handle in a fixture, story, test, doc, design pack,
//   sample or demo file is not on the fictional allowlist;
// - scraped-record: committed generated data holds a listing built from public
//   sources (dataOrigin "organizerIntake" or listingVariant "unclaimedScraped").
//
// Findings print the file, line and rule only, never the matched text, because
// CI logs of this public repository are public. Run with --show locally to see
// the matched token. Fixtures use fictional names (third_party_names_allowlist.json)
// or reserved domains (.example, .test, example.com).
//
//   node tool/check_third_party_names.mjs          check
//   node tool/check_third_party_names.mjs --show   also print matched tokens
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "..");
const allowlistPath = path.join(toolDir, "third_party_names_allowlist.json");

const binary = /\.(?:png|jpe?g|gif|webp|avif|ico|icns|svgz|pdf|ttf|otf|woff2?|mp4|mov|lottie|zip|gz|jar|keystore|p12|mobileprovision|riv|wasm)$/iu;
// The allowlist and this check's own tests describe the patterns they reject.
const excluded = [
  /^tool\/third_party_names_allowlist\.json$/u,
  /^tool\/check_third_party_names(?:\.test)?\.mjs$/u,
  /^tool\/ci\/pr_text_guard(?:\.test)?\.mjs$/u,
];

// Files that hold sample, fixture, story, test, demo, design or documentation
// data. @handles are checked here; production code uses @ for decorators,
// annotations and CSS at-rules.
const dataFiles = [
  /(?:^|\/)(?:test|tests|__tests__|test_fixtures|integration_test|fixtures?|testdata|goldens)\//u,
  /\.(?:test|spec|stories)\.[cm]?[jt]sx?$/u,
  /_test\.dart$/u,
  /^widgetbook\//u,
  /^design\//u,
  /^docs\//u,
  /\.md$/u,
  /(?:^|\/)generated\/[^/]+\.json$/u,
  /^tool\/demo\//u,
  /[Ss]ample|[Mm]ock|[Dd]emo|[Ff]ixture/u,
  /^website\/src\/content\//u,
  /^contracts\/(?:fixtures|parity)\//u,
];

// Committed generated listing projections must be empty of public-source
// listings: the deploy materialises them from Firestore, never from Git.
const generatedData = /(?:^|\/)generated\/[^/]+\.json$/u;
const scrapedMarkers = [
  /"dataOrigin"\s*:\s*"organizerIntake"/u,
  /"listingVariant"\s*:\s*"unclaimedScraped"/u,
];

// A line that uses a platform URL or handle for another reason says so inline.
const waiver = /third-party-name-ok: \S/u;

const socialUrl = /\b((?:[a-z0-9-]+\.)*(?:instagram\.com|instagr\.am|facebook\.com|fb\.com|fb\.me|lu\.ma|luma\.com|meetup\.com))((?:\/[A-Za-z0-9@._%~+-]*)*)/giu;
const handle = /(?<![\w@.\\/:+~-])@([A-Za-z0-9_](?:[A-Za-z0-9._]{0,28}[A-Za-z0-9_])?)(?![\w@/-]|\.[A-Za-z0-9])/gu;

// Hosts and first path segments that are platform routes, not accounts.
const platformHosts = /^(?:graph|developers|business|about|help|l|lm|static|scontent[\w-]*|images|cdn|api|docs|status|blog|engineering|transparency)\./u;
const routes = {
  instagram: new Set(["p", "reel", "reels", "tv", "stories", "explore", "accounts", "about", "developer", "legal",
    "direct", "oauth", "api", "web", "challenge", "emails", "privacy", "terms"]),
  facebook: new Set(["docs", "documentation", "dialog", "sharer", "sharer.php", "share.php", "plugins", "tr", "login",
    "login.php", "business", "help", "policies", "privacy", "legal", "settings", "watch", "profile.php", "pages",
    "groups", "events", "photo", "photo.php", "permalink.php", "story.php", "marketplace", "gaming", "hashtag",
    "ads", "oauth", "connect", "security", "terms"]),
  luma: new Set(["discover", "home", "signin", "login", "pricing", "explore", "create", "settings", "robots.txt",
    "api", "embed", "help", "privacy", "terms", "sitemap.xml", "check-in", "checkout", "join", "manage", "map", "ios",
    "android", "download", "changelog", "features", "about", "contact", "event", "events", "e"]),
  meetup: new Set(["find", "topics", "apps", "lp", "start", "help", "about", "api", "login", "register", "cities",
    "pro", "home", "events", "account", "messages", "notifications", "members", "terms", "privacy", "blog",
    "how-to", "meetup-pro", "online-events"]),
};
// Account routes whose next segment names the account or calendar.
const accountPrefixes = {
  instagram: new Set([]),
  facebook: new Set(["pg", "people"]),
  luma: new Set(["calendar", "user", "u"]),
  meetup: new Set([]),
};

function platformOf(host) {
  if (/instagram\.com$|instagr\.am$/u.test(host)) return "instagram";
  if (/facebook\.com$|fb\.com$|fb\.me$/u.test(host)) return "facebook";
  if (/lu\.ma$|luma\.com$/u.test(host)) return "luma";
  return "meetup";
}

// Returns the account, calendar or page slug a social URL names, or null when
// the URL is a platform route, an API, a template or an empty path.
export function socialAccount(host, pathname) {
  const lowerHost = host.toLowerCase();
  if (platformHosts.test(lowerHost)) return null;
  const platform = platformOf(lowerHost);
  const segments = pathname.split("/").map((segment) => segment.replace(/^@/u, "")).filter(Boolean);
  if (segments.length === 0) return null;
  let [first, second] = segments;
  first = first.toLowerCase();
  if (/^v\d+(?:\.\d+)?$/u.test(first)) return null; // Graph API versions
  if (accountPrefixes[platform].has(first)) return second ? second.replace(/[.,;:]+$/u, "") : null;
  if (routes[platform].has(first)) return null;
  return segments[0].replace(/[.,;:]+$/u, "") || null;
}

export function loadAllowlist(file = allowlistPath) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  // Catch's own accounts come from the brand record, never from this file.
  const brand = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/brand/brand.json"), "utf8"));
  return {
    names: new Set([...raw.fictionalNames, brand.social.instagramHandle].map((name) => normalize(name))),
    stems: new Set(raw.fictionalStems.map((name) => name.toLowerCase())),
    keywords: new Set(raw.handleKeywords.map((name) => name.toLowerCase())),
    fictionalMarkers: raw.fictionalMarkers.map((marker) => marker.toLowerCase()),
  };
}

function normalize(token) {
  return token.toLowerCase().replace(/^@/u, "").replace(/[.,;:]+$/u, "");
}

// Fictional when listed, derived from a fictional stem ("moonmoth-mixer" from
// "moonmoth"), on a reserved name pattern, or a one- or two-letter placeholder
// such as lu.ma/x.
export function isFictional(token, allowlist) {
  const value = normalize(token);
  if (value.length <= 2) return true;
  if (allowlist.names.has(value)) return true;
  const stem = value.split(/[-._]/u)[0];
  if (stem !== value && allowlist.stems.has(stem)) return true;
  return allowlist.fictionalMarkers.some((marker) => value.includes(marker));
}

// Version numbers (@2.0), localisation metadata and JS identifiers (@usedKey)
// and, in Dart, annotations (@TestOn) are code, not handles. Instagram handles
// are lower case in practice; a mixed-case one is still checked outside Dart.
export function isCodeAnnotation(file, token) {
  if (!/[A-Za-z]/u.test(token)) return true;
  if (/^[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*$/u.test(token)) return true;
  return file.endsWith(".dart") && /^[A-Z][A-Za-z0-9]*$/u.test(token);
}

export function isDataFile(file) {
  return dataFiles.some((pattern) => pattern.test(file));
}

export function scanText(file, text, allowlist) {
  const findings = [];
  const data = isDataFile(file);
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (waiver.test(line)) return;
    const at = (rule, token) => findings.push({file, line: index + 1, rule, token});
    for (const match of line.matchAll(socialUrl)) {
      const account = socialAccount(match[1], match[2] ?? "");
      if (account && !isFictional(account, allowlist)) at("social-url", match[0]);
    }
    if (data) {
      for (const match of line.matchAll(handle)) {
        const value = match[1].toLowerCase();
        if (allowlist.keywords.has(value) || isCodeAnnotation(file, match[1])) continue;
        // A handle inside a social URL was judged above.
        const before = line.slice(0, match.index);
        if (/(?:instagram\.com|facebook\.com|lu\.ma|luma\.com|meetup\.com|medium\.com|threads\.net|tiktok\.com|youtube\.com|x\.com|twitter\.com)\/$/iu.test(before)) continue;
        if (!isFictional(value, allowlist)) at("social-handle", match[0]);
      }
    }
    if (generatedData.test(file) && scrapedMarkers.some((marker) => marker.test(line))) at("scraped-record", "");
  });
  return findings;
}

export function trackedFiles(root = repoRoot) {
  return execFileSync("git", ["ls-files", "-z"], {cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024})
    .split("\0").filter((file) => file && !binary.test(file) && !excluded.some((pattern) => pattern.test(file)));
}

export function scanRepository({root = repoRoot, files = trackedFiles(root), allowlist = loadAllowlist()} = {}) {
  const findings = [];
  for (const file of files) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile()) continue;
    const text = fs.readFileSync(absolute, "utf8");
    if (text.includes("\0")) continue;
    findings.push(...scanText(file, text, allowlist));
  }
  return findings;
}

const advice = {
  "social-url": "names a social account or page that is not on the fictional allowlist",
  "social-handle": "names an @handle that is not on the fictional allowlist",
  "scraped-record": "commits a listing built from public sources into generated data",
};

function main() {
  const show = process.argv.includes("--show");
  const findings = scanRepository();
  if (findings.length === 0) {
    console.log("No real third-party organiser handles, social URLs or scraped records found.");
    return;
  }
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.rule} ${advice[finding.rule]}` +
      (show && finding.token ? ` (${finding.token})` : ""));
  }
  console.error([
    "",
    `${findings.length} finding(s). Real organisers live only in the production database.`,
    "Use a fictional name from tool/third_party_names_allowlist.json, a reserved domain",
    "(.example, .test, example.com), or add a clearly fictional name to the allowlist.",
    "Generated listing projections stay empty in Git; the deploy materialises them.",
    "Run with --show locally to see the matched text; it is withheld from public CI logs.",
  ].join("\n"));
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
