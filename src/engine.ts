// One national army; operations reserve units, never duplicate them.
export type Units = { infantry: number; tanks: number };
export type Branch = "military" | "industry" | "logistics";
export type Commodity = "iron" | "coal" | "oil" | "grain";
export type Facility = "city" | Commodity | "port";
export type Geography = "land" | "mountain" | "lake" | "sea";
export type CombatStance = "cautious" | "balanced" | "assault";
export type Specialization = "none" | "civil" | "industrial" | "military";
type Queue = { remaining: number; total: number };
export type Region = {
  id: number;
  name: string;
  owner: number;
  facility: Facility;
  geography: Geography;
  level: number;
  terrain: "plain" | "forest" | "mountain";
  neighbors: number[];
  x: number;
  y: number;
  polygon: string;
  upgrade: Queue | null;
  fort: number;
  fortification: Queue | null;
  specialization: Specialization;
};
export type Nation = {
  id: number;
  name: string;
  color: string;
  capital: number;
  personality: "balanced" | "aggressive" | "builder" | "cautious";
  money: number;
  army: Units;
  armyTarget: number;
  resources: Record<Commodity, number>;
  autoTrade: Record<Commodity, { buy: boolean; sell: boolean }>;
  populationLoss: number;
  tankQueue: Queue | null;
  tech: Record<Branch, number>;
  research: (Queue & { branch: Branch }) | null;
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
  neutralResistance: number;
  stance: CombatStance;
};
export type Game = {
  version: 4;
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
  botAggression: number;
  truces: Record<string, number>;
};
export type Command =
  | { type: "armyTarget"; percent: number }
  | { type: "botAggression"; percent: number }
  | { type: "trade"; commodity: Commodity; side: "buy" | "sell" }
  | { type: "autoTrade"; commodity: Commodity; side: "buy" | "sell" }
  | { type: "deploy"; from: number; to: number; percent: number; stance?: CombatStance }
  | { type: "reinforce"; operation: number; percent: number }
  | { type: "stance"; operation: number; stance: CombatStance }
  | { type: "specialize"; region: number; specialization: Specialization }
  | { type: "pact"; target: number }
  | { type: "upgrade"; region: number }
  | { type: "fortify"; region: number }
  | { type: "tanks" }
  | { type: "research"; branch: Branch }
  | { type: "retreat"; operation: number };
export const BRANCHES: Branch[] = ["military", "industry", "logistics"];
export const TECH_NAMES: Record<Branch, string[]> = {
  military: ["Lepší výzbroj", "Koordinovaný útok", "Veteránské sbory"],
  industry: ["Efektivní výroba", "Průmyslová síť", "Automatizace"],
  logistics: ["Úsporné motory", "Motorizace", "Operační dosah"],
};
export const FACILITIES: Record<
  Facility,
  { name: string; short: string; symbol: string; description: string }
> = {
  city: {
    name: "Město",
    short: "MĚSTO",
    symbol: "▥",
    description:
      "Každá úroveň přidá 8 000 obyvatel, 320 míst v armádě a daňové příjmy.",
  },
  iron: {
    name: "Železný důl",
    short: "ŽELEZO",
    symbol: "Fe",
    description: "Těží železo pro výrobu tanků. Vyšší úroveň zvyšuje těžbu.",
  },
  coal: {
    name: "Uhelný důl",
    short: "UHLÍ",
    symbol: "C",
    description: "Těží uhlí pro výrobu tanků. Vyšší úroveň zvyšuje těžbu.",
  },
  oil: {
    name: "Ropné pole",
    short: "ROPA",
    symbol: "◈",
    description:
      "Dodává palivo celé armádě. Vlastní těžba snižuje dovozní náklady.",
  },
  grain: {
    name: "Obilné pole",
    short: "OBILÍ",
    symbol: "◆",
    description:
      "Produkuje obilí pro obyvatelstvo. Vyšší populace znamená vyšší spotřebu.",
  },
  port: {
    name: "Přístav",
    short: "PŘÍSTAV",
    symbol: "⚓",
    description:
      "Přináší obchodní příjmy. Dovoz ropy je o 12 % levnější za úroveň, nejvýše o 40 %.",
  },
};
export const TANK_COST = { money: 250, iron: 60, coal: 40, count: 5, crew: 20 };
export const TRADE = {
  iron: { name: "Železo", symbol: "Fe", price: 5 },
  coal: { name: "Uhlí", symbol: "C", price: 4 },
  oil: { name: "Ropa", symbol: "◈", price: 6 },
  grain: { name: "Obilí", symbol: "◆", price: 3 },
} as const;
export const TRADE_LOT = 25;
export const STANCES: Record<CombatStance, { name: string; attack: number; losses: number; speed: number }> = {
  cautious: { name: "Opatrný", attack: .86, losses: .72, speed: .72 },
  balanced: { name: "Vyvážený", attack: 1, losses: 1, speed: 1 },
  assault: { name: "Průlom", attack: 1.22, losses: 1.34, speed: 1.28 },
};
export const SPECIALIZATIONS: Record<Specialization, { name: string; description: string }> = {
  none: { name: "Bez specializace", description: "Provincie funguje bez bonusu." },
  civil: { name: "Civilní centrum", description: "+25 % populace a příjmů města." },
  industrial: { name: "Průmyslový okruh", description: "+30 % těžby a příjmů dolu." },
  military: { name: "Vojenský obvod", description: "+18 % obrany provincie." },
};
export const SPECIALIZATION_COST = 450;
export const MAP_COLS = 8;
export const MAP_ROWS = 6;
// Mountain ridges and lakes remove these province connections from pathfinding.
export const SEA_REGIONS = new Set([0, 7, 8, 15, 32, 40, 46, 47]);
export const MOUNTAIN_REGIONS = new Set([12, 20, 28, 36]);
export const LAKE_REGIONS = new Set([21, 29]);
export const BLOCKED_REGIONS = new Set([...MOUNTAIN_REGIONS, ...LAKE_REGIONS]);
export const PORT_REGIONS = new Set([9, 23, 39, 45]);
export const FACTIONS = [
  { name: "Jantarová unie", color: "#b6df85", personality: "balanced" },
  { name: "Severní svaz", color: "#7fbece", personality: "cautious" },
  { name: "Západní liga", color: "#b795d2", personality: "builder" },
  { name: "Východní pakt", color: "#df9480", personality: "aggressive" },
  { name: "Jižní federace", color: "#d6b966", personality: "builder" },
  { name: "Ocelová republika", color: "#839ce0", personality: "aggressive" },
] as const;
const names = [
  "Severní mys",
  "Železná pole",
  "Březový důl",
  "Ledové ropné pole",
  "Solná pánev",
  "Východní záliv",
  "Západní město",
  "Zelený důl",
  "Nový Brod",
  "Železné vrchy",
  "Jezerní ložisko",
  "Dlouhé pobřeží",
  "Starý hrad",
  "Jantarový důl",
  "Hlavní město",
  "Černý důl",
  "Kamenná brána",
  "Východní město",
  "Jižní ropné pole",
  "Slunečné město",
  "Železný důl",
  "Dubový důl",
  "Bílá skála",
  "Jižní záliv",
  "Úrodná nížina",
  "Rudé údolí",
  "Severní obilnice",
  "Mlžné pobřeží",
  "Královské město",
  "Zlaté pláně",
  "Ropný hřbet",
  "Uhelná pánev",
  "Větrné město",
  "Východní obilnice",
  "Ocelový mys",
  "Šedý průsmyk",
  "Modré jezero",
  "Borový přístav",
  "Vysoká pláň",
  "Jižní železárny",
  "Černé pobřeží",
  "Obilný brod",
  "Ropná hranice",
  "Skalní město",
  "Tichý záliv",
  "Uhelné stráně",
  "Dolní město",
  "Koncový mys",
];
const facilities: Facility[] = [
  "city",
  "iron",
  "coal",
  "oil",
  "iron",
  "city",
  "city",
  "coal",
  "city",
  "iron",
  "oil",
  "port",
  "city",
  "iron",
  "city",
  "coal",
  "oil",
  "city",
  "oil",
  "city",
  "iron",
  "coal",
  "coal",
  "port",
  "grain",
  "iron",
  "grain",
  "port",
  "city",
  "grain",
  "oil",
  "coal",
  "city",
  "grain",
  "city",
  "iron",
  "city",
  "port",
  "grain",
  "iron",
  "coal",
  "grain",
  "oil",
  "city",
  "port",
  "coal",
  "city",
  "oil",
];
export const strength = (a: Units) => a.infantry + a.tanks * 6;
export const personnel = (a: Units) => a.infantry + a.tanks * 4;
export const owned = (g: Game, id: number) =>
  g.regions.filter((r) => r.geography === "land" && r.owner === id);
