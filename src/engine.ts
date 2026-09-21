// Pure simulation: no DOM, timers, network or hidden bot resource bonuses.
export type Units = { infantry: number; tanks: number };
export type Branch = "military" | "industry" | "logistics";
export type Region = {
  id: number;
  name: string;
  owner: number;
  population: number;
  industry: number;
  fort: number;
  terrain: "plain" | "forest" | "mountain";
  army: Units;
  neighbors: number[];
  x: number;
  y: number;
  polygon: string;
  queue: {
    kind: "infantry" | "tanks" | "industry" | "fort";
    remaining: number;
    total: number;
  } | null;
};
export type Nation = {
  id: number;
  name: string;
  color: string;
  money: number;
  capital: number;
  personality: "balanced" | "aggressive" | "builder" | "cautious";
  tech: Record<Branch, number>;
  research: { branch: Branch; remaining: number; total: number } | null;
};
export type Operation = {
  id: number;
  owner: number;
  from: number;
  to: number;
  army: Units;
  phase: "march" | "battle";
  progress: number;
  initial: number;
  losses: number;
};
export type Game = {
  version: 1;
  time: number;
  seed: number;
  player: number;
  regions: Region[];
  nations: Nation[];
  operations: Operation[];
  nextId: number;
  log: { time: number; text: string }[];
  winner: number | null;
  defeated: number[];
};
export type Command =
  | { type: "deploy"; from: number; to: number; percent: number }
  | {
      type: "build";
      region: number;
      kind: "infantry" | "tanks" | "industry" | "fort";
    }
  | { type: "research"; branch: Branch }
  | { type: "retreat"; operation: number };
