/* ============================================================================
   IRIS GAME — MOTOR 3D (Fashion Doll Edition)
   ============================================================================ */
(function (global) {
  'use strict';

  const TARGET_AVATAR_HEIGHT = 1.64;
  const BASE_MODEL_HEIGHT = 1.575;
  const PLATFORM_TOP_Y = 0.0;
  const HEAD_PIVOT_Y = 1.332;
  const HEAD_PIVOT_Z = -0.011;
  const HEAD_LOCAL_OFFSET_Y = 0.062;
  const HEAD_LOCAL_OFFSET_Z = 0.008;
  const HEAD_SCALE = 1.36;
  const WAIST_PIVOT_Y = 0.965;

  let mainCameraCtrl = null;
  let mainRenderFn = null;
  let mainSceneCtx = null;
  const texCache = Object.create(null);

  const MathHelp = {
    lerp(a, b, t) {
      return a + (b - a) * t;
    },
    clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    }
  };

  function applySRGB(tex) {
    if (!tex || typeof THREE === 'undefined') return tex;
    if (typeof THREE.SRGBColorSpace !== 'undefined' && 'colorSpace' in tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
    } else if (typeof THREE.sRGBEncoding !== 'undefined') {
      tex.encoding = THREE.sRGBEncoding;
    }
    return tex;
  }

  function resolveColor(val, fallback) {
    if (!val || val === 'original' || val === 'default' || val === 'none') return fallback;
    if (typeof val === 'string') {
      const s = val.trim();
      if (s.startsWith('#')) return s;
      const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (m) {
        const r = MathHelp.clamp(parseInt(m[1], 10), 0, 255).toString(16).padStart(2, '0');
        const g = MathHelp.clamp(parseInt(m[2], 10), 0, 255).toString(16).padStart(2, '0');
        const b = MathHelp.clamp(parseInt(m[3], 10), 0, 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    }
    return fallback;
  }

  function makeStandardMat(hex, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      map: opts.map || null,
      vertexColors: Boolean(opts.vertexColors),
      roughness: opts.roughness !== undefined ? opts.roughness : 0.45,
      metalness: opts.metalness !== undefined ? opts.metalness : 0.04,
      transparent: Boolean(opts.transparent),
      opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
      depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : true,
      side: opts.side || THREE.FrontSide
    });
  }

  function makePhysicalMat(hex, opts = {}) {
    if (typeof THREE.MeshPhysicalMaterial !== 'function') {
      return makeStandardMat(hex, opts);
    }
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hex),
      map: opts.map || null,
      vertexColors: Boolean(opts.vertexColors),
      roughness: opts.roughness !== undefined ? opts.roughness : 0.25,
      metalness: opts.metalness !== undefined ? opts.metalness : 0.05,
      clearcoat: opts.clearcoat !== undefined ? opts.clearcoat : 0.0,
      clearcoatRoughness: opts.clearcoatRoughness !== undefined ? opts.clearcoatRoughness : 0.14,
      transparent: Boolean(opts.transparent),
      opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
      side: opts.side || THREE.FrontSide
    });
  }

  function normalizeItemList(listVal, singleVal) {
    const out = [];
    if (Array.isArray(listVal)) {
      listVal.forEach((v) => {
        const s = String(v || '').toLowerCase();
        if (s && s !== 'none' && !out.includes(s)) out.push(s);
      });
    }
    if (singleVal && singleVal !== 'none') {
      const s = String(singleVal).toLowerCase();
      if (s && s !== 'none' && !out.includes(s)) out.push(s);
    }
    return out;
  }

  /* -------------------- Perfiles de Personaje -------------------- */
  const CHARACTER_PROFILES = {
    JACKY: {
      skin: '#f0cbb0',
      hair: '#3b2113',
      streak: '#ebd3ae',
      lip: '#c86d78',
      iris: '#5a2a0e',
      top: '#1e355e',
      bottom: '#243b55',
      shoes: '#5a3222'
    },
    LUCY: {
      skin: '#f6d5be',
      hair: '#14101a',
      streak: '#f3e0c2',
      lip: '#e08694',
      iris: '#3b6e52',
      top: '#b8326a',
      bottom: '#3b2442',
      shoes: '#4a2538'
    },
    XIMENA: {
      skin: '#e2a882',
      hair: '#110d17',
      streak: '#d9c2a3',
      lip: '#b87678',
      iris: '#4a2e18',
      top: '#3b2d63',
      bottom: '#28203d',
      shoes: '#3a241c'
    },
    VALERIA: {
      skin: '#f2ccb2',
      hair: '#3d2212',
      streak: '#c89b6e',
      lip: '#d47c84',
      iris: '#5a2a0e',
      top: '#243c68',
      bottom: '#2a3f5c',
      shoes: '#593324'
    }
  };

  /* -------------------- Texturas Procedurales -------------------- */
  function createStudioBackdropTexture() {
    if (texCache.studioBg) return texCache.studioBg;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 102, 12, 128, 128, 185);
    g.addColorStop(0, '#852248');
    g.addColorStop(0.55, '#4d122a');
    g.addColorStop(1, '#220712');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);

    const tex = applySRGB(new THREE.CanvasTexture(c));
    texCache.studioBg = tex;
    return tex;
  }

  function createPlaidSkirtTexture(baseHex) {
    const key = `plaid_skirt_${baseHex}`;
    if (texCache[key]) return texCache[key];

    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    const base = new THREE.Color(baseHex);
    const dark = base.clone().multiplyScalar(0.58).getStyle();
    const light = base.clone().offsetHSL(0.02, 0.08, 0.16).getStyle();

    ctx.fillStyle = base.getStyle();
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = dark;
    for (let i = 0; i < 256; i += 32) {
      ctx.fillRect(i, 0, 12, 256);
      ctx.fillRect(0, i, 256, 12);
    }

    ctx.fillStyle = light;
    for (let i = 16; i < 256; i += 32) {
      ctx.fillRect(i, 0, 4, 256);
      ctx.fillRect(0, i, 256, 4);
    }

    ctx.fillStyle = 'rgba(245, 224, 160, 0.42)';
    for (let i = 6; i < 256; i += 32) {
      ctx.fillRect(i, 0, 1.5, 256);
      ctx.fillRect(0, i, 256, 1.5);
    }

    const tex = applySRGB(new THREE.CanvasTexture(c));
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    texCache[key] = tex;
    return tex;
  }

  function createDenimTexture(baseHex) {
    const key = `denim_tex_${baseHex}`;
    if (texCache[key]) return texCache[key];

    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    const base = new THREE.Color(baseHex);
    const wash = base.clone().lerp(new THREE.Color('#dbeafe'), 0.24).getStyle();
    const seam = base.clone().multiplyScalar(0.62).getStyle();

    ctx.fillStyle = base.getStyle();
    ctx.fillRect(0, 0, 256, 256);

    const washGrad = ctx.createLinearGradient(0, 0, 256, 0);
    washGrad.addColorStop(0.0, 'rgba(15, 23, 42, 0.16)');
    washGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.16)');
    washGrad.addColorStop(0.50, 'rgba(15, 23, 42, 0.10)');
    washGrad.addColorStop(0.75, 'rgba(255, 255, 255, 0.16)');
    washGrad.addColorStop(1.0, 'rgba(15, 23, 42, 0.16)');
    ctx.fillStyle = washGrad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = wash;
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = 1;
    for (let i = -256; i < 512; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 256, 256);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    ctx.strokeStyle = seam;
    ctx.lineWidth = 2;
    [64, 192].forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, 256);
      ctx.stroke();
    });

    const tex = applySRGB(new THREE.CanvasTexture(c));
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 2);
    texCache[key] = tex;
    return tex;
  }

  function createAlmondEyeTexture(irisHex, side, isSurprised = false) {
    const key = `almond_eye_doll_v20_${irisHex}_${side}_${isSurprised ? 1 : 0}`;
    if (texCache[key]) return texCache[key];

    const W = 256;
    const H = 128;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');

    const scleraGrad = ctx.createLinearGradient(0, 0, W, 0);
    scleraGrad.addColorStop(0.0, '#e3ccd3');
    scleraGrad.addColorStop(0.12, '#fcf8f9');
    scleraGrad.addColorStop(0.50, '#ffffff');
    scleraGrad.addColorStop(0.88, '#fbf6f8');
    scleraGrad.addColorStop(1.0, '#e3ccd3');
    ctx.fillStyle = scleraGrad;
    ctx.fillRect(0, 0, W, H);

    const cx = W * 0.46;
    const cy = H * 0.48;
    const rOuter = isSurprised ? 50 : 65;

    const base = new THREE.Color(irisHex);
    const dark = base.clone().multiplyScalar(0.22).getStyle();
    const mid = base.clone().offsetHSL(0.0, 0.08, 0.04).getStyle();
    const warmRing = base.clone().offsetHSL(0.015, 0.14, 0.16).getStyle();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.clip();

    const irisGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, rOuter);
    irisGrad.addColorStop(0.0, dark);
    irisGrad.addColorStop(0.42, warmRing);
    irisGrad.addColorStop(0.75, mid);
    irisGrad.addColorStop(0.91, '#180904');
    irisGrad.addColorStop(1.0, '#070301');
    ctx.fillStyle = irisGrad;
    ctx.fillRect(cx - rOuter, cy - rOuter, rOuter * 2, rOuter * 2);

    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 64; i++) {
      ctx.rotate((Math.PI * 2) / 64);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 226, 194, 0.18)' : 'rgba(12, 5, 2, 0.25)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(rOuter - 3, 0);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(10, 4, 2, 0.92)';
    ctx.lineWidth = 5.0;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter - 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#080409';
    ctx.beginPath();
    ctx.arc(cx, cy, isSurprised ? 14 : 23, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.beginPath();
    ctx.arc(cx - 14, cy - 11, 10.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(cx + 14, cy + 12, 4.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (!isSurprised) {
      const lidShadow = ctx.createLinearGradient(0, 0, 0, H * 0.34);
      lidShadow.addColorStop(0.0, 'rgba(20, 8, 16, 0.40)');
      lidShadow.addColorStop(0.55, 'rgba(38, 16, 26, 0.10)');
      lidShadow.addColorStop(1.0, 'rgba(38, 16, 26, 0.0)');
      ctx.fillStyle = lidShadow;
      ctx.fillRect(0, 0, W, H * 0.34);
    }

    const tearGrad = ctx.createRadialGradient(8, H * 0.56, 2, 12, H * 0.56, 34);
    tearGrad.addColorStop(0, 'rgba(216, 126, 142, 0.48)');
    tearGrad.addColorStop(1, 'rgba(216, 126, 142, 0.0)');
    ctx.fillStyle = tearGrad;
    ctx.fillRect(0, 0, 52, H);

    const tex = applySRGB(new THREE.CanvasTexture(c));
    texCache[key] = tex;
    return tex;
  }

  function createSoftRadialTexture(hexColor, maxAlpha = 0.45) {
    const key = `radial_${hexColor}_${maxAlpha}`;
    if (texCache[key]) return texCache[key];

    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const col = new THREE.Color(hexColor);
    const r = Math.round(col.r * 255);
    const g = Math.round(col.g * 255);
    const b = Math.round(col.b * 255);

    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    grad.addColorStop(0, `rgba(${r},${g},${b},${maxAlpha})`);
    grad.addColorStop(0.55, `rgba(${r},${g},${b},${maxAlpha * 0.45})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = applySRGB(new THREE.CanvasTexture(c));
    texCache[key] = tex;
    return tex;
  }

  function createScreenTexture(kind) {
    const key = `screen_${kind}`;
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 192;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 128, 192);
    if (kind === 'laptop') {
      g.addColorStop(0, '#38bdf8');
      g.addColorStop(0.5, '#c084fc');
      g.addColorStop(1, '#f472b6');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 192);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(14, 24, 100, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.68)';
      ctx.fillRect(14, 52, 70, 12);
      ctx.fillRect(14, 72, 85, 12);
      ctx.fillRect(14, 92, 60, 12);
    } else {
      g.addColorStop(0, '#ff85c8');
      g.addColorStop(0.5, '#f9a8d4');
      g.addColorStop(1, '#e879f9');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 192);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.arc(64, 86, 36, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = applySRGB(new THREE.CanvasTexture(c));
    texCache[key] = tex;
    return tex;
  }

  /* -------------------- Geometría de Tubo Afilado & Corazón 3D -------------------- */
  function createTaperedTubeGeometry(curve, tubularSegments, radiusFn, radialSegments = 12, scaleX = 1.0, scaleZ = 1.0) {
    const frames = curve.computeFrenetFrames(tubularSegments, false);
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    const v = new THREE.Vector3();

    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      curve.getPointAt(t, p);
      const r = Math.max(0.0002, radiusFn(t));
      const N = frames.normals[i];
      const B = frames.binormals[i];

      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(theta);
        const cos = -Math.cos(theta);

        n.x = cos * N.x + sin * B.x;
        n.y = cos * N.y + sin * B.y;
        n.z = cos * N.z + sin * B.z;
        n.normalize();

        v.x = p.x + r * n.x * scaleX;
        v.y = p.y + r * n.y;
        v.z = p.z + r * n.z * scaleZ;

        positions.push(v.x, v.y, v.z);
        normals.push(n.x, n.y, n.z);
        uvs.push(j / radialSegments, t);
      }
    }

    const row = radialSegments + 1;
    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * row + j;
        const b = (i + 1) * row + j;
        const c = (i + 1) * row + (j + 1);
        const d = i * row + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function createHeartMesh(size, mat) {
    const shape = new THREE.Shape();
    const s = size;
    shape.moveTo(0, -s * 0.75);
    shape.bezierCurveTo(-s * 1.15, -s * 0.1, -s * 0.95, s * 0.85, 0, s * 0.35);
    shape.bezierCurveTo(s * 0.95, s * 0.85, s * 1.15, -s * 0.1, 0, -s * 0.75);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: s * 0.34,
      bevelEnabled: true,
      bevelThickness: s * 0.10,
      bevelSize: s * 0.08,
      bevelSegments: 3
    });
    geo.center();
    return new THREE.Mesh(geo, mat);
  }

  /* -------------------- Controlador de Cámara -------------------- */
  class SafeOrbitController {
    constructor(camera, domElement, onChange) {
      this.camera = camera;
      this.domElement = domElement;
      this.onChange = onChange;
      this.target = new THREE.Vector3(0, 0.84, 0);
      this.minDistance = 0.78;
      this.maxDistance = 5.40;
      this.minTargetY = 0.30;
      this.maxTargetY = 1.48;
      this._spherical = new THREE.Spherical(3.38, Math.PI * 0.492, 0);
      this._defaultTarget = this.target.clone();
      this._defaultSpherical = this._spherical.clone();
      this._bindEvents();
    }

    setDefaults(targetY, distance) {
      this._defaultTarget.set(0, targetY, 0);
      this.target.copy(this._defaultTarget);
      this._defaultSpherical.set(
        MathHelp.clamp(distance, this.minDistance, this.maxDistance),
        Math.PI * 0.492,
        0
      );
      this._spherical.copy(this._defaultSpherical);
      this.update();
    }

    setView(targetY, distance) {
      this.target.y = MathHelp.clamp(targetY, this.minTargetY, this.maxTargetY);
      this._spherical.radius = MathHelp.clamp(distance, this.minDistance, this.maxDistance);
      this.update();
    }

    reset() {
      this.target.copy(this._defaultTarget);
      this._spherical.copy(this._defaultSpherical);
      this.update();
    }

    zoomBy(delta) {
      this._spherical.radius = MathHelp.clamp(
        this._spherical.radius + delta,
        this.minDistance,
        this.maxDistance
      );
      this.update();
    }

    panYBy(delta) {
      this.target.y = MathHelp.clamp(this.target.y + delta, this.minTargetY, this.maxTargetY);
      this.update();
    }

    update() {
      const offset = new THREE.Vector3().setFromSpherical(this._spherical);
      this.camera.position.copy(this.target).add(offset);
      this.camera.lookAt(this.target);
      if (typeof this.onChange === 'function') this.onChange();
    }

    _bindEvents() {
      const el = this.domElement;
      el.style.touchAction = 'none';
      el.style.cursor = 'grab';
      el.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.zoomBy(e.deltaY > 0 ? 0.22 : -0.22);
      }, { passive: false });
    }
  }

  /* -------------------- Escenario de Estudio -------------------- */
  function setupScene(canvas, dist = 3.38, targetY = 0.84) {
    if (!canvas || typeof THREE === 'undefined') return null;

    const parent = canvas.parentElement;
    const w = canvas.clientWidth || (parent && parent.clientWidth) || canvas.width || 420;
    const h = canvas.clientHeight || (parent && parent.clientHeight) || canvas.height || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4d122a);

    const backdropMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshBasicMaterial({ map: createStudioBackdropTexture(), depthWrite: false })
    );
    backdropMesh.position.set(0, 1.0, -5.5);
    scene.add(backdropMesh);

    const isMainStage = canvas.id === 'avatarCanvas';
    const initialDist = isMainStage ? 3.38 : dist;
    const initialY = isMainStage ? 0.84 : targetY;

    const camera = new THREE.PerspectiveCamera(32, Math.max(0.2, w / Math.max(1, h)), 0.06, 40);
    camera.position.set(0, initialY + 0.02, initialDist);
    camera.lookAt(0, initialY, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });

    renderer.setClearColor(0x4d122a, 1);
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (typeof THREE.ACESFilmicToneMapping !== 'undefined') {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    }
    renderer.toneMappingExposure = 1.0;
    if (typeof THREE.SRGBColorSpace !== 'undefined' && 'outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    const hemi = new THREE.HemisphereLight(0xfff9fc, 0x9c7282, 1.18);
    hemi.position.set(0, 4, 0);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfffdfb, 1.12);
    keyLight.position.set(1.5, 3.6, 3.4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffe8f2, 0.65);
    fillLight.position.set(-2.2, 1.7, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffa6d2, 0.52);
    rimLight.position.set(0, 2.5, -2.7);
    scene.add(rimLight);

    const platformGroup = new THREE.Group();
    const discHeight = 0.068;
    const discMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.60, 0.66, discHeight, 56),
      makePhysicalMat('#f472b6', { roughness: 0.24, metalness: 0.06, clearcoat: 0.70 })
    );
    discMesh.position.set(0, PLATFORM_TOP_Y - discHeight * 0.5, 0);
    discMesh.receiveShadow = true;
    platformGroup.add(discMesh);

    const innerDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.51, 0.51, 0.004, 48),
      makePhysicalMat('#f9a8d4', { roughness: 0.32, clearcoat: 0.45 })
    );
    innerDisc.position.set(0, PLATFORM_TOP_Y + 0.001, 0);
    innerDisc.receiveShadow = true;
    platformGroup.add(innerDisc);

    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.605, 0.010, 14, 60),
      makeStandardMat('#ffe0ef', { roughness: 0.22, metalness: 0.35 })
    );
    ringMesh.rotation.x = Math.PI * 0.5;
    ringMesh.position.set(0, PLATFORM_TOP_Y - 0.003, 0);
    platformGroup.add(ringMesh);
    scene.add(platformGroup);

    const renderFrame = () => renderer.render(scene, camera);

    let ctrl = null;
    if (isMainStage) {
      ctrl = new SafeOrbitController(camera, canvas, renderFrame);
      ctrl.setDefaults(initialY, initialDist);
      mainCameraCtrl = ctrl;
      mainRenderFn = renderFrame;
      mainSceneCtx = { scene, camera, renderer, canvas };
    }

    return { scene, camera, renderer, ctrl, renderFrame, isMainStage };
  }

  /* ==========================================================================
     1. CABEZA ESCULPIDA OVALADA EN V TIPO FASHION DOLL
     ========================================================================== */
  const HEAD_PROFILE_PTS = [
    [0.060, 0.0860, 0.0940],
    [0.022, 0.0890, 0.0965],
    [-0.008, 0.0875, 0.0960],
    [-0.032, 0.0790, 0.0910],
    [-0.056, 0.0630, 0.0810],
    [-0.080, 0.0410, 0.0620],
    [-0.095, 0.0200, 0.0380],
    [-0.104, 0.0000, 0.0000]
  ];

  function evalSculptedHeadRadii(y) {
    const topY = 0.124;
    if (y >= 0.060) {
      const t = MathHelp.clamp((topY - y) / (topY - 0.060), 0.0, 1.0);
      return [
        0.0860 * Math.pow(Math.sin(t * Math.PI * 0.5), 0.66),
        0.0940 * Math.pow(Math.sin(t * Math.PI * 0.5), 0.70)
      ];
    }

    const n = HEAD_PROFILE_PTS.length;
    let idx = 0;
    for (let i = 0; i < n - 1; i++) {
      if (y <= HEAD_PROFILE_PTS[i][0] && y >= HEAD_PROFILE_PTS[i + 1][0]) {
        idx = i;
        break;
      }
    }

    const p0 = HEAD_PROFILE_PTS[Math.max(0, idx - 1)];
    const p1 = HEAD_PROFILE_PTS[idx];
    const p2 = HEAD_PROFILE_PTS[Math.min(n - 1, idx + 1)];
    const p3 = HEAD_PROFILE_PTS[Math.min(n - 1, idx + 2)];

    const span = p1[0] - p2[0];
    const t = MathHelp.clamp((p1[0] - y) / Math.max(1e-6, span), 0.0, 1.0);
    const t2 = t * t;
    const t3 = t2 * t;

    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const m1x = 0.42 * (p2[1] - p0[1]);
    const m2x = 0.42 * (p3[1] - p1[1]);
    const rx = Math.max(0.0, h00 * p1[1] + h10 * m1x + h01 * p2[1] + h11 * m2x);

    const m1z = 0.42 * (p2[2] - p0[2]);
    const m2z = 0.42 * (p3[2] - p1[2]);
    const rz = Math.max(0.0, h00 * p1[2] + h10 * m1z + h01 * p2[2] + h11 * m2z);

    return [rx, rz];
  }

  function evalHeadZCenter(y) {
    if (y >= -0.024) return 0.0;
    const tChin = MathHelp.clamp((-0.024 - y) / (-0.024 - (-0.104)), 0.0, 1.0);
    return 0.014 * Math.pow(tChin, 1.20);
  }

  function evalHeadSurfaceZ(x, y) {
    const [targetRx, targetRz] = evalSculptedHeadRadii(y);
    const zCenter = evalHeadZCenter(y);
    if (targetRx <= 1e-6 || targetRz <= 1e-6) return zCenter;

    const sinT = MathHelp.clamp(x / targetRx, -1.0, 1.0);
    const cosT = Math.sqrt(Math.max(0.0, 1.0 - sinT * sinT));
    let z = zCenter + targetRz * cosT;

    if (cosT > 0) {
      const cheekSoft =
        Math.exp(-Math.pow((y + 0.028) / 0.024, 2)) *
        Math.exp(-Math.pow((Math.abs(x) - 0.036) / 0.024, 2)) *
        0.0014;
      const muzzleSoft =
        Math.exp(-Math.pow((y + 0.060) / 0.022, 2)) *
        Math.exp(-Math.pow(x / 0.026, 2)) *
        0.0020;
      const socketSoft =
        -Math.exp(-Math.pow((y + 0.0110) / 0.018, 2)) *
        Math.exp(-Math.pow((Math.abs(x) - 0.0395) / 0.024, 2)) *
        0.0016;

      z += cheekSoft + muzzleSoft + socketSoft;
    }
    return z;
  }

  function createHarmoniousHeadGeometry(skinHex) {
    const segU = 96;
    const segV = 84;
    const positions = [];
    const colors = [];
    const uvs = [];
    const indices = [];

    const topY = 0.124;
    const chinY = -0.104;

    const baseCol = new THREE.Color(skinHex);
    const warmContourCol = baseCol.clone().offsetHSL(-0.005, 0.04, -0.070);
    const softShadeCol = baseCol.clone().offsetHSL(-0.005, 0.03, -0.050);
    const highlightCol = baseCol.clone().lerp(new THREE.Color('#fff8f4'), 0.24);
    const tmpCol = new THREE.Color();

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const phi = (v - 0.5) * Math.PI;
      const sy = Math.sin(phi);

      const y = sy >= 0 ? sy * topY : sy * Math.abs(chinY);
      const [targetRx, targetRz] = evalSculptedHeadRadii(y);
      const zCenter = evalHeadZCenter(y);

      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const theta = (u - 0.5) * Math.PI * 2.0;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const x = targetRx * sinT;
        let z = zCenter + targetRz * cosT;

        tmpCol.copy(baseCol);

        if (cosT > 0) {
          const absX = Math.abs(x);

          const cheekSoft =
            Math.exp(-Math.pow((y + 0.028) / 0.024, 2)) *
            Math.exp(-Math.pow((absX - 0.036) / 0.024, 2)) *
            0.0014;
          const muzzleSoft =
            Math.exp(-Math.pow((y + 0.060) / 0.022, 2)) *
            Math.exp(-Math.pow(x / 0.026, 2)) *
            0.0020;
          const socketSoft =
            -Math.exp(-Math.pow((y + 0.0110) / 0.018, 2)) *
            Math.exp(-Math.pow((absX - 0.0395) / 0.024, 2)) *
            0.0016;

          z += cheekSoft + muzzleSoft + socketSoft;

          const frontFade = Math.pow(cosT, 0.65);

          const outerRimShade =
            Math.pow(MathHelp.clamp(1.0 - cosT * 0.88, 0.0, 1.0), 1.35) * 0.44;
          const underLipSoft =
            Math.exp(-Math.pow((y + 0.074) / 0.0065, 2)) *
            Math.exp(-Math.pow(x / 0.016, 2)) *
            frontFade * 0.34;
          const underNoseSoft =
            Math.exp(-Math.pow((y + 0.045) / 0.005, 2)) *
            Math.exp(-Math.pow(x / 0.008, 2)) *
            frontFade * 0.26;
          const chinUnderSoft =
            Math.exp(-Math.pow((y + 0.101) / 0.007, 2)) *
            frontFade * 0.30;

          const shadeAmt = MathHelp.clamp(
            outerRimShade + underLipSoft + underNoseSoft + chinUnderSoft,
            0.0,
            0.52
          );
          tmpCol.lerp(warmContourCol, shadeAmt);

          const cheekGlow =
            Math.exp(-Math.pow((y + 0.026) / 0.018, 2)) *
            Math.exp(-Math.pow((absX - 0.036) / 0.022, 2)) *
            frontFade * 0.40;
          const noseGlow =
            Math.exp(-Math.pow((y + 0.026) / 0.018, 2)) *
            Math.exp(-Math.pow(x / 0.0042, 2)) *
            frontFade * 0.46;
          const foreheadGlow =
            Math.exp(-Math.pow((y - 0.032) / 0.032, 2)) *
            Math.exp(-Math.pow(x / 0.028, 2)) *
            frontFade * 0.32;

          tmpCol.lerp(highlightCol, MathHelp.clamp(cheekGlow + noseGlow + foreheadGlow, 0.0, 0.50));
        } else {
          tmpCol.lerp(softShadeCol, 0.38);
        }

        positions.push(x, y, z);
        colors.push(tmpCol.r, tmpCol.g, tmpCol.b);
        uvs.push(u, v);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = (iv + 1) * row + iu;
        const c = (iv + 1) * row + (iu + 1);
        const d = iv * row + (iu + 1);
        indices.push(a, d, b, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /* ==========================================================================
     2. GEOMETRÍA DE OJOS, PÁRPADOS 3D Y LABIOS MUY EXPRESIVOS
     ========================================================================== */
  function createAlmondEyeGeometry(side, openScale = 1.0, lowerLift = 0.0) {
    const segU = 34;
    const segV = 22;
    const positions = [];
    const uvs = [];
    const indices = [];

    const eyeCenterX = side * 0.0395;
    const eyeCenterY = -0.0110;
    const halfW = 0.0245;

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const s = u * 2.0 - 1.0;

        const localX = side * halfW * s;
        const slantY = -0.0056 * (1.0 - u) + 0.0064 * u;
        const yUpper = slantY + 0.0118 * openScale * Math.sin(Math.PI * Math.pow(u, 0.76));
        const yLower = slantY - (0.0085 - lowerLift) * Math.sin(Math.PI * Math.pow(u, 0.90));

        const localY = MathHelp.lerp(yLower, yUpper, v);
        const hx = eyeCenterX + localX;
        const hy = eyeCenterY + localY;

        const bulge =
          0.0040 *
          Math.pow(Math.sin(Math.PI * u), 0.70) *
          Math.pow(Math.sin(Math.PI * v), 0.70);
        const hz = evalHeadSurfaceZ(hx, hy) + 0.0005 + bulge;

        positions.push(hx, hy, hz);
        uvs.push(u, v);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = (iv + 1) * row + iu;
        const c = (iv + 1) * row + (iu + 1);
        const d = iv * row + (iu + 1);
        if (side > 0) {
          indices.push(a, d, b, b, d, c);
        } else {
          indices.push(a, b, d, b, c, d);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function createUpperEyelidGeometry(side, innerDrop, outerDrop, lidHeight) {
    const segU = 32;
    const segV = 12;
    const positions = [];
    const indices = [];

    const eyeCenterX = side * 0.0395;
    const eyeCenterY = -0.0110;
    const halfW = 0.0258;

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const s = u * 2.0 - 1.0;
        const hx = eyeCenterX + side * halfW * s;
        const slantY = -0.0056 * (1.0 - u) + 0.0064 * u;
        const lidSlope = MathHelp.lerp(-innerDrop, -outerDrop, u);
        const yBot = eyeCenterY + slantY + lidSlope + 0.0032 * Math.sin(Math.PI * u);
        const yTop = yBot + lidHeight * Math.sin(Math.PI * Math.pow(u, 0.75)) + 0.002;
        const hy = MathHelp.lerp(yBot, yTop, v);
        const bulge = 0.0034 * Math.sin(Math.PI * u) * (1.0 - v * 0.5);
        const hz = evalHeadSurfaceZ(hx, hy) + 0.0012 + bulge;
        positions.push(hx, hy, hz);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = (iv + 1) * row + iu;
        const c = (iv + 1) * row + (iu + 1);
        const d = iv * row + (iu + 1);
        if (side > 0) {
          indices.push(a, d, b, b, d, c);
        } else {
          indices.push(a, b, d, b, c, d);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function evalMouthPartingY(u, cornerLift, openGap = 0.0) {
    return (
      -0.0003 -
      0.0005 * Math.exp(-Math.pow(u / 0.14, 2)) +
      0.0002 * (u * u) +
      cornerLift * Math.pow(Math.abs(u), 2.0) +
      openGap * (1.0 - u * u)
    );
  }

  function createSculptedLipGeometry(isUpper, mouthY, wMul, cornerLift, lowerScale, lipHex, poutBoost = 0.0, openGap = 0.0) {
    const segU = 46;
    const segV = 20;
    const positions = [];
    const colors = [];
    const uvs = [];
    const indices = [];

    const halfW = (isUpper ? 0.0205 : 0.0195) * wMul;

    const baseCol = new THREE.Color(lipHex);
    const linerCol = baseCol.clone().multiply(new THREE.Color(0.55, 0.46, 0.50));
    const centerPlumpCol = baseCol.clone().lerp(new THREE.Color('#ffe6ee'), 0.44);
    const innerCreaseCol = baseCol.clone().multiplyScalar(0.45);
    const tmpCol = new THREE.Color();

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      for (let iu = 0; iu <= segU; iu++) {
        const uNorm = iu / segU;
        const u = uNorm * 2.0 - 1.0;
        const oneMinusU2 = Math.max(0.0, 1.0 - u * u);

        const x = halfW * u;
        const yPart = evalMouthPartingY(u, cornerLift, isUpper ? openGap : -openGap);
        let localY;
        let zOffset;

        if (isUpper) {
          const peaks = 0.0034 * Math.exp(-Math.pow((Math.abs(u) - 0.24) / 0.17, 2));
          const centerDip = -0.0015 * Math.exp(-Math.pow(u / 0.11, 2));
          const cupidsArch = Math.pow(oneMinusU2, 0.68) * (0.0060 + peaks + centerDip);
          const yTop = yPart + cupidsArch;

          localY = MathHelp.lerp(yPart, yTop, v);
          zOffset =
            0.0012 +
            (0.0070 + poutBoost) *
              Math.pow(Math.sin(Math.PI * v), 0.60) *
              Math.pow(oneMinusU2, 0.48);
        } else {
          const yBot = yPart - 0.0102 * Math.pow(oneMinusU2, 0.88) * lowerScale;
          localY = MathHelp.lerp(yPart, yBot, v);
          zOffset =
            0.0012 +
            (0.0082 + poutBoost * 1.15) *
              Math.pow(Math.sin(Math.PI * v), 0.58) *
              Math.pow(oneMinusU2, 0.60);
        }

        const hy = mouthY + localY;
        const hz = evalHeadSurfaceZ(x, hy) + zOffset;
        positions.push(x, hy, hz);
        uvs.push(uNorm, v);

        const pillowMask = Math.sin(Math.PI * v) * Math.pow(oneMinusU2, 0.58);
        tmpCol.copy(baseCol).lerp(centerPlumpCol, pillowMask * 0.85);

        const rimMask = Math.pow(MathHelp.clamp((v - 0.62) / 0.38, 0.0, 1.0), 1.25);
        tmpCol.lerp(linerCol, rimMask * 0.82);

        const creaseMask = Math.pow(MathHelp.clamp((0.18 - v) / 0.18, 0.0, 1.0), 1.5);
        tmpCol.lerp(innerCreaseCol, creaseMask * 0.68);

        colors.push(tmpCol.r, tmpCol.g, tmpCol.b);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = (iv + 1) * row + iu;
        const c = (iv + 1) * row + (iu + 1);
        const d = iv * row + (iu + 1);
        if (isUpper) {
          indices.push(a, d, b, b, d, c);
        } else {
          indices.push(a, b, d, b, c, d);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /* ==========================================================================
     3. CABELLO (LISO, MECHAS MONEY-PIECE, Y RIZADO CHINO 3D EN ESPIRAL)
     ========================================================================== */
  function evalHairCurtainPoint(side, u, v, endY, isBob) {
    let partAngle;
    if (u < 0.24) {
      partAngle = MathHelp.lerp(0.84, 1.60, u / 0.24);
    } else if (u < 0.65) {
      partAngle = MathHelp.lerp(1.60, 2.32, (u - 0.24) / 0.41);
    } else {
      partAngle = MathHelp.lerp(2.32, 2.98, (u - 0.65) / 0.35);
    }
    const partY = 0.136 * Math.sin(partAngle);
    const partZ = 0.103 * Math.cos(partAngle);

    if (v <= 0.34) {
      const tv = v / 0.34;
      const thetaFront = 0.94 * Math.sin(tv * Math.PI * 0.5);
      const theta = side * (thetaFront + u * (Math.PI - thetaFront));

      const archLift = Math.pow(Math.sin(tv * Math.PI), 0.76) * 0.020 * (1.0 - 0.28 * u);
      const ringY = 0.006 - 0.044 * u;
      const ringRx = 0.093 + 0.0022 * (1.0 - u);
      const ringRz = 0.101;

      const ringX = ringRx * Math.sin(theta);
      const ringZ = ringRz * Math.cos(theta);

      const easeX = Math.pow(Math.sin(tv * Math.PI * 0.5), 0.88);
      const easeY = Math.pow(tv, 1.40);

      return new THREE.Vector3(
        ringX * easeX,
        (1.0 - easeY) * partY + easeY * ringY + archLift,
        (1.0 - easeX) * partZ + easeX * ringZ
      );
    }

    const td = (v - 0.34) / 0.66;
    const thetaFront = 0.94;
    const theta = side * (thetaFront + u * (Math.PI - thetaFront));

    const ringY = 0.006 - 0.044 * u;
    const ringRx = 0.093 + 0.0022 * (1.0 - u);
    const ringRz = 0.101;

    const shoulderFlare = Math.sin(Math.min(1.0, td * 1.25) * Math.PI) * (isBob ? 0.004 : 0.006);
    const tipTaper = isBob ? -0.014 * Math.pow(td, 1.6) : 0.003 * td;
    const curRx = ringRx + shoulderFlare + tipTaper;
    const curRz = ringRz + shoulderFlare * 0.6 + (isBob ? tipTaper * 0.6 : 0.003 * td);

    let x = curRx * Math.sin(theta);
    let z = curRz * Math.cos(theta);

    if (u < 0.35 && !isBob) {
      const frontRatio = (0.35 - u) / 0.35;
      z += frontRatio * Math.pow(td, 1.2) * 0.018;
      x -= side * frontRatio * Math.pow(td, 1.4) * 0.004;
    }

    const y = ringY + td * (endY - ringY);
    return new THREE.Vector3(x, y, z);
  }

  function createUnifiedHairCurtainGeometry(side, endY, isBob, mainHex, streakHex, hasHighlights, boldMoneyPiece) {
    const segU = 32;
    const segV = 38;
    const row = segU + 1;
    const gridCount = row * (segV + 1);

    const positions = new Float32Array(gridCount * 2 * 3);
    const colors = new Float32Array(gridCount * 2 * 3);
    const uvs = new Float32Array(gridCount * 2 * 2);
    const indices = [];

    const mainCol = new THREE.Color(mainHex);
    const streakCol = new THREE.Color(streakHex);
    const rootShadowCol = mainCol.clone().multiplyScalar(0.75);
    const tmpCol = new THREE.Color();

    const outerPts = new Array(gridCount);
    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const idx = iv * row + iu;
        outerPts[idx] = evalHairCurtainPoint(side, u, v, endY, isBob);
      }
    }

    const geoTmp = new THREE.BufferGeometry();
    const tmpPos = new Float32Array(gridCount * 3);
    for (let i = 0; i < gridCount; i++) {
      tmpPos[i * 3] = outerPts[i].x;
      tmpPos[i * 3 + 1] = outerPts[i].y;
      tmpPos[i * 3 + 2] = outerPts[i].z;
    }
    const tmpIdx = [];
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = (iv + 1) * row + iu;
        const c = (iv + 1) * row + (iu + 1);
        const d = iv * row + (iu + 1);
        if (side > 0) {
          tmpIdx.push(a, d, b, b, d, c);
        } else {
          tmpIdx.push(a, b, d, b, c, d);
        }
      }
    }
    geoTmp.setAttribute('position', new THREE.BufferAttribute(tmpPos, 3));
    geoTmp.setIndex(tmpIdx);
    geoTmp.computeVertexNormals();
    const normAttr = geoTmp.attributes.normal;

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const idx = iv * row + iu;
        const p = outerPts[idx];
        const nx = normAttr.getX(idx);
        const ny = normAttr.getY(idx);
        const nz = normAttr.getZ(idx);

        const edgeU = Math.sin(Math.pow(u, 0.55) * Math.PI);
        const edgeV = Math.sin(Math.pow(v, 0.45) * Math.PI);
        const thickness = 0.010 * Math.pow(edgeU, 0.45) * Math.pow(edgeV, 0.50);

        const oOff = idx * 3;
        positions[oOff] = p.x;
        positions[oOff + 1] = p.y;
        positions[oOff + 2] = p.z;

        const iIdx = gridCount + idx;
        const iOff = iIdx * 3;
        positions[iOff] = p.x - nx * thickness;
        positions[iOff + 1] = p.y - ny * thickness;
        positions[iOff + 2] = p.z - nz * thickness;

        tmpCol.copy(mainCol);
        if (hasHighlights) {
          const frontWidth = boldMoneyPiece ? 0.24 : 0.14;
          const moneyPiece = 1.0 - MathHelp.clamp((u - frontWidth) / 0.07, 0.0, 1.0);
          const ribbonStreak = boldMoneyPiece
            ? Math.pow(Math.max(0, Math.sin(u * Math.PI * 10.0)), 6) * 0.72
            : 0.0;
          const streakMask = MathHelp.clamp(Math.max(moneyPiece, ribbonStreak), 0.0, 1.0);
          tmpCol.lerp(streakCol, streakMask);
        }

        const partShade = MathHelp.clamp(v / 0.07, 0.0, 1.0);
        tmpCol.lerp(rootShadowCol, (1.0 - partShade) * 0.45);
        const strandShade = 0.94 + 0.06 * Math.sin(u * Math.PI * 26.0);
        tmpCol.multiplyScalar(strandShade);

        colors[oOff] = tmpCol.r;
        colors[oOff + 1] = tmpCol.g;
        colors[oOff + 2] = tmpCol.b;

        colors[iOff] = tmpCol.r * 0.85;
        colors[iOff + 1] = tmpCol.g * 0.85;
        colors[iOff + 2] = tmpCol.b * 0.85;

        uvs[idx * 2] = u;
        uvs[idx * 2 + 1] = v;
        uvs[iIdx * 2] = u;
        uvs[iIdx * 2 + 1] = v;
      }
    }

    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = (iv + 1) * row + iu;
        const c = (iv + 1) * row + (iu + 1);
        const d = iv * row + (iu + 1);
        if (side > 0) {
          indices.push(a, d, b, b, d, c);
        } else {
          indices.push(a, b, d, b, c, d);
        }
      }
    }

    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = gridCount + iv * row + iu;
        const b = gridCount + (iv + 1) * row + iu;
        const c = gridCount + (iv + 1) * row + (iu + 1);
        const d = gridCount + iv * row + (iu + 1);
        if (side > 0) {
          indices.push(a, b, d, b, c, d);
        } else {
          indices.push(a, d, b, b, d, c);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function buildCurlyHair3D(hairRoot, mainHex, streakHex, hasHighlights, hairStrands) {
    const mainMat = makePhysicalMat(mainHex, {
      roughness: 0.36,
      metalness: 0.02,
      clearcoat: 0.28,
      clearcoatRoughness: 0.32
    });
    const highlightMat = makePhysicalMat(hasHighlights ? streakHex : mainHex, {
      roughness: 0.34,
      metalness: 0.02,
      clearcoat: 0.30,
      clearcoatRoughness: 0.30
    });

    const capGeo = new THREE.SphereGeometry(0.110, 32, 24);
    const pos = capGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      if (z > 0.02 && y < 0.072) {
        z -= 0.034 * Math.max(0, (0.072 - y) / 0.14);
      }
      const bump = 1.0 + 0.055 * Math.sin(x * 85) * Math.cos(y * 85) * Math.sin(z * 85);
      pos.setXYZ(i, x * 1.04 * bump, y * 1.18 * bump + 0.024, z * 1.05 * bump - 0.012);
    }
    capGeo.computeVertexNormals();
    const capMesh = new THREE.Mesh(capGeo, mainMat);
    capMesh.castShadow = true;
    hairRoot.add(capMesh);

    function addSpiralRinglet(anchor, dropLen, coilR, turns, thickness, phase, isFront, useStreak) {
      const pts = [];
      const steps = Math.max(24, Math.round(turns * 9));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = phase + t * turns * Math.PI * 2.0;
        const rEnv = coilR * Math.sin(Math.pow(t, 0.55) * Math.PI * 0.88 + 0.18);
        const flareOut = isFront ? Math.sin(t * Math.PI) * 0.010 : t * 0.016;
        const x = anchor.x + Math.cos(angle) * rEnv + Math.sign(anchor.x || 1) * flareOut;
        const y = anchor.y - t * dropLen;
        const z = anchor.z + Math.sin(angle) * rEnv + (isFront ? Math.sin(t * Math.PI) * 0.012 : -t * 0.008);
        pts.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = createTaperedTubeGeometry(
        curve,
        steps,
        (t) => thickness * (1.0 - 0.42 * Math.pow(t, 1.5)),
        7
      );
      const mesh = new THREE.Mesh(tubeGeo, useStreak ? highlightMat : mainMat);
      mesh.castShadow = true;
      hairRoot.add(mesh);
      return mesh;
    }

    const curlPivot = new THREE.Group();
    hairRoot.add(curlPivot);
    hairStrands.push({ mesh: curlPivot, phase: 0.4 });

    const ringletCount = 26;
    for (let i = 0; i < ringletCount; i++) {
      const frac = i / (ringletCount - 1);
      const theta = MathHelp.lerp(0.88, Math.PI * 2.0 - 0.88, frac);
      const isFrontSide = Math.sin(theta) !== 0 && Math.cos(theta) > 0.15;
      const anchor = new THREE.Vector3(
        0.102 * Math.sin(theta),
        0.058 + 0.025 * Math.cos(theta),
        0.100 * Math.cos(theta) - 0.008
      );
      const dropLen = isFrontSide ? 0.35 : 0.41 + (i % 3) * 0.025;
      const coilR = 0.0145 + (i % 2) * 0.003;
      const turns = 5.2 + (i % 3) * 0.6;
      const useStreak = hasHighlights && (i % 5 === 0 || i === 1 || i === ringletCount - 2);
      addSpiralRinglet(anchor, dropLen, coilR, turns, 0.0115, i * 1.15, isFrontSide, useStreak);
    }

    const bangSpecs = [
      { x: -0.040, y: 0.100, z: 0.092, len: 0.088, turns: 2.6, phase: 0.3 },
      { x: -0.020, y: 0.106, z: 0.097, len: 0.096, turns: 2.8, phase: 1.7 },
      { x: -0.002, y: 0.109, z: 0.099, len: 0.082, turns: 2.4, phase: 3.1 },
      { x: 0.018, y: 0.106, z: 0.097, len: 0.092, turns: 2.7, phase: 4.4 },
      { x: 0.038, y: 0.100, z: 0.093, len: 0.084, turns: 2.5, phase: 5.5 }
    ];
    bangSpecs.forEach((b, idx) => {
      addSpiralRinglet(
        new THREE.Vector3(b.x, b.y, b.z),
        b.len,
        0.0095,
        b.turns,
        0.0082,
        b.phase,
        true,
        hasHighlights && idx === 1
      );
    });
  }

  /* ==========================================================================
     4. ACCESORIOS DE CABEZA (TIARA Y MOÑO — COMBINABLES SIN CHOCAR)
     ========================================================================== */
  function buildPrincessTiara(targetGroup) {
    const tiaraGroup = new THREE.Group();
    tiaraGroup.position.set(0, 0.125, 0.034);
    tiaraGroup.rotation.x = -0.34;

    const silverMat = makePhysicalMat('#f1f5f9', {
      roughness: 0.16,
      metalness: 0.92,
      clearcoat: 0.85
    });
    const roseGoldMat = makePhysicalMat('#f4a8b8', {
      roughness: 0.18,
      metalness: 0.88,
      clearcoat: 0.85
    });
    const pinkGemMat = makePhysicalMat('#ff5ca8', {
      roughness: 0.05,
      metalness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02
    });
    const crystalMat = makePhysicalMat('#ffffff', {
      roughness: 0.04,
      metalness: 0.10,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02
    });

    const basePts = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const theta = MathHelp.lerp(-Math.PI * 0.56, Math.PI * 0.56, u);
      basePts.push(new THREE.Vector3(
        0.088 * Math.sin(theta),
        0.002 * Math.cos(theta),
        0.085 * Math.cos(theta) - 0.046
      ));
    }
    const baseCurve = new THREE.CatmullRomCurve3(basePts);
    tiaraGroup.add(new THREE.Mesh(
      createTaperedTubeGeometry(baseCurve, 28, () => 0.0032, 8),
      silverMat
    ));

    const crownPts = [];
    for (let i = 0; i <= 32; i++) {
      const u = i / 32;
      const s = u * 2.0 - 1.0;
      const theta = s * Math.PI * 0.48;
      const centerPeak = 0.032 * Math.exp(-Math.pow(s / 0.24, 2));
      const sideScroll = 0.015 * Math.exp(-Math.pow((Math.abs(s) - 0.46) / 0.16, 2));
      const wingScroll = 0.008 * Math.exp(-Math.pow((Math.abs(s) - 0.78) / 0.14, 2));
      crownPts.push(new THREE.Vector3(
        0.088 * Math.sin(theta),
        0.003 + centerPeak + sideScroll + wingScroll,
        0.085 * Math.cos(theta) - 0.046
      ));
    }
    const crownCurve = new THREE.CatmullRomCurve3(crownPts);
    tiaraGroup.add(new THREE.Mesh(
      createTaperedTubeGeometry(crownCurve, 36, (t) => 0.0024 + 0.0014 * Math.sin(t * Math.PI), 8),
      roseGoldMat
    ));

    const centerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.0072, 0), pinkGemMat);
    centerGem.scale.set(0.95, 1.25, 0.65);
    centerGem.position.set(0, 0.023, 0.040);
    tiaraGroup.add(centerGem);

    const topPear = new THREE.Mesh(new THREE.OctahedronGeometry(0.0046, 0), crystalMat);
    topPear.position.set(0, 0.038, 0.038);
    tiaraGroup.add(topPear);

    [-1, 1].forEach((side) => {
      const midGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.0052, 0), crystalMat);
      midGem.position.set(side * 0.023, 0.016, 0.036);
      tiaraGroup.add(midGem);

      const sideGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.0045, 0), pinkGemMat);
      sideGem.position.set(side * 0.044, 0.014, 0.026);
      tiaraGroup.add(sideGem);
    });

    targetGroup.add(tiaraGroup);
  }

  /* ==========================================================================
     5. ENSAMBLAJE DE CABEZA Y EXPRESIONES FACIALES MUY CLARAS
     ========================================================================== */
  function buildGlamHead(headContent, state, profile, skinHex, skinMat, hairStrands, accessories, gadgets) {
    const lipHex = state.lipstick === 'none'
      ? `#${new THREE.Color(skinHex).offsetHSL(0, 0.06, -0.10).getHexString()}`
      : resolveColor(state.lipstick, profile.lip);
    const isMatte = String(state.lipFinish || 'gloss').toLowerCase() === 'mate';
    const shadowHex = resolveColor(state.eyeshadow, '#b57286');
    const blushHex = resolveColor(state.blush, '#e5869b');
    const hasLashes = state.lashes !== false && String(state.lashes) !== 'false';
    const expression = String(state.expression || 'happy').toLowerCase();
    const hairHex = resolveColor(state.hairColor, profile.hair);
    const browHex = new THREE.Color(hairHex).offsetHSL(0.0, -0.06, 0.02).getStyle();

    const faceSkinMat = makePhysicalMat('#ffffff', {
      vertexColors: true,
      roughness: 0.46,
      metalness: 0.01,
      clearcoat: 0.12,
      clearcoatRoughness: 0.65
    });

    const headMesh = new THREE.Mesh(createHarmoniousHeadGeometry(skinHex), faceSkinMat);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    headContent.add(headMesh);

    // Orejas + Aretes (perlas dobles si está activo 'pearls')
    const hasPearls = accessories.includes('pearls');
    const goldMat = makeStandardMat('#f0c254', { roughness: 0.22, metalness: 0.88 });
    const pearlMat = makePhysicalMat('#fff7fb', { roughness: 0.12, metalness: 0.08, clearcoat: 1.0 });

    [-1, 1].forEach((side) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.085, -0.024, -0.008);
      earGroup.rotation.y = side * 0.18;
      earGroup.rotation.z = -side * 0.04;

      const outerEar = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 16, 14), skinMat);
      outerEar.scale.set(0.34, 1.15, 0.66);
      earGroup.add(outerEar);

      if (hasPearls) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 12, 10), goldMat);
        stud.position.set(side * 0.004, -0.012, 0.004);
        earGroup.add(stud);

        const pearlTop = new THREE.Mesh(new THREE.SphereGeometry(0.0072, 14, 12), pearlMat);
        pearlTop.position.set(side * 0.005, -0.022, 0.005);
        earGroup.add(pearlTop);

        const pearlDrop = new THREE.Mesh(new THREE.SphereGeometry(0.0102, 16, 14), pearlMat);
        pearlDrop.scale.set(0.95, 1.25, 0.95);
        pearlDrop.position.set(side * 0.005, -0.036, 0.005);
        earGroup.add(pearlDrop);
      } else {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.010, 0.0014, 10, 24), goldMat);
        hoop.rotation.y = Math.PI * 0.5;
        hoop.position.set(side * 0.002, -0.018, 0.002);
        earGroup.add(hoop);
      }

      headContent.add(earGroup);
    });

    // Estados de expresión muy marcados
