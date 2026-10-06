/* ===========================================================
   store.js — 学習記録の保存と読み出し
   保存先は端末内の localStorage のみ。サーバーへは何も送らない。
   =========================================================== */
window.HSK = window.HSK || {};

(function (ns) {
  "use strict";

  var KEY = "hsk-vocab:v1";

  /* ---- 日付: 端末のローカル時刻で YYYY-MM-DD ---- */
  function today() { return toKey(new Date()); }

  function toKey(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }

  function shiftDays(key, n) {
    var p = key.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return toKey(d);
  }

  function daysBetween(a, b) {
    var pa = a.split("-"), pb = b.split("-");
    var da = Date.UTC(+pa[0], +pa[1] - 1, +pa[2]);
    var db = Date.UTC(+pb[0], +pb[1] - 1, +pb[2]);
    return Math.round((db - da) / 86400000);
  }

  function defaults() {
    return {
      v: 1,
      settings: {
        levels: [1, 2],      // 出題対象の級
        goal: 20,            // 1日の目標カード数
        dir: "zh2ja",        // 小テストの向き: zh2ja / ja2zh / mix
        showPinyin: false,   // 表面にピンインを出すか
        theme: "auto"        // auto / light / dark
      },
      cards: {},             // id -> { box, due, seen, ok, ng, last }
      log: {},               // YYYY-MM-DD -> { studied, quiz }
      streak: { cur: 0, best: 0, last: "" }
    };
  }

  var state = defaults();
  var available = true;

  function load() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(KEY);
    } catch (e) {
      available = false;      // プライベートモードなどで触れない場合
      state = defaults();
      return state;
    }
    if (!raw) { state = defaults(); return state; }
    try {
      var saved = JSON.parse(raw);
      var base = defaults();
      state = {
        v: 1,
        settings: merge(base.settings, saved.settings),
        cards: saved.cards && typeof saved.cards === "object" ? saved.cards : {},
        log: saved.log && typeof saved.log === "object" ? saved.log : {},
        streak: merge(base.streak, saved.streak)
      };
      var lv = state.settings.levels;
      if (!Array.isArray(lv) || !lv.length) state.settings.levels = [1, 2];
    } catch (e) {
      state = defaults();     // 壊れた保存データは捨てて作り直す
    }
    return state;
  }

  function merge(base, over) {
    var out = {}, k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    if (over && typeof over === "object") {
      for (k in over) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = over[k];
    }
    return out;
  }

  var saveTimer = null;
  function save() {
    if (!available) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      try {
        window.localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        available = false;
      }
    }, 120);
  }

  function saveNow() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!available) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { available = false; }
  }

  /* ---- カード記録 ---- */
  function card(id) {
    var c = state.cards[id];
    if (!c) {
      c = { box: -1, due: "", seen: 0, ok: 0, ng: 0, last: "" };
      state.cards[id] = c;
    }
    return c;
  }

  function hasCard(id) { return !!state.cards[id]; }

  /* box: -1=未学習 / 0〜2=学習中 / 3以上=習得 */
  function stage(id) {
    var c = state.cards[id];
    if (!c || c.box < 0) return "new";
    if (c.box >= 3) return "mature";
    return "learn";
  }

  function isDue(id, day) {
    var c = state.cards[id];
    if (!c || c.box < 0) return false;
    return !c.due || c.due <= (day || today());
  }

  /* ---- 1日の記録と連続日数 ---- */
  function logDay(day) {
    var d = state.log[day];
    if (!d) { d = { studied: 0, quiz: 0 }; state.log[day] = d; }
    return d;
  }

  function countStudied(day) { return (state.log[day] || {}).studied || 0; }

  /* 学習が1枚でも進んだ日に連続日数を更新する */
  function touchStreak(day) {
    var s = state.streak;
    if (s.last === day) return s;
    if (s.last && daysBetween(s.last, day) === 1) s.cur += 1;
    else s.cur = 1;
    s.last = day;
    if (s.cur > s.best) s.best = s.cur;
    return s;
  }

  /* 連続が途切れていれば表示用に 0 とみなす（記録自体は残す） */
  function liveStreak(day) {
    var s = state.streak;
    if (!s.last) return 0;
    var gap = daysBetween(s.last, day);
    return (gap === 0 || gap === 1) ? s.cur : 0;
  }

  function recentDays(n, day) {
    var out = [], i;
    for (i = n - 1; i >= 0; i--) {
      var k = shiftDays(day, -i);
      out.push({ day: k, studied: countStudied(k), quiz: (state.log[k] || {}).quiz || 0 });
    }
    return out;
  }

  function reset() {
    state = defaults();
    saveNow();
    return state;
  }

  ns.store = {
    load: load,
    save: save,
    saveNow: saveNow,
    reset: reset,
    get state() { return state; },
    get available() { return available; },
    get settings() { return state.settings; },
    card: card,
    hasCard: hasCard,
    stage: stage,
    isDue: isDue,
    logDay: logDay,
    countStudied: countStudied,
    touchStreak: touchStreak,
    liveStreak: liveStreak,
    recentDays: recentDays,
    today: today,
    toKey: toKey,
    shiftDays: shiftDays,
    daysBetween: daysBetween
  };
})(window.HSK);
