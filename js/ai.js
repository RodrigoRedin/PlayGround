/* Dragon Ball: Fusion World — opponent AI.
 * Heuristics are deterministic per seed and scale with stage level (1-6).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'), require('./data.js'));
  else root.DBFW_AI = factory(root.DBFW_ENGINE, root.DBFW_DATA);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ENGINE, DATA) {
  'use strict';

  const E = ENGINE;

  function sideOf(state, side) { return E.getSide(state, side); }
  function other(side) { return side === 'player' ? 'ai' : 'player'; }
  function rng(state) { return state.rng(); }

  function effectValue(card) {
    const on = (card.effects && card.effects.onPlay) || [];
    let v = 0;
    on.forEach(function (fx) {
      if (fx.draw) v += 2.2 * fx.draw;
      if (fx.buffSelf) v += fx.buffSelf / 10000;
      if (fx.buffAll) v += fx.buffAll / 7000;
      if (fx.addLife) v += 2.4;
      if (fx.koWeakest) v += 2.8;
    });
    return v;
  }

  function keepScore(card) {
    let v = card.power / 6000 + card.combo / 7000 + effectValue(card);
    if (card.cost <= 2) v += 1.6;
    if (card.keywords.indexOf('blocker') !== -1) v += 1.3;
    if (card.keywords.indexOf('rush') !== -1) v += 1.3;
    if (card.keywords.indexOf('double') !== -1) v += 1.1;
    v -= card.cost * 0.22;
    return v;
  }

  function fodderScore(card) {
    /* Lower is more expendable as combo material. */
    let v = card.power / 5000 + card.combo / 5000 + effectValue(card) * 1.6;
    if (card.keywords.indexOf('blocker') !== -1) v += 1.4;
    if (card.keywords.indexOf('rush') !== -1) v += 0.9;
    if (card.keywords.indexOf('double') !== -1) v += 0.8;
    return v;
  }

  function comboCardsFor(state, side) {
    const s = sideOf(state, side);
    return s.hand.slice().sort(function (a, b) {
      const fa = fodderScore(a), fb = fodderScore(b);
      if (fa !== fb) return fa - fb;
      return b.combo - a.combo;
    });
  }

  function allSubsets(cards, maxCards) {
    const out = [];
    const n = cards.length;
    const total = 1 << n;
    for (let mask = 1; mask < total; mask++) {
      const pick = [];
      let count = 0;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) { pick.push(cards[i]); count++; }
      }
      if (count <= maxCards) out.push(pick);
    }
    return out;
  }

  function bestComboSubset(state, side, need, maxCards, lethal) {
    if (need <= 0) return [];
    const cards = comboCardsFor(state, side);
    if (!cards.length) return [];
    const subsets = allSubsets(cards, Math.min(maxCards, cards.length));
    let best = null;
    let bestScore = Infinity;
    let bestCombo = -1;
    subsets.forEach(function (pick) {
      const combo = pick.reduce(function (sum, c) { return sum + c.combo; }, 0);
      if (combo < need) return;
      let score = pick.reduce(function (sum, c) { return sum + fodderScore(c); }, 0) + pick.length * 0.25;
      if (lethal) score -= combo / 12000; /* prefer a bigger wall when a hit would end the game */
      if (score < bestScore - 1e-9) { bestScore = score; best = pick; bestCombo = combo; }
    });
    if (best) return best.map(function (c) { return c.uid; });
    /* Not enough to fully stop it: commit only when the next hit loses the game. */
    if (lethal) {
      const sorted = cards.slice().sort(function (a, b) { return b.combo - a.combo; });
      let sum = 0;
      const pick = [];
      for (let i = 0; i < sorted.length && pick.length < maxCards; i++) {
        pick.push(sorted[i]); sum += sorted[i].combo;
      }
      if (sum > 0) return pick.map(function (c) { return c.uid; });
    }
    return [];
  }

  function chooseMulligan(state, side, level) {
    const s = sideOf(state, side);
    if (s.mulliganUsed) return [];
    const cards = s.hand.slice().sort(function (a, b) { return keepScore(a) - keepScore(b); });
    const maxReplace = level >= 5 ? 4 : level >= 3 ? 3 : 2;
    const replace = [];
    let cheapKept = 0;
    cards.forEach(function (card) {
      if (replace.length >= maxReplace) return;
      const isCheap = card.cost <= 2;
      if (keepScore(card) < 4.1 || card.cost >= 5) {
        if (isCheap && cheapKept < 1) { cheapKept++; return; }
        replace.push(card.uid);
      }
    });
    if (!replace.length && level <= 2) return [];
    return replace;
  }

  function chooseCharge(state, side, level) {
    const s = sideOf(state, side);
    if (s.energy.max >= E.MAX_ENERGY || !s.hand.length) return null;
    const cards = s.hand.slice().sort(function (a, b) {
      const va = keepScore(a) - (a.cost > s.energy.max + 1 ? 1.5 : 0);
      const vb = keepScore(b) - (b.cost > s.energy.max + 1 ? 1.5 : 0);
      return va - vb;
    });
    if (level <= 1 && cards.length > 2 && rng(state) < 0.22) return cards[cards.length - 1].uid;
    return cards[0].uid;
  }

  function choosePlay(state, side, level) {
    const s = sideOf(state, side);
    if (s.battle.length >= E.MAX_BATTLE) return null;
    const affordable = s.hand.filter(function (c) { return c.cost <= s.energy.active; });
    if (!affordable.length) return null;
    const scored = affordable.map(function (card) {
      let score = card.power / 6000 + card.combo / 7000 + effectValue(card);
      if (card.keywords.indexOf('rush') !== -1) score += 2.2;
      if (card.keywords.indexOf('blocker') !== -1) score += s.life.length <= 3 ? 2.3 : 1.1;
      if (card.keywords.indexOf('double') !== -1) score += 0.9;
      score += card.cost <= s.energy.active ? 0.15 : 0;
      score += (rng(state) - 0.5) * (level <= 2 ? 1.4 : 0.2);
      return { card: card, score: score };
    }).sort(function (a, b) { return b.score - a.score; });
    if (level <= 1 && scored.length > 2 && rng(state) < 0.12) {
      return scored[1].card.uid;
    }
    return scored[0].card.uid;
  }

  function powerOf(state, side, uid) {
    if (uid === 'leader') return E.effectivePower(sideOf(state, side).leader);
    const s = sideOf(state, side);
    const c = s.battle.find(function (x) { return x.uid === uid; });
    return c ? E.effectivePower(c) : 0;
  }

  function chooseAttack(state, side, level) {
    const s = sideOf(state, side);
    const enemySide = other(side);
    const enemy = sideOf(state, enemySide);
    const attackers = E.getAttackers(state, side);
    if (!attackers.length) return null;
    const targets = E.getValidTargets(state, side);
    const blockers = E.getBlockers(state, enemySide);
    const bestBlocker = blockers.reduce(function (m, b) { return Math.max(m, E.effectivePower(b)); }, 0);
    const hand = s.hand;
    const maxComboCards = level >= 5 ? 4 : level >= 3 ? 3 : level >= 2 ? 2 : 1;
    const maxCombo = comboCardsFor(state, side)
      .slice(0, maxComboCards)
      .reduce(function (sum, c) { return sum + c.combo; }, 0);

    let best = null;
    attackers.forEach(function (att) {
      targets.forEach(function (tgt) {
        const base = att.power;
        const targetPower = tgt.power;
        const isLeader = tgt.kind === 'leader';
        const canBase = base > targetPower;
        const canCombo = base + maxCombo > targetPower;
        let value = 0;

        if (isLeader) {
          const dmg = (att.card.keywords || []).indexOf('double') !== -1 ? 2 : 1;
          if (canBase) {
            value = 12 + dmg * 4;
            if (enemy.life.length <= 1) value += 55;
            else if (enemy.life.length <= 2) value += 12;
            if (enemy.leader.awakened) value += 1.5;
          } else if (canCombo && level >= 2) {
            value = 6 + dmg * 2;
            if (enemy.life.length <= 1) value += 45;
            else if (enemy.life.length <= 2) value += 9;
            value -= maxComboCards * 0.9;
          } else {
            value = 0.4;
          }
          if (blockers.length) {
            const total = base + maxCombo;
            if (total <= bestBlocker) value -= 7;
            else if (base <= bestBlocker) value -= 2.5;
            else value += 2.5; /* forces a blocker to rest or trade */
          }
        } else {
          if (canBase) {
            value = 8 + targetPower / 10000 * 2.2 + (tgt.card.cost || 0) * 1.6;
            if ((tgt.card.keywords || []).indexOf('blocker') !== -1) value += 3.5;
            if ((tgt.card.keywords || []).indexOf('double') !== -1) value += 1.5;
            if (att.power - targetPower > 15000) value -= 1.2; /* overkill */
          } else if (canCombo && level >= 4) {
            value = 3.2 + targetPower / 12000 + (tgt.card.cost || 0) * 1.1;
            if ((tgt.card.keywords || []).indexOf('blocker') !== -1) value += 2.4;
            value -= 1.6;
          }
        }

        if ((att.card.keywords || []).indexOf('blocker') !== -1) {
          value -= s.life.length <= 2 ? 6 : 3.2;
        }
        if (att.kind === 'leader' && s.life.length <= 2) value -= 1;
        if (level <= 1) value += (rng(state) - 0.5) * 2.2;
        if (value > 0 && (!best || value > best.value)) {
          best = { attackerUid: att.uid, targetUid: tgt.uid, value: value, isLeader: isLeader };
        }
      });
    });
    if (!best) return null;
    if (best.value < (level <= 1 ? 1.2 : 0.65)) return null;
    if (level <= 1 && rng(state) < 0.16) return null;
    return { attackerUid: best.attackerUid, targetUid: best.targetUid };
  }

  function chooseAttackCombo(state, info, level) {
    const attackerSide = info.attackerSide;
    const attacker = info.attackerUid === 'leader'
      ? sideOf(state, attackerSide).leader
      : sideOf(state, attackerSide).battle.find(function (c) { return c.uid === info.attackerUid; });
    if (!attacker) return [];
    const defender = sideOf(state, info.targetSide);
    let targetPower;
    if (info.blockerUid) {
      const blocker = defender.battle.find(function (c) { return c.uid === info.blockerUid; });
      targetPower = blocker ? E.effectivePower(blocker) : info.targetPower;
    } else if (info.targetUid === 'leader') {
      targetPower = E.effectivePower(defender.leader);
    } else {
      const target = defender.battle.find(function (c) { return c.uid === info.targetUid; });
      targetPower = target ? E.effectivePower(target) : info.targetPower;
    }
    const base = E.effectivePower(attacker);
    if (base > targetPower) return [];
    const isLeader = !info.blockerUid && info.targetUid === 'leader';
    const need = targetPower - base + 1;
    const maxCards = level >= 5 ? 5 : level >= 3 ? 3 : level >= 2 ? 2 : 1;
    if (!isLeader) {
      if (level < 3) return [];
      const target = defender.battle.find(function (c) { return c.uid === (info.blockerUid || info.targetUid); });
      const value = target ? (target.power / 10000 + target.cost) : 2;
      if (value < 3 && level < 5) return [];
      return bestComboSubset(state, attackerSide, need, Math.min(maxCards, 2), false);
    }
    const lethal = defender.life.length <= 1;
    let buffer = 0;
    if (defender.hand.length && level >= 4) buffer = 5000;
    if (!lethal && level <= 1 && need > 0) return bestComboSubset(state, attackerSide, need, 1, false);
    return bestComboSubset(state, attackerSide, need + buffer, maxCards, lethal);
  }

  function chooseDefenseCombo(state, info, attackPower, level) {
    const defenderSide = info.targetSide;
    const s = sideOf(state, defenderSide);
    let target;
    if (info.blockerUid) {
      target = s.battle.find(function (c) { return c.uid === info.blockerUid; });
    } else if (info.targetUid === 'leader') {
      target = s.leader;
    } else {
      target = s.battle.find(function (c) { return c.uid === info.targetUid; });
    }
    if (!target) return [];
    const targetPower = E.effectivePower(target);
    const need = attackPower - targetPower;
    if (need <= 0) return [];
    const isLeader = target.cardType === 'leader';
    const lethal = isLeader && s.life.length <= 1;

    if (isLeader) {
      if (level <= 1 && !lethal && need > 5000) return [];
      const maxCards = lethal ? 6 : level >= 4 ? 3 : 2;
      const subset = bestComboSubset(state, defenderSide, need, maxCards, lethal);
      if (!subset.length) return [];
      if (!lethal && level <= 2) {
        const cards = subset.map(function (uid) { return s.hand.find(function (c) { return c.uid === uid; }); }).filter(Boolean);
        const cost = cards.reduce(function (sum, c) { return sum + fodderScore(c); }, 0);
        if (cost > (s.life.length <= 2 ? 6 : 3.4)) return [];
      }
      return subset;
    }

    if (level < 3) return [];
    const targetValue = target.power / 10000 + target.cost + ((target.keywords || []).indexOf('blocker') !== -1 ? 1.5 : 0);
    if (targetValue < 4.5 && s.life.length > 2) return [];
    const subset = bestComboSubset(state, defenderSide, need, 2, false);
    return subset;
  }

  function chooseBlocker(state, info, level) {
    const defenderSide = info.targetSide;
    const s = sideOf(state, defenderSide);
    const blockers = s.battle.filter(function (c) {
      return !c.rested && c.keywords.indexOf('blocker') !== -1;
    });
    if (!blockers.length) return null;
    const isLeaderTarget = !info.blockerUid && info.targetUid === 'leader';
    const attackPower = info.attackerPower;
    const life = s.life.length;

    if (isLeaderTarget) {
      if (life <= 1) {
        return blockers.slice().sort(function (a, b) { return E.effectivePower(b) - E.effectivePower(a); })[0].uid;
      }
      if (level <= 1 && life > 2 && rng(state) < 0.5) return null;
      /* Prefer a blocker that survives and is cheap. */
      const survivors = blockers.filter(function (b) { return E.effectivePower(b) >= attackPower; });
      if (survivors.length) {
        survivors.sort(function (a, b) { return E.effectivePower(a) - E.effectivePower(b) || a.cost - b.cost; });
        return survivors[0].uid;
      }
      /* It will die, but it still soaks the attack. */
      if (life <= 2 || level >= 3) {
        const cheap = blockers.slice().sort(function (a, b) { return a.cost - b.cost || E.effectivePower(b) - E.effectivePower(a); });
        return cheap[0].uid;
      }
      return null;
    }

    if (level < 3) return null;
    const target = s.battle.find(function (c) { return c.uid === info.targetUid; });
    if (!target) return null;
    const survivors = blockers.filter(function (b) { return E.effectivePower(b) >= attackPower; });
    if (!survivors.length) return null;
    if (target.power >= 20000 || target.cost >= 4) {
      survivors.sort(function (a, b) { return E.effectivePower(a) - E.effectivePower(b); });
      return survivors[0].uid;
    }
    return null;
  }

  return {
    keepScore, fodderScore, effectValue,
    chooseMulligan, chooseCharge, choosePlay, chooseAttack,
    chooseAttackCombo, chooseDefenseCombo, chooseBlocker, bestComboSubset
  };
});
