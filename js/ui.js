/* Dragon Ball: Fusion World — browser UI.
 * Plain script, no build step. Renders menus, the battle board, combat
 * prompts, saves progress in localStorage and orchestrates the opponent AI.
 */
(function () {
  'use strict';

  const DATA = window.DBFW_DATA;
  const E = window.DBFW_ENGINE;
  const AI = window.DBFW_AI;
  const ART = window.DBFW_ART;
  const AUDIO = window.DBFW_AUDIO;

  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');
  const toastRoot = document.getElementById('toast-root');
  const fxLayer = document.getElementById('fx-layer');
  const SAVE_KEY = 'dbfw_save_v2';
  const STAGES = DATA.STAGES;
  const LEADER_IDS = ['goku', 'vegeta', 'piccolo', 'frieza'];

  const DEFAULT_SAVE = {
    cleared: {},
    stars: {},
    leader: 'goku',
    settings: { sound: true, motion: true, fast: false },
    battles: 0,
    wins: 0,
    losses: 0,
    seenHowto: false,
    version: 2
  };

  const view = {
    screen: 'title',
    battle: null,
    selectedLeader: 'goku',
    selectedStage: STAGES[0].id,
    selectedHandUid: null,
    attackUid: null,
    attackInfo: null,
    aiBusy: false,
    aiToken: 0,
    resultShown: false,
    modalDismissible: true,
    started: false
  };

  let save = loadSave();
  let modalActions = {};
  let bgStars = [];
  let bgFrame = 0;
  let bgActive = false;
  let bgCtx = null;
  let lastFocus = null;

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function fmt(n) { return E.fmt(n); }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function factionOf(key) {
    return DATA.FACTIONS[key] || DATA.FACTIONS.saiyan;
  }

  function leaderOf(id) { return DATA.leaderDef(id); }

  function currentLeaderDef() {
    return leaderOf(view.selectedLeader);
  }

  function unlockedLeader(id) {
    const def = leaderOf(id);
    if (!def.unlockAfter) return true;
    return STAGES.some(function (stage) {
      return stage.number === def.unlockAfter && !!save.cleared[stage.id];
    });
  }

  function stageUnlocked(stage) {
    const idx = STAGES.indexOf(stage);
    if (idx <= 0) return true;
    return !!save.cleared[STAGES[idx - 1].id];
  }

  function nextUnclearedStage() {
    for (let i = 0; i < STAGES.length; i++) {
      if (!save.cleared[STAGES[i].id]) return STAGES[i];
    }
    return STAGES[STAGES.length - 1];
  }

  function clearedCount() {
    return STAGES.filter(function (s) { return !!save.cleared[s.id]; }).length;
  }

  function totalStars() {
    return STAGES.reduce(function (sum, s) { return sum + (save.stars[s.id] || 0); }, 0);
  }

  function starMarkup(count, sizeClass) {
    let html = '<span class="stars ' + (sizeClass || '') + '">';
    for (let i = 0; i < 3; i++) {
      html += '<span class="' + (i < count ? '' : 'off') + '">★</span>';
    }
    return html + '</span>';
  }

  function lifeMarkup(sideState) {
    const total = Math.max(sideState.leader.lifeAtStart || sideState.life.length, sideState.life.length);
    let html = '<div class="life-pips" aria-label="' + sideState.life.length + ' life remaining">';
    for (let i = 0; i < total; i++) {
      html += '<i class="life-pip ' + (i < sideState.life.length ? '' : 'empty') + '"></i>';
    }
    return html + '</div>';
  }

  function keywordMarkup(card) {
    return (card.keywords || []).map(function (key) {
      const kw = DATA.KEYWORDS[key] || { short: key, name: key };
      return '<span class="kw ' + esc(key) + '" title="' + esc(kw.help) + '">' + esc(kw.short) + '</span>';
    }).join('');
  }

  function activeEnergyMarkup(sideState) {
    let html = '<div class="energy-rail" aria-label="Energy ' + sideState.energy.active + ' of ' + sideState.energy.max + '">';
    for (let i = 0; i < 10; i++) {
      let cls = 'energy-pip';
      if (i < sideState.energy.active) cls += ' full';
      else if (i < sideState.energy.max) cls += ' spent';
      html += '<i class="' + cls + '"></i>';
    }
    html += '<div class="energy-count">' + sideState.energy.active + '/' + sideState.energy.max + '</div></div>';
    return html;
  }

  /* ------------------------------------------------------------------ *
   * Save + settings
   * ------------------------------------------------------------------ */
  function loadSave() {
    let raw = null;
    try { raw = window.localStorage.getItem(SAVE_KEY); } catch (err) { /* private mode */ }
    let parsed = {};
    if (raw) {
      try { parsed = JSON.parse(raw) || {}; } catch (err) { parsed = {}; }
    }
    const merged = {
      cleared: {},
      stars: {},
      leader: parsed.leader || DEFAULT_SAVE.leader,
      settings: Object.assign({}, DEFAULT_SAVE.settings, parsed.settings || {}),
      battles: Number(parsed.battles) || 0,
      wins: Number(parsed.wins) || 0,
      losses: Number(parsed.losses) || 0,
      seenHowto: !!parsed.seenHowto,
      version: 2
    };
    if (parsed.cleared && typeof parsed.cleared === 'object') {
      STAGES.forEach(function (stage) {
        if (parsed.cleared[stage.id]) merged.cleared[stage.id] = true;
      });
    }
    if (parsed.stars && typeof parsed.stars === 'object') {
      STAGES.forEach(function (stage) {
        const n = Number(parsed.stars[stage.id]);
        if (n >= 1) merged.stars[stage.id] = clamp(Math.round(n), 1, 3);
      });
    }
    if (LEADER_IDS.indexOf(merged.leader) === -1) merged.leader = 'goku';
    return merged;
  }

  function writeSave() {
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (err) { /* ignore */ }
  }

  function applySettings() {
    AUDIO.setEnabled(save.settings.sound !== false);
    document.body.classList.toggle('reduce-motion', save.settings.motion === false);
    if (bgActive && save.settings.motion === false) {
      bgActive = false;
      if (bgFrame) window.cancelAnimationFrame(bgFrame);
      drawBackground(0);
    } else if (!bgActive && save.settings.motion !== false) {
      startBackground();
    }
  }

  function isFast() { return !!save.settings.fast; }
  function waitMs(ms) { return new Promise(function (resolve) { window.setTimeout(resolve, isFast() ? Math.round(ms * 0.55) : ms); }); }

  /* ------------------------------------------------------------------ *
   * Ambient canvas — tiny drifting stars / ki motes.
   * ------------------------------------------------------------------ */
  function setupBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    bgCtx = canvas.getContext('2d');
    resizeBackground();
    window.addEventListener('resize', resizeBackground, { passive: true });
    applySettings();
  }

  function resizeBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || !bgCtx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgStars = [];
    const count = Math.min(150, Math.max(70, Math.round(window.innerWidth / 9)));
    for (let i = 0; i < count; i++) {
      bgStars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.4 + 0.35,
        a: Math.random() * 0.5 + 0.14,
        speed: Math.random() * 0.12 + 0.025,
        tint: Math.random() < 0.18 ? 'gold' : Math.random() < 0.22 ? 'cyan' : 'white'
      });
    }
    if (!bgActive) drawBackground(0);
  }

  function startBackground() {
    if (!bgCtx || bgActive) return;
    bgActive = true;
    let last = performance.now();
    function loop(now) {
      if (!bgActive) return;
      const dt = Math.min(40, now - last);
      last = now;
      drawBackground(dt);
      bgFrame = window.requestAnimationFrame(loop);
    }
    bgFrame = window.requestAnimationFrame(loop);
  }

  function drawBackground(dt) {
    if (!bgCtx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    bgCtx.clearRect(0, 0, w, h);

    const g1 = bgCtx.createRadialGradient(w * 0.16, h * 0.05, 0, w * 0.16, h * 0.05, w * 0.52);
    g1.addColorStop(0, 'rgba(255,122,24,.075)');
    g1.addColorStop(1, 'rgba(255,122,24,0)');
    bgCtx.fillStyle = g1;
    bgCtx.fillRect(0, 0, w, h);

    const g2 = bgCtx.createRadialGradient(w * 0.86, h * 0.2, 0, w * 0.86, h * 0.2, w * 0.42);
    g2.addColorStop(0, 'rgba(111,231,255,.05)');
    g2.addColorStop(1, 'rgba(111,231,255,0)');
    bgCtx.fillStyle = g2;
    bgCtx.fillRect(0, 0, w, h);

    for (let i = 0; i < bgStars.length; i++) {
      const s = bgStars[i];
      if (dt > 0) {
        s.y += s.speed * dt * 0.06;
        if (s.y > h + 3) { s.y = -3; s.x = Math.random() * w; }
      }
      bgCtx.beginPath();
      bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      if (s.tint === 'gold') bgCtx.fillStyle = 'rgba(255,207,92,' + s.a + ')';
      else if (s.tint === 'cyan') bgCtx.fillStyle = 'rgba(111,231,255,' + s.a + ')';
      else bgCtx.fillStyle = 'rgba(240,236,255,' + s.a + ')';
      bgCtx.fill();
    }
  }

  /* ------------------------------------------------------------------ *
   * Toasts / modals / confirmations
   * ------------------------------------------------------------------ */
  function toast(message, kind, duration) {
    if (!toastRoot) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = message;
    toastRoot.appendChild(el);
    while (toastRoot.children.length > 3) toastRoot.removeChild(toastRoot.firstChild);
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, duration || 2350);
  }

  function modalShell(opts) {
    const kicker = opts.kicker ? '<div class="modal-sub">' + esc(opts.kicker) + '</div>' : '';
    const closeBtn = opts.dismissible === false ? '' : '<button class="btn btn-icon btn-ghost" data-m="close" aria-label="Close">✕</button>';
    const footer = opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : '';
    return '<div class="modal-scrim" data-scrim="1"><section class="modal ' + (opts.size || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.title || 'Dialog') + '">' +
      '<header class="modal-head"><div><div class="modal-title">' + (opts.titleHtml || esc(opts.title || '')) + '</div>' + kicker + '</div>' + closeBtn + '</header>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      footer +
      '</section></div>';
  }

  function openModal(opts) {
    lastFocus = document.activeElement;
    view.modalDismissible = opts.dismissible !== false;
    modalActions = opts.actions || {};
    modalRoot.innerHTML = modalShell(opts);
    const focusTarget = modalRoot.querySelector('[autofocus]') || modalRoot.querySelector('button');
    if (focusTarget) window.setTimeout(function () { try { focusTarget.focus({ preventScroll: true }); } catch (err) {} }, 20);
  }

  function closeModal(force) {
    if (view.modalDismissible === false && !force) return;
    modalRoot.innerHTML = '';
    modalActions = {};
    view.modalDismissible = true;
    if (lastFocus && document.body.contains(lastFocus)) {
      try { lastFocus.focus({ preventScroll: true }); } catch (err) {}
    }
    lastFocus = null;
  }

  function askConfirm(opts) {
    openModal({
      title: opts.title || 'Are you sure?',
      kicker: opts.kicker || '',
      size: opts.size || '',
      body: '<p class="mulligan-note">' + (opts.body || '') + '</p>',
      footer: '<button class="btn btn-ghost" data-m="close">Cancel</button>' +
        '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-m="confirm" autofocus>' + esc(opts.confirmLabel || 'Confirm') + '</button>',
      actions: {
        confirm: function () {
          closeModal(true);
          if (typeof opts.onConfirm === 'function') opts.onConfirm();
        }
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Title screen
   * ------------------------------------------------------------------ */
  function renderTitle() {
    view.screen = 'title';
    view.battle = null;
    const cleared = clearedCount();
    const hasProgress = cleared > 0 || save.battles > 0;
    const leader = currentLeaderDef();
    app.innerHTML = '<main class="screen title-screen">' +
      '<section class="title-copy">' +
        '<div class="title-kicker">Unofficial fan-made card battler</div>' +
        '<div class="db-logo" aria-label="Dragon Ball Fusion World">' +
          '<span class="line1">DRAGON BALL</span>' +
          '<span class="line2">FUSION</span>' +
          '<span class="line3">WORLD · SINGLE PLAYER</span>' +
        '</div>' +
        '<p class="title-tag"><strong>Charge your energy. Build your board. Awaken.</strong> A complete single-player card battle through six legendary encounters. Command Goku, Vegeta, Piccolo or Frieza against the strongest fighters in the universe.</p>' +
        '<div class="title-actions">' +
          '<button class="btn btn-primary btn-lg" data-action="select">' + (hasProgress ? 'Continue Journey' : 'Begin Journey') + ' <span class="ico">➤</span></button>' +
          '<button class="btn btn-ghost" data-action="howto">How to Play</button>' +
          '<button class="btn btn-ghost btn-icon" data-action="settings" aria-label="Settings">⚙</button>' +
        '</div>' +
        '<div class="title-meta">' +
          '<span><b>' + cleared + '/6</b> Stages Cleared</span>' +
          '<span><b>' + totalStars() + '/18</b> Stars</span>' +
          '<span><b>' + esc(leader.name) + '</b> Selected</span>' +
        '</div>' +
      '</section>' +
      '<section class="hero-stack" aria-hidden="true">' +
        '<div class="hero-aura"></div>' +
        '<div class="dragonball" style="width:86px;height:86px;left:2%;top:8%;animation-delay:-2s"><i></i></div>' +
        '<div class="dragonball" style="width:42px;height:42px;right:7%;bottom:22%;animation-delay:-4s"><i></i></div>' +
        '<div class="dragonball" style="width:26px;height:26px;left:17%;bottom:2%;animation-delay:-1s"><i></i></div>' +
        '<div class="hero-card h1" data-label="GOKU"><div class="hero-glow"></div>' + ART.art('goku', { faction: 'saiyan', label: 'Goku' }) + '</div>' +
        '<div class="hero-card h2" data-label="VEGETA"><div class="hero-glow"></div>' + ART.art('vegeta', { faction: 'saiyan', label: 'Vegeta' }) + '</div>' +
        '<div class="hero-card h3" data-label="PICCOLO"><div class="hero-glow"></div>' + ART.art('piccolo', { faction: 'saiyan', label: 'Piccolo' }) + '</div>' +
        '<div class="hero-badge">6 Stages · 4 Leaders · Awaken or Fall</div>' +
      '</section>' +
      '<div class="title-disclaimer">An original, unofficial fan project inspired by Dragon Ball card battles. Not affiliated with or endorsed by the rights holders. All artwork is procedurally generated and all audio is synthesized in your browser.</div>' +
      '</main>';
  }

  /* ------------------------------------------------------------------ *
   * Fighter / stage selection
   * ------------------------------------------------------------------ */
  function ensureSelections() {
    if (!unlockedLeader(view.selectedLeader)) view.selectedLeader = save.leader && unlockedLeader(save.leader) ? save.leader : 'goku';
    let stage = STAGES.find(function (s) { return s.id === view.selectedStage; });
    if (!stage || !stageUnlocked(stage)) stage = nextUnclearedStage();
    view.selectedStage = stage.id;
  }

  function renderSelect() {
    ensureSelections();
    view.screen = 'select';
    view.battle = null;
    const leader = currentLeaderDef();
    const stage = STAGES.find(function (s) { return s.id === view.selectedStage; });
    const faction = factionOf(leader.faction);
    const oppDef = leaderOf(stage.leaderId);
    const oppFaction = factionOf(oppDef.faction);
    const clearCount = clearedCount();
    const leaderButtons = LEADER_IDS.map(function (id) {
      const def = leaderOf(id);
      const locked = !unlockedLeader(id);
      const selected = id === view.selectedLeader;
      const f = factionOf(def.faction);
      return '<button class="leader-thumb ' + (selected ? 'selected' : '') + (locked ? ' locked' : '') + '" data-action="leader" data-id="' + id + '"' +
        ' style="--faction:' + f.color + '" aria-label="' + esc(def.name) + (locked ? ' (locked)' : '') + '"' + (locked ? ' disabled' : '') + '>' +
        ART.art(def.art, { faction: def.faction, label: def.name }) +
        '<span class="lt-name">' + esc(def.name) + '</span>' +
      '</button>';
    }).join('');
    const stageButtons = STAGES.map(function (s) {
      const unlocked = stageUnlocked(s);
      const selected = s.id === view.selectedStage;
      const stars = save.stars[s.id] || 0;
      const sFaction = factionOf(leaderOf(s.leaderId).faction);
      return '<button class="stage-card ' + (selected ? 'selected' : '') + (unlocked ? '' : ' locked') + '" data-action="stage" data-id="' + s.id + '"' +
        ' style="--accent:' + s.accent + '"' + (unlocked ? '' : ' disabled') + '>' +
        '<div class="stage-art">' + ART.art(leaderOf(s.leaderId).art, { faction: sFaction.name === 'Saiyan' ? 'saiyan' : leaderOf(s.leaderId).faction, label: s.name }) + '</div>' +
        '<div class="stage-info">' +
          '<div class="stage-num">STAGE ' + s.number + '</div>' +
          '<div class="stage-name">' + esc(s.name) + '</div>' +
          '<div class="stage-opp">VS ' + esc(s.opponent) + '</div>' +
          '<div class="stage-meta-line"><span class="diff-chip">' + esc(s.difficulty) + '</span>' + starMarkup(stars) + '</div>' +
        '</div>' +
        (unlocked ? '' : '<span class="stage-lock">Clear previous</span>') +
        (s.number === STAGES.length ? '<span class="boss-tag">Final</span>' : '') +
      '</button>';
    }).join('');

    app.innerHTML = '<main class="screen select-screen">' +
      '<header class="select-header">' +
        '<button class="brand-mini" data-action="title" aria-label="Return to title" style="background:none;border:0;color:inherit;cursor:pointer;padding:0">' +
          '<span class="brand-mark"></span>' +
          '<span class="brand-name">FUSION WORLD<small>Single Player</small></span>' +
        '</button>' +
        '<div class="topbar-tools">' +
          '<button class="btn btn-ghost btn-sm" data-action="howto">How to Play</button>' +
          '<button class="btn btn-ghost btn-icon" data-action="settings" aria-label="Settings">⚙</button>' +
        '</div>' +
      '</header>' +
      '<div class="select-layout">' +
        '<section class="panel leader-select">' +
          '<div class="panel-head"><div><div class="panel-title">Choose Your Fighter</div><div class="panel-sub">Four leaders · four awakenings</div></div></div>' +
          '<div class="leader-options">' + leaderButtons + '</div>' +
          '<div class="leader-detail" style="border-color:' + faction.color + '55">' +
            '<div class="ld-top"><div><div class="ld-name">' + esc(leader.name) + '</div><div class="ld-title">' + esc(leader.title) + '</div></div><span class="ld-style">' + esc(leader.style) + '</span></div>' +
            '<div class="ld-stats"><span>POWER <b>' + fmt(leader.power) + '</b></span><span>AWAKEN <b>' + fmt(leader.awakenPower) + '</b></span><span>LIFE <b>' + leader.life + '</b></span></div>' +
            '<div class="ld-awaken">⚡ ' + esc(leader.awakenText) + '</div>' +
            '<div class="ld-blurb">' + esc(leader.blurb) + '</div>' +
            '<div class="ld-actions"><button class="btn btn-ghost btn-sm" data-action="deck" data-id="' + leader.id + '">View Deck (50)</button></div>' +
          '</div>' +
          (!unlockedLeader('frieza') ? '<p class="leader-lock-note">🔒 Frieza unlocks after you clear Stage 3.</p>' : '') +
        '</section>' +
        '<section class="panel stage-panel">' +
          '<div class="panel-head"><div><div class="panel-title">Select Your Battle</div><div class="panel-sub">Clear a stage to unlock the next</div></div>' +
            '<button class="btn btn-ghost btn-sm" data-action="opponent-deck" data-id="' + stage.id + '">Opponent Deck</button>' +
          '</div>' +
          '<div class="stage-grid">' + stageButtons + '</div>' +
          '<div class="select-actions">' +
            '<div class="progress-wrap"><div class="progress-label"><span>Campaign Progress</span><span>' + clearCount + ' / 6 · ' + totalStars() + ' stars</span></div>' +
              '<div class="progress-bar"><i style="width:' + Math.round(clearCount / STAGES.length * 100) + '%"></i></div></div>' +
            '<div class="select-start"><button class="btn btn-primary" data-action="begin">Battle ' + esc(stage.opponent) + ' <span class="ico">⚔</span></button></div>' +
          '</div>' +
        '</section>' +
      '</div>' +
    '</main>';
  }

  /* ------------------------------------------------------------------ *
   * Static modals: how to play, settings, deck viewer, log
   * ------------------------------------------------------------------ */
  function openHowTo() {
    save.seenHowto = true;
    writeSave();
    const leader = leaderOf('goku');
    openModal({
      title: 'How to <span>Play</span>',
      kicker: 'Fusion World in 60 seconds',
      size: 'lg',
      body: '<div class="howto">' +
        '<div class="howto-hero">' + ART.art('goku', { faction: 'saiyan', label: 'Goku' }) +
          '<div><h3>Win the battle. Break their spirit.</h3><p>Reduce your opponent from 5 or 6 Life to zero before they do the same to you. When a Leader is hit, its controller loses Life. A player with no Life left loses. If a player must draw from an empty deck, they also lose.</p></div>' +
        '</div>' +
        '<div class="howto-grid">' +
          '<div class="howto-item"><h4>1 · Charge</h4><p>At the start of your turn, choose one card in hand and send it to the energy rail. Your maximum energy grows by one, up to <b>10</b>. You may skip the charge to keep a card.</p></div>' +
          '<div class="howto-item"><h4>2 · Play</h4><p>In the main phase, spend energy to play Battle Cards. Your Battle Area holds up to <b>5</b> cards. Cards cannot attack the turn they arrive unless they have <b>Rush</b>.</p></div>' +
          '<div class="howto-item"><h4>3 · Attack</h4><p>Attack with your Leader once per turn, or with any ready Battle Card. The Leader or any <b>rested</b> enemy Battle Card is a valid target. You win a clash by having more power than the defender.</p></div>' +
          '<div class="howto-item"><h4>4 · Combo</h4><p>Before a clash resolves, discard cards from hand for their <b>Combo</b> value. Add that power to your attacker or defender. Cards used this way leave the fight for the drop area.</p></div>' +
          '<div class="howto-item"><h4>5 · Block</h4><p>A <b>Blocker</b> can rest itself to redirect an attack that targets your Leader or a rested Battle Card. The blocker becomes the new defender for that clash.</p></div>' +
          '<div class="howto-item"><h4>6 · Awaken</h4><p>When your Life reaches <b>3 or less</b>, your Leader awakens. Power rises and their unique awakening ability triggers. This can swing a losing battle in an instant.</p></div>' +
        '</div>' +
        '<div class="sample-stats">' +
          '<span><b>[Blocker]</b> redirect attacks</span><span><b>[Rush]</b> attack immediately</span><span><b>[Double Strike]</b> deal 2 life damage</span><span><b>Hand limit</b> 10</span><span><b>Energy cap</b> 10</span>' +
        '</div>' +
        '<div class="howto-item"><h4>Battlefield tips</h4><p>Click or tap one of your ready fighters, then an enemy target. When the opponent attacks you, choose a Blocker and/or commit Combo Cards to survive. <b>E</b> ends your turn, <b>Esc</b> cancels a target selection. All progress saves automatically.</p></div>' +
      '</div>',
      footer: '<button class="btn btn-primary" data-m="close">Let\'s Fight</button>'
    });
  }

  function openSettings() {
    const s = save.settings;
    openModal({
      title: 'Settings',
      kicker: 'Preferences are saved on this device',
      body: '<div class="settings-list">' +
        '<div class="setting-row"><div><div class="sr-label">Sound effects</div><div class="sr-note">Synthesized attacks, impacts and music stings.</div></div>' +
          '<button class="toggle ' + (s.sound ? 'on' : '') + '" data-m="sound" aria-label="Toggle sound" aria-pressed="' + !!s.sound + '"></button></div>' +
        '<div class="setting-row"><div><div class="sr-label">Motion & particles</div><div class="sr-note">Disable for a calmer, lower-power board.</div></div>' +
          '<button class="toggle ' + (s.motion ? 'on' : '') + '" data-m="motion" aria-label="Toggle motion" aria-pressed="' + !!s.motion + '"></button></div>' +
        '<div class="setting-row"><div><div class="sr-label">Battle speed</div><div class="sr-note">How quickly the opponent resolves its turn.</div></div>' +
          '<div class="seg"><button class="' + (!s.fast ? 'on' : '') + '" data-m="speed" data-fast="0">Normal</button><button class="' + (s.fast ? 'on' : '') + '" data-m="speed" data-fast="1">Fast</button></div></div>' +
        '<div class="setting-row"><div><div class="sr-label">Campaign progress</div><div class="sr-note">' + clearedCount() + ' of 6 stages cleared · ' + totalStars() + ' of 18 stars.</div></div>' +
          '<button class="btn btn-danger btn-sm" data-m="reset">Reset</button></div>' +
        (view.screen === 'battle' ? '<div class="setting-row"><div><div class="sr-label">Leave the battle</div><div class="sr-note">Forfeiting counts as a loss.</div></div><button class="btn btn-danger btn-sm" data-m="forfeit">Forfeit</button></div>' : '') +
      '</div>',
      footer: '<button class="btn btn-primary" data-m="close">Done</button>',
      actions: {
        sound: function () {
          save.settings.sound = !save.settings.sound;
          writeSave(); applySettings();
          if (save.settings.sound) AUDIO.play('click');
          openSettings();
          if (view.screen !== 'battle') render();
        },
        motion: function () {
          save.settings.motion = !save.settings.motion;
          writeSave(); applySettings(); openSettings();
        },
        speed: function (btn) {
          save.settings.fast = btn.dataset.fast === '1';
          writeSave(); openSettings();
        },
        reset: function () {
          closeModal(true);
          askConfirm({
            title: 'Reset Campaign?',
            body: 'This erases all clears and stars on this device. Your leader choice and settings are kept.',
            confirmLabel: 'Erase Progress', danger: true,
            onConfirm: function () {
              save.cleared = {}; save.stars = {}; save.battles = 0; save.wins = 0; save.losses = 0;
              writeSave(); render(); toast('Campaign progress reset.', 'warn');
            }
          });
        },
        forfeit: function () {
          closeModal(true);
          askConfirm({
            title: 'Forfeit Battle?',
            body: 'The battle will end immediately and count as a loss.',
            confirmLabel: 'Forfeit', danger: true,
            onConfirm: function () {
              if (!view.battle || view.battle.over) return;
              E.forfeit(view.battle, 'player');
              finishBattle();
            }
          });
        }
      }
    });
  }

  function openDeck(leaderId, opponentStageId) {
    let deckId, title, factionKey;
    if (opponentStageId) {
      const stage = DATA.stageDef(opponentStageId);
      deckId = stage.deck;
      title = stage.opponent + ' — Opponent';
      factionKey = leaderOf(stage.leaderId).faction;
    } else {
      const def = leaderOf(leaderId || view.selectedLeader);
      deckId = def.deck;
      title = def.name + ' — Your Deck';
      factionKey = def.faction;
    }
    const summary = DATA.deckSummary(deckId);
    const rows = summary.map(function (row) {
      return '<div class="deck-row"><span class="dr-cost">' + row.cost + '</span><span class="dr-name">' + esc(row.name) + '</span>' +
        '<span class="dr-power">' + fmt(row.power) + '</span><span class="dr-count">×' + row.count + '</span></div>';
    }).join('');
    const kindCount = summary.reduce(function (sum, row) { return sum + (row.count > 1 ? 1 : 1); }, 0);
    openModal({
      title: esc(title),
      kicker: '50 cards · ' + summary.length + ' unique · combo values shown on cards',
      size: 'lg',
      body: '<div class="deck-legend"><span><b>' + kindCount + '</b> card types</span><span><b>50</b> total cards</span><span style="color:' + factionOf(factionKey).color + '">' + esc(factionOf(factionKey).name) + ' colors</span></div>' +
        '<div class="deck-summary">' + rows + '</div>',
      footer: '<button class="btn btn-primary" data-m="close">Close</button>'
    });
  }

  function openLog() {
    if (!view.battle) return;
    const entries = view.battle.log.map(function (entry) {
      return '<div class="log-entry kind-' + esc(entry.kind) + '"><span class="le-turn">T' + entry.turn + '</span><span>' + esc(entry.text) + '</span></div>';
    }).join('');
    openModal({
      title: 'Battle Log',
      kicker: 'Turn-by-turn history',
      body: '<div class="log-list">' + (entries || '<p class="mulligan-note">The battle has not started yet.</p>') + '</div>',
      footer: '<button class="btn btn-primary" data-m="close">Close</button>'
    });
  }

  /* ------------------------------------------------------------------ *
   * Core event wiring (battle actions are defined further below)
   * ------------------------------------------------------------------ */
  function handleAppClick(event) {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    AUDIO.ensure();
    AUDIO.resume();
    const action = el.dataset.action;
    if (action === 'settings' || action === 'howto' || action === 'sound') AUDIO.play('click');

    if (action === 'title') { view.battle = null; renderTitle(); return; }
    if (action === 'select') { ensureSelections(); renderSelect(); return; }
    if (action === 'howto') { openHowTo(); return; }
    if (action === 'settings') { openSettings(); return; }
    if (action === 'log') { openLog(); return; }
    if (action === 'sound') {
      save.settings.sound = !save.settings.sound;
      writeSave(); applySettings(); render();
      if (save.settings.sound) AUDIO.play('click');
      return;
    }
    if (action === 'leader') {
      const id = el.dataset.id;
      if (!unlockedLeader(id)) { toast('Frieza unlocks after Stage 3.', 'warn'); return; }
      view.selectedLeader = id;
      view.selectedHandUid = null;
      save.leader = id; writeSave(); AUDIO.play('click'); renderSelect(); return;
    }
    if (action === 'stage') {
      const stage = STAGES.find(function (s) { return s.id === el.dataset.id; });
      if (!stage) return;
      if (!stageUnlocked(stage)) { toast('Clear the previous stage first.', 'warn'); return; }
      view.selectedStage = stage.id; AUDIO.play('click'); renderSelect(); return;
    }
    if (action === 'deck') { openDeck(el.dataset.id); return; }
    if (action === 'opponent-deck') { openDeck(null, el.dataset.id); return; }
    if (action === 'begin') { startBattleFromSelect(); return; }
    if (action === 'hand') { onHandClick(el.dataset.uid); return; }
    if (action === 'board') { onBoardClick(el.dataset.side, el.dataset.uid); return; }
    if (action === 'leader-battle') { onBoardClick(el.dataset.side, 'leader'); return; }
    if (action === 'end-turn') { onEndTurn(); return; }
    if (action === 'play-selected') { onPlaySelected(); return; }
    if (action === 'charge-selected') { onChargeSelected(); return; }
    if (action === 'skip-charge') { onSkipCharge(); return; }
    if (action === 'cancel-attack') { cancelAttack(); return; }
    if (action === 'attack-selected') { beginAttackWithSelected(); return; }
    if (action === 'forfeit') {
      askConfirm({
        title: 'Forfeit Battle?', body: 'This counts as a loss. Your campaign progress will not change.', confirmLabel: 'Forfeit', danger: true,
        onConfirm: function () { if (view.battle && !view.battle.over) { E.forfeit(view.battle, 'player'); finishBattle(); } }
      });
      return;
    }
  }

  function handleModalClick(event) {
    if (event.target.dataset && event.target.dataset.scrim) {
      if (view.modalDismissible) closeModal();
      return;
    }
    const el = event.target.closest('[data-m]');
    if (!el) return;
    const name = el.dataset.m;
    if (name === 'close') { if (view.modalDismissible) closeModal(); return; }
    const fn = modalActions[name];
    if (typeof fn === 'function') { AUDIO.play('click'); fn(el, event); }
  }

  app.addEventListener('click', handleAppClick);
  modalRoot.addEventListener('click', handleModalClick);
  document.addEventListener('pointerdown', function () { AUDIO.ensure(); AUDIO.resume(); }, { once: true, passive: true });

  /* ------------------------------------------------------------------ *
   * Master render
   * ------------------------------------------------------------------ */
  function render() {
    if (view.screen === 'battle' && view.battle) renderBattle();
    else if (view.screen === 'select') renderSelect();
    else renderTitle();
  }

  /* ------------------------------------------------------------------ *
   * Battle board rendering
   * ------------------------------------------------------------------ */
  function canPlayerAct() {
    return !!view.battle && !view.battle.over && view.battle.active === 'player' && !view.aiBusy && !view.resultShown;
  }

  function cardMarkup(card, opts) {
    opts = opts || {};
    const faction = factionOf(card.faction);
    const classes = ['card'];
    if (opts.hand) classes.push('hand-card');
    if (card.rested) classes.push('rested');
    if (card.summoningSick) classes.push('summoning');
    if (opts.canAttack) classes.push('can-attack');
    if (opts.targetable) classes.push('targetable');
    if (opts.selectedAttacker) classes.push('selected-attacker');
    if (opts.selected) classes.push('selected');
    if (opts.selectedCombo) classes.push('selected-combo');
    if (opts.unaffordable) classes.push('unaffordable');
    if (opts.extraClass) classes.push(opts.extraClass);
    const styleBits = ['--faction:' + faction.color];
    if (opts.hand) {
      styleBits.push('--i:' + (opts.index || 0));
      styleBits.push('--rot:' + (opts.rot == null ? 0 : opts.rot) + 'deg');
      styleBits.push('--ty:' + (opts.ty == null ? 0 : opts.ty) + 'px');
    }
    const data = opts.modalAction
      ? 'data-m="' + opts.modalAction + '" data-uid="' + card.uid + '"'
      : opts.hand
        ? 'data-action="hand" data-uid="' + card.uid + '"'
        : 'data-action="board" data-side="' + opts.side + '" data-uid="' + card.uid + '"';
    const title = card.name + ' · Cost ' + card.cost + ' · Power ' + fmt(E.effectivePower(card)) + ' · Combo +' + fmt(card.combo) + (card.rules ? ' — ' + card.rules : '');
    return '<button class="' + classes.join(' ') + '" ' + data + ' style="' + styleBits.join(';') + '" title="' + esc(title) + '" aria-label="' + esc(title) + '">' +
      '<span class="card-art">' + ART.art(card.art, { faction: card.faction, label: card.name }) + '</span>' +
      '<span class="card-cost">' + card.cost + '</span>' +
      '<span class="card-faction">' + esc(faction.symbol) + '</span>' +
      '<span class="card-body">' +
        '<span class="card-name">' + esc(card.name) + '</span>' +
        '<span class="card-keywords">' + keywordMarkup(card) + '</span>' +
        '<span class="card-stats"><span class="stat-power ' + (E.effectivePower(card) >= 25000 ? 'high' : '') + '">' + fmt(E.effectivePower(card)) + '</span>' +
        '<span class="stat-combo" title="Combo power">' + fmt(card.combo) + '</span></span>' +
      '</span>' +
      (card.powerBonus ? '<span class="card-buff">' + (card.powerBonus > 0 ? '+' : '') + fmt(card.powerBonus) + '</span>' : '') +
    '</button>';
  }

  function leaderMarkup(side) {
    const sideState = E.getSide(view.battle, side);
    const leader = sideState.leader;
    const faction = factionOf(leader.faction);
    const isPlayer = side === 'player';
    const canAttack = isPlayer && canPlayerAct() && view.battle.phase === 'main' && !leader.attacked && E.getAttackers(view.battle, 'player').some(function (a) { return a.uid === 'leader'; });
    const selected = isPlayer && view.attackUid === 'leader';
    const targetable = !isPlayer && !!view.attackUid && canPlayerAct();
    const classes = ['leader-card'];
    if (canAttack) classes.push('can-attack');
    if (selected) classes.push('selected-attacker');
    if (targetable) classes.push('targetable');
    if (leader.attacked && isPlayer) classes.push('rested');
    return '<button class="' + classes.join(' ') + '" data-action="leader-battle" data-side="' + side + '" style="--faction:' + faction.color + '" ' +
      'title="' + esc(leader.name + ' · Leader · Power ' + fmt(E.effectivePower(leader)) + (leader.awakenText ? ' — ' + leader.awakenText : '')) + '" aria-label="' + esc(leader.name + ' leader') + '">' +
      (leader.awakened ? '<span class="lc-awake">AWAKENED</span>' : '') +
      ART.art(leader.art, { faction: leader.faction, label: leader.name }) +
      '<span class="lc-body"><span class="lc-name">' + esc(leader.name) + '</span>' +
        '<span class="lc-power"><span class="lc-pow">' + fmt(E.effectivePower(leader)) + '</span><span class="lc-tag">Leader</span></span>' +
      '</span>' +
    '</button>';
  }

  function fieldMarkup(side) {
    const state = view.battle;
    const sideState = E.getSide(state, side);
    const faction = factionOf(sideState.leader.faction);
    const isPlayer = side === 'player';
    const active = state.active === side && !state.over;
    const cardOptions = {
      side: side
    };
    const cards = sideState.battle.map(function (card) {
      const opts = {
        side: side,
        canAttack: isPlayer && canPlayerAct() && state.phase === 'main' && !card.rested && !card.summoningSick,
        targetable: !isPlayer && !!view.attackUid && canPlayerAct() && card.rested,
        selectedAttacker: isPlayer && view.attackUid === card.uid
      };
      return cardMarkup(card, opts);
    }).join('');
    let empty = '';
    for (let i = sideState.battle.length; i < E.MAX_BATTLE; i++) empty += '<span class="empty-slot"></span>';
    let handBacks = '';
    if (!isPlayer) {
      const n = Math.min(8, sideState.hand.length);
      handBacks = '<span class="hand-backs" aria-label="Opponent hand">';
      for (let i = 0; i < n; i++) handBacks += '<i></i>';
      handBacks += '</span>';
    }
    const metadata = '<div class="field-meta">' +
      '<span class="avatar">' + ART.avatar(sideState.leader.art, sideState.leader.faction) + '</span>' +
      '<div class="meta-main"><span class="meta-name">' + esc(sideState.name) + '</span>' +
        '<span class="meta-title">' + esc(sideState.leader.title) + '</span>' +
        (sideState.leader.awakened ? '<span class="meta-awake">AWAKENED</span>' : '') +
      '</div>' +
      handBacks +
      '<div class="life-stack"><span class="life-label">Life</span>' + lifeMarkup(sideState) +
        '<span class="deck-pill">DECK <b>' + sideState.deck.length + '</b></span>' +
        '<span class="hand-pill">HAND <b>' + sideState.hand.length + '</b></span>' +
        '<span class="drop-pill">DROP <b>' + sideState.drop.length + '</b></span>' +
      '</div>' +
    '</div>';
    return '<section class="field ' + side + (active ? ' active' : '') + '" style="--faction:' + faction.color + '">' +
      metadata +
      '<div class="field-board">' +
        '<div class="leader-slot">' + leaderMarkup(side) + '</div>' +
        '<div class="battle-row">' + cards + empty + '</div>' +
        activeEnergyMarkup(sideState) +
      '</div>' +
    '</section>';
  }

  function phaseName() {
    const state = view.battle;
    if (!state) return '';
    if (state.over) return 'BATTLE OVER';
    if (state.active === 'ai') return 'OPPONENT TURN';
    if (state.phase === 'charge') return 'CHARGE PHASE';
    if (state.phase === 'main') return 'MAIN PHASE';
    return String(state.phase || '').toUpperCase();
  }

  function battleHint() {
    const state = view.battle;
    if (!state) return '';
    if (state.over) return 'The battle is over.';
    if (state.active === 'ai' || view.aiBusy) {
      return '<span class="thinking">Opponent is thinking<i></i><i></i><i></i></span>';
    }
    if (view.attackUid) {
      const attacker = findCurrentAttacker();
      return 'Attacking with <b>' + esc(attacker ? attacker.name : 'your fighter') + '</b>. Choose an enemy target — <span class="hint-accent">their Leader</span> or a rested Battle Card.';
    }
    if (state.phase === 'charge') {
      return 'Choose a card to <b>charge</b> for energy, or skip. Energy grows by 1 each turn.';
    }
    if (view.selectedHandUid) {
      const card = state.player.hand.find(function (c) { return c.uid === view.selectedHandUid; });
      if (card) {
        if (card.cost > state.player.energy.active) return '<b>' + esc(card.name) + '</b> costs ' + card.cost + ' energy — you only have ' + state.player.energy.active + '.';
        return '<b>' + esc(card.name) + '</b> is ready. Play it, or select another card.';
      }
    }
    if (state.player.battle.length >= E.MAX_BATTLE) {
      return 'Battle Area full. Attack with a ready fighter, or end your turn.';
    }
    return 'Select a ready Battle Card or your Leader, then choose a target. Play cards from your hand.';
  }

  function findCurrentAttacker() {
    if (!view.battle || !view.attackUid) return null;
    if (view.attackUid === 'leader') return view.battle.player.leader;
    return view.battle.player.battle.find(function (c) { return c.uid === view.attackUid; }) || null;
  }

  function handMarkup() {
    const state = view.battle;
    const side = state.player;
    const selected = side.hand.find(function (c) { return c.uid === view.selectedHandUid; }) || null;
    const acting = canPlayerAct();
    const inCharge = acting && state.phase === 'charge';
    const inMain = acting && state.phase === 'main';
    const handTitle = '<div class="hand-title">YOUR HAND <span class="hand-count-label">' + side.hand.length + ' / ' + E.MAX_HAND + '</span></div>';
    let hint = 'Tap a card to inspect or play it.';
    if (inCharge) hint = 'Choose one card to <b>charge</b>.';
    else if (inMain) hint = 'Play a card or launch an attack.';

    let selectedArea = '';
    if (view.attackUid) {
      const attacker = findCurrentAttacker();
      selectedArea = '<div class="selected-actions"><div class="selected-info"><span>ATTACKING</span><b>' + esc(attacker ? attacker.name : '') + '</b>' +
        '<span>' + fmt(attacker ? E.effectivePower(attacker) : 0) + '</span></div>' +
        '<button class="btn btn-ghost btn-sm" data-action="cancel-attack">Cancel</button></div>';
    } else if (selected) {
      const affordable = selected.cost <= side.energy.active;
      const actions = [];
      if (inCharge) {
        actions.push('<button class="btn btn-primary btn-sm" data-action="charge-selected" autofocus>Charge · +1 Energy</button>');
        actions.push('<button class="btn btn-ghost btn-sm" data-action="skip-charge">Skip Bonus</button>');
      } else if (inMain) {
        actions.push('<button class="btn btn-primary btn-sm" data-action="play-selected"' + (affordable && side.battle.length < E.MAX_BATTLE ? '' : ' disabled') + '>Play · ' + selected.cost + ' Energy</button>');
        if (selected.keywords.indexOf('rush') !== -1 && affordable) actions.push('<span class="diff-chip">RUSH READY</span>');
      }
      selectedArea = '<div class="selected-actions"><div class="selected-info"><b>' + esc(selected.name) + '</b>' +
        '<span class="chip-cost">' + selected.cost + '●</span><span>POW ' + fmt(selected.power) + '</span><span>COMBO +' + fmt(selected.combo) + '</span></div>' + actions.join('') + '</div>';
    } else if (inMain) {
      selectedArea = '<div class="selected-actions" style="margin-left:auto"><button class="btn btn-ghost btn-sm" data-action="skip-charge" hidden></button></div>';
    }

    let cards = '';
    const n = side.hand.length;
    side.hand.forEach(function (card, i) {
      const mid = (n - 1) / 2;
      const rot = n > 1 ? (i - mid) * 2.1 : 0;
      const ty = Math.abs(i - mid) * 1.9;
      cards += cardMarkup(card, {
        hand: true,
        index: i,
        rot: rot,
        ty: ty,
        selected: card.uid === view.selectedHandUid,
        unaffordable: inMain && card.cost > side.energy.active
      });
    });
    if (!cards) cards = '<div class="hand-empty">Your hand is empty. The battle continues.</div>';

    const endLabel = state.over ? 'Battle Over' : (state.active === 'ai' ? 'Opponent Turn' : 'End Turn');
    return '<section class="hand-panel">' +
      '<div class="hand-toolbar">' +
        '<div class="toolbar-left">' + handTitle + '<div class="toolbar-hint">' + hint + '</div></div>' +
        selectedArea +
        '<div class="toolbar-right">' +
          (inCharge ? '<button class="btn btn-ghost btn-sm" data-action="skip-charge">Skip Charge</button>' : '') +
          '<button class="btn btn-primary btn-sm" data-action="end-turn"' + (acting && !state.over ? '' : ' disabled') + '>' + esc(endLabel) + ' <span class="ico">➤</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="hand-scroll"><div class="hand" role="group" aria-label="Your hand">' + cards + '</div></div>' +
    '</section>';
  }

  function renderBattle() {
    const state = view.battle;
    if (!state) { renderTitle(); return; }
    view.screen = 'battle';
    const round = Math.max(1, Math.ceil(state.turn / 2));
    const myTurn = state.active === 'player' && !state.over;
    const stage = state.stage;
    const faction = factionOf(state.player.leader.faction);
    const title = '<div class="topbar-title"><div class="stage-title"><span>STAGE ' + stage.number + '</span> · ' + esc(stage.name) + '</div>' +
      '<div class="topbar-sub">' + esc(stage.difficulty) + ' · vs ' + esc(stage.opponent) + '</div></div>';
    app.innerHTML = '<main class="screen battle-screen" style="--faction:' + faction.color + '">' +
      '<header class="battle-topbar">' +
        '<span class="brand-mark" aria-hidden="true"></span>' + title +
        '<div class="topbar-tools">' +
          '<div class="turn-chip ' + (myTurn ? 'mine' : '') + '"><span>Round</span> <b>' + round + '</b></div>' +
          '<button class="btn btn-icon btn-ghost" data-action="log" aria-label="Battle log" title="Battle log">☰</button>' +
          '<button class="btn btn-icon btn-ghost" data-action="sound" aria-label="Toggle sound" title="Toggle sound">' + (save.settings.sound ? '♪' : '♪̸') + '</button>' +
          '<button class="btn btn-icon btn-ghost" data-action="settings" aria-label="Settings" title="Settings">⚙</button>' +
        '</div>' +
      '</header>' +
      '<div class="arena">' +
        fieldMarkup('ai') +
        '<div class="center-strip">' +
          '<div class="turn-badge">' + (state.over ? 'FINISH' : myTurn ? 'YOUR MOVE' : 'ENEMY MOVE') + ' <b>' + round + '</b></div>' +
          '<div class="hint">' + battleHint() + '</div>' +
          '<div class="phase-badge ' + (state.active === 'ai' ? 'ai' : '') + '">' + phaseName() + '</div>' +
        '</div>' +
        fieldMarkup('player') +
      '</div>' +
      handMarkup() +
    '</main>';
  }

  /* ------------------------------------------------------------------ *
   * Board interaction
   * ------------------------------------------------------------------ */
  function battleLevel() { return (view.battle && view.battle.stage.level) || 1; }

  function findCardIn(side, uid) {
    const s = E.getSide(view.battle, side);
    if (uid === 'leader') return s.leader;
    return s.battle.find(function (c) { return c.uid === uid; }) || null;
  }

  function selectedHandCard() {
    if (!view.battle || !view.selectedHandUid) return null;
    return view.battle.player.hand.find(function (c) { return c.uid === view.selectedHandUid; }) || null;
  }

  function cancelAttack(doRender) {
    view.attackUid = null;
    view.attackInfo = null;
    if (doRender !== false) render();
  }

  function onHandClick(uid) {
    if (!view.battle || view.battle.over) return;
    if (!canPlayerAct()) { toast(view.aiBusy ? 'Wait for your turn.' : 'You cannot act right now.', 'warn'); return; }
    if (view.battle.phase !== 'charge' && view.battle.phase !== 'main') return;
    view.attackUid = null;
    view.selectedHandUid = view.selectedHandUid === uid ? null : uid;
    AUDIO.play('click');
    render();
  }

  function onBoardClick(side, uid) {
    const state = view.battle;
    if (!state || state.over) return;
    if (side === 'ai') {
      if (!canPlayerAct()) return;
      if (!view.attackUid) {
        toast('Select one of your fighters first.', 'cool');
        return;
      }
      chooseAttackTarget(uid);
      return;
    }
    if (!canPlayerAct()) { toast(view.aiBusy ? 'The opponent is taking their turn.' : 'You cannot act right now.', 'warn'); return; }
    if (state.phase === 'charge') { toast('Charge or skip the charge phase before attacking.', 'warn'); return; }
    if (state.phase !== 'main') return;
    if (view.attackUid === uid) { cancelAttack(); AUDIO.play('click'); return; }
    const card = uid === 'leader' ? state.player.leader : state.player.battle.find(function (c) { return c.uid === uid; });
    if (!card) return;
    const ready = uid === 'leader' ? !state.player.leader.attacked : (!card.rested && !card.summoningSick);
    if (!ready) {
      toast(uid === 'leader' ? 'Your Leader already attacked this turn.' : (card.summoningSick ? 'This card cannot attack the turn it is played.' : 'This card is rested.'), 'warn');
      return;
    }
    view.selectedHandUid = null;
    view.attackUid = uid;
    AUDIO.play('click');
    render();
  }

  function chooseAttackTarget(uid) {
    const state = view.battle;
    if (!state || !view.attackUid) return;
    const attackerUid = view.attackUid;
    const decl = E.declareAttack(state, 'player', attackerUid, uid);
    if (!decl.ok) {
      toast(decl.error || 'That target is not valid.', 'warn');
      return;
    }
    view.attackUid = null;
    view.selectedHandUid = null;
    let info = decl.info;
    if (!state.over && decl.blockers && decl.blockers.length) {
      const blockerUid = AI.chooseBlocker(state, info, battleLevel());
      if (blockerUid) {
        const block = E.setBlocker(state, info, blockerUid);
        if (block.ok) {
          info = block.info;
          AUDIO.play('block');
          toast(info.blockerName + ' blocks the attack!', 'warn');
        }
      }
    }
    render();
    openAttackCombo(info);
  }

  function comboPower(uids) {
    const s = view.battle.player;
    return (uids || []).reduce(function (sum, uid) {
      const c = s.hand.find(function (x) { return x.uid === uid; });
      return sum + (c ? c.combo : 0);
    }, 0);
  }

  function comboMathMarkup(leftLabel, leftPower, leftBonus, rightLabel, rightPower, rightBonus, rightDef) {
    return '<div class="combo-math">' +
      '<div class="combo-side"><span class="cs-label">' + esc(leftLabel) + '</span><span class="cs-power">' + fmt(leftPower) + '</span><span class="cs-bonus">' + (leftBonus ? '+' + fmt(leftBonus) + ' combo' : '&nbsp;') + '</span></div>' +
      '<div class="combo-vs">VS</div>' +
      '<div class="combo-side ' + (rightDef ? 'def' : '') + '"><span class="cs-label">' + esc(rightLabel) + '</span><span class="cs-power">' + fmt(rightPower) + '</span><span class="cs-bonus">' + (rightBonus ? '+' + fmt(rightBonus) + ' combo' : '&nbsp;') + '</span></div>' +
    '</div>';
  }

  function choiceCardsMarkup(cards, selectedSet, actionName, emptyText) {
    if (!cards.length) return '<div class="choice-note">' + esc(emptyText || 'No cards available.') + '</div>';
    return '<div class="card-choice-row">' + cards.map(function (card) {
      return cardMarkup(card, {
        modalAction: actionName,
        selectedCombo: selectedSet && selectedSet.has(card.uid)
      });
    }).join('') + '</div>';
  }

  function openAttackCombo(info) {
    const state = view.battle;
    if (!state || state.over) return;
    const chosen = new Set();
    const hand = state.player.hand.slice();
    function paint() {
      const bonus = comboPower(Array.from(chosen));
      const total = info.attackerPower + bonus;
      const targetPower = info.targetPower;
      const winning = total > targetPower;
      const need = Math.max(0, targetPower - info.attackerPower + 1);
      const targetName = info.blockerUid ? (info.blockerName || 'Blocker') : info.targetName;
      const note = winning
        ? 'Your attack connects. Add more Combo Cards only if you want to overwhelm a possible defense combo.'
        : 'You need <b>+' + fmt(Math.max(0, need - bonus)) + '</b> more power to break through. Select Combo Cards from your hand.';
      openModal({
        title: 'Your Attack',
        kicker: info.attackerName + ' → ' + targetName,
        dismissible: false,
        body: comboMathMarkup('ATTACK', info.attackerPower, bonus, info.blocked ? 'BLOCKER' : 'DEFENSE', targetPower, 0, true) +
          '<div class="choice-note">' + note + '</div>' +
          '<div class="choice-note">Discard cards for their combo power. Selected: <b>' + chosen.size + '</b> · +<b>' + fmt(bonus) + '</b></div>' +
          choiceCardsMarkup(hand, chosen, 'toggle-attack-combo', 'Your hand is empty. Fight with raw power.') +
          (winning ? '' : '<div class="combo-warning">The attack will be stopped unless you add enough combo power.</div>'),
        footer: '<button class="btn btn-ghost" data-m="auto-attack">Auto Combo</button>' +
          '<button class="btn btn-ghost" data-m="strike">Strike · No Combo</button>' +
          '<button class="btn btn-primary" data-m="resolve-attack">' + (winning ? 'Unleash Attack' : 'Attack Anyway') + '</button>',
        actions: {
          'toggle-attack-combo': function (btn) {
            const uid = btn.dataset.uid;
            if (chosen.has(uid)) chosen.delete(uid); else chosen.add(uid);
            paint();
          },
          'auto-attack': function () {
            const need = Math.max(0, info.targetPower - info.attackerPower + 1);
            const best = AI.bestComboSubset(state, 'player', need, 5, false);
            chosen.clear();
            best.forEach(function (uid) { chosen.add(uid); });
            paint();
          },
          strike: function () { closeModal(true); resolvePlayerAttack(info, []); },
          'resolve-attack': function () { closeModal(true); resolvePlayerAttack(info, Array.from(chosen)); }
        }
      });
    }
    paint();
  }

  function resolvePlayerAttack(info, comboUids) {
    const state = view.battle;
    if (!state || state.over) return;
    const atkPower = info.attackerPower + comboPower(comboUids);
    const defCombos = AI.chooseDefenseCombo(state, info, atkPower, battleLevel());
    const rects = captureCombatRects(info);
    const result = E.resolveAttack(state, info, comboUids, defCombos);
    if (!result.ok) { toast(result.error || 'The attack could not resolve.', 'warn'); render(); return; }
    handleEvents(result.events);
    render();
    playClashFx(rects, result.hit, info);
    if (comboUids.length) toast('Combo! +' + fmt(comboPower(comboUids)) + ' power.', 'cool');
    toast(result.hit ? (info.targetUid === 'leader' ? 'Direct hit! Life lost.' : 'Attack connects — target destroyed.') : 'The attack was stopped.', result.hit ? 'good' : 'warn');
    if (state.over) window.setTimeout(finishBattle, 780);
  }

  /* ------------------------------------------------------------------ *
   * Player actions
   * ------------------------------------------------------------------ */
  function onChargeSelected() {
    const state = view.battle;
    if (!state || !canPlayerAct()) return;
    const card = selectedHandCard();
    if (!card) { toast('Choose a card to charge.', 'warn'); return; }
    const result = E.chargeCard(state, 'player', card.uid);
    if (!result.ok) { toast(result.error || 'Cannot charge that card.', 'warn'); return; }
    handleEvents(result.events);
    view.selectedHandUid = null;
    AUDIO.play('charge');
    render();
    toast('Energy increased to ' + state.player.energy.max + '. Main phase begins.', 'cool', 1700);
  }

  function onSkipCharge() {
    const state = view.battle;
    if (!state || !canPlayerAct() || state.phase !== 'charge') return;
    const result = E.skipCharge(state, 'player');
    if (!result.ok) { toast(result.error || 'Cannot skip now.', 'warn'); return; }
    view.selectedHandUid = null;
    AUDIO.play('click');
    render();
  }

  function onPlaySelected() {
    const state = view.battle;
    if (!state || !canPlayerAct() || state.phase !== 'main') return;
    const card = selectedHandCard();
    if (!card) return;
    const result = E.playCard(state, 'player', card.uid);
    if (!result.ok) { toast(result.error || 'Cannot play that card.', 'warn'); return; }
    view.selectedHandUid = null;
    handleEvents(result.events);
    render();
    if (state.over) { finishBattle(); return; }
    if ((card.keywords || []).indexOf('rush') !== -1) toast(card.name + ' can attack immediately!', 'good', 1500);
  }

  function onEndTurn() {
    const state = view.battle;
    if (!state || !canPlayerAct()) return;
    if (state.phase !== 'main' && state.phase !== 'charge') return;
    view.attackUid = null;
    view.selectedHandUid = null;
    const result = E.endTurn(state);
    if (!result.ok) { toast(result.error || 'Cannot end turn.', 'warn'); return; }
    handleEvents(result.events);
    render();
    if (state.over) { finishBattle(); return; }
    toast('Opponent turn begins.', 'warn', 1100);
    scheduleAI();
  }

  /* ------------------------------------------------------------------ *
   * Defensive prompts (opponent attacking the player)
   * ------------------------------------------------------------------ */
  function comboPowerFor(side, uids) {
    const s = E.getSide(view.battle, side);
    return (uids || []).reduce(function (sum, uid) {
      const card = s.hand.find(function (c) { return c.uid === uid; });
      return sum + (card ? card.combo : 0);
    }, 0);
  }

  function targetFromInfo(info) {
    const s = E.getSide(view.battle, info.targetSide);
    if (info.blockerUid) return s.battle.find(function (c) { return c.uid === info.blockerUid; }) || null;
    if (info.targetUid === 'leader') return s.leader;
    return s.battle.find(function (c) { return c.uid === info.targetUid; }) || null;
  }

  function askBlocker(info, blockers) {
    const state = view.battle;
    const target = targetFromInfo(info);
    return new Promise(function (resolve) {
      const body = '<p class="mulligan-note">' + esc(info.attackerName) + ' attacks <b>' + esc(info.targetName) + '</b> for <b>' + fmt(info.attackerPower) + '</b> power. ' +
        'A Blocker can rest itself to intercept the attack and become the new defender.</p>' +
        '<div class="combo-math">' +
          '<div class="combo-side"><span class="cs-label">ATTACK</span><span class="cs-power">' + fmt(info.attackerPower) + '</span></div>' +
          '<div class="combo-vs">VS</div>' +
          '<div class="combo-side def"><span class="cs-label">DEFENSE</span><span class="cs-power">' + fmt(target ? E.effectivePower(target) : info.targetPower) + '</span></div>' +
        '</div>' +
        '<div class="choice-note">Choose a Blocker, or take the hit and keep your board standing.</div>' +
        choiceCardsMarkup(blockers, null, 'block');
      openModal({
        title: 'Incoming Attack',
        kicker: 'Choose a Blocker',
        dismissible: false,
        body: body,
        footer: '<button class="btn btn-ghost" data-m="take-hit">Take the Hit</button>',
        actions: {
          block: function (btn) { closeModal(true); resolve(btn.dataset.uid); },
          'take-hit': function () { closeModal(true); resolve(null); }
        }
      });
    });
  }

  function askDefenseCombo(info, attackPower, aiComboUids) {
    const state = view.battle;
    const chosen = new Set();
    const target = targetFromInfo(info);
    const targetPower = target ? E.effectivePower(target) : info.targetPower;
    const need = Math.max(0, attackPower - targetPower);
    const hand = state.player.hand.slice();
    const aiNames = (aiComboUids || []).map(function (uid) {
      const card = E.getSide(state, 'ai').hand.find(function (c) { return c.uid === uid; });
      return card ? card.name : '';
    }).filter(Boolean);
    if (need <= 0 || !hand.length) return Promise.resolve([]);
    return new Promise(function (resolve) {
      function paint() {
        const bonus = comboPower(Array.from(chosen));
        const defended = targetPower + bonus >= attackPower;
        const stillNeeded = Math.max(0, attackPower - targetPower - bonus);
        const isLeader = target && target.cardType === 'leader';
        const body = '<p class="mulligan-note">Add Combo Cards to the defender. You need <b>+' + fmt(need) + '</b> total combo power to survive this attack.</p>' +
          comboMathMarkup('ATTACK', attackPower, 0, isLeader ? 'LEADER' : 'DEFENDER', targetPower, bonus, true) +
          (aiNames.length ? '<div class="choice-note">Opponent combo: <b>' + esc(aiNames.join(', ')) + '</b></div>' : '') +
          '<div class="choice-note">Selected: <b>' + chosen.size + '</b> · +<b>' + fmt(bonus) + '</b> · ' +
            (defended ? '<span style="color:var(--green)">defense holds</span>' : 'still short <b>+' + fmt(stillNeeded) + '</b>') + '</div>' +
          choiceCardsMarkup(hand, chosen, 'toggle-defense-combo') +
          (defended ? '' : '<div class="combo-warning">' + (isLeader ? 'If this attack lands, you lose Life.' : 'If this attack lands, this card is knocked out.') + '</div>');
        openModal({
          title: isLeader ? 'Defend Your Leader' : 'Protect Your Fighter',
          kicker: esc(info.attackerName) + ' attacks for ' + fmt(attackPower),
          dismissible: false,
          body: body,
          footer: '<button class="btn btn-ghost" data-m="auto-defense">Auto Defend</button>' +
            '<button class="btn btn-ghost" data-m="take-hit">Take the Hit</button>' +
            '<button class="btn btn-primary" data-m="defend">Defend · +' + fmt(bonus) + '</button>',
          actions: {
            'toggle-defense-combo': function (btn) {
              const uid = btn.dataset.uid;
              if (chosen.has(uid)) chosen.delete(uid); else chosen.add(uid);
              paint();
            },
            'auto-defense': function () {
              const best = AI.bestComboSubset(state, 'player', need, 5, isLeader && state.player.life.length <= 1);
              chosen.clear();
              best.forEach(function (uid) { chosen.add(uid); });
              paint();
            },
            defend: function () { closeModal(true); resolve(Array.from(chosen)); },
            'take-hit': function () { closeModal(true); resolve([]); }
          }
        });
      }
      paint();
    });
  }

  async function resolveAIAttackTurn(info) {
    const state = view.battle;
    if (!state || state.over) return;
    const blockers = E.getBlockers(state, 'player').filter(function (b) { return b.uid !== (info.blockerUid || info.targetUid); });
    if (!info.blockerUid && blockers.length) {
      const picked = await askBlocker(info, blockers);
      if (picked) {
        const block = E.setBlocker(state, info, picked);
        if (block.ok) {
          info = block.info;
          AUDIO.play('block');
          render();
          await waitMs(240);
        }
      } else {
        E.setBlocker(state, info, null);
      }
    }
    if (!state || state.over) return;

    const aiCombos = AI.chooseAttackCombo(state, info, battleLevel());
    const aiBonus = comboPowerFor('ai', aiCombos);
    const attackPower = info.attackerPower + aiBonus;
    const playerCombos = await askDefenseCombo(info, attackPower, aiCombos);
    if (!state || state.over) return;
    const rects = captureCombatRects(info);
    const result = E.resolveAttack(state, info, aiCombos, playerCombos);
    if (!result.ok) {
      toast(result.error || 'The attack fizzled.', 'warn');
      return;
    }
    handleEvents(result.events);
    render();
    playClashFx(rects, result.hit, info);
    if (playerCombos.length) toast('Combo defense! +' + fmt(comboPowerFor('player', playerCombos)) + ' power.', 'cool');
    toast(result.hit ? (info.targetUid === 'leader' ? 'Your Leader is hit.' : 'Your fighter is knocked out.') : 'Defense successful.', result.hit ? 'warn' : 'good');
    if (state.over) { finishBattle(); return; }
    await waitMs(430);
  }

  /* ------------------------------------------------------------------ *
   * Opponent AI turn
   * ------------------------------------------------------------------ */
  function scheduleAI() {
    const state = view.battle;
    if (!state || state.over || state.active !== 'ai' || view.aiBusy) return;
    view.aiBusy = true;
    const token = ++view.aiToken;
    render();
    runAITurn(token).catch(function (err) {
      console.error(err);
      toast('The opponent hesitated. Turn skipped.', 'warn');
      if (view.battle && !view.battle.over) {
        try { E.endTurn(view.battle); } catch (e) {}
        view.aiBusy = false;
        render();
      }
    });
  }

  function aiStillActive(token) {
    return view.aiToken === token && !!view.battle && !view.battle.over && view.battle.active === 'ai';
  }

  async function runAITurn(token) {
    const state = view.battle;
    try {
      await waitMs(460);
      if (!aiStillActive(token)) return;

      if (state.phase === 'charge') {
        const uid = AI.chooseCharge(state, 'ai', battleLevel());
        if (uid) {
          const charge = E.chargeCard(state, 'ai', uid);
          if (charge.ok) handleEvents(charge.events);
        } else {
          E.skipCharge(state, 'ai');
        }
        render();
        await waitMs(330);
        if (!aiStillActive(token)) return;
      }

      let playGuard = 0;
      while (aiStillActive(token) && state.phase === 'main' && playGuard < 12) {
        playGuard++;
        const uid = AI.choosePlay(state, 'ai', battleLevel());
        if (!uid) break;
        const play = E.playCard(state, 'ai', uid);
        if (!play.ok) break;
        handleEvents(play.events);
        render();
        await waitMs(400);
        if (!aiStillActive(token)) return;
      }

      let attackGuard = 0;
      while (aiStillActive(token) && state.phase === 'main' && attackGuard < 12) {
        attackGuard++;
        const attack = AI.chooseAttack(state, 'ai', battleLevel());
        if (!attack) break;
        const decl = E.declareAttack(state, 'ai', attack.attackerUid, attack.targetUid);
        if (!decl.ok) break;
        await resolveAIAttackTurn(decl.info);
        if (!aiStillActive(token)) return;
        await waitMs(380);
      }

      if (!aiStillActive(token)) return;
      const end = E.endTurn(state);
      if (!end.ok) return;
      handleEvents(end.events);
      view.aiBusy = false;
      render();
      if (state.over) { finishBattle(); return; }
      toast('Your turn begins.', 'cool', 1300);
      AUDIO.play('turn');
    } finally {
      if (view.aiToken === token && view.aiBusy) {
        view.aiBusy = false;
        if (view.battle && !view.battle.over) render();
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * FX helpers
   * ------------------------------------------------------------------ */
  function elementRectFor(side, uid) {
    let el = null;
    if (uid === 'leader') el = app.querySelector('.leader-card[data-side="' + side + '"]');
    else el = app.querySelector('.card[data-action="board"][data-side="' + side + '"][data-uid="' + uid + '"]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  }

  function captureCombatRects(info) {
    return {
      from: elementRectFor(info.attackerSide, info.attackerUid),
      to: elementRectFor(info.targetSide, info.blockerUid || info.targetUid)
    };
  }

  function playClashFx(rects, hit, info) {
    if (!rects || !rects.from || !rects.to) return;
    const from = rects.from;
    const to = rects.to;
    const x1 = from.x + from.width / 2;
    const y1 = from.y + from.height / 2;
    const x2 = to.x + to.width / 2;
    const y2 = to.y + to.height / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const color = info.attackerSide === 'player' ? '#ffcf5c' : '#c391ff';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:' + x1 + 'px;top:' + (y1 - 4.5) + 'px;width:' + Math.max(20, len) + 'px;height:9px;' +
      'transform-origin:0 50%;transform:rotate(' + angle + 'rad);pointer-events:none;z-index:71;';
    const beam = document.createElement('div');
    beam.className = 'ki-beam';
    beam.style.cssText = 'position:absolute;inset:0;width:100%;--beam:' + color + ';';
    wrap.appendChild(beam);
    fxLayer.appendChild(wrap);
    const ring = document.createElement('div');
    ring.className = 'impact-ring';
    ring.style.left = x2 + 'px';
    ring.style.top = y2 + 'px';
    ring.style.setProperty('--beam', color);
    fxLayer.appendChild(ring);
    const text = document.createElement('div');
    text.className = 'float-text ' + (hit ? '' : 'cool');
    text.style.left = (x2 - 34) + 'px';
    text.style.top = (y2 - 44) + 'px';
    text.textContent = hit ? (to.height > 120 ? (info.targetUid === 'leader' ? 'HIT' : 'K.O.') : 'HIT') : 'BLOCK';
    fxLayer.appendChild(text);
    window.setTimeout(function () {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if (ring.parentNode) ring.parentNode.removeChild(ring);
      if (text.parentNode) text.parentNode.removeChild(text);
    }, 900);
  }

  function flashScreen(kind) {
    if (save.settings.motion === false) return;
    const el = document.createElement('div');
    el.className = 'screen-flash ' + (kind || '');
    document.body.appendChild(el);
    window.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 360);
  }

  function shakeScreen() {
    if (save.settings.motion === false) return;
    const screen = app.querySelector('.battle-screen');
    if (!screen) return;
    screen.classList.remove('shake');
    void screen.offsetWidth;
    screen.classList.add('shake');
    window.setTimeout(function () { screen.classList.remove('shake'); }, 420);
  }

  function floatOver(selector, message, kind) {
    const el = app.querySelector(selector);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const node = document.createElement('div');
    node.className = 'float-text ' + (kind || '');
    node.textContent = message;
    node.style.left = (rect.left + rect.width / 2 - 30) + 'px';
    node.style.top = (rect.top - 8) + 'px';
    fxLayer.appendChild(node);
    window.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 900);
  }

  function handleEvents(events) {
    (events || []).forEach(function (ev) {
      if (!ev) return;
      if (ev.type === 'draw') AUDIO.play('draw');
      else if (ev.type === 'charge') AUDIO.play('charge');
      else if (ev.type === 'play') AUDIO.play('play');
      else if (ev.type === 'combo') AUDIO.play('combo');
      else if (ev.type === 'attack') AUDIO.play('attack');
      else if (ev.type === 'blocked') { AUDIO.play('block'); }
      else if (ev.type === 'hit') {
        AUDIO.play('hit');
        flashScreen('red');
        shakeScreen();
        floatOver('.field.' + ev.side + ' .life-stack', '-' + ev.amount + ' LIFE', 'bad');
      } else if (ev.type === 'life') {
        AUDIO.play('damage');
      } else if (ev.type === 'ko') {
        AUDIO.play('ko');
        shakeScreen();
        floatOver('.field.' + ev.side + ' .battle-row', 'K.O.', 'bad');
        toast(ev.card.name + ' is knocked out.', 'warn', 1400);
      } else if (ev.type === 'awaken') {
        AUDIO.play('awaken');
        flashScreen('gold');
        toast('⚡ ' + ev.leader.name + ' AWAKENS! Leader power ' + fmt(ev.power) + '.', 'good', 2600);
        floatOver('.field.' + ev.side + ' .leader-slot', 'AWAKEN', '');
      } else if (ev.type === 'buff') {
        floatOver('.field.' + (ev.side || 'player') + ' .battle-row', '+' + fmt(ev.amount) + ' POWER', 'cool');
      } else if (ev.type === 'turn') {
        AUDIO.play('turn');
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Starting battles, mulligan and VS intro
   * ------------------------------------------------------------------ */
  function startBattleFromSelect() {
    ensureSelections();
    const stage = DATA.stageDef(view.selectedStage);
    const leader = leaderOf(view.selectedLeader);
    save.leader = leader.id;
    writeSave();
    closeModal(true);
    view.aiToken++;
    view.aiBusy = false;
    view.resultShown = false;
    view.selectedHandUid = null;
    view.attackUid = null;
    view.battle = E.createBattle({
      stageId: stage.id,
      playerLeaderId: leader.id,
      seed: (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0
    });
    view.screen = 'battle';
    render();
    showVSIntro(stage, leader, function () { openMulligan(); });
  }

  function showVSIntro(stage, leader, done) {
    let finished = false;
    const stageLeader = leaderOf(stage.leaderId);
    function finish() {
      if (finished) return;
      finished = true;
      closeModal(true);
      done();
    }
    view.modalDismissible = true;
    modalActions = { 'vs-skip': finish };
    modalRoot.innerHTML = '<div class="vs-screen" data-m="vs-skip" role="dialog" aria-label="Versus screen">' +
      '<div class="vs-inner">' +
        '<div class="vs-side"><div class="vs-portrait">' + ART.art(leader.art, { faction: leader.faction, label: leader.name }) + '</div>' +
          '<div class="vs-name">' + esc(leader.name) + '</div><div class="vs-title">' + esc(leader.title) + '</div></div>' +
        '<div class="vs-mid"><div class="vs-letter">VS</div><div class="vs-caption">' + esc(stage.name) + ' · Stage ' + stage.number + '</div></div>' +
        '<div class="vs-side right"><div class="vs-portrait">' + ART.art(stageLeader.art, { faction: stageLeader.faction, label: stageLeader.name }) + '</div>' +
          '<div class="vs-name">' + esc(stageLeader.name) + '</div><div class="vs-title">' + esc(stageLeader.title) + '</div></div>' +
      '</div>' +
      '<div class="vs-skip">Click anywhere to skip</div>' +
    '</div>';
    window.setTimeout(finish, 1850);
  }

  function openMulligan() {
    const state = view.battle;
    if (!state || state.over) return;
    if (state.phase !== 'mulligan') {
      if (state.phase === 'charge' || state.phase === 'main') { render(); return; }
    }
    const chosen = new Set();
    function paint() {
      const cards = state.player.hand.map(function (card) {
        return cardMarkup(card, { modalAction: 'toggle-mulligan', selected: chosen.has(card.uid) });
      }).join('');
      openModal({
        title: 'Choose Your Opening Hand',
        kicker: 'Mulligan · stage ' + state.stage.number + ' · ' + esc(state.stage.opponent),
        dismissible: false,
        body: '<p class="mulligan-note">Mark any cards you want to return to your deck. They will be shuffled back and replaced. You may keep all six.</p>' +
          '<div class="mulligan-hand">' + cards + '</div>' +
          '<p class="mulligan-note" style="text-align:center;margin-bottom:0">Selected to replace: <b>' + chosen.size + '</b></p>',
        footer: '<button class="btn btn-ghost" data-m="keep-hand">Keep All</button>' +
          '<button class="btn btn-primary" data-m="do-mulligan" autofocus>Mulligan ' + chosen.size + '</button>',
        actions: {
          'toggle-mulligan': function (btn) {
            const uid = btn.dataset.uid;
            if (chosen.has(uid)) chosen.delete(uid); else chosen.add(uid);
            paint();
          },
          'keep-hand': function () { finishMulligan([]); },
          'do-mulligan': function () { finishMulligan(Array.from(chosen)); }
        }
      });
    }
    paint();
  }

  function finishMulligan(uids) {
    const state = view.battle;
    if (!state || state.phase !== 'mulligan') { closeModal(true); return; }
    const playerMull = E.mulligan(state, 'player', uids);
    if (!playerMull.ok) { toast(playerMull.error || 'Mulligan failed.', 'warn'); return; }
    const aiUids = AI.chooseMulligan(state, 'ai', battleLevel());
    E.mulligan(state, 'ai', aiUids);
    const events = E.startTurn(state, 'player');
    closeModal(true);
    handleEvents(events);
    render();
    if (state.over) { finishBattle(); return; }
    toast('Your turn — charge your energy.', 'cool', 1600);
  }

  function quickStart(opts) {
    opts = opts || {};
    closeModal(true);
    view.aiToken++;
    view.aiBusy = false;
    view.resultShown = false;
    view.selectedHandUid = null;
    view.attackUid = null;
    view.selectedLeader = opts.leader || view.selectedLeader;
    view.selectedStage = opts.stage || view.selectedStage;
    view.battle = E.createBattle({
      stageId: view.selectedStage,
      playerLeaderId: view.selectedLeader,
      seed: opts.seed == null ? (Date.now() & 0x7fffffff) : opts.seed
    });
    view.screen = 'battle';
    render();
    if (opts.mulligan === false || opts.skip) {
      const p = AI.chooseMulligan(view.battle, 'player', battleLevel());
      E.mulligan(view.battle, 'player', p);
      const a = AI.chooseMulligan(view.battle, 'ai', battleLevel());
      E.mulligan(view.battle, 'ai', a);
      const events = E.startTurn(view.battle, 'player');
      handleEvents(events);
      render();
    } else {
      openMulligan();
    }
    return view.battle;
  }

  /* ------------------------------------------------------------------ *
   * Finishing a battle + result screen
   * ------------------------------------------------------------------ */
  function finishBattle() {
    const state = view.battle;
    if (!state || !state.over || view.resultShown) return;
    view.resultShown = true;
    view.aiBusy = false;
    view.aiToken++;
    const won = state.winner === 'player';
    const life = state.player.life.length;
    const stars = won ? (life >= 3 ? 3 : life >= 2 ? 2 : 1) : 0;
    const stage = state.stage;
    const previousBest = save.stars[stage.id] || 0;
    let newBest = false;
    save.battles += 1;
    if (won) {
      save.wins += 1;
      save.cleared[stage.id] = true;
      if (stars > previousBest) {
        save.stars[stage.id] = stars;
        newBest = true;
      }
      save.leader = state.player.leader.id;
    } else {
      save.losses += 1;
    }
    writeSave();
    render();
    window.setTimeout(function () {
      showResult({ won: won, stars: stars, newBest: newBest });
    }, 480);
  }

  function launchConfetti() {
    if (save.settings.motion === false) return;
    const layer = document.createElement('div');
    layer.className = 'confetti-layer';
    const colors = ['#ffcf5c', '#ff8a1e', '#ff4767', '#6fe7ff', '#b46bff', '#5dff9c'];
    for (let i = 0; i < 72; i++) {
      const piece = document.createElement('i');
      piece.className = 'confetti';
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = colors[i % colors.length];
      piece.style.setProperty('--dur', (2.5 + Math.random() * 2.5) + 's');
      piece.style.setProperty('--delay', (Math.random() * 0.9) + 's');
      piece.style.setProperty('--drift', ((Math.random() - 0.5) * 280) + 'px');
      piece.style.width = (5 + Math.random() * 7) + 'px';
      piece.style.height = (8 + Math.random() * 12) + 'px';
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    window.setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 5600);
  }

  function showResult(opts) {
    const state = view.battle;
    if (!state) return;
    const won = opts.won;
    const stars = opts.stars;
    const stage = state.stage;
    const playerLeader = state.player.leader;
    const enemyLeader = state.ai.leader;
    const stageIndex = STAGES.indexOf(stage);
    const next = STAGES[stageIndex + 1] || null;
    const playerStats = state.player.stats;
    const quote = won ? (DATA.leaderDef(playerLeader.id).quote || 'The battle is won.') : (stage.quote || 'Defeat is a lesson.');
    const stageLine = won
      ? (next ? 'Stage ' + next.number + ' unlocked — ' + next.name : 'All six stages cleared. The universe is safe.')
      : 'The stage remains. Regroup and challenge them again.';
    const resultBadge = won
      ? (next ? 'Stage ' + stage.number + ' cleared · next stage unlocked' : 'Campaign complete · all stages cleared')
      : 'Defeat · try a new strategy';
    const starMarkupResult = '<div class="result-stars">' + [0, 1, 2].map(function (i) {
      return '<span class="' + (i < stars ? '' : 'off') + '">★</span>';
    }).join('') + '</div>';
    const footerActions = (won && next ? '<button class="btn btn-primary" data-m="next">Next Stage <span class="ico">➤</span></button>' : '') +
      '<button class="btn ' + (won && next ? 'btn-ghost' : 'btn-primary') + '" data-m="rematch">' + (won ? 'Rematch' : 'Try Again') + '</button>' +
      '<button class="btn btn-ghost" data-m="select">Stage Select</button>' +
      '<button class="btn btn-ghost" data-m="title">Title</button>';

    closeModal(true);
    view.modalDismissible = false;
    modalActions = {
      next: function () {
        if (!next) return;
        closeModal(true);
        view.selectedStage = next.id;
        view.resultShown = false;
        view.battle = null;
        startBattleFromSelect();
      },
      rematch: function () {
        closeModal(true);
        view.selectedStage = stage.id;
        view.resultShown = false;
        view.battle = null;
        startBattleFromSelect();
      },
      select: function () {
        closeModal(true);
        view.resultShown = false;
        view.battle = null;
        view.selectedStage = stage.id;
        renderSelect();
      },
      title: function () {
        closeModal(true);
        view.resultShown = false;
        view.battle = null;
        renderTitle();
      }
    };
    modalRoot.innerHTML = '<div class="result-screen" role="dialog" aria-modal="true" aria-label="Battle result">' +
      '<div class="result-card">' +
        '<div class="result-kicker">' + (won ? 'Victory' : 'Defeat') + ' · Stage ' + stage.number + '</div>' +
        '<div class="result-title ' + (won ? 'win' : 'lose') + '">' + (won ? 'WIN' : 'LOSE') + '</div>' +
        '<div class="result-badge">' + esc(resultBadge) + (opts.newBest ? ' · New Best' : '') + '</div>' +
        '<div class="result-portraits">' +
          '<div class="result-portrait">' + ART.art(playerLeader.art, { faction: playerLeader.faction, label: playerLeader.name }) + '</div>' +
          '<div class="result-portrait" style="opacity:.7">' + ART.art(enemyLeader.art, { faction: enemyLeader.faction, label: enemyLeader.name }) + '</div>' +
        '</div>' +
        starMarkupResult +
        '<p class="result-quote">“' + esc(quote) + '”</p>' +
        '<div class="result-stats">' +
          '<div class="result-stat"><b>' + fmt(playerStats.damageDealt) + '</b><span>Damage Dealt</span></div>' +
          '<div class="result-stat"><b>' + playerStats.kos + '</b><span>K.O.s</span></div>' +
          '<div class="result-stat"><b>' + playerStats.cardsPlayed + '</b><span>Cards Played</span></div>' +
          '<div class="result-stat"><b>' + playerStats.combos + '</b><span>Combo Cards</span></div>' +
        '</div>' +
        '<p class="mulligan-note" style="margin-bottom:16px">' + esc(stageLine) + '</p>' +
        '<div class="result-actions">' + footerActions + '</div>' +
      '</div>' +
    '</div>';
    if (won) launchConfetti();
  }

  /* ------------------------------------------------------------------ *
   * Keyboard controls
   * ------------------------------------------------------------------ */
  document.addEventListener('keydown', function (event) {
    const tag = (event.target && event.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (modalRoot.children.length) {
      if (event.key === 'Escape' && view.modalDismissible) { closeModal(); }
      return;
    }
    if (view.screen !== 'battle' || !view.battle) return;
    if (event.key === 'Escape') {
      if (view.attackUid) { cancelAttack(); event.preventDefault(); }
      else if (view.selectedHandUid) { view.selectedHandUid = null; render(); event.preventDefault(); }
      return;
    }
    if (!canPlayerAct()) return;
    if (event.key === 'e' || event.key === 'E') {
      event.preventDefault();
      onEndTurn();
      return;
    }
    if (event.key === 'c' || event.key === 'C') {
      if (view.battle.phase === 'charge' && selectedHandCard()) { event.preventDefault(); onChargeSelected(); }
      return;
    }
    if (event.key === 'Enter') {
      if (selectedHandCard()) {
        event.preventDefault();
        if (view.battle.phase === 'charge') onChargeSelected();
        else if (view.battle.phase === 'main') onPlaySelected();
      }
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const hand = view.battle.player.hand;
      if (!hand.length) return;
      event.preventDefault();
      const dir = event.key === 'ArrowRight' ? 1 : -1;
      let idx = hand.findIndex(function (c) { return c.uid === view.selectedHandUid; });
      if (idx < 0) idx = dir > 0 ? -1 : 0;
      idx = (idx + dir + hand.length) % hand.length;
      view.attackUid = null;
      view.selectedHandUid = hand[idx].uid;
      render();
    }
  });

  /* ------------------------------------------------------------------ *
   * Boot + query routes for previewing screens
   * ------------------------------------------------------------------ */
  function queryOpts() {
    let q;
    try { q = new URLSearchParams(window.location.search); } catch (err) { q = new URLSearchParams(''); }
    const stage = STAGES.find(function (s) { return s.id === q.get('stage'); }) ? q.get('stage') : null;
    const leader = LEADER_IDS.indexOf(q.get('leader')) !== -1 ? q.get('leader') : null;
    const seed = q.get('seed') != null && q.get('seed') !== '' ? Number(q.get('seed')) : null;
    return {
      screen: q.get('screen') || 'title',
      stage: stage,
      leader: leader,
      seed: Number.isFinite(seed) ? seed : null,
      skip: q.get('skip') === '1',
      mulligan: q.get('mulligan') === '1'
    };
  }

  function boot() {
    setupBackground();
    ensureSelections();
    applySettings();
    const q = queryOpts();
    if (q.leader) view.selectedLeader = q.leader;
    if (q.stage) view.selectedStage = q.stage;

    if (q.screen === 'select') {
      renderSelect();
      return;
    }
    if (q.screen === 'battle' || q.screen === 'mulligan' || q.screen === 'combo') {
      quickStart({
        stage: q.stage || view.selectedStage,
        leader: q.leader || view.selectedLeader,
        seed: q.seed == null ? 1 : q.seed,
        skip: q.screen === 'battle' && !q.mulligan
      });
      if (q.screen === 'combo') {
        if (view.battle.phase === 'charge') E.skipCharge(view.battle, 'player');
        render();
        window.setTimeout(function () {
          if (!view.battle || view.battle.over) return;
          view.attackUid = 'leader';
          chooseAttackTarget('leader');
        }, 260);
      }
      return;
    }
    renderTitle();
    if (q.screen === 'howto') window.setTimeout(openHowTo, 60);
    else if (q.screen === 'settings') window.setTimeout(openSettings, 60);
    else if (q.screen === 'deck') window.setTimeout(function () { openDeck(view.selectedLeader); }, 60);
    else if (q.screen === 'log') window.setTimeout(function () { openLog(); }, 60);
  }

  window.DBFW_UI = {
    view: view,
    DATA: DATA,
    ENGINE: E,
    AI: AI,
    render: render,
    title: renderTitle,
    select: renderSelect,
    quickStart: quickStart,
    startBattle: startBattleFromSelect,
    finishBattle: finishBattle,
    openAttackCombo: openAttackCombo,
    openMulligan: openMulligan,
    get state() { return view.battle; },
    get save() { return JSON.parse(JSON.stringify(save)); }
  };

  boot();
})();
