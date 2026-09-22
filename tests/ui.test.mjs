// DOM interaction tests are not a substitute for real-browser visual QA.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { JSDOM } from "jsdom";

const assets = new URL("../dist/assets/", import.meta.url);
const bundle = readFileSync(
  new URL(
    readdirSync(assets).find((n) => n.endsWith(".js")),
    assets,
  ),
  "utf8",
);
function setup(saved) {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="app"></div></body></html>',
    {
      url: "http://localhost/",
      runScripts: "outside-only",
      pretendToBeVisual: true,
    },
  );
  const w = dom.window;
  let callback;
  w.requestAnimationFrame = (cb) => {
    callback = cb;
    return 1;
  };
  if (saved) w.localStorage.setItem("frontline.save.v3", saved);
  w.eval(bundle);
  const find = (selector) => {
    const el = w.document.querySelector(selector);
    assert.ok(el, selector);
    return el;
  };
  const click = (selector) =>
    find(selector).dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  return {
    dom,
    w,
    find,
    click,
    advance(seconds) {
      const start = w.performance.now();
      for (let i = 1; i <= seconds * 5; i++) callback(start + i * 200);
    },
  };
}
test("UI: select target, issue attack, simulate, save and reload", () => {
  const ui = setup();
  assert.equal(ui.w.document.querySelectorAll("[data-region]").length, 35);
  assert.ok(ui.w.document.querySelectorAll(".state-border").length > 20);
  assert.ok(ui.w.document.querySelectorAll(".neutral-garrison").length > 20);
  assert.equal(ui.w.document.querySelectorAll(".map-army").length, 6);
  assert.match(ui.find(".live-state").textContent, /POZASTAVENO/);
  ui.click('[data-region="16"]');
  assert.equal(ui.find('[data-action="deploy"]').disabled, false);
  ui.click('[data-action="deploy"]');
  assert.equal(ui.w.document.querySelectorAll(".operation").length, 1);
  ui.click('[data-action="tab:operations"]');
  ui.click('[data-action^="reinforce:"]');
  assert.match(ui.find(".operation-card").textContent, /Posily|pěchoty/);
  ui.click('[data-action="pause"]');
  ui.advance(12);
  assert.match(ui.find(".game-clock").textContent, /00:1/);
  ui.click('[data-action="pause"]');
  ui.click('[data-action="save"]');
  const saved = ui.w.localStorage.getItem("frontline.save.v3");
  assert.ok(JSON.parse(saved).time >= 11);
  const resumed = setup(saved);
  assert.equal(
    resumed.find(".game-clock").textContent,
    ui.find(".game-clock").textContent,
  );
  assert.match(resumed.find(".live-state").textContent, /POZASTAVENO/);
  resumed.dom.window.close();
  ui.dom.window.close();
});
test("UI: upgrade, research, help, new faction and army slider", () => {
  const ui = setup();
  ui.click('[data-action="tab:research"]');
  ui.click('[data-action="research:military"]');
  assert.match(ui.find(".panel-body").textContent, /Dokončení za 50 s/);
  ui.click('[data-action="help"]');
  assert.ok(ui.find('[role="dialog"]'));
  ui.click('[data-action="close"]');
  ui.click('[data-action="new"]');
  ui.click('[data-action="new:1"]');
  assert.match(ui.find(".your-nation").textContent, /Severní svaz/);
  ui.click('[data-action="upgrade"]');
  assert.ok(ui.find(".project"));
  ui.click('[data-action="fortify"]');
  assert.match(ui.find(".fort-card").textContent, /Stavba/);
  const range = ui.find("#army-size");
  range.value = "70";
  range.dispatchEvent(new ui.w.Event("input", { bubbles: true }));
  range.dispatchEvent(new ui.w.Event("change", { bubbles: true }));
  assert.match(ui.find(".range-label").textContent, /70 %/);
  const aggression = ui.find("#bot-aggression");
  aggression.value = "80";
  aggression.dispatchEvent(new ui.w.Event("input", { bubbles: true }));
  aggression.dispatchEvent(new ui.w.Event("change", { bubbles: true }));
  assert.match(ui.find("#bot-aggression-label").textContent, /80 %/);
  ui.click('[data-action="tab:trade"]');
  assert.equal(ui.w.document.querySelectorAll(".market-card").length, 4);
  ui.click('[data-action="auto:buy:grain"]');
  assert.match(ui.find('[data-action="auto:buy:grain"]').textContent, /ZAP/);
  ui.click('[data-action="trade:buy:grain"]');
  assert.match(ui.find(".panel-body").textContent, /Obilí/);
  ui.click('[data-region="1"]');
  const attack = ui.find("#attack-size");
  attack.value = "100";
  attack.dispatchEvent(new ui.w.Event("input", { bubbles: true }));
  attack.dispatchEvent(new ui.w.Event("change", { bubbles: true }));
  assert.match(ui.find("#attack-size-label").textContent, /100 %/);
  ui.click('[data-action="deploy"]');
  ui.click('[data-action="tab:operations"]');
  assert.match(ui.find(".panel-body").textContent, /Vlastní výprava/);
  ui.click('[data-action^="retreat:"]');
  assert.equal(ui.w.document.querySelectorAll(".operation").length, 0);
  ui.dom.window.close();
});
test("UI: selecting source, keyboard and malformed save remain safe", () => {
  const ui = setup("{bad");
  assert.match(ui.find(".notice").textContent, /nelze načíst/);
  ui.click('[data-region="13"]');
  assert.match(ui.find(".panel-heading").textContent, /Jantarový důl/);
  ui.w.document.body.dispatchEvent(
    new ui.w.KeyboardEvent("keydown", {
      code: "Space",
      key: " ",
      bubbles: true,
    }),
  );
  assert.match(ui.find(".live-state").textContent, /SIMULACE BĚŽÍ/);
  ui.dom.window.close();
});
