#!/usr/bin/env node

const defaultBaseUrl = "https://catchdates.com";

export const productionProbeContracts = [
  {
    path: "/",
    title: "Catch | Find something worth showing up for",
    canonicalPath: "/",
    markers: ["Discover runs, dinners, games"],
  },
  {
    path: "/explore/",
    title: "Find events, clubs and communities | Catch",
    canonicalPath: "/explore/",
    markers: ["Find runs, dinners, games and nights out in your city"],
  },
  {
    path: "/host/apply/",
    title: "Apply for a pilot | Catch Host",
    canonicalPath: "/host/apply/",
    markers: ["Catch reviews each pilot application"],
  },
  {
    // The directory is Explore's organisers view (CAT-261).
    path: "/organizers/",
    status: 301,
    location: "/explore/?show=organisers",
  },
  {
    path: "/f/__catch_public_form_route_probe__/",
    title: "Organizer form | Catch",
    canonicalPath: "/f/",
    markers: [],
  },
  {
    path: "/privacy/",
    title: "Privacy policy | Catch",
    canonicalPath: "/privacy/",
    markers: ["Privacy policy"],
  },
  {
    path: "/terms/",
    title: "Terms of use | Catch",
    canonicalPath: "/terms/",
    markers: ["Terms of use"],
  },
  {
    path: "/help/",
    title: "Help and safety | Catch",
    canonicalPath: "/help/",
    markers: ["Help and safety"],
  },
];

export async function probeProduction({
  baseUrl = defaultBaseUrl,
  fetchImpl = fetch,
  contracts = productionProbeContracts,
  timeoutMs = 10_000,
} = {}) {
  const normalizedBaseUrl = String(baseUrl).replace(/\/+$/u, "");
  const results = [];

  for (const contract of contracts) {
    results.push(await probePage({
      baseUrl: normalizedBaseUrl,
      contract,
      fetchImpl,
      timeoutMs,
    }));
  }

  return {
    ok: results.every((result) => result.ok),
    baseUrl: normalizedBaseUrl,
    checkedAt: new Date().toISOString(),
    results,
  };
}

export async function probePage({baseUrl, contract, fetchImpl, timeoutMs}) {
  const requestedUrl = `${baseUrl}${contract.path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(requestedUrl, {
      headers: {"user-agent": "catch-production-probe/1"},
      redirect: "manual",
      signal: controller.signal,
    });
    const html = await response.text();
    const expectedStatus = contract.status ?? 200;
    const findings = [];

    if (response.status !== expectedStatus) {
      findings.push(`expected HTTP ${expectedStatus}, received ${response.status}`);
    }
    if (contract.location) {
      const expectedLocation = `${baseUrl}${contract.location}`;
      const location = response.headers.get("location");
      if (!location || new URL(location, baseUrl).href !== expectedLocation) {
        findings.push(`expected redirect to ${expectedLocation}, received ${location ?? "none"}`);
      }
      return {path: contract.path, status: response.status, durationMs: null, ok: findings.length === 0, findings};
    }
    const expectedCanonical = `${baseUrl}${contract.canonicalPath}`;
    if (!html.includes(`<title>${contract.title}</title>`)) {
      findings.push(`missing title: ${contract.title}`);
    }
    if (!html.includes(`rel="canonical" href="${expectedCanonical}"`)) {
      findings.push(`missing canonical: ${expectedCanonical}`);
    }
    for (const marker of contract.markers) {
      if (!html.includes(marker)) findings.push(`missing marker: ${marker}`);
    }

    return {
      path: contract.path,
      status: response.status,
      durationMs: null,
      ok: findings.length === 0,
      findings,
    };
  } catch (error) {
    return {
      path: contract.path,
      status: null,
      durationMs: null,
      ok: false,
      findings: [error instanceof Error ? error.message : String(error)],
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseArgs(argv) {
  const parsed = {baseUrl: defaultBaseUrl, json: false};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--base-url") parsed.baseUrl = argv[++index];
    else if (argument === "--json") parsed.json = true;
    else if (argument === "--help") parsed.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return parsed;
}

function isMain() {
  return process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
}

if (isMain()) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write("Usage: node website/scripts/probeProduction.mjs [--base-url URL] [--json]\n");
    process.exit(0);
  }

  const result = await probeProduction({baseUrl: args.baseUrl});
  process.stdout.write(args.json ? `${JSON.stringify(result, null, 2)}\n` : formatResult(result));
  if (!result.ok) process.exitCode = 1;
}

function formatResult(result) {
  return `${result.results.map((entry) => {
    const status = entry.ok ? "PASS" : "FAIL";
    const findings = entry.findings.length > 0 ? ` - ${entry.findings.join("; ")}` : "";
    return `${status} ${entry.path} (${entry.status ?? "no response"})${findings}`;
  }).join("\n")}\n`;
}