export const playableRegions = (g: Game) =>
  g.regions.filter((r) => r.geography === "land");
export const population = (r: Region) =>
  (r.facility === "city" ? 8000 * r.level : 1500) * (r.specialization === "civil" ? 1.25 : 1);
export const defense = (r: Region) =>
  (r.terrain === "mountain" ? 1.4 : r.terrain === "forest" ? 1.15 : 1) * (r.specialization === "military" ? 1.18 : 1);
export const upgradeCost = (r: Region) => 250 + r.level * 200;
export const fortifyCost = (r: Region) => 180 + r.fort * 120;
export const researchCost = (n: Nation, b: Branch) => 500 + n.tech[b] * 450;
export function createGame(seed = 42, player = 0): Game {
  const starts = [17, 2, 6, 14, 33, 44],
    rowShift = [12, -8, -20, -8, 8, 22, 4],
    points = Array.from({ length: MAP_ROWS + 1 }, (_, row) =>
      Array.from({ length: MAP_COLS + 1 }, (_, col) => [
        82 + col * 145 + rowShift[row] + Math.sin(col * 4 + row * 8) * 6,
        66 + row * 126 + Math.cos(col * 5 + row * 3) * 7,
      ]),
    );
  const regions = names.map((name, id): Region => {
    const row = Math.floor(id / MAP_COLS),
      col = id % MAP_COLS,
      geography: Geography = SEA_REGIONS.has(id) ? "sea" : MOUNTAIN_REGIONS.has(id) ? "mountain" : LAKE_REGIONS.has(id) ? "lake" : "land",
      owner = geography === "land" ? starts.indexOf(id) : -1,
      v = [
        points[row][col],
        points[row][col + 1],
        points[row + 1][col + 1],
        points[row + 1][col],
      ];
    return {
      id,
      name: geography === "mountain" ? ["Severní Karpaty", "Vysoké Alpy", "Dinárské hory", "Jižní hřeben"][Array.from(MOUNTAIN_REGIONS).indexOf(id)] : geography === "lake" ? (id === 21 ? "Velké jezero" : "Jezerní pánev") : name,
      owner,
      facility: starts.includes(id) ? "city" : PORT_REGIONS.has(id) ? "port" : facilities[id] === "port" ? "coal" : facilities[id],
      geography,
      level: owner >= 0 ? 2 : 1,
      terrain: id % 9 === 3 ? "mountain" : id % 3 === 2 ? "forest" : "plain",
      upgrade: null,
      fort: 0,
      fortification: null,
      specialization: "none",
      neighbors: geography !== "land" ? [] : [
        row > 0 ? id - MAP_COLS : -1,
        row < MAP_ROWS - 1 ? id + MAP_COLS : -1,
        col > 0 ? id - 1 : -1,
        col < MAP_COLS - 1 ? id + 1 : -1,
      ].filter((i) => i >= 0 && !SEA_REGIONS.has(i) && !BLOCKED_REGIONS.has(i)),
      x: v.reduce((s, p) => s + p[0], 0) / 4,
      y: v.reduce((s, p) => s + p[1], 0) / 4,
      polygon: v.map((p) => p.join(",")).join(" "),
    };
  });
  return {
    version: 4,
    time: 0,
    seed: seed >>> 0,
    player,
    regions,
    nations: FACTIONS.map((n, id) => ({
      ...n,
      id,
      capital: starts[id],
      money: 900,
      army: { infantry: 160, tanks: 0 },
      armyTarget: 35,
      resources: { iron: 0, coal: 0, oil: 30, grain: 40 },
      autoTrade: {
        iron: { buy: false, sell: false },
        coal: { buy: false, sell: false },
        oil: { buy: false, sell: false },
        grain: { buy: false, sell: false },
      },
      populationLoss: 0,
      tankQueue: null,
      tech: { military: 0, industry: 0, logistics: 0 },
      research: null,
    })),
    operations: [],
    nextId: 1,
    log: [
      {
        time: 0,
        text: "Jedna armáda pro celý stát. Ovládni doly, rozvíjej města a hlídej rozpočet.",
      },
    ],
    winner: null,
    defeated: [],
    botAggression: 60,
    truces: {},
  };
}
function event(g: Game, text: string) {
  g.log.unshift({ time: g.time, text });
  g.log.length = Math.min(60, g.log.length);
}
function rand(g: Game) {
  g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
  return g.seed / 4294967296;
}
export function deployed(g: Game, id: number): Units {
  return g.operations
    .filter((o) => o.owner === id)
    .reduce(
      (a, o) => ({
        infantry: a.infantry + o.army.infantry,
        tanks: a.tanks + o.army.tanks,
      }),
      { infantry: 0, tanks: 0 },
    );
}
export function available(g: Game, id: number): Units {
  const a = g.nations[id].army,
    d = deployed(g, id);
  return {
    infantry: Math.max(0, a.infantry - d.infantry),
    tanks: Math.max(0, a.tanks - d.tanks),
  };
}
export const potentialPopulation = (g: Game, id: number) =>
  owned(g, id).reduce((s, r) => s + population(r), 0);
