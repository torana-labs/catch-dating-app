import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import {OperationsError, invariant} from "../errors.mjs";
import {parseRobotsTxt, robotsAllows} from "./robots.mjs";

// A public-web page fetcher for trusted runtimes. Every connection resolves
// through one validating lookup, so a host cannot pass the address check and
// then connect somewhere private (DNS rebinding). Redirects are followed by
// hand and revalidated, robots.txt is honoured per origin, and responses are
// bounded in time and size. Expected failures are returned as outcomes, never
// thrown, so one dead link does not stop a whole intake.

export const PAGE_FETCH_OUTCOMES = Object.freeze([
  "fetched",
  "http_error",
  "robots_disallowed",
  "blocked_address",
  "invalid_url",
  "unsupported_content_type",
  "too_large",
  "timeout",
  "too_many_redirects",
  "network_error",
]);

const HTML_TYPES = new Set(["text/html", "application/xhtml+xml"]);
const ROBOTS_MAX_BYTES = 512 * 1024;
const ROBOTS_MAX_REDIRECTS = 5;
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa", ".onion"];

const PRIVATE_ADDRESSES = (() => {
  const list = new net.BlockList();
  for (const [address, prefix] of [
    ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
    ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
    ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
    ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
  ]) list.addSubnet(address, prefix, "ipv4");
  for (const [address, prefix] of [
    ["::", 128], ["::1", 128], ["64:ff9b::", 96], ["64:ff9b:1::", 48], ["100::", 64],
    ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7], ["fe80::", 10],
    ["fec0::", 10], ["ff00::", 8],
  ]) list.addSubnet(address, prefix, "ipv6");
  return list;
})();

/** True only for globally routable unicast addresses. */
export function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 0) return false;
  if (family === 6 && !/^[23]/u.test(expandIpv6Head(address))) {
    // Outside 2000::/3 there is no global unicast space, except IPv4-mapped
    // addresses, which BlockList checks against the IPv4 ranges.
    if (!/^::ffff:/iu.test(address)) return false;
  }
  return !PRIVATE_ADDRESSES.check(address, family === 4 ? "ipv4" : "ipv6");
}

function expandIpv6Head(address) {
  const head = address.split(":")[0];
  return head.length === 0 ? "0" : head.padStart(4, "0");
}

/** Throws for a URL that may not be fetched; returns the parsed URL. */
export function assertFetchableUrl(value, {allowHost = null} = {}) {
  let url;
  try {
    url = new URL(String(value));
  } catch {
    throw fetchRefusal("invalid_url", "Page URL is not absolute.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw fetchRefusal("invalid_url", "Only http and https pages may be fetched.");
  }
  if (url.username || url.password) {
    throw fetchRefusal("invalid_url", "Page URLs may not carry credentials.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw fetchRefusal("blocked_address", "Only the standard web ports may be fetched.");
  }
  const host = url.hostname.replace(/^\[|\]$/gu, "").toLowerCase().replace(/\.$/u, "");
  if (host === "localhost" || BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix)) ||
      (!host.includes(".") && net.isIP(host) === 0)) {
    throw fetchRefusal("blocked_address", "Page host is not a public name.");
  }
  if (net.isIP(host) !== 0 && !isPublicAddress(host)) {
    throw fetchRefusal("blocked_address", "Page host is a private address.");
  }
  if (typeof allowHost === "function" && allowHost(host) !== true) {
    throw fetchRefusal("blocked_address", "Page host is outside this fetch's allowlist.");
  }
  url.hash = "";
  return url;
}

/**
 * A lookup for http.request that refuses any name with a non-public address.
 * Every address is checked, so a mixed public/private answer is refused too.
 */
export function publicOnlyLookup(resolve = dns.lookup) {
  return (hostname, options, callback) => {
    const done = typeof options === "function" ? options : callback;
    const wantsAll = typeof options === "object" && options?.all === true;
    resolve(hostname, {all: true, verbatim: true}, (error, addresses) => {
      if (error) return done(error);
      const list = Array.isArray(addresses) ? addresses : [];
      if (list.length === 0 || !list.every((entry) => isPublicAddress(entry.address))) {
        const refusal = new Error(`Refusing ${hostname}: it resolves to a non-public address.`);
        refusal.code = "CATCH_BLOCKED_ADDRESS";
        return done(refusal);
      }
      if (wantsAll) return done(null, list);
      return done(null, list[0].address, list[0].family);
    });
  };
}

