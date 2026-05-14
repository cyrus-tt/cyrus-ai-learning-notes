(function () {
  "use strict";

  var target = document.getElementById("quizSection");
  if (!target) return;

  var quizData;
  try {
    quizData = JSON.parse(target.getAttribute("data-quiz"));
  } catch (e) { return; }
  if (!quizData || !quizData.length) return;

  var totalQ = quizData.length;
  var score = 0;
  var answered = 0;

  var html = '<h3>Knowledge Check</h3><p>测试一下你学到了什么</p>';

  quizData.forEach(function (q, qi) {
    html += '<div class="quiz-card" data-qi="' + qi + '">';
    html += '<div class="quiz-q">' + (qi + 1) + '. ' + q.q + '</div>';
    html += '<div class="quiz-opts">';
    q.opts.forEach(function (opt, oi) {
      html += '<div class="quiz-opt" data-qi="' + qi + '" data-oi="' + oi + '">';
      html += '<span class="quiz-indicator"></span>';
      html += '<span>' + opt + '</span>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div class="quiz-explain">' + q.explain + '</div>';
    html += '</div>';
  });

  html += '<div class="quiz-score" style="display:none" id="quizScore">';
  html += '<div class="quiz-score-num" id="quizScoreNum">0/' + totalQ + '</div>';
  html += '<div class="quiz-score-label">答对题数</div>';
  html += '</div>';

  target.innerHTML = html;

  target.addEventListener("click", function (e) {
    var opt = e.target.closest(".quiz-opt");
    if (!opt || opt.classList.contains("locked")) return;

    var qi = parseInt(opt.getAttribute("data-qi"));
    var oi = parseInt(opt.getAttribute("data-oi"));
    var card = target.querySelector('.quiz-card[data-qi="' + qi + '"]');
    var allOpts = card.querySelectorAll(".quiz-opt");

    allOpts.forEach(function (o) { o.classList.add("locked"); });

    var correct = quizData[qi].answer === oi;
    opt.classList.add("selected");

    if (correct) {
      opt.classList.add("correct-answer");
      opt.querySelector(".quiz-indicator").textContent = "✓";
      card.classList.add("correct");
      score++;
    } else {
      opt.classList.add("wrong-answer");
      opt.querySelector(".quiz-indicator").textContent = "✗";
      card.classList.add("wrong");
      var correctOpt = allOpts[quizData[qi].answer];
      correctOpt.classList.add("correct-answer");
      correctOpt.querySelector(".quiz-indicator").textContent = "✓";
    }

    card.classList.add("answered");
    answered++;

    if (answered === totalQ) {
      var scoreEl = document.getElementById("quizScore");
      document.getElementById("quizScoreNum").textContent = score + "/" + totalQ;
      scoreEl.style.display = "block";
    }
  });
})();
