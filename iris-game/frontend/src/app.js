/**
 * IRIS GAME — 3D Fashion Doll Edition (Tec Lerdo)
 * Orden oficial: 1. JACKY, 2. LUCY, 3. XIMENA, 4. VALERIA
 */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const $ = (id) => document.getElementById(id);

  /* ------------------------------------------------------------------ */
  /* 1. IDENTIDADES ORIGINALES (ORDEN: JACKY, LUCY, XIMENA, VALERIA)    */
  /* ------------------------------------------------------------------ */
  const PROFILES = {
    JACKY: {
      subtitle: 'Blazer burdeos & balayage caramelo',
      skinColor: '#f0cbb0',
      hairStyle: 'long',
      hairColor: '#3b2113',
      streak: '#b67b48',
      lipstick: '#c86d78',
      topOutfit: 'blazer',
      bottomOutfit: 'pleated_skirt',
      accessories: [],
      gadgets: []
    },
    LUCY: {
      subtitle: 'Camisa rosa & falda corta con abertura',
      skinColor: '#f6d5be',
      hairStyle: 'chest',
      hairColor: '#050408',
      streak: '#b89060',
      lipstick: '#e08694',
      topOutfit: 'blouse_off',
      bottomOutfit: 'mini_skirt',
      accessories: ['silk_ribbon'],
      gadgets: []
    },
    XIMENA: {
      subtitle: 'Blusa cruzada lila & bob negro azabache',
      skinColor: '#e2a882',
      hairStyle: 'bob',
      hairColor: '#050408',
      streak: '#0f0c16',
      lipstick: '#b87678',
      topOutfit: 'corset_top',
      bottomOutfit: 'denim_skirt',
      accessories: ['hair_clip'],
      gadgets: []
    },
    VALERIA: {
      subtitle: 'Cabello chino & gafas redondas',
      skinColor: '#f2ccb2',
      hairStyle: 'curly',
      hairColor: '#3d2212',
      streak: '#8c5a37',
      lipstick: '#d47c84',
      topOutfit: 'crop_y2k',
      bottomOutfit: 'flare_jeans',
      accessories: [],
      gadgets: ['glasses']
    }
  };

  const BASE = {
    character: 'JACKY',
    topOutfit: 'blazer',
    bottomOutfit: 'pleated_skirt',
    lipstick: '#c86d78',
    lipFinish: 'gloss',
    eyeshadow: 'rgba(201,140,166,0.45)',
    blush: 'rgba(230,149,168,0.40)',
    lashes: true,
    accessories: [],
    gadgets: [],
    pose: 'normal',
    expression: 'happy'
  };

  const freshState = (ch) => {
    const p = PROFILES[ch];
    return Object.assign({}, BASE, p, {
      character: ch,
      accessories: [...(p.accessories || [])],
      gadgets: [...(p.gadgets || [])]
    });
  };

  const STATES_BY_CHAR = {
    JACKY: freshState('JACKY'),
    LUCY: freshState('LUCY'),
    XIMENA: freshState('XIMENA'),
    VALERIA: freshState('VALERIA')
  };

  let activeChar = 'JACKY';
  let S = STATES_BY_CHAR[activeChar];

  /* ------------------------------------------------------------------ */
  /* 2. ESTILOS ENCAPSULADOS Y DOM DE SELECCIÓN + ESTUDIO 6 CATEGORÍAS  */
  /* ------------------------------------------------------------------ */
  function injectScopedStyles() {
    if ($('iris-scoped-select-css')) return;
    const st = document.createElement('style');
    st.id = 'iris-scoped-select-css';
    st.textContent = `
      #iris-select-screen {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        overflow-y: auto;
        z-index: 40;
        max-width: none;
        margin: 0;
        padding: 22px clamp(18px, 4vw, 48px) 30px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 18px;
        background: radial-gradient(circle at 50% 25%, #4d225c 0%, #2a1038 58%, #16071e 100%);
        border-radius: 0;
        box-shadow: none;
      }
      #iris-select-screen.hidden { display: none !important; }
      #iris-select-screen .sel-head,
      #iris-select-screen .sel-grid,
      #iris-select-screen .sel-cta {
        width: 100%;
        max-width: 1280px;
      }
      #iris-select-screen .sel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        text-align: center;
      }
      #iris-select-screen .sel-head .btn-ghost {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.35);
      }
      #iris-select-screen .sel-titles .eyebrow {
        color: #f4a8dc;
        letter-spacing: 0.14em;
      }
      #iris-select-screen .sel-titles h2 {
        font-size: clamp(28px, 4.2vw, 46px);
        letter-spacing: 0.05em;
        background: linear-gradient(90deg, #ff85c8, #e5b8ff, #ff85c8);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        filter: drop-shadow(0 3px 10px rgba(255, 116, 184, 0.35));
      }
      #iris-select-screen .sel-subtitle {
        margin-top: 6px;
        font-family: 'Nunito', sans-serif;
        font-weight: 800;
        font-size: 15.5px;
        color: #ebd4f5;
      }
      #iris-select-screen .sel-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
      }
      #iris-select-screen .doll-card-3d {
        position: relative;
        background: linear-gradient(180deg, rgba(94, 43, 112, 0.78) 0%, rgba(36, 14, 48, 0.92) 100%);
        border: 3px solid rgba(255, 255, 255, 0.32);
        border-radius: 24px;
        padding: 12px 10px 14px;
        text-align: center;
        color: #ffffff;
        cursor: pointer;
        box-shadow: 0 14px 32px rgba(15, 4, 22, 0.45);
        transition: transform 0.28s cubic-bezier(.22,.61,.36,1), box-shadow 0.28s ease, border-color 0.28s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      #iris-select-screen .doll-card-3d:hover {
        transform: translateY(-6px) scale(1.015);
        border-color: rgba(255, 168, 222, 0.78);
        box-shadow: 0 20px 44px rgba(186, 104, 245, 0.35);
      }
      #iris-select-screen .doll-card-3d.selected {
        border-color: #ff7cc8;
        box-shadow: 0 0 0 3px rgba(255, 124, 200, 0.45), 0 0 34px rgba(232, 121, 249, 0.45);
        transform: translateY(-10px) scale(1.03);
        background: linear-gradient(180deg, rgba(126, 56, 148, 0.90) 0%, rgba(48, 18, 64, 0.96) 100%);
      }
      #iris-select-screen .sel-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 2;
        padding: 4px 11px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        background: rgba(255, 255, 255, 0.16);
        color: #ffffff;
        backdrop-filter: blur(4px);
      }
      #iris-select-screen .doll-card-3d.selected .sel-badge {
        background: linear-gradient(90deg, #ff74b8, #9b6ef3);
      }
      #iris-select-screen .doll-mini-canvas {
        width: 100%;
        height: 330px;
        border-radius: 16px;
        display: block;
        margin-bottom: 8px;
      }
      #iris-select-screen .doll-card-3d h3 {
        font-size: 23px;
        letter-spacing: 0.12em;
        color: #ffd9ef;
      }
      #iris-select-screen .doll-card-3d p {
        margin-top: 3px;
        font-family: 'Nunito', sans-serif;
        font-size: 12px;
        font-weight: 700;
        color: #e4c6f0;
      }
      #iris-select-screen .sel-cta { text-align: center; }
      #iris-select-screen .sel-confirm-btn {
        width: min(370px, 90vw);
        padding: 15px 24px;
        border-radius: 999px;
        border: 3px solid #ffffff;
        background: linear-gradient(90deg, #ff74b8, #9b6ef3);
        color: #ffffff;
        font-weight: 800;
        font-size: 16px;
        letter-spacing: 0.05em;
        box-shadow: 0 6px 0 #6e3be0, 0 14px 28px rgba(255, 116, 184, 0.35);
        cursor: pointer;
        transition: transform 0.2s ease;
      }
      #iris-select-screen .sel-confirm-btn:hover { transform: translateY(-2px); }
      #screen-editor .tabs { grid-template-columns: repeat(6, 1fr); }
      #screen-editor .tab span { font-size: 10px; }
      .multi-hint {
        font-size: 11.5px;
        color: #8b5cf6;
        font-weight: 700;
        margin-bottom: 6px;
      }
      @media (max-width: 960px) {
        #iris-select-screen .sel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        #screen-editor .tabs { grid-template-columns: repeat(3, 1fr); }
      }
      @media (max-width: 540px) {
        #iris-select-screen .sel-grid { grid-template-columns: 1fr; }
      }
        #resultModal .modal-card,
      #resultModal .modal-box {
        max-width: 560px;
        width: 92vw;
        max-height: 90vh;
        overflow-y: auto;
      }
      #previewImage {
        max-height: 310px;
        width: auto;
        max-width: 100%;
        object-fit: contain;
        border-radius: 16px;
        display: block;
        margin: 0 auto 12px;
      }
    `;
    document.head.appendChild(st);
  }

  function ensureSelectionAndStudioDOM() {
    injectScopedStyles();
    const menuEl = $('screen-menu');
    const editorEl = $('screen-editor');

    if (menuEl && !$('iris-select-screen')) {
      const sec = document.createElement('section');
      sec.id = 'iris-select-screen';
      sec.className = 'screen hidden';
      sec.setAttribute('aria-label', 'Elige a tu personaje');
      sec.innerHTML = `
        <div class="sel-head">
          <button id="btn-sel-to-menu" type="button" class="btn-ghost sm">← Portada</button>
          <div class="sel-titles">
            <p class="eyebrow">COLECCIÓN FASHION DOLL 3D</p>
            <h2>ELIGE A TU PERSONAJE</h2>
            <p class="sel-subtitle">Cuatro estilos, cuatro personalidades. ¿Con quién comenzarás?</p>
          </div>
          <div style="width:92px"></div>
        </div>
        <div id="iris-select-grid" class="sel-grid"></div>
        <div class="sel-cta">
          <button id="btn-confirm-doll" type="button" class="sel-confirm-btn">
            ✨ PERSONALIZAR PERSONAJE
          </button>
        </div>
      `;
      menuEl.insertAdjacentElement('afterend', sec);
    }

    if (editorEl) {
      const nav = editorEl.querySelector('.editor-nav');
      if (nav && !$('btn-reset-doll')) {
        const resetBtn = document.createElement('button');
        resetBtn.id = 'btn-reset-doll';
        resetBtn.type = 'button';
        resetBtn.className = 'btn-ghost sm';
        resetBtn.textContent = '🔄 Restablecer look';
        nav.insertBefore(resetBtn, nav.firstChild);
      }

      const stageTools = editorEl.querySelector('.stage-tools');
      if (stageTools && !$('btn-random-look')) {
        const rndBtn = document.createElement('button');
        rndBtn.id = 'btn-random-look';
        rndBtn.type = 'button';
        rndBtn.className = 'tool-btn';
        rndBtn.textContent = '🎲 Aleatorio';
        stageTools.appendChild(rndBtn);
      }

      const backBtn = $('btn-back-menu');
      if (backBtn) backBtn.textContent = '← Cambiar muñeca';

      const panelCard = editorEl.querySelector('.panel-card');
      if (panelCard) {
        panelCard.innerHTML = `
          <nav class="tabs" role="tablist">
            <button type="button" class="tab tab-btn active" data-tab="tab-makeup">💄<span>Maquillaje</span></button>
            <button type="button" class="tab tab-btn" data-tab="tab-hair">💇‍♀️<span>Cabello</span></button>
            <button type="button" class="tab tab-btn" data-tab="tab-outfit">👗<span>Vestimenta</span></button>
            <button type="button" class="tab tab-btn" data-tab="tab-acc">🎀<span>Accesorios</span></button>
            <button type="button" class="tab tab-btn" data-tab="tab-exp">😊<span>Expresiones</span></button>
            <button type="button" class="tab tab-btn" data-tab="tab-pose">💃<span>Poses</span></button>
          </nav>
          <div class="panel panel-scroll">
            <div id="tab-makeup" class="tab-content active">
              <div class="grp"><h4>Tono de piel</h4><div id="grid-skin" class="swatches"></div></div>
              <div class="grp"><h4>Labial</h4><div id="grid-lip" class="swatches"></div><div id="grid-finish" class="seg-grid" style="margin-top:8px"></div></div>
              <div class="grp"><h4>Sombras</h4><div id="grid-shadow" class="swatches"></div></div>
              <div class="grp"><h4>Rubor</h4><div id="grid-blush" class="swatches"></div></div>
              <div class="grp"><h4>Pestañas</h4><div id="grid-lashes" class="seg-grid"></div></div>
            </div>
            <div id="tab-hair" class="tab-content">
              <div class="grp"><h4>Estilo de peinado</h4><div id="grid-hair" class="items-grid"></div></div>
              <div class="grp"><h4>Color de cabello</h4><div id="grid-haircolor" class="swatches"></div></div>
            </div>
            <div id="tab-outfit" class="tab-content">
              <div class="grp"><h4>Camisa / Parte superior</h4><div id="grid-top" class="items-grid"></div></div>
              <div class="grp"><h4>Pantalón o Falda</h4><div id="grid-bottom" class="items-grid"></div></div>
            </div>
            <div id="tab-acc" class="tab-content">
              <div class="grp">
                <h4>Accesorios de cabello y joyería</h4>
                <p class="multi-hint">✨ Puedes elegir varios accesorios a la vez</p>
                <div id="grid-acc" class="items-grid"></div>
              </div>
              <div class="grp">
                <h4>Bolsos, Lentes y Gadgets</h4>
                <p class="multi-hint">✨ Puedes combinar bolso, teléfono, lentes y más</p>
                <div id="grid-gadget" class="items-grid"></div>
              </div>
            </div>
            <div id="tab-exp" class="tab-content">
              <div class="grp"><h4>Expresión facial</h4><div id="grid-exp" class="items-grid"></div></div>
            </div>
            <div id="tab-pose" class="tab-content">
              <div class="grp"><h4>Pose de selfie y pasarela</h4><div id="grid-pose" class="items-grid"></div></div>
            </div>
          </div>
        `;
      }
    }
  }

  ensureSelectionAndStudioDOM();

  const OPT = {
    pose: [
      ['normal', '🧍‍♀️', 'Normal'],
      ['waving', '👋', 'Saludando'],
      ['blow_kiss', '😘', 'Tirando beso'],
      ['leg_pop', '👠', 'Levantando pie'],
      ['selfie_peace', '🤳', 'Pose selfie'],
      ['celebrate', '✨', 'Alegre / Fiesta']
    ],
    expression: [
      ['happy', '😊', 'Alegre'],
      ['angry', '😠', 'Enojada'],
      ['surprised', '😮', 'Sorprendida'],
      ['sad', '😢', 'Triste'],
      ['inlove', '😍', 'Enamorada'],
      ['wink', '😉', 'Guiño']
    ],
    hairStyle: [
      ['long', '🌊', 'Largo ondas'],
      ['bob', '✂️', 'Bob hombros'],
      ['chest', '✨', 'Largo pecho'],
      ['curly', '🌀', 'Rizado chino'],
      ['pigtails', '🎀', 'Coletas'],
      ['updo', '👸', 'Recogido + mechones'],
      ['short', '⚡', 'Pixie'],
    ],
    topOutfit: [
      ['blazer', '🧥', 'Blazer & Camisa', '#7a1d38'],
      ['crop_y2k', '👚', 'Crop Top Rosa', '#f472b6'],
      ['blouse_off', '🎀', 'Blusa Hombros', '#ec4899'],
      ['hoodie_crop', '💗', 'Sudadera Crop', '#c084fc'],
      ['corset_top', '✨', 'Top Corsé Lila', '#7c3aed'],
      ['shirt_tie', '👔', 'Camisa & Corbata', '#1e3a8a']
    ],
    bottomOutfit: [
      ['pleated_skirt', '👗', 'Falda Plisada', '#881337'],
      ['mini_skirt', '💃', 'Minifalda Abertura', '#be185d'],
      ['denim_skirt', '🫐', 'Falda Mezclilla', '#2563eb'],
      ['flare_jeans', '👖', 'Jeans Acampanados', '#1d4ed8'],
      ['cargo_pants', '🖤', 'Pantalón Recto', '#334155'],
      ['shorts_denim', '🩳', 'Short Mezclilla', '#3b82f6']
    ],
    accessory: [
      ['none', '🚫', 'Ninguno'],
      ['hair_clip', '📎', 'Broche en pelo'],
      ['silk_ribbon', '🎀', 'Lazo satinado'],
      ['bow', '🌸', 'Moño coqueto'],
      ['tiara', '👑', 'Tiara'],
      ['pearls', '🦪', 'Aretes perla']
    ],
    gadget: [
      ['none', '🚫', 'Ninguno'],
      ['shoulder_bag', '👜', 'Mochila al brazo'],
      ['smartphone', '📱', 'Teléfono celular'],
      ['glasses', '👓', 'Gafas redondas'],
      ['headphones', '🎧', 'Audífonos'],
      ['laptop', '💻', 'Laptop'],
      ['mirror', '🪞', 'Espejo']
    ]
  };

  const SW = {
    skinColor: ['#f6d5be', '#f2ccb2', '#f0cbb0', '#e2a882', '#c88e60', '#96613a'],
    hairColor: ['#050408', '#3b2113', '#3d2212', '#8c623e', '#c29b6b', '#d98aa6', '#7b9ec9', '#a693d6', '#b85c6e'],
    lipstick: ['none', '#c86d78', '#b87678', '#e08694', '#cc6880', '#9e3e52', '#d4826c'],
    eyeshadow: ['none', 'rgba(201,140,166,0.45)', 'rgba(166,147,214,0.45)', 'rgba(212,148,108,0.45)', 'rgba(123,158,201,0.45)'],
    blush: ['none', 'rgba(230,149,168,0.40)', 'rgba(238,172,186,0.44)', 'rgba(212,148,108,0.38)', 'rgba(166,147,214,0.36)']
  };

  const cssOf = (c) => (c === 'none' ? '#eee' : c.replace(/rgba\(([^)]+),[^,)]+\)/, 'rgb($1)'));

  /* ------------------------------------------------------------------ */
  /* 3. AUDIO SINTETIZADO + SFX                                         */
  /* ------------------------------------------------------------------ */
  const Snd = {
    ctx: null, master: null, bgm: null, sfx: null, on: false, userOff: false, timer: null, step: 0, next: 0, noise: null,
    init() {
      if (this.ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.bgm = this.ctx.createGain();
      this.bgm.gain.value = 0.55;
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.9;
      this.bgm.connect(lp);
      lp.connect(this.master);
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      return true;
    },
    hz: (m) => 440 * Math.pow(2, (m - 69) / 12),
    tone(dest, t, midiOrHz, dur, type, vol, isHz) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.value = isHz ? midiOrHz : this.hz(midiOrHz);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(dest);
      o.start(t);
      o.stop(t + dur + 0.05);
    },
    hat(t) {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise;
      f.type = 'highpass';
      f.frequency.value = 6500;
      g.gain.setValueAtTime(0.025, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      s.connect(f);
      f.connect(g);
      g.connect(this.bgm);
      s.start(t);
      s.stop(t + 0.06);
    },
    schedule() {
      const CH = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
      const ME = [[72, 0, 76, 0, 79, 0, 76, 74], [71, 0, 74, 0, 76, 79, 0, 0], [69, 0, 72, 0, 74, 0, 72, 69], [67, 0, 72, 76, 0, 79, 0, 0]];
      const dur = 60 / 76 / 2;
      while (this.next < this.ctx.currentTime + 0.4) {
        const bar = Math.floor(this.step / 8) % 4, k = this.step % 8, t = this.next;
        if (k === 0) CH[bar].forEach(n => this.tone(this.bgm, t, n, dur * 8, 'triangle', 0.045));
        if (k === 0 || k === 4) this.tone(this.bgm, t, CH[bar][0] - 12, dur * 3, 'sine', 0.12);
        if (ME[bar][k]) this.tone(this.bgm, t, ME[bar][k], dur * 2.2, 'sine', 0.07);
        if (k % 2 === 1) this.hat(t);
        this.next += dur;
        this.step++;
      }
    },
    startBGM() {
      if (!this.init()) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.timer) return;
      this.next = this.ctx.currentTime + 0.1;
      this.step = 0;
      this.timer = setInterval(() => this.schedule(), 120);
    },
    stopBGM() {
      clearInterval(this.timer);
      this.timer = null;
    },
    setOn(v) {
      this.on = v;
      if (v) this.startBGM();
      else this.stopBGM();
      document.querySelectorAll('.audio-ico').forEach(e => { e.textContent = v ? '🎵' : '🔇'; });
      ['menu-audio-btn', 'audio-toggle-btn'].forEach(id => {
        const el = $(id);
        if (el) el.setAttribute('aria-pressed', String(v));
      });
    },
    fx(kind) {
      if (!this.on || !this.init()) return;
      const t = this.ctx.currentTime, d = this.sfx;
      if (kind === 'pop') { this.tone(d, t, 660, 0.09, 'sine', 0.22, true); this.tone(d, t + 0.04, 990, 0.1, 'sine', 0.14, true); }
      else if (kind === 'chime') { [1047, 1319, 1568].forEach((f, i) => this.tone(d, t + i * 0.07, f, 0.28, 'triangle', 0.16, true)); }
      else if (kind === 'tab') { this.tone(d, t, 520, 0.07, 'triangle', 0.18, true); }
      else if (kind === 'back') { this.tone(d, t, 440, 0.1, 'sine', 0.18, true); this.tone(d, t + 0.06, 330, 0.12, 'sine', 0.14, true); }
      else if (kind === 'win') { [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(d, t + i * 0.09, f, 0.4, 'triangle', 0.16, true)); }
    }
  };

  /* ------------------------------------------------------------------ */
  /* 4. VISOR 3D PRINCIPAL DEL ESTUDIO                                  */
  /* ------------------------------------------------------------------ */
  const canvas = $('avatarCanvas');
  const main3D = window.IrisAvatar3D.setupScene(canvas, 3.85, 0.98);
  let currentModel = null;
  let targetRotY = 0;
  let angVel = 0;
  let skirtPhys = { rotZ: 0, velZ: 0 };
  let hairPhys = { rotZ: 0, velZ: 0 };

  let dragging = false, prevX = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button === 0 && !e.shiftKey) {
      dragging = true;
      prevX = e.clientX;
      canvas.style.cursor = 'grabbing';
    }
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - prevX;
    prevX = e.clientX;
    angVel = dx * 0.015;
    targetRotY += angVel;
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
    canvas.style.cursor = 'grab';
  });

  function render() {
    if (currentModel && main3D && main3D.scene) {
      main3D.scene.remove(currentModel.root);
    }
    currentModel = window.IrisAvatar3D.buildModel(S);
    if (currentModel && main3D && main3D.scene) {
      currentModel.root.rotation.y = targetRotY;
      main3D.scene.add(currentModel.root);
    }
    const label = $('char-name');
    if (label) label.textContent = S.character;
  }

  const clock = new THREE.Clock();
  function animateMain() {
    requestAnimationFrame(animateMain);
    if (!currentModel || !main3D) return;
    const t = clock.getElapsedTime();

    currentModel.root.rotation.y += (targetRotY - currentModel.root.rotation.y) * 0.15;
    if (!dragging) angVel *= 0.90;

    const baseY = currentModel.baseHeadY ?? 1.418;
    currentModel.headGroup.position.y = baseY + Math.sin(t * 2) * 0.003;

    const force = angVel * 0.18;
    skirtPhys.velZ += (-skirtPhys.rotZ * 0.28 + force * 0.10) - skirtPhys.velZ * 0.22;
    skirtPhys.rotZ += skirtPhys.velZ;
    if (currentModel.skirtGroup) {
      currentModel.skirtGroup.rotation.z = THREE.MathUtils.clamp(skirtPhys.rotZ, -0.028, 0.028);
    }

    hairPhys.velZ += (-hairPhys.rotZ * 0.18 + angVel * 0.28) - hairPhys.velZ * 0.16;
    hairPhys.rotZ += hairPhys.velZ;
    currentModel.hairStrands.forEach(s => {
      const wind = Math.sin(t * 2.0 + s.phase) * 0.014;
      s.mesh.rotation.z = THREE.MathUtils.clamp(hairPhys.rotZ * 0.35 + wind, -0.14, 0.14);
    });

    main3D.renderer.render(main3D.scene, main3D.camera);
  }
  animateMain();

  /* ------------------------------------------------------------------ */
  /* 5. PANTALLA DE SELECCIÓN (1. JACKY, 2. LUCY, 3. XIMENA, 4. VALERIA)*/
  /* ------------------------------------------------------------------ */
  const selectScenes = [];
  const selectGrid = $('iris-select-grid');

  function updateSelectUI() {
    if (selectGrid) {
      selectGrid.querySelectorAll('.doll-card-3d').forEach(card => {
        const isSelected = card.dataset.char === activeChar;
        card.classList.toggle('selected', isSelected);
        const badge = card.querySelector('.sel-badge');
        if (badge) badge.textContent = isSelected ? '★ Seleccionada' : 'Elegir';
      });
    }
    const confirmBtn = $('btn-confirm-doll');
    if (confirmBtn) confirmBtn.textContent = `✨ PERSONALIZAR A ${activeChar}`;
  }

  function buildSelectionCards() {
    if (!selectGrid) return;
    selectGrid.innerHTML = '';

    ['JACKY', 'LUCY', 'XIMENA', 'VALERIA'].forEach((name, idx) => {
      const card = document.createElement('div');
      card.className = 'doll-card-3d' + (name === activeChar ? ' selected' : '');
      card.dataset.char = name;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      const pill = document.createElement('span');
      pill.className = 'sel-badge';
      pill.textContent = name === activeChar ? '★ Seleccionada' : 'Elegir';
      card.appendChild(pill);

      const c = document.createElement('canvas');
      c.width = 230;
      c.height = 350;
      c.className = 'doll-mini-canvas';
      card.appendChild(c);

      const title = document.createElement('h3');
      title.textContent = name;
      card.appendChild(title);

      const sub = document.createElement('p');
      sub.textContent = PROFILES[name].subtitle;
      card.appendChild(sub);

      try {
        const mini3D = window.IrisAvatar3D.setupScene(c, 3.88, 0.94);
        const spotlight = new THREE.PointLight(0xff85c8, 0.0, 4.0);
        spotlight.position.set(0, 1.45, 1.35);
        mini3D.scene.add(spotlight);

        const origModel = window.IrisAvatar3D.buildModel(freshState(name));
        mini3D.scene.add(origModel.root);
        mini3D.renderer.render(mini3D.scene, mini3D.camera);
        selectScenes.push({ mini3D, origModel, spotlight, phase: idx * 1.1, card, name });
      } catch (err) {
        const ctx2d = c.getContext('2d');
        if (ctx2d) {
          ctx2d.fillStyle = PROFILES[name].hairColor;
          ctx2d.beginPath();
          ctx2d.arc(115, 175, 48, 0, TAU);
          ctx2d.fill();
        }
      }

      const pick = () => {
        activeChar = name;
        S = STATES_BY_CHAR[activeChar];
        Snd.fx('pop');
        updateSelectUI();
      };

      card.addEventListener('click', pick);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      });

      selectGrid.appendChild(card);
    });
  }

  function animateSelectionPreviews() {
    requestAnimationFrame(animateSelectionPreviews);
    const selectEl = $('iris-select-screen');
    if (!selectEl || selectEl.classList.contains('hidden')) return;
    const t = clock.getElapsedTime();
    selectScenes.forEach(item => {
      const isSelected = item.name === activeChar;
      const isHovered = item.card.matches(':hover') || isSelected;
      item.spotlight.intensity = isSelected ? 0.95 : (isHovered ? 0.45 : 0.0);
      item.origModel.root.position.y = isSelected ? 0.03 + Math.sin(t * 2.2) * 0.012 : 0;
      item.origModel.root.rotation.y = isHovered
        ? Math.sin(t * 1.6 + item.phase) * 0.30
        : Math.sin(t * 0.75 + item.phase) * 0.08;
      item.mini3D.renderer.render(item.mini3D.scene, item.mini3D.camera);
    });
  }

  buildSelectionCards();
  animateSelectionPreviews();

  /* ------------------------------------------------------------------ */
  /* 6. CONSTRUCCIÓN DE HERRAMIENTAS DEL ESTUDIO (SELECCIÓN MÚLTIPLE)   */
  /* ------------------------------------------------------------------ */
  const grids = [];

  function sync() {
    grids.forEach(({ el, key, multi }) => {
      if (!el) return;
      el.querySelectorAll('[data-v]').forEach(b => {
        const val = b.dataset.v;
        if (multi) {
          const arr = Array.isArray(S[key]) ? S[key] : [];
          const isActive = val === 'none' ? arr.length === 0 : arr.includes(val);
          b.classList.toggle('active', isActive);
        } else {
          b.classList.toggle('active', val === String(S[key]));
        }
      });
    });
  }

  function setValue(key, value, sfx = 'pop') {
    S[key] = value;
    Snd.fx(sfx);
    sync();
    render();
  }

  function toggleMultiValue(key, value, sfx = 'pop') {
    if (!Array.isArray(S[key])) S[key] = [];
    if (value === 'none') {
      S[key] = [];
    } else {
      const idx = S[key].indexOf(value);
      if (idx >= 0) S[key].splice(idx, 1);
      else S[key].push(value);
    }
    Snd.fx(sfx);
    sync();
    render();
  }

  function buildItems(id, key, list, multi = false) {
    const el = $(id);
    if (!el) return;
    el.innerHTML = '';
    list.forEach(([v, icon, label, bg]) => {
      const b = document.createElement('button');
      b.className = 'item';
      b.dataset.v = v;
      b.type = 'button';
      b.innerHTML = `<span class="bubble"${bg ? ` style="background:${bg};color:#fff"` : ''}>${icon}</span><span>${label}</span>`;
      b.addEventListener('click', (e) => {
        e.preventDefault();
        if (multi) toggleMultiValue(key, v);
        else setValue(key, v);
      });
      el.appendChild(b);
    });
    grids.push({ el, key, multi });
  }

  function buildSwatches(id, key, list, onPick) {
    const el = $(id);
    if (!el) return;
    el.innerHTML = '';
    list.forEach(v => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.dataset.v = v;
      b.type = 'button';
      b.style.background = cssOf(v);
      b.setAttribute('aria-label', v === 'none' ? 'Ninguno' : 'Color ' + cssOf(v));
      if (v === 'none') b.textContent = '✕';
      b.addEventListener('click', (e) => {
        e.preventDefault();
        if (onPick) onPick(v);
        else setValue(key, v);
      });
      el.appendChild(b);
    });
    grids.push({ el, key, multi: false });
  }

  function buildSeg(id, key, list) {
    const el = $(id);
    if (!el) return;
    el.innerHTML = '';
    list.forEach(([v, label]) => {
      const b = document.createElement('button');
      b.dataset.v = String(v);
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', (e) => {
        e.preventDefault();
        setValue(key, v);
      });
      el.appendChild(b);
    });
    grids.push({ el, key, multi: false });
  }

  buildSwatches('grid-skin', 'skinColor', SW.skinColor);
  buildSwatches('grid-lip', 'lipstick', SW.lipstick);
  buildSeg('grid-finish', 'lipFinish', [['gloss', '✨ Gloss brillante'], ['mate', '🌸 Mate']]);
  buildSwatches('grid-shadow', 'eyeshadow', SW.eyeshadow);
  buildSwatches('grid-blush', 'blush', SW.blush);
  buildSeg('grid-lashes', 'lashes', [[true, 'Con pestañas'], [false, 'Sin pestañas']]);

  buildItems('grid-hair', 'hairStyle', OPT.hairStyle);
  buildSwatches('grid-haircolor', 'hairColor', SW.hairColor, (v) => {
    S.hairColor = v;
    S.streak = null;
    Snd.fx('pop');
    sync();
    render();
  });

  buildItems('grid-top', 'topOutfit', OPT.topOutfit);
  buildItems('grid-bottom', 'bottomOutfit', OPT.bottomOutfit);
  buildItems('grid-acc', 'accessories', OPT.accessory, true);
  buildItems('grid-gadget', 'gadgets', OPT.gadget, true);
  buildItems('grid-exp', 'expression', OPT.expression);
  buildItems('grid-pose', 'pose', OPT.pose);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      Snd.fx('tab');
      const targetId = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === targetId));
      const scroller = document.querySelector('.panel-scroll');
      if (scroller) scroller.scrollTop = 0;
    });
  });

  /* ------------------------------------------------------------------ */
  /* 7. BOTÓN ALEATORIO Y NAVEGACIÓN ENTRE PANTALLAS                    */
  /* ------------------------------------------------------------------ */
  const pickRand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  if ($('btn-random-look')) {
    $('btn-random-look').addEventListener('click', (e) => {
      e.preventDefault();
      Snd.fx('chime');
      S.hairStyle = pickRand(OPT.hairStyle)[0];
      S.hairColor = pickRand(SW.hairColor);
      S.streak = null;
      S.topOutfit = pickRand(OPT.topOutfit)[0];
      S.bottomOutfit = pickRand(OPT.bottomOutfit)[0];
      S.lipstick = pickRand(SW.lipstick);
      S.eyeshadow = pickRand(SW.eyeshadow);
      S.blush = pickRand(SW.blush);

      const validAcc = OPT.accessory.filter(x => x[0] !== 'none').map(x => x[0]);
      const validGad = OPT.gadget.filter(x => x[0] !== 'none').map(x => x[0]);
      S.accessories = [pickRand(validAcc)];
      S.gadgets = [pickRand(validGad)];

      S.expression = pickRand(OPT.expression)[0];
      S.pose = pickRand(OPT.pose)[0];
      sync();
      render();
    });
  }

  const menu = $('screen-menu');
  const selectScreen = $('iris-select-screen');
  const editor = $('screen-editor');

  const showSelectionScreen = () => {
    if (!Snd.userOff) Snd.setOn(true);
    Snd.fx('chime');
    menu.classList.add('hidden');
    editor.classList.add('hidden');
    selectScreen.classList.remove('hidden');
    updateSelectUI();
  };

  const enterEditor = () => {
    Snd.fx('chime');
    S = STATES_BY_CHAR[activeChar];
    selectScreen.classList.add('hidden');
    menu.classList.add('hidden');
    editor.classList.remove('hidden');
    targetRotY = 0;
    if (window.IrisAvatar3D && window.IrisAvatar3D.onResize) {
      window.IrisAvatar3D.onResize();
    }
    sync();
    render();
  };

  if ($('btn-start-game')) {
    $('btn-start-game').addEventListener('click', (e) => {
      e.preventDefault();
      showSelectionScreen();
    });
  }

  if ($('btn-sel-to-menu')) {
    $('btn-sel-to-menu').addEventListener('click', (e) => {
      e.preventDefault();
      Snd.fx('back');
      selectScreen.classList.add('hidden');
      menu.classList.remove('hidden');
    });
  }

  if ($('btn-confirm-doll')) {
    $('btn-confirm-doll').addEventListener('click', (e) => {
      e.preventDefault();
      enterEditor();
    });
  }

  if ($('btn-back-menu')) {
    $('btn-back-menu').addEventListener('click', (e) => {
      e.preventDefault();
      Snd.fx('back');
      editor.classList.add('hidden');
      selectScreen.classList.remove('hidden');
      updateSelectUI();
    });
  }

  if ($('btn-reset-doll')) {
    $('btn-reset-doll').addEventListener('click', (e) => {
      e.preventDefault();
      Snd.fx('back');
      STATES_BY_CHAR[activeChar] = freshState(activeChar);
      S = STATES_BY_CHAR[activeChar];
      targetRotY = 0;
      if (window.IrisAvatar3D && window.IrisAvatar3D.resetCam) {
        window.IrisAvatar3D.resetCam();
      }
      sync();
      render();
    });
  }

  ['menu-audio-btn', 'audio-toggle-btn'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('click', () => {
      const next = !Snd.on;
      Snd.userOff = !next;
      Snd.setOn(next);
    });
  });

  /* ------------------------------------------------------------------ */
  /* 8. EVALUAR / EXPORTAR PNG + CONSULTA DE HISTORIAL BD               */
  /* ------------------------------------------------------------------ */
  const LOOK_CACHE_KEY = 'iris_saved_looks_cache_v1';

  function getLookCache() {
    try {
      return JSON.parse(localStorage.getItem(LOOK_CACHE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function saveLookCache(id, snapshot, previewUrl) {
    if (!id) return;
    try {
      const cache = getLookCache();
      cache[String(id)] = {
        state: JSON.parse(JSON.stringify(snapshot)),
        preview: previewUrl || ''
      };
      // Mantener los últimos 40 looks en caché local
      const keys = Object.keys(cache);
      if (keys.length > 40) delete cache[keys[0]];
      localStorage.setItem(LOOK_CACHE_KEY, JSON.stringify(cache));
    } catch (_) {}
  }

  function splitCsvItems(val) {
    if (Array.isArray(val)) return val.filter((x) => x && x !== 'none');
    if (!val || val === 'none') return [];
    return String(val)
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== 'none');
  }

  function restoreLookToStudio(item, cachedEntry) {
    const rawChar = String(
      (cachedEntry && cachedEntry.state && cachedEntry.state.character) ||
      item.model_id ||
      item.modelId ||
      'JACKY'
    ).toUpperCase();
    const charKey = PROFILES[rawChar] ? rawChar : 'JACKY';

    // 1. Partir del estado base del personaje
    const restored = freshState(charKey);

    // 2. Aplicar campos devueltos por la base de datos SQLite
    if (item.foundation) restored.skinColor = item.foundation;
    if (item.hair_style || item.hairStyle) restored.hairStyle = item.hair_style || item.hairStyle;
    if (item.hair_color || item.hairColor) {
      restored.hairColor = item.hair_color || item.hairColor;
      restored.streak = null;
    }
    if (item.blush) restored.blush = item.blush;
    if (item.eyeshadow) restored.eyeshadow = item.eyeshadow;
    if (item.lipstick) restored.lipstick = item.lipstick;
    if (item.lip_finish || item.lipFinish) restored.lipFinish = item.lip_finish || item.lipFinish;
    if (item.eyelashes !== undefined && item.eyelashes !== null) {
      restored.lashes = String(item.eyelashes) !== 'false';
    }
    if (item.pose) restored.pose = item.pose;
    if (item.expression) restored.expression = item.expression;
    if (item.top_outfit || item.topOutfit) restored.topOutfit = item.top_outfit || item.topOutfit;
    if (item.bottom_outfit || item.bottomOutfit) restored.bottomOutfit = item.bottom_outfit || item.bottomOutfit;
    if (item.accessory !== undefined) restored.accessories = splitCsvItems(item.accessory);
    if (item.gadget !== undefined) restored.gadgets = splitCsvItems(item.gadget);

    // 3. Combinar con el snapshot exacto guardado al evaluar (incluye ropa y accesorios múltiples)
    if (cachedEntry && cachedEntry.state) {
      Object.assign(restored, cachedEntry.state, {
        character: charKey,
        accessories: [...(cachedEntry.state.accessories || restored.accessories)],
        gadgets: [...(cachedEntry.state.gadgets || restored.gadgets)]
      });
    }

    // 4. Activar personaje y aplicar al escenario 3D
    activeChar = charKey;
    STATES_BY_CHAR[activeChar] = restored;
    S = STATES_BY_CHAR[activeChar];

    const selectEl = $('iris-select-screen');
    const menuEl = $('screen-menu');
    const editorEl = $('screen-editor');
    if (selectEl) selectEl.classList.add('hidden');
    if (menuEl) menuEl.classList.add('hidden');
    if (editorEl) editorEl.classList.remove('hidden');

    targetRotY = 0;
    if (window.IrisAvatar3D && window.IrisAvatar3D.onResize) {
      window.IrisAvatar3D.onResize();
    }

    Snd.fx('chime');
    sync();
    render();

    if (typeof closeModal === 'function') {
      closeModal('historyModal');
    } else if ($('historyModal')) {
      $('historyModal').classList.add('hidden');
    }
  }

  function exportPNG() {
    main3D.renderer.render(main3D.scene, main3D.camera);
    const c = document.createElement('canvas');
    c.width = 800;
    c.height = 1080;
    const x = c.getContext('2d');
    const bg = x.createLinearGradient(0, 0, 0, 1080);
    bg.addColorStop(0, '#522561');
    bg.addColorStop(1, '#16071f');
    x.fillStyle = bg;
    x.fillRect(0, 0, 800, 1080);
    x.fillStyle = 'rgba(255,215,238,.75)';
    for (let i = 0; i < 26; i++) {
      x.font = (14 + (i * 7) % 22) + 'px sans-serif';
      x.fillText('✦', (i * 197) % 780, (i * 331) % 1040 + 20);
    }
    x.drawImage(canvas, 0, 0, 800, 1080);
    x.textAlign = 'center';
    x.font = '700 40px Fredoka, "Trebuchet MS", sans-serif';
    x.lineWidth = 10;
    x.strokeStyle = '#2a1038';
    x.strokeText('IRIS GAME — ' + S.character, 400, 1045);
    x.fillStyle = '#ff94c8';
    x.fillText('IRIS GAME — ' + S.character, 400, 1045);
    return c.toDataURL('image/png');
  }

  function score() {
    let n = 4;
    if (S.lipstick !== 'none' && S.eyeshadow !== 'none') n++;
    return n;
  }

  const LOCAL_FB = {
    JACKY: '¡Un look precioso! Los tonos cálidos van con mi estilo.',
    LUCY: '¡Qué combinación tan delicada! Este look tiene mucha luz.',
    XIMENA: '¡Qué bonita combinación! Me encanta probar detalles nuevos.',
    VALERIA: '¡Este look tiene muchísima personalidad y estilo!'
  };

  if ($('btn-evaluar')) {
    $('btn-evaluar').addEventListener('click', async () => {
      Snd.fx('win');
      const url = exportPNG();
      const snapshotToSave = JSON.parse(JSON.stringify(S));
      $('previewImage').src = url;
      const n = score();
      $('stars-score').textContent = '⭐'.repeat(n) + '☆'.repeat(5 - n);
      $('feedback-text').textContent = LOCAL_FB[S.character];
      openModal('resultModal');
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 2500);
        const r = await fetch('/api/game/evaluate', {
          method: 'POST',
          signal: ac.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId: S.character.toLowerCase(),
            foundation: S.skinColor,
            hairStyle: S.hairStyle,
            hairColor: S.hairColor,
            blush: S.blush,
            eyeshadow: S.eyeshadow,
            lipstick: S.lipstick,
            accessory: (S.accessories && S.accessories.length) ? S.accessories.join(',') : 'none',
            eyelashes: String(S.lashes),
            lipFinish: S.lipFinish,
            pose: S.pose,
            expression: S.expression,
            gadget: (S.gadgets && S.gadgets.length) ? S.gadgets.join(',') : 'none',
            topOutfit: S.topOutfit,
            bottomOutfit: S.bottomOutfit,
            score: n
          })
        });
        clearTimeout(t);
        if (r.ok) {
          const d = await r.json();
          if (d.status === 'success' && d.comment) $('feedback-text').textContent = d.comment;
          const savedId = d.id || (d.look && d.look.id);
          if (savedId) saveLookCache(savedId, snapshotToSave, url);
        }
      } catch (e) {}
    });
  }

  if ($('btn-download-png')) {
    $('btn-download-png').addEventListener('click', () => {
      Snd.fx('chime');
      const a = document.createElement('a');
      a.download = `IrisGame_${S.character}_Look.png`;
      a.href = $('previewImage').src;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  async function loadSavedLooks() {
    const listEl = $('history-list');
    const sumEl = $('history-summary');
    if (!listEl || !sumEl) return;
    sumEl.textContent = 'Consultando SQLite a través de Spring Boot + FastAPI...';
    listEl.innerHTML = '';
    try {
      const res = await fetch('/api/game/looks');
      const data = await res.json();
      const looks = data.looks || [];
      const cache = getLookCache();
      sumEl.textContent = `Total de registros almacenados: ${data.total || looks.length} (Haz clic en uno para cargarlo)`;
      if (looks.length === 0) {
        listEl.innerHTML = '<p style="padding:12px;background:#f8f5ff;border-radius:12px;">Aún no hay looks guardados en la base de datos. Presiona "Evaluar look y guardar" para insertar el primero.</p>';
        return;
      }
      looks.forEach((item) => {
        const cachedEntry = cache[String(item.id)] || null;
        const thumbHtml = (cachedEntry && cachedEntry.preview)
          ? `<img src="${cachedEntry.preview}" alt="Look #${item.id}" style="width:54px;height:72px;object-fit:cover;border-radius:10px;border:2px solid #f472b6;flex-shrink:0;" />`
          : `<div style="width:54px;height:72px;border-radius:10px;background:linear-gradient(135deg,#fce7f3,#ede9fe);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">👗</div>`;

        const card = document.createElement('div');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.style.cssText = 'padding:12px;border:2px solid #e4d6f7;border-radius:14px;background:#fff;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;transition:transform 0.18s ease,border-color 0.18s ease,box-shadow 0.18s ease;';
        card.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;min-width:0;">
            ${thumbHtml}
            <div style="min-width:0;">
              <strong>#${item.id} • ${String(item.model_id).toUpperCase()}</strong>
              <span style="font-size:12px;color:#8b7aa3;"> (${item.created_at})</span><br/>
              <span style="font-size:13px;">Estilo: <b>${item.style || '-'}</b> | Peinado: ${item.hair_style || '-'} | Calificación: ${'⭐'.repeat(item.score || 5)}</span><br/>
              <em style="font-size:12.5px;color:#3d2a55;">"${item.comment || ''}"</em>
            </div>
          </div>
          <button type="button" style="padding:8px 13px;border-radius:999px;border:none;background:linear-gradient(90deg,#ff74b8,#9b6ef3);color:#fff;font-weight:800;font-size:12px;cursor:pointer;white-space:nowrap;flex-shrink:0;">
            ✨ Cargar look
          </button>
        `;

        card.addEventListener('mouseenter', () => {
          card.style.borderColor = '#ff74b8';
          card.style.transform = 'translateY(-2px)';
          card.style.boxShadow = '0 8px 20px rgba(155, 110, 243, 0.18)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.borderColor = '#e4d6f7';
          card.style.transform = 'translateY(0)';
          card.style.boxShadow = 'none';
        });

        const handleSelect = (e) => {
          e.preventDefault();
          restoreLookToStudio(item, cachedEntry);
        };

        card.addEventListener('click', handleSelect);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect(e);
        });

        listEl.appendChild(card);
      });
    } catch (err) {
      sumEl.textContent = 'Error al consultar el backend.';
    }
  }

  if ($('btn-open-history')) {
    $('btn-open-history').addEventListener('click', () => {
      openModal('historyModal');
      loadSavedLooks();
    });
  }
  if ($('btn-refresh-history')) {
    $('btn-refresh-history').addEventListener('click', loadSavedLooks);
  }

  /* ------------------------------------------------------------------ */
  /* 9. PORTADA DE INICIO                                                */
  /* ------------------------------------------------------------------ */
  (function cover() {
    const outCanvas = $('coverDollsCanvas');
    if (outCanvas) {
      const img = new Image();
      img.src = outCanvas.dataset.src || 'Gemini_Generated_Image_uxxgaxuxxgaxuxxg.jpg?v=2';
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        outCanvas.width = w;
        outCanvas.height = h;
        const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);

        const frame = ctx.getImageData(0, 0, w, h);
        const d = frame.data;
        const total = w * h;
        const visited = new Uint8Array(total);
        const bgMask = new Uint8Array(total);

        const isBlackBg = (idx) => {
          const p = idx * 4;
          return d[p] < 16 && d[p + 1] < 16 && d[p + 2] < 16;
        };

        const queue = new Int32Array(total);
        let head = 0, tail = 0;
        const push = (idx) => {
          if (!visited[idx] && isBlackBg(idx)) {
            visited[idx] = 1;
            bgMask[idx] = 1;
            queue[tail++] = idx;
          }
        };

        for (let x = 0; x < w; x++) {
          push(x);
          push((h - 1) * w + x);
        }
        for (let y = 0; y < h; y++) {
          push(y * w);
          push(y * w + (w - 1));
        }

        while (head < tail) {
          const cur = queue[head++];
          const cx = cur % w;
          const cy = (cur - cx) / w;
          if (cx > 0) push(cur - 1);
          if (cx < w - 1) push(cur + 1);
          if (cy > 0) push(cur - w);
          if (cy < h - 1) push(cur + w);
        }

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const p = idx * 4;
            if (bgMask[idx]) {
              d[p + 3] = 0;
              continue;
            }
            let bgNeighbors = 0;
            for (let dy = -1; dy <= 1; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= h) continue;
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= w) continue;
                if (bgMask[ny * w + nx]) bgNeighbors++;
              }
            }
            if (bgNeighbors > 0) {
              d[p + 3] = Math.round(d[p + 3] * Math.max(0.15, 1 - bgNeighbors / 9));
            }
          }
        }

        ctx.putImageData(frame, 0, 0);
      };
    }

    const field = $('sparkles'), marks = ['✦', '✧', '★', '✿'];
    if (field && !field.children.length) {
      for (let i = 0; i < 30; i++) {
        const s = document.createElement('span');
        s.className = 'sparkle';
        s.textContent = marks[i % 4];
        s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;font-size:${10 + Math.random() * 22}px;animation-delay:${(Math.random() * 3).toFixed(2)}s;animation-duration:${(2.5 + Math.random() * 3).toFixed(2)}s`;
        field.appendChild(s);
      }
    }
  })();

  Snd.on = false;
  document.querySelectorAll('.audio-ico').forEach(e => { e.textContent = '🔇'; });
  ['menu-audio-btn', 'audio-toggle-btn'].forEach(id => {
    const el = $(id);
    if (el) el.setAttribute('aria-pressed', 'false');
  });

  sync();
  render();
})();