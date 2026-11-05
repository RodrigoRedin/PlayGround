/* Tiny WebAudio synth. No external audio files. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(typeof globalThis !== 'undefined' ? globalThis : this);
  else root.DBFW_AUDIO = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  let ctx = null;
  let master = null;
  let enabled = true;
  let noiseBuffer = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  function tone(freq, dur, type, opts) {
    if (!enabled) return;
    if (!ensure()) return;
    opts = opts || {};
    const t = now() + (opts.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.gain == null ? 0.35 : opts.gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.03);
  }

  function noise(dur, opts) {
    if (!enabled) return;
    if (!ensure()) return;
    opts = opts || {};
    const t = now() + (opts.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter || 'lowpass';
    filter.frequency.setValueAtTime(opts.freq || 1200, t);
    if (opts.to) filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.to), t + dur);
    filter.Q.value = opts.q || 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.gain == null ? 0.22 : opts.gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.03);
  }

  const PLAYERS = {
    click: function () { tone(620, 0.055, 'triangle', { to: 760, gain: 0.12 }); },
    hover: function () { tone(880, 0.028, 'sine', { gain: 0.035 }); },
    draw: function () { noise(0.16, { freq: 2600, to: 800, gain: 0.13 }); tone(760, 0.11, 'triangle', { to: 980, gain: 0.1 }); },
    play: function () { noise(0.25, { freq: 340, to: 2400, gain: 0.2 }); tone(180, 0.18, 'sine', { to: 90, gain: 0.22 }); },
    charge: function () { tone(300, 0.26, 'sine', { to: 880, gain: 0.18 }); tone(450, 0.24, 'triangle', { to: 1200, gain: 0.1, delay: 0.03 }); },
    attack: function () { noise(0.24, { freq: 900, to: 5000, filter: 'bandpass', q: 1.4, gain: 0.2 }); tone(140, 0.2, 'sawtooth', { to: 520, gain: 0.14 }); },
    hit: function () { noise(0.3, { freq: 1800, to: 120, gain: 0.3 }); tone(90, 0.28, 'sine', { to: 44, gain: 0.32 }); },
    block: function () { noise(0.16, { freq: 1500, to: 500, filter: 'bandpass', gain: 0.2 }); tone(420, 0.14, 'square', { to: 260, gain: 0.1 }); },
    ko: function () { noise(0.4, { freq: 1200, to: 80, gain: 0.26 }); tone(260, 0.4, 'sawtooth', { to: 48, gain: 0.16 }); },
    damage: function () { tone(680, 0.18, 'triangle', { to: 240, gain: 0.18 }); noise(0.22, { freq: 3200, to: 600, gain: 0.12 }); },
    combo: function () { tone(520, 0.08, 'square', { to: 660, gain: 0.08 }); tone(780, 0.09, 'sine', { to: 990, gain: 0.07, delay: 0.05 }); },
    awaken: function () {
      [220, 277, 330, 440].forEach(function (f, i) {
        tone(f, 0.75, 'sine', { gain: 0.12, delay: i * 0.05, to: f * 1.5 });
      });
      noise(0.7, { freq: 500, to: 4000, filter: 'bandpass', gain: 0.14 });
    },
    win: function () {
      [392, 523, 659, 784].forEach(function (f, i) { tone(f, 0.4, 'triangle', { gain: 0.14, delay: i * 0.12 }); });
    },
    lose: function () {
      [330, 277, 220, 165].forEach(function (f, i) { tone(f, 0.5, 'sine', { gain: 0.14, delay: i * 0.15, to: f * 0.92 }); });
    },
    turn: function () { tone(330, 0.2, 'sine', { to: 440, gain: 0.07 }); tone(440, 0.28, 'sine', { to: 550, gain: 0.05, delay: 0.1 }); }
  };

  function play(name) {
    if (!enabled) return;
    const fn = PLAYERS[name];
    if (fn) { try { fn(); } catch (e) { /* audio is decorative */ } }
  }

  function setEnabled(value) { enabled = !!value; if (enabled) ensure(); }
  function isEnabled() { return enabled; }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  return { play, setEnabled, isEnabled, resume, ensure };
});
