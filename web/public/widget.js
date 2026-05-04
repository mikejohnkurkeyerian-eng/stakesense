/**
 * stakesense embeddable widget — vanilla JS, no dependencies.
 *
 * Drop in:
 *   <script src="https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/widget.js" async></script>
 *   <div data-stakesense-validator="VOTE_PUBKEY"></div>
 *
 * Or for top-N:
 *   <div data-stakesense-top="3"></div>
 *
 * Optional attributes (all elements):
 *   data-stakesense-theme="light" | "dark"
 *   data-stakesense-size="compact" | "full"  (default: full)
 *   data-stakesense-api="https://your-self-hosted-stakesense.example.com"
 *
 * Released under MIT. Data CC-BY 4.0 — please attribute "stakesense".
 */
(function () {
  "use strict";

  var DEFAULT_API = "https://stakesense.onrender.com";
  var BRAND = "stakesense";
  var VERSION = "0.1.0";

  // ---- styles (injected once) ---------------------------------------------
  var STYLE_ID = "stakesense-widget-style";
  var CSS = [
    ".stakesense-widget{",
    "  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;",
    "  border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;",
    "  background:#fff;color:#0f172a;line-height:1.4;font-size:14px;",
    "  display:inline-block;min-width:240px;max-width:420px;",
    "  box-shadow:0 1px 2px rgba(0,0,0,0.04);",
    "}",
    ".stakesense-widget--dark{background:#0f172a;color:#f8fafc;border-color:#334155;}",
    ".stakesense-widget__head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;}",
    ".stakesense-widget__name{font-weight:600;font-size:15px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;}",
    ".stakesense-widget__pk{font-family:ui-monospace,'SF Mono',Menlo,monospace;color:#64748b;font-size:11px;margin-top:2px;}",
    ".stakesense-widget--dark .stakesense-widget__pk{color:#94a3b8;}",
    ".stakesense-widget__brand{font-size:11px;color:#94a3b8;text-decoration:none;flex-shrink:0;}",
    ".stakesense-widget__score{font-size:32px;font-weight:700;line-height:1;letter-spacing:-0.02em;}",
    ".stakesense-widget__score--good{color:#16a34a;}",
    ".stakesense-widget__score--ok{color:#ca8a04;}",
    ".stakesense-widget__score--bad{color:#dc2626;}",
    ".stakesense-widget__label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;}",
    ".stakesense-widget--dark .stakesense-widget__label{color:#94a3b8;}",
    ".stakesense-widget__pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px;}",
    ".stakesense-widget__pillar{font-size:12px;}",
    ".stakesense-widget__pillar-value{font-weight:600;font-size:14px;}",
    ".stakesense-widget__list{list-style:none;padding:0;margin:0;}",
    ".stakesense-widget__list li{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;}",
    ".stakesense-widget__list li:last-child{border-bottom:0;}",
    ".stakesense-widget--dark .stakesense-widget__list li{border-color:#1e293b;}",
    ".stakesense-widget__loading{color:#64748b;font-size:12px;padding:8px 0;}",
    ".stakesense-widget__error{color:#dc2626;font-size:12px;padding:8px 0;}",
    ".stakesense-widget--compact{padding:8px 12px;min-width:auto;}",
    ".stakesense-widget--compact .stakesense-widget__score{font-size:22px;}",
    ".stakesense-widget--compact .stakesense-widget__pillars{display:none;}",
  ].join("");

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ---- helpers -------------------------------------------------------------
  function shortPk(pk) {
    if (!pk) return "";
    return pk.slice(0, 4) + "…" + pk.slice(-4);
  }

  function pct(v) {
    if (v == null) return "—";
    return (Number(v) * 100).toFixed(1) + "%";
  }

  function scoreClass(v) {
    if (v == null) return "";
    if (v >= 0.7) return "stakesense-widget__score--good";
    if (v >= 0.4) return "stakesense-widget__score--ok";
    return "stakesense-widget__score--bad";
  }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") n.className = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (typeof c === "string") n.appendChild(document.createTextNode(c));
      else if (c) n.appendChild(c);
    });
    return n;
  }

  function getApi(node) {
    return (
      node.getAttribute("data-stakesense-api") ||
      window.STAKESENSE_API_BASE ||
      DEFAULT_API
    );
  }

  function getTheme(node) {
    return node.getAttribute("data-stakesense-theme") === "dark"
      ? "dark"
      : "light";
  }

  function getSize(node) {
    return node.getAttribute("data-stakesense-size") === "compact"
      ? "compact"
      : "full";
  }

  function brandLink(theme) {
    return el(
      "a",
      {
        class: "stakesense-widget__brand",
        href:
          "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/?ref=widget",
        target: "_blank",
        rel: "noopener",
        title: BRAND + " v" + VERSION + " · CC-BY 4.0",
      },
      [BRAND]
    );
  }

  // ---- single-validator widget --------------------------------------------
  function renderValidator(node, vp) {
    var theme = getTheme(node);
    var size = getSize(node);
    var api = getApi(node);
    node.className =
      "stakesense-widget stakesense-widget--" +
      theme +
      " stakesense-widget--" +
      size;
    node.innerHTML = "";
    node.appendChild(
      el("div", { class: "stakesense-widget__loading" }, ["Loading…"])
    );

    fetch(api + "/api/v1/validators/" + encodeURIComponent(vp))
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var v = data.validator || {};
        var name = v.name || shortPk(v.vote_pubkey || vp);
        node.innerHTML = "";
        node.appendChild(
          el("div", { class: "stakesense-widget__head" }, [
            el("div", null, [
              el("div", { class: "stakesense-widget__name" }, [name]),
              el("div", { class: "stakesense-widget__pk" }, [
                shortPk(v.vote_pubkey || vp),
              ]),
            ]),
            brandLink(theme),
          ])
        );
        node.appendChild(
          el("div", { class: "stakesense-widget__label" }, ["Composite score"])
        );
        node.appendChild(
          el(
            "div",
            {
              class:
                "stakesense-widget__score " + scoreClass(v.composite_score),
            },
            [pct(v.composite_score)]
          )
        );

        var pillars = el("div", { class: "stakesense-widget__pillars" }, [
          pillar("Downtime", v.downtime_prob_7d, true),
          pillar("MEV tax", v.mev_tax_rate, true),
          pillar("Decentralization", v.decentralization_score, false),
        ]);
        node.appendChild(pillars);
      })
      .catch(function (e) {
        node.innerHTML = "";
        node.appendChild(
          el("div", { class: "stakesense-widget__error" }, [
            "Failed to load: " + e.message,
          ])
        );
        node.appendChild(brandLink(theme));
      });
  }

  function pillar(label, value, lowerBetter) {
    // For lower-better fields (downtime, mev tax), map by 1 - value for color.
    var colorVal = lowerBetter && value != null ? 1 - Number(value) : value;
    return el("div", { class: "stakesense-widget__pillar" }, [
      el("div", { class: "stakesense-widget__label" }, [label]),
      el(
        "div",
        {
          class: "stakesense-widget__pillar-value " + scoreClass(colorVal),
        },
        [pct(value)]
      ),
    ]);
  }

  // ---- top-N widget --------------------------------------------------------
  function renderTopN(node, n) {
    var theme = getTheme(node);
    var api = getApi(node);
    node.className = "stakesense-widget stakesense-widget--" + theme;
    node.innerHTML = "";
    node.appendChild(
      el("div", { class: "stakesense-widget__head" }, [
        el("div", { class: "stakesense-widget__name" }, [
          "Top " + n + " validators",
        ]),
        brandLink(theme),
      ])
    );
    node.appendChild(
      el("div", { class: "stakesense-widget__loading" }, ["Loading…"])
    );

    fetch(api + "/api/v1/validators?sort=composite&limit=" + n)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        node.innerHTML = "";
        node.appendChild(
          el("div", { class: "stakesense-widget__head" }, [
            el("div", { class: "stakesense-widget__name" }, [
              "Top " + n + " validators",
            ]),
            brandLink(theme),
          ])
        );
        var ul = el("ul", { class: "stakesense-widget__list" }, []);
        (data.results || []).forEach(function (v) {
          var li = el("li", null, [
            el(
              "span",
              null,
              [v.name || shortPk(v.vote_pubkey)]
            ),
            el(
              "span",
              { class: scoreClass(v.composite_score) },
              [pct(v.composite_score)]
            ),
          ]);
          ul.appendChild(li);
        });
        node.appendChild(ul);
      })
      .catch(function (e) {
        node.innerHTML = "";
        node.appendChild(
          el("div", { class: "stakesense-widget__error" }, [
            "Failed to load: " + e.message,
          ])
        );
      });
  }

  // ---- mount ---------------------------------------------------------------
  function mountAll(root) {
    injectStyles();
    var nodes = (root || document).querySelectorAll(
      "[data-stakesense-validator],[data-stakesense-top]"
    );
    Array.prototype.forEach.call(nodes, function (node) {
      if (node.__stakesenseRendered) return;
      node.__stakesenseRendered = true;
      var vp = node.getAttribute("data-stakesense-validator");
      var top = node.getAttribute("data-stakesense-top");
      if (vp) renderValidator(node, vp);
      else if (top) renderTopN(node, Math.max(1, Math.min(20, Number(top) || 5)));
    });
  }

  // Public API for SPA frameworks that mount/unmount nodes
  window.stakesense = {
    mount: mountAll,
    version: VERSION,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      mountAll();
    });
  } else {
    mountAll();
  }
})();
