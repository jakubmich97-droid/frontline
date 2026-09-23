import "./style.css";
import {
  createGame,
  issue,
  tick,
  owned,
  playableRegions,
  economy,
  strength,
  available,
  deployed,
  personnel,
  population,
  defense,
  defenseStrength,
  upgradeCost,
  fortifyCost,
  researchCost,
  serialize,
  restore,
  FACTIONS,
  FACILITIES,
  BRANCHES,
  TECH_NAMES,
  TRADE,
  TRADE_LOT,
  MAP_COLS,
  tankBlocker,
  type Game,
  type Command,
  type Branch,
  type Commodity,
} from "./engine.ts";
const app = document.querySelector<HTMLDivElement>("#app")!;
const KEY = "frontline.save.v3";
let game: Game = createGame(),
  selected = 17,
  target: number | null = null,
  percent = 60,
  paused = true,
  speed = 1,
  tab = "region",
  notice = "Nastav velikost národní armády a vyber sousední území.",
  saveStatus = "Zatím neuloženo",
  modal = "",
  dragging = false,
  armyDraft: number | null = null,
  mapZoom = 1,
  mapPanX = 0,
  mapPanY = 0;
let accumulator = 0,
  last = performance.now(),
  renderElapsed = 0;
const num = (v: number) => Math.floor(v).toLocaleString("cs-CZ"),
  decimal = (v: number) => v.toFixed(1),
  clock = (v: number) =>
    Math.floor(v / 60)
      .toString()
      .padStart(2, "0") +
    ":" +
    (v % 60).toString().padStart(2, "0");
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const button = (text: string, action: string, disabled = false, klass = "") =>
  `<button data-action="${action}" ${disabled ? "disabled" : ""} class="${klass}">${text}</button>`;
const sprite = (kind: string, klass = "sprite-icon") =>
  `<span class="${klass} sprite-${kind}" aria-hidden="true"></span>`;
