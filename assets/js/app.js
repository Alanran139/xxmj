/* 西行漫记 — 交互 */
(function () {
  'use strict';

  var T = window.TRIP;
  if (!T) return;

  var days = T.days;
  var N = days.length;
  var YEAR = 2026;

  var PHASE_INK = {
    '中原': '#6d9cbb', '秦岭': '#79a884', '成都': '#9686cd',
    '川西': '#6b90e0', '藏东': '#a785c9', '西藏': '#c99a52'
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function wd(d) { return '周' + '日一二三四五六'.charAt(dObj(d).getDay()); }
  function dObj(d) {
    var m = /(\d+)月(\d+)日/.exec(d.date);
    return new Date(YEAR, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
  }
  function isoOf(d) {
    var o = dObj(d);
    return o.getFullYear() + '-' + pad(o.getMonth() + 1) + '-' + pad(o.getDate());
  }
  function phaseOf(key) {
    for (var i = 0; i < T.phases.length; i++) if (T.phases[i].key === key) return T.phases[i];
    return T.phases[0];
  }
  function isHitch(d) { return /搭车/.test(d.to) || /搭车/.test(d.summary); }
  function niceTo(s) { return String(s).replace(/（([^）]*)）/g, ' · $1'); }
  function plainTo(s) { return String(s).replace(/（[^）]*）/g, ''); }
  function inkOf(key) { return PHASE_INK[key] || '#8fb0ff'; }

  /* ================= hero ================= */

  function renderStats() {
    var MT = T.mountains || [];
    var peaks = MT.length;
    var hitch = MT.filter(function (m) { return m.mode === 'hitch'; }).length;
    var items = [
      [String(T.totalDays), '天', '从 7 月 11 日到 8 月 17 日'],
      [fmt(T.totalKm), '公里', '新乡 → 拉萨，含休整与搭车'],
      [fmt(T.maxAlt), '米', '最高点 · ' + T.maxAltName],
      [String(peaks), '座', '翻过的垭口' + (hitch ? '（含 ' + hitch + ' 座搭车）' : '')]
    ];
    $('#stats').innerHTML = items.map(function (it) {
      return '<li class="stat"><b>' + it[0] + '<i>' + it[1] + '</i></b><span>' + it[2] + '</span></li>';
    }).join('');
  }

  function renderRibbon() {
    var names = [days[0].from];
    var idx = [0];
    for (var i = 0; i < N; i++) {
      var to = plainTo(days[i].to).replace(/\(.*?\)/g, '');
      if (to !== names[names.length - 1]) { names.push(to); idx.push(i); }
    }
    var html = names.map(function (n, k) {
      var s = '<a class="rb" href="#" data-i="' + idx[k] + '">' + esc(n) + '</a>';
      return k < names.length - 1 ? s + '<span class="rb-sep">→</span>' : s;
    }).join('');
    var box = $('#ribbon');
    box.innerHTML = html;
    box.addEventListener('click', function (e) {
      var a = e.target.closest('.rb');
      if (!a) return;
      e.preventDefault();
      gotoDay(parseInt(a.dataset.i, 10));
    });
  }

  /* ================= elevation profile ================= */

  var PRO = null;

  function renderProfile() {
    var W = 1000, H = 252;
    var PL = 42, PR = 16, PT = 42, PB = 34;
    var pw = W - PL - PR, ph = H - PT - PB;
    var altMax = 5600;

    var xs = [], ys = [], alts = [];
    for (var i = 0; i < N; i++) {
      var x = PL + (N === 1 ? pw / 2 : (i / (N - 1)) * pw);
      var a = days[i].alt || 0;
      xs.push(x); alts.push(a);
      ys.push(PT + (1 - a / altMax) * ph);
    }

    function linePath() {
      var m = [], dx = [], dy = [], t = [];
      for (var i = 0; i < N - 1; i++) {
        dx[i] = xs[i + 1] - xs[i];
        dy[i] = ys[i + 1] - ys[i];
        m[i] = dy[i] / dx[i];
      }
      if (N < 2) return 'M' + xs[0] + ',' + ys[0];
      t[0] = m[0];
      for (var j = 1; j < N - 1; j++) {
        if (m[j - 1] * m[j] <= 0) { t[j] = 0; }
        else {
          var w1 = 2 * dx[j] + dx[j - 1], w2 = dx[j] + 2 * dx[j - 1];
          t[j] = (w1 + w2) / (w1 / m[j - 1] + w2 / m[j]);
        }
      }
      t[N - 1] = m[N - 2];
      var d = 'M' + xs[0].toFixed(2) + ',' + ys[0].toFixed(2);
      for (var k = 0; k < N - 1; k++) {
        var c1x = xs[k] + dx[k] / 3, c1y = ys[k] + t[k] * dx[k] / 3;
        var c2x = xs[k + 1] - dx[k] / 3, c2y = ys[k + 1] - t[k + 1] * dx[k] / 3;
        d += 'C' + c1x.toFixed(2) + ',' + c1y.toFixed(2) + ' ' + c2x.toFixed(2) + ',' + c2y.toFixed(2) + ' ' + xs[k + 1].toFixed(2) + ',' + ys[k + 1].toFixed(2);
      }
      return d;
    }

    var line = linePath();
    var area = line + 'L' + xs[N - 1].toFixed(2) + ',' + (PT + ph) + 'L' + xs[0].toFixed(2) + ',' + (PT + ph) + 'Z';

    var s = [];
    s.push('<svg viewBox="0 0 ' + W + ' ' + H + '">');
    s.push('<defs>');
    s.push('<linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">');
    s.push('<stop offset="0%" stop-color="#8ea9f8" stop-opacity=".42"/>');
    s.push('<stop offset="55%" stop-color="#b9caff" stop-opacity=".20"/>');
    s.push('<stop offset="100%" stop-color="#e8efff" stop-opacity=".05"/>');
    s.push('</linearGradient>');
    s.push('<linearGradient id="gLine" x1="0" y1="0" x2="1" y2="0">');
    s.push('<stop offset="0%" stop-color="#8fb0ff"/><stop offset="100%" stop-color="#5b7cfa"/>');
    s.push('</linearGradient>');
    s.push('</defs>');

    // phase bands
    var gi = 0;
    for (var p = 0; p < T.phases.length; p++) {
      var ph0 = T.phases[p];
      var start = -1, end = -1;
      for (var q = 0; q < N; q++) {
        if (days[q].phase === ph0.key) { if (start < 0) start = q; end = q; }
      }
      if (start < 0) continue;
      var half = N > 1 ? pw / (N - 1) / 2 : 0;
      var bx = Math.max(PL, xs[start] - half);
      var bw = Math.min(PL + pw, xs[end] + half) - bx;
      s.push('<rect x="' + bx.toFixed(2) + '" y="' + PT + '" width="' + bw.toFixed(2) + '" height="' + ph + '" fill="' + ph0.tone + '" opacity=".55"/>');
      s.push('<text x="' + (bx + bw / 2).toFixed(2) + '" y="' + (PT - 20) + '" text-anchor="middle" font-size="12.5" font-weight="600" fill="#a1a1a6">' + esc(ph0.name.split(' · ')[0]) + '</text>');
      gi++;
    }

    // grid
    for (var gv = 0; gv <= 5000; gv += 1000) {
      var gy = PT + (1 - gv / altMax) * ph;
      s.push('<line x1="' + PL + '" y1="' + gy.toFixed(2) + '" x2="' + (PL + pw) + '" y2="' + gy.toFixed(2) + '" stroke="rgba(0,0,0,.06)" stroke-width="1"/>');
      s.push('<text x="' + (PL - 9) + '" y="' + (gy + 4).toFixed(2) + '" text-anchor="end" font-size="11" fill="#b8b8be">' + gv + '</text>');
    }

    // highest line
    var hy = PT + (1 - T.maxAlt / altMax) * ph;
    s.push('<line x1="' + PL + '" y1="' + hy.toFixed(2) + '" x2="' + (PL + pw) + '" y2="' + hy.toFixed(2) + '" stroke="rgba(232,164,79,.55)" stroke-width="1" stroke-dasharray="4 4"/>');

    s.push('<path d="' + area + '" fill="url(#gArea)"/>');
    s.push('<path d="' + line + '" fill="none" stroke="url(#gLine)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>');

    // photo days ticks
    for (var f = 0; f < N; f++) {
      if (!days[f].photos.length) continue;
      s.push('<rect x="' + (xs[f] - 2.5).toFixed(2) + '" y="' + (PT + ph + 8) + '" width="5" height="5" rx="2" fill="rgba(91,124,250,.5)"/>');
    }
    // pass markers
    var topIdx = 0;
    for (var z = 0; z < N; z++) if ((days[z].alt || 0) > (days[topIdx].alt || 0)) topIdx = z;
    for (var m2 = 0; m2 < N; m2++) {
      if (!days[m2].pass) continue;
      var isTop = (m2 === topIdx);
      s.push('<circle cx="' + xs[m2].toFixed(2) + '" cy="' + ys[m2].toFixed(2) + '" r="' + (isTop ? 4.6 : 3.2) + '" fill="#fff" stroke="' + (isTop ? '#e8a44f' : '#5b7cfa') + '" stroke-width="2"/>');
    }
    s.push('<text x="' + (xs[topIdx] + 10).toFixed(2) + '" y="' + (ys[topIdx] - 9).toFixed(2) + '" font-size="12" font-weight="600" fill="#c08a3e">' + esc(T.maxAltName) + ' ' + fmt(T.maxAlt) + ' m</text>');

    // x labels
    var marks = [];
    for (var v = 0; v < T.phases.length; v++) {
      for (var w = 0; w < N; w++) if (days[w].phase === T.phases[v].key) { marks.push(w); break; }
    }
    marks.push(N - 1);
    marks = marks.filter(function (v2, k2, arr) { return arr.indexOf(v2) === k2; });
    for (var L = 0; L < marks.length; L++) {
      s.push('<text x="' + xs[marks[L]].toFixed(2) + '" y="' + (PT + ph + 26) + '" text-anchor="middle" font-size="11.5" fill="#b8b8be">' + esc(days[marks[L]].dateShort) + '</text>');
    }

    // cursor
    s.push('<g id="proCursor" style="opacity:0">');
    s.push('<line x1="0" y1="' + PT + '" x2="0" y2="' + (PT + ph) + '" stroke="rgba(29,29,31,.28)" stroke-width="1"/>');
    s.push('<circle id="proDot" cx="0" cy="0" r="5" fill="#fff" stroke="#5b7cfa" stroke-width="2.5"/>');
    s.push('</g>');
    s.push('<rect id="proHit" x="' + PL + '" y="' + PT + '" width="' + pw + '" height="' + ph + '" fill="transparent" style="cursor:pointer"/>');
    s.push('</svg>');
    s.push('<div class="prof-tip" id="proTip"></div>');

    var stage = $('#profileStage');
    stage.innerHTML = s.join('');
    PRO = { W: W, H: H, PL: PL, PT: PT, pw: pw, ph: ph, xs: xs, ys: ys, altMax: altMax, cur: 0 };
    bindProfile();
  }

  function bindProfile() {
    var stage = $('#profileStage');
    var svg = stage.querySelector('svg');
    var tip = $('#proTip');
    var cursor = stage.querySelector('#proCursor');
    var dot = stage.querySelector('#proDot');

    function nearest(clientX) {
      var r = svg.getBoundingClientRect();
      var sx = (clientX - r.left) / r.width * PRO.W;
      var best = 0, bd = Infinity;
      for (var i = 0; i < N; i++) {
        var dd = Math.abs(PRO.xs[i] - sx);
        if (dd < bd) { bd = dd; best = i; }
      }
      return { i: best, r: r };
    }

    stage.addEventListener('mousemove', function (e) {
      var n = nearest(e.clientX), i = n.i, r = n.r;
      PRO.cur = i;
      var cx = PRO.xs[i] / PRO.W * r.width;
      var cy = PRO.ys[i] / PRO.H * r.height;
      cursor.style.opacity = 1;
      cursor.querySelector('line').setAttribute('x1', PRO.xs[i]);
      cursor.querySelector('line').setAttribute('x2', PRO.xs[i]);
      dot.setAttribute('cx', PRO.xs[i]);
      dot.setAttribute('cy', PRO.ys[i]);
      var d = days[i];
      tip.innerHTML = '<b>' + esc(d.date) + '</b> · 第 ' + d.index + ' 天<br>' + esc(d.from) + ' → ' + esc(plainTo(d.to)) + '<br><em>海拔 ' + fmt(d.alt) + ' m</em>' + (d.km ? ' · ≈' + d.km + ' km' : ' · 休整');
      tip.style.left = cx + 'px';
      tip.style.top = cy + 'px';
      tip.classList.add('on');
    });
    stage.addEventListener('mouseleave', function () {
      cursor.style.opacity = 0;
      tip.classList.remove('on');
    });
    stage.addEventListener('click', function (e) {
      var n = nearest(e.clientX);
      gotoDay(n.i);
    });
  }

  /* ================= chips / rail ================= */

  function renderChips() {
    var box = $('#chips');
    box.innerHTML = days.map(function (d) {
      return '<button type="button" class="chip" data-i="' + (d.index - 1) + '"><b>' + d.dateShort + '</b><span>' + esc(niceTo(d.to)) + '</span></button>';
    }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (b) gotoDay(parseInt(b.dataset.i, 10));
    });
  }

  function renderRail() {
    var box = $('#rail');
    var h = [];
    T.phases.forEach(function (ph) {
      var list = days.filter(function (d) { return d.phase === ph.key; });
      if (!list.length) return;
      h.push('<p class="rail-sec">' + esc(ph.name.split(' · ')[0]) + '</p>');
      list.forEach(function (d) {
        h.push('<button type="button" class="railitem" data-i="' + (d.index - 1) + '"><b>' + d.dateShort + '</b><span>' + esc(d.from) + ' → ' + esc(niceTo(d.to)) + '</span></button>');
      });
    });
    box.innerHTML = h.join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.railitem');
      if (b) gotoDay(parseInt(b.dataset.i, 10));
    });
  }

  /* ================= timeline ================= */

  function metaHtml(d) {
    var h = [];
    if (d.km > 0) h.push('<li>骑行 <b>≈' + fmt(d.km) + '</b> 公里</li>');
    else h.push('<li class="rest"><b>休整日</b></li>');
    if (isHitch(d)) h.push('<li class="hitch"><b>搭车</b></li>');
    h.push('<li>终点海拔 <b>' + fmt(d.alt) + '</b> 米</li>');
    if (d.pass) h.push('<li class="peak">垭口 <b>' + esc(d.pass) + '</b>' + (d.passAlt ? ' · ' + fmt(d.passAlt) + ' 米' : '') + '</li>');
    return h.join('');
  }

  function photosHtml(list) {
    var solo = list.length === 1;
    var cols = Math.min(list.length, 3);
    var h = '<div class="day-photos' + (solo ? ' solo' : '') + '" style="--cols:' + cols + '">';
    list.forEach(function (p, k) {
      h += '<figure class="ph" data-idx="' + p._lb + '"><img src="' + p.thumb + '" alt="' + esc(p.alt) + '" loading="lazy" width="' + p.w + '" height="' + p.h + '"><figcaption>' + esc(p.alt) + '</figcaption></figure>';
    });
    return h + '</div>';
  }

  function renderTimeline() {
    var main = $('#tlMain');
    var frag = document.createDocumentFragment();
    T.phases.forEach(function (ph) {
      var list = days.filter(function (d) { return d.phase === ph.key; });
      if (!list.length) return;
      var head = el('div', 'phase-head');
      head.style.setProperty('--tone', ph.tone);
      head.style.setProperty('--inkc', inkOf(ph.key));
      head.innerHTML = '<h2>' + esc(ph.name) + '</h2><p>' + esc(ph.desc) + '</p>';
      frag.appendChild(head);

      list.forEach(function (d) {
        var art = el('article', 'day');
        art.id = 'd' + d.index;
        art.dataset.i = d.index - 1;
        art.style.setProperty('--tone', ph.tone);
        art.style.setProperty('--inkc', inkOf(ph.key));
        var long = (d.body.join('').length > 430);
        if (long) art.classList.add('collapsed');

        var h = '';
        h += '<div class="day-top"><div class="day-date"><span class="dd">' + esc(d.date) + '</span><span class="dn">第 ' + d.index + ' 天</span><span class="day-wd">' + wd(d) + '</span></div>';
        h += '<h3 class="day-route">' + esc(d.from) + '<span class="arw">→</span>' + esc(d.to) + '</h3></div>';
        h += '<ul class="day-meta">' + metaHtml(d) + '</ul>';
        h += '<p class="day-sum">' + esc(d.summary) + '</p>';
        h += '<div class="day-body">' + d.body.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>';
        if (long) h += '<button type="button" class="more">展开全文<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></button>';
        if (d.photos.length) h += photosHtml(d.photos);
        art.innerHTML = h;
        frag.appendChild(art);
      });
    });
    main.appendChild(frag);

    // collapse handling
    $$('.day-body', main).forEach(function (b) {
      var art = b.closest('.day');
      if (art.classList.contains('collapsed')) b.style.maxHeight = '13em';
    });
  }

  /* ================= prose ================= */

  function renderProse() {
    $('#preText').innerHTML = T.pre.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    $('#feelingText').innerHTML = T.feeling.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
  }

  /* ================= mountains ================= */

  function renderMountains() {
    var MT = (T.mountains || []).slice().sort(function (a, b) { return b.alt - a.alt; });
    var max = Math.max.apply(null, MT.map(function (m) { return m.alt; }));
    var hi = MT[0];
    var hitch = MT.filter(function (m) { return m.mode === 'hitch'; }).length;

    $('#mtSum').innerHTML =
      '<span><b>' + MT.length + '</b> 座垭口</span>' +
      '<span class="warm"><b>' + fmt(hi.alt) + '</b> 米 · 最高 ' + esc(hi.name) + '</span>' +
      '<span><b>' + (MT.length - hitch) + '</b> 座骑行翻越</span>' +
      '<span><b>' + hitch + '</b> 座搭车经过</span>';

    $('#mts').innerHTML = MT.map(function (m) {
      var w = Math.max(8, m.alt / max * 100);
      var ph = phaseOf(m.phase);
      var tags = '';
      if (m.alt === hi.alt) tags += '<span class="mt-tag warm">全程最高点</span>';
      if (m.mode === 'hitch') tags += '<span class="mt-tag hitch">搭车经过</span>';
      return '<button class="mt' + (m.alt >= 5000 ? ' hi' : '') + '" type="button" data-day="' + (m.day - 1) + '" style="--mtc:' + inkOf(m.phase) + '">' +
        '<span class="mt-no">' + m.order + '</span>' +
        '<span class="mt-main">' +
          '<span class="mt-head"><span class="mt-name">' + esc(m.name) + '</span>' +
            '<span class="mt-day">' + esc(m.date) + ' · 第 ' + m.day + ' 天 · ' + esc(m.from) + ' → ' + esc(m.to) + '</span>' + tags + '</span>' +
          '<span class="mt-note">' + esc(m.note) + '</span>' +
          '<span class="mt-bar"><i style="width:' + w.toFixed(1) + '%"></i></span>' +
        '</span>' +
        '<span class="mt-alt">' + fmt(m.alt) + '<i>m</i></span>' +
        '</button>';
    }).join('');
  }

  /* ================= map ================= */

  var MAP = { map: null, base: 'amap', segs: [], dots: [], labels: [], ready: false, cur: -1, datum: 'gcj' };

  /* WGS-84 -> GCJ-02（高德瓦片用 GCJ-02，偏移可达数百米） */
  var X_PI = 3.14159265358979324, X_A = 6378245.0, X_EE = 0.00669342162296594323;
  function xOut(lng, lat) { return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55); }
  function xLat(x, y) {
    var r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    r += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
    r += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
    return r;
  }
  function xLng(x, y) {
    var r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    r += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
    r += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x * Math.PI / 30)) * 2 / 3;
    return r;
  }
  function toDatum(pt) {
    if (MAP.datum === 'wgs') return pt;
    var lat = pt[0], lng = pt[1];
    if (xOut(lng, lat)) return pt;
    var dLat = xLat(lng - 105, lat - 35), dLng = xLng(lng - 105, lat - 35);
    var radLat = lat / 180 * Math.PI, magic = Math.sin(radLat);
    magic = 1 - X_EE * magic * magic;
    var sq = Math.sqrt(magic);
    dLat = (dLat * 180) / ((X_A * (1 - X_EE)) / (magic * sq) * Math.PI);
    dLng = (dLng * 180) / (X_A / sq * Math.cos(radLat) * Math.PI);
    return [lat + dLat, lng + dLng];
  }

  var MAP_TILES = {
    amap: { datum: 'gcj', url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', sub: ['1', '2', '3', '4'], max: 18 },
    esri: { datum: 'wgs', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', sub: null, max: 18 }
  };

  /* 常驻标签：全览时只留这几个，放大后才铺开全部城镇 */
  var MACRO = ['新乡·学校', '郑州', '西安·休整', '成都·休整', '雅安', '拉萨·布达拉宫'];

  function plain(s) { return String(s).replace(/（.*?）/g, ''); }

  /* 每天的锚点 = 当天轨迹的最后一个点（休整日沿用上一天），一定落在路上 */
  function buildAnchors() {
    MAP.anchor = {};
    var last = null;
    days.forEach(function (d, i) {
      var pts = T.route[i];
      if (pts && pts.length) last = pts[pts.length - 1];
      MAP.anchor[d.index] = last;
    });
  }

  function buildOverlays() {
    var L = window.L;
    if (!MAP.group) MAP.group = L.layerGroup().addTo(MAP.map);
    MAP.group.clearLayers();
    MAP.segs = []; MAP.dots = []; MAP.labels = [];

    var all = [];
    days.forEach(function (d, i) {
      var ph = phaseOf(d.phase);
      var ink = inkOf(d.phase);
      var pts = T.route[i];
      if (pts && pts.length > 1) {
        var ll = pts.map(function (p) { return toDatum(p); });
        all = all.concat(ll);
        var seg = L.polyline(ll, {
          color: ink, weight: 4, opacity: .92, lineJoin: 'round', lineCap: 'round'
        }).addTo(MAP.group);
        seg._day = i;
        seg.on('click', function () { gotoDay(i); });
        seg.on('mouseover', function () { if (i !== MAP.cur) seg.setStyle({ weight: 6, opacity: 1 }); });
        seg.on('mouseout', function () { seg.setStyle({ weight: i === MAP.cur ? 6 : 4, opacity: i === MAP.cur ? 1 : .92 }); });
        seg.bindTooltip(mapTip(d), { className: 'mttip', sticky: true, direction: 'top', offset: [0, -4] });
        MAP.segs.push(seg);
      }
      var a = MAP.anchor[d.index];
      if (a) {
        var p = toDatum(a);
        all.push(p);
        var dot = L.circleMarker(p, {
          radius: d.photos.length ? 4.4 : 3.6,
          color: '#fff', weight: 1.6, fillColor: ink, fillOpacity: 1
        }).addTo(MAP.group);
        dot._day = i;
        dot.on('click', function () { gotoDay(i); });
        dot.bindTooltip(mapTip(d), { className: 'mttip', direction: 'top', offset: [0, -6] });
        MAP.dots.push(dot);
        var lab = L.tooltip({
          permanent: true, direction: 'right', offset: [7, 0], interactive: false,
          className: 'plabel' + (MACRO.indexOf(d.to) >= 0 ? '' : ' minor')
        }).setLatLng(p).setContent(plain(d.to)).addTo(MAP.group);
        MAP.labels.push(lab);      }
    });
    MAP.all = all;
    MAP.bounds = L.latLngBounds(all);
    return all;
  }

  function mapTip(d) {
    return '<b>' + esc(d.date) + ' · 第 ' + d.index + ' 天</b><br>' + esc(d.from) + ' → ' + esc(d.to) +
      '<br><em>' + (d.km > 0 ? '≈' + fmt(d.km) + ' 公里' : '休整日') + (isHitch(d) ? ' · 搭车' : '') + '</em>';
  }

  function setBase(name) {
    var L = window.L, cfg = MAP_TILES[name];
    if (!cfg) return;
    MAP.base = name;
    MAP.datum = cfg.datum;
    $$('#baseSeg button').forEach(function (b) { b.classList.toggle('on', b.dataset.base === name); });
    if (MAP.tiles) MAP.map.removeLayer(MAP.tiles);
    MAP.tiles = L.tileLayer(cfg.url, {
      subdomains: cfg.sub || 'abc', maxZoom: cfg.max, minZoom: 3,
      crossOrigin: true, detectRetina: false
    });
    MAP.tileErr = 0;
    MAP.tiles.on('tileerror', function () {
      MAP.tileErr++;
      if (MAP.tileErr > 6) $('#mapBad').hidden = false;
    });
    MAP.tiles.on('tileload', function () {
      $('#mapBad').hidden = true;
      $('#mapLoad').classList.add('done');
    });
    MAP.tiles.addTo(MAP.map);
    buildOverlays();
    highlight(MAP.cur, true);
  }

  function highlight(i, force) {
    if (!MAP.ready) return;
    if (i == null || i < 0) i = 0;
    if (i === MAP.cur && !force) return;
    MAP.cur = i;
    MAP.segs.forEach(function (s) {
      var on = s._day === i;
      s.setStyle({ weight: on ? 7 : 4, opacity: on ? 1 : .92, color: on ? '#1d1d1f' : inkOf(days[s._day].phase) });
      if (on) s.bringToFront();
    });
    MAP.dots.forEach(function (s) {
      var on = s._day === i;
      s.setStyle({ radius: on ? 6.6 : (days[s._day].photos.length ? 4.4 : 3.6), weight: on ? 3 : 1.6, color: on ? '#1d1d1f' : '#fff' });
      if (on) s.bringToFront();
    });
    var d = days[i];
    $('#mapHint').textContent = d.date + ' · 第 ' + d.index + ' 天';
    $('#mapHintSub').textContent = d.from + ' → ' + d.to + ' · ' + (d.km > 0 ? '≈' + fmt(d.km) + ' 公里' : '休整日') + (isHitch(d) ? ' · 搭车' : '');
  }

  function mapFocus(i, zoom) {
    if (!MAP.ready) return;
    var pts = (T.route[i] || []).map(toDatum);
    if (!pts.length) { var a = MAP.anchor[days[i].index]; if (a) pts = [toDatum(a)]; }
    if (!pts.length) return;
    var b = window.L.latLngBounds(pts);
    if (b.getNorthEast().equals(b.getSouthWest())) {
      MAP.map.setView(b.getCenter(), zoom || 11, { animate: true });
    } else if (zoom) {
      MAP.map.fitBounds(b, { padding: [56, 56], maxZoom: zoom, animate: true });
    } else {
      MAP.map.fitBounds(b, { padding: [56, 56], maxZoom: 12, animate: true });
    }
  }

  function mapFitAll() {
    if (!MAP.ready || !MAP.bounds) return;
    MAP.map.fitBounds(MAP.bounds, { padding: [34, 34], animate: true });
  }

  function initMap() {
    var box = $('#mapCanvas');
    if (!box) return;
    if (!window.L) {
      $('#mapLoad').innerHTML = '地图库没有载入，轨迹无法显示';
      return;
    }
    MAP.anchor = {};
    buildAnchors();
    MAP.map = window.L.map(box, {
      center: [31.5, 103.5], zoom: 5, minZoom: 3, maxZoom: 17,
      zoomControl: true, attributionControl: false, preferCanvas: false,
      worldCopyJump: false, zoomSnap: .5, wheelPxPerZoomLevel: 90
    });
    MAP.map.zoomControl.setPosition('topright');
    MAP.group = window.L.layerGroup().addTo(MAP.map);
    MAP.ready = true;
    setBase('amap');
    mapFitAll();
    setTimeout(mapFitAll, 300);
    zoomLabels();
    MAP.map.on('zoomend', zoomLabels);
    setTimeout(function () { $('#mapLoad').classList.add('done'); }, 1700);
  }

  function zoomLabels() {
    var box = $('#mapCanvas');
    if (box) box.classList.toggle('z7', MAP.map.getZoom() >= 7);
  }

  /* ================= lightbox ================= */

  var LB = [], lbIdx = 0, lbOpen = false;

  function buildLightboxList() {
    for (var i = 0; i < N; i++) {
      for (var k = 0; k < days[i].photos.length; k++) {
        var p = days[i].photos[k];
        p._lb = LB.length;
        LB.push({ src: p.src, alt: p.alt, date: days[i].date, day: i });
      }
    }
  }

  function openLB(i) {
    if (i < 0 || i >= LB.length) return;
    lbIdx = i; lbOpen = true;
    var p = LB[i];
    $('#lbImg').src = p.src;
    $('#lbImg').alt = p.alt;
    $('#lbDate').textContent = p.date + ' · 第 ' + (p.day + 1) + ' 天';
    $('#lbText').textContent = p.alt;
    $('#lbCount').textContent = (i + 1) + ' / ' + LB.length;
    $('#lb').classList.add('open');
    $('#lb').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeLB() {
    lbOpen = false;
    $('#lb').classList.remove('open');
    $('#lb').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function stepLB(n) {
    lbIdx = (lbIdx + n + LB.length) % LB.length;
    openLB(lbIdx);
  }

  function bindLightbox() {
    document.addEventListener('click', function (e) {
      var f = e.target.closest('.ph');
      if (f) { openLB(parseInt(f.dataset.idx, 10)); }
    });
    $('#lbX').addEventListener('click', closeLB);
    $('#lbP').addEventListener('click', function () { stepLB(-1); });
    $('#lbN').addEventListener('click', function () { stepLB(1); });
    $('#lb').addEventListener('click', function (e) { if (e.target.id === 'lb') closeLB(); });
  }

  /* ================= day navigation ================= */

  var mode = 'timeline';
  var cur = 0;
  var lastActive = -1;
  var dayEls = [];

  function navH() { return $('#nav').offsetHeight + 22; }

  function gotoDay(i, silent) {
    i = Math.max(0, Math.min(N - 1, i));
    if (mode === 'single') { showSingle(i); return; }
    var node = dayEls[i];
    if (!node) return;
    var top = node.getBoundingClientRect().top + window.pageYOffset - navH();
    window.scrollTo({ top: Math.max(0, top), behavior: silent ? 'auto' : 'smooth' });
    node.classList.add('flash');
    setTimeout(function () { node.classList.remove('flash'); }, 1300);
    setActive(i);
  }

  function setActive(i) {
    if (i === lastActive) return;
    lastActive = i;
    cur = i;
    var d = days[i];
    dayEls.forEach(function (n, k) { n.classList.toggle('on', k === i); });
    $$('#rail .railitem').forEach(function (n, k) { n.classList.toggle('on', k === i); });
    var chips = $$('#chips .chip');
    chips.forEach(function (n, k) { n.classList.toggle('on', k === i); });
    var c = chips[i];
    if (c) {
      var box = $('#chips');
      var want = c.offsetLeft - box.clientWidth / 2 + c.clientWidth / 2;
      box.scrollTo({ left: Math.max(0, want), behavior: 'smooth' });
    }
    var ri = $$('#rail .railitem')[i];
    if (ri) {
      var rb = $('#rail');
      rb.scrollTo({ top: Math.max(0, ri.offsetTop - rb.clientHeight / 2 + ri.clientHeight / 2), behavior: 'smooth' });
    }
    $('#dateLabel').textContent = d.dateShort;
    var inp = $('#dateInput');
    if (inp.value !== isoOf(d)) inp.value = isoOf(d);
    highlight(i);
  }

  /* ================= single mode ================= */

  function showSingle(i) {
    i = Math.max(0, Math.min(N - 1, i));
    cur = i; lastActive = -1;
    var d = days[i], ph = phaseOf(d.phase);
    var card = $('#singleCard');
    var h = '';
    if (d.photos.length) h += '<img class="single-hero" src="' + d.photos[0].src + '" alt="' + esc(d.photos[0].alt) + '">';
    h += '<div class="single-in">';
    h += '<h2 class="single-date">' + esc(d.date) + '</h2>';
    h += '<p class="single-sub">第 ' + d.index + ' / ' + N + ' 天 · ' + wd(d) + ' · ' + esc(ph.name) + '</p>';
    h += '<p class="single-route">' + esc(d.from) + '<span class="arw">→</span>' + esc(d.to) + '</p>';
    h += '<ul class="day-meta">' + metaHtml(d) + '</ul>';
    h += '<p class="day-sum" style="--tone:' + ph.tone + '">' + esc(d.summary) + '</p>';
    h += '<div class="single-body">' + d.body.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>';
    if (d.photos.length > 1) h += photosHtml(d.photos.slice(1));
    h += '</div>';
    card.innerHTML = h;
    $('#singlePos').textContent = '第 ' + d.index + ' / ' + N + ' 天';
    $('#singleRoute').textContent = d.from + ' → ' + niceTo(d.to);
    $('#dateLabel').textContent = d.dateShort;
    var inp = $('#dateInput');
    if (inp.value !== isoOf(d)) inp.value = isoOf(d);
    var chips = $$('#chips .chip');
    chips.forEach(function (n, k) { n.classList.toggle('on', k === i); });
    var c = chips[i];
    if (c) {
      var box = $('#chips');
      box.scrollTo({ left: Math.max(0, c.offsetLeft - box.clientWidth / 2 + c.clientWidth / 2), behavior: 'smooth' });
    }
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = 'fadeUp .5s cubic-bezier(.22,1,.36,1)';
    highlight(i);
    mapFocus(i, 10);
  }

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    document.body.dataset.mode = m;
    $$('#seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === m); });
    moveThumb();
    var sec = $('#single');
    if (m === 'single') {
      sec.hidden = false;
      showSingle(cur);
      var top = sec.getBoundingClientRect().top + window.pageYOffset - navH();
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    } else {
      sec.hidden = true;
      lastActive = -1;
      gotoDay(cur, true);
      requestAnimationFrame(function () { gotoDay(cur, true); });
    }
    measureNav();
  }

  function moveThumb() {
    var on = $('#seg button.on');
    var th = $('#segThumb');
    if (!on || !th) return;
    th.style.width = on.offsetWidth + 'px';
    th.style.transform = 'translateX(' + (on.offsetLeft - 2) + 'px)';
  }

  /* ================= scroll ================= */

  function measureNav() {
    document.documentElement.style.setProperty('--navh', $('#nav').offsetHeight + 'px');
  }

  var ticking = false;
  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    $('#scrollbar').style.width = (max > 0 ? (window.pageYOffset / max * 100) : 0) + '%';
    $('#nav').classList.toggle('scrolled', window.pageYOffset > 8);

    if (mode === 'timeline') {
      var off = navH() + 40;
      var act = 0;
      for (var i = 0; i < dayEls.length; i++) {
        if (dayEls[i].getBoundingClientRect().top <= off) act = i; else break;
      }
      setActive(act);
    }
    ticking = false;
  }

  /* ================= init ================= */

  function init() {
    buildLightboxList();
    renderStats();
    renderRibbon();
    renderProfile();
    renderChips();
    renderRail();
    renderTimeline();
    renderProse();
    renderMountains();
    dayEls = $$('#tlMain .day');

    bindLightbox();
    try { initMap(); } catch (err) { if (window.console) console.warn('map init failed', err); }
    measureNav();
    moveThumb();

    $('#seg').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-mode]');
      if (b) setMode(b.dataset.mode);
    });
    $('#prevDay').addEventListener('click', function () { showSingle(cur - 1); });
    $('#nextDay').addEventListener('click', function () { showSingle(cur + 1); });

    // 垭口清单：点一座山，跳到那天
    $('#mts').addEventListener('click', function (e) {
      var b = e.target.closest('.mt');
      if (!b) return;
      gotoDay(+b.dataset.day);
    });

    // 地图控件
    $('#baseSeg').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-base]');
      if (b) setBase(b.dataset.base);
    });
    $('#mapFit').addEventListener('click', mapFitAll);
    $('#mapNow').addEventListener('click', function () {
      highlight(cur, true);
      mapFocus(cur, 10);
      var top = $('#mapsec').getBoundingClientRect().top + window.pageYOffset - navH();
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });

    var inp = $('#dateInput');
    var btn = $('#dateBtn');
    btn.addEventListener('click', function () {
      try {
        if (inp.showPicker) inp.showPicker();
        else { inp.style.pointerEvents = 'auto'; inp.style.opacity = '1'; inp.focus(); }
      } catch (err) {
        inp.style.pointerEvents = 'auto';
        inp.style.opacity = '.001';
        inp.focus();
      }
    });
    inp.addEventListener('change', function () {
      var v = inp.value;
      var idx = -1;
      for (var i = 0; i < N; i++) if (isoOf(days[i]) === v) { idx = i; break; }
      if (idx < 0) return;
      if (mode === 'single') { showSingle(idx); }
      else { gotoDay(idx); }
    });

    // nav links: make sure 逐日 goes back to timeline
    $$('.navlinks a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (a.getAttribute('href') === '#story' && mode === 'single') setMode('timeline');
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (lbOpen) {
        if (e.key === 'Escape') closeLB();
        else if (e.key === 'ArrowRight') stepLB(1);
        else if (e.key === 'ArrowLeft') stepLB(-1);
        return;
      }
      if (e.key === 'ArrowRight') { e.preventDefault(); gotoDay(cur + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); gotoDay(cur - 1); }
    });

    // timeline expand / collapse
    $('#tlMain').addEventListener('click', function (e) {
      var b = e.target.closest('.more');
      if (!b) return;
      var art = b.closest('.day');
      var body = art.querySelector('.day-body');
      if (art.classList.contains('collapsed')) {
        art.classList.remove('collapsed');
        body.style.maxHeight = body.scrollHeight + 'px';
        b.classList.add('open');
        b.childNodes[0].nodeValue = '收起';
        setTimeout(function () { if (!art.classList.contains('collapsed')) body.style.maxHeight = 'none'; }, 680);
      } else {
        body.style.maxHeight = body.scrollHeight + 'px';
        void body.offsetWidth;
        art.classList.add('collapsed');
        body.style.maxHeight = '13em';
        b.classList.remove('open');
        b.childNodes[0].nodeValue = '展开全文';
        var top = art.getBoundingClientRect().top + window.pageYOffset - navH();
        if (window.pageYOffset > top) window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });

    var raf = false;
    window.addEventListener('scroll', function () {
      if (raf) return;
      raf = true;
      requestAnimationFrame(function () { onScroll(); raf = false; });
    }, { passive: true });
    window.addEventListener('resize', function () {
      measureNav(); moveThumb();
      if (MAP.ready) { MAP.map.invalidateSize(); zoomLabels(); }
    });

    // deep link
    var m = /^#d(\d+)$/.exec(location.hash || '');
    if (m) {
      var i0 = Math.max(0, Math.min(N - 1, parseInt(m[1], 10) - 1));
      setMode('single');
      showSingle(i0);
    } else {
      setActive(0);
      onScroll();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
