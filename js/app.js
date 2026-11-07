/* =========================================================
   SLEEP ON TIME - 동작 로직
   (문항/문구는 data.js, 디자인은 css/style.css)
   응답은 이 브라우저 안에서만 계산되며 저장·전송하지 않아요.
   ========================================================= */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var TYPE_KEYS = Object.keys(TYPES);                 // ["A".."F"]
  var screens = { start: $("#screen-start"), quiz: $("#screen-quiz"), result: $("#screen-result") };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var idx = 0;                                        // 현재 문항 번호
  var answers = [];                                   // 문항별 점수(0~3)
  var current = { type: "A", flipped: false };

  /* ---------- 화면 전환 ---------- */
  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].classList.toggle("active", k === name); });
    window.scrollTo(0, 0);
  }

  function reset() {
    idx = 0; answers = [];
    show("start");
  }

  /* ---------- 문항 ---------- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function renderQuestion() {
    var total = QUESTIONS.length;
    $("#q-now").textContent = pad(idx + 1);
    $("#q-total").textContent = total;
    $("#q-pill").textContent = "QUESTION " + pad(idx + 1);
    $("#q-text").textContent = QUESTIONS[idx][1];
    $("#progress-fill").style.width = ((idx + 1) / total * 100) + "%";

    var box = $("#choices");
    box.innerHTML = "";
    CHOICES.forEach(function (label, score) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "choice" + (answers[idx] === score ? " selected" : "");
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", answers[idx] === score ? "true" : "false");
      b.innerHTML = '<i class="dot"></i><span></span>';
      b.lastChild.textContent = label;
      b.addEventListener("click", function () { choose(score); });
      box.appendChild(b);
    });

    $("#btn-next").disabled = answers[idx] === undefined;
    $("#btn-next").textContent = idx === total - 1 ? "결과 보기" : "다음";
  }

  function choose(score) {
    answers[idx] = score;
    renderQuestion();
  }

  function next() {
    if (answers[idx] === undefined) return;
    if (idx < QUESTIONS.length - 1) { idx++; renderQuestion(); window.scrollTo(0, 0); }
    else { showResult(); }
  }

  function prev() {
    if (idx === 0) { reset(); return; }
    idx--; renderQuestion(); window.scrollTo(0, 0);
  }

  /* ---------- 점수 계산 ---------- */
  function computeScores() {
    var s = {};
    TYPE_KEYS.forEach(function (k) { s[k] = 0; });
    QUESTIONS.forEach(function (q, i) { s[q[0]] += answers[i] || 0; });
    return s;                                          // 유형별 0~9점
  }

  /* ---------- 결과 ---------- */
  var result = { scores: {}, primary: [], secondary: [] };

  function showResult() {
    var s = computeScores();
    var vals = TYPE_KEYS.map(function (k) { return s[k]; });
    var max = Math.max.apply(null, vals);
    var primary = TYPE_KEYS.filter(function (k) { return s[k] === max; });
    var rest = vals.filter(function (v) { return v < max; });
    var second = rest.length ? Math.max.apply(null, rest) : -1;
    var secondary = second > 0 ? TYPE_KEYS.filter(function (k) { return s[k] === second; }) : [];
    result = { scores: s, primary: primary, secondary: secondary, max: max };

    show("result");
    $("#disclaimer").textContent = DISCLAIMER;
    $("#disclaimer-empty").textContent = DISCLAIMER;

    if (max === 0) {                                   // 모든 문항이 '전혀 그렇지 않다'
      $("#result-body").hidden = true;
      $("#result-empty").hidden = false;
      screens.result.className = "screen active theme-purple";
      return;
    }
    $("#result-empty").hidden = true;
    $("#result-body").hidden = false;
    renderType(primary[0], true);
  }

  function renderType(k, intro) {
    var t = TYPES[k];
    current.type = k; current.flipped = false;
    screens.result.className = "screen active theme-" + t.theme;

    $("#r-pill").textContent = "TYPE " + k;
    $("#r-name").textContent = t.name;
    $("#r-quote").textContent = t.quote;

    var front = $("#img-front"), back = $("#img-back");
    front.src = "assets/cards/" + k + "-front.webp"; front.alt = t.name + " 카드 앞면";
    back.src = "assets/cards/" + k + "-back.webp";   back.alt = t.name + " 카드 뒷면 - 실천 가이드";

    var card = $("#card");
    card.classList.remove("is-flipped");
    updateHint();

    renderTabs(k);
    renderGuide(t);
    renderScores();

    if (intro) playIntro();
  }

  /* 동점 1위가 여러 개일 때 카드 선택 탭 */
  function renderTabs(active) {
    var box = $("#r-tabs");
    if (result.primary.length < 2) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false; box.innerHTML = "";
    result.primary.forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tab" + (k === active ? " on" : "");
      b.textContent = "TYPE " + k + " · " + TYPES[k].name;
      b.addEventListener("click", function () { renderType(k, false); burst(); });
      box.appendChild(b);
    });
  }

  function renderGuide(t) {
    var g = $("#guide");
    g.innerHTML = "";
    var h = document.createElement("h3"); h.textContent = t.heading; g.appendChild(h);

    var ol = document.createElement("ol");
    t.steps.forEach(function (st, i) {
      var li = document.createElement("li");
      var n = document.createElement("em"); n.textContent = i + 1; li.appendChild(n);
      var body = document.createElement("div");
      if (st.t) { var b = document.createElement("b"); b.textContent = st.t; body.appendChild(b); }
      var p = document.createElement("span"); p.textContent = st.d; body.appendChild(p);
      li.appendChild(body); ol.appendChild(li);
    });
    g.appendChild(ol);

    if (t.key) {
      var k = document.createElement("p"); k.className = "key";
      var kb = document.createElement("b"); kb.textContent = "핵심: ";
      k.appendChild(kb); k.appendChild(document.createTextNode(t.key)); g.appendChild(k);
    }
    if (t.note) {
      var n2 = document.createElement("p"); n2.className = "note"; n2.textContent = t.note; g.appendChild(n2);
    }
  }

  /* 유형별 점수 막대 + 주/보조 유형 */
  function renderScores() {
    var box = $("#scores");
    box.innerHTML = "";
    var h = document.createElement("h3"); h.textContent = "내 패턴 한눈에 보기"; box.appendChild(h);

    var info = document.createElement("p"); info.className = "score-info";
    var names = function (arr) { return arr.map(function (k) { return TYPES[k].name; }).join(", "); };
    info.textContent = "주 유형: " + names(result.primary) +
      (result.secondary.length ? "  /  보조 유형: " + names(result.secondary) : "");
    box.appendChild(info);

    TYPE_KEYS.forEach(function (k) {
      var row = document.createElement("div");
      row.className = "srow" + (result.primary.indexOf(k) > -1 ? " main" : (result.secondary.indexOf(k) > -1 ? " sub" : ""));
      var label = document.createElement("span"); label.className = "sl"; label.textContent = TYPES[k].name;
      var bar = document.createElement("span"); bar.className = "sb";
      var fill = document.createElement("i"); fill.style.width = (result.scores[k] / 9 * 100) + "%"; bar.appendChild(fill);
      var val = document.createElement("span"); val.className = "sv"; val.textContent = result.scores[k] + "/9";
      row.appendChild(label); row.appendChild(bar); row.appendChild(val);
      box.appendChild(row);
    });
  }

  /* ---------- 카드 뒤집기 + 뾰로롱 연출 ---------- */
  function updateHint() {
    $("#r-hint").textContent = current.flipped ? "다시 누르면 앞면으로 돌아가요" : "카드를 눌러 뒤집어 보세요";
  }

  function flip() {
    current.flipped = !current.flipped;
    $("#card").classList.toggle("is-flipped", current.flipped);
    updateHint();
    burst();
  }

  var GLYPHS = ["✦", "★", "✧", "♥", "✦", "✧"];

  function burst() {
    if (reduceMotion) return;
    var fx = $("#fx");
    fx.innerHTML = "";
    var colors = ["#ffd54a", "#ffffff", "#ff9ec7", "var(--accent)", "#b8a6ff", "#8fe0ff"];
    var N = 26;
    for (var i = 0; i < N; i++) {
      var p = document.createElement("span");
      p.className = "p";
      p.textContent = GLYPHS[i % GLYPHS.length];
      var ang = (Math.PI * 2 * i / N) + (Math.random() - 0.5) * 0.5;
      var dist = 110 + Math.random() * 90;
      p.style.setProperty("--x", Math.round(Math.cos(ang) * dist) + "px");
      p.style.setProperty("--y", Math.round(Math.sin(ang) * dist * 1.15) + "px");
      p.style.setProperty("--r", Math.round((Math.random() - 0.5) * 360) + "deg");
      p.style.setProperty("--s", Math.round(14 + Math.random() * 16) + "px");
      p.style.setProperty("--d", (Math.random() * 0.18).toFixed(2) + "s");
      p.style.setProperty("--c", colors[i % colors.length]);
      fx.appendChild(p);
    }
    var ring = document.createElement("span"); ring.className = "ring"; fx.appendChild(ring);

    var stage = $("#card-stage");
    stage.classList.remove("pop"); void stage.offsetWidth; stage.classList.add("pop");
    var poof = $("#poof");
    poof.classList.remove("go"); void poof.offsetWidth; poof.classList.add("go");

    clearTimeout(burst._t);
    burst._t = setTimeout(function () { fx.innerHTML = ""; stage.classList.remove("pop"); }, 1400);
  }

  function playIntro() {
    var stage = $("#card-stage");
    stage.classList.remove("intro"); void stage.offsetWidth;
    if (reduceMotion) return;
    stage.classList.add("intro");
    setTimeout(burst, 450);
    setTimeout(function () { stage.classList.remove("intro"); }, 1200);
  }

  /* ---------- 이미지 저장 / 공유 ---------- */
  function saveImage() {
    var img = current.flipped ? $("#img-back") : $("#img-front");
    var base = "sleep-on-time-" + current.type + "-" + (current.flipped ? "back" : "front");
    function fallback() {                              // file:// 등에서 캔버스가 막히면 원본 파일로 저장
      var a = document.createElement("a");
      a.href = img.src; a.download = base + ".webp";
      document.body.appendChild(a); a.click(); a.remove();
    }
    try {
      var c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      c.toBlob(function (blob) {
        if (!blob) { fallback(); return; }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = base + ".png";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
      }, "image/png");
    } catch (e) { fallback(); }
  }

  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  function share() {
    var name = TYPES[current.type].name;
    var data = { title: "SLEEP ON TIME", text: "나의 수면 방해 패턴은 '" + name + "'!", url: location.href };
    if (navigator.share) {
      navigator.share(data).catch(function () { /* 사용자가 취소 */ });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(location.href).then(
        function () { toast("링크를 복사했어요"); },
        function () { toast("주소창의 링크를 복사해 공유해 주세요"); }
      );
    } else { toast("주소창의 링크를 복사해 공유해 주세요"); }
  }

  /* ---------- 이벤트 연결 ---------- */
  $("#btn-start").addEventListener("click", function () { idx = 0; answers = []; renderQuestion(); show("quiz"); });
  $("#btn-next").addEventListener("click", next);
  $("#btn-prev").addEventListener("click", prev);
  $("#card").addEventListener("click", flip);
  $("#btn-save").addEventListener("click", saveImage);
  $("#btn-share").addEventListener("click", share);
  $("#btn-restart").addEventListener("click", reset);
  $("#btn-restart-empty").addEventListener("click", reset);
  Array.prototype.forEach.call(document.querySelectorAll('[data-action="exit"]'), function (b) {
    b.addEventListener("click", reset);
  });
})();
