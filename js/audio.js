/* Sophie's Nail Salon — WebAudio sound system.
 * 100% synthesized: cheerful music loop + SFX. No external audio files. */
(function () {
  'use strict';

  var AudioSys = {
    ctx: null,
    master: null,
    musicGain: null,
    muted: false,
    musicTimer: null,
    _step: 0,

    /** Must be called from a user gesture at least once. */
    init: function () {
      if (this.ctx) { this._resume(); return; }
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.35;
        this.musicGain.connect(this.master);
      } catch (e) { this.ctx = null; }
      this._resume();
    },

    _resume: function () {
      if (this.ctx && this.ctx.state === 'suspended') {
        try { this.ctx.resume(); } catch (e) {}
      }
    },

    setMuted: function (m) {
      this.muted = !!m;
      if (this.master && this.ctx) {
        try { this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02); } catch (e) {}
      }
    },

    /* ---------- tiny synth helpers ---------- */
    _tone: function (freq, dur, type, vol, when, slideTo) {
      if (!this.ctx || this.muted) return;
      try {
        var t = (when || this.ctx.currentTime);
        var o = this.ctx.createOscillator();
        var g = this.ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, t);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.master);
        o.start(t); o.stop(t + dur + 0.05);
      } catch (e) {}
    },

    _noise: function (dur, vol, filterFreq, when) {
      if (!this.ctx || this.muted) return;
      try {
        var t = (when || this.ctx.currentTime);
        var len = Math.floor(this.ctx.sampleRate * dur);
        var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        var src = this.ctx.createBufferSource(); src.buffer = buf;
        var f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filterFreq || 2000;
        var g = this.ctx.createGain(); g.gain.value = vol || 0.2;
        src.connect(f); f.connect(g); g.connect(this.master);
        src.start(t);
      } catch (e) {}
    },

    /* ---------- SFX ---------- */
    pop:      function () { this._tone(520, 0.09, 'square', 0.16, 0, 880); },
    bubble:   function () { this._tone(380, 0.14, 'sine', 0.22, 0, 820); },
    sparkle:  function () {
      var t = this.ctx ? this.ctx.currentTime : 0;
      this._tone(1568, 0.25, 'sine', 0.14, t);
      this._tone(2093, 0.3, 'sine', 0.12, t + 0.07);
      this._tone(2637, 0.35, 'sine', 0.1, t + 0.14);
    },
    cash:     function () {
      var t = this.ctx ? this.ctx.currentTime : 0;
      this._tone(988, 0.12, 'square', 0.14, t);
      this._tone(1319, 0.28, 'square', 0.14, t + 0.1);
      this._noise(0.08, 0.06, 6000, t + 0.1);
    },
    brush:    function () { this._noise(0.22, 0.12, 1400); },
    error:    function () { this._tone(170, 0.3, 'sawtooth', 0.16, 0, 110); },
    seat:     function () { this._tone(440, 0.12, 'triangle', 0.2, 0, 660); },
    star:     function () {
      var t = this.ctx ? this.ctx.currentTime : 0;
      this._tone(784, 0.15, 'triangle', 0.2, t);
      this._tone(1047, 0.4, 'triangle', 0.2, t + 0.12);
    },
    confetti: function () {
      var t = this.ctx ? this.ctx.currentTime : 0, self = this;
      [523, 659, 784, 1047, 1319].forEach(function (f, i) {
        self._tone(f, 0.2, 'triangle', 0.14, t + i * 0.08);
      });
    },

    /* ---------- cheerful music loop ---------- */
    startMusic: function () {
      this.init();
      if (!this.ctx || this.musicTimer) return;
      var self = this;
      // I–V–vi–IV in C, bouncy eighth notes
      var chords = [
        [261.63, 329.63, 392.00], // C
        [196.00, 246.94, 392.00], // G
        [220.00, 261.63, 329.63], // Am
        [174.61, 220.00, 349.23]  // F
      ];
      var melody = [523.25, 587.33, 659.25, 784.00, 659.25, 587.33, 523.25, 440.00,
                    392.00, 440.00, 523.25, 587.33, 659.25, 784.00, 880.00, 784.00];
      this._step = 0;
      this.musicTimer = setInterval(function () {
        if (self.muted || !self.ctx) { self._step++; return; }
        try {
          var t = self.ctx.currentTime + 0.06;
          var bar = Math.floor(self._step / 8) % 4;
          var chord = chords[bar];
          var s = self._step;
          // bass on beats
          if (s % 4 === 0) {
            var o = self.ctx.createOscillator(), g = self.ctx.createGain();
            o.type = 'triangle'; o.frequency.value = chord[0] / 2;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
            o.connect(g); g.connect(self.musicGain); o.start(t); o.stop(t + 0.5);
          }
          // sparkle chord pad at bar start
          if (s % 8 === 0) {
            chord.forEach(function (f) {
              var o2 = self.ctx.createOscillator(), g2 = self.ctx.createGain();
              o2.type = 'sine'; o2.frequency.value = f;
              g2.gain.setValueAtTime(0.0001, t);
              g2.gain.exponentialRampToValueAtTime(0.07, t + 0.1);
              g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
              o2.connect(g2); g2.connect(self.musicGain); o2.start(t); o2.stop(t + 1.7);
            });
          }
          // melody
          var m = melody[s % 16];
          var o3 = self.ctx.createOscillator(), g3 = self.ctx.createGain();
          o3.type = 'triangle'; o3.frequency.value = m;
          g3.gain.setValueAtTime(0.0001, t);
          g3.gain.exponentialRampToValueAtTime(0.11, t + 0.02);
          g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
          o3.connect(g3); g3.connect(self.musicGain); o3.start(t); o3.stop(t + 0.3);
          self._step++;
        } catch (e) { self._step++; }
      }, 230);
    },

    stopMusic: function () {
      if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    }
  };

  if (typeof window !== 'undefined') { window.AudioSys = AudioSys; }
  if (typeof globalThis !== 'undefined') { globalThis.AudioSys = AudioSys; }
})();
