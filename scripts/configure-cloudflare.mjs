#!/usr/bin/env node

const API_BASE = "https://api.cloudflare.com/client/v4";

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

const {
  CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ZONE_ID,
  CLOUDFLARE_PRIMARY_DOMAIN,
  CLOUDFLARE_BYPASS_PATTERNS,
  CLOUDFLARE_DRY_RUN,
} = process.env;

if (!CLOUDFLARE_API_TOKEN) {
  fail("CLOUDFLARE_API_TOKEN is required.");
}
if (!CLOUDFLARE_ZONE_ID) {
  fail("CLOUDFLARE_ZONE_ID is required.");
}
if (!CLOUDFLARE_PRIMARY_DOMAIN) {
  fail("CLOUDFLARE_PRIMARY_DOMAIN is required (example: portal.example.com).");
}

const dryRun = String(CLOUDFLARE_DRY_RUN || "false").toLowerCase() === "true";

async function cloudflareRequest(path, { method = "GET", body } = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    const errors = payload?.errors?.map((error) => error.message).join("; ") || "unknown error";
    throw new Error(`${method} ${path} failed: ${errors}`);
  }
  return payload.result;
}

async function ensureZoneSetting(settingId, value) {
  console.log(`Applying zone setting '${settingId}' => '${value}'`);
  if (dryRun) return;
  await cloudflareRequest(`/zones/${CLOUDFLARE_ZONE_ID}/settings/${settingId}`, {
    method: "PATCH",
    body: { value },
  });
}

function getBypassPatterns() {
  if (CLOUDFLARE_BYPASS_PATTERNS) {
    return CLOUDFLARE_BYPASS_PATTERNS.split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [
    `*${CLOUDFLARE_PRIMARY_DOMAIN}/api/*`,
    `*${CLOUDFLARE_PRIMARY_DOMAIN}/auth/*`,
    `*${CLOUDFLARE_PRIMARY_DOMAIN}/ws/*`,
  ];
}

async function ensureBypassRules(patterns) {
  const existingRules = await cloudflareRequest(`/zones/${CLOUDFLARE_ZONE_ID}/pagerules`);
  const existingPatterns = new Set(
    existingRules
      .map((rule) => rule.targets?.[0]?.constraint?.value)
      .filter(Boolean),
  );
  const maxPriority = existingRules.reduce((highest, rule) => Math.max(highest, Number(rule.priority || 0)), 0);

  let createdCount = 0;
  for (const [index, pattern] of patterns.entries()) {
    if (existingPatterns.has(pattern)) {
      console.log(`Cache bypass rule already exists: ${pattern}`);
      continue;
    }

    console.log(`Creating cache bypass rule for: ${pattern}`);
    if (dryRun) continue;

    await cloudflareRequest(`/zones/${CLOUDFLARE_ZONE_ID}/pagerules`, {
      method: "POST",
      body: {
        targets: [
          {
            target: "url",
            constraint: {
              operator: "matches",
              value: pattern,
            },
          },
        ],
        actions: [
          {
            id: "cache_level",
            value: "bypass",
          },
        ],
        priority: maxPriority + index + 1,
        status: "active",
      },
    });
    createdCount += 1;
  }

  console.log(`Cache bypass rules created: ${createdCount}`);
}

async function main() {
  console.log("Configuring Cloudflare proxy security controls...");
  await ensureZoneSetting("ssl", "strict");
  await ensureZoneSetting("always_use_https", "on");
  await ensureBypassRules(getBypassPatterns());
  console.log("Cloudflare configuration complete.");
}

main().catch((error) => {
  fail(error.message);
});
