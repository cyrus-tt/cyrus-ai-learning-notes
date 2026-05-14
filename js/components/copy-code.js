(function () {
  "use strict";

  document.querySelectorAll("pre > code").forEach(function (block) {
    var pre = block.parentElement;
    if (pre.querySelector(".copy-code-btn")) return;

    pre.style.position = "relative";

    var btn = document.createElement("button");
    btn.className = "copy-code-btn";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "复制代码");

    btn.addEventListener("click", function () {
      var text = block.textContent;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(function () {
          btn.textContent = "Copy";
          btn.classList.remove("copied");
        }, 2000);
      });
    });

    pre.appendChild(btn);
  });
})();