export class PageFetcher {
  constructor({
    userAgent,
    productToken,
    timeoutMs = 10_000,
    maxResponseBytes = 4 * 1024 * 1024,
    maxRedirects = 3,
    lookup = publicOnlyLookup(),
    transport = defaultTransport,
    clock = () => new Date(),
    beforeRequest = () => {},
  } = {}) {
    invariant(typeof userAgent === "string" && userAgent.length > 0 &&
      typeof productToken === "string" && /^[A-Za-z_-]+$/u.test(productToken) &&
      userAgent.includes(productToken),
    "INVALID_PAGE_FETCHER", "A fetcher needs a user agent that names its robots.txt product token.");
    invariant(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 60_000 &&
      Number.isSafeInteger(maxResponseBytes) && maxResponseBytes > 0 &&
      Number.isSafeInteger(maxRedirects) && maxRedirects >= 0 && maxRedirects <= 10,
    "INVALID_PAGE_FETCHER", "Fetch limits must be positive and bounded.");
    Object.assign(this, {userAgent, productToken, timeoutMs, maxResponseBytes,
      maxRedirects, lookup, transport, clock, beforeRequest});
    this.robots = new Map();
    this.requests = 0;
  }

  /**
   * Fetch one HTML page. `beforeRequest` runs before every network request,
   * including robots.txt and each redirect hop, so a caller's budget can
   * refuse (by throwing) before any byte leaves the process.
   */
  async fetchPage(value, {allowHost = null} = {}) {
    const requested = String(value);
    const redirects = [];
    let url;
    try {
      url = assertFetchableUrl(requested, {allowHost});
    } catch (error) {
      return failure(requested, null, error.outcome ?? "invalid_url", redirects);
    }
    for (let hop = 0; ; hop += 1) {
      if (!(await this.allowedByRobots(url))) {
        return failure(requested, url.href, "robots_disallowed", redirects);
      }
      const response = await this.request(url, {accept: "text/html,application/xhtml+xml;q=0.9",
        maxBytes: this.maxResponseBytes});
      if (response.outcome) return failure(requested, url.href, response.outcome, redirects);
      if (isRedirect(response.status) && response.location) {
        if (hop >= this.maxRedirects) {
          return failure(requested, url.href, "too_many_redirects", redirects);
        }
        try {
          url = assertFetchableUrl(new URL(response.location, url).href, {allowHost});
        } catch (error) {
          return failure(requested, url.href, error.outcome ?? "invalid_url", redirects);
        }
        redirects.push(url.href);
        continue;
      }
      if (response.status < 200 || response.status > 299) {
        return {...failure(requested, url.href, "http_error", redirects), status: response.status};
      }
      const contentType = mediaType(response.contentType);
      if (!HTML_TYPES.has(contentType)) {
        return {...failure(requested, url.href, "unsupported_content_type", redirects),
          status: response.status, contentType};
      }
      return {
        outcome: "fetched",
        url: requested,
        finalUrl: url.href,
        status: response.status,
        contentType,
        html: decodeBody(response.body, response.contentType),
        fetchedAt: this.clock().toISOString(),
        redirects,
      };
    }
  }

  async allowedByRobots(url) {
    const origin = url.origin;
    if (!this.robots.has(origin)) this.robots.set(origin, this.readRobots(url));
    return robotsAllows(await this.robots.get(origin), `${url.pathname}${url.search}`);
  }

  async readRobots(pageUrl) {
    let url = new URL("/robots.txt", pageUrl.origin);
    for (let hop = 0; hop <= ROBOTS_MAX_REDIRECTS; hop += 1) {
      const response = await this.request(url, {accept: "text/plain", maxBytes: ROBOTS_MAX_BYTES});
      // RFC 9309: an unreachable robots.txt means complete disallow; a
      // missing one (4xx) means no restrictions.
      if (response.outcome) return "disallow_all";
      if (isRedirect(response.status) && response.location) {
        try {
          url = assertFetchableUrl(new URL(response.location, url).href);
        } catch {
          return "disallow_all";
        }
        continue;
      }
      if (response.status >= 400 && response.status <= 499) return "allow_all";
      if (response.status < 200 || response.status > 299) return "disallow_all";
      return parseRobotsTxt(decodeBody(response.body, response.contentType), this.productToken);
    }
    return "disallow_all";
  }

