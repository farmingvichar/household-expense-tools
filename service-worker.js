"use strict";

var CACHE_NAME = "household-expense-tools-v18";
var STARTER_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.svg",

  "./about/",
  "./about/index.html",
  "./privacy/",
  "./privacy/index.html",
  "./terms/",
  "./terms/index.html",
  "./contact/",
  "./contact/index.html",
  "./faq/",
  "./faq/index.html",

  "./tools/daily-expense-tracker/",
  "./tools/daily-expense-tracker/index.html",
  "./tools/grocery-budget-calculator/",
  "./tools/grocery-budget-calculator/index.html",
  "./tools/food-waste-cost-calculator/",
  "./tools/food-waste-cost-calculator/index.html",
  "./tools/grocery-price-compare-calculator/",
  "./tools/grocery-price-compare-calculator/index.html",
  "./tools/laundry-cost-calculator/",
"./tools/laundry-cost-calculator/index.html",
  "./tools/toilet-paper-value-calculator/",
"./tools/toilet-paper-value-calculator/index.html",
  
  "./assets/css/reset.css",
  "./assets/css/variables.css",
  "./assets/css/typography.css",
  "./assets/css/layout.css",
  "./assets/css/components.css",
  "./assets/css/utilities.css",
  "./assets/css/responsive.css",

    "./assets/js/app.js",
  "./assets/js/daily-expense-tracker.js",
  "./assets/js/grocery-budget-calculator.js",
  "./assets/js/food-waste-cost-calculator.js",
  "./assets/js/grocery-price-compare-calculator.js",
  "./assets/js/grocery-price-compare-calculator.js",
"./assets/js/laundry-cost-calculator.js",
"./assets/js/toilet-paper-value-calculator.js",
];

var STARTER_FILE_URLS = STARTER_FILES.map(function (path) {
  return new URL(path, self.registration.scope).href;
});

function isStarterFile(url) {
  return STARTER_FILE_URLS.indexOf(url.href) !== -1;
}

function isHtmlRequest(request) {
  return request.mode === "navigate" ||
    (request.headers.get("accept") || "").indexOf("text/html") !== -1;
}

function isStaticRequest(request) {
  var destination = request.destination;
  return destination === "style" || destination === "script" || destination === "manifest";
}

function cacheFirst(request) {
  return caches.match(request).then(function (cachedResponse) {
    if (cachedResponse) {
      return cachedResponse;
    }

    return fetch(request).then(function (networkResponse) {
      var requestUrl = new URL(request.url);

      if (
        networkResponse &&
        networkResponse.ok &&
        requestUrl.origin === self.location.origin &&
        isStarterFile(requestUrl)
      ) {
        var responseClone = networkResponse.clone();

        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, responseClone);
        });
      }

      return networkResponse;
    });
  });
}

function networkFirst(request) {
  return fetch(request)
    .then(function (networkResponse) {
      var requestUrl = new URL(request.url);

      if (
        networkResponse &&
        networkResponse.ok &&
        requestUrl.origin === self.location.origin &&
        isStarterFile(requestUrl)
      ) {
        var responseClone = networkResponse.clone();

        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, responseClone);
        });
      }

      return networkResponse;
    })
    .catch(function () {
      return caches.match(request).then(function (cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request);
      });
    });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(STARTER_FILES);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }

            return null;
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  var requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticRequest(request) && isStarterFile(requestUrl)) {
    event.respondWith(cacheFirst(request));
  }
});
