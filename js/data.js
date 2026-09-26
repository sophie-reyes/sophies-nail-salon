/* Sophie's Nail Salon — data & tuning.
 * Pure data + pure helper functions (no DOM). Separable for node smoke tests. */
(function () {
  'use strict';

  var SALON = {};

  /* ---------------- Polish colors (12; 4 locked behind progression) ---------------- */
  SALON.POLISHES = [
    { id: 'ruby',      name: 'Ruby Red',    hex: '#E11D48' },
    { id: 'bubblegum', name: 'Bubblegum',   hex: '#FF7BAC' },
    { id: 'peach',     name: 'Peachy',      hex: '#FFB199' },
    { id: 'sunny',     name: 'Sunny',       hex: '#FFD166' },
    { id: 'mint',      name: 'Minty',       hex: '#6FCF97' },
    { id: 'ocean',     name: 'Ocean',       hex: '#2D9CDB' },
    { id: 'lavender',  name: 'Lavender',    hex: '#A78BFA' },
    { id: 'teal',      name: 'Teal',        hex: '#14B8A6' },
    { id: 'rosegold',  name: 'Rose Gold',   hex: '#E7A6B7', unlock: { kind: 'upgrade', branch: 'polish', tier: 2, label: 'Premium Polishes Tier 2' } },
    { id: 'pearl',     name: 'Pearl',       hex: '#F5F3EF', unlock: { kind: 'day', day: 5, label: 'Reach Day 5' } },
    { id: 'midnight',  name: 'Midnight',    hex: '#3B4A8C', unlock: { kind: 'upgrade', branch: 'lucky', tier: 2, label: 'Lucky Decor Tier 2' } },
    { id: 'glitter',   name: 'Glitter Gold',hex: '#D4AF37', unlock: { kind: 'day', day: 10, label: 'Reach Day 10' } }
  ];

  /* ---------------- Decorations (5 base + 2 rare locked) ---------------- */
  SALON.DECORATIONS = [
    { id: 'star',   name: 'Star',   emoji: '⭐' },
    { id: 'heart',  name: 'Heart',  emoji: '💗' },
    { id: 'gem',    name: 'Gem',    emoji: '💎' },
    { id: 'flower', name: 'Flower', emoji: '🌸' },
    { id: 'stripe', name: 'Stripe', emoji: '➖' },
    { id: 'diamond', name: 'Rare Diamond', emoji: '💠', unlock: { kind: 'upgrade', branch: 'lucky', tier: 1, label: 'Lucky Decor Tier 1' } },
    { id: 'opal',    name: 'Opal',   emoji: '✨', unlock: { kind: 'upgrade', branch: 'lucky', tier: 3, label: 'Lucky Decor Tier 3' } }
  ];

  /* ---------------- Customers (8; 2 regulars unlock later) ---------------- */
  SALON.CUSTOMERS = [
    { id: 'mia',    art: 'customer-1.png', name: 'Mia',   quote: 'Something sparkly, please!',          emoji: '👩', skin: '#F6C9A0', trait: 'cheerful' },
    { id: 'emma',   art: 'customer-2.png', name: 'Emma',  quote: 'I have a date tonight — make them perfect!', emoji: '👱‍♀️', skin: '#F9D7B6', trait: 'generous' },
    { id: 'lily',   art: 'customer-3.png', name: 'Lily',  quote: 'Surprise me with something cute!',    emoji: '👧', skin: '#E8B48C', trait: 'patient' },
    { id: 'sofia',  art: 'customer-4.png', name: 'Sofia', quote: 'I trust you, Sophie. You are the best!', emoji: '👩‍🦱', skin: '#D9A06B', trait: 'loyal' },
    { id: 'ava',    art: 'customer-5.png', name: 'Ava',   quote: 'Quick please, I am in a hurry!',       emoji: '👩‍🦰', skin: '#F6C9A0', trait: 'impatient' },
    { id: 'chloe',  art: 'customer-6.png', name: 'Chloe', quote: 'Only the fanciest for me, darling.',  emoji: '💁‍♀️', skin: '#F9D7B6', trait: 'picky' },
    { id: 'zoe',    art: 'customer-7.png', name: 'Zoe',   quote: 'I saw it in a magazine — just like that!', emoji: '👩‍🎤', skin: '#C98A5B', trait: 'regular', unlockDay: 4, unlockLabel: 'Unlocks on Day 4' },
    { id: 'ruby',   art: 'customer-8.png', name: 'Ruby',  quote: 'My nails are my brand — keep them flawless.', emoji: '👸', skin: '#A96B3F', trait: 'regular', unlockDay: 7, unlockLabel: 'Unlocks on Day 7' }
  ];

  SALON.VIPS = [
    { id: 'delilah', art: 'customer-vip.png', name: 'Diva Delilah', quote: 'Do you know who I am? The BEST, obviously.', emoji: '💃', skin: '#F6C9A0', trait: 'vip', base: 120 }
  ];

  /* ---------------- Services ---------------- */
  SALON.SERVICES = {
    mani:   { id: 'mani',   name: 'Manicure',   icon: '💅', base: 20, steps: ['soak', 'file', 'paint'], decoCount: 0 },
    pedi:   { id: 'pedi',   name: 'Pedicure',   icon: '🦶', base: 40, steps: ['soak', 'file', 'paint', 'decorate'], decoCount: 2 },
    deluxe: { id: 'deluxe', name: 'Deluxe Set', icon: '✨', base: 60, steps: ['soak', 'file', 'paint', 'decorate'], decoCount: 3 }
  };

  /* ---------------- Upgrades (shop branches) ---------------- */
  SALON.UPGRADES = {
    chairs:  { name: 'Comfy Chairs',      icon: '🪑', desc: 'Patience drains slower', tiers: [
      { cost: 120,  fx: '15% slower drain' }, { cost: 500,  fx: '30% slower drain' }, { cost: 1500, fx: '50% slower drain' } ] },
    polish:  { name: 'Premium Polishes',  icon: '💄', desc: 'Bigger tips', tiers: [
      { cost: 150,  fx: '+10% tips' }, { cost: 600,  fx: '+20% tips' }, { cost: 1800, fx: '+35% tips' } ] },
    dryer:   { name: 'Express Dryer',     icon: '💨', desc: 'Mini-game timers more generous', tiers: [
      { cost: 100,  fx: '15% more time' }, { cost: 450,  fx: '30% more time' }, { cost: 1400, fx: '50% more time' } ] },
    station2:{ name: 'Second Station',    icon: '💺', desc: 'Serve 2 customers at once', tiers: [
      { cost: 800,  fx: 'Unlocks station 2' } ] },
    coffee:  { name: 'Coffee Bar',        icon: '☕', desc: 'Customers arrive with fuller patience', tiers: [
      { cost: 130,  fx: '+12% arrival patience' }, { cost: 550,  fx: '+25% arrival patience' }, { cost: 1600, fx: '+40% arrival patience' } ] },
    training:{ name: 'Master Training',   icon: '🎓', desc: 'Mini-game scoring more generous', tiers: [
      { cost: 160,  fx: '+8 step score' }, { cost: 650,  fx: '+15 step score' }, { cost: 1900, fx: '+25 step score' } ] },
    lucky:   { name: 'Lucky Decor',       icon: '🍀', desc: 'Rare gem decorations worth big tips', tiers: [
      { cost: 250,  fx: 'Unlocks Rare Diamond + big tips' }, { cost: 900,  fx: 'Unlocks Midnight polish + bigger tips' }, { cost: 2400, fx: 'Unlocks Opal + huge tips' } ] },
    celeb:   { name: 'Celeb Advertising', icon: '📣', desc: 'More VIP visits, bigger VIP payouts', tiers: [
      { cost: 200,  fx: '+VIP visits, +10% VIP pay' }, { cost: 800,  fx: '++VIP visits, +20% VIP pay' }, { cost: 2200, fx: '+++VIP visits, +30% VIP pay' } ] },
    decor:   { name: 'Salon Decor',       icon: '🎨', desc: 'Fancy salon themes + tip bonus', tiers: [
      { cost: 300,  fx: 'Sakura theme +2% tips' }, { cost: 800,  fx: 'Ocean theme +4% tips' }, { cost: 2000, fx: 'Royal theme +6% tips' } ] }
  };
  SALON.DECOR_THEMES = ['sakura', 'ocean', 'royal'];

  /* ---------------- Salon tiers (endless meta goals on cumulative stars) ----------------
   * Named tiers first; beyond Royal the sequence continues forever as Royal ★N with
   * thresholds growing ~1.5x per tier and tip bonuses inching up (capped at +40%).
   * There is no final tier — the chase never ends. */
  SALON.TIER_NAMES = [
    { stars: 10,  name: 'Bronze',  tipBonus: 0.02, theme: 'bronze',  color: '#CD7F32' },
    { stars: 30,  name: 'Silver',  tipBonus: 0.04, theme: 'silver',  color: '#9AA5B1' },
    { stars: 60,  name: 'Gold',    tipBonus: 0.06, theme: 'gold',    color: '#D4AF37' },
    { stars: 100, name: 'Diamond', tipBonus: 0.10, theme: 'diamond', color: '#7FD4E8' },
    { stars: 160, name: 'Platinum',    tipBonus: 0.12, theme: null, color: '#B9C6D8' },
    { stars: 250, name: 'Master',      tipBonus: 0.14, theme: null, color: '#C9A0DC' },
    { stars: 380, name: 'Grandmaster', tipBonus: 0.16, theme: null, color: '#FF9EC4' },
    { stars: 550, name: 'Royal',       tipBonus: 0.18, theme: 'royal', color: '#A678FF' }
  ];
  SALON.SALON_TIERS = SALON.TIER_NAMES; // alias for older call sites

  /** Tier object at endless index i (0-based). Never throws, never ends. */
  SALON.tierAt = function (i) {
    if (i < SALON.TIER_NAMES.length) return SALON.TIER_NAMES[i];
    var k = i - SALON.TIER_NAMES.length + 1; // 1, 2, 3, ...
    return {
      stars: Math.round(550 * Math.pow(1.5, k)),
      name: 'Royal ★' + k,
      tipBonus: Math.min(0.18 + 0.02 * k, 0.40),
      theme: null,
      color: '#A678FF'
    };
  };

  /* ---------------- Tuning ---------------- */
  SALON.TUNING = {
    maxCustomersPerDay: 14,
    baseWaitPatience: 100,   // seconds of waiting patience
    baseSeatPatience: 130,   // seconds while seated
    dayDrainGrowth: 0.05,    // +5% drain per day
    tipRate: 0.6,            // tip = base * tipRate * accuracy * patienceFrac * bonuses
    chairsReduction: [0, 0.15, 0.30, 0.50],
    dryerMult: [1, 1.15, 1.30, 1.50],
    coffeeBonus: [0, 0.12, 0.25, 0.40],
    trainingBonus: [0, 8, 15, 25],   // flat points added to each step score
    polishTipBonus: [0, 0.10, 0.20, 0.35],
    luckyTipBonus: [0, 0.15, 0.30, 0.50],  // applies when service has decorations
    celebVipBonus: [0, 0.10, 0.20, 0.30],
    decorTipBonus: [0, 0.02, 0.04, 0.06],
    vipBaseChance: 0.08,
    vipDayGrowth: 0.02,
    vipMaxChance: 0.30,
    celebVipChance: [0, 0.07, 0.14, 0.21],
    vipWaitMult: 0.55,       // VIPs have very low patience
    traitPatience: { impatient: 0.8, patient: 1.25, cheerful: 1.0, generous: 1.0, loyal: 1.1, picky: 0.95, regular: 1.0, vip: 0.55 },
    traitTip: { generous: 0.15 }
  };

  /* ---------------- Pure helpers (used by game.js, tested by node) ---------------- */

  /** Customers scheduled for a day (count only). Day 1 = 5, +1 every 2 days, NO CAP —
   *  the salon keeps getting busier forever (your staff handles the overflow). */
  SALON.customersForDay = function (day) {
    return 5 + Math.floor((day - 1) / 2);
  };

  /** Patience drain multiplier for a day (before chair reduction).
   *  Grows forever but gently (log curve): always a little harder, never impossible. */
  SALON.drainForDay = function (day) {
    return 1 + 0.5 * Math.log(Math.max(1, day));
  };

  /** Service base payouts grow with the day — richer clients over time. */
  SALON.serviceBaseMult = function (day) {
    return 1 + (Math.max(1, day) - 1) * 0.015;
  };

  /** Shift length in seconds for a day: 4:00 base, +20s per customer beyond the
   *  first 5, so endless busy days stay completable. Closing time ends the day. */
  SALON.daySeconds = function (day) {
    return 240 + 20 * Math.max(0, SALON.customersForDay(day) - 5);
  };

  /** Chance a spawned customer is a VIP. VIPs appear from day 3. Endless celeb
   *  levels keep nudging it up (hard cap 45% so the salon stays varied). */
  SALON.vipChance = function (day, celebTier, celebEndless) {
    if (day < 3) return 0;
    var c = SALON.TUNING.vipBaseChance + Math.max(0, day - 3) * SALON.TUNING.vipDayGrowth;
    c += SALON.celebVipChanceAdd(celebTier, celebEndless);
    return Math.min(c, 0.45);
  };

  /** Simple deterministic hash of a string (for Customer of the Day). */
  SALON.hashStr = function (s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  };

  /**
   * Customer of the Day — deterministic by calendar date (YYYY-MM-DD).
   * Returns { customerIdx, serviceId, polishIdx, decoIds, bonusMult }.
   * Always a challenging order (Deluxe) with a big bonus. Uses only
   * always-unlocked content plus rare gems granted specially for the order.
   */
  SALON.cotdForDate = function (dateStr) {
    var h = SALON.hashStr('cotd:' + dateStr);
    var custCount = SALON.CUSTOMERS.length;
    var customerIdx = h % (custCount + 2); // occasionally a VIP
    var isVip = customerIdx >= custCount;
    var polishIdx = (h >>> 3) % 8; // first 8 = always unlocked
    var decoPool = ['star', 'heart', 'gem', 'flower', 'stripe', 'diamond', 'opal'];
    var d1 = decoPool[(h >>> 6) % decoPool.length];
    var d2 = decoPool[(h >>> 9) % decoPool.length];
    if (d2 === d1) d2 = decoPool[((d2.charCodeAt(0) + 3) >>> 0) % decoPool.length] || 'star';
    return {
      customerIdx: isVip ? -1 : customerIdx,
      isVip: isVip,
      serviceId: 'deluxe',
      polishIdx: polishIdx,
      decoIds: [d1, d2, decoPool[(h >>> 12) % decoPool.length]],
      bonusMult: 2
    };
  };

  /** Total cost to fully complete the shop (for progress %). */
  SALON.totalUpgradeCost = function () {
    var total = 0, b, t;
    for (b in SALON.UPGRADES) {
      for (t = 0; t < SALON.UPGRADES[b].tiers.length; t++) total += SALON.UPGRADES[b].tiers[t].cost;
    }
    return total;
  };

  /** Cost to complete one branch. */
  SALON.branchCost = function (branch) {
    var total = 0, tiers = SALON.UPGRADES[branch].tiers;
    for (var i = 0; i < tiers.length; i++) total += tiers[i].cost;
    return total;
  };

  /** Salon tier index reached for cumulative stars (-1 = none yet). Endless. */
  SALON.tierForStars = function (stars) {
    var idx = -1, i = 0;
    for (;;) {
      var t = SALON.tierAt(i);
      if (stars >= t.stars) idx = i; else break;
      i++;
      if (i > 400) break; // safety; ~400 tiers is effectively infinite
    }
    return idx;
  };

  /** Polish lock check given save-shaped {day, upgrades}. Returns null or {label}. */
  SALON.polishLock = function (polish, day, upgrades) {
    if (!polish.unlock) return null;
    var u = polish.unlock;
    if (u.kind === 'day') return day >= u.day ? null : { label: u.label };
    if (u.kind === 'upgrade') return (upgrades[u.branch] || 0) >= u.tier ? null : { label: u.label };
    return null;
  };

  SALON.decoLock = function (deco, upgrades) {
    if (!deco.unlock) return null;
    var u = deco.unlock;
    return (upgrades[u.branch] || 0) >= u.tier ? null : { label: u.label };
  };

  /* ---------------- Endless equipment levels ----------------
   * Every upgrade branch keeps scaling forever after its fixed tiers are maxed.
   * Each endless level costs more than the last and adds a small permanent bonus. */
  SALON.ENDLESS = {
    chairs:   { base: 2200, growth: 1.8,  blurb: '2% slower patience drain' },
    polish:   { base: 2600, growth: 1.8,  blurb: '+2% tips' },
    dryer:    { base: 2000, growth: 1.8,  blurb: '3% more generous timers' },
    station2: { base: 3000, growth: 2.2,  blurb: '+1 service station' },
    coffee:   { base: 2300, growth: 1.8,  blurb: '+2% arrival patience' },
    training: { base: 2700, growth: 1.8,  blurb: '+2 step score' },
    lucky:    { base: 3400, growth: 1.8,  blurb: '+3% decorated-service tips' },
    celeb:    { base: 3100, growth: 1.8,  blurb: '+2% VIP pay, more VIP visits' },
    decor:    { base: 2900, growth: 1.8,  blurb: '+1% tips' }
  };

  /** Cost of the next endless level of a branch (owned = endless levels already bought). */
  SALON.endlessLevelCost = function (branch, owned) {
    var cfg = SALON.ENDLESS[branch];
    return Math.round(cfg.base * Math.pow(cfg.growth, owned || 0));
  };

  /** True when a branch's fixed tiers are all bought (endless levels unlocked). */
  SALON.endlessUnlocked = function (branch, upgrades) {
    return (upgrades[branch] || 0) >= SALON.UPGRADES[branch].tiers.length;
  };

  /* Combined (fixed tier + endless) effect helpers — used by game.js and the sim. */
  SALON.chairsDrainMult = function (tier, eLv) {
    return (1 - (SALON.TUNING.chairsReduction[tier || 0] || 0)) * Math.pow(0.98, eLv || 0);
  };
  SALON.dryerTimerMult = function (tier, eLv) {
    return (SALON.TUNING.dryerMult[tier || 0] || 1) * (1 + 0.03 * (eLv || 0));
  };
  SALON.coffeeArrivalMult = function (tier, eLv) {
    return 1 + (SALON.TUNING.coffeeBonus[tier || 0] || 0) + 0.02 * (eLv || 0);
  };
  SALON.trainingBonusPts = function (tier, eLv) {
    return (SALON.TUNING.trainingBonus[tier || 0] || 0) + 2 * (eLv || 0);
  };
  SALON.polishTipAdd = function (tier, eLv) {
    return (SALON.TUNING.polishTipBonus[tier || 0] || 0) + 0.02 * (eLv || 0);
  };
  SALON.luckyTipAdd = function (tier, eLv) {
    return (SALON.TUNING.luckyTipBonus[tier || 0] || 0) + 0.03 * (eLv || 0);
  };
  SALON.decorTipAdd = function (tier, eLv) {
    return (SALON.TUNING.decorTipBonus[tier || 0] || 0) + 0.01 * (eLv || 0);
  };
  SALON.celebVipPayAdd = function (tier, eLv) {
    return (SALON.TUNING.celebVipBonus[tier || 0] || 0) + 0.02 * (eLv || 0);
  };
  SALON.celebVipChanceAdd = function (tier, eLv) {
    return (SALON.TUNING.celebVipChance[tier || 0] || 0) + 0.005 * (eLv || 0);
  };
  /** Manual (player) stations: 1 + 2nd-station tier + endless station levels. */
  SALON.manualStations = function (upgrades, endless) {
    return 1 + ((upgrades.station2 || 0) > 0 ? 1 : 0) + ((endless && endless.station2) || 0);
  };

  /* ---------------- Salon expansion: rooms (endless) ---------------- */
  SALON.ROOMS = [
    { name: 'Cozy Studio',  cost: 0,     desc: 'Your first salon room — Sophie\'s own station.', tipBonus: 0 },
    { name: 'Spa Wing',     cost: 2500,  desc: '+1 staff station: hire an employee to serve customers for you!', tipBonus: 0 },
    { name: 'VIP Lounge',   cost: 9000,  desc: '+1 staff station, +5% tips salon-wide. Fancy!', tipBonus: 0.05 },
    { name: 'Royal Suite',  cost: 25000, desc: '+1 staff station, +5% tips salon-wide. Pure luxury!', tipBonus: 0.05 }
  ];

  /** Info for room index i (0-based). Beyond the named rooms: endless Sky Floors. */
  SALON.roomInfo = function (i) {
    if (i < SALON.ROOMS.length) return SALON.ROOMS[i];
    var k = i - SALON.ROOMS.length + 1; // 1, 2, 3, ...
    return {
      name: 'Sky Floor ' + k,
      cost: Math.round(25000 * Math.pow(2.2, k)),
      desc: '+1 staff station, +5% tips salon-wide. The sky\'s the limit!',
      tipBonus: 0.05
    };
  };

  /** Cost of the NEXT room when `owned` rooms are already owned. */
  SALON.roomCost = function (owned) { return SALON.roomInfo(owned).cost; };

  /** Staff (auto-serve) stations granted by room count. */
  SALON.staffStationsForRooms = function (rooms) { return Math.max(0, rooms - 1); };

  /** Total tip bonus from owned rooms. */
  SALON.roomTipBonus = function (rooms) {
    var b = 0;
    for (var i = 0; i < rooms; i++) b += SALON.roomInfo(i).tipBonus;
    return b;
  };

  /* ---------------- Employees ---------------- */
  SALON.CANDIDATE_POOL = [
    { name: 'Poppy',  emoji: '👩‍🦰', color: '#FFE3C2' },
    { name: 'Jasper', emoji: '🧑‍🦱', color: '#D6ECFF' },
    { name: 'Daisy',  emoji: '👱‍♀️', color: '#FFF3C9' },
    { name: 'Finn',   emoji: '🧑',   color: '#DFF5E1' },
    { name: 'Willow', emoji: '👩',   color: '#F3D6EC' },
    { name: 'Theo',   emoji: '👨‍🦱', color: '#E4DBFF' },
    { name: 'Ivy',    emoji: '👩‍🦳', color: '#E8F5D6' },
    { name: 'Leo',    emoji: '🧑‍🦰', color: '#FFE0D6' },
    { name: 'Mabel',  emoji: '👵',   color: '#F6E3CF' },
    { name: 'Otis',   emoji: '👴',   color: '#E3EAF6' },
    { name: 'Nina',   emoji: '👩‍🦱', color: '#FFD9E8' },
    { name: 'Sam',    emoji: '🧑‍🎤', color: '#D6F5F0' }
  ];
  SALON.SPECIALTIES = [
    { id: 'mani',   name: 'Manicure',   icon: '💅' },
    { id: 'pedi',   name: 'Pedicure',   icon: '🦶' },
    { id: 'deluxe', name: 'Deluxe Set', icon: '✨' }
  ];

  /** One-time fee to hire the next employee (hiredCount = employees already hired). */
  SALON.hireCost = function (hiredCount) {
    return Math.round(400 * Math.pow(hiredCount + 1, 1.8));
  };

  /** Cost to train an employee from `skill` to `skill + 1`. No max skill. */
  SALON.trainCost = function (skill) {
    return Math.round(60 * Math.pow(Math.max(1, skill), 1.7));
  };

  /** Service-time multiplier for a skill level: always improving, diminishing. */
  SALON.empTimeFactor = function (skill) {
    return 1 / (1 + 0.15 * (Math.max(1, skill) - 1));
  };

  /** Accuracy (0-100) of an employee at a skill level: approaches 99, never caps. */
  SALON.empAccuracy = function (skill) {
    var s = Math.max(1, skill) - 1;
    return Math.min(99, 70 + 29 * (1 - 1 / (1 + 0.25 * s)));
  };

  /** Seconds an employee needs for one service. */
  SALON.empServiceSeconds = function (serviceId, skill, specialty) {
    var base = { mani: 40, pedi: 55, deluxe: 65 }[serviceId] || 50;
    var t = base * SALON.empTimeFactor(skill);
    if (specialty === serviceId) t *= 0.85;
    return Math.max(4, t);
  };

  /* ---------------- Quest cards (tycoon task loop) ----------------
   * Targets grow with quests completed but stay completable forever; the 'earn'
   * quest keys off expected day income so it tracks the endless economy. */
  SALON.QUEST_DEFS = {
    serve:   { icon: '😊', title: function (t) { return 'Serve ' + t + ' customers'; },            target: function (q) { return 8 + 3 * Math.min(q, 30); } },
    earn:    { icon: '🪙', title: function (t) { return 'Earn ' + t + ' coins in one day'; },      target: function (q, day) { return Math.round(SALON.estimateDayIncome(day || 1) * (1.5 + 0.02 * Math.min(q, 100))); } },
    perfect: { icon: '💯', title: function (t) { return 'Get ' + t + ' perfect services'; },      target: function (q) { return 2 + Math.floor(Math.min(q, 40) / 2); } },
    train:   { icon: '🎓', title: function (t) { return 'Train employee skills ' + t + ' times'; }, target: function (q) { return 3 + Math.floor(Math.min(q, 40) * 0.75); } },
    upgrade: { icon: '🛠', title: function (t) { return 'Buy ' + t + ' upgrades'; },               target: function (q) { return 2 + Math.floor(Math.min(q, 60) / 3); } },
    hire:    { icon: '🤝', title: function (t) { return 'Hire ' + t + ' new employee' + (t > 1 ? 's' : ''); }, target: function () { return 1; } },
    expand:  { icon: '🏢', title: function (t) { return 'Expand the salon ' + t + ' time' + (t > 1 ? 's' : ''); }, target: function () { return 1; } },
    cheer:   { icon: '💖', title: function (t) { return 'Cheer up ' + t + ' impatient customers'; }, target: function (q) { return 2 + Math.floor(Math.min(q, 40) / 4); } },
    vips:    { icon: '💃', title: function (t) { return 'Serve ' + t + ' VIP' + (t > 1 ? 's' : ''); }, target: function (q) { return 1 + Math.floor(Math.min(q, 50) / 5); } },
    cotd:    { icon: '🌟', title: function () { return 'Serve the Customer of the Day'; },        target: function () { return 1; } }
  };

  /** Build a fresh quest instance. questsDone = total quests completed ever. */
  SALON.makeQuest = function (key, questsDone, day) {
    var def = SALON.QUEST_DEFS[key];
    var target = def.target(questsDone || 0, day || 1);
    return { key: key, icon: def.icon, title: def.title(target), target: target, prog: 0 };
  };

  /**
   * Pick the next quest key: not already active; 'hire' only when a free staff
   * station exists; everything else always available (endless). */
  SALON.nextQuestKey = function (questsDone, activeKeys, freeStaffSlots) {
    var keys = Object.keys(SALON.QUEST_DEFS).filter(function (k) {
      if (activeKeys.indexOf(k) >= 0) return false;
      if (k === 'hire' && !(freeStaffSlots > 0)) return false;
      return true;
    });
    if (!keys.length) return 'serve';
    var h = SALON.hashStr('quest:' + questsDone + ':' + activeKeys.join(','));
    return keys[h % keys.length];
  };

  /** Reward for completing a quest: scales with the endless economy (a slice of a
   *  good day's income) plus one quest star toward salon tiers. Always sane. */
  SALON.questReward = function (questsDone, day) {
    var base = SALON.estimateDayIncome(day || 1);
    return {
      coins: Math.max(120, Math.round(base * 0.6 * (1 + 0.02 * Math.min(questsDone || 0, 100)))),
      stars: 1
    };
  };

  /* ---------------- Unified payment (used by game + economy sim) ---------------- */
  /**
   * o: { serviceBase, day, acc (0-100), patFrac (0-1), isVip, isCotd, hasDeco,
   *      tierTip, traitTipMult, roomTipBonus, tipMult (e.g. BOOST x2),
   *      polishTier, polishEndless, luckyTier, luckyEndless,
   *      decorTier, decorEndless, celebTier, celebEndless }
   */
  SALON.payForService = function (o) {
    var base = o.serviceBase * SALON.serviceBaseMult(o.day || 1);
    if (o.isVip) base = Math.round(base * (1 + SALON.celebVipPayAdd(o.celebTier, o.celebEndless)));
    if (o.isCotd) base = base * 2;
    var tipRate = SALON.TUNING.tipRate *
      (1 + SALON.polishTipAdd(o.polishTier, o.polishEndless)) *
      (1 + (o.tierTip || 0)) *
      (1 + SALON.decorTipAdd(o.decorTier, o.decorEndless)) *
      (1 + (o.roomTipBonus || 0)) *
      (o.tipMult || 1);
    if (o.hasDeco) tipRate *= (1 + SALON.luckyTipAdd(o.luckyTier, o.luckyEndless));
    if (o.traitTipMult) tipRate *= o.traitTipMult;
    var tip = Math.round(base * tipRate * (o.acc / 100) * clamp01(o.patFrac));
    return Math.round(base * (0.7 + 0.3 * o.acc / 100)) + tip;
    function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  };

  /** Estimated coins a decent player earns on a day (avg service mix, ~80% accuracy).
   *  Includes day-based payout growth so the economy view stays sane at day 100+. */
  SALON.estimateDayIncome = function (day) {
    var n = SALON.customersForDay(day);
    var avgBase = 40 * SALON.serviceBaseMult(day); // mix of mani/pedi/deluxe
    var avgMult = 1 + SALON.TUNING.tipRate * 0.8 * 0.7; // ~80% acc, ~70% patience left
    return Math.round(n * avgBase * avgMult);
  };

  if (typeof globalThis !== 'undefined') { globalThis.SALON = SALON; }
})();