function save() {
  try {
    localStorage.setItem(KEY, serialize(game));
    saveStatus = "Uloženo " + clock(game.time);
  } catch {
    saveStatus = "Ukládání není dostupné";
    notice = "Prohlížeč nedovolil uložit partii.";
  }
}
try {
  const current = localStorage.getItem(KEY),
    legacy = current ? null : localStorage.getItem("frontline.save.v2") || localStorage.getItem("frontline.save.v1"),
    raw = current || legacy;
  if (raw) {
    const restored = restore(raw);
    if (restored) {
      game = restored;
      selected =
        owned(game, game.player)[0]?.id ?? game.nations[game.player].capital;
      notice = legacy
        ? "Stará partie převedena. Posádky a výpravy jsou nyní jedna armáda; staré uložení zůstává jako záloha."
        : "Uložená partie načtena. Pokračuj tlačítkem Spustit.";
      saveStatus = "Načteno " + clock(game.time);
    } else
      notice =
        "Uložení nelze načíst. Zahájena nová partie; původní data zatím zůstávají beze změny.";
  }
} catch {
  saveStatus = "Ukládání není dostupné";
}
function send(c: Command) {
  const result = issue(game, game.player, c);
  notice = result.message;
  if (result.ok) save();
  render();
}
function mapMarkup() {
  const gradients = game.operations.filter((o) => o.phase === "battle").map((o) => {
    const from = game.regions[o.from], to = game.regions[o.to],
      attacker = game.nations[o.owner].color,
      defender = to.owner < 0 ? "#64757b" : game.nations[to.owner].color,
      horizontal = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y),
      x1 = horizontal && from.x > to.x ? 1 : 0,
      x2 = horizontal ? 1 - x1 : 0,
      y1 = !horizontal && from.y > to.y ? 1 : 0,
      y2 = horizontal ? 0 : 1 - y1,
      edge = Math.round(o.progress * 100);
    return `<linearGradient id="front-${o.id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="${edge}%" stop-color="${attacker}"/><stop offset="${edge}%" stop-color="${defender}"/></linearGradient>`;
  }).join("");
  return `<svg class="world-map" viewBox="0 0 1000 720" role="group" aria-label="Strategická mapa, ${playableRegions(game).length} obyvatelných provincií"><defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#24404e" stroke-width=".5"/></pattern>${gradients}</defs><rect width="1000" height="720" fill="url(#grid)"/><text x="28" y="27" class="map-note">JANTAROVÁ EVROPA / KOMODITNÍ MAPA</text><text x="970" y="27" class="map-note">N ↑</text><text x="118" y="360" text-anchor="middle" class="sea-label">ZÁPADNÍ MOŘE</text><text x="500" y="700" text-anchor="middle" class="sea-label">JIŽNÍ MOŘE</text>
${game.regions
  .map((r) => {
    if (r.geography === "sea") return "";
    if (r.geography !== "land") {
      const kind = r.geography === "mountain" ? "mountain" : "lake";
      return `<g class="obstacle-province ${kind}" aria-label="${r.name}, nepřekonatelná oblast"><polygon points="${r.polygon}"/><foreignObject x="${r.x - 34}" y="${r.y - 40}" width="68" height="68"><div xmlns="http://www.w3.org/1999/xhtml" class="terrain-sprite sprite-${kind}"></div></foreignObject><text x="${r.x}" y="${r.y + 38}" class="obstacle-label">${r.name.toUpperCase()}</text><text x="${r.x}" y="${r.y + 51}" class="obstacle-kind">NEPŘEKONATELNÉ</text></g>`;
    }
    const color = r.owner < 0 ? "#64757b" : game.nations[r.owner].color,
      f = FACILITIES[r.facility], battle = game.operations.find((o) => o.to === r.id && o.phase === "battle"),
      fill = battle ? `url(#front-${battle.id})` : color;
    return `<g class="region ${selected === r.id ? "selected" : ""} ${target === r.id ? "targeted" : ""} ${battle ? "contested" : ""}" role="button" tabindex="0" data-region="${r.id}" aria-label="${r.name}, ${f.name}, úroveň ${r.level}, ${r.owner < 0 ? "neutrální posádka " + num(defenseStrength(game, r)) : game.nations[r.owner].name}" aria-pressed="${selected === r.id}"><polygon points="${r.polygon}" fill="${fill}" fill-opacity="${battle ? ".58" : r.owner === game.player ? ".44" : r.owner < 0 ? ".11" : ".38"}" stroke="${color}" stroke-opacity="${r.owner < 0 ? ".45" : ".13"}"/><foreignObject x="${r.x - 14}" y="${r.y - 43}" width="28" height="28" class="facility-symbol"><div xmlns="http://www.w3.org/1999/xhtml" class="map-sprite sprite-${r.facility}"></div></foreignObject><text x="${r.x}" y="${r.y + 1}" class="region-name">${r.name}</text><text x="${r.x}" y="${r.y + 18}" class="facility-label" fill="${color}">${f.short} · ${r.level}</text>${r.owner < 0 && !battle ? `<g class="neutral-garrison"><rect x="${r.x - 27}" y="${r.y + 25}" width="54" height="18" rx="9"/><text x="${r.x}" y="${r.y + 38}">⬟ ${num(defenseStrength(game, r))}</text></g>` : r.fort > 0 ? `<text x="${r.x}" y="${r.y + 36}" class="fort-label">⬟ ${r.fort}</text>` : ""}${r.upgrade ? `<text x="${r.x}" y="${r.y + 52}" class="facility-label">↑ ${r.upgrade.remaining} s</text>` : ""}</g>`;
  })
  .join("")}
${game.regions.filter((r) => r.geography === "land").map((r) => {
  const pts = r.polygon.split(" ").map((p) => p.split(",").map(Number)),
    edges = [[0, 1, r.id - MAP_COLS], [1, 2, r.id + 1], [2, 3, r.id + MAP_COLS], [3, 0, r.id - 1]];
  return edges.map(([a, b, neighbor]) => {
    const same = r.neighbors.includes(neighbor) && game.regions[neighbor]?.owner === r.owner;
    if (same) return "";
    const color = r.owner < 0 ? "#667982" : game.nations[r.owner].color;
    return `<path class="state-border" d="M${pts[a][0]} ${pts[a][1]}L${pts[b][0]} ${pts[b][1]}" stroke="${color}"/>`;
  }).join("");
}).join("")}
${game.operations
  .map((o) => {
    const a = game.regions[o.from],
      b = game.regions[o.to],
      c = game.nations[o.owner].color,
      p = o.phase === "march" ? o.progress : 0.85;
    const x = o.phase === "march" ? a.x + (b.x - a.x) * p : (a.x + b.x) / 2,
      y = o.phase === "march" ? a.y + (b.y - a.y) * p : (a.y + b.y) / 2,
      dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1,
      nx = dx / len, ny = dy / len, tx = -ny, ty = nx,
      defender = b.owner < 0 ? "#93a2a5" : game.nations[b.owner].color,
      line = (color: string, side: number) => [-18, -12, -6, 0, 6, 12, 18].map((d, i) => `<circle cx="${x + tx * d + nx * side}" cy="${y + ty * d + ny * side}" r="${i % 2 ? 3.1 : 3.7}" fill="${color}"/>`).join(""),
      dots = o.phase === "battle" ? `<g class="front-row attacker">${line(c, -7)}</g><g class="front-row defender">${line(defender, 7)}</g>` : line(c, 0);
    return `<g class="operation troop-front ${o.phase}" pointer-events="none">${dots}${o.phase === "battle" ? `<g class="clash" transform="translate(${x} ${y})"><circle r="15"/><path d="M-11-11L11 11M11-11L-11 11M0-17V17M-17 0H17"/></g>` : ""}</g>`;
  })
  .join("")}
