/* Headless engine + AI simulation harness. */
const E = require('../js/engine.js');
const AI = require('../js/ai.js');

function comboSum(state, side, uids) {
  const s = E.getSide(state, side);
  return uids.reduce((sum, uid) => {
    const c = s.hand.find(x => x.uid === uid);
    return sum + (c ? c.combo : 0);
  }, 0);
}

function simulate(opts = {}) {
  const state = E.createBattle({
    seed: opts.seed == null ? 1 : opts.seed,
    stageId: opts.stageId || 'desert_duel',
    playerLeaderId: opts.playerLeaderId || 'goku'
  });
  const level = opts.level || state.stage.level || 3;
  const errors = [];
  const actions = [];

  // Mulligans
  try {
    const pMull = AI.chooseMulligan(state, 'player', level);
    const pRes = E.mulligan(state, 'player', pMull);
    if (!pRes.ok) errors.push('player mulligan: ' + pRes.error);
    const aMull = AI.chooseMulligan(state, 'ai', level);
    const aRes = E.mulligan(state, 'ai', aMull);
    if (!aRes.ok) errors.push('ai mulligan: ' + aRes.error);
  } catch (err) { errors.push('mulligan threw: ' + err.stack); }

  E.startTurn(state, 'player');

  let guard = 0;
  while (!state.over && guard < 1200) {
    guard++;
    const side = state.active;
    const lvl = opts.level || state.stage.level || 3;
    try {
      if (state.phase === 'charge') {
        const uid = AI.chooseCharge(state, side, lvl);
        const res = uid ? E.chargeCard(state, side, uid) : E.skipCharge(state, side);
        if (!res.ok) { errors.push('charge failed: ' + res.error); E.skipCharge(state, side); }
        actions.push({ side, type: 'charge' });
        continue;
      }
      if (state.phase === 'main') {
        const playUid = AI.choosePlay(state, side, lvl);
        if (playUid) {
          const res = E.playCard(state, side, playUid);
          if (!res.ok) { errors.push('play failed: ' + res.error); }
          actions.push({ side, type: 'play' });
          continue;
        }
        const atk = AI.chooseAttack(state, side, lvl);
        if (atk) {
          const decl = E.declareAttack(state, side, atk.attackerUid, atk.targetUid);
          if (!decl.ok) {
            errors.push('declare failed: ' + decl.error);
            E.endTurn(state);
            continue;
          }
          if (decl.blockers.length) {
            const block = AI.chooseBlocker(state, decl.info, lvl);
            if (block) {
              const br = E.setBlocker(state, decl.info, block);
              if (!br.ok) errors.push('blocker failed: ' + br.error);
            }
          }
          const atkCombos = AI.chooseAttackCombo(state, decl.info, lvl);
          const atkTotal = decl.info.attackerPower + comboSum(state, side, atkCombos);
          const defCombos = AI.chooseDefenseCombo(state, decl.info, atkTotal, lvl);
          const res = E.resolveAttack(state, decl.info, atkCombos, defCombos);
          if (!res.ok) errors.push('resolve failed: ' + res.error);
          actions.push({ side, type: 'attack', hit: res.hit });
          continue;
        }
        E.endTurn(state);
        actions.push({ side, type: 'end' });
        continue;
      }
      errors.push('unexpected phase ' + state.phase);
      break;
    } catch (err) {
      errors.push('turn threw: ' + err.stack);
      break;
    }
  }
  if (!state.over) errors.push('game did not finish in ' + guard + ' steps (phase=' + state.phase + ', turn=' + state.turn + ')');
  return { state, errors, actions, guard };
}

module.exports = { simulate, comboSum };

if (require.main === module) {
  let failures = 0;
  const leaders = ['goku', 'vegeta', 'piccolo', 'frieza'];
  const stages = E ? require('../js/data.js').STAGES.map(s => s.id) : [];
  let total = 0;
  for (const stage of stages) {
    for (const leader of leaders) {
      for (let seed = 1; seed <= 12; seed++) {
        total++;
        const r = simulate({ stageId: stage, playerLeaderId: leader, seed });
        if (r.errors.length) {
          failures++;
          console.log(`FAIL stage=${stage} leader=${leader} seed=${seed}`);
          console.log(r.errors.slice(0, 3).join('\n'));
          console.log('phase', r.state.phase, 'turn', r.state.turn, 'winner', r.state.winner, 'guard', r.guard);
          console.log('log tail:', r.state.log.slice(-8).map(x => x.text).join(' | '));
        }
      }
    }
  }
  console.log(`\n${total - failures}/${total} simulations completed cleanly.`);
  process.exit(failures ? 1 : 0);
}
