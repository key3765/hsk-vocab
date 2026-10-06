/* ===========================================================
   srs.js — 間隔反復（ライトナー箱式）
   箱が上がるほど次に出る間隔が伸びる。箱3以上を「習得」と呼ぶ。
   =========================================================== */
window.HSK = window.HSK || {};

(function (ns) {
  "use strict";

  var store = ns.store;

  /* 箱 0..6 に対応する「次に出るまでの日数」 */
  var INTERVALS = [1, 2, 4, 8, 16, 32, 60];
  var MAX_BOX = INTERVALS.length - 1;

  function intervalFor(box) {
    if (box < 0) return 1;
    return INTERVALS[Math.min(box, MAX_BOX)];
  }

  /* 採点を1回分反映する。grade: "again" | "hard" | "good"
     戻り値は、同じ回の中でもう一度出すべきか（again のとき true）。 */
  function grade(id, g, day) {
    day = day || store.today();
    var c = store.card(id);
    var wasNew = c.box < 0;

    c.seen += 1;
    c.last = day;

    if (g === "again") {
      c.ng += 1;
      c.box = 0;
      c.due = day;                        // 当日中にもう一度
    } else if (g === "hard") {
      c.ok += 1;
      c.box = Math.max(0, (wasNew ? 0 : c.box) - 1);
      c.due = store.shiftDays(day, 1);    // 翌日に短く送る
    } else {
      c.ok += 1;
      c.box = Math.min(MAX_BOX, (wasNew ? 0 : c.box) + 1);
      c.due = store.shiftDays(day, intervalFor(c.box));
    }

    store.save();
    return g === "again";
  }

  /* 小テストで間違えた語は「要復習」に引き戻す。
     正解は箱を進めない（学習画面の自己採点と二重に効かせない）。 */
  function quizResult(id, ok, day) {
    day = day || store.today();
    var c = store.card(id);
    c.seen += 1;
    c.last = day;
    if (ok) {
      c.ok += 1;
      if (c.box < 0) { c.box = 0; c.due = store.shiftDays(day, 1); }
    } else {
      c.ng += 1;
      c.box = 0;
      c.due = day;
    }
    store.save();
  }

  /* その日に出す順番を組む。
     復習期限が来たものを先に、残りを未学習で埋める。 */
  function buildSession(pool, limit, day) {
    day = day || store.today();
    var due = [], fresh = [], i, id;

    for (i = 0; i < pool.length; i++) {
      id = pool[i].id;
      if (store.isDue(id, day)) due.push(pool[i]);
      else if (!store.hasCard(id) || store.card(id).box < 0) fresh.push(pool[i]);
    }

    /* 期限超過が長いものから先に */
    due.sort(function (a, b) {
      var da = store.card(a.id).due || "", db = store.card(b.id).due || "";
      return da < db ? -1 : da > db ? 1 : 0;
    });

    var out = due.slice(0, limit);
    if (out.length < limit) out = out.concat(fresh.slice(0, limit - out.length));
    return out;
  }

  function counts(pool, day) {
    day = day || store.today();
    var r = { total: pool.length, due: 0, fresh: 0, learn: 0, mature: 0 };
    for (var i = 0; i < pool.length; i++) {
      var id = pool[i].id, st = store.stage(id);
      if (st === "new") r.fresh += 1;
      else if (st === "mature") r.mature += 1;
      else r.learn += 1;
      if (store.isDue(id, day)) r.due += 1;
    }
    return r;
  }

  ns.srs = {
    INTERVALS: INTERVALS,
    intervalFor: intervalFor,
    grade: grade,
    quizResult: quizResult,
    buildSession: buildSession,
    counts: counts
  };
})(window.HSK);
