(function () {
  "use strict";

  var STORAGE_KEY = "cy_utm";
  var MAX_ENTRIES = 50;
  var UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign"];

  function getParam(search, name) {
    var pairs = search.replace(/^\?/, "").split("&");
    for (var i = 0; i < pairs.length; i++) {
      var parts = pairs[i].split("=");
      if (decodeURIComponent(parts[0]) === name) {
        return parts.length > 1 ? decodeURIComponent(parts[1]) : "";
      }
    }
    return null;
  }

  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveEntries(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {}
  }

  function track() {
    var search = window.location.search;
    if (!search) return;

    var entry = {};
    var found = false;

    for (var i = 0; i < UTM_PARAMS.length; i++) {
      var val = getParam(search, UTM_PARAMS[i]);
      if (val !== null) {
        entry[UTM_PARAMS[i]] = val;
        found = true;
      }
    }

    if (!found) return;

    entry.timestamp = new Date().toISOString();
    entry.landing = window.location.pathname;

    var entries = loadEntries();
    entries.push(entry);

    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(entries.length - MAX_ENTRIES);
    }

    saveEntries(entries);
    report(entry);
  }

  function report(entry) {
    // 服务端上报（D1 utm_events 表）。失败静默：埋点绝不能影响页面。
    try {
      var body = JSON.stringify({
        source: entry.utm_source || "",
        medium: entry.utm_medium || "",
        campaign: entry.utm_campaign || "",
        landing: entry.landing || "/"
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/utm", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/utm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) {}
  }

  track();
})();
