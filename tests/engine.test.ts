import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  issue,
  tick,
  botTurn,
  owned,
  economy,
  strength,
  supplied,
  serialize,
  restore,
  cost,
} from "../src/engine.ts";

test("map adjacency is symmetric and every faction starts equally", () => {
  const g = createGame();
  assert.equal(g.regions.length, 24);
  for (const r of g.regions)
    for (const neighbor of r.neighbors)
      assert.ok(g.regions[neighbor].neighbors.includes(r.id));
  for (const n of g.nations) {
    assert.equal(owned(g, n.id).length, 1);
    assert.equal(n.money, 650);
    assert.equal(strength(g.regions[n.capital].army), 140);
  }
});
test("orders validate ownership, adjacency, percentages and finite values", () => {
  const g = createGame();
  const before = serialize(g);
  for (const c of [
    { type: "deploy", from: 0, to: 1, percent: 70 },
    { type: "deploy", from: 14, to: 0, percent: 70 },
    { type: "deploy", from: 14, to: 13, percent: NaN },
    { type: "deploy", from: 14, to: 13, percent: 101 },
  ] as const)
    assert.equal(issue(g, 0, c).ok, false);
  assert.equal(serialize(g), before);
});
test("deploy conserves units and friendly arrival restores them", () => {
  const g = createGame();
  g.regions[13].owner = 0;
  g.regions[13].army = { infantry: 0, tanks: 0 };
  assert.ok(issue(g, 0, { type: "deploy", from: 14, to: 13, percent: 70 }).ok);
  assert.equal(
    strength(g.regions[14].army) + strength(g.operations[0].army),
    140,
  );
  for (let i = 0; i < 12; i++) tick(g, false);
  assert.equal(g.operations.length, 0);
  assert.equal(
    strength(g.regions[14].army) + strength(g.regions[13].army),
    140,
  );
});
test("a superior army conquers progressively with casualties", () => {
  const g = createGame();
  issue(g, 0, { type: "deploy", from: 14, to: 13, percent: 70 });
  for (let i = 0; i < 12; i++) tick(g, false);
  assert.equal(g.regions[13].owner, -1);
  assert.equal(g.operations[0].phase, "battle");
  for (let i = 0; i < 150; i++) tick(g, false);
  assert.equal(g.regions[13].owner, 0);
  assert.ok(strength(g.regions[13].army) < 95);
});
test("production pays up front, takes time, cannot duplicate a queue", () => {
  const g = createGame();
  const r = g.regions[14];
  assert.ok(issue(g, 0, { type: "build", region: 14, kind: "infantry" }).ok);
  assert.equal(g.nations[0].money, 550);
  assert.equal(r.army.infantry, 110);
  assert.equal(
    issue(g, 0, { type: "build", region: 14, kind: "infantry" }).ok,
    false,
  );
  for (let i = 0; i < 16; i++) tick(g, false);
  assert.equal(r.army.infantry, 160);
  assert.equal(r.queue, null);
});
test("research has a price and completes after the required time", () => {
  const g = createGame();
  assert.ok(issue(g, 0, { type: "research", branch: "military" }).ok);
  assert.equal(g.nations[0].money, 150);
  for (let i = 0; i < 50; i++) tick(g, false);
  assert.equal(g.nations[0].tech.military, 1);
  assert.equal(g.nations[0].research, null);
});
test("supply follows connected territory; capital loss isolates territory", () => {
  const g = createGame();
  g.regions[13].owner = 0;
  g.regions[0].owner = 0;
  assert.ok(supplied(g, 0).has(13));
  assert.ok(!supplied(g, 0).has(0));
  g.regions[14].owner = 1;
  assert.equal(supplied(g, 0).size, 0);
});
test("withdrawal costs 20 percent and cannot duplicate an army", () => {
  const g = createGame();
  issue(g, 0, { type: "deploy", from: 14, to: 13, percent: 100 });
  const id = g.operations[0].id;
  assert.ok(issue(g, 0, { type: "retreat", operation: id }).ok);
  assert.equal(strength(g.regions[14].army), 112);
  assert.equal(g.operations.length, 0);
  assert.equal(issue(g, 0, { type: "retreat", operation: id }).ok, false);
});
test("save roundtrip continues deterministically and rejects corruption", () => {
  const g = createGame(77);
  for (let i = 0; i < 60; i++) tick(g);
  const h = restore(serialize(g));
  assert.ok(h);
  assert.deepEqual(h, g);
  for (let i = 0; i < 200; i++) {
    tick(g);
    tick(h);
  }
  assert.deepEqual(h, g);
  assert.equal(restore("{bad"), null);
  assert.equal(restore('{"version":2}'), null);
  const malformed = JSON.parse(serialize(g));
  malformed.regions[0].army.infantry = -1;
  assert.equal(restore(JSON.stringify(malformed)), null);
});
test("bot spending uses the same prices as the player", () => {
  const g = createGame(1);
  g.nations[1].money = cost(g.regions[0], "infantry");
  botTurn(g, 1);
  assert.ok(g.nations[1].money >= 0);
  assert.ok(g.nations[1].money <= 100);
  assert.equal(g.nations[0].money, 650);
});
test("victory and elimination end commands correctly", () => {
  const g = createGame();
  for (const r of g.regions) r.owner = 0;
  tick(g, false);
  assert.equal(g.winner, 0);
  assert.ok(g.defeated.includes(1));
  assert.equal(
    issue(g, 0, { type: "build", region: 14, kind: "infantry" }).ok,
    false,
  );
  const t = g.time;
  tick(g);
  assert.equal(g.time, t);
});
test("multi-seed 30-minute simulations remain finite with functioning bots", () => {
  for (const seed of [1, 42, 721, 9001, 107]) {
    const g = createGame(seed);
    for (let i = 0; i < 1800; i++) {
      tick(g);
      if (g.time % 5 === 0) botTurn(g, 0);
      for (const n of g.nations)
        assert.ok(Number.isFinite(n.money) && n.money >= 0);
      for (const r of g.regions) {
        assert.ok(Number.isFinite(strength(r.army)));
        assert.ok(r.army.infantry >= 0 && r.army.tanks >= 0);
      }
    }
    assert.ok(
      g.log.some(
        (e) => e.text.includes("obsazuje") || e.text.includes("ovládla"),
      ),
    );
    assert.ok(g.regions.filter((r) => r.owner < 0).length < 18);
    for (const n of g.nations) assert.ok(Number.isFinite(economy(g, n.id).net));
  }
});
