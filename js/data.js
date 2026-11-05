/* Dragon Ball: Fusion World — fan-made single-player card battler.
 * Card definitions, leaders, stages and fixed deck recipes.
 * Plain browser script + CommonJS export so the rules can be tested in Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DBFW_DATA = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FACTIONS = {
    saiyan: { name: 'Saiyan', color: '#ff7a18', soft: '#ffb15c', deep: '#3a1600', symbol: '火' },
    frieza: { name: 'Frieza Force', color: '#b46bff', soft: '#d8b4ff', deep: '#250d3d', symbol: 'Ω' },
    android: { name: 'Android', color: '#35e08d', soft: '#9dffd0', deep: '#052a1c', symbol: '∞' },
    buu: { name: 'Majin', color: '#ff5fa2', soft: '#ffb3d0', deep: '#350a1d', symbol: 'M' },
    god: { name: 'Divine', color: '#8f8bff', soft: '#c9c7ff', deep: '#14103a', symbol: '✦' }
  };

  const KEYWORDS = {
    blocker: { name: 'Blocker', short: 'BLK', icon: '⛨', help: 'Rest this card to redirect an attack to itself.' },
    rush: { name: 'Rush', short: 'RSH', icon: '»', help: 'This card can attack the turn it is played.' },
    double: { name: 'Double Strike', short: '2X', icon: '✦', help: 'Deals 2 life damage instead of 1 when it hits a leader.' }
  };

  const CARDS = {
    /* ---------- Neutral / core ---------- */
    martial_artist: {
      id: 'martial_artist', name: 'Martial Artist', faction: 'saiyan', cost: 1, power: 5000, combo: 5000,
      art: 'martial_artist', flavor: 'Every legend starts with a stance.'
    },
    ki_blast: {
      id: 'ki_blast', name: 'Ki Blast', faction: 'saiyan', cost: 1, power: 5000, combo: 10000,
      art: 'ki_blast', flavor: 'A focused mind is a weapon.'
    },
    flying_kick: {
      id: 'flying_kick', name: 'Flying Kick', faction: 'saiyan', cost: 2, power: 10000, combo: 5000,
      art: 'flying_kick', flavor: 'Momentum is everything.'
    },
    guard_stance: {
      id: 'guard_stance', name: 'Guard Stance', faction: 'saiyan', cost: 2, power: 5000, combo: 5000,
      keywords: ['blocker'], art: 'guard_stance', flavor: 'Hold the line.'
    },
    scouter: {
      id: 'scouter', name: 'Scouter', faction: 'frieza', cost: 2, power: 5000, combo: 5000,
      art: 'scouter', effects: { onPlay: [{ draw: 1 }] }, text: 'When Played: Draw 1 card.',
      flavor: 'Knowledge wins battles before they begin.'
    },
    training_partner: {
      id: 'training_partner', name: 'Training Partner', faction: 'saiyan', cost: 3, power: 15000, combo: 5000,
      art: 'krillin', flavor: 'A rival makes you stronger.'
    },
    power_surge: {
      id: 'power_surge', name: 'Power Surge', faction: 'saiyan', cost: 3, power: 10000, combo: 10000,
      art: 'power_surge', effects: { onPlay: [{ buffSelf: 5000 }] },
      text: 'When Played: This card gains +5000 power.', flavor: 'The air itself begins to tremble.'
    },
    battle_veteran: {
      id: 'battle_veteran', name: 'Battle Veteran', faction: 'saiyan', cost: 4, power: 20000, combo: 5000,
      art: 'yamcha', flavor: 'Experience is written in scars.'
    },
    elite_warrior: {
      id: 'elite_warrior', name: 'Elite Warrior', faction: 'saiyan', cost: 5, power: 25000, combo: 5000,
      art: 'vegeta', flavor: 'Elite blood does not kneel.'
    },
    fusion_warrior: {
      id: 'fusion_warrior', name: 'Fusion Warrior', faction: 'saiyan', cost: 6, power: 30000, combo: 10000,
      art: 'gogeta', flavor: 'Two souls. One perfect warrior.'
    },

    /* ---------- Saiyan ---------- */
    goku_defender: {
      id: 'goku_defender', name: "Goku, Earth's Defender", faction: 'saiyan', cost: 4, power: 20000, combo: 10000,
      art: 'goku', effects: { onPlay: [{ draw: 1 }] }, text: 'When Played: Draw 1 card.',
      flavor: 'I will protect this world. That is my promise.'
    },
    vegeta_prince: {
      id: 'vegeta_prince', name: 'Vegeta, Proud Prince', faction: 'saiyan', cost: 3, power: 15000, combo: 10000,
      keywords: ['rush'], art: 'vegeta', text: '[Rush] This card can attack the turn it is played.',
      flavor: 'You are not dealing with an ordinary Saiyan.'
    },
    gohan_hidden: {
      id: 'gohan_hidden', name: 'Gohan, Hidden Power', faction: 'saiyan', cost: 5, power: 25000, combo: 5000,
      art: 'gohan', effects: { onPlay: [{ ifLifeAtMost: 3, buffSelf: 5000 }] },
      text: 'When Played: If your life is 3 or less, this card gains +5000 power.',
      flavor: 'Do not make him angry.'
    },
    piccolo_guardian: {
      id: 'piccolo_guardian', name: 'Piccolo, Namekian Guardian', faction: 'saiyan', cost: 3, power: 10000, combo: 10000,
      keywords: ['blocker'], art: 'piccolo', text: '[Blocker] Rest this card to redirect an attack to itself.',
      flavor: 'A guardian stands between danger and the innocent.'
    },
    krillin_fearless: {
      id: 'krillin_fearless', name: 'Krillin, Fearless Fighter', faction: 'saiyan', cost: 2, power: 10000, combo: 10000,
      art: 'krillin', flavor: 'No fancy tricks. Just courage.'
    },
    trunks_future: {
      id: 'trunks_future', name: 'Trunks, Future Warrior', faction: 'saiyan', cost: 4, power: 20000, combo: 5000,
      keywords: ['rush'], art: 'trunks', text: '[Rush] This card can attack the turn it is played.',
      flavor: 'The future is worth fighting for.'
    },
    spirit_bomb: {
      id: 'spirit_bomb', name: 'Spirit Bomb', faction: 'saiyan', cost: 7, power: 40000, combo: 10000,
      art: 'spirit_bomb', flavor: 'Lend me your energy!'
    },
    ssj_goku: {
      id: 'ssj_goku', name: 'Goku, Super Saiyan', faction: 'saiyan', cost: 5, power: 30000, combo: 5000,
      art: 'goku_gold', flavor: 'His hair burns gold with righteous fury.'
    },
    ultimate_gohan: {
      id: 'ultimate_gohan', name: 'Gohan, Ultimate Warrior', faction: 'saiyan', cost: 6, power: 35000, combo: 10000,
      art: 'gohan_gold', flavor: 'Potential, fully realized.'
    },

    /* ---------- Frieza Force ---------- */
    frieza_soldier: {
      id: 'frieza_soldier', name: 'Frieza Soldier', faction: 'frieza', cost: 1, power: 5000, combo: 5000,
      art: 'frieza_soldier', flavor: 'Expendable, and fully aware of it.'
    },
    dodoria: {
      id: 'dodoria', name: 'Dodoria', faction: 'frieza', cost: 2, power: 10000, combo: 10000,
      art: 'dodoria', flavor: 'Brute force, no subtlety.'
    },
    zarbon: {
      id: 'zarbon', name: 'Zarbon', faction: 'frieza', cost: 3, power: 15000, combo: 5000,
      art: 'zarbon', flavor: 'Beauty before brutality.'
    },
    sorbet: {
      id: 'sorbet', name: 'Sorbet', faction: 'frieza', cost: 2, power: 5000, combo: 5000,
      keywords: ['blocker'], art: 'sorbet', text: '[Blocker] Rest this card to redirect an attack to itself.',
      flavor: 'A commander with a steady hand.'
    },
    ginyu: {
      id: 'ginyu', name: 'Captain Ginyu', faction: 'frieza', cost: 4, power: 20000, combo: 10000,
      art: 'ginyu', effects: { onPlay: [{ draw: 1 }] }, text: 'When Played: Draw 1 card.',
      flavor: 'The Ginyu Force strikes a pose!'
    },
    third_form_frieza: {
      id: 'third_form_frieza', name: 'Frieza, Third Form', faction: 'frieza', cost: 5, power: 25000, combo: 5000,
      art: 'frieza3', flavor: 'A nightmare with a pleasant smile.'
    },
    frieza_emperor: {
      id: 'frieza_emperor', name: 'Frieza, Emperor of Evil', faction: 'frieza', cost: 6, power: 30000, combo: 10000,
      art: 'frieza', flavor: 'The universe bends to his whim.'
    },
    golden_frieza: {
      id: 'golden_frieza', name: 'Golden Frieza', faction: 'frieza', cost: 7, power: 40000, combo: 10000,
      art: 'frieza_gold', flavor: 'A golden god of destruction.'
    },

    /* ---------- Androids / Cell ---------- */
    android17: {
      id: 'android17', name: 'Android 17', faction: 'android', cost: 4, power: 20000, combo: 5000,
      art: 'a17', flavor: 'He fights for the fun of it.'
    },
    android18: {
      id: 'android18', name: 'Android 18', faction: 'android', cost: 3, power: 15000, combo: 5000,
      keywords: ['blocker'], art: 'a18', text: '[Blocker] Rest this card to redirect an attack to itself.',
      flavor: 'Cold precision, perfect grace.'
    },
    cell_jr: {
      id: 'cell_jr', name: 'Cell Jr.', faction: 'android', cost: 2, power: 10000, combo: 10000,
      art: 'celljr', flavor: 'Small, vicious, and everywhere.'
    },
    imperfect_cell: {
      id: 'imperfect_cell', name: 'Imperfect Cell', faction: 'android', cost: 4, power: 20000, combo: 10000,
      art: 'cell', flavor: 'The hunt has begun.'
    },
    android16: {
      id: 'android16', name: 'Android 16', faction: 'android', cost: 5, power: 25000, combo: 5000,
      keywords: ['blocker'], art: 'a16', text: '[Blocker] Rest this card to redirect an attack to itself.',
      flavor: 'Protecting life is the only mission.'
    },
    cell: {
      id: 'cell', name: 'Cell', faction: 'android', cost: 6, power: 30000, combo: 10000,
      art: 'cell', effects: { onPlay: [{ draw: 1 }] }, text: 'When Played: Draw 1 card.',
      flavor: 'Perfection is only a matter of time.'
    },
    perfect_cell: {
      id: 'perfect_cell', name: 'Perfect Cell', faction: 'android', cost: 7, power: 40000, combo: 10000,
      art: 'cell_perfect', flavor: 'I am the perfect being.'
    },

    /* ---------- Majin ---------- */
    babidi: {
      id: 'babidi', name: 'Babidi', faction: 'buu', cost: 1, power: 5000, combo: 5000,
      art: 'babidi', effects: { onPlay: [{ draw: 1 }] }, text: 'When Played: Draw 1 card.',
      flavor: 'A small mind with grand ambitions.'
    },
    kid_buu: {
      id: 'kid_buu', name: 'Kid Buu', faction: 'buu', cost: 3, power: 15000, combo: 10000,
      art: 'kidbuu', flavor: 'Chaos given form.'
    },
    dabura: {
      id: 'dabura', name: 'Dabura', faction: 'buu', cost: 4, power: 20000, combo: 5000,
      art: 'dabura', flavor: 'The Demon King obeys no one.'
    },
    majin_buu: {
      id: 'majin_buu', name: 'Majin Buu', faction: 'buu', cost: 5, power: 25000, combo: 10000,
      art: 'buu', effects: { onPlay: [{ draw: 1 }] }, text: 'When Played: Draw 1 card.',
      flavor: 'Buu wants candy!'
    },
    super_buu: {
      id: 'super_buu', name: 'Super Buu', faction: 'buu', cost: 7, power: 40000, combo: 5000,
      art: 'superbuu', flavor: 'The most terrifying version of himself.'
    },

    /* ---------- Divine ---------- */
    vados: {
      id: 'vados', name: 'Vados', faction: 'god', cost: 4, power: 15000, combo: 10000,
      keywords: ['blocker'], art: 'vados', text: '[Blocker] Rest this card to redirect an attack to itself.',
      flavor: 'Calm as the void between stars.'
    },
    whis: {
      id: 'whis', name: 'Whis', faction: 'god', cost: 5, power: 20000, combo: 10000,
      keywords: ['blocker'], art: 'whis', text: '[Blocker] Rest this card to redirect an attack to itself.',
      flavor: 'Do try to keep up.'
    },
    champa: {
      id: 'champa', name: 'Champa', faction: 'god', cost: 6, power: 30000, combo: 5000,
      art: 'champa', effects: { onPlay: [{ draw: 1 }] }, text: 'When Played: Draw 1 card.',
      flavor: 'A god with a very large appetite.'
    },
    beerus: {
      id: 'beerus', name: 'Beerus, God of Destruction', faction: 'god', cost: 7, power: 45000, combo: 10000,
      art: 'beerus', flavor: 'Destruction is not personal. It is inevitable.'
    },
    goku_ui: {
      id: 'goku_ui', name: 'Goku, Ultra Instinct', faction: 'god', cost: 6, power: 35000, combo: 10000,
      art: 'goku_ui', flavor: 'The body moves before the thought.'
    },

    /* ---------- Signature techniques ---------- */
    final_flash: {
      id: 'final_flash', name: 'Final Flash', faction: 'saiyan', cost: 2, power: 5000, combo: 10000,
      keywords: ['double'], art: 'final_flash', text: '[Double Strike] Deals 2 life damage when it hits a leader.',
      flavor: 'A planet-killing beam, delivered with a smirk.'
    },
    destructo_disc: {
      id: 'destructo_disc', name: 'Destructo Disc', faction: 'saiyan', cost: 3, power: 15000, combo: 5000,
      keywords: ['double'], art: 'destructo_disc', text: '[Double Strike] Deals 2 life damage when it hits a leader.',
      flavor: 'It cuts through anything.'
    },
    death_beam: {
      id: 'death_beam', name: 'Death Beam', faction: 'frieza', cost: 1, power: 5000, combo: 5000,
      keywords: ['double'], art: 'death_beam', text: '[Double Strike] Deals 2 life damage when it hits a leader.',
      flavor: 'A pinpoint of lethal light.'
    },
    special_beam_cannon: {
      id: 'special_beam_cannon', name: 'Special Beam Cannon', faction: 'saiyan', cost: 5, power: 20000, combo: 10000,
      keywords: ['double'], art: 'special_beam', text: '[Double Strike] Deals 2 life damage when it hits a leader.',
      flavor: 'Two fingers. One devastating drill.'
    }
  };

  /* Fill in defaults + derive missing rules text. */
  Object.values(CARDS).forEach(function (card) {
    card.keywords = card.keywords || [];
    card.effects = card.effects || {};
    const bits = [];
    card.keywords.forEach(function (k) {
      const kw = KEYWORDS[k];
      if (k === 'blocker') bits.push('[Blocker] Rest to redirect an attack.');
      if (k === 'rush') bits.push('[Rush] Can attack the turn it is played.');
      if (k === 'double') bits.push('[Double Strike] Deals 2 life damage.');
    });
    if (card.text) bits.unshift(card.text);
    card.rules = bits.join(' ');
    card.combo = card.combo == null ? 5000 : card.combo;
  });

  const LEADERS = {
    goku: {
      id: 'goku', name: 'Goku', title: "Earth's Strongest", faction: 'saiyan', art: 'goku',
      power: 10000, awakenPower: 15000, life: 5,
      awaken: { draw: 1 }, awakenText: 'Awaken: Draw 1 card.',
      style: 'Balanced', quote: "I'm just getting warmed up!",
      blurb: 'A flexible fighter. Draw a card when you awaken and keep the pressure on.',
      deck: 'goku'
    },
    vegeta: {
      id: 'vegeta', name: 'Vegeta', title: 'Prince of Saiyans', faction: 'saiyan', art: 'vegeta',
      power: 10000, awakenPower: 15000, life: 5,
      awaken: { buffAll: 5000 }, awakenText: 'Awaken: Your Battle Cards gain +5000 power.',
      style: 'Aggressive', quote: 'I am the prince of all Saiyans!',
      blurb: 'An all-out attacker. Awaken to turn your whole board into a threat.',
      deck: 'vegeta'
    },
    piccolo: {
      id: 'piccolo', name: 'Piccolo', title: 'Namekian Guardian', faction: 'saiyan', art: 'piccolo',
      power: 10000, awakenPower: 15000, life: 5,
      awaken: { addLife: 1 }, awakenText: 'Awaken: Add the top card of your deck to your Life.',
      style: 'Defensive', quote: 'Your arrogance will be your undoing.',
      blurb: 'A patient tactician. Powerful Blockers and an extra life when you awaken.',
      deck: 'piccolo'
    },
    frieza: {
      id: 'frieza', name: 'Frieza', title: 'Emperor of Evil', faction: 'frieza', art: 'frieza',
      power: 10000, awakenPower: 15000, life: 5,
      awaken: { koWeakest: 15000 }, awakenText: 'Awaken: KO an enemy Battle Card with 15,000 power or less.',
      style: 'Control', quote: 'You will learn the meaning of despair.',
      blurb: 'Ruthless control. Awaken to erase an enemy Battle Card from the board.',
      deck: 'frieza', unlockAfter: 3
    },
    yamcha: {
      id: 'yamcha', name: 'Yamcha', title: 'Desert Bandit', faction: 'saiyan', art: 'yamcha',
      power: 10000, awakenPower: 15000, life: 5,
      awaken: { draw: 1 }, awakenText: 'Awaken: Draw 1 card.',
      style: 'Rookie', quote: 'This time I will not lose!', opponentOnly: true
    },
    android18: {
      id: 'android18', name: 'Android 18', title: 'Infinite Energy', faction: 'android', art: 'a18',
      power: 10000, awakenPower: 15000, life: 5,
      awaken: { draw: 1 }, awakenText: 'Awaken: Draw 1 card.',
      style: 'Advanced', quote: 'You are already finished.', opponentOnly: true
    },
    cell: {
      id: 'cell', name: 'Cell', title: 'Perfect Being', faction: 'android', art: 'cell_perfect',
      power: 10000, awakenPower: 20000, life: 5,
      awaken: { addLife: 1 }, awakenText: 'Awaken: Add the top card of your deck to your Life.',
      style: 'Expert', quote: 'Let the games begin.', opponentOnly: true
    },
    buu: {
      id: 'buu', name: 'Majin Buu', title: 'Ancient Horror', faction: 'buu', art: 'buu',
      power: 10000, awakenPower: 20000, life: 5,
      awaken: { addLife: 1 }, awakenText: 'Awaken: Add the top card of your deck to your Life.',
      style: 'Master', quote: 'Buu will turn you into chocolate!', opponentOnly: true
    },
    beerus: {
      id: 'beerus', name: 'Beerus', title: 'God of Destruction', faction: 'god', art: 'beerus',
      power: 15000, awakenPower: 25000, life: 6,
      awaken: { koWeakest: 15000 }, awakenText: 'Awaken: KO an enemy Battle Card with 15,000 power or less.',
      style: 'Godly', quote: 'Show me something worth remembering.', opponentOnly: true
    }
  };

  /* ------------------------------------------------------------------ *
   * Fixed 50-card decks. Every recipe is validated by the test suite.
   * ------------------------------------------------------------------ */
  const DECKS = {
    goku: [
      ['martial_artist', 4], ['ki_blast', 4], ['flying_kick', 4], ['final_flash', 2],
      ['scouter', 3], ['training_partner', 4], ['power_surge', 3], ['battle_veteran', 3],
      ['elite_warrior', 3], ['goku_defender', 4], ['gohan_hidden', 3], ['trunks_future', 4],
      ['piccolo_guardian', 3], ['spirit_bomb', 2], ['krillin_fearless', 4]
    ],
    vegeta: [
      ['martial_artist', 4], ['ki_blast', 4], ['flying_kick', 4], ['final_flash', 2],
      ['guard_stance', 3], ['training_partner', 3], ['battle_veteran', 3], ['elite_warrior', 3],
      ['fusion_warrior', 2], ['vegeta_prince', 4], ['trunks_future', 4], ['ssj_goku', 3],
      ['power_surge', 3], ['spirit_bomb', 2], ['krillin_fearless', 2], ['ultimate_gohan', 4]
    ],
    piccolo: [
      ['guard_stance', 4], ['scouter', 4], ['martial_artist', 3], ['ki_blast', 3],
      ['flying_kick', 4], ['training_partner', 4], ['power_surge', 3], ['battle_veteran', 3],
      ['elite_warrior', 3], ['piccolo_guardian', 4], ['krillin_fearless', 4], ['gohan_hidden', 4],
      ['fusion_warrior', 2], ['goku_defender', 3], ['special_beam_cannon', 2]
    ],
    frieza: [
      ['frieza_soldier', 4], ['dodoria', 4], ['zarbon', 4], ['sorbet', 4], ['ki_blast', 4],
      ['guard_stance', 3], ['ginyu', 4], ['third_form_frieza', 4], ['frieza_emperor', 3],
      ['golden_frieza', 2], ['battle_veteran', 3], ['elite_warrior', 3], ['fusion_warrior', 3],
      ['power_surge', 3], ['death_beam', 2]
    ],
    yamcha: [
      ['martial_artist', 4], ['krillin_fearless', 4], ['flying_kick', 4], ['scouter', 4],
      ['guard_stance', 4], ['training_partner', 4], ['ki_blast', 4], ['power_surge', 4],
      ['battle_veteran', 4], ['trunks_future', 4], ['gohan_hidden', 4], ['goku_defender', 4],
      ['elite_warrior', 2]
    ],
    frieza_ai: [
      ['frieza_soldier', 4], ['dodoria', 4], ['zarbon', 4], ['sorbet', 4], ['ginyu', 4],
      ['third_form_frieza', 4], ['frieza_emperor', 3], ['golden_frieza', 2], ['guard_stance', 3],
      ['ki_blast', 4], ['scouter', 3], ['battle_veteran', 3], ['elite_warrior', 3],
      ['fusion_warrior', 3], ['death_beam', 2]
    ],
    android: [
      ['android17', 4], ['android18', 4], ['cell_jr', 4], ['imperfect_cell', 4], ['android16', 4],
      ['cell', 3], ['perfect_cell', 2], ['guard_stance', 4], ['ki_blast', 4], ['scouter', 4],
      ['battle_veteran', 3], ['elite_warrior', 3], ['fusion_warrior', 3], ['martial_artist', 4]
    ],
    cell: [
      ['cell_jr', 4], ['imperfect_cell', 4], ['cell', 4], ['perfect_cell', 3], ['android17', 3],
      ['android18', 3], ['android16', 3], ['guard_stance', 4], ['ki_blast', 4], ['scouter', 4],
      ['battle_veteran', 4], ['elite_warrior', 3], ['fusion_warrior', 3], ['power_surge', 4]
    ],
    buu: [
      ['babidi', 4], ['kid_buu', 4], ['dabura', 4], ['majin_buu', 4], ['super_buu', 3],
      ['guard_stance', 4], ['ki_blast', 4], ['scouter', 4], ['battle_veteran', 4],
      ['elite_warrior', 4], ['fusion_warrior', 4], ['power_surge', 4], ['training_partner', 3]
    ],
    god: [
      ['beerus', 4], ['whis', 4], ['vados', 4], ['champa', 3], ['goku_ui', 3],
      ['guard_stance', 4], ['ki_blast', 4], ['scouter', 4], ['battle_veteran', 4],
      ['elite_warrior', 4], ['fusion_warrior', 4], ['power_surge', 4], ['training_partner', 4]
    ]
  };

  const STAGES = [
    {
      id: 'desert_duel', number: 1, name: 'Desert Duel', opponent: 'Yamcha', leaderId: 'yamcha',
      deck: 'yamcha', level: 1, difficulty: 'Rookie', life: 5,
      blurb: 'A friendly challenge under a burning sun. Learn the rhythm of Fusion World.',
      quote: 'This time I will not lose!', accent: '#ffb347', icon: '☀'
    },
    {
      id: 'frieza_force', number: 2, name: 'Frieza Force', opponent: 'Frieza', leaderId: 'frieza',
      deck: 'frieza_ai', level: 2, difficulty: 'Intermediate', life: 5,
      blurb: 'The emperor\'s vanguard blocks your path. Break through their energy line.',
      quote: 'You will learn the meaning of despair.', accent: '#b46bff', icon: 'Ω'
    },
    {
      id: 'android_invasion', number: 3, name: 'Android Invasion', opponent: 'Android 18', leaderId: 'android18',
      deck: 'android', level: 3, difficulty: 'Advanced', life: 5,
      blurb: 'Infinite energy, cold precision. Outthink an opponent who never tires.',
      quote: 'You are already finished.', accent: '#35e08d', icon: '∞'
    },
    {
      id: 'cell_games', number: 4, name: 'The Cell Games', opponent: 'Cell', leaderId: 'cell',
      deck: 'cell', level: 4, difficulty: 'Expert', life: 5,
      blurb: 'A perfect arena. A perfect enemy. Only one warrior leaves standing.',
      quote: 'Let the games begin.', accent: '#7dff8a', icon: '✹'
    },
    {
      id: 'majin_awakening', number: 5, name: 'Majin Awakening', opponent: 'Majin Buu', leaderId: 'buu',
      deck: 'buu', level: 5, difficulty: 'Master', life: 5,
      blurb: 'Ancient magic turns the battlefield to candy. Stand firm against chaos.',
      quote: 'Buu will turn you into chocolate!', accent: '#ff5fa2', icon: 'M'
    },
    {
      id: 'god_of_destruction', number: 6, name: 'God of Destruction', opponent: 'Beerus', leaderId: 'beerus',
      deck: 'god', level: 6, difficulty: 'Godly', life: 6,
      blurb: 'The final trial. A god with six life and no patience for weakness.',
      quote: 'Show me something worth remembering.', accent: '#8f8bff', icon: '✦'
    }
  ];

  function cardDef(id) {
    const def = CARDS[id];
    if (!def) throw new Error('Unknown card: ' + id);
    return def;
  }

  function leaderDef(id) {
    const def = LEADERS[id];
    if (!def) throw new Error('Unknown leader: ' + id);
    return def;
  }

  function stageDef(id) {
    const found = STAGES.find(function (s) { return s.id === id; });
    if (!found) throw new Error('Unknown stage: ' + id);
    return found;
  }

  function deckList(deckId) {
    const recipe = DECKS[deckId];
    if (!recipe) throw new Error('Unknown deck: ' + deckId);
    const list = [];
    recipe.forEach(function (entry) {
      for (let i = 0; i < entry[1]; i++) list.push(entry[0]);
    });
    return list;
  }

  function deckSummary(deckId) {
    return DECKS[deckId].map(function (entry) {
      const def = cardDef(entry[0]);
      return { id: entry[0], count: entry[1], name: def.name, cost: def.cost, power: def.power, combo: def.combo };
    }).sort(function (a, b) { return a.cost - b.cost || a.name.localeCompare(b.name); });
  }

  function validate() {
    const errors = [];
    Object.keys(DECKS).forEach(function (id) {
      const list = deckList(id);
      if (list.length !== 50) errors.push('Deck ' + id + ' has ' + list.length + ' cards');
    });
    STAGES.forEach(function (s) {
      if (!LEADERS[s.leaderId]) errors.push('Stage ' + s.id + ' missing leader');
      if (!DECKS[s.deck]) errors.push('Stage ' + s.id + ' missing deck');
    });
    return errors;
  }

  return {
    FACTIONS, KEYWORDS, CARDS, LEADERS, DECKS, STAGES,
    cardDef, leaderDef, stageDef, deckList, deckSummary, validate
  };
});