${game.nations.map((nation) => {
  const rs = owned(game, nation.id);
  if (!rs.length) return "";
  const anchor = rs.find((r) => r.id === nation.capital) || rs[Math.floor(rs.length / 2)],
    a = available(game, nation.id);
  return `<g class="map-army" pointer-events="none"><rect x="${anchor.x - 42}" y="${anchor.y + 30}" width="84" height="24" rx="12" fill="#071017" stroke="${nation.color}"/><text x="${anchor.x}" y="${anchor.y + 46}" fill="${nation.color}">⚔ ${num(a.infantry)}${a.tanks >= 1 ? `  ▰ ${num(a.tanks)}` : ""}</text></g>`;
}).join("")}</svg>`;
}
function armyPanel() {
  const n = game.nations[game.player],
    e = economy(game, game.player),
    free = available(game, game.player),
    used = deployed(game, game.player),
    value = armyDraft ?? n.armyTarget;
  return `<section class="national-army"><div class="army-title"><div><span class="eyebrow">NÁRODNÍ ARMÁDA</span><h2><strong>${num(n.army.infantry)}</strong> pěchoty · <strong>${num(n.army.tanks)}</strong> tanků</h2></div><div class="army-total">Volní <strong>${num(free.infantry)}</strong> · nasazení <strong>${num(used.infantry)}</strong></div></div>
<div class="army-grid"><div><label class="range-label" for="army-size">Cílová velikost <strong id="army-target-label">${value} % · ${num(e.target)} osob</strong></label><input type="range" id="army-size" aria-label="Cílová velikost armády" min="0" max="100" step="5" value="${value}">
<div class="mobilization"><span>Limit ${num(e.capacity)}</span><span>${n.army.infantry + 1 < e.desiredInfantry ? "Probíhá nábor" : n.army.infantry > e.desiredInfantry + 1 ? "Demobilizace" : "Cíl dosažen"}</span></div></div>
<div class="army-budget"><div><span>Provoz nyní</span><b>${decimal(e.upkeep)} ¤/s</b></div><div><span>Provoz při cíli</span><b id="planned-cost">${decimal(e.planned.steadyCost)} ¤/s</b></div><label class="range-label compact" for="bot-aggression">Agresivita botů <strong id="bot-aggression-label">${game.botAggression} %</strong></label><input type="range" id="bot-aggression" aria-label="Agresivita botů" min="0" max="100" step="10" value="${game.botAggression}"></div></div></section>`;
}
function facilityYield(r: Game["regions"][number]) {
  if (r.facility === "city")
    return num(population(r)) + " obyvatel · " + r.level * 7 + " ¤/s základ";
  if (r.facility === "port")
    return r.level * 6 + " ¤/s základ · levnější dovoz";
  return (
    decimal(r.level * (r.facility === "grain" ? 2.5 : r.facility === "oil" ? 1.2 : 0.8)) + " jednotek/s základ"
  );
}
function tradePanel() {
  const n = game.nations[game.player], e = economy(game, game.player),
    discount = Math.min(0.35, e.production.port * 0.08);
  return `<div class="panel-heading"><span class="eyebrow">NÁRODNÍ TRH</span><h2>Obchod</h2><p class="muted">Nakupuj chybějící suroviny nebo prodávej přebytky po ${TRADE_LOT} jednotkách. Přístavy zlevňují nákup.</p></div><div class="market-grid">${(Object.keys(TRADE) as Commodity[]).map((k) => {
    const item = TRADE[k], buy = TRADE_LOT * item.price * (1 - discount), sell = TRADE_LOT * item.price * .7;
    const use = k === "grain" ? e.grainUse : k === "oil" ? e.oilUse : 0,
      supply = k === "grain" ? e.foodCovered : k === "oil" ? e.oilCovered : true;
    return `<section class="market-card"><div class="market-head">${sprite(k, "sprite-icon market-icon")}<div><h3>${item.name}</h3><b>${num(n.resources[k])}</b></div></div><small>${use > 0 ? `Produkce ${decimal(e.production[k])}/s · spotřeba ${decimal(use)}/s · ${supply ? "zásobeno" : "nedostatek"}` : `Těžba ${decimal(e.production[k])}/s`}</small><div class="market-actions">${button(`Koupit · ${num(buy)} ¤`, `trade:buy:${k}`, n.money < buy)}${button(`Prodat · +${num(sell)} ¤`, `trade:sell:${k}`, n.resources[k] < TRADE_LOT)}</div><div class="auto-actions">${button(`Auto nákup ${n.autoTrade[k].buy ? "ZAP" : "VYP"}`, `auto:buy:${k}`, false, n.autoTrade[k].buy ? "active" : "")}${button(`Auto prodej ${n.autoTrade[k].sell ? "ZAP" : "VYP"}`, `auto:sell:${k}`, false, n.autoTrade[k].sell ? "active" : "")}</div></section>`;
  }).join("")}</div><p class="muted small">Auto nákup doplňuje nízkou zásobu po 25 jednotkách. Auto prodej odprodává zásoby nad 100 jednotek (u potravin a paliva drží větší rezervu). Bez obilí ubývá populace, bez ropy tanky.</p><p class="muted small">Prodejní cena je 70 % základní ceny. Nákupní sleva z přístavů: ${Math.round(discount * 100)} %.</p>`;
}
function regionPanel() {
  const r = game.regions[target ?? selected],
    mine = r.owner === game.player,
    f = FACILITIES[r.facility],
    n = game.nations[game.player],
    free = available(game, game.player);
  const adjacent =
      game.regions[selected].owner === game.player &&
      game.regions[selected].neighbors.includes(r.id),
    busy = game.operations.some((o) => o.to === r.id);
  return `<div class="panel-heading"><span class="eyebrow">${mine ? "VLASTNÍ ÚZEMÍ" : r.owner < 0 ? "NEUTRÁLNÍ ÚZEMÍ" : game.nations[r.owner].name}</span><h2>${r.name}</h2><span class="tag">${r.terrain === "plain" ? "Rovina" : r.terrain === "forest" ? "Les" : "Hory"} · obrana ×${defense(r).toFixed(2)}</span></div>
