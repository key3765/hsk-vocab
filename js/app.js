/* ===========================================================
   app.js — 画面の組み立てと操作
   =========================================================== */
window.HSK = window.HSK || {};

(function (ns) {
  "use strict";

  var store = ns.store, srs = ns.srs, ads = ns.ads;

  /* -------------------------------------------------- 語彙 */
  var WORDS = [];

  function buildWords() {
    var src = window.HSK_DATA || {};
    [[1, src.hsk1], [2, src.hsk2]].forEach(function (pair) {
      var level = pair[0], list = pair[1] || [];
      list.forEach(function (w) {
        WORDS.push({
          id: level + ":" + w.w,
          level: level,
          w: w.w, p: w.p, j: w.j, pos: w.pos,
          ez: w.ez, ep: w.ep, ej: w.ej
        });
      });
    });
  }

  function levelWords(level) {
    return WORDS.filter(function (x) { return x.level === level; });
  }

  function pool() {
    var lv = store.settings.levels;
    return WORDS.filter(function (x) { return lv.indexOf(x.level) !== -1; });
  }

  /* -------------------------------------------------- 小物 */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function hanziClass(w) { return w.length > 4 ? "card__hanzi card__hanzi--long" : "card__hanzi"; }

  var WD = ["日", "月", "火", "水", "木", "金", "土"];
  function weekdayOf(key) {
    var p = key.split("-");
    return WD[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];
  }

  var ICON = {
    cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="14" height="13" rx="2"/><path d="M7 4h12a2 2 0 0 1 2 2v11"/></svg>',
    list:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V11M10 20V5M16 20v-6M22 20H2"/></svg>',
    /* 歯車は小さく描くと太陽に見えるので、つまみ（スライダー）の形にする */
    gear:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/></svg>',
    back:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  /* -------------------------------------------------- 画面の状態 */
  var el = {};
  var view = "home";
  var session = null;
  var quiz = null;
  var listUI = { q: "", filter: "all" };
  var detailId = null;
  var sheet = null;         // "settings" | "detail" | null
  var toastTimer = null;

  function day() { return store.today(); }

  /* -------------------------------------------------- テーマ */
  function applyTheme() {
    var t = store.settings.theme;
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }

  /* -------------------------------------------------- トースト */
  function toast(msg) {
    var old = document.querySelector(".toast");
    if (old) old.remove();
    if (toastTimer) clearTimeout(toastTimer);
    var n = document.createElement("div");
    n.className = "toast";
    n.setAttribute("role", "status");
    n.textContent = msg;
    document.body.appendChild(n);
    toastTimer = setTimeout(function () { n.remove(); toastTimer = null; }, 2200);
  }

  /* ==================================================
     ホーム
     ================================================== */
  function sessionSize() {
    var remaining = Math.max(0, store.settings.goal - store.countStudied(day()));
    return remaining > 0 ? remaining : 10;
  }

  function renderHome() {
    var p = pool();
    var c = srs.counts(p, day());
    var doneToday = store.countStudied(day());
    var goal = store.settings.goal;
    var streak = store.liveStreak(day());
    var ready = Math.min(sessionSize(), c.due + c.fresh);

    var pct = goal > 0 ? Math.min(1, doneToday / goal) : 0;
    var R = 48, CIRC = 2 * Math.PI * R;
    var offset = CIRC * (1 - pct);

    var weak = p.filter(function (x) {
      return store.hasCard(x.id) && store.card(x.id).ng > 0;
    }).length;

    var startLabel = doneToday >= goal
      ? "もう少し続ける（" + ready + "語）"
      : "今日の学習をはじめる（" + ready + "語）";

    var html = "";

    /* 今日の面 */
    html += '<section class="today">' +
      '<div class="ring">' +
        '<svg viewBox="0 0 112 112" aria-hidden="true">' +
          '<circle class="ring__track" cx="56" cy="56" r="' + R + '"/>' +
          '<circle class="ring__bar" cx="56" cy="56" r="' + R + '" ' +
            'stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '"/>' +
        '</svg>' +
        '<div class="ring__label"><span class="ring__num">' + doneToday + '</span>' +
        '<span class="ring__den">/ ' + goal + ' 語</span></div>' +
      '</div>' +
      '<div class="today__body">' +
        '<p class="eyebrow">今日</p>' +
        '<div class="streak-row">' + sealHtml(streak) +
          '<div class="streak-row__text">' +
            '<p class="today__line">' + (streak > 0
              ? "<b>" + streak + "</b> 日連続で学習中"
              : "今日はじめると <b>1</b> 日目") + '</p>' +
            '<p class="note">' + (doneToday >= goal ? "目標達成。えらい。" : "あと " + (goal - doneToday) + " 語で目標") + '</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';

    /* 入口 */
    html += '<div class="start-stack">';
    if (ready > 0) {
      html += '<button class="btn btn--primary btn--block" data-go="study-normal">' + esc(startLabel) + '</button>';
    } else {
      html += '<button class="btn btn--primary btn--block" disabled>今日の復習は終わりました</button>';
    }
    html += '<div class="quick-row">' +
      '<button class="btn" data-go="quiz">小テスト 10問</button>' +
      '<button class="btn" data-go="study-weak"' + (weak === 0 ? " disabled" : "") + '>' +
        (weak === 0 ? "弱点なし" : "弱点 " + weak + "語") + '</button>' +
    '</div>';
    html += '<p class="today__line" style="text-align:center">復習の期限 <b>' + c.due + '</b> 語 ・ 未学習 <b>' + c.fresh + '</b> 語</p>';
    html += '</div>';

    /* 級の切替と進捗 */
    html += '<section class="breakdown">' +
      '<div class="section-head"><h2 class="h">出題する級</h2>' +
      '<span class="note tnum">' + p.length + ' 語</span></div>' +
      '<div class="levels">' + levelChips() + '</div>' +
      meterHtml(c) +
    '</section>';

    html += ads.slotHtml("home");

    html += '<p class="foot">記録はこの端末の中だけに保存されます。<br>' +
      (store.available ? "" : "※ ブラウザの設定により保存できません。学習は続けられますが記録は残りません。") + '</p>';

    el.screen.className = "screen";
    el.screen.innerHTML = html;
  }

  function sealHtml(streak, extraClass) {
    var cls = "seal" + (streak > 0 ? "" : " seal--zero") + (extraClass ? " " + extraClass : "");
    return '<div class="' + cls + '" aria-label="連続 ' + streak + ' 日">' +
      '<span class="seal__n">' + streak + '</span><span class="seal__u">日連続</span></div>';
  }

  function levelChips() {
    return [1, 2].map(function (lv) {
      var on = store.settings.levels.indexOf(lv) !== -1;
      var n = levelWords(lv).length;
      return '<button class="chip" data-level="' + lv + '" aria-pressed="' + on + '">' +
        'HSK ' + lv + '<span class="chip__n">' + n + '</span></button>';
    }).join("");
  }

  function meterHtml(c) {
    var t = Math.max(1, c.total);
    var pct = function (n) { return (n / t * 100).toFixed(2) + "%"; };
    return '<div class="meter" role="img" aria-label="未学習 ' + c.fresh + '語、学習中 ' + c.learn + '語、習得 ' + c.mature + '語">' +
      '<span class="meter__mature" style="width:' + pct(c.mature) + '"></span>' +
      '<span class="meter__learn" style="width:' + pct(c.learn) + '"></span>' +
      '<span class="meter__new" style="width:' + pct(c.fresh) + '"></span>' +
    '</div>' +
    '<div class="legend">' +
      '<span><i style="background:var(--jade)"></i>習得 ' + c.mature + '</span>' +
      '<span><i style="background:var(--warn)"></i>学習中 ' + c.learn + '</span>' +
      '<span><i style="background:var(--line-2)"></i>未学習 ' + c.fresh + '</span>' +
    '</div>';
  }

  /* ==================================================
     学習（フラッシュカード）
     ================================================== */
  function startStudy(mode) {
    var p = pool(), items;

    if (mode === "weak") {
      items = p.filter(function (x) {
        return store.hasCard(x.id) && store.card(x.id).ng > 0;
      }).sort(function (a, b) {
        return store.card(b.id).ng - store.card(a.id).ng;
      }).slice(0, Math.max(10, store.settings.goal));
    } else {
      items = srs.buildSession(p, sessionSize(), day());
    }

    if (!items.length) { toast("出題できる語がありません"); return; }

    session = { queue: items.slice(), total: items.length, done: 0, revealed: false, again: 0, mode: mode };
    go("study");
  }

  function renderStudy() {
    if (!session) { go("home"); return; }

    if (!session.queue.length) { renderFinish(); return; }

    var w = session.queue[0];
    var pctDone = session.total ? (session.done / session.total * 100) : 0;
    var showPinyinFront = store.settings.showPinyin;

    var body = '<div class="study__bar">' +
      '<span>' + session.done + ' / ' + session.total + '</span>' +
      '<span class="study__track"><span class="study__fill" style="width:' + pctDone.toFixed(1) + '%"></span></span>' +
      '<span>HSK ' + w.level + '</span>' +
    '</div>';

    body += '<div class="card" data-level="' + w.level + '" data-act="reveal" role="button" tabindex="0" ' +
      'aria-label="タップして答えを表示">';
    body += '<p class="' + hanziClass(w.w) + '">' + esc(w.w) + '</p>';

    if (session.revealed) {
      body += '<div class="reveal-fade" style="display:flex;flex-direction:column;gap:12px">' +
        '<p class="card__pinyin">' + esc(w.p) + '</p>' +
        '<span class="pos-chip">' + esc(w.pos) + '</span>' +
        '<p class="card__ja">' + esc(w.j) + '</p>' +
        '<div class="example">' +
          '<span class="example__zh">' + esc(w.ez) + '</span>' +
          '<span class="example__py">' + esc(w.ep) + '</span>' +
          '<span class="example__ja">' + esc(w.ej) + '</span>' +
        '</div>' +
      '</div>';
    } else {
      if (showPinyinFront) body += '<p class="card__pinyin">' + esc(w.p) + '</p>';
      body += '<p class="card__hint">タップして意味を確認</p>';
    }
    body += '</div>';

    if (session.revealed) {
      body += '<div class="grade reveal-fade">' +
        '<button class="g-again" data-grade="again">わからない<small>もう一度</small></button>' +
        '<button class="g-hard" data-grade="hard">あいまい<small>明日</small></button>' +
        '<button class="g-good" data-grade="good">わかる<small>' + nextLabel(w.id) + '</small></button>' +
      '</div>';
    } else {
      body += '<button class="btn btn--primary btn--block" data-act="reveal">意味を見る</button>';
    }

    el.screen.className = "screen screen--flush";
    el.screen.innerHTML = '<div class="study">' + body + '</div>';
  }

  /* 「わかる」を押したとき次に出る間隔の目安 */
  function nextLabel(id) {
    var c = store.hasCard(id) ? store.card(id) : null;
    var nextBox = c && c.box >= 0 ? c.box + 1 : 0;
    var d = srs.intervalFor(nextBox);
    return d >= 30 ? Math.round(d / 30) + "か月後" : d + "日後";
  }

  function doGrade(g) {
    if (!session || !session.revealed || !session.queue.length) return;
    var w = session.queue[0];
    var repeat = srs.grade(w.id, g, day());

    if (repeat) {
      session.again += 1;
      session.queue.push(session.queue.shift());   // 同じ回の最後へ回す
    } else {
      session.queue.shift();
      session.done += 1;
      store.logDay(day()).studied += 1;
      store.touchStreak(day());
      store.save();
    }
    session.revealed = false;
    render();
  }

  function renderFinish() {
    var streak = store.liveStreak(day());
    var doneToday = store.countStudied(day());
    var goal = store.settings.goal;
    var p = pool();
    var tomorrow = p.filter(function (x) {
      return store.hasCard(x.id) && store.card(x.id).box >= 0 && store.card(x.id).due === store.shiftDays(day(), 1);
    }).length;

    var html = '<div class="finish">' +
      sealHtml(streak, "finish__seal") +
      '<h2>' + session.total + ' 語 おつかれさま</h2>' +
      '<p class="note">今日の学習 ' + doneToday + ' / ' + goal + ' 語' +
        (session.again ? ' ・ 言い直し ' + session.again + ' 回' : '') + '</p>' +
      '<p class="note">明日の復習は ' + tomorrow + ' 語の予定です。</p>' +
      '<div class="start-stack" style="width:100%;max-width:320px;margin-top:8px">' +
        '<button class="btn btn--primary btn--block" data-go="quiz">覚えたか小テストで確認</button>' +
        '<div class="quick-row">' +
          '<button class="btn" data-go="study-normal">もう少し続ける</button>' +
          '<button class="btn" data-go="home">ホームへ</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    el.screen.className = "screen screen--flush";
    el.screen.innerHTML = html;
  }

  /* ==================================================
     小テスト
     ================================================== */
  function buildQuiz(n) {
    var p = pool();
    if (p.length < 4) return null;

    /* 学習済みを優先して出す。足りなければ全体から補う。 */
    var studied = p.filter(function (x) { return store.stage(x.id) !== "new"; });
    var source = studied.length >= 4 ? studied.slice() : p.slice();
    shuffle(source);
    var picked = source.slice(0, Math.min(n, source.length));

    var dirSetting = store.settings.dir;
    var qs = picked.map(function (w) {
      var dir = dirSetting === "mix" ? (Math.random() < 0.5 ? "zh2ja" : "ja2zh") : dirSetting;

      /* 同じ表示にならない誤答を3つ選ぶ */
      var key = dir === "zh2ja" ? "j" : "w";
      var others = p.filter(function (x) { return x.id !== w.id && x[key] !== w[key]; });
      shuffle(others);
      var picks = [], used = {};
      used[w[key]] = true;
      for (var i = 0; i < others.length && picks.length < 3; i++) {
        if (used[others[i][key]]) continue;
        used[others[i][key]] = true;
        picks.push(others[i]);
      }
      var choices = shuffle(picks.concat([w]));
      return { w: w, dir: dir, choices: choices, answer: choices.indexOf(w), picked: -1 };
    });

    return { qs: qs, i: 0, score: 0, wrong: [] };
  }

  function startQuiz() {
    var q = buildQuiz(10);
    if (!q) { toast("出題できる語が足りません"); return; }
    quiz = q;
    go("quiz");
  }

  function renderQuiz() {
    if (!quiz) { go("home"); return; }
    if (quiz.i >= quiz.qs.length) { renderQuizResult(); return; }

    var q = quiz.qs[quiz.i];
    var w = q.w;
    var answered = q.picked !== -1;

    var promptHtml = q.dir === "zh2ja"
      ? '<div class="q-han">' + esc(w.w) + '</div>' +
        (store.settings.showPinyin || answered ? '<div class="card__pinyin">' + esc(w.p) + '</div>' : '') +
        '<div class="q-sub">意味はどれ？</div>'
      : '<div class="q-ja">' + esc(w.j) + '</div>' +
        '<div class="q-sub">中国語はどれ？</div>';

    var html = '<div class="quiz">';
    html += '<div class="study__bar">' +
      '<span>第 ' + (quiz.i + 1) + ' / ' + quiz.qs.length + ' 問</span>' +
      '<span class="study__track"><span class="study__fill" style="width:' +
        (quiz.i / quiz.qs.length * 100).toFixed(1) + '%"></span></span>' +
      '<span class="tnum">正解 ' + quiz.score + '</span>' +
    '</div>';

    html += '<div class="quiz__prompt">' + promptHtml + '</div>';

    html += '<div class="choices">';
    q.choices.forEach(function (c, idx) {
      var cls = "choice";
      if (answered) {
        if (idx === q.answer) cls += " is-correct";
        else if (idx === q.picked) cls += " is-wrong";
      }
      var text = q.dir === "zh2ja"
        ? esc(c.j)
        : '<span class="han">' + esc(c.w) + '</span>';
      html += '<button class="' + cls + '" data-choice="' + idx + '"' + (answered ? " disabled" : "") + '>' +
        '<span class="choice__key">' + (idx + 1) + '</span>' +
        '<span class="choice__text">' + text + '</span>' +
      '</button>';
    });
    html += '</div>';

    if (answered) {
      var ok = q.picked === q.answer;
      html += '<p class="quiz__feedback" data-ok="' + (ok ? 1 : 0) + '">' +
        (ok ? "正解" : "正解は「" + esc(q.dir === "zh2ja" ? w.j : w.w) + "」") + '</p>';
      html += '<div class="example">' +
        '<span class="example__zh">' + esc(w.ez) + '</span>' +
        '<span class="example__py">' + esc(w.ep) + '</span>' +
        '<span class="example__ja">' + esc(w.ej) + '</span>' +
      '</div>';
      html += '<button class="btn btn--primary btn--block" data-act="quiz-next">' +
        (quiz.i + 1 >= quiz.qs.length ? "結果を見る" : "次の問題") + '</button>';
    } else {
      html += '<p class="quiz__feedback">&nbsp;</p>';
    }

    html += '</div>';
    el.screen.className = "screen screen--flush";
    el.screen.innerHTML = html;
  }

  function answerQuiz(idx) {
    if (!quiz) return;
    var q = quiz.qs[quiz.i];
    if (!q || q.picked !== -1) return;

    q.picked = idx;
    var ok = idx === q.answer;
    if (ok) quiz.score += 1;
    else quiz.wrong.push(q.w);

    srs.quizResult(q.w.id, ok, day());
    store.logDay(day()).quiz += 1;
    store.touchStreak(day());
    store.save();
    render();
  }

  function renderQuizResult() {
    var total = quiz.qs.length;
    var pct = Math.round(quiz.score / total * 100);
    var verdict = pct >= 90 ? "この調子なら合格圏です"
      : pct >= 70 ? "もう少しで固まります"
      : "間違えた語を今日のうちに一周しましょう";

    var html = '<div class="quiz">';
    html += '<p class="eyebrow">小テストの結果</p>';
    html += '<div class="score-big">' + quiz.score + '<span style="font-size:24px;color:var(--muted)"> / ' + total + '</span>' +
      '<small>正答率 ' + pct + '%</small></div>';
    html += '<p class="note" style="text-align:center">' + verdict + '</p>';

    if (quiz.wrong.length) {
      html += '<div class="section-head"><h2 class="h">間違えた語</h2>' +
        '<span class="note">要復習に戻しました</span></div>';
      html += '<div class="wrong-list">';
      quiz.wrong.forEach(function (w) { html += wordRowHtml(w, true); });
      html += '</div>';
      html += '<button class="btn btn--primary btn--block" data-go="study-weak">弱点だけ復習する</button>';
    } else {
      html += '<button class="btn btn--primary btn--block" data-act="quiz-again">もう10問</button>';
    }

    html += '<div class="quick-row">' +
      '<button class="btn" data-act="quiz-again">もう一度</button>' +
      '<button class="btn" data-go="home">ホームへ</button>' +
    '</div>';

    html += ads.slotHtml("result");
    html += '</div>';

    el.screen.className = "screen screen--flush";
    el.screen.innerHTML = html;
  }

  /* ==================================================
     一覧
     ================================================== */
  var FILTERS = [
    { k: "all", label: "すべて" },
    { k: "due", label: "要復習" },
    { k: "new", label: "未学習" },
    { k: "learn", label: "学習中" },
    { k: "mature", label: "習得" }
  ];

  function filteredWords() {
    var q = listUI.q.trim().toLowerCase();
    var f = listUI.filter;
    return pool().filter(function (w) {
      if (f === "due" && !store.isDue(w.id, day())) return false;
      if (f !== "all" && f !== "due" && store.stage(w.id) !== f) return false;
      if (!q) return true;
      return w.w.indexOf(q) !== -1 ||
        w.p.toLowerCase().indexOf(q) !== -1 ||
        w.j.toLowerCase().indexOf(q) !== -1;
    });
  }

  function badgeHtml(id) {
    if (store.isDue(id, day())) return '<span class="badge badge--due">要復習</span>';
    var st = store.stage(id);
    if (st === "mature") return '<span class="badge badge--mature">習得</span>';
    if (st === "learn") return '<span class="badge badge--learn">学習中</span>';
    return '<span class="badge badge--new">未学習</span>';
  }

  function wordRowHtml(w, plain) {
    return '<button class="word-row" data-word="' + esc(w.id) + '">' +
      '<span class="word-row__han">' + esc(w.w) + '</span>' +
      '<span class="word-row__mid">' +
        '<span class="word-row__py">' + esc(w.p) + '</span><br>' +
        '<span class="word-row__ja">' + esc(w.j) + '</span>' +
      '</span>' +
      (plain ? '<span class="badge badge--due">要復習</span>' : badgeHtml(w.id)) +
    '</button>';
  }

  function renderList() {
    var rows = filteredWords();

    var html = '<div class="search">' + ICON.search +
      '<input id="list-search" type="search" inputmode="search" placeholder="漢字・ピンイン・意味で探す" ' +
      'value="' + esc(listUI.q) + '" aria-label="単語を検索">' +
    '</div>';

    html += '<div class="filters">' + FILTERS.map(function (f) {
      return '<button class="chip" data-filter="' + f.k + '" aria-pressed="' +
        (listUI.filter === f.k) + '">' + f.label + '</button>';
    }).join("") + '</div>';

    html += '<div class="section-head"><h2 class="h">単語一覧</h2>' +
      '<span class="note tnum">' + rows.length + ' 語</span></div>';

    if (!rows.length) {
      html += '<p class="empty">該当する語がありません。<br>検索語や絞り込みを変えてみてください。</p>';
    } else {
      html += '<div class="word-list">' + rows.map(function (w) { return wordRowHtml(w); }).join("") + '</div>';
    }

    html += ads.slotHtml("list");

    el.screen.className = "screen";
    el.screen.innerHTML = html;
  }

  /* ==================================================
     記録
     ================================================== */
  function renderStats() {
    var p = pool();
    var c = srs.counts(p, day());
    var s = store.state.streak;
    var streak = store.liveStreak(day());
    var days = store.recentDays(7, day());

    var totalSeen = 0, totalOk = 0, totalNg = 0;
    Object.keys(store.state.cards).forEach(function (k) {
      var cc = store.state.cards[k];
      totalSeen += cc.seen; totalOk += cc.ok; totalNg += cc.ng;
    });
    var acc = (totalOk + totalNg) > 0 ? Math.round(totalOk / (totalOk + totalNg) * 100) : 0;

    var max = Math.max(1, days.reduce(function (m, d) { return Math.max(m, d.studied); }, 0));

    var html = '<div class="kpi-grid">' +
      kpi(streak, "日", "連続学習") +
      kpi(s.best, "日", "最長連続") +
      kpi(c.mature, "語", "習得した語") +
      kpi(acc, "%", "これまでの正答率") +
    '</div>';

    html += '<div class="section-head"><h2 class="h">この7日間</h2>' +
      '<span class="note">1日の学習語数</span></div>';
    html += '<div class="bars">' + days.map(function (d, i) {
      var h = Math.round(d.studied / max * 72);
      var isToday = i === days.length - 1;
      return '<div class="bars__col' + (isToday ? ' bars__col--today' : '') + '">' +
        '<span class="bars__n">' + (d.studied || "") + '</span>' +
        '<span class="bars__bar" style="height:' + Math.max(3, h) + 'px"></span>' +
        '<span class="bars__d">' + weekdayOf(d.day) + '</span>' +
      '</div>';
    }).join("") + '</div>';

    html += '<div class="section-head"><h2 class="h">級ごとの進み</h2></div>';
    [1, 2].forEach(function (lv) {
      var lc = srs.counts(levelWords(lv), day());
      var done = Math.round(lc.mature / Math.max(1, lc.total) * 100);
      html += '<section class="breakdown">' +
        '<div class="section-head"><h2 class="h" style="font-size:14px">HSK ' + lv + '</h2>' +
        '<span class="note tnum">習得 ' + lc.mature + ' / ' + lc.total + ' 語（' + done + '%）</span></div>' +
        meterHtml(lc) +
      '</section>';
    });

    html += '<div class="kpi-grid">' +
      kpi(totalSeen, "回", "のべ回答数") +
      kpi(c.due, "語", "いま要復習") +
    '</div>';

    html += '<p class="foot">「習得」は間隔反復の箱が3段目まで上がった語です。<br>' +
      '次に出る間隔は ' + srs.INTERVALS.join("・") + ' 日と伸びていきます。</p>';

    el.screen.className = "screen";
    el.screen.innerHTML = html;
  }

  function kpi(v, unit, label) {
    return '<div class="kpi"><div class="kpi__v">' + v + '<small>' + unit + '</small></div>' +
      '<div class="kpi__k">' + label + '</div></div>';
  }

  /* ==================================================
     シート（設定・語の詳細）
     ================================================== */
  function openSheet(kind) { sheet = kind; renderSheet(); }

  function closeSheet() {
    sheet = null; detailId = null;
    el.sheet.innerHTML = "";
    el.sheet.hidden = true;
  }

  function renderSheet() {
    if (!sheet) { closeSheet(); return; }
    el.sheet.hidden = false;
    /* 背景は data-act を持たせない。シート内の余白を押したときに
       closest() が背景を拾って閉じてしまうのを避けるため。 */
    el.sheet.innerHTML = '<div class="sheet-wrap">' +
      '<div class="sheet" role="dialog" aria-modal="true" aria-label="' +
      (sheet === "settings" ? "設定" : "単語の詳細") + '">' +
      (sheet === "settings" ? settingsHtml() : detailHtml()) +
      '</div></div>';
  }

  function settingsHtml() {
    var st = store.settings;
    var html = '<div class="section-head"><h2 class="h">設定</h2>' +
      '<button class="icon-btn" data-act="sheet-close" aria-label="閉じる">' + ICON.close + '</button></div>';

    html += '<div class="field"><span class="field__label">出題する級</span>' +
      '<div class="levels">' + levelChips() + '</div>' +
      '<span class="field__help">少なくとも1つは選んでください。</span></div>';

    html += '<div class="field"><span class="field__label">1日の目標</span>' +
      '<div class="stepper">' +
        '<button data-act="goal-" aria-label="目標を減らす">−</button>' +
        '<span class="stepper__v">' + st.goal + ' 語</span>' +
        '<button data-act="goal+" aria-label="目標を増やす">＋</button>' +
      '</div>' +
      '<span class="field__help">10〜20語なら3〜5分で終わります。続けやすい量から始めるのが近道です。</span></div>';

    html += '<div class="field"><span class="field__label">小テストの向き</span>' +
      '<div class="seg">' +
        segBtn("dir", "zh2ja", "中 → 日") +
        segBtn("dir", "ja2zh", "日 → 中") +
        segBtn("dir", "mix", "混ぜる") +
      '</div>' +
      '<span class="field__help">「日 → 中」は書く・話す力につながります。</span></div>';

    html += '<div class="field"><span class="field__label">カードの表にピンイン</span>' +
      '<div class="seg">' +
        segBtn("showPinyin", true, "出す") +
        segBtn("showPinyin", false, "隠す") +
      '</div>' +
      '<span class="field__help">隠すほうが音の記憶は固まります。</span></div>';

    html += '<div class="field"><span class="field__label">配色</span>' +
      '<div class="seg">' +
        segBtn("theme", "auto", "端末に合わせる") +
        segBtn("theme", "light", "明るい") +
        segBtn("theme", "dark", "暗い") +
      '</div></div>';

    html += '<hr class="hr">';
    html += '<button class="btn danger btn--block" data-act="reset">学習記録をすべて消す</button>';
    html += '<p class="foot">HSK 2.0 準拠 ・ 収録 ' + WORDS.length + ' 語。<br>記録は端末内にのみ保存されます。</p>';
    return html;
  }

  function segBtn(key, val, label) {
    var cur = store.settings[key];
    var on = String(cur) === String(val);
    return '<button data-set="' + key + '" data-val="' + String(val) + '" aria-pressed="' + on + '">' + label + '</button>';
  }

  function detailHtml() {
    var w = WORDS.filter(function (x) { return x.id === detailId; })[0];
    if (!w) return '<p class="empty">単語が見つかりません。</p>';
    var c = store.hasCard(w.id) ? store.card(w.id) : null;

    var sched = !c || c.box < 0 ? "まだ出題していません"
      : (c.due <= day() ? "いま要復習" : c.due + " に出題予定");

    var html = '<div class="section-head"><h2 class="h">単語</h2>' +
      '<button class="icon-btn" data-act="sheet-close" aria-label="閉じる">' + ICON.close + '</button></div>';

    html += '<div class="detail">' +
      '<p class="' + hanziClass(w.w) + '">' + esc(w.w) + '</p>' +
      '<p class="card__pinyin">' + esc(w.p) + '</p>' +
      '<span class="pos-chip">' + esc(w.pos) + ' ・ HSK ' + w.level + '</span>' +
      '<p class="card__ja">' + esc(w.j) + '</p>' +
      '<div class="example">' +
        '<span class="example__zh">' + esc(w.ez) + '</span>' +
        '<span class="example__py">' + esc(w.ep) + '</span>' +
        '<span class="example__ja">' + esc(w.ej) + '</span>' +
      '</div>' +
    '</div>';

    html += '<div class="kpi-grid">' +
      kpi(c ? c.ok : 0, "回", "正解") +
      kpi(c ? c.ng : 0, "回", "間違い") +
    '</div>';

    html += '<p class="note" style="text-align:center">' + badgeHtml(w.id) + ' ' + esc(sched) + '</p>';

    html += '<div class="quick-row">' +
      '<button class="btn" data-act="mark-due">要復習にする</button>' +
      '<button class="btn" data-act="mark-mature">習得にする</button>' +
    '</div>';
    return html;
  }

  /* ==================================================
     描画と遷移
     ================================================== */
  var TABS = [
    { k: "home", label: "学習", icon: "cards" },
    { k: "list", label: "一覧", icon: "list" },
    { k: "stats", label: "記録", icon: "chart" }
  ];

  function tabFor(v) {
    if (v === "study" || v === "quiz") return "home";
    return v;
  }

  function renderTabs() {
    var due = srs.counts(pool(), day()).due;
    el.tabbar.innerHTML = TABS.map(function (t) {
      var cur = tabFor(view) === t.k;
      var dot = (t.k === "home" && due > 0)
        ? '<span class="tab-dot">' + (due > 99 ? "99+" : due) + '</span>' : "";
      return '<button data-tab="' + t.k + '"' + (cur ? ' aria-current="page"' : '') + '>' +
        ICON[t.icon] + '<span>' + t.label + '</span>' + dot + '</button>';
    }).join("");
  }

  function renderTopbar() {
    var inFlow = view === "study" || view === "quiz";
    var title = view === "study" ? "学習中"
      : view === "quiz" ? "小テスト"
      : view === "list" ? "単語一覧"
      : view === "stats" ? "学習の記録"
      : "HSK 単語帳";

    var left = inFlow
      ? '<button class="icon-btn" data-act="leave" aria-label="やめる">' + ICON.back + '</button>'
      : '';

    el.topbar.innerHTML = left +
      '<h1 class="topbar__title">' + (inFlow ? "" : '<span class="cn">汉语</span>') + esc(title) + '</h1>' +
      '<span class="topbar__spacer"></span>' +
      '<button class="icon-btn" data-act="settings" aria-label="設定">' + ICON.gear + '</button>';
  }

  function render() {
    renderTopbar();
    if (view === "home") renderHome();
    else if (view === "study") renderStudy();
    else if (view === "quiz") renderQuiz();
    else if (view === "list") renderList();
    else if (view === "stats") renderStats();
    renderTabs();
    renderSheet();
    ads.refresh(el.screen);
  }

  function go(v) {
    view = v;
    window.scrollTo(0, 0);
    render();
  }

  /* ==================================================
     操作の受け取り
     ================================================== */
  function onClick(e) {
    var t = e.target;

    var hit = function (attr) {
      var n = t.closest ? t.closest("[" + attr + "]") : null;
      return n ? n.getAttribute(attr) : null;
    };

    /* シートの外側 */
    if (t.classList && t.classList.contains("sheet-wrap")) { closeSheet(); return; }

    var act = hit("data-act");
    var tab = hit("data-tab");
    var goTo = hit("data-go");
    var grade = hit("data-grade");
    var choice = hit("data-choice");
    var filter = hit("data-filter");
    var wordId = hit("data-word");
    var levelBtn = hit("data-level");
    var setKey = hit("data-set");

    if (setKey !== null) {
      var node = t.closest("[data-set]");
      var raw = node.getAttribute("data-val");
      var val = raw === "true" ? true : raw === "false" ? false : raw;
      store.settings[setKey] = val;
      store.save();
      if (setKey === "theme") applyTheme();
      render();
      return;
    }

    if (levelBtn !== null && t.closest(".chip")) {
      var lv = +levelBtn;
      var arr = store.settings.levels.slice();
      var at = arr.indexOf(lv);
      if (at === -1) arr.push(lv);
      else if (arr.length > 1) arr.splice(at, 1);
      else { toast("級は1つ以上選んでください"); return; }
      arr.sort();
      store.settings.levels = arr;
      store.save();
      render();
      return;
    }

    if (tab) {
      if (view === "study" || view === "quiz") { session = null; quiz = null; }
      go(tab);
      return;
    }

    if (goTo) {
      if (goTo === "study-normal") { startStudy("normal"); return; }
      if (goTo === "study-weak") { startStudy("weak"); return; }
      if (goTo === "quiz") { startQuiz(); return; }
      if (goTo === "home") { session = null; quiz = null; go("home"); return; }
    }

    if (grade) { doGrade(grade); return; }

    if (choice !== null) { answerQuiz(+choice); return; }

    if (filter) { listUI.filter = filter; render(); return; }

    if (wordId) { detailId = wordId; openSheet("detail"); return; }

    switch (act) {
      case "reveal":
        if (session && !session.revealed) { session.revealed = true; render(); }
        return;
      case "leave":
        session = null; quiz = null; go("home");
        return;
      case "settings":
        openSheet("settings");
        return;
      case "sheet-close":
        closeSheet();
        return;
      case "quiz-next":
        if (quiz) { quiz.i += 1; render(); }
        return;
      case "quiz-again":
        startQuiz();
        return;
      case "goal+":
        store.settings.goal = Math.min(100, store.settings.goal + 5);
        store.save(); render();
        return;
      case "goal-":
        store.settings.goal = Math.max(5, store.settings.goal - 5);
        store.save(); render();
        return;
      case "mark-due":
        if (detailId) {
          var cd = store.card(detailId);
          cd.box = 0; cd.due = day();
          store.save(); closeSheet(); render();
          toast("要復習にしました");
        }
        return;
      case "mark-mature":
        if (detailId) {
          var cm = store.card(detailId);
          cm.box = 3; cm.due = store.shiftDays(day(), srs.intervalFor(3));
          store.save(); closeSheet(); render();
          toast("習得にしました");
        }
        return;
      case "reset":
        if (window.confirm("学習記録と連続日数をすべて消します。元に戻せません。よろしいですか？")) {
          store.reset();
          applyTheme();
          session = null; quiz = null;
          closeSheet();
          go("home");
          toast("記録を消しました");
        }
        return;
    }
  }

  function onInput(e) {
    if (e.target && e.target.id === "list-search") {
      listUI.q = e.target.value;
      var rows = filteredWords();
      /* 入力欄の焦点を保つため、一覧部分だけ差し替える */
      var listNode = el.screen.querySelector(".word-list");
      var emptyNode = el.screen.querySelector(".empty");
      var countNode = el.screen.querySelector(".section-head .note");
      if (countNode) countNode.textContent = rows.length + " 語";
      var html = rows.length
        ? '<div class="word-list">' + rows.map(function (w) { return wordRowHtml(w); }).join("") + '</div>'
        : '<p class="empty">該当する語がありません。<br>検索語や絞り込みを変えてみてください。</p>';
      if (listNode) listNode.outerHTML = html;
      else if (emptyNode) emptyNode.outerHTML = html;
    }
  }

  function onKey(e) {
    if (e.key === "Escape" && sheet) { closeSheet(); return; }
    if (sheet) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (view === "study" && session) {
      if (!session.revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault(); session.revealed = true; render(); return;
      }
      if (session.revealed) {
        if (e.key === "1") { doGrade("again"); return; }
        if (e.key === "2") { doGrade("hard"); return; }
        if (e.key === "3" || e.key === " " || e.key === "Enter") { e.preventDefault(); doGrade("good"); return; }
      }
      return;
    }

    if (view === "quiz" && quiz) {
      var q = quiz.qs[quiz.i];
      if (!q) return;
      if (q.picked === -1 && /^[1-4]$/.test(e.key)) { answerQuiz(+e.key - 1); return; }
      if (q.picked !== -1 && (e.key === " " || e.key === "Enter")) { e.preventDefault(); quiz.i += 1; render(); }
    }
  }

  /* ==================================================
     起動
     ================================================== */
  function init() {
    buildWords();
    store.load();
    applyTheme();

    el.topbar = document.getElementById("topbar");
    el.screen = document.getElementById("screen");
    el.tabbar = document.getElementById("tabbar");
    el.sheet = document.getElementById("sheet");

    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    document.addEventListener("keydown", onKey);

    /* 日付が変わったまま開いていた場合に表示を合わせる */
    var openedOn = day();
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && day() !== openedOn) { openedOn = day(); render(); }
    });

    window.addEventListener("beforeunload", function () { store.saveNow(); });

    if (!WORDS.length) {
      el.screen.innerHTML = '<p class="empty">単語データを読み込めませんでした。<br>data フォルダの hsk1.js / hsk2.js を確認してください。</p>';
      return;
    }

    go("home");
  }

  ns.app = { init: init, words: function () { return WORDS; } };
})(window.HSK);

document.addEventListener("DOMContentLoaded", function () { window.HSK.app.init(); });
