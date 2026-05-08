/* ═══════════════════════════════════════════════════════════════
   subscribe.js — Buttondown email subscribe component
   Finds all [data-subscribe] elements and renders a subscribe form.
   Works as a plain HTML form POST (progressive enhancement).
   JS intercepts submit for smoother UX (no redirect).
   ═══════════════════════════════════════════════════════════════ */

(function () {
  var BUTTONDOWN_URL =
    "https://buttondown.com/api/emails/embed-subscribe/cyrustyj";

  var targets = document.querySelectorAll("[data-subscribe]");
  if (!targets.length) return;

  targets.forEach(function (el) {
    // Build form HTML
    el.innerHTML =
      '<form class="subscribe-form" action="' +
      BUTTONDOWN_URL +
      '" method="post" target="_blank">' +
      '<input class="subscribe-input" type="email" name="email" placeholder="you@example.com" required aria-label="Email 地址" />' +
      '<button class="subscribe-btn" type="submit">订阅</button>' +
      "</form>" +
      '<p class="subscribe-status"></p>';

    var form = el.querySelector(".subscribe-form");
    var status = el.querySelector(".subscribe-status");

    // Enhanced UX: intercept with fetch so the page doesn't redirect
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var email = form.querySelector('input[name="email"]').value.trim();
      if (!email) return;

      status.textContent = "提交中...";
      status.className = "subscribe-status";

      var body = new FormData();
      body.append("email", email);

      fetch(BUTTONDOWN_URL, {
        method: "POST",
        body: body,
        mode: "no-cors", // Buttondown embed endpoint doesn't send CORS headers
      })
        .then(function () {
          // no-cors means we can't read the response, so assume success
          status.textContent = "已提交！请检查邮箱确认订阅。";
          status.className = "subscribe-status subscribe-status--ok";
          form.reset();
        })
        .catch(function () {
          status.textContent = "提交失败，请稍后重试。";
          status.className = "subscribe-status subscribe-status--err";
        });
    });
  });
})();
