/* Sophie's Nail Salon — CrazyGames SDK v3 adapter.
 * Guarded: every call is a safe no-op when the SDK is absent.
 * Do NOT add a <script> tag for the SDK — it is provided by the portal. */
(function () {
  'use strict';

  function sdk() {
    try {
      if (typeof window !== 'undefined' && window.CrazyGames && window.CrazyGames.SDK) {
        return window.CrazyGames.SDK;
      }
    } catch (e) { /* cross-origin / missing — ignore */ }
    return null;
  }

  function gameApi() {
    var s = sdk();
    return (s && s.game) ? s.game : null;
  }

  function safeCall(fn) {
    try { fn(); } catch (e) { /* SDK not ready — stay silent */ }
  }

  var Platform = {
    /** True when the real CrazyGames SDK is present. */
    available: function () { return !!gameApi(); },

    loadingStart: function () {
      var g = gameApi();
      if (g && typeof g.loadingStart === 'function') safeCall(function () { g.loadingStart(); });
    },
    loadingDone: function () {
      var g = gameApi();
      if (g && typeof g.loadingStop === 'function') safeCall(function () { g.loadingStop(); });
    },
    gameplayStart: function () {
      var g = gameApi();
      if (g && typeof g.gameplayStart === 'function') safeCall(function () { g.gameplayStart(); });
    },
    gameplayStop: function () {
      var g = gameApi();
      if (g && typeof g.gameplayStop === 'function') safeCall(function () { g.gameplayStop(); });
    },
    /** Celebrate a great moment (3-star day, perfect mini-game step). */
    happyTime: function () {
      var g = gameApi();
      if (g && typeof g.happytime === 'function') safeCall(function () { g.happytime(); });
    },

    /**
     * Midgame ad — call ONLY at the day-summary screen (natural break,
     * never mid-action). cb receives true if an ad actually played.
     */
    midgameAd: function (cb) {
      var done = function (played) { if (typeof cb === 'function') { try { cb(!!played); } catch (e) {} } };
      var s = sdk();
      if (s && s.ad && typeof s.ad.requestAd === 'function') {
        try {
          s.ad.requestAd('midgame', {
            adStarted: function () {},
            adFinished: function () { done(true); },
            adError: function () { done(false); }
          });
        } catch (e) { done(false); }
      } else {
        done(false);
      }
    },

    /**
     * Rewarded ad — grants the reward ONLY on success (adFinished).
     * cb receives true when the reward was earned.
     */
    rewardedAd: function (cb) {
      var done = function (earned) { if (typeof cb === 'function') { try { cb(!!earned); } catch (e) {} } };
      var s = sdk();
      if (s && s.ad && typeof s.ad.requestAd === 'function') {
        try {
          s.ad.requestAd('rewarded', {
            adStarted: function () {},
            adFinished: function () { done(true); },
            adError: function () { done(false); }
          });
        } catch (e) { done(false); }
      } else {
        done(false);
      }
    }
  };

  if (typeof window !== 'undefined') { window.Platform = Platform; }
  if (typeof globalThis !== 'undefined') { globalThis.Platform = Platform; }
})();
