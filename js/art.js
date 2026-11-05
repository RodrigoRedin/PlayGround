/* Dragon Ball: Fusion World — original procedural SVG artwork.
 * No external images, fonts, or copyrighted assets are loaded.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DBFW_ART = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  let seq = 0;
  function uid(prefix) { return (prefix || 'a') + (++seq); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  const FACTION_BG = {
    saiyan: ['#31150a', '#0a0d1d', '#ff8a1e'],
    frieza: ['#2b0c44', '#0b0616', '#b46bff'],
    android: ['#062b20', '#061014', '#35e08d'],
    buu: ['#380d24', '#120610', '#ff5fa2'],
    god: ['#161243', '#070612', '#8f8bff']
  };

  /* ================================================================== *
   * Character presets
   * ================================================================== */
  const CHARACTERS = {
    goku: {
      skin: '#f2bc8c', shade: '#c98c60', hair: '#14131b', hair2: '#2a2833',
      style: 'spiky', eye: '#2a1a12', outfit: '#ef6c1a', outfit2: '#1e3f8f', trim: '#ffd26b',
      aura: '#ffa11e', aura2: '#ff4d00', mouth: 'smile', brows: 'brave', body: 'gi'
    },
    vegeta: {
      skin: '#f0b987', shade: '#c6875c', hair: '#101018', hair2: '#292733',
      style: 'widow', eye: '#241512', outfit: '#223c86', outfit2: '#e8edf7', trim: '#f5c542',
      aura: '#6ea8ff', aura2: '#2f5cff', mouth: 'smirk', brows: 'angry', body: 'armor', armor: true
    },
    gohan: {
      skin: '#f2bc8c', shade: '#c98c60', hair: '#17151d', hair2: '#2c2935',
      style: 'spiky', eye: '#2a1a12', outfit: '#ef6c1a', outfit2: '#1e3f8f', trim: '#ffd26b',
      aura: '#ffb02e', aura2: '#ff7a00', mouth: 'calm', brows: 'brave', body: 'gi'
    },
    goku_gold: {
      skin: '#f2bc8c', shade: '#c98c60', hair: '#ffe14a', hair2: '#ffb300',
      style: 'spiky', eye: '#1aa7a0', outfit: '#ef6c1a', outfit2: '#1e3f8f', trim: '#fff0a8',
      aura: '#ffe14a', aura2: '#ff8a00', mouth: 'smile', brows: 'angry', body: 'gi', spark: true
    },
    gohan_gold: {
      skin: '#f2bc8c', shade: '#c98c60', hair: '#ffe14a', hair2: '#ffb300',
      style: 'spiky', eye: '#1aa7a0', outfit: '#5b2a8c', outfit2: '#1b1030', trim: '#ffe98a',
      aura: '#ffe14a', aura2: '#ff8a00', mouth: 'calm', brows: 'angry', body: 'gi', spark: true
    },
    piccolo: {
      skin: '#78c46a', shade: '#4b8b42', hair: null, hair2: null,
      style: 'antennae', eye: '#3b1d12', outfit: '#53327f', outfit2: '#2b1745', trim: '#e8d27c',
      aura: '#d9ff7a', aura2: '#6cff9c', mouth: 'smirk', brows: 'angry', body: 'gi', antennae: true
    },
    krillin: {
      skin: '#f0b987', shade: '#c6875c', hair: null, hair2: null,
      style: 'bald', eye: '#2a1a12', outfit: '#ef6c1a', outfit2: '#1e3f8f', trim: '#ffd26b',
      aura: '#ffc247', aura2: '#ff7a00', mouth: 'smile', brows: 'brave', body: 'gi', dots: true
    },
    trunks: {
      skin: '#f2bc8c', shade: '#c98c60', hair: '#9d8bc8', hair2: '#7564a4',
      style: 'bob', eye: '#2c6bd6', outfit: '#2b2f3d', outfit2: '#151824', trim: '#6fd6ff',
      aura: '#6fd6ff', aura2: '#2c6bff', mouth: 'calm', brows: 'brave', body: 'jacket'
    },
    gogeta: {
      skin: '#f2bc8c', shade: '#c98c60', hair: '#ff4b2e', hair2: '#b51d12',
      style: 'spiky', eye: '#1aa7a0', outfit: '#1b2a52', outfit2: '#e8edf7', trim: '#ffd26b',
      aura: '#ff5a2e', aura2: '#ffb000', mouth: 'smirk', brows: 'angry', body: 'vest', armor: true
    },
    yamcha: {
      skin: '#efb382', shade: '#c5865a', hair: '#2a201c', hair2: '#44362e',
      style: 'long', eye: '#2a1a12', outfit: '#ef6c1a', outfit2: '#1e3f8f', trim: '#ffd26b',
      aura: '#ffbe4a', aura2: '#ff7a00', mouth: 'smirk', brows: 'brave', body: 'gi', scar: true
    },
    frieza_soldier: {
      skin: '#c6d3e6', shade: '#8c9db8', hair: '#25305c', hair2: '#3d4c85',
      style: 'bob', eye: '#2b1a12', outfit: '#4b3b86', outfit2: '#241c48', trim: '#b46bff',
      aura: '#a875ff', aura2: '#5b2cff', mouth: 'smirk', brows: 'angry', body: 'armor', armor: true
    },
    dodoria: {
      skin: '#ff8cae', shade: '#c45374', hair: '#f5b5c8', hair2: '#d8839e',
      style: 'spiky', eye: '#2b1a12', outfit: '#3b2a63', outfit2: '#211740', trim: '#b46bff',
      aura: '#ff5fa2', aura2: '#b46bff', mouth: 'angry', brows: 'angry', body: 'armor', armor: true, spikes: true
    },
    zarbon: {
      skin: '#efc49c', shade: '#c18c63', hair: '#4cbb7a', hair2: '#2a7c4b',
      style: 'long', eye: '#2c6bd6', outfit: '#e9e2f4', outfit2: '#4b3b86', trim: '#b46bff',
      aura: '#7dffb0', aura2: '#2ee08d', mouth: 'smirk', brows: 'calm', body: 'armor', armor: true
    },
    sorbet: {
      skin: '#a7c7e8', shade: '#7394b8', hair: '#2a3a66', hair2: '#41558c',
      style: 'bob', eye: '#2b1a12', outfit: '#3b2a63', outfit2: '#211740', trim: '#b46bff',
      aura: '#9f7bff', aura2: '#5b2cff', mouth: 'calm', brows: 'calm', body: 'armor', armor: true
    },
    ginyu: {
      skin: '#b677ff', shade: '#7e42bd', hair: null, hair2: null,
      style: 'horns', eye: '#2b1a12', outfit: '#30204f', outfit2: '#161025', trim: '#ffd26b',
      aura: '#d36bff', aura2: '#7b2cff', mouth: 'smirk', brows: 'angry', body: 'armor', armor: true, horns: true
    },
    frieza3: {
      skin: '#dfe8f6', shade: '#a7b2c9', hair: null, hair2: null,
      style: 'smooth', eye: '#ff3b3b', outfit: '#4b3b86', outfit2: '#2b1a4d', trim: '#b46bff',
      aura: '#b46bff', aura2: '#ff4fd8', mouth: 'smirk', brows: 'angry', body: 'armor', armor: true, crest: true
    },
    frieza: {
      skin: '#f2f5ff', shade: '#b9c3d6', hair: null, hair2: null,
      style: 'smooth', eye: '#ff3b3b', outfit: '#6c47b8', outfit2: '#2b1a4d', trim: '#d8b4ff',
      aura: '#b46bff', aura2: '#ff4fd8', mouth: 'smirk', brows: 'angry', body: 'armor', armor: true, crest: true
    },
    frieza_gold: {
      skin: '#ffe58a', shade: '#d6a52e', hair: null, hair2: null,
      style: 'smooth', eye: '#ff3b3b', outfit: '#b8860b', outfit2: '#573a00', trim: '#fff0a8',
      aura: '#ffd84a', aura2: '#ff8a00', mouth: 'smirk', brows: 'angry', body: 'armor', armor: true, crest: true, spark: true
    },
    a17: {
      skin: '#efc49c', shade: '#c18c63', hair: '#1a1b22', hair2: '#33353f',
      style: 'bob', eye: '#2c6bd6', outfit: '#20222c', outfit2: '#0e0f14', trim: '#35e08d',
      aura: '#4affaa', aura2: '#00a860', mouth: 'smirk', brows: 'calm', body: 'jacket'
    },
    a18: {
      skin: '#f5cba2', shade: '#c99669', hair: '#f2d26e', hair2: '#c9a73c',
      style: 'bob', eye: '#2c6bd6', outfit: '#20222c', outfit2: '#0e0f14', trim: '#35e08d',
      aura: '#4affaa', aura2: '#00a860', mouth: 'calm', brows: 'calm', body: 'jacket'
    },
    celljr: {
      skin: '#79d66a', shade: '#4c9142', hair: null, hair2: null,
      style: 'horns', eye: '#ff5fa2', outfit: '#3b2a63', outfit2: '#211740', trim: '#9dffd0',
      aura: '#5aff8a', aura2: '#00a860', mouth: 'smirk', brows: 'angry', body: 'armor', armor: true, horns: true, spots: true
    },
    cell: {
      skin: '#79d66a', shade: '#4c9142', hair: null, hair2: null,
      style: 'horns', eye: '#ff5fa2', outfit: '#151821', outfit2: '#0a0b10', trim: '#9dffd0',
      aura: '#5aff8a', aura2: '#00a860', mouth: 'smirk', brows: 'angry', body: 'armor', armor: true, horns: true, spots: true
    },
    cell_perfect: {
      skin: '#79d66a', shade: '#4c9142', hair: null, hair2: null,
      style: 'horns', eye: '#ff5fa2', outfit: '#e8d27c', outfit2: '#4b3b86', trim: '#9dffd0',
      aura: '#b8ff5a', aura2: '#00a860', mouth: 'smirk', brows: 'angry', body: 'armor', armor: true, horns: true, spots: true
    },
    a16: {
      skin: '#efc49c', shade: '#c18c63', hair: '#e08a2e', hair2: '#b25f12',
      style: 'bob', eye: '#2c6bd6', outfit: '#2b6b3c', outfit2: '#153a20', trim: '#35e08d',
      aura: '#4affaa', aura2: '#00a860', mouth: 'calm', brows: 'calm', body: 'jacket'
    },
    babidi: {
      skin: '#9db7e8', shade: '#6d86b8', hair: null, hair2: null,
      style: 'hood', eye: '#2b1a12', outfit: '#4a1c66', outfit2: '#220a33', trim: '#ff5fa2',
      aura: '#ff5fa2', aura2: '#b46bff', mouth: 'smirk', brows: 'angry', body: 'robe', hood: true
    },
    kidbuu: {
      skin: '#ff9ec4', shade: '#d06490', hair: null, hair2: null,
      style: 'antennae', eye: '#1b1016', outfit: '#1b1b24', outfit2: '#0b0b10', trim: '#ff5fa2',
      aura: '#ff5fa2', aura2: '#ff1e7a', mouth: 'angry', brows: 'angry', body: 'vest', antennae: true
    },
    dabura: {
      skin: '#e05a4a', shade: '#a93428', hair: '#f5f0e8', hair2: '#c9c2b8',
      style: 'widow', eye: '#ffd84a', outfit: '#2b1745', outfit2: '#12081f', trim: '#ffd26b',
      aura: '#ff7a4a', aura2: '#b41e1e', mouth: 'smirk', brows: 'angry', body: 'armor', armor: true, horns: true, hornsSmall: true
    },
    buu: {
      skin: '#ff9ec4', shade: '#d06490', hair: null, hair2: null,
      style: 'antennae', eye: '#1b1016', outfit: '#1b1b24', outfit2: '#0b0b10', trim: '#ff5fa2',
      aura: '#ff5fa2', aura2: '#ff1e7a', mouth: 'smile', brows: 'calm', body: 'vest', antennae: true
    },
    superbuu: {
      skin: '#ff9ec4', shade: '#d06490', hair: null, hair2: null,
      style: 'antennae', eye: '#ff1e7a', outfit: '#1b1b24', outfit2: '#0b0b10', trim: '#ff5fa2',
      aura: '#ff5fa2', aura2: '#a8004a', mouth: 'angry', brows: 'angry', body: 'vest', antennae: true, spots: true
    },
    vados: {
      skin: '#9fd0ff', shade: '#6b9dcb', hair: '#f5f7ff', hair2: '#c9d2e8',
      style: 'bob', eye: '#4a6bd6', outfit: '#25305c', outfit2: '#111a36', trim: '#ffd26b',
      aura: '#8f8bff', aura2: '#5b7cff', mouth: 'smile', brows: 'calm', body: 'robe'
    },
    whis: {
      skin: '#9fd0ff', shade: '#6b9dcb', hair: '#f5f7ff', hair2: '#c9d2e8',
      style: 'bob', eye: '#4a6bd6', outfit: '#25305c', outfit2: '#111a36', trim: '#ffd26b',
      aura: '#8f8bff', aura2: '#5b7cff', mouth: 'smile', brows: 'calm', body: 'robe'
    },
    champa: {
      skin: '#c98ce8', shade: '#9a5cb8', hair: null, hair2: null,
      style: 'cat', eye: '#ffd84a', outfit: '#2b1745', outfit2: '#12081f', trim: '#ffd26b',
      aura: '#b46bff', aura2: '#7b2cff', mouth: 'smirk', brows: 'angry', body: 'robe', cat: true
    },
    beerus: {
      skin: '#c98ce8', shade: '#9a5cb8', hair: null, hair2: null,
      style: 'cat', eye: '#ffe14a', outfit: '#2b1745', outfit2: '#12081f', trim: '#ffd26b',
      aura: '#a86bff', aura2: '#5b2cff', mouth: 'smirk', brows: 'angry', body: 'robe', cat: true
    },
    goku_ui: {
      skin: '#f2bc8c', shade: '#c98c60', hair: '#dfe6ff', hair2: '#9aa8d6',
      style: 'spiky', eye: '#9fd8ff', outfit: '#ef6c1a', outfit2: '#1e3f8f', trim: '#ffd26b',
      aura: '#c9d4ff', aura2: '#6f8bff', mouth: 'calm', brows: 'calm', body: 'gi', spark: true
    },
    martial_artist: {
      skin: '#efb382', shade: '#c5865a', hair: '#3a2a1f', hair2: '#5a4232',
      style: 'spiky', eye: '#2a1a12', outfit: '#e8621c', outfit2: '#1e3f8f', trim: '#ffd26b',
      aura: '#ffb347', aura2: '#ff7a00', mouth: 'smirk', brows: 'brave', body: 'gi'
    },
    flying_kick: {
      skin: '#efb382', shade: '#c5865a', hair: '#2a201c', hair2: '#44362e',
      style: 'spiky', eye: '#2a1a12', outfit: '#e8621c', outfit2: '#1e3f8f', trim: '#ffd26b',
      aura: '#ffbe4a', aura2: '#ff7a00', mouth: 'brave', brows: 'angry', body: 'gi', motion: true
    }
  };

  /* Technique artwork definitions. */
  const TECHNIQUES = {
    ki_blast: { kind: 'orb', c1: '#9fe8ff', c2: '#2c6bff', bg1: '#06132e', bg2: '#030611', label: 'Ki blast' },
    spirit_bomb: { kind: 'bigorb', c1: '#d8f4ff', c2: '#2c6bff', bg1: '#071a3a', bg2: '#030611', label: 'Spirit Bomb' },
    final_flash: { kind: 'beam', c1: '#fff7a8', c2: '#ff8a00', bg1: '#2a1404', bg2: '#0b0603', label: 'Final Flash' },
    death_beam: { kind: 'beam', c1: '#ffb5ff', c2: '#8a2cff', thin: true, bg1: '#21072f', bg2: '#08020d', label: 'Death Beam' },
    special_beam: { kind: 'beam', c1: '#fff7a8', c2: '#ffd000', drill: true, bg1: '#241a06', bg2: '#090702', label: 'Special Beam Cannon' },
    destructo_disc: { kind: 'disc', c1: '#eaff9f', c2: '#71ff3b', bg1: '#0d2606', bg2: '#030b02', label: 'Destructo Disc' },
    power_surge: { kind: 'aura', c1: '#ffe14a', c2: '#ff5a00', bg1: '#2a1404', bg2: '#0b0603', label: 'Power surge' },
    guard_stance: { kind: 'shield', c1: '#bff7ff', c2: '#2c9bff', bg1: '#061a2b', bg2: '#03070d', label: 'Guard stance' },
    scouter: { kind: 'scouter', c1: '#b6ff6a', c2: '#35e08d', bg1: '#0a2418', bg2: '#040b08', label: 'Scouter' }
  };

  /* ================================================================== *
   * Character rendering
   * ================================================================== */
  function speedLines(id, color) {
    return `<g opacity=".16" stroke="${color}" stroke-width="1.2">
      <path d="M-10 210 L85 90"/><path d="M10 244 L105 110"/><path d="M190 226 L105 96"/>
      <path d="M210 180 L120 70"/><path d="M0 150 L70 60"/><path d="M180 20 L120 90"/>
      <path d="M40 0 L88 62"/><path d="M160 0 L118 58"/>
    </g>`;
  }

  function hairFront(cfg) {
    const h = cfg.hair || '#15151c';
    const h2 = cfg.hair2 || h;
    switch (cfg.style) {
      case 'spiky': {
        return `<path d="M58 106 L36 82 L58 80 L43 54 L66 66 L57 34 L78 58 L79 22 L95 55 L104 12 L113 54
          L129 20 L131 58 L154 33 L146 68 L172 56 L154 84 L176 98 L152 99
          C147 83 138 73 128 69 C117 63 108 70 100 77 C90 69 80 65 70 71 C63 76 60 86 59 97 Z" fill="${h}"/>
          <path d="M76 74 L90 60 L100 72 L112 58 L124 76" fill="none" stroke="${h2}" stroke-width="2" opacity=".6"/>`;
      }
      case 'widow': {
        return `<path d="M58 102 L51 72 L69 80 L62 47 L84 67 L92 33 L100 62 L100 82
          L108 62 L116 33 L124 67 L146 47 L139 80 L157 72 L150 104
          C142 84 132 76 122 72 L100 91 L78 72 C68 76 62 86 58 102 Z" fill="${h}"/>
          <path d="M100 91 L92 60 L100 44 L108 60 Z" fill="${h2}" opacity=".55"/>`;
      }
      case 'bob': {
        return `<path d="M58 112 C52 70 74 52 100 52 C126 52 148 70 142 112 L150 150 L137 154 L132 112
          C125 95 114 88 100 88 C86 88 75 95 68 112 L63 154 L50 150 Z" fill="${h}"/>
          <path d="M68 96 C74 76 86 66 100 66 C114 66 126 76 132 96" fill="none" stroke="${h2}" stroke-width="3" opacity=".5"/>`;
      }
      case 'long': {
        return `<path d="M56 112 C50 68 74 50 100 50 C126 50 150 68 144 112 L154 174 L137 166 L132 112
          C125 94 114 87 100 87 C86 87 75 94 68 112 L63 166 L46 174 Z" fill="${h}"/>
          <path d="M70 90 C78 70 88 62 100 62 C112 62 122 70 130 90" fill="none" stroke="${h2}" stroke-width="3" opacity=".55"/>`;
      }
      case 'hood': {
        return `<path d="M42 168 C34 116 54 54 100 48 C146 54 166 116 158 168 L140 178 L132 112
          C124 86 114 76 100 76 C86 76 76 86 68 112 L60 178 Z" fill="${h || '#3a1552'}" opacity=".95"/>
          <path d="M66 74 C76 54 88 46 100 46 C112 46 124 54 134 74" fill="none" stroke="${h2 || '#ff5fa2'}" stroke-width="2" opacity=".6"/>`;
      }
      case 'smooth':
        return '';
      case 'bald':
        return '';
      case 'antennae':
        return '';
      case 'horns':
        return '';
      case 'cat':
        return '';
      default:
        return '';
    }
  }

  function headAccessories(cfg) {
    let out = '';
    const aura = cfg.aura || '#ffb347';
    if (cfg.antennae) {
      out += `<path d="M82 66 C70 38 60 28 54 20" fill="none" stroke="${cfg.skin}" stroke-width="5" stroke-linecap="round"/>
        <path d="M118 66 C130 38 140 28 146 20" fill="none" stroke="${cfg.skin}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="54" cy="19" r="3.6" fill="${cfg.shade}"/><circle cx="146" cy="19" r="3.6" fill="${cfg.shade}"/>`;
    }
    if (cfg.horns || cfg.hornsSmall) {
      const len = cfg.hornsSmall ? 14 : 24;
      out += `<path d="M76 72 C64 ${72 - len} 54 ${58 - len} 50 ${44 - len}" fill="none" stroke="${cfg.trim || '#ffd26b'}" stroke-width="7" stroke-linecap="round"/>
        <path d="M124 72 C136 ${72 - len} 146 ${58 - len} 150 ${44 - len}" fill="none" stroke="${cfg.trim || '#ffd26b'}" stroke-width="7" stroke-linecap="round"/>`;
      if (cfg.style === 'horns' && !cfg.hornsSmall) {
        out += `<path d="M84 60 L100 36 L116 60" fill="none" stroke="${cfg.trim || '#ffd26b'}" stroke-width="6" stroke-linecap="round"/>`;
      }
    }
    if (cfg.cat) {
      out += `<path d="M62 72 L54 34 L82 56 Z" fill="${cfg.skin}" stroke="${cfg.shade}" stroke-width="2"/>
        <path d="M138 72 L146 34 L118 56 Z" fill="${cfg.skin}" stroke="${cfg.shade}" stroke-width="2"/>
        <path d="M64 64 L60 46 L74 58 Z" fill="${cfg.aura2 || '#5b2cff'}" opacity=".55"/>
        <path d="M136 64 L140 46 L126 58 Z" fill="${cfg.aura2 || '#5b2cff'}" opacity=".55"/>
        <path d="M84 142 L60 136 M84 148 L58 148 M116 142 L140 136 M116 148 L142 148" stroke="${cfg.shade}" stroke-width="1.3" opacity=".8"/>`;
    }
    if (cfg.scouter) {
      out += `<rect x="76" y="99" width="30" height="19" rx="9" fill="#0b2a20" stroke="#8cffb0" stroke-width="1.6" opacity=".95"/>
        <path d="M80 108 Q91 100 102 108 Q91 116 80 108 Z" fill="#5dff9c" opacity=".75"/>
        <path d="M60 106 C52 106 48 112 46 120" fill="none" stroke="#3b3b46" stroke-width="2.4"/>
        <text x="84" y="113" font-family="monospace" font-size="6" fill="#0b2a20">PWR</text>`;
    }
    if (cfg.scar) {
      out += `<path d="M74 122 L80 134 M78 121 L84 133" stroke="${cfg.shade}" stroke-width="1.4" opacity=".9"/>`;
    }
    if (cfg.dots) {
      out += `<g fill="${cfg.shade}" opacity=".9">
        <circle cx="88" cy="94" r="1.6"/><circle cx="96" cy="92" r="1.6"/><circle cx="104" cy="92" r="1.6"/>
        <circle cx="112" cy="94" r="1.6"/><circle cx="92" cy="99" r="1.5"/><circle cx="108" cy="99" r="1.5"/>
      </g>`;
    }
    if (cfg.spots) {
      out += `<g fill="${cfg.shade}" opacity=".65"><circle cx="76" cy="118" r="2.4"/><circle cx="124" cy="104" r="2"/>
        <circle cx="130" cy="126" r="1.8"/><circle cx="70" cy="138" r="1.6"/></g>`;
    }
    if (cfg.spark) {
      out += `<g stroke="${aura}" stroke-width="2" opacity=".85">
        <path d="M42 58 L30 44 M158 58 L170 44 M50 142 L36 154 M150 142 L164 154"/>
        <path d="M28 100 L14 96 M172 100 L186 96"/>
      </g>`;
    }
    return out;
  }

  function eyes(cfg, id) {
    const eye = cfg.eye || '#2a1a12';
    const brow = cfg.hair || cfg.shade || '#222';
    const angry = cfg.brows === 'angry';
    const calm = cfg.brows === 'calm';
    let out = '';
    if (cfg.style === 'smooth' || cfg.cat) {
      /* Narrow, luminous eyes */
      out += `<path d="M76 112 Q88 104 98 111 Q88 118 76 112 Z" fill="${eye}" opacity=".9"/>
        <path d="M102 111 Q112 104 124 112 Q112 118 102 111 Z" fill="${eye}" opacity=".9"/>
        <ellipse cx="88" cy="111" rx="2.1" ry="5.5" fill="#1a0b0b"/>
        <ellipse cx="112" cy="111" rx="2.1" ry="5.5" fill="#1a0b0b"/>
        <circle cx="90" cy="108" r="1.2" fill="#fff" opacity=".9"/><circle cx="114" cy="108" r="1.2" fill="#fff" opacity=".9"/>`;
    } else {
      out += `<path d="M77 112 Q87 105 97 111 Q88 121 77 112 Z" fill="#fffdf5"/>
        <path d="M103 111 Q113 105 123 112 Q113 121 103 111 Z" fill="#fffdf5"/>
        <circle cx="88" cy="112.5" r="4.2" fill="${eye}"/><circle cx="112" cy="112.5" r="4.2" fill="${eye}"/>
        <circle cx="88" cy="112.5" r="1.8" fill="#120b08"/><circle cx="112" cy="112.5" r="1.8" fill="#120b08"/>
        <circle cx="89.5" cy="110.5" r="1.3" fill="#fff"/><circle cx="113.5" cy="110.5" r="1.3" fill="#fff"/>`;
    }
    if (angry) {
      out += `<path d="M74 102 L98 98 M126 102 L102 98" stroke="${brow}" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M78 106 L94 103 M122 106 L106 103" stroke="${brow}" stroke-width="1.6" opacity=".55"/>`;
    } else if (calm) {
      out += `<path d="M76 102 Q88 98 98 102 M102 102 Q112 98 124 102" fill="none" stroke="${brow}" stroke-width="2.6" stroke-linecap="round"/>`;
    } else {
      out += `<path d="M75 101 L98 98 M125 101 L102 98" stroke="${brow}" stroke-width="3.2" stroke-linecap="round"/>`;
    }
    if (cfg.style === 'smooth' || cfg.cat) {
      out += `<path d="M74 100 L98 96 M126 100 L102 96" stroke="${brow}" stroke-width="3" stroke-linecap="round"/>`;
    }
    return out;
  }

  function mouth(cfg) {
    const line = cfg.shade || '#9a5c45';
    switch (cfg.mouth) {
      case 'smile':
        return `<path d="M90 137 Q100 145 112 136" fill="none" stroke="${line}" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M96 142 Q100 144 105 142" fill="none" stroke="${line}" stroke-width="1.2" opacity=".6"/>`;
      case 'angry':
        return `<path d="M90 142 Q100 134 112 141" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M94 145 L98 142 M106 142 L110 145" stroke="${line}" stroke-width="1.4"/>`;
      case 'smirk':
        return `<path d="M90 140 Q101 144 113 135" fill="none" stroke="${line}" stroke-width="2.3" stroke-linecap="round"/>`;
      case 'brave':
        return `<path d="M90 139 Q101 146 113 139" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round"/>`;
      default:
        return `<path d="M92 139 Q101 143 111 138" fill="none" stroke="${line}" stroke-width="2" stroke-linecap="round"/>`;
    }
  }

  function characterBody(cfg) {
    const outfit = cfg.outfit || '#ef6c1a';
    const outfit2 = cfg.outfit2 || '#1e3f8f';
    const trim = cfg.trim || '#ffd26b';
    const skin = cfg.skin || '#f2bc8c';
    const shade = cfg.shade || '#c98c60';
    let out = '';
    out += `<path d="M32 240 C38 206 60 188 100 188 C140 188 162 206 168 240 Z" fill="${outfit}"/>`;
    out += `<path d="M77 178 h46 v22 c-8 8 -38 8 -46 0 Z" fill="${skin}"/>`;
    out += `<path d="M77 180 h46 v8 c-12 5 -34 5 -46 0 Z" fill="${shade}" opacity=".55"/>`;
    out += `<path d="M62 240 C68 214 82 200 100 200 C118 200 132 214 138 240 Z" fill="${outfit2}" opacity=".92"/>`;
    if (cfg.body === 'gi') {
      out += `<path d="M100 200 L84 208 L100 221 L116 208 Z" fill="${skin}" opacity=".8"/>
        <path d="M84 208 L100 221 L116 208" fill="none" stroke="${trim}" stroke-width="2.4"/>
        <path d="M54 219 C66 212 78 210 86 211" fill="none" stroke="${trim}" stroke-width="3" opacity=".8"/>
        <path d="M146 219 C134 212 122 210 114 211" fill="none" stroke="${trim}" stroke-width="3" opacity=".8"/>`;
    }
    if (cfg.body === 'armor' || cfg.armor) {
      out += `<path d="M46 214 C56 198 70 192 82 193 L78 214 C66 216 55 224 50 240 L36 240 Z" fill="${outfit2}" stroke="${trim}" stroke-width="2"/>
        <path d="M154 214 C144 198 130 192 118 193 L122 214 C134 216 145 224 150 240 L164 240 Z" fill="${outfit2}" stroke="${trim}" stroke-width="2"/>
        <path d="M88 200 L100 218 L112 200" fill="none" stroke="${trim}" stroke-width="2.4" opacity=".9"/>
        <path d="M84 206 L116 206" stroke="${trim}" stroke-width="1.2" opacity=".55"/>`;
    }
    if (cfg.body === 'jacket' || cfg.body === 'vest') {
      out += `<path d="M84 198 L100 216 L116 198 L126 204 L120 240 L80 240 L74 204 Z" fill="${outfit2}" opacity=".96"/>
        <path d="M100 216 L100 240" stroke="${trim}" stroke-width="1.6" opacity=".8"/>
        <path d="M48 220 C60 210 74 204 84 203" fill="none" stroke="${trim}" stroke-width="2" opacity=".55"/>
        <path d="M152 220 C140 210 126 204 116 203" fill="none" stroke="${trim}" stroke-width="2" opacity=".55"/>`;
    }
    if (cfg.body === 'robe') {
      out += `<path d="M60 204 L100 218 L140 204 L152 240 L48 240 Z" fill="${outfit2}" opacity=".65"/>
        <path d="M100 218 L100 240" stroke="${trim}" stroke-width="2" opacity=".8"/>
        <path d="M66 202 L100 216 L134 202" fill="none" stroke="${trim}" stroke-width="2.2" opacity=".8"/>`;
    }
    if (cfg.body === 'hood') {
      out += `<path d="M36 240 C42 200 64 184 100 184 C136 184 158 200 164 240 Z" fill="${outfit}" opacity=".7"/>`;
    }
    return out;
  }

  function renderCharacter(cfg, opts) {
    opts = opts || {};
    const id = uid('ch');
    const faction = opts.faction || 'saiyan';
    const bg = FACTION_BG[faction] || FACTION_BG.saiyan;
    const aura = cfg.aura || bg[2];
    const aura2 = cfg.aura2 || bg[2];
    const skin = cfg.skin || '#f2bc8c';
    const shade = cfg.shade || '#c98c60';
    const label = opts.label || 'Fighter';
    const motion = cfg.motion ? `<g opacity=".75" stroke="${aura}" stroke-width="2.2" stroke-linecap="round">
      <path d="M28 92 L6 82 M34 116 L8 112 M36 142 L12 148"/></g>` : '';
    const auraPath = `<path d="M100 26 L114 62 L140 30 L136 76 L170 58 L150 96 L184 112 L150 126 L172 166 L138 154 L142 198 L116 170 L100 208 L84 170 L58 198 L62 154 L28 166 L50 126 L16 112 L50 96 L30 58 L64 76 L60 30 L86 62 Z" fill="${aura}" opacity=".13"/>`;
    return `<svg viewBox="0 0 200 240" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg${id}" cx="50%" cy="38%" r="78%">
          <stop offset="0" stop-color="${bg[0]}"/><stop offset=".72" stop-color="${bg[1]}"/><stop offset="1" stop-color="#020208"/>
        </radialGradient>
        <radialGradient id="glow${id}" cx="50%" cy="46%" r="50%">
          <stop offset="0" stop-color="${aura}" stop-opacity=".72"/>
          <stop offset=".45" stop-color="${aura2}" stop-opacity=".22"/>
          <stop offset="1" stop-color="${aura2}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="vig${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/>
        </linearGradient>
      </defs>
      <rect width="200" height="240" fill="url(#bg${id})"/>
      <circle cx="100" cy="118" r="112" fill="url(#glow${id})"/>
      ${speedLines(id, aura)}
      ${auraPath}
      ${motion}
      <g opacity=".7" fill="${aura}">
        <circle cx="26" cy="66" r="1.5"/><circle cx="174" cy="58" r="1.2"/><circle cx="184" cy="140" r="1.8"/>
        <circle cx="18" cy="160" r="1.1"/><circle cx="64" cy="30" r="1.4"/><circle cx="142" cy="24" r="1.1"/>
      </g>
      ${characterBody(cfg)}
      <ellipse cx="100" cy="108" rx="38" ry="45" fill="${skin}"/>
      <path d="M100 63 C78 63 64 82 64 108 C64 134 78 153 100 153 C122 153 136 134 136 108 C136 82 122 63 100 63 Z" fill="${skin}"/>
      <path d="M100 63 C78 63 64 82 64 108 C64 126 72 140 84 147 C78 133 76 120 78 106 C82 86 92 72 108 68 Z" fill="${shade}" opacity=".18"/>
      <ellipse cx="61" cy="116" rx="8" ry="12" fill="${skin}"/><ellipse cx="139" cy="116" rx="8" ry="12" fill="${skin}"/>
      <ellipse cx="61" cy="116" rx="3.2" ry="6" fill="${shade}" opacity=".45"/><ellipse cx="139" cy="116" rx="3.2" ry="6" fill="${shade}" opacity=".45"/>
      ${hairFront(cfg)}
      ${headAccessories(cfg)}
      ${eyes(cfg, id)}
      <path d="M100 120 L97 131 L102 132" fill="none" stroke="${shade}" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>
      ${mouth(cfg)}
      <path d="M88 152 Q100 158 112 152" fill="none" stroke="${shade}" stroke-width="1.4" opacity=".5"/>
      <rect width="200" height="240" fill="url(#vig${id})"/>
      <rect width="200" height="240" fill="none" stroke="${aura}" stroke-width="1" opacity=".18"/>
    </svg>`;
  }

  /* ================================================================== *
   * Technique rendering
   * ================================================================== */
  function renderTechnique(key, tech, opts) {
    opts = opts || {};
    const id = uid('t');
    const label = opts.label || tech.label || key;
    const c1 = tech.c1, c2 = tech.c2;
    const bg1 = tech.bg1, bg2 = tech.bg2;
    let art = '';
    if (tech.kind === 'orb' || tech.kind === 'bigorb') {
      const big = tech.kind === 'bigorb';
      const r = big ? 58 : 38;
      art = `<g>
        <circle cx="100" cy="116" r="${r + 28}" fill="${c2}" opacity=".16"/>
        <circle cx="100" cy="116" r="${r + 12}" fill="${c1}" opacity=".13"/>
        <circle cx="100" cy="116" r="${r}" fill="url(#orb${id})"/>
        <circle cx="100" cy="116" r="${r * 0.68}" fill="${c1}" opacity=".22"/>
        <circle cx="100" cy="116" r="${r * 1.18}" fill="none" stroke="${c1}" stroke-width="2" opacity=".6"/>
        <ellipse cx="100" cy="116" rx="${r * 1.5}" ry="${r * 0.42}" fill="none" stroke="${c1}" stroke-width="2" opacity=".45" transform="rotate(-18 100 116)"/>
        <g stroke="${c1}" stroke-width="2" opacity=".75" stroke-linecap="round">
          <path d="M100 40 L100 24 M100 192 L100 208 M24 116 L8 116 M176 116 L192 116"/>
          <path d="M47 63 L35 51 M153 169 L165 181 M153 63 L165 51 M47 169 L35 181"/>
        </g>
        <g fill="${c1}" opacity=".75"><circle cx="66" cy="58" r="2"/><circle cx="144" cy="70" r="1.6"/><circle cx="150" cy="165" r="2.2"/><circle cx="58" cy="174" r="1.4"/></g>
        <path d="M64 198 C74 178 84 168 100 168 C116 168 126 178 136 198" fill="none" stroke="${c1}" stroke-width="2" opacity=".35"/>
      </g>`;
    } else if (tech.kind === 'beam') {
      const thin = tech.thin;
      const drill = tech.drill;
      const w = thin ? 9 : drill ? 26 : 20;
      art = `<g>
        <path d="M-20 232 L64 150 L104 130 L126 96 L142 104 L112 148 L80 176 L24 250 Z" fill="${c1}" opacity=".14"/>
        <path d="M-10 224 L74 142 L112 118 L132 84 L146 92 L118 140 L84 168 L26 244 Z" fill="${c2}" opacity=".25"/>
        <path d="M0 216 L80 136 L118 110 L136 78 L${136 + w * 0.4} ${78 + w * 0.4} L${118 + w} ${110 + w} L${80 + w} ${136 + w} L${w} 220 Z" fill="url(#beam${id})" opacity=".95"/>
        <path d="M6 214 L84 134 M14 220 L90 142 M26 228 L98 150" stroke="${c1}" stroke-width="2" opacity=".85"/>
        <circle cx="138" cy="74" r="${drill ? 24 : 14}" fill="${c1}" opacity=".28"/>
        <circle cx="138" cy="74" r="${drill ? 12 : 6}" fill="#fff" opacity=".8"/>
        <g stroke="${c1}" stroke-width="2" opacity=".8"><path d="M162 50 L180 34 M166 78 L188 74 M152 38 L160 18"/></g>
        <g fill="${c1}" opacity=".8"><circle cx="170" cy="110" r="2"/><circle cx="44" cy="190" r="1.6"/><circle cx="122" cy="54" r="1.4"/></g>
      </g>`;
    } else if (tech.kind === 'disc') {
      art = `<g transform="rotate(-18 100 116)">
        <circle cx="100" cy="116" r="58" fill="${c2}" opacity=".12"/>
        <circle cx="100" cy="116" r="44" fill="none" stroke="${c1}" stroke-width="14" opacity=".92"/>
        <circle cx="100" cy="116" r="44" fill="none" stroke="#fff" stroke-width="4" opacity=".55" stroke-dasharray="10 14"/>
        <circle cx="100" cy="116" r="18" fill="${c2}" opacity=".25"/>
        <g stroke="${c1}" stroke-width="2" opacity=".65" stroke-linecap="round">
          <path d="M22 116 L4 116 M196 116 L178 116 M100 38 L100 18 M100 194 L100 214"/>
          <path d="M45 61 L30 46 M155 171 L170 186 M155 61 L170 46 M45 171 L30 186"/>
        </g>
        <g stroke="${c1}" stroke-width="2" opacity=".55"><path d="M12 70 Q46 108 74 100"/><path d="M188 70 Q154 108 126 100"/></g>
      </g>`;
    } else if (tech.kind === 'shield') {
      art = `<g>
        <g opacity=".55" stroke="${c1}" stroke-width="3" fill="none">
          <path d="M60 178 C44 168 40 152 44 132"/><path d="M140 178 C156 168 160 152 156 132"/>
          <path d="M52 210 C62 188 78 178 100 178 C122 178 138 188 148 210"/>
        </g>
        <path d="M100 34 L156 58 L148 142 L100 194 L52 142 L44 58 Z" fill="${c2}" opacity=".16"/>
        <path d="M100 34 L156 58 L148 142 L100 194 L52 142 L44 58 Z" fill="none" stroke="${c1}" stroke-width="3.4"/>
        <path d="M100 52 L138 68 L132 132 L100 170 L68 132 L62 68 Z" fill="none" stroke="${c1}" stroke-width="1.8" opacity=".55"/>
        <path d="M100 74 L120 84 L116 124 L100 144 L84 124 L80 84 Z" fill="${c1}" opacity=".35"/>
        <path d="M100 74 L100 144 M80 84 L120 84" stroke="${c1}" stroke-width="1.6" opacity=".65"/>
        <g fill="${c1}" opacity=".8"><circle cx="100" cy="58" r="2"/><circle cx="100" cy="174" r="2"/><circle cx="56" cy="100" r="1.6"/><circle cx="144" cy="100" r="1.6"/></g>
      </g>`;
    } else if (tech.kind === 'scouter') {
      art = `<g transform="rotate(-8 100 116)">
        <rect x="34" y="74" width="132" height="86" rx="28" fill="#0b2a20" stroke="${c1}" stroke-width="2.4"/>
        <path d="M48 116 Q100 80 152 116 Q100 152 48 116 Z" fill="#062016" stroke="${c1}" stroke-width="2"/>
        <path d="M54 116 Q100 88 146 116 Q100 144 54 116 Z" fill="${c2}" opacity=".25"/>
        <text x="66" y="106" font-family="monospace" font-size="10" fill="${c1}" opacity=".95">PWR 104,000</text>
        <text x="66" y="132" font-family="monospace" font-size="8" fill="${c1}" opacity=".8">TARGET LOCKED</text>
        <path d="M34 112 C18 108 10 96 8 82 M34 122 C16 122 6 132 4 146" fill="none" stroke="${c1}" stroke-width="3" opacity=".6"/>
        <circle cx="118" cy="119" r="3" fill="${c1}"/>
        <g fill="${c1}" opacity=".7"><circle cx="164" cy="48" r="2"/><circle cx="34" cy="174" r="1.6"/></g>
      </g>`;
    } else if (tech.kind === 'aura') {
      const ch = CHARACTERS.goku;
      art = `<g opacity=".9">${renderCharacter(ch, { faction: 'saiyan', label: 'Power surge' }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`;
    }
    return `<svg viewBox="0 0 200 240" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="tbg${id}" cx="50%" cy="42%" r="82%">
          <stop offset="0" stop-color="${bg1}"/><stop offset=".8" stop-color="${bg2}"/><stop offset="1" stop-color="#020208"/>
        </radialGradient>
        <radialGradient id="orb${id}" cx="38%" cy="34%" r="68%">
          <stop offset="0" stop-color="#fff"/><stop offset=".22" stop-color="${c1}"/>
          <stop offset=".66" stop-color="${c2}"/><stop offset="1" stop-color="${c2}" stop-opacity=".25"/>
        </radialGradient>
        <linearGradient id="beam${id}" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="${c2}" stop-opacity=".25"/><stop offset=".45" stop-color="${c1}" stop-opacity=".9"/>
          <stop offset=".7" stop-color="#fff"/><stop offset="1" stop-color="${c1}" stop-opacity=".4"/>
        </linearGradient>
      </defs>
      <rect width="200" height="240" fill="url(#tbg${id})"/>
      ${speedLines(id, c1)}
      <g opacity=".35" fill="${c1}"><circle cx="30" cy="44" r="1.6"/><circle cx="170" cy="52" r="1.2"/><circle cx="180" cy="180" r="1.8"/><circle cx="24" cy="190" r="1.4"/></g>
      ${tech.kind === 'aura' ? '<g opacity=".55"><rect width="200" height="240" fill="#05030a"/></g>' : ''}
      ${art}
      <rect width="200" height="240" fill="none" stroke="${c1}" stroke-width="1" opacity=".2"/>
    </svg>`;
  }

  /* ================================================================== *
   * Public API
   * ================================================================== */
  function art(key, opts) {
    opts = opts || {};
    if (TECHNIQUES[key]) return renderTechnique(key, TECHNIQUES[key], opts);
    const cfg = CHARACTERS[key] || CHARACTERS.martial_artist;
    return renderCharacter(cfg, opts);
  }

  function avatar(key, faction) {
    return art(key, { faction: faction || 'saiyan' });
  }

  return {
    CHARACTERS, TECHNIQUES, FACTION_BG,
    art, avatar, esc
  };
});