  async request(url, {accept, maxBytes}) {
    await this.beforeRequest({url: url.href});
    this.requests += 1;
    try {
      return await this.transport({url, lookup: this.lookup, timeoutMs: this.timeoutMs, maxBytes,
        headers: {
          "user-agent": this.userAgent,
          "accept": accept,
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "en-IN,en;q=0.8",
        }});
    } catch (error) {
      return {outcome: transportOutcome(error)};
    }
  }
}

/**
 * node:http(s) transport. The lookup option pins every connection, and one
 * deadline covers connect, headers and body so a slow drip cannot outlast it.
 */
export function defaultTransport({url, lookup, timeoutMs, maxBytes, headers}) {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (error) {
        request.destroy();
        reject(error);
      } else {
        resolve(value);
      }
    };
    const request = client.request(url, {method: "GET", headers, lookup, agent: false}, (response) => {
      const status = response.statusCode ?? 0;
      const contentType = response.headers["content-type"] ?? null;
      if (isRedirect(status) || status < 200 || status > 299) {
        response.resume();
        settle(null, {status, location: response.headers.location ?? null, contentType, body: Buffer.alloc(0)});
        return;
      }
      const declared = Number(response.headers["content-length"]);
      if (Number.isFinite(declared) && declared > maxBytes) {
        settle(tagged("CATCH_TOO_LARGE"));
        return;
      }
      const decoded = decompressor(response.headers["content-encoding"], response);
      const chunks = [];
      let total = 0;
      decoded.on("data", (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          settle(tagged("CATCH_TOO_LARGE"));
          decoded.destroy();
          return;
        }
        chunks.push(chunk);
      });
      decoded.on("error", (error) => settle(error));
      response.on("aborted", () => settle(tagged("CATCH_NETWORK")));
      decoded.on("end", () => settle(null, {status, location: null, contentType, body: Buffer.concat(chunks)}));
    });
    const deadline = setTimeout(() => settle(tagged("CATCH_TIMEOUT")), timeoutMs);
    request.on("error", (error) => settle(error));
    request.end();
  });
}

function decompressor(encoding, stream) {
  const value = String(encoding ?? "").trim().toLowerCase();
  if (value === "gzip" || value === "x-gzip") return stream.pipe(zlib.createGunzip());
  if (value === "deflate") return stream.pipe(zlib.createInflate());
  if (value === "br") return stream.pipe(zlib.createBrotliDecompress());
  return stream;
}

function transportOutcome(error) {
  const code = error?.code ?? error?.cause?.code;
  if (code === "CATCH_BLOCKED_ADDRESS") return "blocked_address";
  if (code === "CATCH_TOO_LARGE" || code === "ERR_BUFFER_TOO_LARGE") return "too_large";
  if (code === "CATCH_TIMEOUT" || code === "ETIMEDOUT") return "timeout";
  return "network_error";
}

function tagged(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function isRedirect(status) {
  return [301, 302, 303, 307, 308].includes(status);
}

function mediaType(value) {
  return String(value ?? "").split(";")[0].trim().toLowerCase();
}

function decodeBody(body, contentType) {
  const charset = /charset=([^;]+)/iu.exec(String(contentType ?? ""))?.[1]?.trim().replace(/^"|"$/gu, "");
  try {
    return new TextDecoder(charset || "utf-8").decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

function failure(url, finalUrl, outcome, redirects) {
  return {outcome, url, finalUrl, status: null, contentType: null, html: null, fetchedAt: null, redirects};
}

function fetchRefusal(outcome, message) {
  const error = new OperationsError("PAGE_FETCH_REFUSED", message, {details: {outcome}});
  error.outcome = outcome;
  return error;
}
