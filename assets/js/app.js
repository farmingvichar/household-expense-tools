"use strict";

document.addEventListener("DOMContentLoaded", function () {
  var navToggle = document.querySelector(".nav-toggle");
  var primaryNav = document.getElementById("primary-navigation");
  var currentYear = document.getElementById("current-year");
  var searchForm = document.querySelector(".search-box");
  var searchInput = document.getElementById("tool-search");
  var noticeTimer = null;

  function createNotice() {
    var existingNotice = document.getElementById("site-notice");

    if (existingNotice) {
      return existingNotice;
    }

    var notice = document.createElement("div");
    notice.id = "site-notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    notice.setAttribute("aria-atomic", "true");

    notice.style.position = "fixed";
    notice.style.insetInline = "1rem";
    notice.style.insetBlockStart = "4.75rem";
    notice.style.zIndex = "9999";
    notice.style.maxInlineSize = "28rem";
    notice.style.marginInline = "auto";
    notice.style.padding = "0.875rem 1rem";
    notice.style.borderRadius = "0.875rem";
    notice.style.background = "var(--color-text-strong)";
    notice.style.color = "var(--color-text-inverse)";
    notice.style.boxShadow = "var(--shadow-md)";
    notice.style.fontSize = "var(--font-size-sm)";
    notice.style.fontWeight = "var(--font-weight-medium)";
    notice.style.textAlign = "center";
    notice.style.opacity = "0";
    notice.style.pointerEvents = "none";
    notice.style.transform = "translateY(-0.5rem)";
    notice.style.transition = "opacity 150ms ease, transform 150ms ease";

    document.body.appendChild(notice);
    return notice;
  }

  function showNotice(message) {
    var notice = createNotice();

    window.clearTimeout(noticeTimer);
    notice.textContent = message;
    notice.style.opacity = "1";
    notice.style.transform = "translateY(0)";

    noticeTimer = window.setTimeout(function () {
      notice.style.opacity = "0";
      notice.style.transform = "translateY(-0.5rem)";
    }, 2600);
  }

  function closeNavigation() {
    if (!navToggle || !primaryNav) {
      return;
    }

    navToggle.classList.remove("is-open");
    primaryNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation menu");
  }

  function toggleNavigation() {
    if (!navToggle || !primaryNav) {
      return;
    }

    var isOpen = navToggle.classList.toggle("is-open");

    primaryNav.classList.toggle("is-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  }

  function showAllToolCards() {
    var cards = document.querySelectorAll(".tool-card");

    cards.forEach(function (card) {
      card.style.display = "";
    });
  }

  function runToolSearch(query) {
    var cards = document.querySelectorAll(".tool-card");
    var normalizedQuery = query.trim().toLowerCase();
    var queryWords = normalizedQuery.split(/\s+/).filter(function (word) {
      return word.length >= 2;
    });

    var firstMatch = null;
    var matchCount = 0;

    if (!normalizedQuery || queryWords.length === 0) {
      showAllToolCards();
      showNotice("Try grocery, budget, pantry, meal cost, or daily expense.");
      return;
    }

    cards.forEach(function (card) {
      var keywords = card.getAttribute("data-search-keywords") || "";
      var cardText = (card.textContent + " " + keywords).toLowerCase();

      var exactMatch = cardText.indexOf(normalizedQuery) !== -1;
      var wordMatch = queryWords.every(function (word) {
        return cardText.indexOf(word) !== -1;
      });

      var isMatch = exactMatch || wordMatch;

      card.style.display = isMatch ? "" : "none";

      if (isMatch) {
        matchCount += 1;

        if (!firstMatch) {
          firstMatch = card;
        }
      }
    });

    if (matchCount > 0 && firstMatch) {
      window.setTimeout(function () {
        firstMatch.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);

      showNotice(matchCount + " matching planned tool found.");
      return;
    }

    showAllToolCards();

    window.setTimeout(function () {
      var popularToolsSection = document.getElementById("popular-tools");

      if (popularToolsSection) {
        popularToolsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);

    showNotice("No exact match found. Showing all planned tools.");
  }

  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", toggleNavigation);

    primaryNav.addEventListener("click", function (event) {
      var link = event.target.closest("a");

      if (link) {
        closeNavigation();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeNavigation();
      }
    });
  }

  document.addEventListener("click", function (event) {
    var comingSoonElement = event.target.closest('[data-coming-soon="true"]');

    if (!comingSoonElement) {
      return;
    }

    event.preventDefault();
    showNotice("This page is coming soon. Tool pages are not built yet.");
  });

  if (searchForm) {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var query = searchInput ? searchInput.value : "";
      runToolSearch(query);
    });
  }

  document.querySelectorAll("[data-search-suggestion]").forEach(function (button) {
    button.addEventListener("click", function () {
      var query = button.getAttribute("data-search-suggestion") || "";

      if (searchInput) {
        searchInput.value = query;
      }

      runToolSearch(query);
    });
  });