const isAngry = expression === 'angry';
    const isSad = expression === 'sad';
    const isSurprised = expression === 'surprised';
    const isKiss = expression === 'kiss' || expression === 'blow_kiss';
    const isWinkExpr = expression === 'wink';
    const isInLove = expression === 'inlove';
    const isHappy = expression === 'happy';

    const eyeOpenScale = isSurprised ? 1.40 : (isAngry ? 0.58 : (isSad ? 0.72 : 1.05));
    const lowerLift = isHappy ? 0.0028 : (isAngry ? 0.0032 : (isSurprised ? -0.0025 : 0.0));
    const heartEyeMat = makePhysicalMat('#ff2a85', { roughness: 0.12, clearcoat: 1.0 });
    const lidMat = makeStandardMat(
      new THREE.Color(skinHex).lerp(new THREE.Color(shadowHex), 0.35).getStyle(),
      { roughness: 0.48 }
    );

    if (isAngry) {
      // Ceño fruncido 3D entre las cejas
      [-1, 1].forEach((side) => {
        const furrow = new THREE.Mesh(
          new THREE.BoxGeometry(0.0016, 0.011, 0.0022),
          makeStandardMat(new THREE.Color(skinHex).offsetHSL(0, 0.05, -0.18).getStyle(), { roughness: 0.5 })
        );
        furrow.position.set(side * 0.0045, 0.0035, evalHeadSurfaceZ(side * 0.0045, 0.0035) + 0.0018);
        furrow.rotation.z = -side * 0.16;
        headContent.add(furrow);
      });
    }

    [-1, 1].forEach((side) => {
      const eyeCenterX = side * 0.0395;
      const eyeCenterY = -0.0110;
      const halfW = 0.0245;
      const isWink = (isKiss || isWinkExpr) && side === 1;

      if (state.eyeshadow !== 'none') {
        const shadowPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.056, 0.036),
          new THREE.MeshBasicMaterial({
            map: createSoftRadialTexture(shadowHex, 0.46),
            transparent: true,
            depthWrite: false
          })
        );
        shadowPlane.position.set(
          eyeCenterX + side * 0.003,
          eyeCenterY + 0.0082,
          evalHeadSurfaceZ(eyeCenterX, eyeCenterY + 0.0082) + 0.0005
        );
        shadowPlane.rotation.y = side * 0.36;
        shadowPlane.rotation.z = side * 0.16;
        headContent.add(shadowPlane);
      }

      if (!isWink) {
        const eyeTex = createAlmondEyeTexture(profile.iris, side, isSurprised);
        const eyeGeo = createAlmondEyeGeometry(side, eyeOpenScale, lowerLift);
        const eyeMat = new THREE.MeshPhysicalMaterial({
          map: eyeTex,
          color: 0xffffff,
          roughness: 0.06,
          metalness: 0.0,
          clearcoat: 1.0,
          clearcoatRoughness: 0.03
        });
        headContent.add(new THREE.Mesh(eyeGeo, eyeMat));

        // Párpado superior 3D visible en Enojo y Tristeza
        if (isAngry) {
          const angryLid = createUpperEyelidGeometry(side, 0.0022, -0.0055, 0.0085);
          headContent.add(new THREE.Mesh(angryLid, lidMat));
        } else if (isSad) {
          const sadLid = createUpperEyelidGeometry(side, -0.0042, 0.0035, 0.0075);
          headContent.add(new THREE.Mesh(sadLid, lidMat));
        }

        if (isInLove) {
          const heartEye = createHeartMesh(0.0155, heartEyeMat);
          heartEye.position.set(
            eyeCenterX,
            eyeCenterY + 0.001,
            evalHeadSurfaceZ(eyeCenterX, eyeCenterY) + 0.0068
          );
          heartEye.rotation.y = side * 0.34;
          headContent.add(heartEye);
        }

        if (isSad) {
          const tearMat = makePhysicalMat('#38bdf8', {
            roughness: 0.04,
            clearcoat: 1.0,
            transparent: true,
            opacity: 0.92
          });
          const tear1 = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 12, 10), tearMat);
          tear1.scale.set(0.85, 1.65, 0.80);
          const tx1 = eyeCenterX + side * 0.014;
          const ty1 = eyeCenterY - 0.011;
          tear1.position.set(tx1, ty1, evalHeadSurfaceZ(tx1, ty1) + 0.0030);
          headContent.add(tear1);

          const tear2 = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 10, 8), tearMat);
          tear2.scale.set(0.85, 1.55, 0.80);
          const tx2 = eyeCenterX + side * 0.018;
          const ty2 = eyeCenterY - 0.024;
          tear2.position.set(tx2, ty2, evalHeadSurfaceZ(tx2, ty2) + 0.0028);
          headContent.add(tear2);
        }
      }

      // Delineado superior e inferior expresivo
      const upperPts = [];
      for (let i = 0; i <= 18; i++) {
        const u = i / 18;
        const s = u * 2.0 - 1.0;
        const hx = eyeCenterX + side * halfW * s;
        const slantY = -0.0056 * (1.0 - u) + 0.0064 * u;
        const angrySlant = isAngry ? (-0.0065 * (1.0 - u) + 0.0038 * u) : 0.0;
        const sadSlant = isSad ? (0.0032 * (1.0 - u) - 0.0058 * u) : 0.0;
        const yUpper = isWink
          ? slantY - 0.0045 * Math.sin(Math.PI * u)
          : slantY + angrySlant + sadSlant + 0.0118 * eyeOpenScale * Math.sin(Math.PI * Math.pow(u, 0.76));
        const hy = eyeCenterY + yUpper;
        const hz = evalHeadSurfaceZ(hx, hy) + 0.0022;
        upperPts.push(new THREE.Vector3(hx, hy, hz));
      }
      const wingX = eyeCenterX + side * (halfW + 0.0098);
      const wingY = eyeCenterY + (isWink ? 0.0065 : (isSad ? 0.0035 : 0.0124));
      const wingZ = evalHeadSurfaceZ(wingX, wingY) + 0.0022;
      upperPts.push(new THREE.Vector3(wingX, wingY, wingZ));

      const linerCurve = new THREE.CatmullRomCurve3(upperPts);
      const linerGeo = createTaperedTubeGeometry(
        linerCurve,
        28,
        (t) => Math.sin(Math.pow(t, 0.62) * Math.PI) * 0.0026 + 0.0004,
        8
      );
      headContent.add(new THREE.Mesh(linerGeo, makeStandardMat('#0f0812', { roughness: 0.22 })));

      if (!isWink) {
        const lowerPts = [];
        for (let i = 0; i <= 16; i++) {
          const u = i / 16;
          const s = u * 2.0 - 1.0;
          const hx = eyeCenterX + side * halfW * s;
          const slantY = -0.0056 * (1.0 - u) + 0.0064 * u;
          const yLower = slantY - (0.0085 - lowerLift) * Math.sin(Math.PI * Math.pow(u, 0.90));
          const hy = eyeCenterY + yLower;
          const hz = evalHeadSurfaceZ(hx, hy) + 0.0012;
          lowerPts.push(new THREE.Vector3(hx, hy, hz));
        }
        const lowerCurve = new THREE.CatmullRomCurve3(lowerPts);
        headContent.add(new THREE.Mesh(
          new THREE.TubeGeometry(lowerCurve, 18, 0.00065, 6, false),
          makeStandardMat('#261318', { roughness: 0.45 })
        ));
      }

      if (hasLashes && !isWink) {
        const lashMat = makeStandardMat('#0d060f', { roughness: 0.22 });
        for (let i = 0; i < 8; i++) {
          const t = i / 7;
          const u = MathHelp.lerp(0.45, 0.99, t);
          const s = u * 2.0 - 1.0;
          const bx = eyeCenterX + side * halfW * s;
          const slantY = -0.0056 * (1.0 - u) + 0.0064 * u;
          const by = eyeCenterY + slantY + 0.0118 * eyeOpenScale * Math.sin(Math.PI * Math.pow(u, 0.76));
          const bz = evalHeadSurfaceZ(bx, by) + 0.0018;
          const len = 0.72 + t * 0.62;

          const lc = new THREE.CatmullRomCurve3([
            new THREE.Vector3(bx, by, bz),
            new THREE.Vector3(bx + side * 0.0044 * len, by + 0.0022 * len, bz + 0.0020),
            new THREE.Vector3(bx + side * 0.0085 * len, by + 0.0048 * len, bz + 0.0028)
          ]);
          const lashGeo = createTaperedTubeGeometry(lc, 8, (k) => (1 - k * 0.90) * 0.0011, 6);
          headContent.add(new THREE.Mesh(lashGeo, lashMat));
        }
      }

      // Cejas muy expresivas y gruesas para leerse desde cualquier distancia
      let browInnerY = 0.0185;
      let browMidY = 0.0252;
      let browOuterY = 0.0190;

      if (isSurprised) {
        browInnerY += 0.0115;
        browMidY += 0.0145;
        browOuterY += 0.0105;
      } else if (isAngry) {
        browInnerY -= 0.0115;
        browMidY -= 0.0025;
        browOuterY += 0.0078;
      } else if (isSad) {
        browInnerY += 0.0085;
        browMidY += 0.0005;
        browOuterY -= 0.0085;
      } else if (isKiss) {
        browInnerY += side === -1 ? 0.0055 : 0.0015;
        browMidY += side === -1 ? 0.0075 : 0.0025;
        browOuterY += side === -1 ? 0.0045 : 0.0010;
      } else if (isInLove) {
        browInnerY += 0.0045;
        browMidY += 0.0062;
        browOuterY += 0.0038;
      } else {
        browInnerY += 0.0032;
        browMidY += 0.0046;
      }

      const browPtsRaw = [
        [eyeCenterX - side * 0.0210, eyeCenterY + browInnerY],
        [eyeCenterX - side * 0.0030, eyeCenterY + browMidY],
        [eyeCenterX + side * 0.0125, eyeCenterY + browMidY + 0.0022],
        [eyeCenterX + side * 0.0280, eyeCenterY + browOuterY]
      ];
      const browCurve = new THREE.CatmullRomCurve3(
        browPtsRaw.map(([bx, by]) => new THREE.Vector3(bx, by, evalHeadSurfaceZ(bx, by) + 0.0022))
      );
      const browGeo = createTaperedTubeGeometry(
        browCurve,
        24,
        (t) => MathHelp.lerp(0.0031, 0.00065, Math.pow(t, 1.35)),
        8,
        1.0,
        0.62
      );
      headContent.add(new THREE.Mesh(browGeo, makeStandardMat(browHex, { roughness: 0.45 })));

      if (state.blush !== 'none' || isAngry || isInLove || isKiss) {
        const activeBlushHex = isAngry ? '#ef4444' : blushHex;
        const blushAlpha = (isKiss || isInLove || isAngry) ? 0.56 : 0.32;
        const blushPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.056, 0.036),
          new THREE.MeshBasicMaterial({
            map: createSoftRadialTexture(activeBlushHex, blushAlpha),
            transparent: true,
            depthWrite: false
          })
        );
        blushPlane.position.set(side * 0.044, -0.032, evalHeadSurfaceZ(side * 0.044, -0.032) + 0.0016);
        blushPlane.rotation.y = side * 0.54;
        headContent.add(blushPlane);
      }
    });

    // Nariz esculpida
    const noseSkinMat = makePhysicalMat(
      new THREE.Color(skinHex).lerp(new THREE.Color('#fff5ef'), 0.14).getStyle(),
      { roughness: 0.42, clearcoat: 0.14, clearcoatRoughness: 0.56 }
    );
    const noseShadowMat = makeStandardMat(
      new THREE.Color(skinHex).offsetHSL(-0.005, 0.05, -0.14).getStyle(),
      { roughness: 0.55 }
    );

    const bridgeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.014, evalHeadSurfaceZ(0, -0.014) + 0.0010),
      new THREE.Vector3(0, -0.026, evalHeadSurfaceZ(0, -0.026) + 0.0024),
      new THREE.Vector3(0, -0.038, evalHeadSurfaceZ(0, -0.038) + 0.0038)
    ]);
    const bridgeGeo = createTaperedTubeGeometry(
      bridgeCurve,
      14,
      (t) => MathHelp.lerp(0.0018, 0.0030, t),
      10,
      0.85,
      1.05
    );
    headContent.add(new THREE.Mesh(bridgeGeo, noseSkinMat));

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 20, 16), noseSkinMat);
    noseTip.scale.set(1.04, 0.84, 1.05);
    noseTip.position.set(0, -0.0405, evalHeadSurfaceZ(0, -0.0405) + 0.0042);
    headContent.add(noseTip);

    const columella = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 12, 10), noseShadowMat);
    columella.scale.set(1.20, 0.60, 0.85);
    columella.position.set(0, -0.0432, evalHeadSurfaceZ(0, -0.0432) + 0.0022);
    headContent.add(columella);

    [-1, 1].forEach((side) => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.0024, 14, 12), noseSkinMat);
      nostril.scale.set(1.02, 0.86, 0.92);
      nostril.position.set(side * 0.0042, -0.0420, evalHeadSurfaceZ(side * 0.0042, -0.0420) + 0.0015);
      headContent.add(nostril);
    });

    // Labios muy expresivos según cada emoción
    const lipMat = makePhysicalMat('#ffffff', {
      vertexColors: true,
      roughness: (isMatte && !isKiss) ? 0.66 : 0.10,
      clearcoat: (isMatte && !isKiss) ? 0.0 : 0.98,
      clearcoatRoughness: 0.04
    });

    let wMul = 1.22;
    let cornerLift = 0.0064;
    let lowerScale = 1.08;
    let poutBoost = 0.0;
    let openGap = 0.0026;
    let showTeeth = isHappy || isInLove;

    if (isKiss) {
      wMul = 0.44;
      cornerLift = 0.0005;
      lowerScale = 1.38;
      poutBoost = 0.0125;
      openGap = 0.0024;
      showTeeth = false;
    } else if (isSurprised) {
      wMul = 0.52;
      cornerLift = 0.0;
      lowerScale = 1.65;
      poutBoost = 0.0045;
      openGap = 0.0072;
      showTeeth = false;
    } else if (isAngry) {
      wMul = 0.94;
      cornerLift = -0.0072;
      lowerScale = 1.06;
      poutBoost = 0.0024;
      openGap = 0.0018;
      showTeeth = true;
    } else if (isSad) {
      wMul = 0.84;
      cornerLift = -0.0068;
      lowerScale = 1.25;
      poutBoost = 0.0022;
      openGap = 0.0;
      showTeeth = false;
    } else if (isInLove || isHappy) {
      wMul = 1.24;
      cornerLift = 0.0068;
      lowerScale = 1.10;
      poutBoost = 0.0008;
      openGap = 0.0028;
      showTeeth = true;
    }

    const mouthY = -0.0605;

    if (openGap > 0.0008) {
      const mouthVoid = new THREE.Mesh(
        new THREE.SphereGeometry(0.012 * wMul, 16, 12),
        makeStandardMat('#260710', { roughness: 0.85 })
      );
      mouthVoid.scale.set(1.18, openGap * 225, 0.58);
      mouthVoid.position.set(0, mouthY, evalHeadSurfaceZ(0, mouthY) + 0.0024);
      headContent.add(mouthVoid);

      if (showTeeth) {
        const teethMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.024 * wMul, 0.0040, 0.0045),
          makePhysicalMat('#ffffff', { roughness: 0.16, clearcoat: 0.85 })
        );
        teethMesh.position.set(0, mouthY + 0.0009, evalHeadSurfaceZ(0, mouthY) + 0.0046);
        headContent.add(teethMesh);
      }
    }

    const upperLipGeo = createSculptedLipGeometry(true, mouthY, wMul, cornerLift, lowerScale, lipHex, poutBoost, openGap);
    headContent.add(new THREE.Mesh(upperLipGeo, lipMat));

    const lowerLipGeo = createSculptedLipGeometry(false, mouthY, wMul, cornerLift, lowerScale, lipHex, poutBoost, openGap);
    headContent.add(new THREE.Mesh(lowerLipGeo, lipMat));

    if (openGap <= 0.0010) {
      const partingPts = [];
      for (let i = 0; i <= 30; i++) {
        const u = (i / 30) * 2.0 - 1.0;
        const px = 0.0195 * wMul * u;
        const py = mouthY + evalMouthPartingY(u, cornerLift, 0.0);
        const pz = evalHeadSurfaceZ(px, py) + 0.0022 + poutBoost * 0.65 * (1.0 - u * u);
        partingPts.push(new THREE.Vector3(px, py, pz));
      }
      const partingCurve = new THREE.CatmullRomCurve3(partingPts);
      const partingGeo = createTaperedTubeGeometry(
        partingCurve,
        30,
        (t) => Math.sin(t * Math.PI) * 0.0008 + 0.00025,
        6
      );
      headContent.add(new THREE.Mesh(
        partingGeo,
        makeStandardMat(new THREE.Color(lipHex).multiply(new THREE.Color(0.35, 0.28, 0.32)).getStyle(), { roughness: 0.48 })
      ));
    }

    // Corazones 3D flotando cuando tira un beso o está enamorada
    if (isKiss || isInLove) {
      const floatHeartMat = makePhysicalMat('#ff2a85', {
        roughness: 0.08,
        metalness: 0.05,
        clearcoat: 1.0
      });
      const h1 = createHeartMesh(0.018, floatHeartMat);
      h1.position.set(0.105, 0.055, 0.025);
      h1.rotation.set(-0.10, 0.25, -0.22);
      headContent.add(h1);

      const h2 = createHeartMesh(0.012, floatHeartMat);
      h2.position.set(0.128, 0.088, 0.015);
      h2.rotation.set(-0.08, 0.20, -0.35);
      headContent.add(h2);
    }

    // Cabello
    buildHairOnHead(headContent, state, profile, hairStrands);

    // Accesorios de cabeza (se pueden combinar varios a la vez sin chocar)
    // Accesorios de cabeza (se pueden combinar varios a la vez sin chocar)
    if (accessories.includes('tiara')) {
      buildPrincessTiara(headContent);
    }

    if (accessories.includes('bow')) {
      const bowMat = makePhysicalMat('#ff5ca8', { roughness: 0.28, clearcoat: 0.55 });
      const bowGroup = new THREE.Group();
      bowGroup.position.set(-0.068, 0.096, 0.022);
      bowGroup.rotation.set(-0.18, -0.45, 0.42);

      const centerKnot = new THREE.Mesh(new THREE.SphereGeometry(0.013, 14, 12), bowMat);
      bowGroup.add(centerKnot);

      [-1, 1].forEach((side) => {
        const wing = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), bowMat);
        wing.scale.set(1.25, 0.78, 0.45);
        wing.position.set(side * 0.026, 0.004, 0);
        wing.rotation.z = side * 0.22;
        bowGroup.add(wing);
      });
      headContent.add(bowGroup);
    }

    if (accessories.includes('hair_clip')) {
      const clipGroup = new THREE.Group();
      const goldMat = makeStandardMat('#f5c85b', { roughness: 0.18, metalness: 0.94 });
      const gemMat = makePhysicalMat('#ff2a85', { roughness: 0.05, clearcoat: 1.0 });

      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.0045, 0.004), goldMat);
      clipGroup.add(bar);

      const heartPin = createHeartMesh(0.0085, gemMat);
      heartPin.position.set(0.008, 0, 0.0025);
      clipGroup.add(heartPin);

      clipGroup.position.set(0.056, 0.082, 0.078);
      clipGroup.rotation.set(-0.28, 0.56, -0.32);
      headContent.add(clipGroup);
    }

    if (accessories.includes('silk_ribbon')) {
      const ribbonMat = makePhysicalMat('#ff75b8', { roughness: 0.30, clearcoat: 0.45 });
      const ribGroup = new THREE.Group();
      ribGroup.position.set(0, 0.118, -0.068);
      ribGroup.rotation.x = 0.35;

      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.014, 14, 12), ribbonMat);
      ribGroup.add(knot);

      [-1, 1].forEach((side) => {
        const loop = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), ribbonMat);
        loop.scale.set(1.35, 0.78, 0.42);
        loop.position.set(side * 0.032, 0.004, 0);
        loop.rotation.z = side * 0.25;
        ribGroup.add(loop);

        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.095, 0.004), ribbonMat);
        tail.position.set(side * 0.018, -0.048, -0.004);
        tail.rotation.z = side * 0.18;
        ribGroup.add(tail);
      });
      headContent.add(ribGroup);
    }

    // Lentes y Audífonos (combinables entre sí y con tiara/moño)
    if (gadgets.includes('glasses')) {
      const frameMat = makeStandardMat('#2a1d24', { roughness: 0.22, metalness: 0.72 });
      [-1, 1].forEach((side) => {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0220, 0.0017, 10, 28), frameMat);
        rim.scale.set(1.18, 0.78, 1.0);
        rim.position.set(side * 0.0395, -0.0125, 0.104);
        rim.rotation.y = side * 0.22;
        headContent.add(rim);
      });
      const bridgeBar = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, 0.025, 8), frameMat);
      bridgeBar.rotation.z = Math.PI * 0.5;
      bridgeBar.position.set(0, -0.0115, 0.107);
      headContent.add(bridgeBar);
    }
    if (gadgets.includes('headphones')) {
      const hpMat = makePhysicalMat('#ff75b8', { roughness: 0.25, clearcoat: 0.6 });
      const cushionMat = makeStandardMat('#fce7f3', { roughness: 0.65 });
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.109, 0.0085, 12, 32, Math.PI), hpMat);
      band.position.set(0, 0.026, -0.020);
      band.rotation.x = -0.18;
      headContent.add(band);
      [-1, 1].forEach((side) => {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.018, 20), hpMat);
        cup.rotation.z = Math.PI * 0.5;
        cup.position.set(side * 0.107, -0.010, -0.006);
        headContent.add(cup);

        const pad = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0055, 10, 22), cushionMat);
        pad.rotation.y = Math.PI * 0.5;
        pad.position.set(side * 0.098, -0.010, -0.006);
        headContent.add(pad);
      });
    }
  }

  function buildHairOnHead(headContent, state, profile, hairStrands) {
    const hairRoot = new THREE.Group();
    hairRoot.name = 'HairRootLocal';

    const style = String(state.hairStyle || 'long').toLowerCase();
    const hairHex = resolveColor(state.hairColor, profile.hair);
    const noStreak = state.streak === 'none';
    const hasHighlights = !noStreak && (Boolean(state.streak) || style === 'bangs');
    const streakHex = state.streak && state.streak !== 'none'
      ? resolveColor(state.streak, profile.streak)
      : (state.hairColor
          ? `#${new THREE.Color(hairHex).offsetHSL(0.02, 0.08, 0.38).getHexString()}`
          : profile.streak);

    if (style === 'curly') {
      buildCurlyHair3D(hairRoot, hairHex, streakHex, hasHighlights, hairStrands);
      headContent.add(hairRoot);
      return;
    }

    const hairMat = makePhysicalMat('#ffffff', {
      vertexColors: true,
      roughness: 0.28,
      metalness: 0.03,
      clearcoat: 0.38,
      clearcoatRoughness: 0.24
    });

    if (style === 'pigtails' || style === 'updo') {
      [-1, 1].forEach((side) => {
        const capGeo = createUnifiedHairCurtainGeometry(side, -0.095, true, hairHex, streakHex, hasHighlights, false);
        const capMesh = new THREE.Mesh(capGeo, hairMat);
        capMesh.castShadow = true;
        capMesh.receiveShadow = true;
        hairRoot.add(capMesh);
      });

      if (style === 'pigtails') {
        [-1, 1].forEach((side, idx) => {
          const tie = new THREE.Mesh(
            new THREE.TorusGeometry(0.020, 0.0065, 10, 20),
            makeStandardMat('#ff7eb9', { roughness: 0.35 })
          );
          tie.position.set(side * 0.094, 0.044, -0.036);
          tie.rotation.y = side * 0.85;
          hairRoot.add(tie);

          const pigPivot = new THREE.Group();
          pigPivot.position.set(side * 0.094, 0.044, -0.036);

          const pigCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(side * 0.044, -0.095, -0.025),
            new THREE.Vector3(side * 0.060, -0.26, -0.035),
            new THREE.Vector3(side * 0.052, -0.44, -0.030)
          ]);
          const pigGeo = createTaperedTubeGeometry(
            pigCurve,
            24,
            (t) => MathHelp.lerp(0.025, 0.009, Math.pow(t, 1.4)),
            12
          );
          const pigMesh = new THREE.Mesh(
            pigGeo,
            makePhysicalMat(hasHighlights && idx === 0 ? streakHex : hairHex, { roughness: 0.28, clearcoat: 0.36 })
          );
          pigMesh.castShadow = true;
          pigPivot.add(pigMesh);
          hairRoot.add(pigPivot);
          hairStrands.push({ mesh: pigPivot, phase: idx * 1.6 });
        });
      } else {
        const bun = new THREE.Mesh(
          new THREE.SphereGeometry(0.056, 24, 18),
          makePhysicalMat(hairHex, { roughness: 0.28, clearcoat: 0.36 })
        );
        bun.position.set(0, 0.150, -0.022);
        bun.castShadow = true;
        hairRoot.add(bun);

        const ribbon = new THREE.Mesh(
          new THREE.TorusGeometry(0.040, 0.0065, 10, 24),
          makeStandardMat('#ff7eb9', { roughness: 0.35 })
        );
        ribbon.rotation.x = Math.PI * 0.45;
        ribbon.position.set(0, 0.128, -0.018);
        hairRoot.add(ribbon);
      }
    } else {
      const endY =
        style === 'short' ? -0.105 :
        style === 'bob' ? -0.175 :
        style === 'chest' ? -0.31 : -0.44;
      const isBob = style === 'bob' || style === 'short';
      const boldMoneyPiece = style === 'bangs' || Boolean(state.streak && state.streak !== 'none');

      [-1, 1].forEach((side, idx) => {
        const curtainPivot = new THREE.Group();
        const curtainGeo = createUnifiedHairCurtainGeometry(
          side,
          endY,
          isBob,
          hairHex,
          streakHex,
          hasHighlights,
          boldMoneyPiece
        );
        const curtainMesh = new THREE.Mesh(curtainGeo, hairMat);
        curtainMesh.castShadow = true;
        curtainMesh.receiveShadow = true;
        curtainPivot.add(curtainMesh);
        hairRoot.add(curtainPivot);
        hairStrands.push({ mesh: curtainPivot, phase: idx * 1.5 });
      });
    }

    headContent.add(hairRoot);
  }

  /* ==========================================================================
     6. TORSO + HOMBROS + CUELLO ESBELTO INTEGRADO
     ========================================================================== */
  const UPPER_BODY_PROFILE = [
    [0.820, 0.068, 0.055, 0.000],
    [0.855, 0.104, 0.082, 0.000],
    [0.890, 0.112, 0.088, 0.000],
    [0.930, 0.092, 0.074, 0.000],
    [0.975, 0.074, 0.059, 0.000],
    [1.045, 0.088, 0.070, 0.000],
    [1.110, 0.108, 0.082, 0.000],
    [1.168, 0.120, 0.074, -0.002],
    [1.198, 0.128, 0.062, -0.004],
    [1.214, 0.068, 0.042, -0.007],
    [1.226, 0.027, 0.027, -0.010],
    [1.265, 0.0245, 0.0245, -0.011],
    [1.305, 0.0245, 0.0245, -0.011],
    [1.352, 0.025, 0.025, -0.011]
  ];

  function evalUpperBodyParams(y) {
    const n = UPPER_BODY_PROFILE.length;
    if (y <= UPPER_BODY_PROFILE[0][0]) {
      return [UPPER_BODY_PROFILE[0][1], UPPER_BODY_PROFILE[0][2], UPPER_BODY_PROFILE[0][3]];
    }
    if (y >= UPPER_BODY_PROFILE[n - 1][0]) {
      return [UPPER_BODY_PROFILE[n - 1][1], UPPER_BODY_PROFILE[n - 1][2], UPPER_BODY_PROFILE[n - 1][3]];
    }

    let idx = 0;
    for (let i = 0; i < n - 1; i++) {
      if (y >= UPPER_BODY_PROFILE[i][0] && y <= UPPER_BODY_PROFILE[i + 1][0]) {
        idx = i;
        break;
      }
    }
    const p0 = UPPER_BODY_PROFILE[Math.max(0, idx - 1)];
    const p1 = UPPER_BODY_PROFILE[idx];
    const p2 = UPPER_BODY_PROFILE[Math.min(n - 1, idx + 1)];
    const p3 = UPPER_BODY_PROFILE[Math.min(n - 1, idx + 2)];

    const t = MathHelp.clamp((y - p1[0]) / Math.max(1e-6, p2[0] - p1[0]), 0.0, 1.0);
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const rx = h00 * p1[1] + h10 * 0.42 * (p2[1] - p0[1]) + h01 * p2[1] + h11 * 0.42 * (p3[1] - p1[1]);
    const rz = h00 * p1[2] + h10 * 0.42 * (p2[2] - p0[2]) + h01 * p2[2] + h11 * 0.42 * (p3[2] - p1[2]);
    const zc = h00 * p1[3] + h10 * 0.42 * (p2[3] - p0[3]) + h01 * p2[3] + h11 * 0.42 * (p3[3] - p1[3]);
    return [Math.max(0.001, rx), Math.max(0.001, rz), zc];
  }

  function evalUpperBodyPoint(y, theta, radialOffset = 0.0) {
    const [rx, rz, zc] = evalUpperBodyParams(y);
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    const x = (rx + radialOffset) * sinT;
    let z = zc + (rz + radialOffset) * cosT;

    if (cosT > 0) {
      const bustY = Math.exp(-Math.pow((y - 1.108) / 0.040, 2));
      const bustSide = Math.exp(-Math.pow((Math.abs(sinT) - 0.44) / 0.34, 2));
      const sternumDip = -0.0042 * Math.exp(-Math.pow(sinT / 0.16, 2));
      z += cosT * bustY * (0.022 * bustSide + sternumDip);
    } else {
      const gluteY = Math.exp(-Math.pow((y - 0.885) / 0.042, 2));
      const gluteSide = Math.exp(-Math.pow((Math.abs(sinT) - 0.42) / 0.38, 2));
      z += cosT * gluteY * (0.014 * gluteSide);
    }

    return [x, y, z];
  }

  function createUnifiedUpperBodyGeometry(skinHex) {
    const segU = 64;
    const segV = 64;
    const positions = [];
    const colors = [];
    const uvs = [];
    const indices = [];

    const baseCol = new THREE.Color(skinHex);
    const softShadeCol = baseCol.clone().offsetHSL(-0.005, 0.04, -0.075);
    const tmpCol = new THREE.Color();

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const y = MathHelp.lerp(0.820, 1.352, v);
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const theta = (u - 0.5) * Math.PI * 2.0;
        const [x, py, z] = evalUpperBodyPoint(y, theta, 0.0);
        positions.push(x, py, z);
        uvs.push(u, v);

        const chinShade = MathHelp.clamp((y - 1.258) / 0.032, 0.0, 1.0);
        tmpCol.copy(baseCol).lerp(softShadeCol, Math.pow(chinShade, 1.4) * 0.42);
        colors.push(tmpCol.r, tmpCol.g, tmpCol.b);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = (iv + 1) * row + iu;
        const c = (iv + 1) * row + (iu + 1);
        const d = iv * row + (iu + 1);
        indices.push(a, d, b, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function createInnerTopGeometry(outfit) {
    const segU = 64;
    const segV = 40;
    const positions = [];
    const uvs = [];
    const indices = [];

    const isDress = outfit === 'dress';
    const isHoodie = outfit === 'hoodie';
    const isCrop = outfit === 'casual';
    const yBot = isDress ? 0.940 : (isCrop ? 1.015 : 0.962);
    const baseThick = isHoodie ? 0.0075 : 0.0040;

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const theta = (u - 0.5) * Math.PI * 2.0;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const shoulderRaise = Math.pow(Math.abs(sinT), 1.4) * 0.022;
        const frontNeckDip = cosT > 0 ? -0.016 * Math.exp(-Math.pow(sinT / 0.36, 2)) : -0.006;
        const yTop = 1.212 + shoulderRaise + frontNeckDip;

        const y = MathHelp.lerp(yBot, yTop, v);
        const [x, py, z] = evalUpperBodyPoint(y, theta, baseThick);
        positions.push(x, py, z);
        uvs.push(u, v);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = (iv + 1) * row + iu;
        const c = (iv + 1) * row + (iu + 1);
        const d = iv * row + (iu + 1);
        indices.push(a, d, b, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function createOpenCardiganGeometry(cardiganHex, trimHex) {
    const segU = 68;
    const segV = 36;
    const positions = [];
    const colors = [];
    const indices = [];

    const mainCol = new THREE.Color(cardiganHex);
    const trimCol = new THREE.Color(trimHex);
    const tmpCol = new THREE.Color();

    const yBot = 0.968;
    const yTopBase = 1.214;
    const baseThick = 0.0076;

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const openHalfAngle = MathHelp.lerp(0.36, 0.56, Math.pow(v, 0.85));
        const theta = MathHelp.lerp(openHalfAngle, Math.PI * 2.0 - openHalfAngle, u);

        const sinT = Math.sin(theta);
        const shoulderRaise = Math.pow(Math.abs(sinT), 1.4) * 0.022;
        const yTop = yTopBase + shoulderRaise;
        const y = MathHelp.lerp(yBot, yTop, v);

        const [x, py, z] = evalUpperBodyPoint(y, theta, baseThick);
        positions.push(x, py, z);

        const edgeDist = Math.min(u, 1.0 - u);
        const isTrim = edgeDist < 0.048 || v < 0.055;
        tmpCol.copy(isTrim ? trimCol : mainCol);
        colors.push(tmpCol.r, tmpCol.g, tmpCol.b);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = (iv + 1) * row + iu;
        const c = (iv + 1) * row + (iu + 1);
        const d = iv * row + (iu + 1);
        indices.push(a, d, b, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function createPantsPelvisGeometry(isLowRise) {
    const segU = 64;
    const segV = 28;
    const positions = [];
    const uvs = [];
    const indices = [];

    const yTop = isLowRise ? 0.945 : 0.974;
    const yBot = 0.805;

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const y = MathHelp.lerp(yBot, yTop, v);
      const radialBoost = 0.0082;

      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const theta = (u - 0.5) * Math.PI * 2.0;
        let [x, py, z] = evalUpperBodyPoint(y, theta, radialBoost);

        if (y < 0.855) {
          const tCrotch = MathHelp.clamp((0.855 - y) / (0.855 - yBot), 0.0, 1.0);
          const pinchZ = 1.0 - 0.16 * tCrotch * Math.exp(-Math.pow(Math.sin(theta) / 0.35, 2));
          z *= pinchZ;
          x *= 1.0 + 0.04 * tCrotch;
        }

        positions.push(x, py, z);
        uvs.push(u, v);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = (iv + 1) * row + iu;
        const c = (iv + 1) * row + (iu + 1);
        const d = iv * row + (iu + 1);
        indices.push(a, d, b, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function createPleatedSkirtGeometry(isDress) {
    const segU = 84;
    const segV = 28;
    const positions = [];
    const uvs = [];
    const indices = [];

    const yTop = isDress ? 0.015 : 0.022;
    const yBot = isDress ? -0.340 : -0.250;
    const flareBot = isDress ? 0.220 : 0.215;

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const drop = 1.0 - v;
      const y = MathHelp.lerp(yBot, yTop, v);

      const waistRx = 0.086;
      const waistRz = 0.072;
      const curRx = MathHelp.lerp(waistRx, flareBot, Math.pow(drop, 0.78));
      const curRz = MathHelp.lerp(waistRz, flareBot * 0.85, Math.pow(drop, 0.78));

      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const theta = (u - 0.5) * Math.PI * 2.0;

        const pleatWave = Math.cos(theta * 18.0) * 0.0062 * Math.pow(drop, 0.85);
        const x = (curRx + pleatWave) * Math.sin(theta);
        const z = (curRz + pleatWave) * Math.cos(theta);

        positions.push(x, y, z);
        uvs.push(u, v);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = (iv + 1) * row + iu;
        const c = (iv + 1) * row + (iu + 1);
        const d = iv * row + (iu + 1);
        indices.push(a, d, b, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /* -------------------- Piernas Articuladas (Muslo + Rodilla) -------------------- */
  function createThighGeometry(pantsMode) {
    const isPants = pantsMode === 'flare' || pantsMode === 'straight';
    const pts = isPants ? [
      new THREE.Vector2(0.041, -0.420),
      new THREE.Vector2(0.059, -0.225),
      new THREE.Vector2(0.068, -0.040),
      new THREE.Vector2(0.062, 0.020)
    ] : [
      new THREE.Vector2(0.040, -0.420),
      new THREE.Vector2(0.058, -0.235),
      new THREE.Vector2(0.068, -0.050),
      new THREE.Vector2(0.056, 0.015)
    ];

    const geo = new THREE.LatheGeometry(pts, 28);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const thighCurve = Math.exp(-Math.pow((y + 0.230) / 0.120, 2)) * 0.0052;
      pos.setZ(i, z * 1.05 + thighCurve);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function createCalfGeometry(pantsMode) {
    const isFlare = pantsMode === 'flare';
    const isStraight = pantsMode === 'straight';
    const isPants = isFlare || isStraight;

    const pts = isFlare ? [
      new THREE.Vector2(0.056, -0.383),
      new THREE.Vector2(0.048, -0.275),
      new THREE.Vector2(0.043, -0.125),
      new THREE.Vector2(0.041, 0.005)
    ] : isStraight ? [
      new THREE.Vector2(0.042, -0.375),
      new THREE.Vector2(0.046, -0.195),
      new THREE.Vector2(0.046, 0.005)
    ] : [
      new THREE.Vector2(0.022, -0.360),
      new THREE.Vector2(0.025, -0.305),
      new THREE.Vector2(0.043, -0.165),
      new THREE.Vector2(0.037, -0.040),
      new THREE.Vector2(0.040, 0.005)
    ];

    const geo = new THREE.LatheGeometry(pts, 28);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const calfCurve = isPants ? 0 : -Math.exp(-Math.pow((y + 0.165) / 0.075, 2)) * 0.0068;
      pos.setZ(i, z * 1.05 + calfCurve);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function createKneeSockGroupLocal(stripeHex) {
    const sockGroup = new THREE.Group();
    const sockMat = makeStandardMat('#f8f9fc', { roughness: 0.52 });
    const stripeMat = makeStandardMat(stripeHex, { roughness: 0.48 });

    const pts = [
      new THREE.Vector2(0.0235, -0.355),
      new THREE.Vector2(0.0265, -0.300),
      new THREE.Vector2(0.0445, -0.165),
      new THREE.Vector2(0.0385, -0.040),
      new THREE.Vector2(0.0405, -0.013)
    ];
    const sockGeo = new THREE.LatheGeometry(pts, 28);
    const pos = sockGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const calfCurve = -Math.exp(-Math.pow((y + 0.165) / 0.075, 2)) * 0.0068;
      pos.setZ(i, z * 1.05 + calfCurve);
    }
    sockGeo.computeVertexNormals();
    const sockMesh = new THREE.Mesh(sockGeo, sockMat);
    sockMesh.castShadow = true;
    sockGroup.add(sockMesh);

    [-0.057, -0.037].forEach((sy) => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.0398, 0.0024, 8, 28), stripeMat);
      band.rotation.x = Math.PI * 0.5;
      band.scale.set(1.0, 1.06, 1.0);
      band.position.set(0, sy, 0);
      sockGroup.add(band);
    });

    return sockGroup;
  }

  function createPlatformLoaferGroup(shoeHex) {
    const shoeGroup = new THREE.Group();
    const shoeMat = makePhysicalMat(shoeHex, { roughness: 0.26, metalness: 0.06, clearcoat: 0.62 });
    const soleMat = makeStandardMat('#261610', { roughness: 0.58 });

    const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.033, 0.028, 24), soleMat);
    sole.scale.set(1.02, 1.0, 1.56);
    sole.position.set(0, 0.014, 0.022);
    sole.castShadow = true;
    shoeGroup.add(sole);

    const upper = new THREE.Mesh(new THREE.SphereGeometry(0.030, 22, 16), shoeMat);
    upper.scale.set(1.02, 0.85, 1.60);
    upper.position.set(0, 0.036, 0.024);
    upper.castShadow = true;
    shoeGroup.add(upper);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.027, 0.044, 22), shoeMat);
    cuff.position.set(0, 0.060, -0.002);
    cuff.castShadow = true;
    shoeGroup.add(cuff);

    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.012, 0.022), shoeMat);
    strap.position.set(0, 0.054, 0.026);
    strap.rotation.x = 0.25;
    shoeGroup.add(strap);

    return shoeGroup;
  }

  /* ==========================================================================
     7. BRAZOS, GADGETS Y ACCESORIOS 3D (TODOS VISIBLES Y COMBINABLES)
     ========================================================================== */
  function buildSculptedHand(side, skinMat) {
    const handGroup = new THREE.Group();
    handGroup.rotation.y = -side * 0.56;

    const wristJoin = new THREE.Mesh(new THREE.SphereGeometry(0.0155, 14, 12), skinMat);
    wristJoin.scale.set(0.85, 1.15, 0.95);
    wristJoin.position.set(0, 0.002, 0);
    handGroup.add(wristJoin);

    const palmGeo = new THREE.SphereGeometry(0.0185, 18, 14);
    const pPos = palmGeo.attributes.position;
    for (let i = 0; i < pPos.count; i++) {
      let px = pPos.getX(i);
      let py = pPos.getY(i);
      let pz = pPos.getZ(i);
      const widthTaper = py < 0 ? 1.08 : 0.82;
      px *= 0.46;
      py *= 1.22;
      pz *= 0.94 * widthTaper;
      pPos.setXYZ(i, px, py, pz);
    }
    palmGeo.computeVertexNormals();
    const palmMesh = new THREE.Mesh(palmGeo, skinMat);
    palmMesh.position.set(0, -0.017, 0.0);
    palmMesh.castShadow = true;
    handGroup.add(palmMesh);

    const fingerSpecs = [
      { z: 0.0110, y0: -0.033, len: 0.031, r: 0.0031, splay: 0.05 },
      { z: 0.0036, y0: -0.035, len: 0.035, r: 0.0032, splay: 0.01 },
      { z: -0.0036, y0: -0.034, len: 0.032, r: 0.0030, splay: -0.03 },
      { z: -0.0102, y0: -0.031, len: 0.025, r: 0.0026, splay: -0.08 }
    ];

    fingerSpecs.forEach((f) => {
      const fCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, f.y0, f.z),
        new THREE.Vector3(-side * 0.0035, f.y0 - f.len * 0.52, f.z + f.splay * 0.018),
        new THREE.Vector3(-side * 0.0085, f.y0 - f.len, f.z + f.splay * 0.030)
      ]);
      const fGeo = createTaperedTubeGeometry(
        fCurve,
        8,
        (t) => f.r * (1.0 - t * 0.34),
        8
      );
      const fMesh = new THREE.Mesh(fGeo, skinMat);
      fMesh.castShadow = true;
      handGroup.add(fMesh);
    });

    const thumbCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-side * 0.003, -0.013, 0.012),
      new THREE.Vector3(-side * 0.007, -0.024, 0.021),
      new THREE.Vector3(-side * 0.009, -0.035, 0.025)
    ]);
    const thumbGeo = createTaperedTubeGeometry(
      thumbCurve,
      7,
      (t) => 0.0036 * (1.0 - t * 0.32),
      8
    );
    const thumbMesh = new THREE.Mesh(thumbGeo, skinMat);
    thumbMesh.castShadow = true;
    handGroup.add(thumbMesh);

    const propMount = new THREE.Group();
    propMount.position.set(-side * 0.008, -0.022, 0.006);
    handGroup.add(propMount);

    const wristMount = new THREE.Group();
    wristMount.position.set(0, -0.002, 0);
    handGroup.add(wristMount);

    return { handGroup, propMount, wristMount };
  }

  function buildArticulatedArm(side, pose, skinMat, sleeveMat, sleeveMode, hasLeftHandProp = false, hasLaptop = false) {
    const upperLen = 0.195;
    const foreLen = 0.185;

    const isLongSleeve = sleeveMode === 'long';
    const isShortSleeve = sleeveMode === 'short';

    const shoulderPivot = new THREE.Group();
    shoulderPivot.rotation.order = 'YXZ';
    shoulderPivot.position.set(side * 0.118, 1.192, -0.004);

    const upperMat = (isLongSleeve || isShortSleeve) ? sleeveMat : skinMat;
    const foreMat = isLongSleeve ? sleeveMat : skinMat;

    const deltoidCap = new THREE.Mesh(
      new THREE.SphereGeometry(isLongSleeve ? 0.033 : 0.030, 20, 16),
      upperMat
    );
    deltoidCap.scale.set(1.04, 1.05, 0.96);
    deltoidCap.castShadow = true;
    shoulderPivot.add(deltoidCap);

    const upperPts = [
      new THREE.Vector2(isLongSleeve ? 0.025 : 0.022, -upperLen),
      new THREE.Vector2(isLongSleeve ? 0.027 : 0.024, -upperLen * 0.5),
      new THREE.Vector2(isLongSleeve ? 0.032 : 0.0285, 0.0)
    ];
    const upperMesh = new THREE.Mesh(new THREE.LatheGeometry(upperPts, 22), upperMat);
    upperMesh.castShadow = true;
    shoulderPivot.add(upperMesh);

    const elbowPivot = new THREE.Group();
    elbowPivot.rotation.order = 'YXZ';
    elbowPivot.position.set(0, -upperLen, 0);
    shoulderPivot.add(elbowPivot);

    const elbowBall = new THREE.Mesh(
      new THREE.SphereGeometry(isLongSleeve ? 0.024 : 0.021, 16, 14),
      foreMat
    );
    elbowPivot.add(elbowBall);

    const forePts = [
      new THREE.Vector2(0.0160, -foreLen),
      new THREE.Vector2(isLongSleeve ? 0.022 : 0.019, -foreLen * 0.62),
      new THREE.Vector2(isLongSleeve ? 0.0245 : 0.0215, -foreLen * 0.25),
      new THREE.Vector2(isLongSleeve ? 0.024 : 0.0205, 0.0)
    ];
    const foreMesh = new THREE.Mesh(new THREE.LatheGeometry(forePts, 22), foreMat);
    foreMesh.castShadow = true;
    elbowPivot.add(foreMesh);

    if (isLongSleeve) {
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0175, 0.022, 22), sleeveMat);
      cuff.position.set(0, -foreLen + 0.008, 0);
      elbowPivot.add(cuff);
    }

    const { handGroup, propMount, wristMount } = buildSculptedHand(side, skinMat);
    handGroup.position.set(0, -foreLen + 0.002, 0);
    elbowPivot.add(handGroup);

    if (pose === 'selfie') {
      if (side === 1) {
        // Brazo derecho en alto modo selfie
        shoulderPivot.rotation.set(-0.74, -0.26, 0.34);
        elbowPivot.rotation.set(-1.62, 0.30, -0.34);
        handGroup.rotation.set(0.14, -0.35, -0.08);
      } else if (hasLeftHandProp) {
        // Si sostiene el espejo en la mano izquierda junto con el teléfono
        shoulderPivot.rotation.set(-0.62, 0.28, -0.32);
        elbowPivot.rotation.set(-1.42, -0.28, 0.28);
        handGroup.rotation.set(0.16, 0.38, 0.10);
      } else {
        // Mano izquierda en la cintura
        shoulderPivot.rotation.set(0.08, 0.0, -0.50);
        elbowPivot.rotation.set(-0.22, 0.0, 0.94);
        handGroup.rotation.z = -0.22;
      }
    } else if (pose === 'makeup') {
      if (side === 1) {
        // Brazo derecho sosteniendo el espejo frente al rostro para maquillarse
        shoulderPivot.rotation.set(-0.78, -0.30, 0.24);
        elbowPivot.rotation.set(-1.74, 0.34, -0.34);
        handGroup.rotation.set(0.22, -0.45, -0.12);
      } else {
        shoulderPivot.rotation.set(0.08, 0.0, -0.50);
        elbowPivot.rotation.set(-0.22, 0.0, 0.94);
        handGroup.rotation.z = -0.22;
      }
    } else if (pose === 'kiss') {
      if (side === 1) {
        // Mano levantada bajo los labios tirando beso
        shoulderPivot.rotation.set(-0.84, -0.34, 0.16);
        elbowPivot.rotation.set(-1.82, 0.40, -0.40);
        handGroup.rotation.set(0.86, -0.28, 0.18);
      } else {
        shoulderPivot.rotation.set(0.08, 0.0, -0.50);
        elbowPivot.rotation.set(-0.22, 0.0, 0.94);
        handGroup.rotation.z = -0.22;
      }
   } else if (pose === 'waving') {
      if (side === 1) {
        shoulderPivot.rotation.set(-0.22, 0.18, 2.02);
        elbowPivot.rotation.set(-0.28, 0.0, -1.18);
        handGroup.rotation.set(0.15, -0.35, -0.10);
      } else {
        shoulderPivot.rotation.set(0.06, 0.0, -0.48);
        elbowPivot.rotation.set(-0.20, 0.0, 0.90);
      }
    } else if (pose === 'coder') {
      shoulderPivot.rotation.set(-0.44, 0.0, side * 0.18);
      elbowPivot.rotation.set(-1.26, 0.0, -side * 0.28);
      handGroup.rotation.x = 0.25;
    } else if (pose === 'photo') {
      if (side === -1) {
        shoulderPivot.rotation.set(0.08, 0.0, -0.50);
        elbowPivot.rotation.set(-0.22, 0.0, 0.94);
        handGroup.rotation.z = -0.22;
      } else {
        shoulderPivot.rotation.set(-0.08, 0.0, 0.28);
        elbowPivot.rotation.set(-0.26, 0.0, -0.14);
      }
    } else if (pose === 'celebrate') {
      shoulderPivot.rotation.set(-0.16, 0.0, side * 2.40);
      elbowPivot.rotation.set(-0.14, 0.0, -side * 0.26);
    } else if (hasLaptop && side === 1) {
      // Dobla el brazo derecho para sostener la laptop contra la cadera
      shoulderPivot.rotation.set(0.08, 0.0, 0.34);
      elbowPivot.rotation.set(-0.55, 0.0, -0.42);
    } else {
      shoulderPivot.rotation.set(0.03, 0.0, side * 0.26);
      elbowPivot.rotation.set(-0.12, 0.0, -side * 0.06);
      handGroup.rotation.z = -side * 0.04;
    }

    return { shoulderPivot, elbowPivot, handGroup, propMount, wristMount };
  }

  function buildSingleStrapBackpack(bodyGroup) {
    // Mochila de un solo brazo colgada sobre el hombro izquierdo (side = -1)
    const bagGroup = new THREE.Group();

    const bagMat = makePhysicalMat('#ff6fae', {
      roughness: 0.18,
      metalness: 0.08,
      clearcoat: 0.92
    });
    const trimMat = makePhysicalMat('#23182b', {
      roughness: 0.24,
      metalness: 0.12,
      clearcoat: 0.80
    });
    const goldMat = makeStandardMat('#f5c85b', { roughness: 0.20, metalness: 0.92 });

    // Correa única que pasa sobre el hombro izquierdo (visible al frente y atrás)
    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.142, 0.975, 0.045),
      new THREE.Vector3(-0.122, 1.115, 0.075),
      new THREE.Vector3(-0.104, 1.218, 0.000),
      new THREE.Vector3(-0.128, 1.115, -0.068),
      new THREE.Vector3(-0.148, 0.975, -0.030)
    ]);
    const strapGeo = createTaperedTubeGeometry(strapCurve, 32, () => 0.0068, 8, 1.40, 0.65);
    const strapMesh = new THREE.Mesh(strapGeo, trimMat);
    strapMesh.castShadow = true;
    bagGroup.add(strapMesh);

    // Mochila colgando al costado izquierdo, ligeramente adelantada para verse bien de frente
    const packPivot = new THREE.Group();
    packPivot.position.set(-0.162, 0.945, 0.016);
    packPivot.rotation.set(0.05, -0.34, -0.08);

    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.106, 0.092), bagMat);
    mainBody.castShadow = true;
    packPivot.add(mainBody);

    const topFlap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.092, 16), trimMat);
    topFlap.rotation.x = Math.PI * 0.5;
    topFlap.position.set(0, 0.052, 0);
    packPivot.add(topFlap);

    const frontPocket = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.054, 0.070), trimMat);
    frontPocket.position.set(-0.042, -0.016, 0);
    packPivot.add(frontPocket);

    const zipBar = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.006, 0.060), goldMat);
    zipBar.position.set(-0.056, 0.002, 0);
    packPivot.add(zipBar);

    const charm = createHeartMesh(0.014, goldMat);
    charm.position.set(-0.058, -0.018, 0.022);
    charm.rotation.y = Math.PI * 0.5;
    packPivot.add(charm);

    bagGroup.add(packPivot);
    bodyGroup.add(bagGroup);
  }

  function buildPhoneProp(propMount, isSelfie) {
    const phoneGroup = new THREE.Group();
    const caseMat = makePhysicalMat('#ff75b8', { roughness: 0.16, clearcoat: 0.95 });
    const rimMat = makeStandardMat('#f5d061', { roughness: 0.22, metalness: 0.88 });
    const screenMat = new THREE.MeshBasicMaterial({ map: createScreenTexture('phone') });
    const lensMat = makePhysicalMat('#111827', { roughness: 0.08, clearcoat: 1.0 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.080, 0.0065), caseMat);
    body.castShadow = true;
    phoneGroup.add(body);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.082, 0.005), rimMat);
    phoneGroup.add(frame);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.038, 0.074), screenMat);
    screen.position.set(0, 0, -0.0036);
    screen.rotation.y = Math.PI;
    phoneGroup.add(screen);

    const camBump = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.020, 0.0026), rimMat);
    camBump.position.set(-0.009, 0.025, 0.0040);
    phoneGroup.add(camBump);

    [
      [-0.012, 0.029],
      [-0.012, 0.021],
      [-0.005, 0.025]
    ].forEach(([lx, ly]) => {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.002, 12), lensMat);
      lens.rotation.x = Math.PI * 0.5;
      lens.position.set(lx, ly, 0.0054);
      phoneGroup.add(lens);
    });

    const heartSticker = createHeartMesh(0.010, rimMat);
    heartSticker.position.set(0.005, -0.006, 0.0044);
    phoneGroup.add(heartSticker);

    if (isSelfie) {
      phoneGroup.position.set(0.006, -0.010, 0.024);
      phoneGroup.rotation.set(0.18, 0.36, -0.10);
    } else {
      phoneGroup.position.set(0.004, -0.024, 0.016);
      phoneGroup.rotation.set(0.25, 0.45, 0.15);
    }
    propMount.add(phoneGroup);
  }

  function buildMirrorProp(propMount, isRaised, isLeftHand = false) {
    const mirrorGroup = new THREE.Group();
    const frameMat = makePhysicalMat('#ff6fae', { roughness: 0.20, clearcoat: 0.90 });
    const goldMat = makeStandardMat('#f5d061', { roughness: 0.20, metalness: 0.90 });
    const glassMat = makePhysicalMat('#e0f2fe', {
      roughness: 0.04,
      metalness: 0.85,
      clearcoat: 1.0
    });

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0070, 0.056, 14), goldMat);
    handle.position.set(0, -0.030, 0);
    mirrorGroup.add(handle);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.0065, 28), frameMat);
    rim.rotation.x = Math.PI * 0.5;
    rim.scale.set(0.92, 1.0, 1.16);
    rim.position.set(0, 0.022, 0);
    rim.castShadow = true;
    mirrorGroup.add(rim);

    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.0072, 28), glassMat);
    glass.rotation.x = Math.PI * 0.5;
    glass.scale.set(0.92, 1.0, 1.16);
    glass.position.set(0, 0.022, 0);
    mirrorGroup.add(glass);

    if (isRaised && !isLeftHand) {
      mirrorGroup.position.set(0.008, -0.006, 0.024);
      mirrorGroup.rotation.set(0.20, -0.42, -0.14);
    } else if (isRaised && isLeftHand) {
      mirrorGroup.position.set(-0.008, -0.006, 0.024);
      mirrorGroup.rotation.set(0.20, 0.42, 0.14);
    } else {
      mirrorGroup.position.set(isLeftHand ? -0.010 : 0.008, -0.018, 0.016);
      mirrorGroup.rotation.set(0.20, isLeftHand ? -0.40 : 0.35, 0.12);
    }
    propMount.add(mirrorGroup);
  }

  function buildLaptopProp(bodyGroup, pose) {
    const laptopGroup = new THREE.Group();
    const shellMat = makePhysicalMat('#f472b6', { roughness: 0.22, metalness: 0.35, clearcoat: 0.80 });
    const silverMat = makeStandardMat('#e2e8f0', { roughness: 0.28, metalness: 0.82 });
    const screenMat = new THREE.MeshBasicMaterial({ map: createScreenTexture('laptop') });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.009, 0.112), silverMat);
    base.castShadow = true;
    laptopGroup.add(base);

    const screenPivot = new THREE.Group();
    screenPivot.position.set(0, 0.004, -0.054);
    screenPivot.rotation.x = -0.34;

    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.108, 0.006), shellMat);
    lid.position.set(0, 0.054, 0);
    lid.castShadow = true;
    screenPivot.add(lid);

    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.152, 0.096), screenMat);
    display.position.set(0, 0.054, 0.0035);
    screenPivot.add(display);

    laptopGroup.add(screenPivot);

    if (pose === 'coder') {
      laptopGroup.position.set(0, 0.995, 0.185);
      laptopGroup.rotation.x = 0.08;
    } else {
      screenPivot.rotation.x = -0.05; // Semi-cerrada para llevarla en el brazo
      laptopGroup.position.set(0.142, 0.905, 0.028);
      laptopGroup.rotation.set(0.12, 0.25, -1.38);
    }
    bodyGroup.add(laptopGroup);
  }

  function buildUsbProp(wristMount) {
    const usbGroup = new THREE.Group();
    const bodyMat = makePhysicalMat('#8b1e3f', { roughness: 0.20, clearcoat: 0.88 });
    const accentMat = makeStandardMat('#f5c85b', { roughness: 0.22, metalness: 0.90 });
    const metalMat = makeStandardMat('#f1f5f9', { roughness: 0.16, metalness: 0.94 });
    const strapMat = makeStandardMat('#ff7eb9', { roughness: 0.38 });

    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0026, 8, 22), strapMat);
    strap.rotation.x = Math.PI * 0.5;
    usbGroup.add(strap);

    const dropGroup = new THREE.Group();
    dropGroup.position.set(0.018, -0.026, 0.016);
    dropGroup.rotation.set(0.22, -0.32, 0.26);

    const casing = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.044, 0.010), bodyMat);
    casing.castShadow = true;
    dropGroup.add(casing);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.008, 0.011), accentMat);
    stripe.position.set(0, 0.008, 0);
    dropGroup.add(stripe);

    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.018, 0.006), metalMat);
    tip.position.set(0, -0.030, 0);
    dropGroup.add(tip);

    usbGroup.add(dropGroup);
    wristMount.add(usbGroup);
  }

  /* ==========================================================================
     8. CONSTRUCCIÓN COMPLETA DEL AVATAR 3D
     ========================================================================== */
  function buildModel(state = {}) {
    const S = state || {};
    const charKey = String(S.character || 'JACKY').toUpperCase();
    const profile = CHARACTER_PROFILES[charKey] || CHARACTER_PROFILES.JACKY;

    const skinHex = resolveColor(S.skinColor, profile.skin);

    // Normalizar poses de app_2.js
    const rawPose = String(S.pose || 'normal').toLowerCase();
    const poseMap = {
      selfie_peace: 'selfie',
      blow_kiss: 'kiss',
      leg_pop: 'photo'
    };
    const pose = poseMap[rawPose] || rawPose;

    const topOutfit = String(S.topOutfit || profile.topOutfit || 'blazer').toLowerCase();
    const bottomOutfit = String(S.bottomOutfit || profile.bottomOutfit || 'pleated_skirt').toLowerCase();
    const accessories = normalizeItemList(S.accessories, S.accessory);
    const gadgets = normalizeItemList(S.gadgets, S.gadget);

    const skinMat = makeStandardMat(skinHex, { roughness: 0.46, metalness: 0.02 });
    const upperBodyMat = makeStandardMat('#ffffff', {
      vertexColors: true,
      roughness: 0.46,
      metalness: 0.02
    });

    const root = new THREE.Group();
    root.name = 'IrisAvatarRoot';

    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    // 1. Torso + hombros + cuello
    const upperBody = new THREE.Mesh(createUnifiedUpperBodyGeometry(skinHex), upperBodyMat);
    upperBody.castShadow = true;
    upperBody.receiveShadow = true;
    bodyGroup.add(upperBody);

    // 2. Piernas y pantalones/shorts según bottomOutfit
    const isFlareJeans = bottomOutfit === 'flare_jeans';
    const isStraightJeans = bottomOutfit === 'cargo_pants';
    const isShorts = bottomOutfit === 'shorts_denim';
    const isPants = isFlareJeans || isStraightJeans;
    const pantsMode = isFlareJeans ? 'flare' : (isStraightJeans ? 'straight' : 'skin');

    const denimHex =
      isFlareJeans ? '#1d4ed8' :
      isStraightJeans ? '#334155' :
      isShorts ? '#3b82f6' : '#2563eb';
    const pantsMat = makeStandardMat('#ffffff', {
      map: createDenimTexture(denimHex),
      roughness: 0.62
    });
    const thighGeo = createThighGeometry(pantsMode);
    const calfGeo = createCalfGeometry(pantsMode);

    const liftLeftLeg =
      pose === 'selfie' ||
      pose === 'makeup' ||
      pose === 'kiss' ||
      pose === 'photo' ||
      pose === 'celebrate';

    [-1, 1].forEach((side) => {
      const lx = side * 0.056;
      const isLifted = liftLeftLeg && side === -1;

      const hipPivot = new THREE.Group();
      hipPivot.rotation.order = 'YXZ';
      hipPivot.position.set(lx, 0.855, 0);
      bodyGroup.add(hipPivot);

      const thighMesh = new THREE.Mesh(thighGeo, isPants ? pantsMat : skinMat);
      thighMesh.castShadow = true;
      thighMesh.receiveShadow = true;
      hipPivot.add(thighMesh);

      if (isShorts) {
        const shortCuff = new THREE.Mesh(
          new THREE.CylinderGeometry(0.064, 0.066, 0.105, 24),
          pantsMat
        );
        shortCuff.scale.set(1.0, 1.0, 1.06);
        shortCuff.position.set(0, -0.045, 0.002);
        shortCuff.castShadow = true;
        hipPivot.add(shortCuff);
      }

      const kneePivot = new THREE.Group();
      kneePivot.rotation.order = 'YXZ';
      kneePivot.position.set(0, -0.420, 0);
      hipPivot.add(kneePivot);

      const calfMesh = new THREE.Mesh(calfGeo, isPants ? pantsMat : skinMat);
      calfMesh.castShadow = true;
      calfMesh.receiveShadow = true;
      kneePivot.add(calfMesh);

      if (!isPants && !isShorts && bottomOutfit === 'pleated_skirt') {
        const sockGroup = createKneeSockGroupLocal('#6b1832');
        kneePivot.add(sockGroup);
      }

      const shoeGroup = createPlatformLoaferGroup(profile.shoes);
      shoeGroup.position.set(-side * 0.005, -0.435, 0.004);
      kneePivot.add(shoeGroup);

      if (isLifted) {
        hipPivot.rotation.set(-0.30, -0.10, -0.06);
        kneePivot.rotation.set(1.06, 0, 0.05);
      } else {
        hipPivot.rotation.z = -side * (isPants ? 0.008 : 0.012);
      }
    });

    if (isPants || isShorts) {
      const pelvisPants = new THREE.Mesh(createPantsPelvisGeometry(isStraightJeans || isShorts), pantsMat);
      pelvisPants.castShadow = true;
      pelvisPants.receiveShadow = true;
      bodyGroup.add(pelvisPants);

      const waistbandY = (isStraightJeans || isShorts) ? 0.938 : 0.966;
      const waistband = new THREE.Mesh(
        new THREE.CylinderGeometry((isStraightJeans || isShorts) ? 0.095 : 0.083, (isStraightJeans || isShorts) ? 0.102 : 0.088, 0.026, 36),
        pantsMat
      );
      waistband.scale.set(1.06, 1.0, 0.85);
      waistband.position.set(0, waistbandY, 0);
      bodyGroup.add(waistband);
    }

    // 3. Parte superior según topOutfit
    const isBlazer = topOutfit === 'blazer';
    const isHoodie = topOutfit === 'hoodie_crop';
    const isCrop = topOutfit === 'crop_y2k' || isHoodie;
    const isShirtTie = topOutfit === 'shirt_tie';

    const topColorMap = {
      blazer: '#f8fafc',
      crop_y2k: '#f472b6',
      blouse_off: '#ec4899',
      hoodie_crop: '#c084fc',
      corset_top: '#7c3aed',
      shirt_tie: '#f8fafc'
    };
    const innerTopHex = topColorMap[topOutfit] || '#f8fafc';
    const innerTopMat = makeStandardMat(innerTopHex, { roughness: 0.44 });
    const legacyOutfit = isCrop ? 'casual' : (isHoodie ? 'hoodie' : 'polo');

    const innerTopMesh = new THREE.Mesh(createInnerTopGeometry(legacyOutfit), innerTopMat);
    innerTopMesh.castShadow = true;
    innerTopMesh.receiveShadow = true;
    bodyGroup.add(innerTopMesh);

    const cardiganHex = profile.top || '#7a1d38';
    const cardiganMat = makeStandardMat(cardiganHex, { roughness: 0.48 });

    if (isBlazer) {
      const cardiganMesh = new THREE.Mesh(
        createOpenCardiganGeometry(cardiganHex, '#f5ebd6'),
        makeStandardMat('#ffffff', { vertexColors: true, roughness: 0.48 })
      );
      cardiganMesh.castShadow = true;
      cardiganMesh.receiveShadow = true;
      bodyGroup.add(cardiganMesh);

      const collarMat = makeStandardMat('#ffffff', { roughness: 0.40 });
      [-1, 1].forEach((side) => {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.008, 0.036), collarMat);
        lapel.position.set(side * 0.020, 1.222, 0.020);
        lapel.rotation.set(0.32, side * 0.36, -side * 0.26);
        bodyGroup.add(lapel);
      });
    } else if (isHoodie) {
      const hoodMesh = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.022, 12, 26, Math.PI * 1.35), innerTopMat);
      hoodMesh.position.set(0, 1.224, -0.026);
      hoodMesh.rotation.set(0.65, 0, Math.PI * 0.82);
      hoodMesh.castShadow = true;
      bodyGroup.add(hoodMesh);
    } else if (isShirtTie) {
      const tieMat = makeStandardMat('#1e3a8a', { roughness: 0.38 });
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.012), tieMat);
      knot.position.set(0, 1.196, 0.068);
      bodyGroup.add(knot);

      const tieBody = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.135, 0.008), tieMat);
      tieBody.position.set(0, 1.124, 0.088);
      tieBody.rotation.x = -0.14;
      bodyGroup.add(tieBody);
    }

    // Mochila al brazo ('shoulder_bag' o 'backpack')
    if (gadgets.includes('shoulder_bag') || gadgets.includes('backpack')) {
      buildSingleStrapBackpack(bodyGroup);
    }

    // 4. Brazos y Gadgets ('smartphone' o 'phone')
    const sleeveMode =
      (isBlazer || isHoodie) ? 'long' :
      (topOutfit === 'corset_top' || topOutfit === 'blouse_off') ? 'none' : 'short';
    const armSleeveMat = isBlazer ? cardiganMat : innerTopMat;

    const hasPhone = gadgets.includes('smartphone') || gadgets.includes('phone');
    const hasMirror = gadgets.includes('mirror');
    const hasLaptop = gadgets.includes('laptop');
    const hasLeftHandMirror = hasPhone && hasMirror;

    const rightArm = buildArticulatedArm(1, pose, skinMat, armSleeveMat, sleeveMode, false, hasLaptop);
    const leftArm = buildArticulatedArm(-1, pose, skinMat, armSleeveMat, sleeveMode, hasLeftHandMirror, false);
    bodyGroup.add(rightArm.shoulderPivot);
    bodyGroup.add(leftArm.shoulderPivot);

    const isRaisedPose = pose === 'selfie' || pose === 'makeup';
    if (hasPhone) buildPhoneProp(rightArm.propMount, isRaisedPose);
    if (hasMirror) {
      if (hasPhone) buildMirrorProp(leftArm.propMount, isRaisedPose, true);
      else buildMirrorProp(rightArm.propMount, isRaisedPose, false);
    }
    if (hasLaptop) buildLaptopProp(bodyGroup, pose);

    // 5. Faldas según bottomOutfit
    const skirtGroup = new THREE.Group();
    skirtGroup.position.set(0, WAIST_PIVOT_Y, 0);
    root.add(skirtGroup);

    if (!isPants && !isShorts) {
      const isMini = bottomOutfit === 'mini_skirt';
      const isDenimSkirt = bottomOutfit === 'denim_skirt';
      const skirtHex = isMini ? '#be185d' : (isDenimSkirt ? '#2563eb' : profile.bottom);

      const skirtMat = makeStandardMat(isMini ? skirtHex : '#ffffff', {
        map: isMini ? null : (isDenimSkirt ? createDenimTexture(skirtHex) : createPlaidSkirtTexture(skirtHex)),
        roughness: 0.50
      });

      const skirtMesh = new THREE.Mesh(createPleatedSkirtGeometry(false), skirtMat);
      if (isMini || isDenimSkirt) {
        skirtMesh.scale.set(0.84, isMini ? 0.68 : 0.80, 0.84);
      }
      skirtMesh.castShadow = true;
      skirtMesh.receiveShadow = true;
      skirtGroup.add(skirtMesh);

      const beltMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.082, 0.086, 0.026, 36),
        skirtMat
      );
      beltMesh.scale.set(1.04, 1.0, 0.85);
      beltMesh.position.set(0, 0.018, 0);
      skirtGroup.add(beltMesh);
    }

    // 6. Cabeza
    const headGroup = new THREE.Group();
    headGroup.scale.setScalar(HEAD_SCALE);
    headGroup.position.set(0, HEAD_PIVOT_Y, HEAD_PIVOT_Z);

    const headContent = new THREE.Group();
    headContent.position.set(0, HEAD_LOCAL_OFFSET_Y, HEAD_LOCAL_OFFSET_Z);
    headGroup.add(headContent);

    let baseHeadRotX = 0;
    let baseHeadRotY = 0;
    let baseHeadRotZ = 0;
    if (pose === 'selfie' || pose === 'makeup' || pose === 'kiss' || pose === 'photo' || pose === 'waving') {
      baseHeadRotZ = -0.068;
      baseHeadRotY = 0.055;
      headGroup.rotation.set(baseHeadRotX, baseHeadRotY, baseHeadRotZ);
    } else if (pose === 'coder') {
      baseHeadRotX = 0.08;
      headGroup.rotation.set(baseHeadRotX, baseHeadRotY, baseHeadRotZ);
    }
    bodyGroup.add(headGroup);

    const hairStrands = [];
    buildGlamHead(headContent, S, profile, skinHex, skinMat, hairStrands, accessories, gadgets);

    root.scale.setScalar(TARGET_AVATAR_HEIGHT / BASE_MODEL_HEIGHT);
    root.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(root);
    root.position.y += (PLATFORM_TOP_Y - scaledBox.min.y);

    return {
      root,
      headGroup,
      baseHeadY: HEAD_PIVOT_Y,
      baseHeadRotX,
      baseHeadRotY,
      baseHeadRotZ,
      skirtGroup,
      hairStrands
    };
  }

  function zoomCamera(delta) {
    if (mainCameraCtrl) mainCameraCtrl.zoomBy(delta);
  }

  function panCameraY(delta) {
    if (mainCameraCtrl) mainCameraCtrl.panYBy(delta);
  }

  function setCameraView(targetY, distance) {
    if (mainCameraCtrl) mainCameraCtrl.setView(targetY, distance);
  }

  function resetCamera() {
    if (mainCameraCtrl) mainCameraCtrl.reset();
  }

  function handleResize() {
    const canvas = document.getElementById('avatarCanvas');
    if (!canvas || !mainSceneCtx) return;
    const parent = canvas.parentElement;
    const w = canvas.clientWidth || (parent && parent.clientWidth) || 420;
    const h = canvas.clientHeight || (parent && parent.clientHeight) || 540;
    mainSceneCtx.camera.aspect = Math.max(0.2, w / Math.max(1, h));
    mainSceneCtx.camera.updateProjectionMatrix();
    mainSceneCtx.renderer.setSize(w, h, false);
    if (mainRenderFn) mainRenderFn();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
  }

  const IrisAvatar3DAPI = {
    setupScene,
    buildModel,
    zoom: zoomCamera,
    panY: panCameraY,
    setView: setCameraView,
    resetCam: resetCamera,
    onResize: handleResize,
    CHARACTER_PROFILES
  };

  global.IrisAvatar3D = IrisAvatar3DAPI;
  global.IrisAvatar = IrisAvatar3DAPI;
})(typeof window !== 'undefined' ? window : this);