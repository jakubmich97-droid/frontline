import "./style.css";
import {
  createGame,
  issue,
  tick,
  owned,
  economy,
  strength,
  supplied,
  defense,
  cost,
  researchCost,
  serialize,
  restore,
  FACTIONS,
  BRANCHES,
  TECH_NAMES,
  type Game,
  type Command,
  type Branch,
} from "./engine.ts";

const app = document.querySelector<HTMLDivElement>("#app")!;
const KEY = "frontline.save.v1";
let game: Game = createGame(),
  selected = 14,
  target: number | null = null,
  percent = 70,
  paused = true,
  speed = 1;
let tab = "region",
  notice = "Vyber sousední region a vyšli první výpravu.",
  saveStatus = "Zatím neuloženo",
  modal = "";
let accumulator = 0,
  last = performance.now(),
  renderElapsed = 0;
let draggingRange = false;
const num = (v: number) => Math.floor(v).toLocaleString("cs-CZ");
const clock = (v: number) =>
  `${Math.floor(v / 60)
    .toString()
    .padStart(2, "0")}:${(v % 60).toString().padStart(2, "0")}`;
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
    saveStatus = `Uloženo ${clock(game.time)}`;
  } catch {
    saveStatus = "Ukládání není dostupné";
    notice = "Prohlížeč nedovolil uložit hru. Ponech tuto stránku otevřenou.";
  }
}
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const saved = restore(raw);
    if (saved) {
      game = saved;
      selected = game.nations[game.player].capital;
      notice = "Uložená partie načtena. Pokračuj tlačítkem Spustit.";
      saveStatus = `Načteno ${clock(game.time)}`;
    } else
      notice =
        "Uložená hra je neplatná. Spouštím novou partii; původní záznam zatím zůstává zachován.";
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
  const supply = supplied(game, game.player);
  return `<svg class="world-map" viewBox="0 0 920 670" role="group" aria-label="Strategická mapa, 24 regionů"><defs>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#24404e" stroke-width=".5"/></pattern>
    <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0V7" stroke="#ffdf99" stroke-width="2"/></pattern>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>
  </defs><rect width="920" height="670" fill="url(#grid)"/>
  <text x="38" y="37" class="map-note">SEKTOR 01 / JANTAROVÉ POBŘEŽÍ</text><text x="880" y="37" text-anchor="end" class="map-note">N ↑</text>
  <text x="440" y="629" text-anchor="middle" class="sea-label">JIŽNÍ MOŘE</text>
  ${game.regions
    .map((r) => {
      const color = r.owner < 0 ? "#64757b" : game.nations[r.owner].color;
      const chosen = selected === r.id,
        targeted = target === r.id;
      const capital = game.nations.some(
        (n) => n.capital === r.id && r.owner === n.id,
      );
      const underAttack = game.operations.some(
        (o) => o.to === r.id && o.phase === "battle",
      );
      return `<g class="region ${chosen ? "selected" : ""} ${targeted ? "targeted" : ""}" role="button" tabindex="0" data-region="${r.id}" aria-label="${r.name}, ${r.owner < 0 ? "neutrální" : game.nations[r.owner].name}, pěchota ${num(r.army.infantry)}, tanky ${num(r.army.tanks)}" aria-pressed="${chosen}">
    <polygon points="${r.polygon}" fill="${color}" fill-opacity="${r.owner === game.player ? ".34" : r.owner < 0 ? ".13" : ".25"}" stroke="${color}" stroke-opacity=".65"/>
    ${underAttack ? `<polygon points="${r.polygon}" fill="url(#hatch)" opacity=".15" pointer-events="none"/>` : ""}
    <text x="${r.x}" y="${r.y - 21}" class="terrain-symbol">${capital ? "★" : r.terrain === "mountain" ? "△ △" : r.terrain === "forest" ? "♠ ♠" : "· · ·"}</text>
    <text x="${r.x}" y="${r.y - 2}" class="region-name">${r.name}</text>
    <rect x="${r.x - 35}" y="${r.y + 8}" width="70" height="25" rx="5" fill="#0b141b" fill-opacity=".8"/>
    <text x="${r.x}" y="${r.y + 25}" class="army-count" fill="${color}">${num(r.army.infantry)} <tspan class="tank-count">/ ${num(r.army.tanks)}</tspan></text>
    ${r.owner === game.player && !supply.has(r.id) ? `<text x="${r.x}" y="${r.y + 48}" class="supply-warning">BEZ ZÁSOBOVÁNÍ</text>` : ""}
    </g>`;
    })
    .join("")}
  ${game.operations
    .map((o) => {
      const a = game.regions[o.from],
        b = game.regions[o.to],
        color = game.nations[o.owner].color;
      const p = o.phase === "march" ? o.progress : 0.85,
        x = a.x + (b.x - a.x) * p,
        y = a.y + (b.y - a.y) * p;
      return `<g class="operation" pointer-events="none"><path d="M${a.x} ${a.y + 34} Q${(a.x + b.x) / 2 + 15} ${(a.y + b.y) / 2 - 22} ${b.x} ${b.y}" stroke="${color}" stroke-width="3" fill="none" marker-end="url(#arrow)" class="march-line"/>
    <circle cx="${x}" cy="${y}" r="5" fill="${color}"/>
    ${o.phase === "battle" ? `<circle class="battle-pulse" cx="${b.x}" cy="${b.y}" r="38" fill="none" stroke="#f4c073" stroke-width="2"/><rect x="${b.x - 34}" y="${b.y + 39}" width="68" height="5" rx="2" fill="#10191f"/><rect x="${b.x - 34}" y="${b.y + 39}" width="${68 * o.progress}" height="5" rx="2" fill="${color}"/>` : ""}</g>`;
    })
    .join("")}</svg>`;
}
function regionPanel() {
  const r = game.regions[selected],
    mine = r.owner === game.player,
    n = game.nations[game.player];
  const e = economy(game, game.player),
    hasSupply = mine && supplied(game, game.player).has(r.id);
  return `<div class="panel-heading"><span class="eyebrow">${mine ? "VLASTNÍ ÚZEMÍ" : r.owner < 0 ? "NEUTRÁLNÍ ÚZEMÍ" : esc(game.nations[r.owner].name)}</span><h2>${r.name}</h2><span class="tag">${r.terrain === "plain" ? "Rovina" : r.terrain === "forest" ? "Les" : "Hory"} · obrana ×${defense(r).toFixed(2)}</span></div>
  <div class="region-stats"><div><span>Obyvatelstvo</span><strong>${num(r.population)}</strong></div><div><span>Průmysl</span><strong>${r.industry}<small> / 5</small></strong></div><div><span>Pěchota</span><strong>${num(r.army.infantry)}</strong></div><div><span>Tanky</span><strong>${num(r.army.tanks)}</strong></div></div>
  ${
    mine
      ? `<p class="supply ${hasSupply ? "" : "warning"}">${hasSupply ? "◈ Napojeno na hlavní město" : "⚠ Odříznuté zásobování: slabší útok a příjem"}</p>
  <div class="section-title">VÝSTAVBA A NÁBOR <span>${r.queue ? "1 / 1" : "0 / 1"}</span></div>
  ${r.queue ? `<div class="project"><div>${{ infantry: "Nábor 50 pěšáků", tanks: "Výroba 5 tanků", industry: "Rozšíření průmyslu", fort: "Stavba opevnění" }[r.queue.kind]}<b>${r.queue.remaining} s</b></div><progress max="${r.queue.total}" value="${r.queue.total - r.queue.remaining}"></progress></div>` : ""}
  <div class="build-grid">${(["infantry", "tanks", "industry", "fort"] as const)
    .map((kind) => {
      const max =
        (kind === "industry" && r.industry >= 5) ||
        (kind === "fort" && r.fort >= 3);
      return button(
        `<span>${{ infantry: "+50 pěšáků", tanks: "+5 tanků", industry: "Průmysl ↑", fort: `Opevnění ${r.fort}/3` }[kind]}</span><small>${max ? "Maximum" : num(cost(r, kind)) + " ¤"}</small>`,
        `build:${kind}`,
        !!r.queue || n.money < cost(r, kind) || max,
        "build-button",
      );
    })
    .join("")}</div>
  ${e.net < 0 ? '<p class="warning">Rozpočet je záporný. Bez peněz začne armáda ztrácet vojáky.</p>' : ""}
  <div class="section-title">ROZKAZ K PŘESUNU</div>
  <p class="muted">${target === null ? "Klikni na sousední region na mapě." : `Cíl: <strong>${game.regions[target].name}</strong>`}</p>
  <label class="range-label" for="force">Síla výpravy <strong>${percent} %</strong></label><input id="force" aria-label="Síla výpravy" type="range" min="10" max="100" step="10" value="${percent}">
  <div class="deploy-summary"><span>${Math.floor((r.army.infantry * percent) / 100)} pěšáků</span><span>${Math.floor((r.army.tanks * percent) / 100)} tanků</span></div>
  ${target !== null ? `<p class="muted small">${game.regions[target].owner === game.player ? "Přesun do vlastního regionu." : `Poměr síly vůči obraně: ×${(((Math.floor((r.army.infantry * percent) / 100) + Math.floor((r.army.tanks * percent) / 100) * 6) * (1 + n.tech.military * 0.12) * (hasSupply ? 1 : 0.65 + n.tech.logistics * 0.08)) / Math.max(1, strength(game.regions[target].army) * defense(game.regions[target]) * (1 + (game.regions[target].owner >= 0 ? game.nations[game.regions[target].owner].tech.military : 0) * 0.12))).toFixed(1)}. Odhad, nikoli záruka.`}</p>` : ""}
  ${button(target !== null && game.regions[target].owner === game.player ? "Přesunout armádu →" : "Zahájit útok →", "deploy", target === null || (r.army.infantry * percent) / 100 < 5, "primary wide")}
  ${button("Vybrat jiný vlastní region", "deselect", false, "text-button wide")}`
      : `<p class="muted">Pro vydání rozkazu nejprve vyber své území.</p>${button("Zpět k vlastnímu území", "home", false, "wide")}`
  }`;
}
function researchPanel() {
  const n = game.nations[game.player];
  return `<div class="panel-heading"><span class="eyebrow">ROZVOJ STÁTU</span><h2>Technologie</h2><p class="muted">Tři větve. Jeden výzkum současně.</p></div>${BRANCHES.map((b) => `<section class="tech-card"><div class="section-title">${{ military: "ARMÁDA", industry: "EKONOMIKA", logistics: "LOGISTIKA" }[b]} <span>${n.tech[b]} / 3</span></div><div class="tech-levels">${[0, 1, 2].map((i) => `<span class="${i < n.tech[b] ? "done" : ""}">${i + 1}</span>`).join("")}</div><h3>${TECH_NAMES[b][n.tech[b]] || "Větev dokončena"}</h3><p class="muted">${{ military: "+12 % bojové síly za úroveň.", industry: "+16 % příjmů a rychlejší výroba za úroveň.", logistics: "Rychlejší přesuny a menší postih za odříznutí." }[b]}</p>${n.research?.branch === b ? `<progress max="${n.research.total}" value="${n.research.total - n.research.remaining}"></progress><p class="muted">Dokončení za ${n.research.remaining} s</p>` : button(n.tech[b] >= 3 ? "Dokončeno" : `Vyzkoumat · ${num(researchCost(n, b))} ¤`, `research:${b}`, !!n.research || n.tech[b] >= 3 || n.money < researchCost(n, b), "wide")}</section>`).join("")}`;
}
function operationsPanel() {
  const ops = game.operations.filter(
    (o) => o.owner === game.player || game.regions[o.to].owner === game.player,
  );
  return `<div class="panel-heading"><span class="eyebrow">SITUACE NA FRONTĚ</span><h2>Operace <small>${ops.length}</small></h2></div>${ops.length ? ops.map((o) => `<section class="operation-card"><span class="tag">${o.owner === game.player ? "Vlastní výprava" : "Nepřátelský útok"} · ${o.phase === "march" ? "Přesun" : "Bitva"}</span><h3>${game.regions[o.from].name} → ${game.regions[o.to].name}</h3><p>${num(o.army.infantry)} pěšáků · ${num(o.army.tanks)} tanků</p><progress max="1" value="${o.progress}"></progress><p class="muted">${o.phase === "march" ? "Průběh přesunu" : "Obsazení"} ${Math.floor(o.progress * 100)} % · ztráty síly ${num(o.losses)}</p>${o.owner === game.player ? button("Ustoupit (−20 % jednotek)", `retreat:${o.id}`, game.regions[o.from].owner !== game.player, "wide") : ""}</section>`).join("") : '<p class="muted empty">Žádné operace u tvých území. Vyber vlastní region a sousední cíl.</p>'}`;
}
function dialog() {
  if (modal === "new")
    return `<div class="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" class="modal"><span class="eyebrow">NOVÁ KAMPAŇ</span><h2 id="dialog-title">Vyber svou frakci</h2><p class="muted">24 regionů · 5 soupeřů · stejné startovní zdroje. Nová hra nahradí uloženou partii.</p><div class="faction-choices">${FACTIONS.map((f, i) => button(`<i style="background:${f.color}"></i>${f.name}`, `new:${i}`, false, "faction-choice")).join("")}</div>${button("Zpět do hry", "close", false, "wide")}</section></div>`;
  if (modal === "help")
    return `<div class="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" class="modal"><span class="eyebrow">POLNÍ MANUÁL</span><h2 id="dialog-title">První minuty na frontě</h2><ol><li>Hra začíná pozastavená. Vyber vlastní barevný region.</li><li>Klikni na souseda, nastav procento armády a vydej rozkaz. Pro výběr jiného vlastního regionu použij pravé tlačítko nebo „Vybrat jiný vlastní region“.</li><li>Spusť čas. Výprava nejprve pochoduje, poté bojuje. Čísla na mapě jsou pěchota / tanky.</li><li>Průmysl vydělává, vojáci stojí peníze i po náboru. Udržuj kladnou bilanci.</li><li>Hory a opevnění brání lépe. Odříznutí od hlavního města oslabuje útok i příjmy. Hlavní město lze získat zpět.</li><li>Vítězíš obsazením všech 24 regionů. Ztráta všech regionů znamená porážku, i když máš armádu na pochodu.</li></ol><p class="muted">Mezerník: pauza · Esc: zrušit cíl · 1 / 2 / 4: rychlost. Čas se při skrytí záložky pozastaví. Partie se ukládá pouze v tomto prohlížeči.</p>${button("Rozumím", "close", false, "primary wide")}</section></div>`;
  return "";
}
function render() {
  const active = document.activeElement as HTMLElement | null;
  const focusKey = active?.getAttribute("data-action"),
    focusRegion = active?.getAttribute("data-region"),
    focusId = active?.id;
  const scrolls = Array.from(
    document.querySelectorAll<HTMLElement>("[data-scroll]"),
  ).map((el) => [el.dataset.scroll, el.scrollTop] as const);
  const n = game.nations[game.player],
    e = economy(game, game.player),
    territories = owned(game, game.player).length;
  const ended = game.winner !== null || game.defeated.includes(game.player);
  if (ended) paused = true;
  app.innerHTML = `<header><a class="brand" href="./" aria-label="Frontline"><span class="brand-mark">F</span>FRONTLINE<span class="version">PROTOTYP 0.1</span></a><div class="header-actions"><span class="save-status">${saveStatus}</span>${button("Uložit", "save")}${button("?", "help", false, "help-button")}${button("Nová hra", "new")}</div></header>
  <div class="resource-bar"><div class="your-nation"><i style="background:${n.color}"></i><div><span class="eyebrow">TVÁ FRAKCE</span><strong>${n.name}</strong></div></div><div class="resource"><span>POKLADNA</span><strong>${num(n.money)} <small>¤</small></strong></div><div class="resource"><span>BILANCE / S</span><strong class="${e.net >= 0 ? "positive" : "negative"}">${e.net >= 0 ? "+" : ""}${e.net.toFixed(1)} <small>¤</small></strong></div><div class="resource"><span>OBYVATELSTVO</span><strong>${num(e.population)}</strong></div><div class="resource"><span>ÚZEMÍ</span><strong>${territories}<small> / 24</small></strong></div><div class="time-controls"><span class="game-clock">${clock(game.time)}</span>${button(paused ? "▶ Spustit" : "Ⅱ Pauza", "pause", ended, "play-button")}${[1, 2, 4].map((s) => button(`${s}×`, `speed:${s}`, false, s === speed ? "active" : "")).join("")}</div></div>
  <main><section class="map-column"><div class="map-heading"><div><span class="eyebrow">OPERAČNÍ MAPA</span><h1>Jantarové pobřeží</h1></div><span class="live-state ${paused ? "is-paused" : ""}">${ended ? "KONEC PARTIE" : paused ? "POZASTAVENO" : "SIMULACE BĚŽÍ"}</span></div>
  <div class="map-surface ${paused ? "paused" : ""}">${mapMarkup()}${ended ? `<div class="result-banner"><h2>${game.winner === game.player ? "Vítězství" : game.defeated.includes(game.player) ? "Tvá frakce byla poražena" : "Konec tažení"}</h2><p>${game.winner === game.player ? "Ovládáš všech 24 regionů." : "Zkus jinou startovní pozici nebo ekonomickou strategii."}</p>${button("Nová kampaň", "new", false, "primary")}</div>` : ""}</div>
  <div class="map-footer"><span>★ Hlavní město <span class="legend-gap">△ Hory</span><span class="legend-gap">♠ Les</span></span><span>Pěchota / tanky</span></div>
  <div class="notice" role="status">${esc(notice)}</div>
  <div class="bottom-grid"><section class="standings"><div class="section-title">ROVNOVÁHA SIL <span>ÚZEMÍ</span></div>${[
    ...game.nations,
  ]
    .sort((a, b) => owned(game, b.id).length - owned(game, a.id).length)
    .map(
      (f) =>
        `<div class="faction-row"><i style="background:${f.color}"></i><span>${f.name}${f.id === game.player ? " <small>TY</small>" : ""}</span><div class="faction-bar"><span style="width:${(owned(game, f.id).length / 24) * 100}%;background:${f.color}"></span></div><b>${owned(game, f.id).length}</b></div>`,
    )
    .join(
      "",
    )}</section><section class="event-log"><div class="section-title">HLÁŠENÍ Z FRONTY <span>POSLEDNÍ UDÁLOSTI</span></div><div class="events" data-scroll="events">${game.log
    .slice(0, 12)
    .map(
      (l) =>
        `<div><time>${clock(l.time)}</time><span>${esc(l.text)}</span></div>`,
    )
    .join("")}</div></section></div></section>
  <aside><nav aria-label="Velitelský panel">${button("Region", "tab:region", false, tab === "region" ? "active" : "")}${button("Výzkum", "tab:research", false, tab === "research" ? "active" : "")}${button("Operace", "tab:operations", false, tab === "operations" ? "active" : "")}</nav><div class="panel-body" data-scroll="panel">${tab === "region" ? regionPanel() : tab === "research" ? researchPanel() : operationsPanel()}</div><div class="panel-bottom">Místní simulace · bez serveru<br><span>Mezerník pro pauzu / pokračování</span></div></aside></main>${dialog()}`;
  for (const [key, top] of scrolls) {
    const el = document.querySelector<HTMLElement>(`[data-scroll="${key}"]`);
    if (el) el.scrollTop = top;
  }
  const focus = focusId
    ? document.getElementById(focusId)
    : focusKey
      ? Array.from(
          document.querySelectorAll<HTMLElement>("[data-action]"),
        ).find((el) => el.dataset.action === focusKey)
      : focusRegion
        ? document.querySelector<HTMLElement>(`[data-region="${focusRegion}"]`)
        : null;
  focus?.focus({ preventScroll: true });
}
function selectRegion(id: number, forceSelect = false) {
  if (
    !forceSelect &&
    game.regions[selected].owner === game.player &&
    selected !== id &&
    game.regions[selected].neighbors.includes(id)
  )
    target = id;
  else {
    selected = id;
    target = null;
  }
  tab = "region";
  render();
}
app.addEventListener("click", (ev) => {
  const el = ev.target as Element;
  const region = el.closest<HTMLElement>("[data-region]");
  if (region) {
    selectRegion(Number(region.dataset.region));
    return;
  }
  const action = el.closest<HTMLElement>("[data-action]")?.dataset.action;
  if (!action) return;
  const [kind, value] = action.split(":");
  if (kind === "build")
    send({ type: "build", region: selected, kind: value as "infantry" });
  else if (kind === "research")
    send({ type: "research", branch: value as Branch });
  else if (kind === "retreat")
    send({ type: "retreat", operation: Number(value) });
  else if (kind === "deploy" && target !== null) {
    send({ type: "deploy", from: selected, to: target, percent });
  } else if (kind === "pause") {
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
    notice = "Nová kampaň připravena. Naplánuj první rozkazy a spusť čas.";
    save();
  } else if (kind === "home") {
    selected =
      owned(game, game.player)[0]?.id ?? game.nations[game.player].capital;
    target = null;
  } else if (kind === "deselect") {
    selected = -1;
    target = null;
    notice = "Nyní klikni na vlastní region, který chceš ovládat.";
  }
  // Selection mode uses a temporary sentinel only until the next region click.
  if (selected === -1) {
    selected = game.nations[game.player].capital;
    app.dataset.selectOnly = "true";
  }
  render();
  if (modal) document.querySelector<HTMLElement>(".modal button")?.focus();
});
// Capture the next click when explicitly changing source region.
app.addEventListener(
  "click",
  (ev) => {
    if (app.dataset.selectOnly !== "true") return;
    const region = (ev.target as Element).closest<HTMLElement>("[data-region]");
    if (region) {
      ev.stopImmediatePropagation();
      delete app.dataset.selectOnly;
      selectRegion(Number(region.dataset.region), true);
    }
  },
  true,
);
app.addEventListener("contextmenu", (ev) => {
  const el = (ev.target as Element).closest<HTMLElement>("[data-region]");
  if (el) {
    ev.preventDefault();
    selectRegion(Number(el.dataset.region), true);
  }
});
app.addEventListener("pointerdown", (ev) => {
  if ((ev.target as HTMLElement).id === "force") draggingRange = true;
});
window.addEventListener("pointerup", () => {
  if (draggingRange) {
    draggingRange = false;
    render();
  }
});
window.addEventListener("pointercancel", () => {
  draggingRange = false;
});
app.addEventListener("input", (ev) => {
  if ((ev.target as HTMLInputElement).id === "force") {
    percent = Number((ev.target as HTMLInputElement).value);
    const label = document.querySelector(".range-label strong");
    if (label) label.textContent = `${percent} %`;
  }
});
app.addEventListener("change", (ev) => {
  if ((ev.target as HTMLInputElement).id === "force") render();
});
document.addEventListener("keydown", (ev) => {
  if (modal) {
    if (ev.key === "Escape") {
      modal = "";
      render();
      return;
    }
    if (ev.key === "Tab") {
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(".modal button"),
      );
      const first = buttons[0],
        last = buttons.at(-1);
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last?.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first?.focus();
      }
    }
    return;
  }
  const el = ev.target as HTMLElement;
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
  if (ev.key === "Escape") {
    target = null;
    delete app.dataset.selectOnly;
  }
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
    if (renderElapsed >= 0.5 && !draggingRange) {
      render();
      renderElapsed = 0;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
