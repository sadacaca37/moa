/* 모아팡팡 캐릭터 그리기 — 기본 몸 위에 옷을 한 겹씩 입혀 걷는 그림(3칸 × 4줄)을 만든다.
   그림은 모두 제미나이로 만든 assets/layers/*.png 를 쓴다. 코드는 색을 바꾸고 겹치기만 한다. */
(function () {
  'use strict';
  const F = 128, ROW = { front: 0, down: 0, back: 1, up: 1, left: 2, right: 3 }, WALK = [1, 0, 1, 2];
  const ORDER = ['body', 'shoes', 'bottom', 'top', 'outer', 'suit', 'back', 'hair', 'hat', 'face', 'hand'];
  const UNDER_SUIT = ['hair', 'hat', 'top', 'bottom', 'outer', 'shoes'];
  const CLOTH = [
    { k: 'orig', name: '원래 색' },
    { k: 'red', name: '빨강', c: '#d0433f', h: 0.0, s: 0.68, l: 0.47 },
    { k: 'yellow', name: '노랑', c: '#efc53b', h: 0.12, s: 0.85, l: 0.6 },
    { k: 'green', name: '초록', c: '#3f9a5c', h: 0.38, s: 0.45, l: 0.42 },
    { k: 'sky', name: '하늘', c: '#6cb6e6', h: 0.56, s: 0.65, l: 0.62 },
    { k: 'blue', name: '파랑', c: '#2f5fb3', h: 0.61, s: 0.58, l: 0.42 },
    { k: 'purple', name: '보라', c: '#8456b8', h: 0.76, s: 0.42, l: 0.47 },
    { k: 'pink', name: '분홍', c: '#f08fb8', h: 0.93, s: 0.75, l: 0.72 },
    { k: 'black', name: '검정', c: '#2b2f36', h: 0.6, s: 0.1, l: 0.2, kc: 0.8 },
    { k: 'white', name: '흰색', c: '#eef0f2', h: 0.6, s: 0.08, l: 0.86, kc: 0.55 }
  ];
  const HAIRC = [
    { k: 'orig', name: '갈색', c: '#6b4029' },
    { k: 'black', name: '검정', c: '#24211f', h: 0.6, s: 0.1, l: 0.14, kc: 0.8 },
    { k: 'blonde', name: '금발', c: '#e2bb5c', h: 0.12, s: 0.7, l: 0.6 },
    { k: 'red', name: '빨강', c: '#a8392a', h: 0.02, s: 0.62, l: 0.38 },
    { k: 'pink', name: '분홍', c: '#f09ac0', h: 0.94, s: 0.62, l: 0.7 },
    { k: 'blue', name: '파랑', c: '#4c76c9', h: 0.61, s: 0.52, l: 0.46 },
    { k: 'silver', name: '은색', c: '#c7ccd3', h: 0.6, s: 0.07, l: 0.78, kc: 0.7 }
  ];
  const SKIN = [
    { k: 'base', name: '기본', c: '#f6b48a' },
    { k: 'light', name: '밝은', c: '#fbd0b4', lm: 1.08, sm: 0.75 },
    { k: 'tan', name: '갈색', c: '#c58c66', lm: 0.8, sm: 0.66 },
    { k: 'deep', name: '진한 갈색', c: '#8a5638', lm: 0.6, sm: 0.72 }
  ];
  const CATS = [
    { id: 'body', name: '피부', skin: true, items: [] },
    { id: 'hair', name: '머리', colors: HAIRC, items: [['hair_short', '짧은 머리'], ['hair_long', '긴 머리'], ['hair_twin', '양갈래'], ['hair_bob', '단발'], ['hair_ponytail', '포니테일'], ['hair_bun', '똥머리'], ['hair_curly', '뽀글 파마'], ['hair_spiky', '삐죽머리'], ['hair_braids', '땋은 양갈래'], ['hair_buzz', '스포츠머리'], ['hair_bowl', '바가지 머리'], ['hair_wavy', '긴 웨이브'], ['hair_side', '사이드 포니테일']] },
    { id: 'top', name: '윗옷', colors: CLOTH, items: [['top_tee', '반팔 티'], ['top_hoodie', '후드티'], ['top_sailor', '세일러 교복'], ['top_shirt_tie', '셔츠와 넥타이'], ['top_stripe', '줄무늬 티'], ['top_heart', '하트 맨투맨'], ['top_check', '체크 셔츠'], ['top_vest', '니트 조끼'], ['top_track', '트레이닝 재킷'], ['top_soccer', '축구 유니폼'], ['dress_purple', '보라 원피스'], ['dress_hanbok', '한복'], ['dress_princess', '공주 드레스'], ['dress_collar', '칼라 원피스']] },
    { id: 'bottom', name: '아래옷', colors: CLOTH, items: [['bottom_jeans', '청바지'], ['bottom_skirt', '주름치마'], ['bottom_shorts', '청반바지'], ['bottom_track', '트레이닝 바지'], ['bottom_check_skirt', '체크 치마'], ['bottom_aline', 'A라인 치마'], ['bottom_slacks', '정장 바지'], ['bottom_gym', '체육복 반바지']] },
    { id: 'outer', name: '겉옷', colors: CLOTH, items: [['outer_raincoat', '우비'], ['outer_duffle', '더플코트'], ['outer_blazer', '교복 재킷'], ['outer_padding', '패딩 점퍼'], ['outer_denim', '청재킷'], ['outer_cape', '망토'], ['outer_labcoat', '실험 가운'], ['outer_overalls', '멜빵바지']] },
    { id: 'suit', name: '동물 슈트', colors: CLOTH, items: [['suit_bear', '곰'], ['suit_bunny', '토끼'], ['suit_dino', '공룡'], ['suit_cat', '고양이'], ['suit_puppy', '강아지'], ['suit_panda', '판다'], ['suit_fox', '여우'], ['suit_lion', '사자'], ['suit_penguin', '펭귄'], ['suit_unicorn', '유니콘']] },
    { id: 'shoes', name: '신발', colors: CLOTH, all: true, items: [['shoes_sneakers', '운동화'], ['shoes_boots', '장화'], ['shoes_loafers', '구두'], ['shoes_maryjane', '메리제인'], ['shoes_slippers', '실내화']] },
    { id: 'hat', name: '모자·머리띠', colors: CLOTH, items: [['hat_cap', '야구모자'], ['hat_halo', '천사 링'], ['hat_crown', '왕관'], ['hat_beanie', '방울 비니'], ['hat_straw', '밀짚모자'], ['hat_wizard', '마법사 모자'], ['hat_catears', '고양이 귀'], ['hat_bunny', '토끼 귀'], ['hat_devil', '악마 뿔'], ['hat_ribbon', '큰 리본'], ['hat_sprout', '새싹 핀'], ['hat_santa', '산타 모자'], ['hat_antler', '루돌프 뿔'], ['hat_beret', '베레모'], ['hat_bucket', '벙거지'], ['hat_party', '파티 고깔'], ['hat_flower', '꽃 화관'], ['hat_pirate', '해적 모자'], ['hat_tiara', '티아라'], ['hat_chef', '요리사 모자'], ['hat_headphones', '헤드폰'], ['hat_helmet', '안전모'], ['hat_cowboy', '카우보이 모자']] },
    { id: 'face', name: '안경·얼굴', colors: CLOTH, items: [['acc_glasses', '둥근 안경'], ['face_sunglasses', '선글라스'], ['face_heart', '하트 안경'], ['face_mask', '마스크'], ['face_bandage', '반창고와 볼터치'], ['face_goggles', '고글'], ['face_star', '별 안경'], ['face_square', '네모 뿔테'], ['face_cateye', '고양이 눈 안경'], ['face_3d', '3D 안경'], ['face_aviator', '보잉 선글라스'], ['face_shutter', '셔터 선글라스'], ['face_flower', '꽃 안경'], ['face_rainbow', '무지개 안경'], ['face_hero', '영웅 눈가면'], ['face_redround', '빨간 선글라스']] },
    { id: 'back', name: '등·목', colors: CLOTH, items: [['back_angel', '천사 날개'], ['back_bat', '박쥐 날개'], ['back_fairy', '요정 날개'], ['back_schoolbag', '책가방'], ['back_bunnybag', '토끼 배낭'], ['back_scarf', '목도리']] },
    { id: 'hand', name: '손에 들기', colors: CLOTH, items: [['hand_balloon', '풍선'], ['hand_wand', '별 지팡이'], ['hand_umbrella', '우산'], ['hand_icecream', '아이스크림'], ['hand_teddy', '곰 인형'], ['hand_pencil', '큰 연필'], ['hand_book', '책']] }
  ];
  const PARTS = CATS.slice(1).map(c => c.id);
  const START = { skin: 'base', hair: 'hair_short', hairColor: 'orig', top: 'top_tee', topColor: 'orig', bottom: 'bottom_jeans', bottomColor: 'orig', shoes: 'shoes_sneakers', shoesColor: 'orig', outer: null, outerColor: 'orig', suit: null, suitColor: 'orig', hat: null, hatColor: 'orig', face: null, faceColor: 'orig', back: null, backColor: 'orig', hand: null, handColor: 'orig' };
  const HAIR_KEY = { hair_long: 'long', hair_twin: 'twin' };
  const GRIP = ['hand_umbrella', 'hand_wand', 'hand_balloon'];
  const COVER_HATS = ['hat_cap', 'hat_beanie', 'hat_straw', 'hat_wizard', 'hat_santa', 'hat_beret', 'hat_bucket', 'hat_pirate', 'hat_chef', 'hat_helmet', 'hat_cowboy'];

  const A = { F, ROW, WALK, ORDER, CLOTH, HAIRC, SKIN, CATS, PARTS, START, base: 'assets/layers/', raw: {}, have: null };
  const raw = A.raw;
  const loading = new Map();

  /* ---------- 그림 불러오기 ---------- */
  let manifest = null;
  A.ready = function () {
    if (!manifest) manifest = fetch(A.base + 'index.json').then(r => r.json()).then(list => { A.have = new Set(list); }).catch(() => { A.have = new Set(); });
    return manifest;
  };
  function loadOne(id) {
    if (raw[id] !== undefined) return Promise.resolve();
    if (loading.has(id)) return loading.get(id);
    const p = new Promise(res => {
      if (A.have && !A.have.has(id)) { raw[id] = null; res(); return; }
      const im = new Image();
      im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); try { raw[id] = x.getImageData(0, 0, c.width, c.height); } catch (e) { raw[id] = null; } res(); };
      im.onerror = () => { raw[id] = null; res(); };
      im.src = A.base + id + '.png';
    });
    loading.set(id, p); return p;
  }
  A.load = async function (ids) { await A.ready(); await Promise.all(ids.map(loadOne)); };
  // 이 옷차림을 그리는 데 필요한 그림 이름
  A.need = function (o) {
    const ids = ['body'];
    for (const p of PARTS) {
      const id = o[p]; if (!id) continue; ids.push(id);
      if (p === 'hat') ['_hide', '__long', '__long_hide', '__twin', '__twin_hide'].forEach(s => ids.push(id + s));
      if (p === 'suit') ids.push(id + '_hide');
      if (p === 'hand' && GRIP.includes(id)) ids.push('hand_front');
    }
    return ids;
  };
  A.ensure = function (o) { return A.load(A.need(clean(o))); };
  A.ensureMany = function (list) { const s = new Set(); list.forEach(o => A.need(clean(o)).forEach(i => s.add(i))); return A.load([...s]); };
  A.allIds = function () { return A.have ? [...A.have] : []; };
  A.loadAll = async function () { await A.ready(); await A.load(A.allIds()); };

  /* ---------- 저장된 옷차림 정리 (모르는 값은 빼기) ---------- */
  function clean(o) {
    const out = Object.assign({}, START);
    if (!o || typeof o !== 'object') return out;
    if (SKIN.some(s => s.k === o.skin)) out.skin = o.skin;
    for (const c of CATS.slice(1)) {
      if (o[c.id] === null) out[c.id] = null;
      else if (c.items.some(i => i[0] === o[c.id])) out[c.id] = o[c.id];
      const col = o[c.id + 'Color'];
      if (c.colors.some(x => x.k === col)) out[c.id + 'Color'] = col;
    }
    return out;
  }
  A.clean = clean;

  /* ---------- 색 ---------- */
  function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
  function hue2(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
  function hsl2rgb(h, s, l) { if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; } const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [hue2(p, q, h + 1 / 3), hue2(p, q, h), hue2(p, q, h - 1 / 3)].map(v => Math.round(v * 255)); }
  const c01 = v => Math.max(0, Math.min(1, v));
  const tinted = new Map();
  // 몸: 피부 픽셀이 고른 피부색을 따른다. 옷: 알파 254 = 옷 안에 그린 피부(손, 이마), 알파 253 = 바꾸지 않는 색, 나머지 = 고른 색.
  function layer(id, col, skin, all, isBody) {
    const key = id + '|' + (col ? col.k : '') + '|' + (skin ? skin.k : '') + '|' + (isBody ? 'b' : '');
    if (tinted.has(key)) return tinted.get(key);
    const src = raw[id]; if (!src) return null;
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height), d = out.data;
    const tintSkin = i => { if (!(skin && skin.lm)) return; const [h, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]); if (h < 0.12 && s > 0.3 && l > 0.32 && l < 0.92) { const v = hsl2rgb(h, c01(s * skin.sm), c01(l * skin.lm)); d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; } };
    if (isBody) {
      for (let i = 0; i < d.length; i += 4) if (d[i + 3]) tintSkin(i);
    } else {
      const isSkin = new Uint8Array(d.length / 4);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) { if (d[i + 3] === 254) { isSkin[p] = 1; d[i + 3] = 255; tintSkin(i); } else if (d[i + 3] === 253) { isSkin[p] = 2; d[i + 3] = 255; } }
      if (col && col.h !== undefined) {
        const hs = new Float32Array(d.length / 4 * 3), ch = new Float32Array(d.length / 4);
        let n = 0, nAll = 0;
        for (let i = 0, j = 0, p = 0; i < d.length; i += 4, j += 3, p++) {
          if (!d[i + 3] || isSkin[p]) { hs[j + 2] = -1; continue; }
          const v = rgb2hsl(d[i], d[i + 1], d[i + 2]); hs[j] = v[0]; hs[j + 1] = v[1]; hs[j + 2] = v[2];
          ch[p] = (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])) / 255;
          if (v[2] > 0.09) { nAll++; if (ch[p] > 0.08 && v[2] > 0.12 && v[2] < 0.94) n++; }
        }
        const neutral = !all && nAll > 0 && n < 0.45 * nAll;
        const pick = all ? (cc, l) => l > 0.22 && l < 0.99 : neutral ? (cc, l) => cc <= 0.08 && l > 0.09 : (cc, l) => cc > 0.08 && l > 0.12 && l < 0.94;
        const hist = new Uint32Array(256); let m = 0, ss = 0;
        for (let j = 0, p = 0; j < hs.length; j += 3, p++) { const l = hs[j + 2]; if (l >= 0 && pick(ch[p], l)) { m++; ss += hs[j + 1]; hist[Math.min(255, Math.round(l * 255))]++; } }
        let mL = 0.5;
        if (m) { let acc = 0; for (let k = 0; k < 256; k++) { acc += hist[k]; if (acc * 2 >= m) { mL = Math.min(0.995, Math.max(0.02, k / 255)); break; } } }
        const mS = m ? ss / m : 0.5, kc = col.kc || 1;
        const mapL = l => l <= mL ? col.l * (1 - (mL - l) / mL * kc) : col.l + (0.97 - col.l) * Math.min(1, (l - mL) / Math.max(1 - mL, 0.25)) * kc;
        for (let i = 0, j = 0, p = 0; i < d.length; i += 4, j += 3, p++) {
          const s = hs[j + 1], l = hs[j + 2];
          if (l < 0 || !pick(ch[p], l)) continue;
          const v = hsl2rgb(col.h, (all || neutral) ? col.s : c01(col.s * s / mS), c01(mapL(l)));
          d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2];
        }
      }
    }
    c.getContext('2d').putImageData(out, 0, 0);
    if (!isBody) { const sk = new Uint8Array(d.length / 4); for (let i = 0, p = 0; i < d.length; i += 4, p++) if (src.data[i + 3] === 254) sk[p] = 1; c.skin = sk; }
    if (tinted.size > 400) tinted.clear();
    tinted.set(key, c); return c;
  }
  const find = (list, k) => list.find(x => x.k === k) || list[0];
  A.find = find;

  /* ---------- 걷는 그림 한 장 (3칸 × 4줄) ---------- */
  const sheets = new Map();
  function sheetFor(o0) {
    const o = clean(o0);
    const key = JSON.stringify(o);
    if (sheets.has(key)) return sheets.get(key);
    const W = F * 3, H = F * 4;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const skin = find(SKIN, o.skin);
    let bodyL = layer('body', null, skin, false, true);
    const item = (part, id) => { const cat = CATS.find(cc => cc.id === part); return layer(id || o[part], find(cat.colors, o[part + 'Color']), skin, cat.all, false); };
    const hk = HAIR_KEY[o.hair];
    const hatId = o.hat ? (hk && raw[o.hat + '__' + hk] ? o.hat + '__' + hk : o.hat) : null;
    const hatFits = !!o.hat && (o.hair === 'hair_short' || hatId !== o.hat);
    const hideId = !o.suit && hatFits && o.hair && raw[hatId + '_hide'] ? hatId + '_hide' : null;
    const trimUnder = !o.suit && o.hat && o.hair && !hatFits && COVER_HATS.includes(o.hat);
    const cutOut = (L, id) => { const t = document.createElement('canvas'); t.width = W; t.height = H; const tx = t.getContext('2d'); tx.drawImage(L, 0, 0); tx.globalCompositeOperation = 'destination-out'; const m = document.createElement('canvas'); m.width = W; m.height = H; m.getContext('2d').putImageData(raw[id], 0, 0); tx.drawImage(m, 0, 0); return t; };
    const trimAbove = (L, Hc) => {
      if (!Hc) return L;
      const t = document.createElement('canvas'); t.width = W; t.height = H; const tx = t.getContext('2d'); tx.drawImage(L, 0, 0);
      const hd = Hc.getContext('2d').getImageData(0, 0, W, H).data, im = tx.getImageData(0, 0, W, H), d = im.data;
      for (let r = 0; r < 4; r++) for (let cc = 0; cc < 3; cc++) {
        const top = new Int32Array(F).fill(-1);
        for (let xx = 0; xx < F; xx++) for (let y = 0; y < 70; y++) { const i = ((r * F + y) * W + cc * F + xx) * 4; if (hd[i + 3] > 0) { top[xx] = y; break; } }
        const t2 = Int32Array.from(top);
        for (let xx = 0; xx < F; xx++) if (top[xx] < 0) { let best = -1; for (let k = 1; k <= 3; k++) { for (const x2 of [xx - k, xx + k]) if (x2 >= 0 && x2 < F && top[x2] >= 0) best = best < 0 ? top[x2] + 2 : Math.min(best, top[x2] + 2); if (best >= 0) break; } t2[xx] = best; }
        for (let xx = 0; xx < F; xx++) { if (t2[xx] < 0) continue; for (let y = 0; y < t2[xx]; y++) { const i = ((r * F + y) * W + cc * F + xx) * 4; d[i + 3] = 0; } }
      }
      tx.putImageData(im, 0, 0); return t;
    };
    const masked = (L, M) => { const t = document.createElement('canvas'); t.width = W; t.height = H; const tx = t.getContext('2d'); tx.drawImage(L, 0, 0); tx.globalCompositeOperation = 'destination-in'; tx.drawImage(M, 0, 0); return t; };
    const rows = (L, list) => { const t = document.createElement('canvas'); t.width = W; t.height = H; const tx = t.getContext('2d'); list.forEach(r => tx.drawImage(L, 0, r * F, W, F, 0, r * F, W, F)); return t; };
    if (bodyL && o.suit && raw[o.suit + '_hide']) bodyL = cutOut(bodyL, o.suit + '_hide');
    const backL = o.back ? item('back') : null;
    if (backL) x.drawImage(rows(backL, [0, 2, 3]), 0, 0);
    for (const part of ORDER) {
      let L = null;
      if (part === 'body') L = bodyL;
      else if (o.suit && UNDER_SUIT.includes(part)) L = null;
      else if (part === 'bottom' && o.top && o.top.startsWith('dress_')) L = null;
      else if (part === 'back') { if (backL && bodyL) { x.drawImage(rows(backL, [1]), 0, 0); x.drawImage(masked(rows(backL, [0, 2, 3]), bodyL), 0, 0); } continue; }
      else if (part === 'hat') L = hatId ? item('hat', hatId) : null;
      else if (part === 'hair') { L = o.hair ? item('hair') : null; if (L && hideId) L = cutOut(L, hideId); if (L && trimUnder) L = trimAbove(L, item('hat', hatId)); }
      else if (o[part]) L = item(part);
      if (L && o.suit && (part === 'hand' || part === 'face')) {
        const S = item('suit');
        const t = document.createElement('canvas'); t.width = W; t.height = H; const tx = t.getContext('2d'); tx.drawImage(L, 0, 0);
        if (part === 'hand' && L.skin && S) {
          const im = tx.getImageData(0, 0, W, H), dd = im.data, sa = S.getContext('2d').getImageData(0, 0, W, H).data;
          for (let q = 0, i = 0; q < L.skin.length; q++, i += 4) if (L.skin[q] && sa[i + 3]) dd[i + 3] = 0;
          if (o.hand === 'hand_umbrella') {
            for (let y = 2 * F; y < 4 * F; y++) { if (y % F < 60) continue; for (let xx = 0; xx < W; xx++) { const i = (y * W + xx) * 4; if (sa[i + 3]) dd[i + 3] = 0; } }
          }
          tx.putImageData(im, 0, 0); L = t;
        } else if (part === 'face' && S) {
          const m = document.createElement('canvas'); m.width = W; m.height = H; const mx = m.getContext('2d');
          if (bodyL) mx.drawImage(bodyL, 0, 0); mx.drawImage(S, 0, 0);
          L = masked(L, m);
        }
      }
      if (L && part === 'top' && o.outer && !o.top.startsWith('dress_')) {
        const outerL = item('outer');
        const m = document.createElement('canvas'); m.width = W; m.height = H; const mx = m.getContext('2d');
        if (bodyL) mx.drawImage(bodyL, 0, 0); if (outerL) mx.drawImage(outerL, 0, 0);
        L = masked(L, m);
      }
      if (L && part === 'hand' && GRIP.includes(o.hand) && raw.hand_front) {
        const before = document.createElement('canvas'); before.width = W; before.height = H; before.getContext('2d').drawImage(c, 0, 0);
        x.drawImage(L, 0, 0);
        const mk = document.createElement('canvas'); mk.width = W; mk.height = H; mk.getContext('2d').putImageData(raw.hand_front, 0, 0);
        x.drawImage(masked(before, mk), 0, 0);
        continue;
      }
      if (L) x.drawImage(L, 0, 0);
    }
    if (sheets.size > 120) sheets.clear();
    sheets.set(key, c); return c;
  }
  A.sheet = sheetFor;
  A.drawFrame = function (ctx, sheet, dir, f, moving, size) {
    const s = size || F;
    ctx.clearRect(0, 0, s, s);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, (moving ? WALK[f % 4] : 1) * F, (ROW[dir] || 0) * F, F, F, 0, 0, s, s);
  };
  A.thumb = function (o, size) { const s = size || F; const c = document.createElement('canvas'); c.width = s; c.height = s; A.drawFrame(c.getContext('2d'), sheetFor(o), 'front', 0, false, s); return c; };
  // 손에 든 것만 바꾼 옷차림 (게임에서 우산 쓰기 등)
  A.withHand = function (o, hand, color) { return Object.assign({}, clean(o), { hand, handColor: color || 'orig' }); };
  A.random = function (opts) {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const ok = id => !A.have || A.have.has(id);
    const o = { skin: pick(SKIN).k };
    CATS.slice(1).forEach(c => {
      const avail = c.items.filter(i => ok(i[0]));
      const optional = ['outer', 'suit', 'hat', 'face', 'back', 'hand'].includes(c.id);
      o[c.id] = avail.length && (!optional || Math.random() < 0.35) ? pick(avail)[0] : null;
      o[c.id + 'Color'] = pick(c.colors).k;
    });
    if (!o.top) o.top = 'top_tee';
    if (!o.hair) o.hair = 'hair_short';
    if (!o.shoes) o.shoes = 'shoes_sneakers';
    if (o.suit && Math.random() < 0.7) o.suit = null;
    if (opts && opts.plain) { o.hand = null; o.back = null; o.suit = null; }
    return o;
  };
  window.MoaAvatar = A;
})();
