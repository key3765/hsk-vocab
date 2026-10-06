/* ===========================================================
   sw.js — オフライン用のキャッシュ
   ファイルを更新したら CACHE の版数を上げる（例: v2）。
   古いキャッシュは次の起動時に捨てられる。
   =========================================================== */
var CACHE = "hsk-vocab-v3";

var SHELL = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/store.js",
  "./js/srs.js",
  "./js/ads.js",
  "./js/app.js",
  "./data/hsk1.js",
  "./data/hsk2.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* 1つ失敗しても導入自体は進めたいので個別に入れる */
      return Promise.all(SHELL.map(function (u) {
        return fetch(new Request(u, { cache: "reload" })).then(function (res) {
          if (res && res.ok) return c.put(u, res);
        }).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);

  /* 広告やフォントなど外部への通信はそのまま通す */
  if (url.origin !== self.location.origin) {
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
      e.respondWith(
        caches.open(CACHE).then(function (c) {
          return c.match(req).then(function (hit) {
            if (hit) return hit;
            return fetch(req).then(function (res) {
              if (res && res.status === 200) c.put(req, res.clone());
              return res;
            });
          });
        })
      );
    }
    return;
  }

  /* 自分のファイルはキャッシュ優先。無ければ取ってきて貯める。 */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