export const currentPopulation = (g: Game, id: number) =>
  Math.max(0, potentialPopulation(g, id) - g.nations[id].populationLoss);
export const capacity = (g: Game, id: number) =>
  Math.floor(currentPopulation(g, id) * 0.04);
export const targetPersonnel = (
  g: Game,
  id: number,
  percent = g.nations[id].armyTarget,
) => Math.floor((capacity(g, id) * percent) / 100);
const pactKey = (a: number, b: number) => [Math.min(a, b), Math.max(a, b)].join(":");
export const truceRemaining = (g: Game, a: number, b: number) => Math.max(0, (g.truces[pactKey(a, b)] || 0) - g.time);
export function suppliedRegions(g: Game, id: number) {
  const own = new Set(owned(g, id).map((r) => r.id));
  const start = own.has(g.nations[id].capital) ? g.nations[id].capital : owned(g, id)[0]?.id;
  const reached = new Set<number>();
  if (start === undefined) return reached;
  const queue = [start]; reached.add(start);
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of g.regions[current].neighbors)
      if (own.has(next) && !reached.has(next)) { reached.add(next); queue.push(next); }
  }
  return reached;
}
export const isSupplied = (g: Game, region: number) => {
  const r = g.regions[region];
  return r?.owner >= 0 && suppliedRegions(g, r.owner).has(region);
};
export function production(g: Game, id: number) {
  const p = { iron: 0, coal: 0, oil: 0, grain: 0, port: 0 },
    boost = 1 + g.nations[id].tech.industry * 0.16,
    supplied = suppliedRegions(g, id);
  for (const r of owned(g, id))
    if (r.facility === "port") p.port += r.level;
    else if (r.facility !== "city")
      p[r.facility] +=
        r.level *
        (r.facility === "grain" ? 2.5 : r.facility === "oil" ? 1.2 : 0.8) *
        boost * (r.specialization === "industrial" ? 1.3 : 1) * (supplied.has(r.id) ? 1 : .45);
  return p;
}
export function runningCost(g: Game, id: number, a: Units) {
  const p = production(g, id),
    n = g.nations[id],
    salary = a.infantry * 0.014 + a.tanks * 0.28,
    oilUse =
      (a.infantry * 0.002 + a.tanks * 0.12) * (1 - n.tech.logistics * 0.1),
    oilPrice = TRADE.oil.price * (1 - Math.min(0.35, p.port * 0.08)),
    oilShortage = Math.max(0, oilUse - p.oil - n.resources.oil);
  return {
    salary,
    oilUse,
    oilPrice,
    importSteady: 0,
    importNow: oilShortage,
    oilCost: 0,
    steadyCost: salary,
  };
}
export function economy(g: Game, id: number) {
  const n = g.nations[id],
    rs = owned(g, id),
    p = production(g, id),
    income =
      rs.reduce(
        (s, r) =>
          s +
          (r.facility === "city"
            ? r.level * 7 * (r.specialization === "civil" ? 1.25 : 1)
            : r.facility === "port"
              ? r.level * 6
              : 2 * (r.specialization === "industrial" ? 1.3 : 1)),
        0,
      ) *
      (1 + n.tech.industry * 0.16),
    costs = runningCost(g, id, n.army),
    totalPopulation = currentPopulation(g, id),
    grainUse = totalPopulation / 5000,
    grainBalance = p.grain - grainUse,
    foodCovered = n.resources.grain + p.grain >= grainUse,
    oilCovered = n.resources.oil + p.oil >= costs.oilUse,
    target = targetPersonnel(g, id),
    reservedCrew = n.tankQueue ? 20 : 0,
    desiredInfantry = Math.max(0, target - 4 * n.army.tanks - reservedCrew),
    planned = runningCost(g, id, {
      infantry: desiredInfantry,
      tanks: n.army.tanks + (n.tankQueue ? 5 : 0),
    });
  return {
    ...costs,
    income: income * (foodCovered ? 1 : 0.65),
    upkeep: costs.salary + costs.oilCost,
    net: income * (foodCovered ? 1 : 0.65) - costs.salary - costs.oilCost,
    population: totalPopulation,
    grainUse,
    grainBalance,
    foodCovered,
    oilCovered,
    capacity: capacity(g, id),
    target,
    desiredInfantry,
    planned,
    production: p,
    power: strength(n.army),
  };
}
export function tankBlocker(g: Game, id: number): string | null {
  const n = g.nations[id];
  if (n.tankQueue) return "Výroba tanků už probíhá.";
  if (n.resources.iron < 60 || n.resources.coal < 40)
    return "Chybí suroviny: potřebuješ 60 železa a 40 uhlí.";
  if (n.money < 250) return "Potřebuješ 250 ¤.";
  if (personnel(n.army) + 20 > capacity(g, id))
    return "Chybí 20 míst pro osádky. Rozšiř město nebo sniž pěchotu.";
  return null;
}
export function attackPreview(g: Game, actor: number, from: number, to: number, percent: number, stance: CombatStance = "balanced") {
  const free = available(g, actor), army = { infantry: Math.floor(free.infantry * percent / 100), tanks: Math.floor(free.tanks * percent / 100) };
  const target = g.regions[to], supplied = isSupplied(g, from), oil = economy(g, actor).oilCovered;
  const supply = supplied && oil ? 1 : supplied ? .82 : .68;
  const attack = strength(army) * (1 + g.nations[actor].tech.military * .12) * STANCES[stance].attack * supply;
  const defend = target ? defenseStrength(g, target) : Infinity;
  const ratio = attack / Math.max(1, defend);
  return { army, attack, defend, supply, chance: Math.max(5, Math.min(95, Math.round(50 + Math.log2(Math.max(.05, ratio)) * 24))), estimate: ratio >= 1.35 ? "Výrazná převaha" : ratio >= .9 ? "Vyrovnaný boj" : ratio >= .62 ? "Riskantní" : "Velmi nebezpečné" };
}
export function issue(
  g: Game,
  actor: number,
  c: Command,
): { ok: boolean; message: string } {
  const fail = (message: string) => ({ ok: false, message }),
    n = g.nations[actor];
  if (!n || g.winner !== null || g.defeated.includes(actor))
    return fail("Tato frakce nemůže vydávat rozkazy.");
  if (c.type === "armyTarget") {
    if (!Number.isFinite(c.percent) || c.percent < 0 || c.percent > 100)
      return fail("Velikost armády musí být 0–100 %.");
    n.armyTarget = Math.round(c.percent);
  } else if (c.type === "botAggression") {
    if (actor !== g.player || !Number.isFinite(c.percent) || c.percent < 0 || c.percent > 100)
      return fail("Agresivita botů musí být 0–100 %.");
    g.botAggression = Math.round(c.percent);
  } else if (c.type === "trade") {
    if (!Object.hasOwn(TRADE, c.commodity)) return fail("Neznámá komodita.");
    const price = TRADE[c.commodity].price,
      portDiscount = Math.min(0.35, production(g, actor).port * 0.08),
      total = TRADE_LOT * price * (c.side === "buy" ? 1 - portDiscount : 0.7);
    if (c.side === "buy") {
      if (n.money < total) return fail("Nedostatek peněz na nákup.");
      n.money -= total;
      n.resources[c.commodity] += TRADE_LOT;
    } else {
      if (n.resources[c.commodity] < TRADE_LOT)
        return fail("K prodeji potřebuješ alespoň 25 jednotek.");
      n.resources[c.commodity] -= TRADE_LOT;
      n.money += total;
    }
  } else if (c.type === "autoTrade") {
    if (!Object.hasOwn(TRADE, c.commodity)) return fail("Neznámá komodita.");
    n.autoTrade[c.commodity][c.side] = !n.autoTrade[c.commodity][c.side];
  } else if (c.type === "deploy") {
    const from = g.regions[c.from],
      to = g.regions[c.to];
    if (
      !from ||
      !to ||
      from.owner !== actor ||
      to.owner === actor ||
      !from.neighbors.includes(to.id)
    )
      return fail(
        "Vyber sousední cizí území. Mezi vlastními regiony se armáda nepřesouvá.",
      );
    if (!Number.isFinite(c.percent) || c.percent < 10 || c.percent > 100)
      return fail("Na útok vyčleň 10–100 % volné armády.");
    if (g.operations.some((o) => o.to === to.id))
      return fail("Do tohoto území už směřuje operace.");
    if (to.owner >= 0 && truceRemaining(g, actor, to.owner) > 0)
      return fail("S tímto státem platí dohoda o neútočení.");
    const stance = c.stance ?? "balanced";
    if (!Object.hasOwn(STANCES, stance)) return fail("Neplatný bojový postoj.");
    const free = available(g, actor),
      army = {
        infantry: Math.floor((free.infantry * c.percent) / 100),
        tanks: Math.floor((free.tanks * c.percent) / 100),
      };
    if (army.infantry < 5)
      return fail(
        "Nedostatek volné pěchoty. Vyčkej na nábor nebo návrat výpravy.",
      );
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
      neutralResistance: to.owner < 0 ? 35 + to.level * 8 : 0,
      stance,
    });
  } else if (c.type === "reinforce") {
    const o = g.operations.find((op) => op.id === c.operation && op.owner === actor);
    if (!o) return fail("Operace už skončila.");
    if (!Number.isFinite(c.percent) || c.percent < 10 || c.percent > 100)
      return fail("Posily musí tvořit 10–100 % volné armády.");
    const free = available(g, actor), add = {
      infantry: Math.floor((free.infantry * c.percent) / 100),
      tanks: Math.floor((free.tanks * c.percent) / 100),
    };
    if (add.infantry < 1 && add.tanks < 1) return fail("Pro posily nejsou volné jednotky.");
    o.army.infantry += add.infantry;
    o.army.tanks += add.tanks;
    o.initial += strength(add);
    event(g, n.name + ": posily míří do operace u " + g.regions[o.to].name + ".");
  } else if (c.type === "stance") {
    const o = g.operations.find((op) => op.id === c.operation && op.owner === actor);
    if (!o || !Object.hasOwn(STANCES, c.stance)) return fail("Bojový postoj nelze změnit.");
    o.stance = c.stance;
  } else if (c.type === "specialize") {
    const r = g.regions[c.region];
    if (!r || r.owner !== actor || !Object.hasOwn(SPECIALIZATIONS, c.specialization) || c.specialization === "none") return fail("Specializace zde není dostupná.");
    if (r.specialization === c.specialization) return fail("Provincie už tuto specializaci má.");
    if (n.money < SPECIALIZATION_COST) return fail("Na specializaci potřebuješ 450 ¤.");
    n.money -= SPECIALIZATION_COST; r.specialization = c.specialization;
    event(g, r.name + ": vyhlášena specializace „" + SPECIALIZATIONS[c.specialization].name + "“.");
  } else if (c.type === "pact") {
    const other = g.nations[c.target];
    if (!other || other.id === actor || g.defeated.includes(other.id)) return fail("Dohodu s tímto státem nelze uzavřít.");
    if (n.money < 180) return fail("Diplomatická mise stojí 180 ¤.");
    if (truceRemaining(g, actor, other.id) > 0) return fail("Dohoda už platí.");
    n.money -= 180; g.truces[pactKey(actor, other.id)] = g.time + 120;
    event(g, n.name + " a " + other.name + " uzavírají dohodu o neútočení na 120 s.");
  } else if (c.type === "upgrade") {
    const r = g.regions[c.region];
    if (!r || r.owner !== actor)
      return fail("Vylepšovat můžeš jen vlastní území.");
    if (r.upgrade || r.level >= 20)
      return fail("Vylepšení už probíhá nebo je budova na maximu.");
    if (n.money < upgradeCost(r)) return fail("Nedostatek peněz.");
    n.money -= upgradeCost(r);
    const total = Math.round(35 / (1 + n.tech.industry * 0.12));
    r.upgrade = { total, remaining: total };
  } else if (c.type === "fortify") {
    const r = g.regions[c.region];
    if (!r || r.owner !== actor) return fail("Opevnit můžeš jen vlastní provincii.");
    if (r.fortification || r.fort >= 20)
      return fail("Opevnění už probíhá nebo dosáhlo úrovně 20.");
    const price = fortifyCost(r);
    if (n.money < price) return fail("Nedostatek peněz na opevnění.");
    n.money -= price;
    const total = Math.round(25 / (1 + n.tech.industry * 0.1));
    r.fortification = { total, remaining: total };
  } else if (c.type === "tanks") {
    const reason = tankBlocker(g, actor);
    if (reason) return fail(reason);
    n.money -= 250;
    n.resources.iron -= 60;
    n.resources.coal -= 40;
    const total = Math.round(30 / (1 + n.tech.industry * 0.12));
    n.tankQueue = { remaining: total, total };
  } else if (c.type === "research") {
    if (!BRANCHES.includes(c.branch) || n.research || n.tech[c.branch] >= 3)
      return fail("Výzkum není dostupný.");
    const price = researchCost(n, c.branch);
    if (n.money < price) return fail("Nedostatek peněz.");
    n.money -= price;
    const total = 50 + n.tech[c.branch] * 25;
    n.research = { branch: c.branch, remaining: total, total };
  } else if (c.type === "retreat") {
    const o = g.operations.find(
      (o) => o.id === c.operation && o.owner === actor,
    );
    if (!o) return fail("Operace už skončila.");
    loseOperation(g, o, strength(o.army) * 0.2);
    g.operations = g.operations.filter((op) => op.id !== o.id);
    event(
      g,
      n.name + ": výprava ustoupila s 20 % ztrát. Zbytek je opět volný.",
    );
  } else return fail("Neznámý rozkaz.");
  return {
    ok: true,
    message:
      c.type === "armyTarget"
        ? "Cíl nastaven. Nábor nebo demobilizace probíhá postupně."
        : "Rozkaz přijat.",
  };
}
function loseOperation(g: Game, o: Operation, damage: number) {
  const s = strength(o.army);
  if (s <= 0) return;
  const f = Math.min(1, Math.max(0, damage / s)),
    inf = o.army.infantry * f,
    tanks = o.army.tanks * f,
    n = g.nations[o.owner];
  n.army.infantry = Math.max(0, n.army.infantry - inf);
  n.army.tanks = Math.max(0, n.army.tanks - tanks);
  o.army.infantry -= inf;
  o.army.tanks -= tanks;
  o.losses += inf + tanks * 6;
}
function loseReserve(g: Game, id: number, damage: number) {
  const free = available(g, id),
    s = strength(free);
  if (s <= 0) return;
  const f = Math.min(1, Math.max(0, damage / s));
  g.nations[id].army.infantry = Math.max(
    0,
    g.nations[id].army.infantry - free.infantry * f,
  );
  g.nations[id].army.tanks = Math.max(
    0,
    g.nations[id].army.tanks - free.tanks * f,
  );
}
export function defenseStrength(g: Game, r: Region) {
  const fortBonus = 1 + r.fort * 0.08;
  if (r.owner < 0) return (35 + r.level * 8) * defense(r) * fortBonus;
  const fronts = Math.max(
    1,
    g.operations.filter(
      (o) =>
        o.phase === "battle" &&
        g.regions[o.to].owner === r.owner &&
        o.owner !== r.owner,
    ).length,
  );
  return (
    (strength(available(g, r.owner)) / fronts) *
    defense(r) *
    fortBonus *
    (1 + g.nations[r.owner].tech.military * 0.12)
  );
}
function runAutoTrade(g: Game, id: number) {
  const n = g.nations[id], e = economy(g, id);
  for (const commodity of Object.keys(TRADE) as Commodity[]) {
    const demand = commodity === "grain" ? e.grainUse : commodity === "oil" ? e.oilUse : 0,
      buyBelow = Math.max(10, demand * 8),
      sellAbove = Math.max(100, demand * 35);
    if (n.autoTrade[commodity].buy && n.resources[commodity] < buyBelow)
      issue(g, id, { type: "trade", commodity, side: "buy" });
    else if (n.autoTrade[commodity].sell && n.resources[commodity] > sellAbove)
      issue(g, id, { type: "trade", commodity, side: "sell" });
  }
}
function loseFuelTanks(g: Game, id: number, amount: number) {
  const n = g.nations[id], loss = Math.min(n.army.tanks, amount);
  if (loss <= 0) return;
  const deployedTanks = g.operations
    .filter((o) => o.owner === id)
    .reduce((sum, o) => sum + o.army.tanks, 0);
  if (deployedTanks > 0)
    for (const o of g.operations.filter((o) => o.owner === id))
      o.army.tanks = Math.max(0, o.army.tanks - loss * (o.army.tanks / n.army.tanks));
  n.army.tanks -= loss;
}
export function tick(g: Game, bots = true): void {
  if (g.winner !== null) return;
  g.time++;
  for (const n of g.nations) {
    if (g.defeated.includes(n.id)) continue;
    runAutoTrade(g, n.id);
    const e = economy(g, n.id);
    n.resources.iron += e.production.iron;
    n.resources.coal += e.production.coal;
    const grainAvailable = n.resources.grain + e.production.grain,
      grainShortage = Math.max(0, e.grainUse - grainAvailable),
      oilAvailable = n.resources.oil + e.production.oil,
      oilShortage = Math.max(0, e.oilUse - oilAvailable);
    n.resources.grain = Math.max(0, grainAvailable - e.grainUse);
    n.resources.oil = Math.max(0, oilAvailable - e.oilUse);
    if (grainShortage > 0) {
      n.populationLoss = Math.min(
        potentialPopulation(g, n.id),
        n.populationLoss + grainShortage * 20,
      );
    } else n.populationLoss = Math.max(0, n.populationLoss - Math.max(1, e.population * 0.0002));
    if (oilShortage > 0 && e.oilUse > 0)
      loseFuelTanks(
        g,
        n.id,
        Math.max(0.02, n.army.tanks * 0.015) * (oilShortage / e.oilUse),
      );
    const insolvent = n.money + e.net < 0;
    n.money = Math.max(0, n.money + e.net);
    if (insolvent) {
      for (const o of g.operations.filter((o) => o.owner === n.id))
        loseOperation(g, o, strength(o.army) * 0.008);
      loseReserve(g, n.id, strength(available(g, n.id)) * 0.008);
    }
    if (n.research && --n.research.remaining <= 0) {
      n.tech[n.research.branch]++;
      event(g, n.name + ": dokončen výzkum.");
      n.research = null;
    }
    if (n.tankQueue) {
      n.tankQueue.remaining = Math.max(0, n.tankQueue.remaining - 1);
      if (
        n.tankQueue.remaining === 0 &&
        personnel(n.army) + 20 <= capacity(g, n.id)
      ) {
        n.army.tanks += 5;
        n.tankQueue = null;
      }
    }
    const desired = economy(g, n.id).desiredInfantry,
      free = available(g, n.id);
    if (n.army.infantry < desired) {
      const count = Math.min(18, desired - n.army.infantry, n.money / 3);
      n.army.infantry += count;
      n.money -= count * 3;
    } else if (n.army.infantry > desired)
      n.army.infantry -= Math.min(8, n.army.infantry - desired, free.infantry);
  }
  for (const r of g.regions)
    if (r.upgrade && --r.upgrade.remaining <= 0) {
      r.level++;
      r.upgrade = null;
      event(
        g,
        r.name +
          ": " +
          FACILITIES[r.facility].name +
          " na úrovni " +
          r.level +
          ".",
      );
    }
  for (const r of g.regions)
    if (r.fortification && --r.fortification.remaining <= 0) {
      r.fort++;
      r.fortification = null;
      event(g, r.name + ": opevnění dokončeno, úroveň " + r.fort + ".");
    }
  for (const o of g.operations)
    if (o.phase === "march") {
      o.progress = Math.min(
        1,
        o.progress + (1 + g.nations[o.owner].tech.logistics * 0.15) / 10,
      );
      if (o.progress >= 1) {
        o.phase = "battle";
        o.progress = 0;
      }
    }
  const done = new Set<number>();
  for (const o of g.operations) {
    if (o.phase !== "battle") continue;
    const r = g.regions[o.to];
    if (r.owner === o.owner) {
      done.add(o.id);
      continue;
    }
    const stance = STANCES[o.stance ?? "balanced"],
      supplied = isSupplied(g, o.from), oil = economy(g, o.owner).oilCovered,
      supply = supplied && oil ? 1 : supplied ? .82 : .68,
      attack =
        strength(o.army) * (1 + g.nations[o.owner].tech.military * 0.12) * stance.attack * supply,
      defend =
        r.owner < 0
          ? o.neutralResistance * defense(r) * (1 + r.fort * 0.08)
          : defenseStrength(g, r);
    loseOperation(g, o, defend * 0.016 * stance.losses);
    if (r.owner < 0)
      o.neutralResistance = Math.max(
        0,
        o.neutralResistance -
          (attack * 0.016) / (defense(r) * (1 + r.fort * 0.08)),
      );
    else loseReserve(g, r.owner, (attack * 0.016) / defense(r));
    const dominance = (attack - defend) / Math.max(20, attack + defend);
    o.progress = Math.max(0, Math.min(1, o.progress + dominance * 0.028 * stance.speed));
    if (o.army.infantry < 1 || strength(o.army) < 3) {
      loseOperation(g, o, strength(o.army));
      done.add(o.id);
      event(
        g,
        g.nations[o.owner].name + ": útok na " + r.name + " byl odražen.",
      );
    } else if (o.progress >= 1 || (r.owner < 0 && o.neutralResistance < 2)) {
      r.owner = o.owner;
      r.upgrade = null;
      r.fortification = null;
      r.fort = Math.max(0, r.fort - 2);
      done.add(o.id);
      event(
        g,
        g.nations[o.owner].name +
          " obsazuje " +
          r.name +
          ". Výprava se vrací do společné armády.",
      );
    }
  }
  g.operations = g.operations.filter((o) => !done.has(o.id));
  if (g.time % 75 === 0) {
    const living = g.nations.filter((n) => !g.defeated.includes(n.id));
    const n = living[Math.floor(rand(g) * living.length)];
    if (n) {
      const roll = rand(g);
      if (roll < .34) { n.resources.grain += 60; event(g, n.name + ": mimořádně dobrá sklizeň přidala 60 obilí."); }
      else if (roll < .67) { n.resources.oil += 35; event(g, n.name + ": průzkum odkryl nové zásoby ropy (+35)."); }
      else { const loss = Math.min(n.money, 140); n.money -= loss; event(g, n.name + ": stávka ochromila výběr daní (−" + Math.round(loss) + " ¤)."); }
    }
  }
  for (const n of g.nations)
    if (!g.defeated.includes(n.id) && owned(g, n.id).length === 0) {
      g.defeated.push(n.id);
      g.operations = g.operations.filter((o) => o.owner !== n.id);
      n.army = { infantry: 0, tanks: 0 };
      n.tankQueue = null;
      n.research = null;
      event(g, n.name + " byla poražena.");
    }
  const lands = playableRegions(g), owner = lands[0]?.owner ?? -1;
  if (owner >= 0 && lands.every((r) => r.owner === owner)) {
    g.winner = owner;
    g.operations = [];
    event(g, g.nations[owner].name + " ovládla mapu.");
    return;
  }
  if (bots && g.time % 5 === 0)
    for (const n of g.nations) if (n.id !== g.player) botTurn(g, n.id);
}
export function botTurn(g: Game, id: number) {
  if (g.winner !== null || g.defeated.includes(id)) return;
  const n = g.nations[id],
    rs = owned(g, id);
  if (!rs.length) return;
  const e = economy(g, id),
    neutralLeft = playableRegions(g).some((r) => r.owner < 0),
    aggression = Math.max(0, Math.min(100, g.botAggression ?? 60)),
    threat = g.operations.some(
      (o) => g.regions[o.to].owner === id && o.owner !== id,
    );
  n.autoTrade.grain.buy = true;
  n.autoTrade.oil.buy = true;
  n.autoTrade.iron.sell = true;
  n.autoTrade.coal.sell = true;
  issue(g, id, {
    type: "armyTarget",
    percent:
      e.net < 0 && n.money < 150
        ? Math.max(10, n.armyTarget - 5)
        : threat
          ? 65
          : n.personality === "aggressive"
            ? 50 + aggression * 0.25
            : 35 + aggression * 0.2,
  });
  const free = available(g, id),
    candidates: { from: number; to: Region; score: number }[] = [];
  for (const r of rs)
    for (const next of r.neighbors) {
      const t = g.regions[next];
      if (t.owner === id || g.operations.some((o) => o.to === next)) continue;
      const needed =
        (t.facility === "iron" && e.production.iron === 0) ||
        (t.facility === "coal" && e.production.coal === 0) ||
        (t.facility === "oil" && e.importSteady > 0);
      candidates.push({
        from: r.id,
        to: t,
        score:
          defenseStrength(g, t) / (needed ? 3 : t.facility === "city" ? 2 : 1),
      });
    }
  candidates.sort((a, b) => a.score - b.score);
  const t = candidates[0];
  const attackShare = Math.round(50 + aggression * 0.35),
    caution = neutralLeft
      ? n.personality === "cautious" ? 1.45 : 1.12
      : Math.max(0.82, 1.35 - aggression * 0.005);
  if (
    t &&
    !threat &&
    aggression > 0 &&
    g.operations.filter((o) => o.owner === id).length < (aggression >= 75 ? 2 : 1) &&
    free.infantry > 40 &&
    strength(free) * (attackShare / 100) > defenseStrength(g, t.to) * caution &&
    (neutralLeft || rand(g) < 0.2 + aggression * 0.008)
  )
    issue(g, id, { type: "deploy", from: t.from, to: t.to.id, percent: attackShare, stance: aggression >= 75 ? "assault" : n.personality === "cautious" ? "cautious" : "balanced" });
  if (!tankBlocker(g, id) && n.money > 400) issue(g, id, { type: "tanks" });
  if (n.money > 850) {
    const upgrades = rs
      .filter((r) => r.level < 20 && !r.upgrade)
      .sort(
        (a, b) =>
          (a.facility === "city" ? 0 : 1) - (b.facility === "city" ? 0 : 1) ||
          a.level - b.level,
      );
    const border = rs.filter((r) =>
      r.neighbors.some((next) => g.regions[next].owner !== id),
    );
    if (border.length && rand(g) < 0.25) {
      const r = border.sort((a, b) => a.fort - b.fort)[0];
      if (!r.fortification && r.fort < 20)
        issue(g, id, { type: "fortify", region: r.id });
    } else if (upgrades.length && rand(g) < 0.6)
      issue(g, id, { type: "upgrade", region: upgrades[0].id });
    else if (!n.research) {
      const options = BRANCHES.filter((b) => n.tech[b] < 3);
      if (options.length)
        issue(g, id, {
          type: "research",
          branch: options[Math.floor(rand(g) * options.length)],
        });
    }
  }
}
export const serialize = (g: Game) => JSON.stringify(g);
const nonneg = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x) && x >= 0;
const validArmy = (a: Units) => a && nonneg(a.infantry) && nonneg(a.tanks);
function migrate(old: any): Game | null {
  if (
    old.version !== 1 ||
    !Array.isArray(old.regions) ||
    old.regions.length !== 24 ||
    !Array.isArray(old.nations) ||
    old.nations.length !== 6 ||
    !Array.isArray(old.operations)
  )
    return null;
  const g = createGame(old.seed, old.player);
  g.time = old.time;
  g.nextId = old.nextId;
  g.winner = old.winner;
  g.defeated = old.defeated;
  g.log = old.log;
  for (let i = 0; i < 24; i++) {
    const r = old.regions[i];
    if (r?.id !== i || !validArmy(r.army)) return null;
    g.regions[i].owner = r.owner;
    g.regions[i].level = Math.max(1, Math.min(5, Math.floor(r.industry || 1)));
  }
  for (let i = 0; i < 6; i++) {
    const oldN = old.nations[i],
      n = g.nations[i];
    if (oldN?.id !== i) return null;
    n.money = oldN.money;
    n.tech = oldN.tech;
    n.research = oldN.research;
    n.army = old.regions
      .filter((r: any) => r.owner === i)
      .reduce(
        (a: Units, r: any) => ({
          infantry: a.infantry + r.army.infantry,
          tanks: a.tanks + r.army.tanks,
        }),
        { infantry: 0, tanks: 0 },
      );
    for (const o of old.operations.filter((o: any) => o.owner === i)) {
      if (!validArmy(o.army)) return null;
      n.army.infantry += o.army.infantry;
      n.army.tanks += o.army.tanks;
    }
    n.armyTarget = Math.min(
      100,
      Math.ceil((personnel(n.army) / Math.max(1, capacity(g, i))) * 100),
    );
    for (const r of old.regions.filter((r: any) => r.owner === i && r.queue))
      n.money +=
        r.queue.kind === "infantry"
          ? 100
          : r.queue.kind === "tanks"
            ? 180
            : r.queue.kind === "industry"
              ? 200 + r.industry * 150
              : 160 + r.fort * 140;
  }
  event(
    g,
    "Partie převedena: posádky i výpravy sloučeny do národní armády; rozpracované projekty proplaceny.",
  );
  return g;
}
function migrateV2(old: any): Game | null {
  if (!Array.isArray(old.regions) || old.regions.length !== 24 || !Array.isArray(old.nations))
    return null;
  const g = createGame(old.seed, old.player);
  g.time = old.time;
  g.botAggression = old.botAggression ?? 60;
  g.log = Array.isArray(old.log) ? old.log : g.log;
  g.nextId = 1;
  for (let i = 0; i < 24; i++) {
    g.regions[i].owner = old.regions[i].owner;
    g.regions[i].level = old.regions[i].level;
  }
  for (let i = 0; i < 6; i++) {
    const source = old.nations[i], target = g.nations[i];
    if (!source || !validArmy(source.army)) return null;
    target.money = source.money;
    target.army = source.army;
    target.armyTarget = source.armyTarget;
    target.resources = { ...source.resources, grain: source.resources.grain ?? 40 };
    target.populationLoss = source.populationLoss ?? 0;
    target.autoTrade = source.autoTrade ?? target.autoTrade;
    target.tech = source.tech;
    target.research = source.research;
    target.tankQueue = source.tankQueue;
  }
  event(g, "Mapa rozšířena na 48 provincií. Staré operace byly ukončeny a přibylo obilí.");
  return g;
}
export function restore(raw: string): Game | null {
  try {
    const parsed = JSON.parse(raw),
      g: Game = parsed.version === 1 ? migrate(parsed) : parsed.version === 2 ? migrateV2(parsed) : parsed;
    if (!g || ![3, 4].includes(g.version as number)) return null;
    g.version = 4;
    // Version 0.6 saves had 35 provinces; preserve them and add the new south-east frontier.
    if (Array.isArray(g.regions) && g.regions.length === 35) {
      const expanded = createGame(g.seed, g.player);
      g.regions.push(...expanded.regions.slice(35));
    }
    if (g.botAggression === undefined) g.botAggression = 60;
    if (!g.truces || typeof g.truces !== "object") g.truces = {};
    const id = (x: number) => Number.isInteger(x) && x >= 0 && x < 6,
      regionId = (x: number) => Number.isInteger(x) && x >= 0 && x < names.length;
    if (
      !id(g.player) ||
      !Number.isInteger(g.time) ||
      g.time < 0 ||
      !Number.isInteger(g.seed) ||
      !Number.isInteger(g.nextId) ||
      g.nextId < 1 ||
      !Array.isArray(g.regions) ||
      g.regions.length !== names.length ||
      !Array.isArray(g.nations) ||
      g.nations.length !== 6 ||
      !Array.isArray(g.operations) ||
      g.operations.length > names.length ||
      !Array.isArray(g.defeated) ||
      !g.defeated.every(id) ||
      !(g.winner === null || id(g.winner)) ||
      !Array.isArray(g.log) ||
      !nonneg(g.botAggression) ||
      g.botAggression > 100 ||
      !g.log.every((l) => l && nonneg(l.time) && typeof l.text === "string")
    )
      return null;
    const base = createGame(g.seed, g.player),
      queue = (q: Queue | null) =>
        q === null ||
        (q &&
          nonneg(q.remaining) &&
          nonneg(q.total) &&
          q.total > 0 &&
          q.remaining <= q.total);
    for (let i = 0; i < names.length; i++) {
      const r = g.regions[i];
      if (r && r.fort === undefined) r.fort = 0;
      if (r && r.fortification === undefined) r.fortification = null;
      if (r && r.specialization === undefined) r.specialization = "none";
      if (
        !r ||
        r.id !== i ||
        !(r.owner === -1 || id(r.owner)) ||
        !Number.isInteger(r.level) ||
        r.level < 1 ||
        r.level > 20 ||
        !Number.isInteger(r.fort) ||
        r.fort < 0 ||
        r.fort > 20 ||
        !Object.hasOwn(SPECIALIZATIONS, r.specialization) ||
        !queue(r.upgrade) ||
        !queue(r.fortification)
      )
        return null;
      Object.assign(r, {
        name: base.regions[i].name,
        facility: base.regions[i].facility,
        geography: base.regions[i].geography,
        terrain: base.regions[i].terrain,
        neighbors: base.regions[i].neighbors,
        x: base.regions[i].x,
        y: base.regions[i].y,
        polygon: base.regions[i].polygon,
      });
      if (r.geography !== "land") {
        r.owner = -1;
        r.upgrade = null;
        r.fortification = null;
        r.fort = 0;
      }
    }
    for (let i = 0; i < 6; i++) {
      const n = g.nations[i];
      if (n && n.populationLoss === undefined) n.populationLoss = 0;
      if (n && n.autoTrade === undefined) n.autoTrade = base.nations[i].autoTrade;
      if (
        !n ||
        n.id !== i ||
        !nonneg(n.money) ||
        !validArmy(n.army) ||
        !nonneg(n.populationLoss) ||
        !nonneg(n.armyTarget) ||
        n.armyTarget > 100 ||
        !n.resources ||
        !["iron", "coal", "oil", "grain"].every((k) =>
          nonneg(n.resources[k as "iron"]),
        ) ||
        !n.autoTrade ||
        !(Object.keys(TRADE) as Commodity[]).every(
          (k) =>
            n.autoTrade[k] &&
            typeof n.autoTrade[k].buy === "boolean" &&
            typeof n.autoTrade[k].sell === "boolean",
        ) ||
        !n.tech ||
        !BRANCHES.every(
          (b) =>
            Number.isInteger(n.tech[b]) && n.tech[b] >= 0 && n.tech[b] <= 3,
        ) ||
        !queue(n.tankQueue) ||
        !queue(n.research) ||
        (n.research &&
          (!BRANCHES.includes(n.research.branch) ||
            n.tech[n.research.branch] >= 3))
      )
        return null;
      Object.assign(n, {
        name: FACTIONS[i].name,
        color: FACTIONS[i].color,
        personality: FACTIONS[i].personality,
        capital: base.nations[i].capital,
      });
    }
    g.operations = g.operations.filter((o) =>
      g.regions[o.from]?.neighbors.includes(o.to),
    );
    if (
      new Set(g.operations.map((o) => o.to)).size !== g.operations.length ||
      new Set(g.operations.map((o) => o.id)).size !== g.operations.length
    )
      return null;
    for (const o of g.operations)
      if (o && o.stance === undefined) o.stance = "balanced";
    for (const o of g.operations)
      if (
        !o ||
        !id(o.owner) ||
        !regionId(o.from) ||
        !regionId(o.to) ||
        !g.regions[o.from].neighbors.includes(o.to) ||
        !Number.isInteger(o.id) ||
        o.id < 1 ||
        o.id >= g.nextId ||
        !validArmy(o.army) ||
        !["march", "battle"].includes(o.phase) ||
        !nonneg(o.progress) ||
        o.progress > 1 ||
        !nonneg(o.initial) ||
        !nonneg(o.losses) ||
        !nonneg(o.neutralResistance)
        || !Object.hasOwn(STANCES, o.stance)
      )
        return null;
    for (const n of g.nations) {
      const d = deployed(g, n.id);
      if (d.infantry > n.army.infantry + 1e-6 || d.tanks > n.army.tanks + 1e-6)
        return null;
    }
    g.log = g.log.slice(0, 60);
    return g;
  } catch {
    return null;
  }
}
