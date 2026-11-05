/* Dragon Ball: Fusion World — deterministic game engine.
 * Pure rules: no DOM access. Browser global + CommonJS export.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'));
  else root.DBFW_ENGINE = factory(root.DBFW_DATA);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (DATA) {
  'use strict';

  const MAX_BATTLE = 5;
  const MAX_HAND = 10;
  const MAX_ENERGY = 10;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function otherSide(side) { return side === 'player' ? 'ai' : 'player'; }
  function getSide(state, side) { return side === 'player' ? state.player : state.ai; }
  function sideLabel(side) { return side === 'player' ? 'You' : 'Opponent'; }

  function effectivePower(entity) {
    if (!entity) return 0;
    return (entity.power || 0) + (entity.powerBonus || 0);
  }

  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  function log(state, text, kind) {
    state.log.push({ text: text, kind: kind || 'info', turn: state.turn, side: state.active });
    if (state.log.length > 140) state.log.shift();
  }

  function makeCard(state, cardId) {
    const def = DATA.cardDef(cardId);
    return {
      uid: 'c' + (++state.nextUid),
      id: def.id,
      name: def.name,
      faction: def.faction,
      cost: def.cost,
      power: def.power,
      combo: def.combo,
      keywords: def.keywords.slice(),
      effects: def.effects || {},
      art: def.art,
      rules: def.rules,
      text: def.text || '',
      flavor: def.flavor || '',
      powerBonus: 0,
      rested: false,
      summoningSick: false,
      enteredTurn: 0,
      cardType: 'battle'
    };
  }

  function makeLeader(state, def) {
    return {
      uid: 'leader',
      cardType: 'leader',
      id: def.id,
      name: def.name,
      title: def.title,
      faction: def.faction,
      art: def.art,
      power: def.power,
      basePower: def.power,
      awakenPower: def.awakenPower,
      powerBonus: 0,
      awaken: def.awaken || {},
      awakenText: def.awakenText || '',
      behavior: def.behavior || '',
      awakened: false,
      attacked: false,
      lifeAtStart: def.life
    };
  }

  function newStats() {
    return { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, kos: 0, combos: 0, lifeLost: 0 };
  }

  function makeSide(state, side, leaderId, deckId, lifeOverride) {
    const leaderDef = DATA.leaderDef(leaderId);
    const deck = DATA.deckList(deckId).map(function (id) { return makeCard(state, id); });
    shuffle(deck, state.rng);
    const sideState = {
      side: side,
      name: leaderDef.name,
      leader: makeLeader(state, leaderDef),
      deck: deck,
      hand: [],
      life: [],
      drop: [],
      battle: [],
      energy: { max: 0, active: 0, cards: [] },
      mulliganUsed: false,
      stats: newStats()
    };
    const lifeCount = Math.max(1, Math.min(8, lifeOverride == null ? leaderDef.life : lifeOverride));
    for (let i = 0; i < lifeCount; i++) sideState.life.push(sideState.deck.pop());
    for (let i = 0; i < 6; i++) sideState.hand.push(sideState.deck.pop());
    return sideState;
  }

  function addToHand(state, side, card, reveal) {
    const s = getSide(state, side);
    if (s.hand.length >= MAX_HAND) {
      s.drop.push(card);
      log(state, sideLabel(side) + ' discards ' + (reveal ? card.name : 'a card') + ' (hand full).', 'muted');
      return false;
    }
    s.hand.push(card);
    return true;
  }

  function drawCards(state, side, n) {
    const events = [];
    const s = getSide(state, side);
    for (let i = 0; i < n; i++) {
      if (state.over) break;
      if (!s.deck.length) {
        endGame(state, otherSide(side), 'deckout');
        events.push({ type: 'gameover', winner: state.winner, reason: state.reason });
        break;
      }
      const card = s.deck.pop();
      const added = addToHand(state, side, card, side === 'player');
      events.push({ type: 'draw', side: side, card: card, added: added });
      log(state, sideLabel(side) + ' draws ' + (side === 'player' ? card.name : 'a card') + '.', 'draw');
      if (!added) {
        events.push({ type: 'discard', side: side, card: card });
      }
    }
    return events;
  }

  function addLifeFromDeck(state, side, source) {
    const s = getSide(state, side);
    if (state.over) return [];
    if (!s.deck.length) {
      endGame(state, otherSide(side), 'deckout');
      return [{ type: 'gameover', winner: state.winner, reason: state.reason }];
    }
    const card = s.deck.pop();
    s.life.push(card);
    log(state, sideLabel(side) + ' adds a Life card.', 'life');
    return [{ type: 'lifeadd', side: side, card: card, life: s.life.length, source: source || 'effect' }];
  }

  function endGame(state, winner, reason) {
    if (state.over) return;
    state.over = true;
    state.winner = winner;
    state.reason = reason || 'life';
    state.phase = 'gameover';
    const text = winner === 'player'
      ? 'Victory! ' + state.ai.name + ' is defeated.'
      : 'Defeat. ' + state.player.name + ' falls.';
    log(state, text, winner === 'player' ? 'win' : 'lose');
  }

  function createBattle(opts) {
    opts = opts || {};
    const stage = DATA.stageDef(opts.stageId || 'desert_duel');
    const playerLeaderId = opts.playerLeaderId || 'goku';
    const seed = opts.seed == null ? Date.now() : opts.seed;
    const state = {
      seed: seed,
      rng: mulberry32(seed >>> 0),
      stageId: stage.id,
      stage: stage,
      turn: 0,
      active: 'player',
      phase: 'mulligan',
      winner: null,
      reason: null,
      over: false,
      nextUid: 0,
      nextAtk: 0,
      log: [],
      lastEvents: [],
      stats: { player: newStats(), ai: newStats() },
      player: null,
      ai: null
    };
    state.player = makeSide(state, 'player', playerLeaderId, DATA.leaderDef(playerLeaderId).deck);
    state.ai = makeSide(state, 'ai', stage.leaderId, stage.deck, stage.life);
    log(state, 'STAGE ' + stage.number + ' — ' + stage.name, 'stage');
    log(state, state.player.name + ' vs ' + state.ai.name, 'stage');
    log(state, 'Choose your opening hand.', 'info');
    return state;
  }

  function mulligan(state, side, uids) {
    if (state.over || state.phase !== 'mulligan') return { ok: false, error: 'Not in mulligan phase.' };
    const s = getSide(state, side);
    if (s.mulliganUsed) return { ok: false, error: 'Mulligan already used.' };
    const chosen = new Set(Array.isArray(uids) ? uids : []);
    const returning = [];
    s.hand = s.hand.filter(function (card) {
      if (chosen.has(card.uid)) { returning.push(card); return false; }
      return true;
    });
    returning.forEach(function (card) { s.deck.push(card); });
    shuffle(s.deck, state.rng);
    const events = [];
    for (let i = 0; i < returning.length; i++) {
      if (!s.deck.length) break;
      const card = s.deck.pop();
      s.hand.push(card);
      events.push({ type: 'draw', side: side, card: card, added: true });
    }
    s.mulliganUsed = true;
    log(state, sideLabel(side) + (returning.length ? ' mulligans ' + returning.length + ' card' + (returning.length === 1 ? '' : 's') + '.' : ' keeps the opening hand.'), 'info');
    return { ok: true, events: events, count: returning.length };
  }

  function startTurn(state, side) {
    if (state.over) return [];
    const s = getSide(state, side);
    state.active = side;
    state.turn += 1;
    s.energy.active = s.energy.max;
    s.leader.attacked = false;
    s.battle.forEach(function (card) {
      card.rested = false;
      card.summoningSick = false;
    });
    const events = [{ type: 'turn', side: side, turn: state.turn }];
    log(state, (side === 'player' ? 'Your turn begins.' : state.ai.name + "'s turn begins."), 'turn');
    const drawEvents = drawCards(state, side, 1);
    events.push.apply(events, drawEvents);
    if (state.over) return events;
    state.phase = (s.energy.max < MAX_ENERGY && s.hand.length > 0) ? 'charge' : 'main';
    events.push({ type: 'phase', phase: state.phase, side: side });
    return events;
  }

  function chargeCard(state, side, uid) {
    if (state.over) return { ok: false, error: 'Battle is over.' };
    if (state.active !== side || state.phase !== 'charge') return { ok: false, error: 'Not in charge phase.' };
    const s = getSide(state, side);
    if (s.energy.max >= MAX_ENERGY) { state.phase = 'main'; return { ok: false, error: 'Energy is already full.' }; }
    const idx = s.hand.findIndex(function (c) { return c.uid === uid; });
    if (idx < 0) return { ok: false, error: 'Card not in hand.' };
    const card = s.hand.splice(idx, 1)[0];
    s.energy.cards.push(card);
    s.energy.max += 1;
    s.energy.active = s.energy.max;
    state.phase = 'main';
    log(state, sideLabel(side) + ' charges ' + (side === 'player' ? card.name : 'a card') + '. Energy: ' + s.energy.max + '.', 'energy');
    return { ok: true, events: [{ type: 'charge', side: side, card: card, energy: s.energy.max }] };
  }

  function skipCharge(state, side) {
    if (state.over) return { ok: false, error: 'Battle is over.' };
    if (state.active !== side || state.phase !== 'charge') return { ok: false, error: 'Not in charge phase.' };
    state.phase = 'main';
    log(state, sideLabel(side) + ' skips charging.', 'muted');
    return { ok: true, events: [{ type: 'phase', phase: 'main', side: side }] };
  }

  function findBattleCard(s, uid) {
    return s.battle.find(function (c) { return c.uid === uid; }) || null;
  }

  function koCard(state, ownerSide, card, sourceSide) {
    const s = getSide(state, ownerSide);
    const idx = s.battle.indexOf(card);
    if (idx < 0) return [];
    s.battle.splice(idx, 1);
    card.rested = true;
    s.drop.push(card);
    if (sourceSide) getSide(state, sourceSide).stats.kos += 1;
    log(state, card.name + ' is knocked out.', 'ko');
    const events = [{ type: 'ko', side: ownerSide, card: card }];
    return events;
  }

  function resolveOnPlay(state, side, card, events) {
    const affects = card.effects || {};
    const list = affects.onPlay || [];
    const s = getSide(state, side);
    const enemy = getSide(state, otherSide(side));
    list.forEach(function (effect) {
      if (state.over) return;
      if (effect.draw) {
        events.push.apply(events, drawCards(state, side, effect.draw));
        if (state.over) return;
      }
      if (effect.buffSelf && (effect.ifLifeAtMost == null || s.life.length <= effect.ifLifeAtMost)) {
        card.powerBonus += effect.buffSelf;
        events.push({ type: 'buff', side: side, card: card, amount: effect.buffSelf, scope: 'self' });
        log(state, card.name + ' gains +' + fmt(effect.buffSelf) + ' power.', 'buff');
      }
      if (effect.buffAll && effect.ifLifeAtMost == null) {
        s.battle.forEach(function (c) { c.powerBonus += effect.buffAll; });
        events.push({ type: 'buff', side: side, amount: effect.buffAll, scope: 'all' });
        log(state, sideLabel(side) + "'s Battle Cards gain +" + fmt(effect.buffAll) + ' power.', 'buff');
      }
      if (effect.addLife) {
        events.push.apply(events, addLifeFromDeck(state, side, 'onplay'));
      }
      if (effect.koWeakest) {
        const candidates = enemy.battle.filter(function (c) { return effectivePower(c) <= effect.koWeakest; });
        candidates.sort(function (a, b) { return effectivePower(b) - effectivePower(a); });
        if (candidates.length) {
          events.push.apply(events, koCard(state, otherSide(side), candidates[0], side));
        }
      }
    });
  }

  function playCard(state, side, uid) {
    if (state.over) return { ok: false, error: 'Battle is over.' };
    if (state.active !== side || state.phase !== 'main') return { ok: false, error: 'You cannot play a card right now.' };
    const s = getSide(state, side);
    if (s.battle.length >= MAX_BATTLE) return { ok: false, error: 'Your Battle Area is full.' };
    const idx = s.hand.findIndex(function (c) { return c.uid === uid; });
    if (idx < 0) return { ok: false, error: 'Card not in hand.' };
    const card = s.hand[idx];
    if (card.cost > s.energy.active) return { ok: false, error: 'Not enough energy.' };
    s.hand.splice(idx, 1);
    s.energy.active -= card.cost;
    card.rested = false;
    card.summoningSick = card.keywords.indexOf('rush') === -1;
    card.enteredTurn = state.turn;
    s.battle.push(card);
    s.stats.cardsPlayed += 1;
    const events = [{ type: 'play', side: side, card: card, cost: card.cost }];
    log(state, sideLabel(side) + ' plays ' + card.name + ' (cost ' + card.cost + ').', 'play');
    resolveOnPlay(state, side, card, events);
    return { ok: true, events: events };
  }

  function getAttackers(state, side) {
    const s = getSide(state, side);
    const out = [];
    if (!s.leader.attacked && !state.over) {
      out.push({ uid: 'leader', kind: 'leader', name: s.leader.name, power: effectivePower(s.leader), card: s.leader });
    }
    s.battle.forEach(function (card) {
      if (!card.rested && !card.summoningSick) {
        out.push({ uid: card.uid, kind: 'battle', name: card.name, power: effectivePower(card), card: card });
      }
    });
    return out;
  }

  function getValidTargets(state, side) {
    const enemy = getSide(state, otherSide(side));
    const out = [{ uid: 'leader', kind: 'leader', name: enemy.leader.name, power: effectivePower(enemy.leader), card: enemy.leader }];
    enemy.battle.forEach(function (card) {
      if (card.rested) {
        out.push({ uid: card.uid, kind: 'battle', name: card.name, power: effectivePower(card), card: card });
      }
    });
    return out;
  }

  function getBlockers(state, defenderSide) {
    const s = getSide(state, defenderSide);
    return s.battle.filter(function (card) {
      return !card.rested && card.keywords.indexOf('blocker') !== -1;
    });
  }

  function declareAttack(state, side, attackerUid, targetUid) {
    if (state.over) return { ok: false, error: 'Battle is over.' };
    if (state.active !== side || state.phase !== 'main') return { ok: false, error: 'You cannot attack right now.' };
    const s = getSide(state, side);
    const enemySide = otherSide(side);
    const enemy = getSide(state, enemySide);
    let attacker = null;
    if (attackerUid === 'leader') {
      if (s.leader.attacked) return { ok: false, error: 'Your Leader already attacked this turn.' };
      attacker = s.leader;
    } else {
      attacker = findBattleCard(s, attackerUid);
      if (!attacker) return { ok: false, error: 'Attacker not found.' };
      if (attacker.rested) return { ok: false, error: 'That card is rested.' };
      if (attacker.summoningSick) return { ok: false, error: 'That card cannot attack the turn it is played.' };
    }
    let target = null;
    if (targetUid === 'leader') {
      target = enemy.leader;
    } else {
      target = findBattleCard(enemy, targetUid);
      if (!target) return { ok: false, error: 'Target not found.' };
      if (!target.rested) return { ok: false, error: 'Only rested Battle Cards can be attacked.' };
    }
    const blockers = getBlockers(state, enemySide).filter(function (b) { return b.uid !== (target.cardType === 'battle' ? target.uid : ''); });
    const info = {
      id: 'atk' + (++state.nextAtk),
      attackerSide: side,
      attackerUid: attackerUid,
      targetSide: enemySide,
      targetUid: targetUid,
      attackerName: attacker.name,
      targetName: target.name,
      attackerPower: effectivePower(attacker),
      targetPower: effectivePower(target),
      blockerUid: null,
      blocked: false,
      doubleStrike: (attacker.keywords || []).indexOf('double') !== -1,
      possibleBlockers: blockers.map(function (b) { return { uid: b.uid, name: b.name, power: effectivePower(b), cost: b.cost }; })
    };
    return { ok: true, info: info, blockers: blockers };
  }

  function setBlocker(state, info, blockerUid) {
    if (!blockerUid) {
      info.blockerUid = null;
      info.blocked = false;
      return { ok: true, info: info };
    }
    const s = getSide(state, info.targetSide);
    const blocker = findBattleCard(s, blockerUid);
    if (!blocker) return { ok: false, error: 'Blocker not found.' };
    if (blocker.rested) return { ok: false, error: 'That Blocker is rested.' };
    if (blocker.keywords.indexOf('blocker') === -1) return { ok: false, error: 'That card is not a Blocker.' };
    info.blockerUid = blocker.uid;
    info.blocked = true;
    info.blockerName = blocker.name;
    info.targetPower = effectivePower(blocker);
    info.targetName = blocker.name;
    return { ok: true, info: info, blocker: blocker };
  }

  function collectCombo(state, side, uids, events) {
    if (!Array.isArray(uids) || !uids.length) return { bonus: 0, cards: [] };
    const s = getSide(state, side);
    const seen = new Set();
    const chosen = [];
    uids.forEach(function (uid) {
      if (seen.has(uid)) return;
      seen.add(uid);
      const idx = s.hand.findIndex(function (c) { return c.uid === uid; });
      if (idx >= 0) chosen.push(s.hand[idx]);
    });
    const cards = [];
    chosen.forEach(function (card) {
      const idx = s.hand.indexOf(card);
      if (idx >= 0) {
        s.hand.splice(idx, 1);
        s.drop.push(card);
        cards.push(card);
        events.push({ type: 'combo', side: side, card: card, value: card.combo });
      }
    });
    const bonus = cards.reduce(function (sum, c) { return sum + c.combo; }, 0);
    if (cards.length) {
      s.stats.combos += cards.length;
      log(state, sideLabel(side) + ' uses ' + cards.length + ' Combo Card' + (cards.length === 1 ? '' : 's') + ' (+' + fmt(bonus) + ').', 'combo');
    }
    return { bonus: bonus, cards: cards };
  }

  function damageLeader(state, defenderSide, amount, sourceSide) {
    const s = getSide(state, defenderSide);
    const events = [];
    const amountNum = Math.max(0, amount);
    for (let i = 0; i < amountNum; i++) {
      if (state.over) break;
      if (!s.life.length) {
        endGame(state, otherSide(defenderSide), 'life');
        events.push({ type: 'gameover', winner: state.winner, reason: state.reason });
        break;
      }
      const card = s.life.pop();
      const added = addToHand(state, defenderSide, card, defenderSide === 'player');
      s.stats.lifeLost += 1;
      s.stats.damageTaken += 1;
      if (sourceSide) getSide(state, sourceSide).stats.damageDealt += 1;
      log(state, sideLabel(defenderSide) + ' loses 1 Life (' + s.life.length + ' remaining).', 'damage');
      events.push({ type: 'life', side: defenderSide, card: card, life: s.life.length, added: added });
      if (!s.life.length) {
        endGame(state, otherSide(defenderSide), 'life');
        events.push({ type: 'gameover', winner: state.winner, reason: state.reason });
        break;
      }
    }
    if (!state.over) {
      events.push.apply(events, checkAwaken(state, defenderSide, sourceSide));
    }
    return events;
  }

  function checkAwaken(state, side, sourceSide) {
    const s = getSide(state, side);
    const events = [];
    if (s.leader.awakened) return events;
    if (s.life.length > 3) return events;
    s.leader.awakened = true;
    s.leader.power = s.leader.awakenPower;
    log(state, '⚡ ' + s.leader.name + ' AWAKENS! Leader power is now ' + fmt(s.leader.power) + '.', 'awaken');
    events.push({ type: 'awaken', side: side, leader: s.leader, power: s.leader.power });
    const ability = s.leader.awaken || {};
    if (ability.draw) {
      events.push.apply(events, drawCards(state, side, ability.draw));
    }
    if (ability.buffAll) {
      s.battle.forEach(function (c) { c.powerBonus += ability.buffAll; });
      log(state, sideLabel(side) + "'s Battle Cards gain +" + fmt(ability.buffAll) + ' power.', 'buff');
      events.push({ type: 'buff', side: side, amount: ability.buffAll, scope: 'all' });
    }
    if (ability.addLife) {
      events.push.apply(events, addLifeFromDeck(state, side, 'awaken'));
    }
    if (ability.koWeakest) {
      const enemy = getSide(state, otherSide(side));
      const candidates = enemy.battle.filter(function (c) { return effectivePower(c) <= ability.koWeakest; });
      candidates.sort(function (a, b) { return effectivePower(b) - effectivePower(a); });
      if (candidates.length) {
        log(state, s.leader.name + "'s awakening destroys " + candidates[0].name + '!', 'ko');
        events.push.apply(events, koCard(state, otherSide(side), candidates[0], side));
      }
    }
    return events;
  }

  function resolveAttack(state, info, attackComboUids, defenseComboUids) {
    if (state.over) return { ok: false, error: 'Battle is over.' };
    const attackerSide = info.attackerSide;
    const defenderSide = info.targetSide;
    const atkSide = getSide(state, attackerSide);
    const defSide = getSide(state, defenderSide);
    let attacker = info.attackerUid === 'leader' ? atkSide.leader : findBattleCard(atkSide, info.attackerUid);
    if (!attacker) return { ok: false, error: 'Attacker no longer exists.' };
    if (info.attackerUid === 'leader' && atkSide.leader.attacked) return { ok: false, error: 'Leader already attacked.' };
    if (info.attackerUid !== 'leader' && (attacker.rested || attacker.summoningSick)) return { ok: false, error: 'Attacker is not ready.' };

    let target = null;
    let blocker = null;
    if (info.blockerUid) {
      blocker = findBattleCard(defSide, info.blockerUid);
      if (!blocker || blocker.rested) return { ok: false, error: 'Blocker is no longer available.' };
      target = blocker;
    } else if (info.targetUid === 'leader') {
      target = defSide.leader;
    } else {
      target = findBattleCard(defSide, info.targetUid);
      if (!target) return { ok: false, error: 'Target no longer exists.' };
      if (!target.rested) return { ok: false, error: 'Target is no longer rested.' };
    }

    const events = [];
    const attackCombo = collectCombo(state, attackerSide, attackComboUids, events);
    const defenseCombo = collectCombo(state, defenderSide, defenseComboUids, events);
    const attackPower = effectivePower(attacker) + attackCombo.bonus;
    const targetPower = effectivePower(target) + defenseCombo.bonus;

    const isLeaderTarget = target.cardType === 'leader';
    const dmg = (info.doubleStrike ? 2 : 1);
    log(state, attacker.name + ' attacks ' + target.name + ' — ' + fmt(attackPower) + ' vs ' + fmt(targetPower) + '.', 'attack');

    events.push({
      type: 'attack', info: info, attackerSide: attackerSide, defenderSide: defenderSide,
      attackerName: attacker.name, targetName: target.name,
      attackPower: attackPower, targetPower: targetPower,
      attackCombo: attackCombo.cards.map(function (c) { return c.name; }),
      defenseCombo: defenseCombo.cards.map(function (c) { return c.name; }),
      isLeaderTarget: isLeaderTarget, damage: dmg
    });

    /* Rest the attacker and any blocker regardless of outcome. */
    if (info.attackerUid === 'leader') atkSide.leader.attacked = true;
    else attacker.rested = true;
    if (blocker) blocker.rested = true;

    if (attackPower > targetPower) {
      if (isLeaderTarget) {
        log(state, 'Attack connects! ' + fmt(attackPower - targetPower) + ' power over the Leader.', 'hit');
        events.push({ type: 'hit', side: defenderSide, amount: dmg });
        events.push.apply(events, damageLeader(state, defenderSide, dmg, attackerSide));
      } else {
        log(state, target.name + ' is overpowered and knocked out.', 'ko');
        events.push.apply(events, koCard(state, defenderSide, target, attackerSide));
      }
    } else {
      log(state, 'The attack is stopped. ' + target.name + ' holds the line.', 'block');
      events.push({ type: 'blocked', side: defenderSide, target: target });
    }
    return { ok: true, events: events, attackPower: attackPower, targetPower: targetPower, hit: attackPower > targetPower };
  }

  function endTurn(state) {
    if (state.over) return { ok: false, error: 'Battle is over.' };
    if (state.phase !== 'main' && state.phase !== 'charge') return { ok: false, error: 'Cannot end turn now.' };
    state.phase = 'ending';
    log(state, (state.active === 'player' ? 'You end your turn.' : state.ai.name + ' ends the turn.'), 'muted');
    const events = [{ type: 'endturn', side: state.active }];
    const next = otherSide(state.active);
    events.push.apply(events, startTurn(state, next));
    return { ok: true, events: events };
  }

  function forfeit(state, side) {
    if (state.over) return;
    endGame(state, otherSide(side), 'forfeit');
  }

  return {
    MAX_BATTLE, MAX_HAND, MAX_ENERGY,
    mulberry32, shuffle, otherSide, getSide, sideLabel, effectivePower, fmt,
    createBattle, mulligan, startTurn, chargeCard, skipCharge, playCard,
    getAttackers, getValidTargets, getBlockers, declareAttack, setBlocker, resolveAttack,
    endTurn, forfeit, endGame, drawCards, checkAwaken, damageLeader, koCard, log
  };
});
