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
  available,
  deployed,
  capacity,
  personnel,
  production,
  runningCost,
  serialize,
  restore,
  tankBlocker,
  defenseStrength,
  BLOCKED_REGIONS,
  PORT_REGIONS,
  SEA_REGIONS,
  playableRegions,
} from "../src/engine.ts";
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-6, a + " != " + b);
test("one national army, no provincial unit stores, equal starts", () => {
  const g = createGame();
  assert.equal(g.regions.length, 48);
  assert.equal(playableRegions(g).length, 34);
  for (const r of g.regions) {
    assert.ok(!("army" in r));
    for (const id of r.neighbors)
      assert.ok(g.regions[id].neighbors.includes(r.id));
  }
  for (const n of g.nations) {
    assert.equal(n.army.infantry, 160);
    assert.equal(capacity(g, n.id), 640);
    assert.equal(owned(g, n.id)[0].facility, "city");
  }
});
test("mountains and lakes are separate impassable provinces", () => {
  const g = createGame();
  for (const id of BLOCKED_REGIONS) {
    assert.equal(g.regions[id].owner, -1);
    assert.equal(g.regions[id].neighbors.length, 0);
    assert.notEqual(g.regions[id].geography, "land");
    assert.equal(g.regions.some((r) => r.neighbors.includes(id)), false);
  }
});
test("province geometry leaves enough room for labels and units", () => {
  const g = createGame();
  assert.ok(Math.abs(g.regions[17].x - g.regions[18].x) > 120);
  assert.ok(Math.abs(g.regions[17].y - g.regions[25].y) > 120);
});
test("ports exist only on the sea coast, never on lakes", () => {
  const g = createGame();
  for (const r of g.regions.filter((r) => r.facility === "port")) {
    assert.ok(PORT_REGIONS.has(r.id));
    const row = Math.floor(r.id / 8), col = r.id % 8;
    const around = [r.id - 8, r.id + 8, r.id - 1, r.id + 1];
    assert.ok(row === 0 || row === 5 || col === 0 || col === 7 || around.some((id) => SEA_REGIONS.has(id)));
  }
});
test("slider recruits gradually for money and demobilizes only idle units", () => {
  const g = createGame();
  issue(g, 0, { type: "armyTarget", percent: 100 });
  const m = g.nations[0].money,
    e = economy(g, 0);
  tick(g, false);
  assert.equal(g.nations[0].army.infantry, 178);
  close(g.nations[0].money, m + e.net - 54);
  issue(g, 0, { type: "deploy", from: 17, to: 16, percent: 90 });
  const busy = deployed(g, 0).infantry;
  issue(g, 0, { type: "armyTarget", percent: 0 });
  for (let i = 0; i < 8; i++) tick(g, false);
  close(g.nations[0].army.infantry, busy);
  close(available(g, 0).infantry, 0);
});
test("mobilization validates inputs; no money means no free recruitment", () => {
  const g = createGame();
  assert.equal(issue(g, 0, { type: "armyTarget", percent: NaN }).ok, false);
  assert.equal(issue(g, 0, { type: "armyTarget", percent: 101 }).ok, false);
  g.nations[0].money = 0;
  g.nations[0].army.infantry = 0;
  issue(g, 0, { type: "armyTarget", percent: 100 });
  tick(g, false);
  assert.ok(g.nations[0].army.infantry <= 14 / 3);
  assert.ok(g.nations[0].money >= -1e-8);
});
test("city upgrade increases population and manpower only on completion", () => {
  const g = createGame(),
    before = capacity(g, 0);
  g.nations[0].resources.grain = 1000;
  assert.ok(issue(g, 0, { type: "upgrade", region: 17 }).ok);
  assert.equal(issue(g, 0, { type: "upgrade", region: 17 }).ok, false);
  assert.equal(capacity(g, 0), before);
  for (let i = 0; i < 35; i++) tick(g, false);
  assert.equal(capacity(g, 0), before + 320);
  assert.equal(g.regions[17].level, 3);
});
test("facilities and fortifications can reach level 20", () => {
  const g = createGame(), r = g.regions[17], n = g.nations[0];
  r.level = 19;
  n.money = 10000;
  assert.ok(issue(g, 0, { type: "upgrade", region: 17 }).ok);
  for (let i = 0; i < 35; i++) tick(g, false);
  assert.equal(r.level, 20);
  assert.equal(issue(g, 0, { type: "upgrade", region: 17 }).ok, false);
  r.fort = 19;
  assert.ok(issue(g, 0, { type: "fortify", region: 17 }).ok);
  for (let i = 0; i < 25; i++) tick(g, false);
  assert.equal(r.fort, 20);
  assert.equal(issue(g, 0, { type: "fortify", region: 17 }).ok, false);
});
test("fortifications raise defense and full-army attacks are allowed", () => {
  const g = createGame(), r = g.regions[17];
  const before = defenseStrength(g, r);
  r.fort = 5;
  assert.ok(defenseStrength(g, r) > before * 1.39);
  assert.ok(issue(g, 0, { type: "deploy", from: 17, to: 16, percent: 100 }).ok);
  assert.equal(available(g, 0).infantry, 0);
});
test("mines produce separate national stocks, enemies do not receive them", () => {
  const g = createGame();
  g.regions[13].owner = 0;
  g.regions[22].owner = 0;
  tick(g, false);
  close(g.nations[0].resources.iron, 0.8);
  close(g.nations[0].resources.coal, 0.8);
  assert.equal(g.nations[1].resources.iron, 0);
  g.regions[13].level = 2;
  close(production(g, 0).iron, 1.6);
});
test("tank order needs BOTH materials and money; pays once and finishes once", () => {
  const g = createGame(),
    n = g.nations[0];
  n.resources.oil = 1000;
  n.resources.grain = 1000;
  assert.ok(tankBlocker(g, 0));
  assert.equal(issue(g, 0, { type: "tanks" }).ok, false);
  n.resources.iron = 60;
  assert.equal(issue(g, 0, { type: "tanks" }).ok, false);
  n.resources.coal = 40;
  const money = n.money;
  assert.ok(issue(g, 0, { type: "tanks" }).ok);
  assert.equal(n.money, money - 250);
  assert.equal(n.resources.iron, 0);
  assert.equal(n.resources.coal, 0);
  assert.equal(issue(g, 0, { type: "tanks" }).ok, false);
  for (let i = 0; i < 30; i++) tick(g, false);
  assert.equal(n.army.tanks, 5);
  assert.equal(n.tankQueue, null);
  for (let i = 0; i < 30; i++) tick(g, false);
  assert.equal(n.army.tanks, 5);
});
test("tank production reserves crew capacity and slider never deletes tanks", () => {
  const g = createGame(),
    n = g.nations[0];
  n.resources.oil = 1000;
  n.resources.grain = 1000;
  n.resources.iron = 60;
  n.resources.coal = 40;
  n.army.infantry = 620;
  n.armyTarget = 100;
  assert.ok(issue(g, 0, { type: "tanks" }).ok);
  for (let i = 0; i < 31; i++) tick(g, false);
  assert.ok(personnel(n.army) <= capacity(g, 0));
  assert.equal(n.army.tanks, 5);
  issue(g, 0, { type: "armyTarget", percent: 0 });
  for (let i = 0; i < 100; i++) tick(g, false);
  assert.equal(n.army.infantry, 0);
  assert.equal(n.army.tanks, 5);
  assert.ok(economy(g, 0).upkeep > 0);
});
test("oil is never imported silently; shortage destroys tanks unless auto-buy is enabled", () => {
  const g = createGame(),
    n = g.nations[0];
  n.resources.oil = 0;
  n.army.tanks = 5;
  const money = n.money;
  tick(g, false);
  assert.ok(n.army.tanks < 5);
  assert.ok(n.money <= money + economy(g, 0).income);
  n.army.tanks = 5;
  n.resources.oil = 0;
  n.autoTrade.oil.buy = true;
  tick(g, false);
  assert.equal(n.army.tanks, 5);
  assert.ok(n.resources.oil > 0);
});
test("port discounts automatic oil purchases and earns money", () => {
  const g = createGame();
  g.nations[0].resources.oil = 0;
  const before = economy(g, 0);
  g.regions[9].owner = 0;
  const after = economy(g, 0);
  assert.ok(after.oilPrice < before.oilPrice);
  assert.ok(after.income > before.income);
});
test("projected long-run costs increase with army size", () => {
  const g = createGame();
  const a = runningCost(g, 0, { infantry: 100, tanks: 0 }),
    b = runningCost(g, 0, { infantry: 300, tanks: 5 });
  assert.ok(b.steadyCost > a.steadyCost);
});
test("simultaneous attacks reserve without duplicating national units", () => {
  const g = createGame();
  const total = g.nations[0].army.infantry;
  issue(g, 0, { type: "deploy", from: 17, to: 16, percent: 60 });
  issue(g, 0, { type: "deploy", from: 17, to: 18, percent: 60 });
  assert.equal(g.nations[0].army.infantry, total);
  close(available(g, 0).infantry + deployed(g, 0).infantry, total);
  assert.ok(deployed(g, 0).infantry <= total);
  assert.equal(
    issue(g, 0, { type: "deploy", from: 17, to: 16, percent: 60 }).ok,
    false,
  );
});
test("shared national defense gets weaker when an expedition leaves", () => {
  const g = createGame(),
    before = defenseStrength(g, g.regions[17]);
  issue(g, 0, { type: "deploy", from: 17, to: 16, percent: 60 });
  assert.ok(defenseStrength(g, g.regions[17]) < before);
});
test("withdrawal subtracts casualties once and releases reservation", () => {
  const g = createGame();
  issue(g, 0, { type: "deploy", from: 17, to: 16, percent: 60 });
  const o = g.operations[0],
    loss = o.army.infantry * 0.2;
  assert.ok(issue(g, 0, { type: "retreat", operation: o.id }).ok);
  close(g.nations[0].army.infantry, 160 - loss);
  close(available(g, 0).infantry, 160 - loss);
  assert.equal(g.operations.length, 0);
});
test("capture changes mine ownership and returns survivors to national availability", () => {
  const g = createGame();
  issue(g, 0, { type: "deploy", from: 17, to: 16, percent: 90 });
  for (let i = 0; i < 100; i++) tick(g, false);
  assert.equal(g.regions[16].owner, 0);
  assert.equal(g.operations.length, 0);
  close(available(g, 0).infantry, g.nations[0].army.infantry);
  assert.ok(production(g, 0).oil > 0);
});
test("grain production feeds population and shortage reduces income", () => {
  const g = createGame(), n = g.nations[0];
  n.resources.grain = 0;
  const hungry = economy(g, 0);
  assert.ok(hungry.grainUse > 0);
  assert.equal(hungry.foodCovered, false);
  g.regions[24].owner = 0;
  n.resources.grain = 100;
  const fed = economy(g, 0);
  assert.ok(fed.production.grain > 0);
  assert.equal(fed.foodCovered, true);
  assert.ok(fed.income > hungry.income);
});
test("people die without grain and recover slowly after supplies return", () => {
  const g = createGame(), n = g.nations[0];
  n.resources.grain = 0;
  const before = economy(g, 0).population;
  tick(g, false);
  assert.ok(economy(g, 0).population < before);
  const loss = n.populationLoss;
  n.resources.grain = 100;
  tick(g, false);
  assert.ok(n.populationLoss < loss);
});
test("market buys and sells fixed commodity lots", () => {
  const g = createGame(), n = g.nations[0], money = n.money;
  assert.ok(issue(g, 0, { type: "trade", commodity: "iron", side: "buy" }).ok);
  assert.equal(n.resources.iron, 25);
  assert.ok(n.money < money);
  const afterBuy = n.money;
  assert.ok(issue(g, 0, { type: "trade", commodity: "iron", side: "sell" }).ok);
  assert.equal(n.resources.iron, 0);
  assert.ok(n.money > afterBuy && n.money < money);
  assert.equal(issue(g, 0, { type: "trade", commodity: "iron", side: "sell" }).ok, false);
});
test("auto trade only runs when enabled", () => {
  const g = createGame(), n = g.nations[0];
  n.resources.grain = 0;
  tick(g, false);
  assert.equal(n.resources.grain, 0);
  assert.ok(issue(g, 0, { type: "autoTrade", commodity: "grain", side: "buy" }).ok);
  tick(g, false);
  assert.ok(n.resources.grain > 0);
});
test("reinforcements reserve free national units in an existing attack", () => {
  const g = createGame();
  issue(g, 0, { type: "deploy", from: 17, to: 16, percent: 30 });
  const o = g.operations[0], before = o.army.infantry;
  assert.ok(issue(g, 0, { type: "reinforce", operation: o.id, percent: 50 }).ok);
  assert.ok(o.army.infantry > before);
  close(available(g, 0).infantry + deployed(g, 0).infantry, g.nations[0].army.infantry);
});
test("legacy migration pools garrisons and expeditions without loss; refunds queues", () => {
  const base = createGame(),
    legacy: any = { ...base, version: 1 };
  legacy.regions = base.regions.slice(0, 24).map((r) => ({
    ...r,
    army: { infantry: r.owner >= 0 ? 110 : 20, tanks: r.owner >= 0 ? 5 : 0 },
    industry: 2,
    fort: 0,
    queue: null,
  }));
  legacy.regions[13].owner = 0;
  legacy.regions[13].army = { infantry: 15, tanks: 2 };
  legacy.regions[17].queue = { kind: "infantry", remaining: 10, total: 16 };
  legacy.operations = [{ owner: 0, army: { infantry: 20, tanks: 1 } }];
  const migrated = restore(JSON.stringify(legacy));
  assert.ok(migrated);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.nations[0].army.infantry, 145);
  assert.equal(migrated.nations[0].army.tanks, 8);
  assert.equal(migrated.nations[0].money, 1000);
  assert.equal(migrated.operations.length, 0);
});
test("roundtrip deterministic, reject malformed saves and overbooked operations", () => {
  const g = createGame();
  for (let i = 0; i < 30; i++) tick(g);
  const h = restore(serialize(g));
  assert.ok(h);
  assert.deepEqual(h, g);
  for (let i = 0; i < 30; i++) {
    tick(g);
    tick(h);
  }
  assert.deepEqual(h, g);
  assert.equal(restore("{bad"), null);
  const bad = createGame();
  issue(bad, 0, { type: "deploy", from: 17, to: 16, percent: 60 });
  bad.operations[0].army.infantry = 99999;
  assert.equal(restore(serialize(bad)), null);
});
test("victory and elimination", () => {
  const g = createGame();
  g.regions.forEach((r) => (r.owner = 0));
  tick(g, false);
  assert.equal(g.winner, 0);
  assert.equal(g.nations[1].army.infantry, 0);
  assert.equal(issue(g, 0, { type: "armyTarget", percent: 10 }).ok, false);
});
test("bot aggression controls wars after neutral regions are gone", () => {
  const g = createGame(7);
  g.regions.forEach((r, i) => (r.owner = i < 12 ? 1 : 2));
  g.nations[1].army.infantry = 400;
  g.botAggression = 0;
  botTurn(g, 1);
  assert.equal(g.operations.length, 0);
  g.botAggression = 100;
  botTurn(g, 1);
  assert.equal(g.operations.length, 1);
  assert.equal(g.regions[g.operations[0].to].owner, 2);
});
test("five long bot simulations preserve resource and army invariants", () => {
  for (const seed of [1, 42, 721, 9001, 107]) {
    const g = createGame(seed);
    for (let t = 0; t < 1800; t++) {
      tick(g);
      if (g.time % 5 === 0) botTurn(g, 0);
      for (const n of g.nations) {
        const d = deployed(g, n.id);
        assert.ok(Number.isFinite(n.money) && n.money >= -1e-8);
        assert.ok(n.army.infantry >= 0 && n.army.tanks >= 0);
        assert.ok(
          d.infantry <= n.army.infantry + 1e-6 &&
            d.tanks <= n.army.tanks + 1e-6,
        );
        for (const v of Object.values(n.resources))
          assert.ok(Number.isFinite(v) && v >= 0);
      }
    }
    assert.ok(g.regions.filter((r) => r.owner < 0).length < 18);
    assert.ok(g.nations.some((n) => n.resources.iron > 0));
  }
});
