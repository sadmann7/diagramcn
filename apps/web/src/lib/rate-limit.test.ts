import { rateLimits } from "@diagramcn/db/schema";
import { like } from "drizzle-orm";
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { setTimeout } from "node:timers/promises";

import { db } from "@/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const name = `test-${Date.now()}`;

function request(ip: string) {
  return new Request("https://diagramcn.com/api/test", {
    headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
  });
}

describe("getClientIp", () => {
  test("uses the first forwarded address", () => {
    assert.equal(getClientIp(request("203.0.113.7")), "203.0.113.7");
    assert.equal(getClientIp(new Request("https://diagramcn.com")), "unknown");
  });
});

describe("checkRateLimit", { skip: !db && "DATABASE_URL is not set" }, () => {
  after(async () => {
    await db?.delete(rateLimits).where(like(rateLimits.key, `${name}%`));
    await db?.$client.end();
  });

  test("allows the limit, then rejects until the window resets", async () => {
    const limit = { limit: 2, windowMs: 1000 };
    const req = request("203.0.113.1");

    assert.deepEqual(await checkRateLimit(req, name, limit), { ok: true });
    assert.deepEqual(await checkRateLimit(req, name, limit), { ok: true });

    const rejected = await checkRateLimit(req, name, limit);
    assert.equal(rejected.ok, false);
    assert.ok(!rejected.ok && rejected.retryAfterSeconds === 1);

    // Other clients have their own counters.
    assert.deepEqual(
      await checkRateLimit(request("203.0.113.2"), name, limit),
      { ok: true },
    );

    await setTimeout(1100);
    assert.deepEqual(await checkRateLimit(req, name, limit), { ok: true });
  });
});
