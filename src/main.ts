import "./style.css";
import {
  createGame,
  issue,
  tick,
  owned,
  economy,
  strength,
  available,
  deployed,
  personnel,
  population,
  defense,
  defenseStrength,
  upgradeCost,
  researchCost,
  serialize,
  restore,
  FACTIONS,
  FACILITIES,
  BRANCHES,
  TECH_NAMES,
  tankBlocker,
  type Game,
  type Command,
  type Branch,
} from "./engine.ts";
const app = document.querySelector<HTMLDivElement>("#app")!;
const KEY = "frontline.save.v2";
let game: Game = createGame(),
  selected = 14,
  target: number | null = null,
  percent = 60,
  paused = true,
  speed = 1,
  tab = "region",
  notice = "Nastav velikost národní armády a vyber sousední území.",
  saveStatus = "Zatím neuloženo",
  modal = "",
  dragging = false,
  armyDraft: number | null = null;
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
    legacy = current ? null : localStorage.getItem("frontline.save.v1"),
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
  return `<svg class="world-map" viewBox="0 0 920 670" role="group" aria-label="Strategická mapa, 24 regionů"><defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#24404e" stroke-width=".5"/></pattern><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs><rect width="920" height="670" fill="url(#grid)"/><text x="38" y="37" class="map-note">JANTAROVÉ POBŘEŽÍ / SUROVINOVÁ MAPA</text><text x="870" y="37" class="map-note">N ↑</text><text x="440" y="630" text-anchor="middle" class="sea-label">JIŽNÍ MOŘE</text>
${game.regions
  .map((r) => {
    const color = r.owner < 0 ? "#64757b" : game.nations[r.owner].color,
      f = FACILITIES[r.facility];
    return `<g class="region ${selected === r.id ? "selected" : ""} ${target === r.id ? "targeted" : ""}" role="button" tabindex="0" data-region="${r.id}" aria-label="${r.name}, ${f.name}, úroveň ${r.level}, ${r.owner < 0 ? "neutrální" : game.nations[r.owner].name}" aria-pressed="${selected === r.id}"><polygon points="${r.polygon}" fill="${color}" fill-opacity="${r.owner === game.player ? ".44" : r.owner < 0 ? ".11" : ".38"}" stroke="${color}" stroke-opacity="${r.owner < 0 ? ".45" : ".13"}"/><text x="${r.x}" y="${r.y - 20}" class="facility-symbol" fill="${color}">${f.symbol}</text><text x="${r.x}" y="${r.y + 1}" class="region-name">${r.name}</text><text x="${r.x}" y="${r.y + 21}" class="facility-label" fill="${color}">${f.short} · ${r.level}</text>${r.upgrade ? `<text x="${r.x}" y="${r.y + 38}" class="facility-label">↑ ${r.upgrade.remaining} s</text>` : ""}</g>`;
  })
  .join("")}
${game.regions.map((r) => {
  const pts = r.polygon.split(" ").map((p) => p.split(",").map(Number)),
    edges = [[0, 1, r.id - 6], [1, 2, r.id + 1], [2, 3, r.id + 6], [3, 0, r.id - 1]];
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
    return `<g class="operation" pointer-events="none"><path d="M${a.x} ${a.y + 34} Q${(a.x + b.x) / 2 + 15} ${(a.y + b.y) / 2 - 22} ${b.x} ${b.y}" stroke="${c}" stroke-width="3" fill="none" marker-end="url(#arrow)" class="march-line"/><circle cx="${a.x + (b.x - a.x) * p}" cy="${a.y + (b.y - a.y) * p}" r="5" fill="${c}"/>${o.phase === "battle" ? `<circle class="battle-pulse" cx="${b.x}" cy="${b.y}" r="38" fill="none" stroke="#f4c073" stroke-width="2"/><rect x="${b.x - 34}" y="${b.y + 39}" width="68" height="5" rx="2" fill="#10191f"/><rect x="${b.x - 34}" y="${b.y + 39}" width="${68 * o.progress}" height="5" fill="${c}"/>` : ""}</g>`;
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
    decimal(r.level * (r.facility === "oil" ? 1.2 : 0.8)) + " jednotek/s základ"
  );
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
<div class="facility-card"><span class="facility-icon">${f.symbol}</span><div><h3>${f.name}</h3><span class="tag">Úroveň ${r.level} / 5</span></div></div><p class="muted">${f.description}</p><p class="yield">${facilityYield(r)}</p>
${r.upgrade ? `<div class="project">Vylepšení · ${r.upgrade.remaining} s<progress max="${r.upgrade.total}" value="${r.upgrade.total - r.upgrade.remaining}"></progress></div>` : ""}
${
  mine
    ? button(
        r.level >= 5
          ? "Maximální úroveň"
          : `Vylepšit · ${num(upgradeCost(r))} ¤`,
        "upgrade",
        !!r.upgrade || r.level >= 5 || n.money < upgradeCost(r),
        "wide",
      )
    : `<div class="section-title">DOBYTÍ ÚZEMÍ</div><p class="muted small">${r.owner < 0 ? "Neutrální území má místní odpor." : "Brání ho volná část společné armády soupeře."} Aktuální obranná síla: ${num(defenseStrength(game, r))}.</p><p class="muted">${adjacent ? "Útok ze směru " + game.regions[selected].name : "Území zatím nesousedí s tvým státem."}</p>
