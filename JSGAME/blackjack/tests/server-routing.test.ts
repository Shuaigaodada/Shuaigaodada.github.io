import test from "node:test";
import assert from "node:assert/strict";

import {
  GLOBAL_SERVER, MAINLAND_SERVER, getTableAuthority, getTableServer,
} from "../services/serverConfig.ts";

test("every open table has one deterministic authority", () => {
  assert.deepEqual(
    Array.from({ length: 5 }, (_, index) => getTableAuthority(`table-${index + 1}`)),
    ["tencent", "tencent", "tencent", "cloudflare", "cloudflare"],
  );
});

test("all clients resolve the same server for a table", () => {
  assert.equal(getTableServer("table-1"), MAINLAND_SERVER);
  assert.equal(getTableServer("table-3"), MAINLAND_SERVER);
  assert.equal(getTableServer("table-4"), GLOBAL_SERVER);
  assert.equal(getTableServer("table-5"), GLOBAL_SERVER);
  assert.equal(getTableServer("unknown-table"), MAINLAND_SERVER);
});
