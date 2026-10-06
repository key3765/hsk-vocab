/* ===========================================================
   ads.js — 広告枠

   公開前にここだけ書き換えれば広告が出ます（手順は README.md）。
     1. client を "ca-pub-..." に差し替える
     2. slots の各枠に AdSense で発行された広告ユニット ID を入れる
     3. enabled を true にする

   枠は「学習の流れを止めない場所」にだけ置いています。
   フラッシュカードと採点の画面には広告を入れません。
   =========================================================== */
window.HSK = window.HSK || {};

(function (ns) {
  "use strict";

  var CONFIG = {
    enabled: true,
    client: "ca-pub-8997874792161168",
    slots: {
      home:   "3795577603",   // ホーム下部 (square_1)
      list:   "1322291659",   // 一覧の末尾 (square_3)
      result: "1723500929"    // 小テストの結果
    }
  };

  var LABEL = { home: "スポンサー", list: "スポンサー", result: "スポンサー" };

  function isLive() {
    return CONFIG.enabled &&
      CONFIG.client.indexOf("0000") === -1 &&
      typeof window.adsbygoogle !== "undefined";
  }

  /* 枠の HTML。未設定のうちは何が入るかわかるプレースホルダーを返す。 */
  function slotHtml(name) {
    var label = LABEL[name] || "スポンサー";
    if (!CONFIG.enabled) {
      return '<aside class="ad" data-ad="' + name + '">' +
        '<span class="ad__label">' + label + '</span>' +
        '<div class="ad__box"><p class="ad__placeholder">広告枠（' + name + '）<br>' +
        'ads.js に AdSense の ID を入れると表示されます</p></div></aside>';
    }
    return '<aside class="ad" data-ad="' + name + '">' +
      '<span class="ad__label">' + label + '</span>' +
      '<div class="ad__box">' +
      '<ins class="adsbygoogle" style="display:block" ' +
      'data-ad-client="' + CONFIG.client + '" ' +
      'data-ad-slot="' + (CONFIG.slots[name] || "") + '" ' +
      'data-ad-format="auto" data-full-width-responsive="true"></ins>' +
      '</div></aside>';
  }

  /* 画面を描き直した後に呼ぶ。挿入済みの ins を AdSense に渡す。 */
  function refresh(root) {
    if (!isLive()) return;
    var list = (root || document).querySelectorAll("ins.adsbygoogle");
    for (var i = 0; i < list.length; i++) {
      if (list[i].getAttribute("data-adsbygoogle-status")) continue;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* 読込失敗は黙って無視 */ }
    }
  }

  ns.ads = { config: CONFIG, slotHtml: slotHtml, refresh: refresh };
})(window.HSK);