<div class="attack-options" aria-label="Podíl volné armády">${[30, 60, 90].map((p) => button(p + " %", "force:" + p, false, percent === p ? "active" : "")).join("")}</div><p class="muted small">Vyčlenit ${Math.floor((free.infantry * percent) / 100)} pěšáků a ${Math.floor((free.tanks * percent) / 100)} tanků ze společné armády.</p>${button(busy ? "Operace již probíhá" : "Zahájit útok →", "deploy", !adjacent || busy || (free.infantry * percent) / 100 < 5, "primary wide")}`
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
  );
  return `<h2>Operace · ${ops.length}</h2><p class="muted">Vyčleněné jednotky jsou součástí národní armády, nikoli další vojáci navíc.</p>${ops.map((o) => `<section class="operation-card"><span class="tag">${o.owner === game.player ? "Vlastní výprava" : "Nepřátelský útok"} · ${o.phase === "march" ? "Přesun" : "Bitva"}</span><h3>${game.regions[o.to].name}</h3><p>${num(o.army.infantry)} pěchoty · ${num(o.army.tanks)} tanků</p><progress max="1" value="${o.progress}"></progress><p class="muted">Postup ${Math.floor(o.progress * 100)} % · ztráty síly ${num(o.losses)}</p>${o.owner === game.player ? button("Ustoupit (−20 % jednotek)", "retreat:" + o.id, false, "wide") : ""}</section>`).join("") || '<p class="muted">Žádné probíhající operace u tvého státu.</p>'}`;
}
function dialog() {
  if (modal === "new")
    return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">Nová kampaň</h2><p class="muted">Nahradí aktuální partii. Původní záloha verze 0.1 zůstane zachovaná.</p><div class="faction-choices">${FACTIONS.map((n, id) => button(n.name, "new:" + id, false, "faction-choice")).join("")}</div>${button("Zpět do hry", "close", false, "wide")}</section></div>`;
  if (modal === "help")
    return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">Jedna armáda, jeden rozpočet</h2><ol><li>Posuvník určuje cílový počet osob podle populace. Pěchota se postupně nabírá za 3 ¤ na vojáka, nebo propouští bez náhrady.</li><li>Města dodávají populaci. Doly těží železo a uhlí, ropná pole palivo; přístavy vydělávají a zlevňují dovoz. Vše lze vylepšit na úroveň 5.</li><li>Tanky vyrábíš ručně ze železa a uhlí. Posuvník tanky nemaže; jejich osádky i provoz stojí zdroje i při cíli 0 %.</li><li>Armáda platí žold a spotřebovává ropu. Nejprve využije těžbu a zásoby, chybějící ropu automaticky dokoupí.</li><li>Klikni na sousední cizí území a vyčleň 30, 60 nebo 90 % volné armády. Číslo armády každého státu je vidět přímo na mapě.</li><li>Agresivita botů řídí jejich ochotu riskovat. Po zabrání neutrálních provincií pokračují válkou mezi státy; při 0 % pouze budují.</li></ol><p class="muted">Mezerník: pauza · 1/2/4: rychlost. Ukládání je místní, každých 15 herních sekund.</p>${button("Rozumím", "close", false, "primary wide")}</section></div>`;
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
  app.innerHTML = `<header><a class="brand" href="./" aria-label="Frontline"><span class="brand-mark">F</span>FRONTLINE<span class="version">STÁTNÍ HRANICE · 0.3</span></a><div class="header-actions"><span class="save-status">${saveStatus}</span>${button("Uložit", "save")}${button("?", "help", false, "help-button")}${button("Nová hra", "new")}</div></header>
<div class="resource-bar"><div class="your-nation"><i style="background:${n.color}"></i><div><span class="eyebrow">TVÁ FRAKCE</span><strong>${n.name}</strong></div></div><div class="resource"><span>POKLADNA</span><strong>${num(n.money)} ¤</strong></div><div class="resource"><span>BILANCE / S*</span><strong class="${e.net >= 0 ? "positive" : "negative"}">${e.net >= 0 ? "+" : ""}${decimal(e.net)} ¤</strong></div><div class="resource"><span>POPULACE</span><strong>${num(e.population)}</strong></div><div class="resource"><span>ÚZEMÍ</span><strong>${owned(game, game.player).length}<small> / 24</small></strong></div><div class="time-controls"><span class="game-clock">${clock(game.time)}</span>${button(paused ? "▶ Spustit" : "Ⅱ Pauza", "pause", ended, "play-button")}${[1, 2, 4].map((s) => button(s + "×", "speed:" + s, false, speed === s ? "active" : "")).join("")}</div></div>
<div class="materials-bar">${(["iron", "coal", "oil"] as const).map((k) => `<div><span>${FACILITIES[k].name === "Ropné pole" ? "ROPA" : k === "iron" ? "ŽELEZO" : "UHLÍ"}</span><strong>${num(n.resources[k])}</strong><small>těžba +${decimal(e.production[k])}/s</small></div>`).join("")}<div class="fuel-summary"><span>SPOTŘEBA ROPY</span><strong>${decimal(e.oilUse)}/s</strong><small>${e.importNow > 0 ? "Dovoz " + decimal(e.importNow) + "/s za " + decimal(e.oilPrice) + " ¤/jedn." : e.oilUse > e.production.oil ? "Čerpání zásob; poté placený dovoz" : "Pokryto vlastní těžbou"}</small></div><p>*Bilance před jednorázovým náborem a výstavbou.</p></div>
<main><section class="map-column">${armyPanel()}<div class="map-heading"><div><span class="eyebrow">OPERAČNÍ MAPA</span><h1>Jantarové pobřeží</h1></div><span class="live-state ${paused ? "is-paused" : ""}">${ended ? "KONEC PARTIE" : paused ? "POZASTAVENO" : "SIMULACE BĚŽÍ"}</span></div>
<div class="map-surface ${paused ? "paused" : ""}">${mapMarkup()}<div class="map-score"><b>STÁTY</b>${game.nations.filter((f) => owned(game, f.id).length).map((f) => `<span><i style="background:${f.color}"></i>${owned(game, f.id).length} úz. · ⚔ ${num(f.army.infantry)}</span>`).join("")}</div>${ended ? `<div class="result-banner"><h2>${game.winner === game.player ? "Vítězství" : "Tvá frakce byla poražena"}</h2>${button("Nová kampaň", "new", false, "primary")}</div>` : ""}</div><div class="map-footer"><span>▥ Město · Fe Železo · C Uhlí · ◈ Ropa · ⚓ Přístav</span><span>Číslo na mapě = volná armáda</span></div><div class="notice" role="status">${esc(notice)}</div>
<div class="bottom-grid"><section><div class="section-title">ROVNOVÁHA SIL <span>ÚZEMÍ / ARMÁDA</span></div>${game.nations.map((f) => `<div class="faction-row"><i style="background:${f.color}"></i><span>${f.name}</span><b>${owned(game, f.id).length}</b><small>${num(f.army.infantry)} / ${num(f.army.tanks)}</small></div>`).join("")}</section><section><div class="section-title">HLÁŠENÍ Z FRONTY</div><div class="events">${game.log
    .slice(0, 10)
    .map(
      (l) =>
        `<div><time>${clock(l.time)}</time><span>${esc(l.text)}</span></div>`,
    )
    .join("")}</div></section></div></section>
<aside><nav aria-label="Velitelský panel">${["region", "research", "operations"].map((t) => button(({ region: "Území", research: "Výzkum", operations: "Operace" } as Record<string, string>)[t], "tab:" + t, false, tab === t ? "active" : "")).join("")}</nav><div class="panel-body">${tab === "region" ? regionPanel() : tab === "research" ? researchPanel() : operationsPanel()}</div><div class="panel-bottom">Místní simulace · jedna národní armáda</div></aside></main>${dialog()}`;
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
app.addEventListener("click", (ev) => {
  const el = ev.target as Element,
    region = el.closest<HTMLElement>("[data-region]");
  if (region) {
    selectRegion(Number(region.dataset.region));
    return;
  }
  const a = el.closest<HTMLElement>("[data-action]")?.dataset.action;
  if (!a) return;
  const [kind, value] = a.split(":");
  if (kind === "upgrade") send({ type: "upgrade", region: target ?? selected });
  else if (kind === "tanks") send({ type: "tanks" });
  else if (kind === "research")
    send({ type: "research", branch: value as Branch });
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