export const BRANCHES: Branch[] = ["military", "industry", "logistics"];
export const TECH_NAMES: Record<Branch, string[]> = {
  military: ["Lepší výzbroj", "Koordinovaný útok", "Veteránské sbory"],
  industry: ["Efektivní výroba", "Průmyslová síť", "Automatizace"],
  logistics: ["Polní zásobování", "Motorizace", "Operační dosah"],
};
const names = [
  "Severní mys",
  "Větrná pole",
  "Březový háj",
  "Ledový průsmyk",
  "Solná pláň",
  "Východní záliv",
  "Západní přístav",
  "Zelené údolí",
  "Nový Brod",
  "Železné vrchy",
  "Jezerní kraj",
  "Dlouhé pobřeží",
  "Starý hrad",
  "Jantarová pole",
  "Hlavní město",
  "Černý les",
  "Kamenná brána",
  "Východní přístav",
  "Jižní mys",
  "Slunečná pole",
  "Měděný důl",
  "Dubový les",
  "Bílá skála",
  "Jižní záliv",
];
export const FACTIONS = [
  { name: "Jantarová unie", color: "#b6df85", personality: "balanced" },
  { name: "Severní svaz", color: "#7fbece", personality: "cautious" },
  { name: "Západní liga", color: "#b795d2", personality: "builder" },
  { name: "Východní pakt", color: "#df9480", personality: "aggressive" },
  { name: "Jižní federace", color: "#d6b966", personality: "builder" },
  { name: "Ocelová republika", color: "#839ce0", personality: "aggressive" },
] as const;
export function strength(a: Units): number {
  return a.infantry + a.tanks * 6;
}
export function owned(g: Game, id: number): Region[] {
  return g.regions.filter((r) => r.owner === id);
}
export function createGame(seed = 42, player = 0): Game {
  const starts = [14, 0, 12, 5, 19, 23];
  const points = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 7 }, (_, col) => {
      const edge = col === 0 || col === 6 || row === 0 || row === 4;
      return [
        78 + col * 126 + Math.sin(col * 4 + row * 8) * (edge ? 17 : 23),
        74 + row * 125 + Math.cos(col * 5 + row * 3) * 20,
      ];
    }),
  );
  const nations: Nation[] = FACTIONS.map((n, id) => ({
    ...n,
    id,
    money: 650,
    capital: starts[id],
    tech: { military: 0, industry: 0, logistics: 0 },
    research: null,
  }));
  const regions: Region[] = names.map((name, id) => {
    const row = Math.floor(id / 6),
      col = id % 6,
      owner = starts.indexOf(id);
    const vertices = [
      points[row][col],
      points[row][col + 1],
      points[row + 1][col + 1],
      points[row + 1][col],
    ];
    return {
      id,
      name,
      owner,
      population: 8500 + ((id * 3917) % 13000),
      industry: owner >= 0 ? 2 : 1,
      fort: 0,
      terrain: id % 7 === 3 ? "mountain" : id % 3 === 2 ? "forest" : "plain",
      army: {
        infantry: owner >= 0 ? 110 : 18 + (id % 12),
        tanks: owner >= 0 ? 5 : 0,
      },
      queue: null,
      neighbors: [
        row > 0 ? id - 6 : -1,
        row < 3 ? id + 6 : -1,
        col > 0 ? id - 1 : -1,
        col < 5 ? id + 1 : -1,
      ].filter((n) => n >= 0),
      x: vertices.reduce((s, v) => s + v[0], 0) / 4,
      y: vertices.reduce((s, v) => s + v[1], 0) / 4,
      polygon: vertices.map((v) => v.join(",")).join(" "),
    };
  });
  return {
    version: 1,
    time: 0,
    seed: seed >>> 0,
    player,
    regions,
    nations,
    operations: [],
    nextId: 1,
    log: [
      {
        time: 0,
        text: "Operace začíná. Vybuduj ekonomiku a zajisti sousední regiony.",
      },
    ],
    winner: null,
    defeated: [],
  };
}
function rand(g: Game): number {
  g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
  return g.seed / 4294967296;
}
function add(a: Units, b: Units) {
  a.infantry += b.infantry;
  a.tanks += b.tanks;
}
function event(g: Game, text: string) {
  g.log.unshift({ time: g.time, text });
  g.log.length = Math.min(g.log.length, 60);
}
export function supplied(g: Game, id: number): Set<number> {
  const n = g.nations[id],
    seen = new Set<number>();
  if (g.regions[n.capital].owner !== id) return seen;
  const queue = [n.capital];
  seen.add(n.capital);
  for (let i = 0; i < queue.length; i++)
    for (const next of g.regions[queue[i]].neighbors) {
      if (g.regions[next].owner === id && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  return seen;
}
export function economy(g: Game, id: number) {
  const n = g.nations[id],
    regions = owned(g, id),
    supply = supplied(g, id);
  const income =
    regions.reduce(
      (v, r) =>
        v +
        (r.population / 6000 + r.industry * 2.4) *
          (supply.has(r.id) ? 1 : 0.65),
      0,
    ) *
    (1 + n.tech.industry * 0.16);
  const units = [
    ...regions.map((r) => r.army),
    ...g.operations.filter((o) => o.owner === id).map((o) => o.army),
  ];
  const upkeep = units.reduce(
    (v, a) => v + a.infantry * 0.018 + a.tanks * 0.22,
    0,
  );
  return {
    income,
    upkeep,
    net: income - upkeep,
    population: regions.reduce((v, r) => v + r.population, 0),
    power: units.reduce((v, a) => v + strength(a), 0),
  };
}
export function cost(
  r: Region,
  kind: "infantry" | "tanks" | "industry" | "fort",
): number {
  return kind === "infantry"
    ? 100
    : kind === "tanks"
      ? 180
      : kind === "industry"
        ? 200 + r.industry * 150
        : 160 + r.fort * 140;
}
export function researchCost(n: Nation, b: Branch): number {
  return 500 + n.tech[b] * 450;
}
export function defense(r: Region): number {
  return (
    (r.terrain === "mountain" ? 1.45 : r.terrain === "forest" ? 1.2 : 1) *
    (1 + r.fort * 0.22)
  );
}
export function issue(
  g: Game,
  actor: number,
  c: Command,
): { ok: boolean; message: string } {
  const fail = (message: string) => ({ ok: false, message });
  if (g.winner !== null || g.defeated.includes(actor))
    return fail("Tato frakce již nemůže vydávat rozkazy.");
  const n = g.nations[actor];
  if (!n) return fail("Neznámá frakce.");
  if (c.type === "deploy") {
    const from = g.regions[c.from],
      to = g.regions[c.to];
    if (!from || !to || from.owner !== actor || !from.neighbors.includes(to.id))
      return fail("Vyber svůj region a jeho přímého souseda.");
    if (!Number.isFinite(c.percent) || c.percent < 10 || c.percent > 100)
      return fail("Velikost výpravy musí být 10–100 %.");
    if (g.operations.some((o) => o.to === to.id))
      return fail(
        "Do tohoto regionu už směřuje operace. Počkej na její dokončení.",
      );
    const army = {
      infantry: Math.floor((from.army.infantry * c.percent) / 100),
      tanks: Math.floor((from.army.tanks * c.percent) / 100),
    };
    if (army.infantry < 5) return fail("Výprava potřebuje alespoň 5 pěšáků.");
    from.army.infantry -= army.infantry;
    from.army.tanks -= army.tanks;
    g.operations.push({
      id: g.nextId++,
      owner: actor,
      from: from.id,
      to: to.id,
      army,
      phase: "march",
      progress: 0,
      initial: strength(army),
      losses: 0,
    });
  } else if (c.type === "build") {
    const r = g.regions[c.region];
    if (!r || r.owner !== actor)
      return fail("Výstavba je možná pouze ve vlastním regionu.");
    if (!["infantry", "tanks", "industry", "fort"].includes(c.kind))
      return fail("Neznámý projekt.");
    if (r.queue) return fail("V regionu už probíhá projekt.");
    if (
      (c.kind === "industry" && r.industry >= 5) ||
      (c.kind === "fort" && r.fort >= 3)
    )
      return fail("Dosažena nejvyšší úroveň.");
    if (c.kind === "infantry" && r.population < 1050)
      return fail("Nedostatek obyvatel pro nábor.");
    const price = cost(r, c.kind);
    if (n.money < price) return fail("Nedostatek peněz.");
    n.money -= price;
    if (c.kind === "infantry") r.population -= 50;
    const duration = Math.round(
      (c.kind === "infantry" ? 16 : c.kind === "tanks" ? 25 : 35) /
        (1 + n.tech.industry * 0.12),
    );
    r.queue = { kind: c.kind, remaining: duration, total: duration };
  } else if (c.type === "research") {
    if (!BRANCHES.includes(c.branch)) return fail("Neznámá technologie.");
    if (n.research || n.tech[c.branch] >= 3)
      return fail("Výzkum probíhá nebo je větev dokončena.");
    const price = researchCost(n, c.branch);
    if (n.money < price) return fail("Nedostatek peněz.");
    n.money -= price;
    const duration = 50 + n.tech[c.branch] * 25;
    n.research = { branch: c.branch, remaining: duration, total: duration };
  } else if (c.type === "retreat") {
    const o = g.operations.find(
      (o) => o.id === c.operation && o.owner === actor,
    );
    if (!o) return fail("Operace už není aktivní.");
    if (g.regions[o.from].owner !== actor)
      return fail("Ústup není možný: výchozí region byl ztracen.");
    // Withdrawal costs troops; no refund exploit or instant full-strength return.
    o.army.infantry *= 0.8;
    o.army.tanks *= 0.8;
    add(g.regions[o.from].army, o.army);
    g.operations = g.operations.filter((op) => op.id !== o.id);
    event(
      g,
      `${n.name}: ústup z operace u ${g.regions[o.to].name} (20 % ztrát).`,
    );
  } else return fail("Neznámý rozkaz.");
  return { ok: true, message: "Rozkaz přijat." };
}
function attrition(a: Units, damage: number) {
  const p = strength(a);
  if (p <= 0) return;
  const factor = Math.max(0, 1 - damage / p);
  a.infantry *= factor;
  a.tanks *= factor;
}
export function tick(g: Game, bots = true): void {
  if (g.winner !== null) return;
  g.time++;
  for (const n of g.nations) {
    if (g.defeated.includes(n.id)) continue;
    const e = economy(g, n.id);
    n.money = Math.max(0, n.money + e.net);
    if (n.money === 0 && e.net < 0) {
      for (const r of owned(g, n.id))
        attrition(r.army, strength(r.army) * 0.008);
      for (const o of g.operations.filter((o) => o.owner === n.id))
        attrition(o.army, strength(o.army) * 0.008);
    }
    if (n.research && --n.research.remaining <= 0) {
      event(
        g,
        `${n.name}: dokončen výzkum ${TECH_NAMES[n.research.branch][n.tech[n.research.branch]]}.`,
      );
      n.tech[n.research.branch]++;
      n.research = null;
    }
  }
  for (const r of g.regions) {
    if (r.owner < 0) continue;
    r.population = Math.min(50000, r.population + 0.6);
    if (r.queue && --r.queue.remaining <= 0) {
      if (r.queue.kind === "infantry") r.army.infantry += 50;
      else if (r.queue.kind === "tanks") r.army.tanks += 5;
      else if (r.queue.kind === "industry") r.industry++;
      else r.fort++;
      r.queue = null;
    }
  }
  const done = new Set<number>();
  for (const o of g.operations) {
    const to = g.regions[o.to],
      n = g.nations[o.owner];
    if (o.phase === "march") {
      o.progress += 1 / (10 / (1 + n.tech.logistics * 0.15));
      if (o.progress < 1) continue;
      if (to.owner === o.owner) {
        add(to.army, o.army);
        done.add(o.id);
        continue;
      }
      o.phase = "battle";
      o.progress = 0;
    }
    if (to.owner === o.owner) {
      add(to.army, o.army);
      done.add(o.id);
      continue;
    }
    const supply = supplied(g, o.owner).has(o.from)
      ? 1
      : 0.65 + n.tech.logistics * 0.08;
    const defenderTech = to.owner >= 0 ? g.nations[to.owner].tech.military : 0;
    const attack = strength(o.army) * (1 + n.tech.military * 0.12) * supply;
    const defend = strength(to.army) * (1 + defenderTech * 0.12) * defense(to);
    const before = strength(o.army);
    attrition(o.army, defend * 0.022);
    attrition(to.army, (attack * 0.022) / defense(to));
    o.losses += before - strength(o.army);
    o.progress = Math.min(
      1,
      o.progress + Math.max(0.002, (attack / (defend + 12)) * 0.009),
    );
    if (strength(o.army) < 3 || o.army.infantry < 1) {
      done.add(o.id);
      event(g, `${n.name}: útok na ${to.name} byl odražen.`);
    } else if (strength(to.army) < 2 || o.progress >= 1) {
      const previous = to.owner;
      to.owner = o.owner;
      to.army = { ...o.army };
      to.queue = null;
      to.fort = Math.max(0, to.fort - 1);
      done.add(o.id);
      event(
        g,
        `${n.name} obsazuje ${to.name}${previous >= 0 ? ` (${g.nations[previous].name})` : ""}.`,
      );
    }
  }
  g.operations = g.operations.filter((o) => !done.has(o.id));
  for (const n of g.nations)
    if (!g.defeated.includes(n.id) && owned(g, n.id).length === 0) {
      g.defeated.push(n.id);
      g.operations = g.operations.filter((o) => o.owner !== n.id);
      event(g, `${n.name} byla poražena.`);
    }
  const owner = g.regions[0].owner;
  if (owner >= 0 && g.regions.every((r) => r.owner === owner)) {
    g.winner = owner;
    event(g, `${g.nations[owner].name} ovládla celou mapu.`);
    return;
  }
  if (bots && g.time % 5 === 0)
    for (const n of g.nations) if (n.id !== g.player) botTurn(g, n.id);
}
export function botTurn(g: Game, actor: number): void {
  if (g.defeated.includes(actor) || g.winner !== null) return;
  const n = g.nations[actor],
    regions = owned(g, actor);
  if (!regions.length) return;
  // Reproducible variation, but the same prices, queues and orders as the human.
  const bias =
    n.personality === "aggressive"
      ? 1.25
      : n.personality === "cautious"
        ? 1.9
        : 1.55;
  for (const r of regions) {
    const inbound = g.operations.some(
      (o) => o.to === r.id && o.owner !== actor,
    );
    const targets = r.neighbors
      .map((id) => g.regions[id])
      .filter(
        (t) => t.owner !== actor && !g.operations.some((o) => o.to === t.id),
      );
    targets.sort(
      (a, b) =>
        (strength(a.army) * defense(a)) / (a.industry + 2) -
        (strength(b.army) * defense(b)) / (b.industry + 2),
    );
    const target = targets[0];
    if (
      !inbound &&
      target &&
      strength(r.army) * 0.65 >
        strength(target.army) * defense(target) * bias &&
      r.army.infantry > 24
    ) {
      issue(g, actor, {
        type: "deploy",
        from: r.id,
        to: target.id,
        percent: 70,
      });
    } else if (!targets.length && !inbound && r.army.infantry > 25) {
      // Breadth-first routing from rear regions to a reachable owned frontier.
      const queue: { id: number; first: number }[] = r.neighbors
        .filter((id) => g.regions[id].owner === actor)
        .map((id) => ({ id, first: id }));
      const visited = new Set([r.id]);
      for (let i = 0; i < queue.length; i++) {
        const step = queue[i];
        if (visited.has(step.id)) continue;
        visited.add(step.id);
        const candidate = g.regions[step.id];
        if (candidate.neighbors.some((id) => g.regions[id].owner !== actor)) {
          issue(g, actor, {
            type: "deploy",
            from: r.id,
            to: step.first,
            percent: 85,
          });
          break;
        }
        for (const id of candidate.neighbors)
          if (g.regions[id].owner === actor && !visited.has(id))
            queue.push({ id, first: step.first });
      }
    }
    if (!r.queue) {
      const e = economy(g, actor),
        isFront = r.neighbors.some((id) => g.regions[id].owner !== actor);
      const invest =
        !inbound &&
        r.industry < 5 &&
        (e.net < 5 ||
          (n.personality === "builder" ? rand(g) < 0.5 : rand(g) < 0.25));
      if (invest)
        issue(g, actor, { type: "build", region: r.id, kind: "industry" });
      else if (isFront && (e.net > 1 || inbound))
        issue(g, actor, {
          type: "build",
          region: r.id,
          kind:
            r.army.tanks < r.army.infantry / 14 && n.money > 300
              ? "tanks"
              : "infantry",
        });
    }
  }
  if (n.money > 900 && !n.research) {
    const options = BRANCHES.filter((b) => n.tech[b] < 3);
    if (options.length)
      issue(g, actor, {
        type: "research",
        branch: options[Math.floor(rand(g) * options.length)],
      });
  }
}
export function serialize(g: Game): string {
  return JSON.stringify(g);
}
export function restore(raw: string): Game | null {
  try {
    const g: Game = JSON.parse(raw);
    if (
      g.version !== 1 ||
      !Number.isInteger(g.time) ||
      g.time < 0 ||
      !Number.isInteger(g.seed) ||
      !Number.isInteger(g.player) ||
      g.player < 0 ||
      g.player > 5 ||
      !Array.isArray(g.regions) ||
      g.regions.length !== 24 ||
      !Array.isArray(g.nations) ||
      g.nations.length !== 6 ||
      !Array.isArray(g.operations) ||
      !Array.isArray(g.log) ||
      !Array.isArray(g.defeated)
    )
      return null;
    const num = (v: unknown): v is number =>
      typeof v === "number" && Number.isFinite(v) && v >= 0;
    const army = (a: Units) => a && num(a.infantry) && num(a.tanks);
    const regionId = (id: number) => Number.isInteger(id) && id >= 0 && id < 24;
    const ownerId = (id: number) => Number.isInteger(id) && id >= 0 && id < 6;
    const base = createGame(g.seed, g.player);
    for (let i = 0; i < 24; i++) {
      const r = g.regions[i];
      if (
        !r ||
        r.id !== i ||
        !(r.owner === -1 || ownerId(r.owner)) ||
        !army(r.army) ||
        !num(r.population) ||
        !Number.isInteger(r.industry) ||
        r.industry < 1 ||
        r.industry > 5 ||
        !Number.isInteger(r.fort) ||
        r.fort < 0 ||
        r.fort > 3
      )
        return null;
      if (
        r.queue &&
        (!["infantry", "tanks", "industry", "fort"].includes(r.queue.kind) ||
          !num(r.queue.remaining) ||
          !num(r.queue.total) ||
          r.queue.total < 1)
      )
        return null;
      // Geometry and names are canonical rather than trusted save-file markup.
      Object.assign(r, {
        name: base.regions[i].name,
        neighbors: base.regions[i].neighbors,
        polygon: base.regions[i].polygon,
        x: base.regions[i].x,
        y: base.regions[i].y,
        terrain: base.regions[i].terrain,
      });
    }
    for (let i = 0; i < 6; i++) {
      const n = g.nations[i];
      if (
        !n ||
        n.id !== i ||
        !num(n.money) ||
        !regionId(n.capital) ||
        !n.tech ||
        !BRANCHES.every(
          (b) =>
            Number.isInteger(n.tech[b]) && n.tech[b] >= 0 && n.tech[b] <= 3,
        )
      )
        return null;
      if (
        n.research &&
        (!BRANCHES.includes(n.research.branch) ||
          !num(n.research.remaining) ||
          !num(n.research.total) ||
          n.research.total < 1)
      )
        return null;
      Object.assign(n, {
        name: FACTIONS[i].name,
        color: FACTIONS[i].color,
        personality: FACTIONS[i].personality,
      });
    }
    if (
      !Number.isInteger(g.nextId) ||
      g.nextId < 1 ||
      !(g.winner === null || ownerId(g.winner)) ||
      !g.defeated.every(ownerId)
    )
      return null;
    if (
      g.operations.length > 24 ||
      new Set(g.operations.map((o) => o.to)).size !== g.operations.length
    )
      return null;
    for (const o of g.operations)
      if (
        !o ||
        !Number.isInteger(o.id) ||
        o.id >= g.nextId ||
        !ownerId(o.owner) ||
        !regionId(o.from) ||
        !regionId(o.to) ||
        !g.regions[o.from].neighbors.includes(o.to) ||
        !army(o.army) ||
        !["march", "battle"].includes(o.phase) ||
        !num(o.progress) ||
        o.progress > 1 ||
        !num(o.initial) ||
        !num(o.losses)
      )
        return null;
    if (!g.log.every((e) => num(e.time) && typeof e.text === "string"))
      return null;
    g.log = g.log.slice(0, 60);
    return g;
  } catch {
    return null;
  }
}
