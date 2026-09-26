/* Sophie's Nail Salon — all game logic. Single-page, DOM + pointer events. */
(function () {
  'use strict';

  /* ================= helpers ================= */
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randi(a, b) { return Math.floor(rand(a, b + 1)); }
  function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function yesterdayStr() {
    var d = new Date(); d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /* ================= save ================= */
  var SAVE_KEY = 'sophie_salon_save';
  function defaultSave() {
    return {
      coins: 0, day: 1,
      upgrades: { chairs: 0, polish: 0, dryer: 0, station2: 0, coffee: 0, training: 0, lucky: 0, celeb: 0, decor: 0 },
      endless: {},            // endless equipment levels beyond fixed tiers: {branch: n}
      staff: [],              // hired employees: [{id,name,emoji,color,skill,specialty,served}]
      rooms: 1,               // salon rooms owned (room 0 = Cozy Studio)
      quests: [],             // active quest cards: [{key,icon,title,target,prog}]
      questsDone: 0,          // total quests completed ever
      questStars: 0,          // quest stars feed salon tiers alongside day stars
      theme: 'cozy',
      bestStars: {}, starsTotal: 0,
      customersServed: 0, perfectCount: 0, bestDayCoins: 0,
      streak: { count: 0, last: '' },
      seenUnlocks: [],
      mute: false,
      diamonds: 0,            // premium currency: spin wheel + VIP bonuses (never purchased)
      boost: 0,               // BOOST x2 tip-doubling charges (persist across days)
      lastSpin: '',           // YYYY-MM-DD of last free spin
      lastGift: '',           // YYYY-MM-DD of last daily gift
      managerOn: true,        // auto-seat toggle once the Manager milestone unlocks
      lastTierAnnounced: -1
    };
  }
  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      var s = JSON.parse(raw), d = defaultSave();
      for (var k in d) { if (s[k] !== undefined) d[k] = s[k]; }
      for (var u in d.upgrades) { if (s.upgrades && s.upgrades[u] !== undefined) d.upgrades[u] = s.upgrades[u]; }
      if (s.endless) { for (var e in s.endless) d.endless[e] = s.endless[e]; }
      if (!Array.isArray(d.staff)) d.staff = [];
      if (!Array.isArray(d.quests)) d.quests = [];
      return d;
    } catch (e) { return defaultSave(); }
  }
  var save = loadSave();
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }

  /* ================= UI primitives ================= */
  var screens = ['screen-title', 'screen-dayintro', 'screen-salon', 'screen-summary', 'screen-shop'];
  function showScreen(id) {
    screens.forEach(function (s) { $(s).classList.toggle('hidden', s !== id); });
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  var toastTimer = null;
  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg; t.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, ms || 2200);
  }
  function openModal(html) {
    $('modal-content').innerHTML = html;
    $('modal').classList.remove('hidden');
  }
  function closeModal() { $('modal').classList.add('hidden'); }
  function confetti(n) {
    var layer = $('confetti-layer');
    var colors = ['#ff6fa5', '#ffcf5c', '#7bd8a8', '#8ed6ff', '#b48cff'];
    for (var i = 0; i < (n || 60); i++) {
      var b = document.createElement('div');
      b.className = 'confetti-bit';
      b.style.left = rand(0, 100) + 'vw';
      b.style.background = choice(colors);
      b.style.animationDuration = rand(1.6, 3.2) + 's';
      layer.appendChild(b);
      (function (el) { setTimeout(function () { el.remove(); }, 3600); })(b);
    }
    try { AudioSys.confetti(); } catch (e) {}
  }
  function coinsFly(text) {
    var el = document.createElement('div');
    el.className = 'coins-fly'; el.textContent = text;
    el.style.left = (window.innerWidth / 2 - 30) + 'px';
    el.style.top = (window.innerHeight / 2) + 'px';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1100);
  }
  function sophieSay(text, ms) {
    var s = $('sophie-speech');
    s.textContent = text; s.classList.remove('hidden');
    setTimeout(function () { s.classList.add('hidden'); }, ms || 2600);
  }

  /* ================= art helpers (graceful fallbacks) ================= */
  function customerFace(def) {
    // returns HTML: <img> with onerror fallback to emoji circle
    var wrap = document.createElement('div');
    wrap.className = 'cust-face';
    var img = document.createElement('img');
    img.src = 'assets/art/' + def.art;
    img.alt = def.name;
    img.addEventListener('error', function () {
      var card = img.closest('.customer-card');
      if (card) card.classList.add('no-art');
      else { wrap.classList.add('no-art'); }
    });
    var fb = document.createElement('div');
    fb.className = 'cust-emoji-fallback';
    fb.style.background = def.skin || '#F6C9A0';
    fb.textContent = def.emoji || '😊';
    wrap.appendChild(img); wrap.appendChild(fb);
    return wrap;
  }

  function fmtTime(s) {
    s = Math.max(0, Math.ceil(s || 0));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  /* ================= tycoon helpers ================= */
  /** Endless levels bought beyond a branch's fixed tiers (derived from total). */
  function endlessLv(branch) {
    var nTiers = SALON.UPGRADES[branch].tiers.length;
    return Math.max(0, (save.upgrades[branch] || 0) - nTiers);
  }
  function endlessObj() {
    var o = {};
    for (var b in SALON.UPGRADES) o[b] = endlessLv(b);
    return o;
  }
  /** Combined stars for salon tiers: day stars + quest stars. */
  function tierStars() { return save.starsTotal + (save.questStars || 0); }
  function tierIdxNow() { return SALON.tierForStars(tierStars()); }
  function manualStationCount() { return SALON.manualStations(save.upgrades, endlessObj()); }
  function staffStationCount() { return SALON.staffStationsForRooms(save.rooms); }
  function freeStaffSlots() { return staffStationCount() - save.staff.length; }

  /* ================= QUESTS ================= */
  function ensureQuests() {
    if (!Array.isArray(save.quests)) save.quests = [];
    var active = save.quests.map(function (q) { return q.key; });
    while (save.quests.length < 3) {
      var key = SALON.nextQuestKey(save.questsDone || 0, active, freeStaffSlots());
      active.push(key);
      save.quests.push(SALON.makeQuest(key, save.questsDone || 0, save.day));
    }
    persist();
  }

  /** Advance quests with the given key by n (default 1). Auto-completes. */
  function questEvent(key, n) {
    if (!Array.isArray(save.quests) || !save.quests.length) ensureQuests();
    var hit = false;
    save.quests.forEach(function (q) {
      if (q.key === key && q.prog < q.target) {
        q.prog = Math.min(q.target, q.prog + (n === undefined ? 1 : n));
        hit = true;
      }
    });
    if (hit) { persist(); checkQuestCompletions(); renderQuestStrip(); }
  }

  function checkQuestCompletions() {
    var done = save.quests.filter(function (q) { return q.prog >= q.target; });
    done.forEach(completeQuest);
  }

  function completeQuest(q) {
    var i = save.quests.indexOf(q);
    if (i < 0) return;
    save.quests.splice(i, 1);
    var reward = SALON.questReward(save.questsDone || 0, save.day);
    save.coins += reward.coins;
    save.questStars = (save.questStars || 0) + reward.stars;
    save.questsDone = (save.questsDone || 0) + 1;
    if (G && G.active) G.questsToday = (G.questsToday || 0) + 1;
    ensureQuests();
    persist();
    try { AudioSys.cash(); } catch (e) {}
    confetti(40);
    toast('🎉 Quest complete: ' + q.title + ' — +' + reward.coins + ' 🪙 +' + reward.stars + ' ⭐');
    if (G && G.active) updateHud();
    // quest stars can push a salon tier up mid-day
    var ti = tierIdxNow();
    if (ti > save.lastTierAnnounced && ti >= 0) {
      save.lastTierAnnounced = ti;
      var t = SALON.tierAt(ti);
      if (t.theme) { save.theme = t.theme; document.body.setAttribute('data-theme', t.theme); }
      persist();
      setTimeout(function () { confetti(90); toast('🏵 New salon tier: ' + t.name + '! +' + Math.round(t.tipBonus * 100) + '% tips!'); }, 800);
    }
  }

  function questCardMiniHtml(q) {
    var pct = Math.round(q.prog / q.target * 100);
    return '<div class="quest-mini"><div class="quest-mini-top"><span>' + q.icon + '</span>' +
      '<span class="quest-mini-title">' + q.title + '</span>' +
      '<b>' + Math.min(q.prog, q.target) + '/' + q.target + '</b></div>' +
      '<div class="quest-mini-bar"><div style="width:' + pct + '%"></div></div></div>';
  }

  function renderQuestStrip() {
    var el = $('quest-strip');
    if (!el) return;
    if (!save.quests || !save.quests.length) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.innerHTML = '<div class="quest-strip-label">📋 Quests</div>' +
      save.quests.map(questCardMiniHtml).join('');
    updateHud(); // refresh the quest notification dot
  }

  function openQuestModal() {
    ensureQuests();
    var next = SALON.questReward(save.questsDone || 0, save.day);
    var html = '<h2>📋 Quest Cards</h2>' +
      '<p style="text-align:center;font-size:13px;color:#a06a86">Complete quests for coins + ⭐ toward your salon tier. New quests appear forever!</p>';
    save.quests.forEach(function (q) {
      var pct = Math.round(q.prog / q.target * 100);
      html += '<div class="quest-full"><div class="quest-full-head"><span style="font-size:24px">' + q.icon + '</span>' +
        '<div><b>' + q.title + '</b><div style="font-size:12px;color:#a06a86">' + Math.min(q.prog, q.target) + ' / ' + q.target +
        ' — reward: 🪙' + next.coins + ' + ⭐</div></div></div>' +
        '<div class="quest-mini-bar"><div style="width:' + pct + '%"></div></div></div>';
    });
    html += '<p style="text-align:center;font-size:13px;color:#a06a86">✅ ' + (save.questsDone || 0) + ' quests completed all-time</p>';
    openModal(html);
  }

  /* ================= ACTION BAR: GIFT / SPIN / BOOST / MANAGER / SETTINGS ================= */

  /** + on the coin pill: free daily gift (gameplay grant, never a purchase). */
  function openGiftModal() {
    var t = todayStr();
    var gift = Math.max(100, Math.round(SALON.estimateDayIncome(save.day) * 0.5));
    if (save.lastGift === t) {
      openModal('<h2>🎁 Daily Gift</h2><p style="text-align:center">Already claimed today — come back tomorrow! 💖</p>' +
        '<div style="text-align:center"><button id="btn-gift-spin" class="btn btn-pink">🎡 Try the Lucky Spin</button></div>');
      $('btn-gift-spin').addEventListener('click', openSpinModal);
      return;
    }
    openModal('<h2>🎁 Daily Gift</h2><p style="text-align:center;font-size:18px">A gift for your salon:<br><b>+' + gift.toLocaleString() + ' 🪙</b></p>' +
      '<div style="text-align:center"><button id="btn-gift-claim" class="btn btn-gold btn-big">Claim!</button></div>');
    $('btn-gift-claim').addEventListener('click', function () {
      save.coins += gift; save.lastGift = t; persist(); updateHud();
      try { AudioSys.cash(); } catch (e) {}
      confetti(40);
      toast('🎁 +' + gift.toLocaleString() + ' coins!');
      closeModal();
    });
  }

  /* Lucky Spin: daily free spin, extra spins for diamonds. Prizes are earned
   * by playing — there is no real-money purchase anywhere in the game. */
  var SPIN_SEGS = [
    { label: '+100 🪙', kind: 'coins', amt: 100, color: '#ffcf5c' },
    { label: '+1 💎', kind: 'diamonds', amt: 1, color: '#8ed6ff' },
    { label: 'BOOST ×3', kind: 'boost', amt: 3, color: '#7bd8a8' },
    { label: '+250 🪙', kind: 'coins', amt: 250, color: '#ff9ec4' },
    { label: '+3 💎', kind: 'diamonds', amt: 3, color: '#b48cff' },
    { label: '+500 🪙', kind: 'coins', amt: 500, color: '#ffd166' },
    { label: '+2 💎', kind: 'diamonds', amt: 2, color: '#8ed6ff' },
    { label: '+1000 🪙', kind: 'coins', amt: 1000, color: '#ff8a80' }
  ];
  var spinning = false;

  function awardSpin(idx) {
    var s = SPIN_SEGS[idx], msg;
    if (s.kind === 'coins') {
      var amt = Math.round(s.amt * (1 + (save.day - 1) * 0.02));
      save.coins += amt; msg = '+' + amt.toLocaleString() + ' 🪙!';
    } else if (s.kind === 'diamonds') {
      save.diamonds = (save.diamonds || 0) + s.amt; msg = '+' + s.amt + ' 💎!';
    } else {
      save.boost = (save.boost || 0) + s.amt;
      if (G && G.active) G.boostLeft += s.amt;
      msg = 'BOOST ×2 for ' + s.amt + ' services!';
    }
    persist(); updateHud();
    var r = $('spin-result');
    if (r) r.textContent = '🎉 ' + msg;
    try { AudioSys.cash(); AudioSys.sparkle(); } catch (e) {}
    confetti(50);
    coinsFly(msg);
  }

  function openSpinModal() {
    var t = todayStr();
    var free = save.lastSpin !== t;
    var cost = 10;
    var grad = SPIN_SEGS.map(function (s, i) { return s.color + ' ' + (i * 45) + 'deg ' + ((i + 1) * 45) + 'deg'; }).join(', ');
    var labels = SPIN_SEGS.map(function (s, i) {
      return '<div class="spin-label" style="transform:rotate(' + (i * 45 + 22.5) + 'deg)"><span>' + s.label + '</span></div>';
    }).join('');
    var html = '<h2>🎡 Lucky Spin</h2>' +
      '<div class="spin-sub">' + (free ? '✨ Your <b>free daily spin</b> is ready!' :
        'Free spin used — extra spins cost <b>10 💎</b> (you have ' + (save.diamonds || 0) + ')') + '</div>' +
      '<div class="spin-wrap"><div class="spin-pointer">🔻</div><div class="spin-wheel" id="spin-wheel" style="background:conic-gradient(' + grad + ')">' + labels + '</div></div>' +
      '<div id="spin-result" class="spin-result"></div>' +
      '<div style="text-align:center"><button id="btn-spin-go" class="btn btn-pink btn-big">' + (free ? 'SPIN FREE!' : 'SPIN (10 💎)') + '</button></div>' +
      '<div class="spin-note">Prizes are earned by playing — never any real-money purchase. 💖</div>';
    openModal(html);
    var wheel = $('spin-wheel');
    $('btn-spin-go').addEventListener('click', function () {
      if (spinning) return;
      var isFree = save.lastSpin !== todayStr();
      if (!isFree) {
        if ((save.diamonds || 0) < cost) { toast('Not enough 💎 — VIPs and the free spin earn more!'); try { AudioSys.error(); } catch (e) {} return; }
        save.diamonds -= cost;
      } else {
        save.lastSpin = t;
      }
      persist(); updateHud();
      spinning = true;
      $('btn-spin-go').disabled = true;
      var idx = Math.floor(Math.random() * SPIN_SEGS.length);
      // rotate so segment idx's center lands under the top pointer; always forward
      var cur = wheel._rot || 0;
      var want = (-(idx * 45 + 22.5)) % 360;
      var delta = ((want - cur) % 360 + 360) % 360;
      var next = cur + 360 * 6 + delta;
      wheel._rot = next;
      wheel.style.transform = 'rotate(' + next + 'deg)';
      try { AudioSys.pop(); } catch (e) {}
      setTimeout(function () {
        spinning = false;
        awardSpin(idx);
        if ($('btn-spin-go')) { openSpinModal(); } // rebuild to refresh free/paid state
      }, 3400);
    });
  }

  /** Green BOOST button: doubles tips while charges last. */
  function openBoostModal() {
    var n = (G && G.active) ? (G.boostLeft || 0) : (save.boost || 0);
    var html = '<h2>🪙×2 BOOST</h2>' +
      '<p style="text-align:center">Doubles <b>tips</b> for your next <b>' + n + '</b> service' + (n === 1 ? '' : 's') + '!</p>' +
      '<div style="text-align:center"><button id="btn-boost-refill" class="btn btn-green">Refill +3 for 5 💎</button></div>' +
      '<p style="text-align:center;font-size:13px;color:#a06a86">Win more BOOST on the 🎡 Lucky Spin!</p>';
    openModal(html);
    $('btn-boost-refill').addEventListener('click', function () {
      if ((save.diamonds || 0) < 5) { toast('Not enough 💎 — spin the wheel or serve VIPs!'); try { AudioSys.error(); } catch (e) {} return; }
      save.diamonds -= 5;
      save.boost = (save.boost || 0) + 3;
      if (G && G.active) G.boostLeft += 3;
      persist(); updateHud();
      try { AudioSys.cash(); } catch (e) {}
      toast('+3 BOOST charges!');
      openBoostModal();
    });
  }

  /** Locked padlock button: Salon Manager milestone. */
  function openManagerModal() {
    if (!managerUnlocked()) {
      openModal('<h2>🔒 Salon Manager</h2>' +
        '<p style="text-align:center">Hire Sophie as your <b>Salon Manager</b> and she\'ll <b>auto-seat waiting customers</b> at your stations!</p>' +
        '<p style="text-align:center;font-size:18px">🔓 Unlocks on <b>Day 10</b><br><span style="font-size:14px;color:#a06a86">(currently Day ' + save.day + ')</span></p>');
      return;
    }
    openModal('<h2>🤖 Salon Manager</h2>' +
      '<p style="text-align:center">Sophie auto-seats waiting customers at your stations.</p>' +
      '<div style="text-align:center"><button id="btn-manager-toggle" class="btn ' + (save.managerOn ? 'btn-pink' : 'btn-white') + '">' + (save.managerOn ? '✅ Manager ON' : '❌ Manager OFF') + '</button></div>');
    $('btn-manager-toggle').addEventListener('click', function () {
      save.managerOn = !save.managerOn; persist();
      toast(save.managerOn ? '🤖 Manager ON — Sophie will seat customers!' : '🤖 Manager OFF');
      openManagerModal(); updateHud();
    });
  }

  /** Gear button: settings. */
  function openSettingsModal() {
    var h = '<h2>⚙️ Settings</h2><div style="display:flex;flex-direction:column;gap:8px">' +
      '<button id="s-mute" class="btn btn-white">' + (save.mute ? '🔇 Unmute' : '🔊 Mute') + '</button>' +
      '<button id="s-howto" class="btn btn-white">❓ How to Play</button>';
    if (managerUnlocked()) h += '<button id="s-manager" class="btn btn-white">🤖 Salon Manager: ' + (save.managerOn ? 'ON' : 'OFF') + '</button>';
    if (G && G.active) h += '<button id="s-quit" class="btn btn-white">🏠 Quit to Title</button>';
    h += '<button id="s-reset" class="btn btn-white" style="color:#c62828;border-color:#ef9a9a">🗑 Reset all progress</button></div>';
    openModal(h);
    $('s-mute').addEventListener('click', function () { toggleMute(); openSettingsModal(); });
    $('s-howto').addEventListener('click', function () { openModal(howToHtml()); });
    if ($('s-manager')) $('s-manager').addEventListener('click', function () { save.managerOn = !save.managerOn; persist(); openSettingsModal(); });
    if ($('s-quit')) $('s-quit').addEventListener('click', function () {
      closeModal(); abortMinigame();
      if (G) { G.active = false; if (G.tickTimer) clearInterval(G.tickTimer); }
      Platform.gameplayStop();
      try { AudioSys.stopMusic(); } catch (e) {}
      renderTitle(); showScreen('screen-title');
    });
    $('s-reset').addEventListener('click', function () {
      if (window.confirm('Reset ALL Sophie\'s Nail Salon progress? This cannot be undone!')) {
        try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
        location.reload();
      }
    });
  }

  /* ================= runtime day state ================= */
  var G = null;
  function newDayState(day) {
    return {
      day: day, queue: [], waiting: [], stations: [],
      staffJobs: [], // per staff station: {emp, cust, tLeft, total} or {emp:null}
      seatWalks: {}, // station idx -> cust uid for customers strolling to a station
      served: 0, walkouts: 0, sats: [], coinsEarned: 0, staffEarned: 0,
      perfectToday: 0, questsToday: 0, boostLeft: 0, // boostLeft: BOOST x2 charges left
      timeLeft: 0,   // day shift countdown (seconds); 0 = closing time
      closed: false, // closing time: no new spawns, finish current customers
      managerAcc: 0, // manager auto-seat accumulator
      tickTimer: null, active: false, doubled: false, cotd: null
    };
  }
  var custSeq = 0;

  /* ================= unlock helpers ================= */
  function unlockedPolishes() {
    return SALON.POLISHES.filter(function (p) { return !SALON.polishLock(p, save.day, save.upgrades); });
  }
  function unlockedDecos() {
    return SALON.DECORATIONS.filter(function (d) { return !SALON.decoLock(d, save.upgrades); });
  }
  function decoById(id) {
    for (var i = 0; i < SALON.DECORATIONS.length; i++) if (SALON.DECORATIONS[i].id === id) return SALON.DECORATIONS[i];
    return SALON.DECORATIONS[0];
  }
  function polishById(id) {
    for (var i = 0; i < SALON.POLISHES.length; i++) if (SALON.POLISHES[i].id === id) return SALON.POLISHES[i];
    return SALON.POLISHES[0];
  }

  /* ================= streak ================= */
  function updateStreak() {
    var t = todayStr();
    if (save.streak.last === t) return;
    if (save.streak.last === yesterdayStr()) save.streak.count += 1;
    else save.streak.count = 1;
    save.streak.last = t;
    persist();
  }

  /* ================= TITLE ================= */
  function themeDisplayName(id) {
    var map = { cozy: 'Cozy Pink', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond', sakura: 'Sakura', ocean: 'Ocean', royal: 'Royal' };
    return map[id] || id;
  }
  function availableThemes() {
    var list = [{ id: 'cozy', label: 'Cozy Pink (default)', unlocked: true }];
    var tierIdx = tierIdxNow();
    for (var i = 0; i < SALON.TIER_NAMES.length; i++) {
      var t = SALON.tierAt(i);
      if (!t.theme) continue;
      list.push({ id: t.theme, label: t.name + ' theme', unlocked: tierIdx >= i, lockLabel: 'Reach ' + t.name + ' salon tier (' + t.stars + ' ⭐)' });
    }
    SALON.DECOR_THEMES.forEach(function (th, i) {
      var names = ['Sakura', 'Ocean', 'Royal'];
      list.push({ id: th, label: names[i] + ' theme', unlocked: (save.upgrades.decor || 0) > i, lockLabel: 'Salon Decor Tier ' + (i + 1) });
    });
    return list;
  }

  function renderTitle() {
    // tier card (endless — there is always a next tier)
    var tStars = tierStars();
    var tierIdx = SALON.tierForStars(tStars);
    var next = SALON.tierAt(tierIdx + 1);
    var tierHtml;
    if (tierIdx < 0) {
      tierHtml = '<b>🏵 Salon Tier: Starter</b><div class="tier-bar"><div style="width:' +
        Math.round(tStars / 10 * 100) + '%"></div></div><div>' + tStars + ' / 10 ⭐ to Bronze — unlocks a new salon theme + tip bonus!</div>';
    } else {
      var cur = SALON.tierAt(tierIdx);
      tierHtml = '<b>🏵 Salon Tier: <span style="color:' + cur.color + '">' + cur.name + '</span></b>' +
        '<div class="tier-bar"><div style="width:' + Math.min(100, Math.round(tStars / next.stars * 100)) + '%"></div></div>' +
        '<div>' + tStars + ' / ' + next.stars + ' ⭐ to ' + next.name + ' — bigger tip bonus' + (next.theme ? ' + new theme' : '') + '!</div>';
    }
    $('tier-card').innerHTML = tierHtml;

    // customer of the day preview
    var cotd = SALON.cotdForDate(todayStr());
    var cname = cotd.isVip ? SALON.VIPS[0].name : SALON.CUSTOMERS[cotd.customerIdx].name;
    var pol = SALON.POLISHES[cotd.polishIdx];
    $('cotd-card').innerHTML = '<b>🌟 Today\'s Customer of the Day: ' + cname + '</b>' +
      '<div>Wants a <b>Deluxe Set</b> in <span class="polish-dot" style="background:' + pol.hex + '"></span> ' + pol.name +
      ' with ' + cotd.decoIds.map(function (d) { return decoById(d).emoji; }).join(' ') + ' — <b>2× payout!</b></div>' +
      '<div style="font-size:12px;color:#a06a86">A new Customer of the Day arrives every calendar day. Come back tomorrow!</div>';

    // trophies
    var nextTierTxt = 'Next: <span class="next-milestone">' + next.name + ' tier at ' + next.stars + ' ⭐ (' + (next.stars - tStars) + ' to go)</span>';
    $('trophies-card').innerHTML = '<h3>🏆 Trophies</h3>' +
      trophyRow('💰 Best day', save.bestDayCoins + ' coins', save.bestDayCoins > 0 ? 'Can you beat it?' : 'Play a day to set a record!') +
      trophyRow('⭐ Total stars', tStars + ' (' + save.starsTotal + ' day + ' + (save.questStars || 0) + ' quest)', nextTierTxt) +
      trophyRow('😊 Customers served', save.customersServed, milestone(save.customersServed, [10, 50, 150, 500], 'customers')) +
      trophyRow('💯 Perfect services', save.perfectCount, milestone(save.perfectCount, [1, 10, 50, 150], 'perfect services')) +
      trophyRow('👥 Employees', save.staff.length, save.staff.length > 0 ? 'Your team earns while you play!' : 'Hire staff in the Shop 👥 tab!') +
      trophyRow('🏢 Salon rooms', save.rooms, 'Room ' + save.rooms + ': ' + SALON.roomInfo(save.rooms - 1).name) +
      trophyRow('📋 Quests completed', save.questsDone || 0, 'New quests appear forever!') +
      trophyRow('🔥 Day streak', save.streak.count + (save.streak.count === 1 ? ' day' : ' days'), save.streak.count > 0 ? 'Come back tomorrow to keep it going!' : 'Play today to start a streak!') +
      '<div style="font-size:12px;color:#a06a86;margin-top:6px">Day ' + save.day + ' • 🪙 ' + save.coins + ' coins</div>';
    document.body.setAttribute('data-theme', save.theme || 'cozy');
  }
  function trophyRow(label, val, sub) {
    return '<div class="trophy-row"><div><b>' + label + ':</b> ' + val + '</div><div class="next-milestone" style="font-size:12px">' + sub + '</div></div>';
  }
  function milestone(val, steps, name) {
    for (var i = 0; i < steps.length; i++) if (val < steps[i]) return 'Next: ' + steps[i] + ' ' + name;
    return 'All milestones smashed! 🎉';
  }

  /* ================= DAY INTRO ================= */
  function newUnlockNotes() {
    var notes = [];
    var day = save.day;
    SALON.CUSTOMERS.forEach(function (c) {
      if (c.unlockDay && c.unlockDay === day && save.seenUnlocks.indexOf('cust:' + c.id) < 0) {
        notes.push('🎉 New regular customer: <b>' + c.name + '</b> — "' + c.quote + '"');
        save.seenUnlocks.push('cust:' + c.id);
      }
    });
    SALON.POLISHES.forEach(function (p) {
      if (p.unlock && p.unlock.kind === 'day' && p.unlock.day === day && save.seenUnlocks.indexOf('pol:' + p.id) < 0) {
        notes.push('💅 New polish unlocked: <b>' + p.name + '</b> <span class="polish-dot" style="background:' + p.hex + '"></span>');
        save.seenUnlocks.push('pol:' + p.id);
      }
    });
    if (day === 3 && save.seenUnlocks.indexOf('vip') < 0) {
      notes.push('💃 <b>VIPs</b> may now visit your salon — big payouts, very little patience!');
      save.seenUnlocks.push('vip');
    }
    persist();
    return notes;
  }

  function showDayIntro() {
    Platform.gameplayStop();
    var day = save.day;
    var n = SALON.customersForDay(day);
    $('dayintro-title').textContent = 'Day ' + day;
    $('dayintro-info').innerHTML =
      '<p>👥 <b>' + n + ' customers</b> booked today</p>' +
      '<p>⏱ <b>' + fmtTime(SALON.daySeconds(day)) + '</b> shift — closing time ends the day!</p>' +
      '<p>🪙 <b>' + save.coins + '</b> coins in the register' + (save.diamonds ? ' • 💎 <b>' + save.diamonds + '</b> diamonds' : '') + '</p>' +
      (save.staff.length ? '<p>👥 <b>' + save.staff.length + ' employee' + (save.staff.length > 1 ? 's' : '') + '</b> will auto-serve customers in ' + (save.rooms - 1) + ' staff room' + (save.rooms - 1 > 1 ? 's' : '') + '!</p>' : '') +
      (save.staff.length === 0 && save.rooms > 1 ? '<p>💡 You have a free staff room — hire an employee in the Shop 👥 tab!</p>' : '') +
      (save.staff.length === 0 && save.rooms === 1 ? '<p>💡 Expand your salon in the Shop 🏢 tab to hire employees!</p>' : '') +
      (save.streak.count > 1 ? '<p>🔥 ' + save.streak.count + '-day streak — keep it up!</p>' : '');
    var cotd = SALON.cotdForDate(todayStr());
    var cname = cotd.isVip ? SALON.VIPS[0].name : SALON.CUSTOMERS[cotd.customerIdx].name;
    $('dayintro-cotd').innerHTML = '<div class="unlock-note">🌟 <b>Customer of the Day: ' + cname + '</b> is first in line — Deluxe Set, 2× payout!</div>';
    var notes = newUnlockNotes();
    $('dayintro-unlocks').innerHTML = notes.map(function (x) { return '<div class="unlock-note">' + x + '</div>'; }).join('');
    showScreen('screen-dayintro');
  }

  /* ================= ORDER GENERATION ================= */
  function pickService(custDef) {
    var day = save.day, r = Math.random(), wDeluxe = 0.25, wPedi = 0.40;
    if (day >= 3) wDeluxe = 0.32;
    if (day >= 7) wDeluxe = 0.38;
    if (custDef.trait === 'picky') wDeluxe = 0.55;
    if (custDef.trait === 'vip') return 'deluxe';
    if (r < wDeluxe) return 'deluxe';
    if (r < wDeluxe + wPedi) return 'pedi';
    return 'mani';
  }

  function buildCustomer(isCotd, cotdSpec) {
    var day = save.day;
    var isVip = false, def;
    if (isCotd && cotdSpec) {
      isVip = cotdSpec.isVip;
      if (isVip) { def = SALON.VIPS[0]; }
      else {
        var c = SALON.CUSTOMERS[cotdSpec.customerIdx];
        if (c.unlockDay && day < c.unlockDay) c = SALON.CUSTOMERS[0];
        def = c;
      }
    } else if (Math.random() < SALON.vipChance(day, save.upgrades.celeb || 0, endlessLv('celeb'))) {
      isVip = true; def = SALON.VIPS[0];
    } else {
      var pool = SALON.CUSTOMERS.filter(function (c) { return !c.unlockDay || day >= c.unlockDay; });
      def = choice(pool.length ? pool : SALON.CUSTOMERS);
    }
    var serviceId = (isCotd && cotdSpec) ? cotdSpec.serviceId : pickService(def);
    var service = SALON.SERVICES[serviceId];
    var polish = (isCotd && cotdSpec) ? SALON.POLISHES[cotdSpec.polishIdx] : choice(unlockedPolishes());
    var decos = [];
    if (service.decoCount > 0) {
      if (isCotd && cotdSpec) {
        decos = cotdSpec.decoIds.slice(0, service.decoCount).map(function (id) { return decoById(id).id; });
      } else {
        var dpool = shuffle(unlockedDecos());
        // day 5+: pickier — prefer specific combos, day 7+: deluxe wants 3 decos (already 3)
        for (var i = 0; i < service.decoCount && i < dpool.length; i++) decos.push(dpool[i].id);
      }
    }
    var traitMult = (SALON.TUNING.traitPatience[def.trait] || 1);
    var coffeeMult = SALON.coffeeArrivalMult(save.upgrades.coffee || 0, endlessLv('coffee'));
    var vipMult = isVip ? SALON.TUNING.vipWaitMult : 1;
    var cotdMult = isCotd ? 0.8 : 1; // COTD is a bit impatient too (challenging!)
    var maxPatience = SALON.TUNING.baseWaitPatience * traitMult * coffeeMult * vipMult * cotdMult;
    return {
      uid: 'c' + (++custSeq),
      def: def, isVip: isVip, isCotd: !!isCotd, defId: def.id,
      service: service, polish: polish, decos: decos,
      patience: maxPatience, maxPatience: maxPatience,
      seatedPatience: SALON.TUNING.baseSeatPatience * traitMult * vipMult * cotdMult
    };
  }

  // Avoid the same named customer twice in one day's queue (COTD vs random pool).
  function dedupeDayQueue(queue) {
    var seen = {};
    queue.forEach(function (cust) {
      if (cust.isVip || cust.defId === 'vip') return; // VIPs may repeat
      if (seen[cust.defId]) {
        var pool = SALON.CUSTOMERS.filter(function (c) {
          return !c.unlockDay || save.day >= c.unlockDay;
        }).filter(function (c) { return !seen[c.id]; });
        if (pool.length) cust.def = choice(pool);
        cust.defId = cust.def.id;
      }
      seen[cust.defId] = true;
    });
  }

  /* ================= SALON SCREEN ================= */
  function orderBubbleHtml(cust) {
    var decoEmojis = cust.decos.map(function (d) { return decoById(d).emoji; }).join(' ');
    return '<div class="order-bubble"><span>' + cust.service.icon + '</span>' +
      '<span class="polish-dot" style="background:' + cust.polish.hex + '" title="' + cust.polish.name + '"></span>' +
      (decoEmojis ? '<span>' + decoEmojis + '</span>' : '') +
      (cust.isCotd ? '<span>🌟</span>' : '') + '</div>';
  }

  function customerCardHtml(cust) {
    var card = document.createElement('div');
    card.className = 'customer-card' + (cust.isVip ? ' vip' : '') + (cust.isCotd ? ' cotd' : '');
    card.dataset.uid = cust.uid;
    card.appendChild(customerFace(cust.def));
    var nm = document.createElement('div'); nm.className = 'cust-name';
    nm.textContent = (cust.isVip ? '💃 ' : '') + (cust.isCotd ? '🌟 ' : '') + cust.def.name;
    card.appendChild(nm);
    var q = document.createElement('div'); q.className = 'cust-quote'; q.textContent = '"' + cust.def.quote + '"';
    card.appendChild(q);
    var ob = document.createElement('div'); ob.innerHTML = orderBubbleHtml(cust);
    card.appendChild(ob.firstChild);
    var pb = document.createElement('div'); pb.className = 'patience-bar';
    var fill = document.createElement('div'); fill.style.width = '100%';
    pb.appendChild(fill); card.appendChild(pb);
    card._fill = fill; card._bar = pb;
    return card;
  }

  function renderWaiting() {
    var row = $('waiting-row');
    row.innerHTML = '';
    G.waiting.forEach(function (cust) {
      var card = customerCardHtml(cust);
      card.addEventListener('pointerdown', function () { seatCustomer(cust.uid); });
      if (cust._walkingIn) card.classList.add('walking-in');
      row.appendChild(card);
      cust._card = card;
    });
  }

  function nextStationCost() {
    var u = SALON.UPGRADES.station2, owned = save.upgrades.station2 || 0;
    if (owned < u.tiers.length) return u.tiers[owned].cost;
    return SALON.endlessLevelCost('station2', endlessLv('station2'));
  }

  function renderStations() {
    var wrap = $('stations');
    wrap.innerHTML = '';
    var n = manualStationCount();
    for (var i = 0; i < n; i++) {
      var st = document.createElement('div');
      st.className = 'station';
      var occ = G.stations[i];
      if (!occ) {
        st.innerHTML = '<div class="chair-emoji">💺</div><div class="station-label">Free station</div>';
      } else {
        var card = customerCardHtml(occ.cust);
        card.style.cursor = 'default';
        st.appendChild(card);
        occ.cust._card = card;
        var tag = document.createElement('div'); tag.className = 'step-tag';
        tag.textContent = '💅 ' + (occ.stepLabel || 'Getting pampered…');
        st.appendChild(tag);
        occ._tag = tag;
      }
      wrap.appendChild(st);
    }
    // teaser for the next purchasable station (endless)
    var teaser = document.createElement('div');
    teaser.className = 'station locked';
    teaser.innerHTML = '<div class="chair-emoji">🔒</div><div class="station-label">Next station<br>🪙' + nextStationCost() + ' in 🛠</div>';
    wrap.appendChild(teaser);
  }

  /* Staff wing: employees auto-serve customers at their own stations. */
  function renderStaffWing() {
    var wing = $('staff-wing'), row = $('staff-row');
    if (!wing || !row) return;
    if (!G || !G.staffJobs.length) { wing.classList.add('hidden'); return; }
    wing.classList.remove('hidden');
    row.innerHTML = '';
    G.staffJobs.forEach(function (sj) {
      var card = document.createElement('div');
      card.className = 'staff-station';
      if (!sj.emp) {
        card.innerHTML = '<div class="staff-emp">💺</div><div class="staff-station-label">Empty station<br>Hire staff in the Shop!</div>';
      } else {
        var inner = '<div class="staff-emp" style="background:' + (sj.emp.color || '#FFE3C2') + '">' + sj.emp.emoji + '</div>' +
          '<div class="staff-station-label"><b>' + sj.emp.name + '</b> • Skill ' + sj.emp.skill + '</div>';
        if (sj.job) {
          inner += '<div class="staff-cust">' + sj.job.cust.def.name + ' ' + sj.job.cust.service.icon + '</div>' +
            '<div class="staff-prog"><div style="width:0%"></div></div>';
        } else {
          inner += '<div class="staff-cust idle">Waiting for customers…</div>';
        }
        card.innerHTML = inner;
        sj._fill = card.querySelector('.staff-prog > div') || null;
      }
      row.appendChild(card);
    });
  }

  function staffTakeCustomer(sj) {
    var cust = null;
    if (G.waiting.length) cust = G.waiting.shift();
    else if (G.queue.length) cust = G.queue.shift();
    if (!cust) return false;
    cust.patience = cust.seatedPatience; cust.maxPatience = cust.seatedPatience;
    var total = SALON.empServiceSeconds(cust.service.id, sj.emp.skill, sj.emp.specialty);
    sj.job = { cust: cust, tLeft: total, total: total };
    renderWaiting();
    renderStaffWing();
    spawnNext();
    return true;
  }

  function staffTick(dt) {
    for (var i = 0; i < G.staffJobs.length; i++) {
      (function (idx) {
        var sj = G.staffJobs[idx];
        if (!sj || !sj.emp) return;
        if (!sj.job) {
          if (sj.cool > 0) { sj.cool -= dt; return; }
          staffTakeCustomer(sj);
          return;
        }
        sj.job.tLeft -= dt;
        if (sj._fill) sj._fill.style.width = clamp((1 - sj.job.tLeft / sj.job.total) * 100, 0, 100) + '%';
        if (sj.job.tLeft <= 0) finishStaffService(idx);
      })(i);
    }
  }

  function updateHud() {
    if (!$('hud')) return;
    var ti = tierIdxNow();
    var tierName = ti >= 0 ? SALON.tierAt(ti).name : 'Starter';
    if (G) {
      $('hud-timer').textContent = fmtTime(G.timeLeft);
      $('hud-timer').parentNode.classList.toggle('urgent', G.timeLeft < 30 && !G.closed);
      $('hud-daystars').textContent = calcStars() + '/3';
      $('hud-sub-day').textContent = '📅 Day ' + G.day;
      $('hud-sub-served').textContent = '😊 ' + G.served + '/' + SALON.customersForDay(G.day) + (G.closed ? ' • 🌙 closed' : '');
    } else {
      $('hud-timer').textContent = '--:--';
      $('hud-daystars').textContent = '–/3';
      $('hud-sub-day').textContent = '📅 Day ' + save.day;
      $('hud-sub-served').textContent = '';
    }
    $('hud-coins').textContent = (save.coins || 0).toLocaleString();
    $('hud-diamonds').textContent = save.diamonds || 0;
    $('hud-sub-tier').textContent = '🏵 ' + tierName;
    // BOOST charge count
    var bn = (G && G.active) ? (G.boostLeft || 0) : (save.boost || 0);
    var bc = $('ab-boost-count');
    if (bc) bc.textContent = '×' + bn;
    // Manager button: locked padlock until the Day 10 milestone
    var mb = $('ab-manager');
    if (mb) {
      var un = managerUnlocked();
      mb.classList.toggle('ab-locked', !un);
      mb.classList.toggle('ab-manager-on', un);
      var ico = mb.querySelector('.ab-ico');
      if (ico) ico.textContent = un ? '🤖' : '🔒';
    }
    // Quest dot: a quest is nearly complete
    var qd = $('ab-quest-dot');
    if (qd) {
      var hot = Array.isArray(save.quests) && save.quests.some(function (q) { return q.prog >= q.target * 0.8; });
      qd.classList.toggle('hidden', !hot);
    }
    // Spin dot: free daily spin available
    var sd = $('ab-spin-dot');
    if (sd) sd.classList.toggle('hidden', save.lastSpin === todayStr());
  }

  function freeStationIdx() {
    var n = manualStationCount();
    for (var i = 0; i < n; i++) {
      if (!G.stations[i] && !(G.seatWalks && G.seatWalks[i] != null)) return i;
    }
    return -1;
  }

  function seatCustomer(uid) {
    if (!G || !G.active) return;
    var cust = null;
    for (var i = 0; i < G.waiting.length; i++) if (G.waiting[i].uid === uid) cust = G.waiting[i];
    if (!cust || cust._seating || cust._walkingIn) return;
    var si = freeStationIdx();
    if (si < 0) { toast('No free station! Finish a customer first.'); try { AudioSys.error(); } catch (e) {} return; }
    if (G.seatWalks[si] != null) return; // someone is already strolling there
    G.seatWalks[si] = cust.uid;
    cust._seating = true;
    var card = cust._card;
    // the state commit happens when the customer arrives at the station
    animateSeatWalk(cust, si, card, function () {
      delete G.seatWalks[si];
      cust._seating = false;
    });
  }

  function spawnNext() {
    if (!G.queue.length || G.closed) return;
    if (G.waiting.length >= 4) return;
    var cust = G.queue.shift();
    G.waiting.push(cust);
    renderWaiting();
    animateWalkIn(cust); // strolls in through the entrance door
  }

  /** Closing time: the shift timer ran out. No new walk-ins; finish whoever is
   *  already here, then the day ends. Never punishes the player mid-service. */
  function closingTime() {
    if (!G || G.closed) return;
    G.closed = true;
    G.queue = []; // unspawned bookings roll over to tomorrow
    toast('🌙 Closing time! Finish your current customers.');
    sophieSay('Last call! Let\'s finish strong! 🌙');
    try { AudioSys.pop(); } catch (e) {}
    updateHud();
  }

  /** Salon Manager milestone: Day 10 unlocks Sophie auto-seating customers. */
  function managerUnlocked() { return save.day >= 10; }
  function managerSeat() {
    if (!G || !G.active || G.closed) return;
    for (var i = 0; i < G.waiting.length; i++) {
      var c = G.waiting[i];
      if (!c._seating && !c._walkingIn && !c._walked && freeStationIdx() >= 0) {
        seatCustomer(c.uid);
        return;
      }
    }
  }

  function startDay() {
    updateStreak();
    ensureQuests();
    G = newDayState(save.day);
    G.timeLeft = SALON.daySeconds(save.day);
    G.boostLeft = save.boost || 0;
    var ms = manualStationCount(), ss = staffStationCount();
    for (var s = 0; s < ms; s++) G.stations.push(null);
    for (var j = 0; j < ss; j++) G.staffJobs.push({ emp: save.staff[j] || null, job: null, cool: 1.5 });
    var n = SALON.customersForDay(save.day);
    var cotd = SALON.cotdForDate(todayStr());
    G.cotd = cotd;
    for (var i = 0; i < n; i++) {
      G.queue.push(buildCustomer(i === 0, i === 0 ? cotd : null));
    }
    dedupeDayQueue(G.queue);
    showScreen('screen-salon');
    renderStations(); renderStaffWing(); renderQuestStrip(); updateHud();
    for (var k = 0; k < 4; k++) spawnNext();
    G.active = true;
    Platform.gameplayStart();
    try { AudioSys.startMusic(); } catch (e) {}
    sophieSay(save.staff.length ? 'Welcome! Your team is ready — tap a customer to seat them too! 💅' : 'Welcome! Tap a customer to seat them. 💅');
    // patience + staff tick
    G.tickTimer = setInterval(tick, 200);
  }

  function drainRate() {
    return SALON.drainForDay(G.day) * SALON.chairsDrainMult(save.upgrades.chairs || 0, endlessLv('chairs'));
  }

  function allCustomers() {
    var list = G.waiting.slice();
    G.stations.forEach(function (s) { if (s) list.push(s.cust); });
    G.staffJobs.forEach(function (sj) { if (sj && sj.job) list.push(sj.job.cust); });
    return list;
  }

  function tick() {
    if (!G || !G.active) return;
    var dt = 0.2, dr = drainRate(), changed = false;
    // day shift countdown -> closing time
    if (!G.closed && G.timeLeft > 0) {
      G.timeLeft -= dt;
      if (G.timeLeft <= 0) { G.timeLeft = 0; closingTime(); }
      changed = true;
    }
    // Salon Manager auto-seats waiting customers (Day 10 milestone)
    if (managerUnlocked() && save.managerOn && !G.closed && !MG.open) {
      G.managerAcc += dt;
      if (G.managerAcc >= 1.5) { G.managerAcc = 0; managerSeat(); }
    }
    allCustomers().forEach(function (cust) {
      cust.patience -= dr * dt;
      changed = true;
      var frac = cust.patience / cust.maxPatience;
      if (cust._card && cust._card._fill) {
        cust._card._fill.style.width = clamp(frac * 100, 0, 100) + '%';
        cust._card._bar.classList.toggle('low', frac < 0.3);
      }
      if (cust.patience <= 0) walkout(cust);
    });
    staffTick(dt);
    if (changed) updateHud();
  }

  function removeCustomer(cust) {
    var wi = G.waiting.indexOf(cust);
    if (wi >= 0) { G.waiting.splice(wi, 1); renderWaiting(); }
    for (var i = 0; i < G.stations.length; i++) {
      if (G.stations[i] && G.stations[i].cust === cust) {
        G.stations[i] = null;
        if (MG.open && MG.stationCust === cust) abortMinigame();
        renderStations();
      }
    }
    for (var j = 0; j < G.staffJobs.length; j++) {
      var sj = G.staffJobs[j];
      if (sj && sj.job && sj.job.cust === cust) { sj.job = null; sj.cool = 1.5; sj._fill = null; renderStaffWing(); }
    }
    spawnNext();
    checkDayEnd();
  }

  function walkout(cust) {
    if (!G || !G.active) return;
    if (cust._walked) return;
    cust._walked = true;
    G.walkouts++;
    G.sats.push(0);
    try { AudioSys.error(); } catch (e) {}
    toast('😡 ' + cust.def.name + ' stormed out! (no pay)');
    sophieSay('Oh no… let\'s do better with the next one! 💦');
    var card = cust._card;
    var from = (card && card.parentNode) ? card.getBoundingClientRect() : null;
    removeCustomer(cust);
    updateHud();
    angryExitFrom(cust, from);
  }

  /* ================= MINI-GAME ENGINE ================= */
  var MG = { open: false, stationCust: null, stationIdx: -1, timers: [], intervals: [], raf: 0 };
  var STEP_TITLES = { soak: '🛁 Soak', file: '💅 File', paint: '🖌️ Paint', decorate: '💎 Decorate' };

  function clearMG() {
    MG.timers.forEach(clearTimeout); MG.intervals.forEach(clearInterval);
    MG.timers = []; MG.intervals = [];
    if (MG.raf) cancelAnimationFrame(MG.raf); MG.raf = 0;
    document.onpointermove = null; document.onpointerup = null;
  }

  function startService(si) {
    var occ = G.stations[si];
    if (!occ || MG.open) return;
    runStep(si, 0);
  }

  function runStep(si, stepIdx) {
    var occ = G.stations[si];
    if (!occ || !G.active) return;
    var step = occ.cust.service.steps[stepIdx];
    occ.stepIdx = stepIdx;
    occ.stepLabel = STEP_TITLES[step] + ' (' + (stepIdx + 1) + '/' + occ.cust.service.steps.length + ')';
    if (occ._tag) occ._tag.textContent = '💅 ' + occ.stepLabel;
    MG.open = true; MG.stationIdx = si; MG.stationCust = occ.cust;
    clearMG();
    $('minigame-overlay').classList.remove('hidden');
    $('mg-title').textContent = STEP_TITLES[step];
    $('mg-customer').textContent = occ.cust.def.name + ' • ' + occ.cust.service.icon + ' ' + occ.cust.service.name;
    $('mg-timerfill').style.width = '100%';
    $('mg-done').classList.add('hidden');
    $('mg-body').innerHTML = '';
    var builders = { soak: buildSoak, file: buildFile, paint: buildPaint, decorate: buildDecorate };
    builders[step](occ.cust, function (rawAcc) { completeStep(si, rawAcc); });
  }

  function trainingBonus() { return SALON.trainingBonusPts(save.upgrades.training || 0, endlessLv('training')); }
  function dryerMult() { return SALON.dryerTimerMult(save.upgrades.dryer || 0, endlessLv('dryer')); }

  function completeStep(si, rawAcc) {
    if (!MG.open || MG.stationIdx !== si) return;
    var acc = clamp(rawAcc + trainingBonus(), 0, 100);
    clearMG();
    MG.open = false;
    $('minigame-overlay').classList.add('hidden');
    var occ = G.stations[si];
    if (!occ || !G.active) return;
    occ.acc.push(acc);
    if (acc >= 98) { try { AudioSys.sparkle(); Platform.happyTime(); } catch (e) {} toast('Perfect step! ✨'); }
    else { try { AudioSys.pop(); } catch (e) {} }
    var next = occ.stepIdx + 1;
    if (next < occ.cust.service.steps.length) {
      setTimeout(function () { if (G && G.active && G.stations[si] === occ) runStep(si, next); }, 350);
    } else {
      setTimeout(function () { if (G && G.active) finishService(si); }, 350);
    }
  }

  function abortMinigame() {
    clearMG();
    MG.open = false;
    $('minigame-overlay').classList.add('hidden');
  }

  function mgTimer(seconds, onEnd) {
    var total = seconds, left = seconds;
    var iv = setInterval(function () {
      left -= 0.15;
      $('mg-timerfill').style.width = clamp(left / total * 100, 0, 100) + '%';
      if (left <= 0) { clearInterval(iv); onEnd(); }
    }, 150);
    MG.intervals.push(iv);
    return iv;
  }

  /* ---------- SOAK: tap 8 bubbles before the timer empties ---------- */
  function buildSoak(cust, done) {
    var body = $('mg-body');
    $('mg-hint').textContent = 'Tap the bubbles to pop them! 🫧 Pop 8!';
    var tub = document.createElement('div'); tub.className = 'soak-tub';
    var scoreEl = document.createElement('div'); scoreEl.className = 'soak-score'; scoreEl.textContent = '0 / 8';
    tub.appendChild(scoreEl); body.appendChild(tub);
    var popped = 0, finished = false;
    var need = 8;
    function finish() {
      if (finished) return; finished = true;
      done(popped / need * 100);
    }
    var spawn = setInterval(function () {
      if (finished || popped >= need) return;
      var b = document.createElement('div');
      b.className = 'bubble';
      var size = randi(44, 64);
      b.style.width = size + 'px'; b.style.height = size + 'px';
      b.style.left = rand(4, tub.clientWidth - size - 4) + 'px';
      b.style.bottom = '-70px';
      tub.appendChild(b);
      var y = -70;
      var rise = setInterval(function () {
        y += rand(2.5, 4.5);
        b.style.bottom = y + 'px';
        if (y > tub.clientHeight + 20) { clearInterval(rise); b.remove(); }
      }, 50);
      MG.intervals.push(rise);
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (finished) return;
        popped++;
        try { AudioSys.bubble(); } catch (err) {}
        scoreEl.textContent = Math.min(popped, need) + ' / ' + need;
        b.remove();
        if (popped >= need) finish();
      });
    }, 420);
    MG.intervals.push(spawn);
    mgTimer(12 * dryerMult(), finish);
  }

  /* ---------- FILE: drag left-right across the nail 6 times ---------- */
  function buildFile(cust, done) {
    var body = $('mg-body');
    $('mg-hint').textContent = 'Drag left ↔ right across the nail 6 times!';
    var nail = document.createElement('div'); nail.className = 'file-nail';
    var filer = document.createElement('div');
    filer.textContent = '🖊️';
    filer.style.cssText = 'position:absolute;top:-30px;left:50%;font-size:36px;transform:translateX(-50%);pointer-events:none;';
    nail.appendChild(filer);
    body.appendChild(nail);
    var prog = document.createElement('div'); prog.className = 'file-progress';
    var fill = document.createElement('div'); fill.style.width = '0%';
    prog.appendChild(fill); body.appendChild(prog);
    var passes = 0, halves = 0, finished = false, down = false, lastSide = 0;
    var needPasses = 6;
    function finish() {
      if (finished) return; finished = true;
      done(passes / needPasses * 100);
    }
    function sideOf(x, rect) {
      var rel = (x - rect.left) / rect.width;
      if (rel < 0.3) return -1;
      if (rel > 0.7) return 1;
      return 0;
    }
    nail.addEventListener('pointerdown', function (e) { down = true; try { nail.setPointerCapture(e.pointerId); } catch (err) {} });
    nail.addEventListener('pointerup', function () { down = false; lastSide = 0; });
    nail.addEventListener('pointercancel', function () { down = false; });
    nail.addEventListener('pointermove', function (e) {
      if (!down || finished) return;
      var rect = nail.getBoundingClientRect();
      filer.style.left = clamp(e.clientX - rect.left, 10, rect.width - 10) + 'px';
      var s = sideOf(e.clientX, rect);
      if (s !== 0 && lastSide !== 0 && s !== lastSide) {
        halves++;
        try { AudioSys.brush(); } catch (err) {}
        if (halves % 2 === 0) passes++;
        fill.style.width = clamp(halves / (needPasses * 2) * 100, 0, 100) + '%';
        if (passes >= needPasses) { finish(); return; }
      }
      if (s !== 0) lastSide = s;
    });
    mgTimer(25 * dryerMult(), finish);
  }

  /* ---------- PAINT: brush paints nails; coverage scored, outside penalized ---------- */
  function buildPaint(cust, done) {
    var body = $('mg-body');
    $('mg-hint').textContent = 'Drag to paint the nails ' + cust.polish.name + '! Stay inside the lines!';
    var cv = document.createElement('canvas');
    cv.id = 'paint-canvas';
    cv.width = 360; cv.height = 320;
    body.appendChild(cv);
    var sw = document.createElement('div'); sw.className = 'paint-swatches';
    sw.innerHTML = '<span class="polish-dot" style="background:' + cust.polish.hex + ';width:30px;height:30px"></span><b>' + cust.polish.name + '</b>';
    body.appendChild(sw);
    var doneBtn = $('mg-done');
    doneBtn.classList.remove('hidden');

    var ctx = cv.getContext('2d');
    var layer = document.createElement('canvas'); layer.width = 360; layer.height = 320;
    var lctx = layer.getContext('2d');
    var nails = [];
    for (var i = 0; i < 5; i++) {
      nails.push({ x: 18 + i * 68, y: 90, w: 52, h: 100, cells: [], painted: 0 });
    }
    var COLS = 6, ROWS = 10;
    nails.forEach(function (n) {
      for (var r = 0; r < ROWS; r++) { n.cells[r] = []; for (var c = 0; c < COLS; c++) n.cells[r][c] = false; }
    });
    var totalCells = 5 * COLS * ROWS;
    var outside = 0, finished = false, down = false, lastX = 0, lastY = 0;

    function inNail(x, y) {
      for (var i = 0; i < nails.length; i++) {
        var n = nails[i];
        if (x >= n.x - 4 && x <= n.x + n.w + 4 && y >= n.y - 4 && y <= n.y + n.h + 4) return n;
      }
      return null;
    }
    function markCells(x, y) {
      var n = inNail(x, y);
      if (!n) return;
      var paintedNow = 0;
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        if (n.cells[r][c]) continue;
        var cx = n.x + (c + 0.5) / COLS * n.w, cy = n.y + (r + 0.5) / ROWS * n.h;
        if (Math.hypot(cx - x, cy - y) < 20) { n.cells[r][c] = true; n.painted++; paintedNow++; }
      }
      return paintedNow;
    }
    function draw() {
      ctx.clearRect(0, 0, 360, 320);
      // hand
      ctx.fillStyle = '#f6c9a0';
      ctx.beginPath(); ctx.roundRect(8, 180, 344, 130, 40); ctx.fill();
      // nails base
      nails.forEach(function (n) {
        ctx.fillStyle = '#f9e2cc';
        ctx.beginPath(); ctx.roundRect(n.x, n.y, n.w, n.h, 22); ctx.fill();
      });
      ctx.drawImage(layer, 0, 0);
      // outlines
      nails.forEach(function (n) {
        ctx.strokeStyle = '#d99a6c'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(n.x, n.y, n.w, n.h, 22); ctx.stroke();
      });
    }
    draw();

    function pos(e) {
      var r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * 360, y: (e.clientY - r.top) / r.height * 320 };
    }
    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault(); down = true;
      try { cv.setPointerCapture(e.pointerId); } catch (err2) {}
      var p = pos(e); lastX = p.x; lastY = p.y;
      lctx.fillStyle = cust.polish.hex;
      lctx.beginPath(); lctx.arc(p.x, p.y, 16, 0, 7); lctx.fill();
      markCells(p.x, p.y); draw();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!down || finished) return;
      var p = pos(e);
      if (Math.hypot(p.x - lastX, p.y - lastY) < 4) return;
      lctx.strokeStyle = cust.polish.hex; lctx.lineWidth = 30; lctx.lineCap = 'round';
      lctx.beginPath(); lctx.moveTo(lastX, lastY); lctx.lineTo(p.x, p.y); lctx.stroke();
      markCells(p.x, p.y);
      if (!inNail(p.x, p.y) && Math.hypot(p.x - lastX, p.y - lastY) > 10) outside++;
      lastX = p.x; lastY = p.y;
      draw();
    });
    function up() { down = false; }
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    function finish() {
      if (finished) return; finished = true;
      doneBtn.classList.add('hidden');
      var painted = 0;
      nails.forEach(function (n) { painted += n.painted; });
      var coverage = painted / totalCells * 100;
      done(clamp(coverage - outside * 1.2, 0, 100));
    }
    doneBtn.onclick = function () { try { AudioSys.pop(); } catch (e) {} finish(); };
    mgTimer(35 * dryerMult(), finish);
  }

  /* ---------- DECORATE: drag the requested stickers onto the nails ---------- */
  function buildDecorate(cust, done) {
    var body = $('mg-body');
    var needIds = cust.decos.slice();
    var needNames = needIds.map(function (id) { return decoById(id).emoji + ' ' + decoById(id).name; }).join(', ');
    $('mg-hint').textContent = 'Drag these onto the nails: ' + needNames;
    var area = document.createElement('div'); area.className = 'deco-area';
    var nailsBox = document.createElement('div'); nailsBox.className = 'deco-nails';
    nailsBox.innerHTML = '<div style="text-align:center;font-size:44px;margin-top:30px">💅</div>' +
      '<div style="text-align:center;font-size:13px;color:#a06a86">pretty ' + cust.polish.name + ' nails!</div>';
    var tray = document.createElement('div'); tray.className = 'deco-tray';
    area.appendChild(nailsBox); area.appendChild(tray); body.appendChild(area);

    // slots
    var slots = [];
    var nSlots = needIds.length;
    needIds.forEach(function (id, i) {
      var s = document.createElement('div');
      s.className = 'deco-slot';
      s.style.left = (18 + i * 76) + 'px'; s.style.top = '120px';
      s.dataset.want = id;
      nailsBox.appendChild(s);
      slots.push(s);
    });

    // tray: required + fillers up to 5
    var fillers = shuffle(SALON.DECORATIONS.filter(function (d) { return needIds.indexOf(d.id) < 0; })).slice(0, Math.max(0, 5 - needIds.length));
    var items = shuffle(needIds.map(function (id) { return decoById(id); }).concat(fillers));
    var wrong = 0, placed = 0, finished = false;
    items.forEach(function (d) {
      var it = document.createElement('div');
      it.className = 'deco-item'; it.textContent = d.emoji; it.dataset.id = d.id;
      it.title = d.name;
      tray.appendChild(it);
      it.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        var drag = document.createElement('div');
        drag.className = 'deco-drag'; drag.textContent = d.emoji;
        document.body.appendChild(drag);
        function move(ev) { drag.style.left = ev.clientX + 'px'; drag.style.top = ev.clientY + 'px'; }
        move(e);
        document.onpointermove = move;
        document.onpointerup = function (ev) {
          document.onpointermove = null; document.onpointerup = null;
          drag.remove();
          if (finished) return;
          var hit = null;
          slots.forEach(function (s) {
            var r = s.getBoundingClientRect();
            if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) hit = s;
          });
          if (hit && !hit.classList.contains('filled')) {
            var remaining = needIds.filter(function (id) {
              return !slots.some(function (s) { return s.classList.contains('filled') && s.dataset.placed === id; });
            });
            if (remaining.indexOf(d.id) >= 0) {
              hit.classList.add('filled'); hit.textContent = d.emoji; hit.dataset.placed = d.id;
              it.style.visibility = 'hidden';
              placed++;
              try { AudioSys.sparkle(); } catch (err) {}
              if (placed >= needIds.length) {
                finished = true;
                setTimeout(function () { done(Math.max(40, 100 - 15 * wrong)); }, 400);
              }
            } else {
              wrong++;
              try { AudioSys.error(); } catch (err) {}
              toast('Oops — not the right sticker! (' + d.name + ')');
            }
          }
        };
      });
    });
  }

  /* ================= SHARED PAYMENT ================= */
  /** Shared payment math (manual + staff). Returns {pay, patFrac}. */
  function computePay(cust, acc) {
    var patFrac = clamp(cust.patience / cust.maxPatience, 0, 1);
    var ti = tierIdxNow();
    var tipMult = (G && G.boostLeft > 0) ? 2 : 1; // BOOST: double tips!
    var pay = SALON.payForService({
      serviceBase: cust.service.base,
      day: G ? G.day : save.day,
      acc: acc, patFrac: patFrac,
      isVip: cust.isVip, isCotd: cust.isCotd, hasDeco: cust.service.decoCount > 0,
      tierTip: ti >= 0 ? SALON.tierAt(ti).tipBonus : 0,
      traitTipMult: SALON.TUNING.traitTip[cust.def.trait] ? 1 + SALON.TUNING.traitTip[cust.def.trait] : 1,
      roomTipBonus: SALON.roomTipBonus(save.rooms),
      tipMult: tipMult,
      polishTier: save.upgrades.polish || 0, polishEndless: endlessLv('polish'),
      luckyTier: save.upgrades.lucky || 0, luckyEndless: endlessLv('lucky'),
      decorTier: save.upgrades.decor || 0, decorEndless: endlessLv('decor'),
      celebTier: save.upgrades.celeb || 0, celebEndless: endlessLv('celeb')
    });
    if (G && G.boostLeft > 0) { G.boostLeft--; save.boost = Math.max(0, (save.boost || 0) - 1); persist(); }
    return { pay: pay, patFrac: patFrac };
  }

  /** VIPs always tip a diamond — the premium currency is earned, never bought. */
  function vipDiamondBonus(cust) {
    if (!cust.isVip) return;
    save.diamonds = (save.diamonds || 0) + 1;
    persist();
    coinsFly('+1 💎');
    toast('💎 VIP bonus: +1 diamond!');
  }

  /** Quest events shared by manual and staff service completions. Returns perfect. */
  function serviceQuestEvents(cust, acc) {
    var perfect = acc >= 95;
    questEvent('serve');
    if (cust.isVip) questEvent('vips');
    if (perfect) questEvent('perfect');
    if (cust.isCotd) questEvent('cotd');
    return perfect;
  }

  function cheerCheck(cust, patFrac, who) {
    if (patFrac < 0.25) {
      questEvent('cheer');
      toast('💖 ' + who + ' cheered up ' + cust.def.name + ' just in time!');
    }
  }

  /* ================= CUSTOMER WALK ANIMATIONS =================
   * Everyone enters through the visible entrance door and walks: door -> waiting
   * row -> station, then out the door happy (sparkles) or storming out angry.
   * Ghost clones + CSS transitions; game-logic arrays stay the source of truth. */
  var REDUCED_MOTION = false;
  try { REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function doorRect() {
    var d = $('entrance');
    if (d) return d.getBoundingClientRect();
    return { left: window.innerWidth - 90, top: 70, width: 60, height: 60 };
  }

  /**
   * Fly a ghost copy of a customer from one rect to another.
   * opts: {sparkles, angry, duration(ms), fadeEnd}
   */
  function flyCustomer(cust, fromRect, toRect, opts, onDone) {
    opts = opts || {};
    if (REDUCED_MOTION) { if (onDone) onDone(); return; }
    try {
      var ghost = document.createElement('div');
      ghost.className = 'cust-ghost' + (opts.angry ? ' angry' : '');
      ghost.appendChild(customerFace(cust.def));
      var nm = document.createElement('div');
      nm.className = 'cust-ghost-name';
      nm.textContent = cust.def.name;
      ghost.appendChild(nm);
      if (opts.angry) {
        var mad = document.createElement('div');
        mad.className = 'cust-ghost-mood';
        mad.textContent = '😡';
        ghost.appendChild(mad);
      }
      var w = Math.max(40, fromRect.width || 64), h = Math.max(40, fromRect.height || 76);
      ghost.style.width = w + 'px';
      ghost.style.height = h + 'px';
      ghost.style.left = (fromRect.left + (fromRect.width - w) / 2) + 'px';
      ghost.style.top = (fromRect.top + (fromRect.height - h) / 2) + 'px';
      document.body.appendChild(ghost);
      var dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
      var dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);
      var dur = opts.duration || 900;
      void ghost.offsetWidth; // force reflow so the transition runs
      ghost.style.transition = 'transform ' + dur + 'ms ease-in-out' + (opts.fadeEnd ? ', opacity 300ms ease-in' : '');
      ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      if (opts.sparkles) {
        for (var s = 0; s < 5; s++) {
          (function (k) {
            setTimeout(function () {
              if (!ghost.parentNode) return;
              var sp = document.createElement('div');
              sp.className = 'ghost-sparkle';
              sp.textContent = '✨';
              sp.style.left = (15 + Math.random() * 40) + 'px';
              sp.style.top = (Math.random() * 30) + 'px';
              ghost.appendChild(sp);
              setTimeout(function () { sp.remove(); }, 800);
            }, k * 140);
          })(s);
        }
      }
      setTimeout(function () {
        if (opts.fadeEnd) {
          ghost.style.opacity = '0';
          setTimeout(function () { ghost.remove(); if (onDone) onDone(); }, 320);
        } else {
          ghost.remove();
          if (onDone) onDone();
        }
      }, dur + 30);
    } catch (e) { if (onDone) onDone(); }
  }

  /** Walk-in: door -> waiting card. Card stays hidden until the ghost arrives. */
  function animateWalkIn(cust) {
    function arrive() {
      cust._walkingIn = false;
      if (cust._card) cust._card.classList.remove('walking-in');
    }
    if (!cust._card || !cust._card.parentNode || REDUCED_MOTION) { arrive(); return; }
    cust._walkingIn = true;
    try { if (cust._card.scrollIntoView) cust._card.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
    try {
      var r = cust._card.getBoundingClientRect();
      var target = {
        left: clamp(r.left, 8, window.innerWidth - 80),
        top: clamp(r.top, 8, window.innerHeight - 90),
        width: r.width, height: r.height
      };
      cust._card.classList.add('walking-in');
      flyCustomer(cust, doorRect(), target, { duration: 850 }, arrive);
    } catch (e) { arrive(); }
  }

  /** Walk to station: waiting card -> station slot. Commits seating on arrival. */
  function animateSeatWalk(cust, si, fromCard, onSettled) {
    var stEl = $('stations') ? $('stations').children[si] : null;
    function settled() { if (onSettled) onSettled(); }
    function commit() {
      var stillWaiting = G && G.waiting.indexOf(cust) >= 0;
      var ok = G && G.active && G.tickTimer && !cust._walked && stillWaiting && !G.stations[si];
      if (!ok) {
        // walk aborted (paused, walked out, station filled): restore the waiting card
        if (stillWaiting && cust._card) cust._card.classList.remove('walking-out');
        settled();
        return;
      }
      var wi = G.waiting.indexOf(cust);
      G.waiting.splice(wi, 1);
      cust.patience = cust.seatedPatience; cust.maxPatience = cust.seatedPatience;
      G.stations[si] = { cust: cust, stepIdx: 0, acc: [], stepLabel: cust.service.name };
      try { AudioSys.seat(); } catch (e) {}
      sophieSay(choice(['Let\'s get started, ' + cust.def.name + '! 💅', 'Ooh, ' + cust.polish.name + ' — great choice!', 'Time to pamper those nails! ✨']));
      renderWaiting(); renderStations(); updateHud();
      spawnNext();
      setTimeout(function () { if (G && G.active) startService(si); }, 450);
      settled();
    }
    if (!stEl || !fromCard || !fromCard.parentNode || REDUCED_MOTION) { commit(); return; }
    try {
      var from = fromCard.getBoundingClientRect();
      var to = stEl.getBoundingClientRect();
      fromCard.classList.add('walking-out');
      flyCustomer(cust, from, to, { duration: 650 }, commit);
    } catch (e) { commit(); }
  }

  /** Happy exit: card -> door with sparkles, then removeCustomer. */
  function happyExitFrom(cust, fromRect) {
    function done() { removeCustomer(cust); updateHud(); }
    if (!fromRect || REDUCED_MOTION) { done(); return; }
    try {
      flyCustomer(cust, fromRect, doorRect(), { duration: 950, sparkles: true, fadeEnd: true }, done);
    } catch (e) { done(); }
  }

  /** Angry storm-out: card -> door fast with shake. Removal already done. */
  function angryExitFrom(cust, fromRect) {
    if (!fromRect || REDUCED_MOTION) return;
    try {
      flyCustomer(cust, fromRect, doorRect(), { duration: 600, angry: true, fadeEnd: true }, null);
    } catch (e) {}
  }

  /* ================= SERVICE COMPLETION & PAYMENT ================= */
  function finishService(si) {
    var occ = G.stations[si];
    if (!occ || !G.active) return;
    var cust = occ.cust;
    var acc = occ.acc.reduce(function (a, b) { return a + b; }, 0) / occ.acc.length;
    var pr = computePay(cust, acc);
    var pay = pr.pay;
    var perfect = serviceQuestEvents(cust, acc);

    G.sats.push(acc / 100);
    G.served++;
    save.customersServed++;
    if (perfect) { save.perfectCount++; G.perfectToday++; }
    save.coins += pay;
    G.coinsEarned += pay;
    if (cust.isCotd) G.cotdServed = true;

    try { AudioSys.cash(); AudioSys.sparkle(); } catch (e) {}
    coinsFly('+' + pay + ' 🪙');
    vipDiamondBonus(cust);
    if (cust._card) cust._card.classList.add('cust-happy');
    sophieSay(choice(['Beautiful work! 💖', 'They look amazing!', 'You\'re a nail superstar! ⭐', 'The customer is thrilled! 🥰']));
    cheerCheck(cust, pr.patFrac, 'You');
    // capture the card position BEFORE freeing the station, then stroll out
    var exitRect = (cust._card && cust._card.parentNode) ? cust._card.getBoundingClientRect() : null;
    G.stations[si] = null;
    if (MG.open && MG.stationCust === cust) abortMinigame();
    persist();
    renderStations(); updateHud();
    spawnNext();
    happyExitFrom(cust, exitRect);
  }

  /** An employee finishes serving a customer automatically. */
  function finishStaffService(idx) {
    var sj = G.staffJobs[idx];
    if (!sj || !sj.job || !G.active) return;
    var emp = sj.emp, cust = sj.job.cust;
    var acc = clamp(SALON.empAccuracy(emp.skill) + rand(-3, 3), 0, 100);
    var pr = computePay(cust, acc);
    // capture the staff-station position for the walk-out before re-rendering
    var row = $('staff-row');
    var exitRect = (row && row.children[idx]) ? row.children[idx].getBoundingClientRect() : null;
    sj.job = null;
    sj.cool = 2.5;
    sj._fill = null;

    G.sats.push(acc / 100);
    G.served++;
    save.customersServed++;
    emp.served = (emp.served || 0) + 1;
    var perfect = serviceQuestEvents(cust, acc);
    if (perfect) { save.perfectCount++; G.perfectToday++; }
    save.coins += pr.pay;
    G.coinsEarned += pr.pay;
    G.staffEarned += pr.pay;
    if (cust.isCotd) G.cotdServed = true;

    try { AudioSys.cash(); } catch (e) {}
    coinsFly('+' + pr.pay + ' 🪙');
    vipDiamondBonus(cust);
    cheerCheck(cust, pr.patFrac, emp.name);
    persist();
    renderStaffWing();
    updateHud();
    spawnNext();
    // the customer strolls out of the staff room through the entrance
    happyExitFrom(cust, exitRect);
  }

  function checkDayEnd() {
    if (!G || !G.active) return;
    var stationsEmpty = G.stations.every(function (s) { return !s; });
    var staffEmpty = G.staffJobs.every(function (sj) { return !sj.job; });
    var walksEmpty = !G.seatWalks || Object.keys(G.seatWalks).length === 0;
    if (!G.queue.length && !G.waiting.length && stationsEmpty && staffEmpty && walksEmpty) endDay();
  }

  /* ================= DAY SUMMARY ================= */
  function calcStars() {
    var stars = 1;
    if (G.served > 0) {
      var avg = G.sats.reduce(function (a, b) { return a + b; }, 0) / G.sats.length;
      if (avg >= 0.7) stars = 2;
      if (avg >= 0.9 && G.walkouts === 0) stars = 3;
    }
    return stars;
  }

  function endDay() {
    G.active = false;
    if (G.tickTimer) clearInterval(G.tickTimer);
    abortMinigame();
    Platform.gameplayStop();
    try { AudioSys.stopMusic(); } catch (e) {}

    var stars = calcStars();
    var day = G.day;
    var prevBest = save.bestStars[day] || 0;
    if (stars > prevBest) save.bestStars[day] = stars;
    save.starsTotal = Object.keys(save.bestStars).reduce(function (a, k) { return a + save.bestStars[k]; }, 0);
    var newBestDay = G.coinsEarned > save.bestDayCoins;
    if (newBestDay) save.bestDayCoins = G.coinsEarned;

    // salon tier-up?
    var tierIdx = SALON.tierForStars(save.starsTotal);
    var tierUp = tierIdx > save.lastTierAnnounced && tierIdx >= 0;
    if (tierUp) {
      save.lastTierAnnounced = tierIdx;
      var t = SALON.SALON_TIERS[tierIdx];
      save.theme = t.theme; // auto-switch to the new theme
      document.body.setAttribute('data-theme', t.theme);
    }
    persist();
    G.stars = stars; G.tierUp = tierUp; G.tierIdx = tierIdx; G.newBestDay = newBestDay;
    renderSummary();
    showScreen('screen-summary');
    if (stars === 3) { confetti(90); try { Platform.happyTime(); AudioSys.star(); } catch (e) {} }
    if (tierUp) { setTimeout(function () { confetti(120); }, 600); }
    // natural-break ad, only at day summary
    try { Platform.midgameAd(function () {}); } catch (e) {}
  }

  function renderSummary() {
    $('summary-title').textContent = 'Day ' + G.day + ' Complete!';
    var sh = $('summary-stars');
    sh.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var sp = document.createElement('span');
      sp.textContent = '⭐';
      if (i >= G.stars) sp.className = 'dim';
      sh.appendChild(sp);
    }
    var avg = G.sats.length ? Math.round(G.sats.reduce(function (a, b) { return a + b; }, 0) / G.sats.length * 100) : 0;
    $('summary-stats').innerHTML =
      '<p>😊 Served: <b>' + G.served + '</b> • 😡 Walkouts: <b>' + G.walkouts + '</b></p>' +
      '<p>💯 Avg satisfaction: <b>' + avg + '%</b> • ✨ Perfect: <b>' + G.perfectToday + '</b></p>' +
      '<p>🪙 Earned today: <b>' + G.coinsEarned + '</b> coins</p>';
    var rec = '';
    if (G.newBestDay && G.coinsEarned > 0) rec += '<p>🏆 <b>New best day: ' + G.coinsEarned + ' coins!</b></p>';
    if (G.tierUp) {
      var t = SALON.SALON_TIERS[G.tierIdx];
      rec += '<p>🏵 <b>' + t.name + ' Salon Tier unlocked!</b> New ' + t.name + ' theme + ' + Math.round(t.tipBonus * 100) + '% tip bonus!</p>';
    }
    $('summary-records').innerHTML = rec;
    var next = SALON.SALON_TIERS[G.tierIdx + 1];
    var tierLine = next ? ('<div>' + save.starsTotal + ' / ' + next.stars + ' ⭐ toward <b>' + next.name + '</b> tier</div>') : '<div>👑 Diamond tier — legendary salon!</div>';
    $('summary-teaser').innerHTML = '🌟 <b>Come back tomorrow for a new Customer of the Day!</b><br>' + tierLine;
    var dbl = $('btn-double');
    dbl.disabled = false;
    dbl.textContent = Platform.available() ? '🎬 Double earnings! (ad)' : '🎁 Bonus coins! (+50% free)';
  }

  function doubleEarnings() {
    var btn = $('btn-double');
    if (G.doubled) return;
    btn.disabled = true;
    try {
      Platform.rewardedAd(function (ok) {
        var bonus;
        if (ok) bonus = G.coinsEarned;                       // full double on success
        else if (!Platform.available()) bonus = Math.round(G.coinsEarned * 0.5); // half free when no SDK
        else { toast('Ad wasn\'t available — no bonus this time.'); btn.disabled = false; return; }
        G.doubled = true;
        G.coinsEarned += bonus;
        save.coins += bonus;
        if (bonus > save.bestDayCoins - (G.coinsEarned - bonus)) { /* best-day already recorded pre-bonus; keep simple */ }
        persist();
        try { AudioSys.cash(); } catch (e) {}
        coinsFly('+' + bonus + ' 🪙');
        renderSummary();
        $('btn-double').disabled = true;
        $('btn-double').textContent = '✅ Bonus claimed!';
        toast('Bonus claimed: +' + bonus + ' coins!');
      });
    } catch (e) { btn.disabled = false; }
  }

  /* ================= SHOP ================= */
  var shopReturn = 'dayintro';
  function openShop(returnTo) {
    if (returnTo === 'salon' && (!G || !G.active || MG.open)) returnTo = 'dayintro';
    shopReturn = returnTo || 'dayintro';
    if (shopReturn === 'salon' && G.tickTimer) {
      clearInterval(G.tickTimer); G.tickTimer = null; G.shopPaused = true;
    }
    Platform.gameplayStop();
    renderShop();
    showScreen('screen-shop');
  }

  function overallProgress() {
    var spent = 0;
    for (var b in SALON.UPGRADES) {
      var tiers = SALON.UPGRADES[b].tiers, owned = save.upgrades[b] || 0;
      for (var i = 0; i < owned && i < tiers.length; i++) spent += tiers[i].cost;
    }
    return spent / SALON.totalUpgradeCost();
  }

  function renderShop() {
    $('shop-coins').textContent = save.coins;
    var pct = Math.min(100, Math.round(overallProgress() * 100));
    $('shop-progress').innerHTML = '<h3>🌟 Salon progress: ' + pct + '%</h3>' +
      '<div class="tier-bar"><div style="width:' + pct + '%"></div></div>' +
      '<div style="font-size:12px;color:#a06a86">Upgrades continue forever — keep growing your empire!</div>';
    // themes
    var th = '<h3>🎨 Salon theme</h3><div class="theme-row">';
    availableThemes().forEach(function (t) {
      th += '<button class="theme-chip' + (save.theme === t.id ? ' selected' : '') + (t.unlocked ? '' : ' locked') + '"' +
        ' data-theme-id="' + t.id + '" data-unlocked="' + (t.unlocked ? 1 : 0) + '"' +
        (t.unlocked ? '' : ' title="' + t.lockLabel + '"') + '>' + themeDisplayName(t.id) +
        (t.unlocked ? '' : ' 🔒') + '</button>';
    });
    $('shop-themes').innerHTML = th + '</div>';
    Array.prototype.forEach.call($('shop-themes').querySelectorAll('.theme-chip'), function (chip) {
      chip.addEventListener('click', function () {
        if (chip.dataset.unlocked !== '1') { toast('🔒 ' + chip.title); return; }
        save.theme = chip.dataset.themeId;
        document.body.setAttribute('data-theme', save.theme);
        persist();
        renderShop();
        try { AudioSys.pop(); } catch (e) {}
      });
    });
    // collection: locked items shown greyed-out with unlock conditions (the chase!)
    var coll = '<h3>💅 Polish collection</h3><div class="paint-swatches" style="justify-content:flex-start">';
    SALON.POLISHES.forEach(function (p) {
      var plock = SALON.polishLock(p, save.day, save.upgrades);
      coll += '<div style="text-align:center;min-width:56px;opacity:' + (plock ? '0.35' : '1') + ';filter:' + (plock ? 'grayscale(1)' : 'none') + '"' +
        ' title="' + (plock ? '🔒 ' + plock.label : p.name) + '">' +
        '<span class="polish-dot" style="background:' + p.hex + ';width:34px;height:34px"></span>' +
        '<div style="font-size:10px">' + p.name + (plock ? '<br>🔒' : '') + '</div></div>';
    });
    coll += '</div><h3 style="margin-top:8px">💎 Decorations</h3><div class="paint-swatches" style="justify-content:flex-start">';
    SALON.DECORATIONS.forEach(function (d) {
      var dlock = SALON.decoLock(d, save.upgrades);
      coll += '<div style="text-align:center;min-width:56px;font-size:28px;opacity:' + (dlock ? '0.35' : '1') + ';filter:' + (dlock ? 'grayscale(1)' : 'none') + '"' +
        ' title="' + (dlock ? '🔒 ' + dlock.label : d.name) + '">' + d.emoji +
        '<div style="font-size:10px">' + d.name + (dlock ? '<br>🔒' : '') + '</div></div>';
    });
    $('shop-collection').innerHTML = coll + '</div>';
    renderUpgradesTab();
    renderStaffTab();
    renderExpandTab();
    switchShopTab(shopTab, true);
  }

  var shopTab = 'upgrades';
  function switchShopTab(tab, skipRender) {
    shopTab = tab;
    var btns = document.querySelectorAll('#shop-tabs .tab-btn');
    Array.prototype.forEach.call(btns, function (b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    ['upgrades', 'staff', 'expand', 'style'].forEach(function (t) {
      var el = $('tab-' + t);
      if (el) el.classList.toggle('hidden', t !== tab);
    });
    if (!skipRender) renderShop();
  }

  /** Next-level info for a branch: fixed tier or endless level. */
  function branchNextInfo(branch) {
    var u = SALON.UPGRADES[branch], owned = save.upgrades[branch] || 0;
    var nTiers = u.tiers.length;
    if (owned < nTiers) {
      var t = u.tiers[owned];
      return { cost: t.cost, fx: t.fx, levelLabel: 'Lv ' + (owned + 1) + ' / ' + nTiers + ' + ∞', endless: false };
    }
    var eLv = owned - nTiers;
    var extra = branch === 'station2' ? ' — +1 service station!' : '';
    return {
      cost: SALON.endlessLevelCost(branch, eLv),
      fx: SALON.ENDLESS[branch].blurb + extra + ' (endless)',
      levelLabel: 'Endless Lv ' + (eLv + 1),
      endless: true
    };
  }

  function renderUpgradesTab() {
    var list = $('shop-list');
    list.innerHTML = '';
    Object.keys(SALON.UPGRADES).forEach(function (key) {
      var u = SALON.UPGRADES[key], owned = save.upgrades[key] || 0;
      var nTiers = u.tiers.length;
      var pips = '';
      for (var i = 0; i < nTiers; i++) pips += i < owned ? '●' : '○';
      if (owned >= nTiers) pips += ' <span class="endless-pips">∞+' + (owned - nTiers) + '</span>';
      var bp = Math.min(100, Math.round(owned / nTiers * 100));
      var nx = branchNextInfo(key);
      var foot = '<div class="branch-foot"><div class="branch-progress"><div style="width:' + bp + '%"></div></div>' +
        '<button class="btn btn-pink buy-btn" data-branch="' + key + '">' + nx.levelLabel + ': 🪙' + nx.cost.toLocaleString() +
        '<br><small>' + nx.fx + '</small></button></div>';
      var card = document.createElement('div');
      card.className = 'card shop-branch' + (nx.endless ? ' endless' : '');
      card.innerHTML = '<div class="branch-head"><span class="branch-icon">' + u.icon + '</span>' +
        '<span class="branch-name">' + u.name + '</span><span class="branch-tiers">' + pips + '</span></div>' +
        '<div class="branch-desc">' + u.desc + '</div>' + foot;
      list.appendChild(card);
    });
    Array.prototype.forEach.call(list.querySelectorAll('.buy-btn'), function (btn) {
      btn.addEventListener('click', function () { buyUpgrade(btn.dataset.branch); });
    });
  }

  function specialtyById(id) {
    for (var i = 0; i < SALON.SPECIALTIES.length; i++) if (SALON.SPECIALTIES[i].id === id) return SALON.SPECIALTIES[i];
    return SALON.SPECIALTIES[0];
  }

  function renderStaffTab() {
    var team = $('staff-team'), hire = $('staff-hire');
    var slots = staffStationCount(), free = freeStaffSlots();
    var h = '<h3>👥 Your Team (' + save.staff.length + ' / ' + slots + ' stations)</h3>';
    if (!save.staff.length) {
      h += '<div class="empty-note">No employees yet. ' +
        (slots > 0 ? 'Hire your first helper below!' : 'Expand to the <b>Spa Wing</b> to unlock staff stations, then hire!') + '</div>';
    }
    save.staff.forEach(function (emp, i) {
      var spec = specialtyById(emp.specialty);
      var tc = SALON.trainCost(emp.skill);
      var acc = SALON.empAccuracy(emp.skill).toFixed(1);
      var secs = SALON.empServiceSeconds(emp.specialty, emp.skill, emp.specialty).toFixed(0);
      h += '<div class="emp-card" style="border-color:' + (emp.color || '#f8bbd0') + '">' +
        '<div class="emp-face">' + (emp.emoji || '🧑‍💼') + '</div>' +
        '<div class="emp-info"><b>' + emp.name + '</b> <span class="emp-spec">' + spec.icon + ' ' + spec.name + '</span>' +
        '<div class="emp-stats">🎓 Skill Lv ' + emp.skill + ' · 🎯 ' + acc + '% accuracy · ⏱ ~' + secs + 's/service · 😊 ' + (emp.served || 0) + ' served</div></div>' +
        '<button class="btn btn-pink btn-small train-btn" data-emp="' + i + '">Train 🪙' + tc.toLocaleString() + '</button></div>';
    });
    team.innerHTML = h;
    Array.prototype.forEach.call(team.querySelectorAll('.train-btn'), function (btn) {
      btn.addEventListener('click', function () { trainEmployee(parseInt(btn.dataset.emp, 10)); });
    });

    var hh = '<h3>🤝 Hire</h3>';
    if (free <= 0) {
      hh += '<div class="empty-note">No free staff stations. <b>Expand</b> the salon to hire more!</div>';
    } else {
      // next candidate: first pool member not already hired (pool cycles forever)
      var hiredNames = {};
      save.staff.forEach(function (e) { hiredNames[e.name] = true; });
      var cand = null;
      for (var c = 0; c < SALON.CANDIDATE_POOL.length; c++) {
        if (!hiredNames[SALON.CANDIDATE_POOL[c].name]) { cand = SALON.CANDIDATE_POOL[c]; break; }
      }
      if (!cand) cand = SALON.CANDIDATE_POOL[save.staff.length % SALON.CANDIDATE_POOL.length];
      var spec = SALON.SPECIALTIES[save.staff.length % SALON.SPECIALTIES.length];
      var cost = SALON.hireCost(save.staff.length);
      hh += '<div class="emp-card hire-card"><div class="emp-face">' + cand.emoji + '</div>' +
        '<div class="emp-info"><b>' + cand.name + '</b> <span class="emp-spec">' + spec.icon + ' ' + spec.name + ' specialist</span>' +
        '<div class="emp-stats">Starts at Skill Lv 1 — train them up forever!</div></div>' +
        '<button class="btn btn-green btn-small" id="btn-hire">Hire 🪙' + cost.toLocaleString() + '</button></div>' +
        '<div style="font-size:12px;color:#a06a86;margin-top:6px">' + free + ' free staff station' + (free > 1 ? 's' : '') + ' available.</div>';
      hire.innerHTML = hh;
      $('btn-hire').addEventListener('click', function () { hireEmployee(cand, spec); });
      return;
    }
    hire.innerHTML = hh;
  }

  function renderExpandTab() {
    var list = $('expand-list');
    var h = '<div class="card"><h3>🏢 Your Salon (' + save.rooms + ' room' + (save.rooms > 1 ? 's' : '') + ')</h3>';
    for (var i = 0; i < save.rooms; i++) {
      var r = SALON.roomInfo(i);
      h += '<div class="room-card owned"><b>' + r.name + '</b><div class="room-desc">' + r.desc + '</div></div>';
    }
    h += '</div>';
    var nx = SALON.roomInfo(save.rooms);
    var ss = SALON.staffStationsForRooms(save.rooms + 1) - SALON.staffStationsForRooms(save.rooms);
    h += '<div class="card"><h3>✨ Next: ' + nx.name + '</h3>' +
      '<div class="room-desc">' + nx.desc + '</div>' +
      (ss > 0 ? '<div class="room-desc">➕ +' + ss + ' staff station</div>' : '') +
      '<button class="btn btn-pink buy-btn" id="btn-expand">Expand 🪙' + nx.cost.toLocaleString() + '</button></div>';
    list.innerHTML = h;
    $('btn-expand').addEventListener('click', buyRoom);
  }

  function hireEmployee(cand, spec) {
    if (freeStaffSlots() <= 0) { toast('No free staff stations — expand first!'); return; }
    var cost = SALON.hireCost(save.staff.length);
    if (save.coins < cost) { toast('Not enough coins! You need 🪙' + cost.toLocaleString() + '.'); try { AudioSys.error(); } catch (e) {} return; }
    save.coins -= cost;
    save.staff.push({ name: cand.name, emoji: cand.emoji, color: cand.color, specialty: spec.id, skill: 1, served: 0 });
    questEvent('hire');
    persist();
    try { AudioSys.cash(); } catch (e) {}
    toast('🎉 ' + cand.name + ' joined the team as a ' + spec.name + ' specialist!');
    renderShop();
  }

  function trainEmployee(i) {
    var emp = save.staff[i];
    if (!emp) return;
    var cost = SALON.trainCost(emp.skill);
    if (save.coins < cost) { toast('Not enough coins! You need 🪙' + cost.toLocaleString() + '.'); try { AudioSys.error(); } catch (e) {} return; }
    save.coins -= cost;
    emp.skill++;
    questEvent('train');
    persist();
    try { AudioSys.cash(); } catch (e) {}
    toast('🎓 ' + emp.name + ' trained to Skill Lv ' + emp.skill + '!');
    renderShop();
  }

  function buyRoom() {
    var cost = SALON.roomCost(save.rooms);
    if (save.coins < cost) { toast('Not enough coins! You need 🪙' + cost.toLocaleString() + '.'); try { AudioSys.error(); } catch (e) {} return; }
    save.coins -= cost;
    save.rooms++;
    questEvent('expand');
    persist();
    try { AudioSys.cash(); } catch (e) {}
    var r = SALON.roomInfo(save.rooms - 1);
    toast('🏢 New room unlocked: ' + r.name + '!');
    renderShop();
  }

  function buyUpgrade(branch) {
    var u = SALON.UPGRADES[branch], owned = save.upgrades[branch] || 0;
    var nx = branchNextInfo(branch);
    var cost = nx.cost;
    if (save.coins < cost) {
      toast('Not enough coins! You need 🪙' + cost.toLocaleString() + '.');
      try { AudioSys.error(); } catch (e) {}
      return;
    }
    save.coins -= cost;
    save.upgrades[branch] = owned + 1;
    questEvent('upgrade');
    persist();
    try { AudioSys.cash(); } catch (e) {}
    toast(u.icon + ' ' + u.name + ' ' + nx.levelLabel + ' purchased!');
    // unlock notices for lucky-branch rewards
    if (branch === 'lucky') {
      if (owned + 1 === 1) toast('💠 Rare Diamond decoration unlocked!');
      if (owned + 1 === 2) toast('🌙 Midnight polish unlocked!');
      if (owned + 1 === 3) toast('✨ Opal decoration unlocked!');
    }
    if (branch === 'polish' && owned + 1 === 2) toast('🌹 Rose Gold polish unlocked!');
    if (branch === 'station2') {
      if (owned + 1 === 1) toast('💺 Second station open for business!');
      else toast('💺 Another service station opened!');
    }
    renderShop();
  }

  /* ================= PAUSE & HOW TO ================= */
  function howToHtml() {
    return '<h2>❓ How to Play</h2><ol>' +
      '<li>👥 Customers walk in with an <b>order bubble</b>: service icon, polish color, and decorations.</li>' +
      '<li>👆 <b>Tap a waiting customer</b> to seat them at a free station.</li>' +
      '<li>🛁 <b>Soak:</b> tap 8 bubbles before the timer runs out.</li>' +
      '<li>💅 <b>File:</b> drag left-right across the nail 6 times.</li>' +
      '<li>🖌️ <b>Paint:</b> drag to paint the nails — stay inside the lines!</li>' +
      '<li>💎 <b>Decorate:</b> drag the requested stickers onto the nails.</li>' +
      '<li>🪙 Finish all steps to get paid + tips. Better accuracy and faster service = bigger tips!</li>' +
      '<li>⏳ Watch the <b>patience bar</b> — if it empties, the customer storms out with no pay!</li>' +
      '<li>🛍 Spend coins in the Shop on upgrades. 🌟 Finish days for stars and climb Salon Tiers!</li>' +
      '</ol>';
  }

  function pauseGame() {
    if (!G || !G.active || MG.open) return;
    if (G.tickTimer) clearInterval(G.tickTimer);
    G.tickTimer = null;
    Platform.gameplayStop();
    openModal('<h2>⏸ Paused</h2>' +
      '<p>Day ' + G.day + ' • 🪙 ' + save.coins + '</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
      '<button id="p-resume" class="btn btn-pink">▶ Resume</button>' +
      '<button id="p-howto" class="btn btn-white">❓ How to Play</button>' +
      '<button id="p-mute" class="btn btn-white">' + (save.mute ? '🔇 Unmute' : '🔊 Mute') + '</button>' +
      '<button id="p-quit" class="btn btn-white">🏠 Quit to Title</button>' +
      '</div>');
    $('p-resume').addEventListener('click', function () {
      closeModal();
      G.tickTimer = setInterval(tick, 200);
      Platform.gameplayStart();
    });
    $('p-howto').addEventListener('click', function () { openModal(howToHtml()); });
    $('p-mute').addEventListener('click', function () { toggleMute(); pauseGameReopen(); });
    $('p-quit').addEventListener('click', function () {
      closeModal();
      abortMinigame();
      G.active = false;
      if (G.tickTimer) clearInterval(G.tickTimer);
      renderTitle();
      showScreen('screen-title');
    });
  }
  function pauseGameReopen() { /* re-open pause menu after mute toggle */ pauseGame(); }

  /** Safety net: closing a modal while the day is paused must restore the pause menu. */
  function afterModalClose() {
    closeModal();
    if (G && G.active && !G.tickTimer && !MG.open && !$('screen-salon').classList.contains('hidden')) pauseGame();
  }

  function toggleMute() {
    save.mute = !save.mute;
    persist();
    try { AudioSys.setMuted(save.mute); } catch (e) {}
    var b = $('btn-mute');
    if (b) b.textContent = save.mute ? '🔇' : '🔊';
  }

  /* ================= BOOT ================= */
  function boot() {
    try { Platform.loadingStart(); } catch (e) {}
    // roundRect fallback for older canvas implementations
    try {
      if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
          r = Math.min(r, w / 2, h / 2);
          this.moveTo(x + r, y);
          this.arcTo(x + w, y, x + w, y + h, r);
          this.arcTo(x + w, y + h, x, y + h, r);
          this.arcTo(x, y + h, x, y, r);
          this.arcTo(x, y, x + w, y, r);
          this.closePath();
          return this;
        };
      }
    } catch (e) {}

    try { AudioSys.muted = !!save.mute; } catch (e) {}
    // audio unlock on first gesture
    var unlocked = false;
    document.addEventListener('pointerdown', function () {
      if (!unlocked) { unlocked = true; try { AudioSys.init(); AudioSys.setMuted(save.mute); } catch (e) {} }
    }, { passive: true });

    // warm the art cache (guarded — missing files are fine, fallbacks cover them)
    ['salon-bg.png', 'title-keyart.png', 'sophie.png'].concat(
      SALON.CUSTOMERS.map(function (c) { return c.art; }).concat(SALON.VIPS.map(function (v) { return v.art; }))
    ).forEach(function (f) {
      try { var im = new Image(); im.onerror = function () {}; im.src = 'assets/art/' + f; } catch (e) {}
    });

    renderTitle();
    showScreen('screen-title');

    $('btn-play').addEventListener('click', function () {
      try { AudioSys.init(); AudioSys.pop(); } catch (e) {}
      showDayIntro();
    });
    $('btn-howto').addEventListener('click', function () { openModal(howToHtml()); });
    $('btn-mute').addEventListener('click', toggleMute);
    $('btn-mute').textContent = save.mute ? '🔇' : '🔊';
    $('btn-start-day').addEventListener('click', function () {
      try { AudioSys.init(); } catch (e) {}
      startDay();
    });
    $('btn-intro-shop').addEventListener('click', function () { openShop('dayintro'); });
    $('btn-pause').addEventListener('click', pauseGame);
    // reference-3 HUD + action bar
    $('btn-settings').addEventListener('click', function () { try { AudioSys.pop(); } catch (e) {} openSettingsModal(); });
    $('btn-plus-coins').addEventListener('click', function () { try { AudioSys.pop(); } catch (e) {} openGiftModal(); });
    $('btn-plus-diamonds').addEventListener('click', function () { try { AudioSys.pop(); } catch (e) {} openSpinModal(); });
    $('ab-shop').addEventListener('click', function () { try { AudioSys.pop(); } catch (e) {} openShop('salon'); });
    $('ab-quests').addEventListener('click', function () { try { AudioSys.pop(); } catch (e) {} openQuestModal(); });
    $('ab-boost').addEventListener('click', function () { try { AudioSys.pop(); } catch (e) {} openBoostModal(); });
    $('ab-manager').addEventListener('click', function () { try { AudioSys.pop(); } catch (e) {} openManagerModal(); });
    $('ab-spin').addEventListener('click', function () { try { AudioSys.pop(); } catch (e) {} openSpinModal(); });
    $('quest-strip').addEventListener('click', function () { openQuestModal(); });
    $('btn-double').addEventListener('click', doubleEarnings);
    $('btn-summary-shop').addEventListener('click', function () { openShop('summary'); });
    $('btn-next-day').addEventListener('click', function () {
      save.day++;
      persist();
      showDayIntro();
    });
    $('btn-shop-back').addEventListener('click', function () {
      if (shopReturn === 'salon' && G && G.active) {
        showScreen('screen-salon');
        if (G.shopPaused) { G.shopPaused = false; G.tickTimer = setInterval(tick, 200); Platform.gameplayStart(); }
        updateHud();
      }
      else if (shopReturn === 'salon') { renderTitle(); showScreen('screen-title'); }
      else if (shopReturn === 'summary' && G) { renderSummary(); showScreen('screen-summary'); }
      else showDayIntro();
    });
    Array.prototype.forEach.call(document.querySelectorAll('#shop-tabs .tab-btn'), function (b) {
      b.addEventListener('click', function () { switchShopTab(b.dataset.tab); });
    });
    $('modal-close').addEventListener('click', afterModalClose);
    $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) afterModalClose(); });

    try { Platform.loadingDone(); } catch (e) {}
  }

  /* QA hook: ?qa=1 exposes a tiny automation API for headless visual QA.
   * Inert for players — without the query param the hook does not exist. */
  try {
    if (typeof location !== 'undefined' && /[?&]qa=1\b/.test(location.search)) {
      window.__qa = {
        seatFirst: function () {
          if (G && G.active && G.waiting.length) { seatCustomer(G.waiting[0].uid); return true; }
          return false;
        },
        waitingCount: function () { return G ? G.waiting.length : -1; },
        abortMinigame: function () { abortMinigame(); return true; },
        finishDay: function () {
          if (!G || !G.active) return false;
          abortMinigame();
          G.queue = []; G.waiting = []; G.seatWalks = {};
          for (var i = 0; i < G.stations.length; i++) G.stations[i] = null;
          G.staffJobs.forEach(function (sj) { sj.job = null; });
          if (!G.served) { G.served = 3; G.sats = [1, 0.95, 0.92]; }
          renderStations(); renderWaiting(); renderStaffWing();
          checkDayEnd();
          return true;
        },
        openSpin: function () { openSpinModal(); return true; },
        state: function () {
          return { day: save.day, coins: save.coins, diamonds: save.diamonds, boost: save.boost, active: !!(G && G.active) };
        }
      };
    }
  } catch (e) {}

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