<div class="facility-card">${sprite(r.facility, "facility-icon sprite-icon")}<div><h3>${f.name}</h3><span class="tag">Úroveň ${r.level} / 20</span></div></div><p class="muted">${f.description}</p><p class="yield">${facilityYield(r)}</p>
${r.upgrade ? `<div class="project">Vylepšení · ${r.upgrade.remaining} s<progress max="${r.upgrade.total}" value="${r.upgrade.total - r.upgrade.remaining}"></progress></div>` : ""}
${
  mine
    ? button(
        r.level >= 20
          ? "Maximální úroveň"
          : `Vylepšit · ${num(upgradeCost(r))} ¤`,
        "upgrade",
        !!r.upgrade || r.level >= 20 || n.money < upgradeCost(r),
        "wide",
      ) + `<div class="fort-card"><div><span>⬟ Opevnění</span><b>${r.fort} / 20</b></div><small>Obrana provincie +${r.fort * 8} %</small>${r.fortification ? `<div class="project">Stavba · ${r.fortification.remaining} s<progress max="${r.fortification.total}" value="${r.fortification.total - r.fortification.remaining}"></progress></div>` : button(r.fort >= 20 ? "Maximální opevnění" : `Opevnit · ${num(fortifyCost(r))} ¤`, "fortify", r.fort >= 20 || n.money < fortifyCost(r), "wide")}</div>`
    : `<div class="section-title">DOBYTÍ ÚZEMÍ</div><p class="muted small">${r.owner < 0 ? "Neutrální území má místní odpor." : "Brání ho volná část společné armády soupeře."} Aktuální obranná síla: ${num(defenseStrength(game, r))}.</p><p class="muted">${adjacent ? "Útok ze směru " + game.regions[selected].name : "Území zatím nesousedí s tvým státem."}</p>
<label class="range-label" for="attack-size">Velikost útoku <strong id="attack-size-label">${percent} %</strong></label><input type="range" id="attack-size" aria-label="Velikost útoku" min="10" max="100" step="5" value="${percent}"><p class="muted small" id="attack-units">Vyčlenit ${Math.floor((free.infantry * percent) / 100)} pěšáků a ${Math.floor((free.tanks * percent) / 100)} tanků ze společné armády.</p>${button(busy ? "Operace již probíhá" : "Zahájit útok →", "deploy", !adjacent || busy || (free.infantry * percent) / 100 < 5, "primary wide")}`
}
<p class="muted small">Provincie nemají vlastní posádky. Po dobytí se přeživší jednotky automaticky uvolní pro další rozkazy.</p>
<div class="section-title">VÝROBA TANKŮ <span>NÁRODNÍ</span></div>
<p class="muted small">5 tanků = 60 železa + 40 uhlí + 250 ¤. Osádky potřebují 20 míst v populačním limitu.</p>
${n.tankQueue ? `<div class="project">${n.tankQueue.remaining ? "Dokončení za " + n.tankQueue.remaining + " s" : "Čeká na volná místa pro osádky"}<progress max="${n.tankQueue.total}" value="${n.tankQueue.total - n.tankQueue.remaining}"></progress></div>` : ""}
${button("Vyrobit 5 tanků", "tanks", tankBlocker(game, game.player) !== null, "wide")}<p class="muted small">${tankBlocker(game, game.player) || "Suroviny jsou připravené."}</p>`;
}
function researchPanel() {
  const n = game.nations[game.player];
  return `<h2>Technologie</h2>${BRANCHES.map((b) => `<section class="tech-card"><div class="section-title">${{ military: "ARMÁDA", industry: "EKONOMIKA", logistics: "LOGISTIKA" }[b]} <span>${n.tech[b]} / 3</span></div><h3>${TECH_NAMES[b][n.tech[b]] || "Dokončeno"}</h3><p class="muted">${{ military: "+12 % bojové síly za úroveň.", industry: "+16 % příjmů a těžby, rychlejší výroba.", logistics: "−10 % spotřeby ropy a rychlejší přesuny za úroveň." }[b]}</p>${n.research?.branch === b ? `<p class="muted">Dokončení za ${n.research.remaining} s</p><progress max="${n.research.total}" value="${n.research.total - n.research.remaining}"></progress>` : button(n.tech[b] >= 3 ? "Dokončeno" : "Vyzkoumat · " + num(researchCost(n, b)) + " ¤", "research:" + b, !!n.research || n.tech[b] >= 3 || n.money < researchCost(n, b), "wide")}</section>`).join("")}`;
}
function operationsPanel() {
  const ops = game.operations.filter(
    (o) => o.owner === game.player || game.regions[o.to].owner === game.player,
  ), free = available(game, game.player);
  return `<h2>Operace · ${ops.length}</h2><p class="muted">Postup bitvy ukazuje přímo barevné přelévání napadené provincie.</p>${ops.some((o) => o.owner === game.player) ? `<label class="range-label" for="reinforce-size">Velikost posil <strong id="reinforce-size-label">${percent} %</strong></label><input type="range" id="reinforce-size" aria-label="Velikost posil" min="10" max="100" step="5" value="${percent}">` : ""}${ops.map((o) => `<section class="operation-card"><span class="tag">${o.owner === game.player ? "Vlastní výprava" : "Nepřátelský útok"} · ${o.phase === "march" ? "Přesun" : "Bitva"}</span><h3>${game.regions[o.to].name}</h3><p>${num(o.army.infantry)} pěchoty · ${num(o.army.tanks)} tanků</p><p class="muted">Dominance útoku ${Math.floor(o.progress * 100)} % · ztráty síly ${num(o.losses)}</p>${o.owner === game.player ? button(`Přidat posily · ${percent} % volných`, "reinforce:" + o.id, free.infantry < 1 && free.tanks < 1, "wide") + button("Ustoupit (−20 % jednotek)", "retreat:" + o.id, false, "wide") : ""}</section>`).join("") || '<p class="muted">Žádné probíhající operace u tvého státu.</p>'}`;
}
function dialog() {
  if (modal === "new")
    return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">Nová kampaň</h2><p class="muted">Nahradí aktuální partii. Původní záloha verze 0.1 zůstane zachovaná.</p><div class="faction-choices">${FACTIONS.map((n, id) => button(n.name, "new:" + id, false, "faction-choice")).join("")}</div>${button("Zpět do hry", "close", false, "wide")}</section></div>`;
  if (modal === "help")
    return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">Zásobování a pohyblivá fronta</h2><ol><li>Automatický nákup a prodej se zapíná samostatně u každé komodity v záložce Obchod. Bez zapnutí se nic samo nedokupuje.</li><li>Při nedostatku obilí umírá obyvatelstvo a klesá populační limit armády. Po obnovení zásob se populace pomalu zotavuje.</li><li>Při nedostatku ropy postupně ubývají tanky, včetně tanků nasazených v operacích.</li><li>Vojáci jsou při přesunu a boji znázorněni tečkami. Boj probíhá na hranici s pulzujícím efektem.</li><li>Barva napadené provincie se přelévá od strany útočníka podle jeho dominance.</li><li>Do vlastní probíhající operace lze kdykoliv poslat další část volné armády.</li></ol><p class="muted">Mezerník: pauza · 1/2/4: rychlost. Ukládání je místní, každých 15 herních sekund.</p>${button("Rozumím", "close", false, "primary wide")}</section></div>`;
  return "";
}
function render() {
  const active = document.activeElement as HTMLElement | null,
    focusId = active?.id,
    action = active?.dataset.action,
    reg = active?.dataset.region;
  const n = game.nations[game.player],
    e = economy(game, game.player),
    ended = game.winner !== null || game.defeated.includes(game.player);
  if (ended) paused = true;
  app.innerHTML = `<header><a class="brand" href="./" aria-label="Frontline"><span class="brand-mark">F</span>FRONTLINE<span class="version">ŽIVÁ MAPA · 0.7</span></a><div class="header-actions"><span class="save-status">${saveStatus}</span>${button("Uložit", "save")}${button("?", "help", false, "help-button")}${button("Nová hra", "new")}</div></header>
<div class="resource-bar"><div class="your-nation"><i style="background:${n.color}"></i><div><span class="eyebrow">TVÁ FRAKCE</span><strong>${n.name}</strong></div></div><div class="resource"><span>POKLADNA</span><strong>${num(n.money)} ¤</strong></div><div class="resource"><span>BILANCE / S*</span><strong class="${e.net >= 0 ? "positive" : "negative"}">${e.net >= 0 ? "+" : ""}${decimal(e.net)} ¤</strong></div><div class="resource"><span>POPULACE</span><strong>${num(e.population)}</strong></div><div class="resource"><span>ÚZEMÍ</span><strong>${owned(game, game.player).length}<small> / ${playableRegions(game).length}</small></strong></div><div class="time-controls"><span class="game-clock">${clock(game.time)}</span>${button(paused ? "▶ Spustit" : "Ⅱ Pauza", "pause", ended, "play-button")}${[1, 2, 4].map((s) => button(s + "×", "speed:" + s, false, speed === s ? "active" : "")).join("")}</div></div>
<div class="materials-bar">${(["iron", "coal", "oil", "grain"] as Commodity[]).map((k) => `<div class="commodity commodity-${k}">${sprite(k, "sprite-icon commodity-icon")}<span>${TRADE[k].name.toUpperCase()}</span><strong>${num(n.resources[k])}</strong><small>${k === "grain" ? `+${decimal(e.production.grain)} / −${decimal(e.grainUse)}/s` : k === "oil" ? `+${decimal(e.production.oil)} / −${decimal(e.oilUse)}/s` : `těžba +${decimal(e.production[k])}/s`}</small></div>`).join("")}<div class="fuel-summary"><span>STAV ZÁSOBOVÁNÍ</span><strong class="${e.foodCovered && e.oilCovered ? "positive" : "warning"}">${!e.foodCovered ? "CHYBÍ OBILÍ" : !e.oilCovered ? "CHYBÍ ROPA" : "ZÁSOBENO"}</strong><small>${n.populationLoss > 0 ? `Ztráta populace ${num(n.populationLoss)}` : "Bez ztrát ze zásobování"}</small></div><p>*Bilance před jednorázovým náborem a výstavbou.</p></div>
<main><section class="map-column">${armyPanel()}<div class="map-heading"><div><span class="eyebrow">OPERAČNÍ MAPA</span><h1>Jantarové pobřeží</h1></div><span class="live-state ${paused ? "is-paused" : ""}">${ended ? "KONEC PARTIE" : paused ? "POZASTAVENO" : "SIMULACE BĚŽÍ"}</span></div>
<div class="map-surface ${paused ? "paused" : ""}"><div class="map-canvas" style="transform:translate(${mapPanX}px,${mapPanY}px) scale(${mapZoom})">${mapMarkup()}</div><div class="zoom-hint">Kolečko: přiblížení · ${Math.round(mapZoom * 100)} %</div><div class="map-score"><b>STÁTY</b>${game.nations.filter((f) => owned(game, f.id).length).map((f) => `<span><i style="background:${f.color}"></i>${owned(game, f.id).length} úz. · ⚔ ${num(f.army.infantry)}</span>`).join("")}</div>${ended ? `<div class="result-banner"><h2>${game.winner === game.player ? "Vítězství" : "Tvá frakce byla poražena"}</h2>${button("Nová kampaň", "new", false, "primary")}</div>` : ""}</div><div class="map-footer"><span>Obrázkové ikony: město · doly · ropa · obilí · přístav</span><span>Hory a jezera nelze překročit · kolečko přibližuje mapu</span></div><div class="notice" role="status">${esc(notice)}</div>
<div class="bottom-grid"><section><div class="section-title">ROVNOVÁHA SIL <span>ÚZEMÍ / ARMÁDA</span></div>${game.nations.map((f) => `<div class="faction-row"><i style="background:${f.color}"></i><span>${f.name}</span><b>${owned(game, f.id).length}</b><small>${num(f.army.infantry)} / ${num(f.army.tanks)}</small></div>`).join("")}</section><section><div class="section-title">HLÁŠENÍ Z FRONTY</div><div class="events">${game.log
    .slice(0, 10)
    .map(
      (l) =>
        `<div><time>${clock(l.time)}</time><span>${esc(l.text)}</span></div>`,
    )
    .join("")}</div></section></div></section>
<aside><nav aria-label="Velitelský panel">${["region", "trade", "research", "operations"].map((t) => button(({ region: "Území", trade: "Obchod", research: "Výzkum", operations: "Operace" } as Record<string, string>)[t], "tab:" + t, false, tab === t ? "active" : "")).join("")}</nav><div class="panel-body">${tab === "region" ? regionPanel() : tab === "trade" ? tradePanel() : tab === "research" ? researchPanel() : operationsPanel()}</div><div class="panel-bottom">Místní simulace · jedna národní armáda</div></aside></main>${dialog()}`;
  const focus = focusId
    ? document.getElementById(focusId)
    : action
      ? Array.from(
          document.querySelectorAll<HTMLElement>("[data-action]"),
        ).find((el) => el.dataset.action === action)
      : reg
        ? document.querySelector<HTMLElement>('[data-region="' + reg + '"]')
        : null;
  focus?.focus({ preventScroll: true });
}
function selectRegion(id: number) {
  const r = game.regions[id];
  if (r.owner === game.player) {
    selected = id;
    target = null;
  } else {
    target = id;
    if (
      !game.regions[selected].neighbors.includes(id) ||
      game.regions[selected].owner !== game.player
    )
      selected =
        r.neighbors.find((i) => game.regions[i].owner === game.player) ??
        selected;
  }
  tab = "region";
  render();
}
app.addEventListener("wheel", (ev) => {
  const surface = (ev.target as Element).closest<HTMLElement>(".map-surface");
  if (!surface) return;
  ev.preventDefault();
  const rect = surface.getBoundingClientRect(),
    previous = mapZoom,
    next = Math.min(2.4, Math.max(0.8, previous * (ev.deltaY < 0 ? 1.12 : 0.89)));
  if (next === previous) return;
  const x = ev.clientX - rect.left, y = ev.clientY - rect.top, factor = next / previous;
  mapPanX = x - (x - mapPanX) * factor;
  mapPanY = y - (y - mapPanY) * factor;
  mapZoom = next;
  render();
}, { passive: false });
app.addEventListener("click", (ev) => {
  const el = ev.target as Element,
    region = el.closest<HTMLElement>("[data-region]");
  if (region) {
    selectRegion(Number(region.dataset.region));
    return;
  }
  const a = el.closest<HTMLElement>("[data-action]")?.dataset.action;
  if (!a) return;
  const [kind, value, extra] = a.split(":");
  if (kind === "upgrade") send({ type: "upgrade", region: target ?? selected });
  else if (kind === "fortify") send({ type: "fortify", region: target ?? selected });
  else if (kind === "tanks") send({ type: "tanks" });
  else if (kind === "research")
    send({ type: "research", branch: value as Branch });
  else if (kind === "trade")
    send({ type: "trade", side: value as "buy" | "sell", commodity: extra as Commodity });
  else if (kind === "auto")
    send({ type: "autoTrade", side: value as "buy" | "sell", commodity: extra as Commodity });
  else if (kind === "reinforce")
    send({ type: "reinforce", operation: Number(value), percent });
  else if (kind === "retreat")
    send({ type: "retreat", operation: Number(value) });
  else if (kind === "deploy" && target !== null)
    send({ type: "deploy", from: selected, to: target, percent });
  else if (kind === "force") percent = Number(value);
  else if (kind === "pause") {
    paused = !paused;
    accumulator = 0;
  } else if (kind === "speed") speed = Number(value);
  else if (kind === "tab") tab = value;
  else if (kind === "save") {
    save();
    notice = saveStatus;
  } else if (kind === "help" || (kind === "new" && value === undefined)) {
    modal = kind;
    paused = true;
  } else if (kind === "close") modal = "";
  else if (kind === "new") {
    game = createGame(Date.now(), Number(value));
    selected = game.nations[game.player].capital;
    target = null;
    paused = true;
    speed = 1;
    tab = "region";
    modal = "";
    accumulator = 0;
    armyDraft = null;
    mapZoom = 1;
    mapPanX = 0;
    mapPanY = 0;
    notice = "Nová kampaň. Nastav armádu a vyber první důl.";
    save();
  }
  render();
  if (modal) document.querySelector<HTMLElement>(".modal button")?.focus();
});
app.addEventListener("pointerdown", (ev) => {
  if ((ev.target as HTMLElement).id === "army-size") dragging = true;
});
window.addEventListener("pointerup", () => {
  dragging = false;
});
window.addEventListener("pointercancel", () => {
  dragging = false;
  armyDraft = null;
  render();
});
app.addEventListener("input", (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.id === "army-size") {
    armyDraft = Number(el.value);
    const n = game.nations[game.player],
      previous = n.armyTarget;
    n.armyTarget = armyDraft;
    const preview = economy(game, game.player);
    n.armyTarget = previous;
    document.getElementById("army-target-label")!.textContent =
      armyDraft + " % · " + num(preview.target) + " osob";
    document.getElementById("planned-cost")!.textContent =
      decimal(preview.planned.steadyCost) + " ¤/s";
  } else if (el.id === "bot-aggression") {
    document.getElementById("bot-aggression-label")!.textContent =
      el.value + " %";
  } else if (el.id === "attack-size") {
    percent = Number(el.value);
    document.getElementById("attack-size-label")!.textContent = percent + " %";
    const free = available(game, game.player);
    document.getElementById("attack-units")!.textContent =
      `Vyčlenit ${Math.floor((free.infantry * percent) / 100)} pěšáků a ${Math.floor((free.tanks * percent) / 100)} tanků ze společné armády.`;
  } else if (el.id === "reinforce-size") {
    percent = Number(el.value);
    document.getElementById("reinforce-size-label")!.textContent = percent + " %";
  }
});
app.addEventListener("change", (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.id === "army-size") {
    dragging = false;
    armyDraft = null;
    send({ type: "armyTarget", percent: Number(el.value) });
  } else if (el.id === "bot-aggression") {
    send({ type: "botAggression", percent: Number(el.value) });
  } else if (el.id === "attack-size") {
    percent = Number(el.value);
  } else if (el.id === "reinforce-size") {
    percent = Number(el.value);
  }
});
document.addEventListener("keydown", (ev) => {
  const el = ev.target as HTMLElement;
  if (modal) {
    if (ev.key === "Escape") {
      modal = "";
      render();
    }
    if (ev.key === "Tab") {
      const bs = Array.from(
        document.querySelectorAll<HTMLButtonElement>(".modal button"),
      );
      if (ev.shiftKey && document.activeElement === bs[0]) {
        ev.preventDefault();
        bs.at(-1)?.focus();
      } else if (!ev.shiftKey && document.activeElement === bs.at(-1)) {
        ev.preventDefault();
        bs[0]?.focus();
      }
    }
    return;
  }
  if (
    el.hasAttribute("data-region") &&
    (ev.key === "Enter" || ev.key === " ")
  ) {
    ev.preventDefault();
    selectRegion(Number(el.dataset.region));
    return;
  }
  if (["INPUT", "BUTTON", "SELECT", "TEXTAREA"].includes(el.tagName)) return;
  if (ev.code === "Space") {
    ev.preventDefault();
    paused = !paused;
    accumulator = 0;
  }
  if (["1", "2", "4"].includes(ev.key)) speed = Number(ev.key);
  if (ev.key === "Escape") target = null;
  render();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    paused = true;
    accumulator = 0;
    save();
    render();
  }
});
window.addEventListener("pagehide", save);
render();
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now;
  if (!paused && !modal) {
    accumulator += dt * speed;
    renderElapsed += dt;
    while (accumulator >= 1) {
      tick(game);
      accumulator -= 1;
      if (game.time % 15 === 0) save();
    }
    if (renderElapsed >= 0.5 && !dragging && armyDraft === null) {
      render();
      renderElapsed = 0;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
