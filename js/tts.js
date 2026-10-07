/* ===========================================================
   tts.js — 発音の読み上げ（ブラウザ標準の音声合成を使う）
   録音ファイルは一切持たない。端末に中国語の音声が無い環境では
   読み上げが鳴らない・発音が不自然なことがあるが、機能自体は壊さない。
   =========================================================== */
window.HSK = window.HSK || {};

(function (ns) {
  "use strict";

  var synth = window.speechSynthesis || null;
  var voice = null;

  function pickVoice() {
    if (!synth) return;
    var list = synth.getVoices() || [];
    voice = find(list, "zh-CN") || find(list, /^zh/i) || null;
  }

  function find(list, matcher) {
    for (var i = 0; i < list.length; i++) {
      var lang = list[i].lang || "";
      if (typeof matcher === "string" ? lang === matcher : matcher.test(lang)) return list[i];
    }
    return null;
  }

  if (synth) {
    pickVoice();
    /* Chrome系は音声一覧が非同期に揃う。揃い次第こちらで拾い直す。 */
    if ("onvoiceschanged" in synth) {
      synth.addEventListener("voiceschanged", pickVoice);
    }
  }

  /* 読み上げボタンを出してよいか（音声合成そのものに対応しているか） */
  function supported() { return !!synth; }

  /* 中国語として読み上げる。連打しても前の発話を止めてから話す。 */
  function speak(text) {
    if (!synth || !text) return false;
    try {
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      if (voice) u.voice = voice;
      u.rate = 0.85;   /* 学習用に少しゆっくり */
      u.pitch = 1;
      synth.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }

  ns.tts = { speak: speak, supported: supported };
})(window.HSK);
