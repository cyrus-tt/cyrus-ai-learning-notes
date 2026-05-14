(function () {
  "use strict";

  var STORAGE_KEY = "cy_streak";

  function getToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadStreak() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { days: [], streak: 0, lastVisit: null };
    } catch (e) {
      return { days: [], streak: 0, lastVisit: null };
    }
  }

  function saveStreak(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function daysBetween(a, b) {
    var d1 = new Date(a), d2 = new Date(b);
    return Math.round((d2 - d1) / 86400000);
  }

  function recordVisit() {
    var today = getToday();
    var data = loadStreak();

    if (data.lastVisit === today) return data;

    if (data.lastVisit && daysBetween(data.lastVisit, today) === 1) {
      data.streak++;
    } else if (data.lastVisit && daysBetween(data.lastVisit, today) > 1) {
      data.streak = 1;
    } else {
      data.streak = 1;
    }

    data.lastVisit = today;
    if (data.days.indexOf(today) === -1) {
      data.days.push(today);
    }
    if (data.days.length > 365) {
      data.days = data.days.slice(-365);
    }

    saveStreak(data);
    return data;
  }

  function renderStreakWidget() {
    var data = recordVisit();
    var target = document.getElementById("streakWidget");
    if (!target) return;

    var weeks = 12;
    var today = new Date();
    var dayOfWeek = today.getDay();
    var totalDays = weeks * 7 + dayOfWeek + 1;
    var startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + 1);

    var cells = "";
    for (var i = 0; i < totalDays; i++) {
      var d = new Date(startDate);
      d.setDate(d.getDate() + i);
      var dateStr = d.toISOString().slice(0, 10);
      var active = data.days.indexOf(dateStr) !== -1;
      var col = Math.floor(i / 7);
      var row = i % 7;
      var x = col * 15;
      var y = row * 15;
      cells += '<rect x="' + x + '" y="' + y + '" width="12" height="12" rx="3" fill="' +
        (active ? "var(--accent)" : "var(--line-soft)") + '" opacity="' + (active ? "1" : "0.5") + '"/>';
    }

    var svgW = Math.ceil(totalDays / 7) * 15;

    target.innerHTML =
      '<div class="streak-header">' +
        '<span class="streak-fire">' + (data.streak >= 3 ? "🔥" : "📅") + '</span>' +
        '<span class="streak-count">' + data.streak + ' 天连续</span>' +
        '<span class="streak-total">累计 ' + data.days.length + ' 天</span>' +
      '</div>' +
      '<div class="streak-graph">' +
        '<svg width="' + svgW + '" height="105" viewBox="0 0 ' + svgW + ' 105">' + cells + '</svg>' +
      '</div>';
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderStreakWidget);
  } else {
    renderStreakWidget();
  }
})();
