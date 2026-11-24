// 패들렛 도구 (board.html·padlet.html이 함께 씀)
//  - 파일 올리기: 웬만한 형식 모두, 한 파일 10MB까지, 한 글에 5개까지
//    Firebase 무료 요금제라 파일 저장소(Storage)를 못 써서, Firestore에 900KB 조각으로 나눠 저장한다
//    boards/{패들렛}/files/{파일} = { name, type, size, n(조각 수), uid, at }
//    boards/{패들렛}/files/{파일}/c/{0..n-1} = { d: 바이트 }
//    글에는 files: [{ id, name, size, type, n }] 만 적는다
//  - 이모티콘 반응: boards/{패들렛}/reacts/{글}_{uid}_{번호} = { pid, e, uid }
//  - 댓글·글 쓰기 칸에 이모티콘 넣기
//  - 패들렛 형식(담벼락·칸·격자·스트림·타임라인·캔버스)
import { emoHTML, emoName, emoTok, openEmoPicker, EMO_N } from './emo.js';
import { fs, doc, setDoc, deleteDoc, collection, getDocs, serverTimestamp, esc, Bytes } from './fb.js';

export const MAX_FILE = 10 * 1024 * 1024;
export const MAX_FILES = 5;
const CH = 900000;

export const REACTS = ['👍', '❤️', '😆', '😮', '😢', '👏', '🎉', '⭐'];
export const REACT_NAMES = ['좋아요', '사랑해요', '재밌어요', '놀라워요', '슬퍼요', '박수', '축하해요', '최고예요'];
export const EMOJIS = ['😀', '😆', '😍', '🥰', '😎', '🤔', '😮', '😢', '😭', '😡', '👍', '👏', '🙌', '💪', '🎉', '❤️', '⭐', '✨', '🔥', '💯', '✅', '❓', '🌈', '🍀'];
// 글(메모) 색: [값, 이름, 바탕색]
export const PCOLORS = [['', '흰색', '#FFFFFF'], ['y', '노랑', '#FFF3A6'], ['p', '분홍', '#FFD6E0'], ['g', '연두', '#DDF5CC'], ['b', '하늘', '#D4EBFF'], ['v', '보라', '#E5DCFF'], ['o', '주황', '#FFE0C2']];
export const pcolor = (c) => (PCOLORS.find((x) => x[0] === c) || PCOLORS[0])[2];
export const okColor = (c) => PCOLORS.some((x) => x[0] === c) ? c : '';

// 패들렛 형식: [값, 이름, 그림 글자, 설명]
export const FORMATS = [
  ['wall', '담벼락', '🧱', '벽돌처럼 쌓기'],
  ['columns', '칸', '📚', '칸마다 세로로'],
  ['grid', '격자', '🔲', '줄 맞춰 나란히'],
  ['stream', '스트림', '📜', '위에서 아래로'],
  ['timeline', '타임라인', '⏳', '가로 선 따라'],
  ['canvas', '캔버스', '🧠', '자유롭게 · 선 잇기']
];
export const layoutOf = (b) => (b && FORMATS.some((f) => f[0] === b.layout) ? b.layout : 'columns');
export const formatName = (b) => FORMATS.find((f) => f[0] === layoutOf(b))[1];
// 칸(섹션)으로 묶어 보이는지: 칸은 늘, 격자·스트림·타임라인은 고를 수 있음, 담벼락·캔버스는 묶지 않음
export const usesSecs = (b) => { const l = layoutOf(b); return l === 'columns' || ((l === 'grid' || l === 'stream' || l === 'timeline') && b.groups !== false); };

/* ---------- 파일 ---------- */
const BLOCK = /\.(exe|msi|msp|bat|cmd|com|scr|pif|cpl|vbs|vbe|js|jse|wsf|wsh|ps1|psm1|hta|jar|apk|dll|sys|lnk|reg|inf|gadget|appx|appxbundle|msix|dmg|pkg|sh|run)$/i;
const extOf = (n) => (String(n || '').toLowerCase().match(/\.([a-z0-9]{1,8})$/) || [])[1] || '';
export function fileKind(name, type) {
  const e = extOf(name), t = String(type || '').toLowerCase();
  if (/^image\/(png|jpeg|gif|webp|bmp|svg\+xml)$/.test(t) || /^(png|jpe?g|gif|webp|bmp|svg)$/.test(e)) return { k: 'img', i: '🖼️', l: '그림' };
  if (/^video\//.test(t) || /^(mp4|webm|mov|m4v|ogv)$/.test(e)) return { k: 'vid', i: '🎬', l: '영상' };
  if (/^audio\//.test(t) || /^(mp3|wav|m4a|ogg|oga|aac|flac|weba)$/.test(e)) return { k: 'aud', i: '🎵', l: '소리' };
  if (t === 'application/pdf' || e === 'pdf') return { k: 'pdf', i: '📕', l: 'PDF' };
  if (/^(hwp|hwpx|hwt)$/.test(e)) return { k: 'doc', i: '📘', l: '한글' };
  if (/^(doc|docx|odt|rtf)$/.test(e)) return { k: 'doc', i: '📄', l: '워드' };
  if (/^(ppt|pptx|pps|ppsx|odp|key|show)$/.test(e)) return { k: 'doc', i: '📙', l: '발표 자료' };
  if (/^(xls|xlsx|ods|csv|cell)$/.test(e)) return { k: 'doc', i: '📗', l: '표' };
  if (/^(txt|md)$/.test(e) || t === 'text/plain') return { k: 'txt', i: '📝', l: '글' };
  if (/^(zip|7z|rar|alz|egg|tar|gz)$/.test(e)) return { k: 'zip', i: '🗜️', l: '압축 파일' };
  if (/^(sb3|sb2|sb|ent|py|ino|c|cpp|java|html|htm|css|json|xml)$/.test(e)) return { k: 'code', i: '🧩', l: '코딩' };
  return { k: 'etc', i: '📎', l: e ? e.toUpperCase() + ' 파일' : '파일' };
}
const VIEW = { img: 1, vid: 1, aud: 1, pdf: 1, txt: 1 };
export function fmtSize(n) {
  n = +n || 0;
  if (n < 1024) return n + 'B';
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + 'KB';
  return (n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0) + 'MB';
}
// 올리기 전에 살펴보기: 문제가 있으면 알림 글자를 돌려준다
export function checkFile(f) {
  if (!f) return '파일을 읽지 못했어요.';
  if (BLOCK.test(f.name || '')) return '\'' + f.name + '\' — 실행 파일은 못 올려요.';
  if (!f.size) return '\'' + f.name + '\' — 빈 파일이에요.';
  if (f.size > MAX_FILE) return '\'' + f.name + '\' — 10MB까지 올릴 수 있어요.';
  return '';
}
const safeName = (s) => String(s || '').normalize('NFC').replace(/[\u0000-\u001f\\/:*?"<>|]/g, '_').trim().slice(0, 120) || '파일';
// 글에 적어 둘 파일 정보만 깨끗하게 (글에서 읽은 것도 이걸로 걸러서 씀)
export function cleanFiles(list) {
  return (Array.isArray(list) ? list : []).filter((f) => f && typeof f.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(f.id)).slice(0, MAX_FILES)
    .map((f) => ({ id: f.id, name: safeName(f.name), size: Math.max(0, Math.round(+f.size || 0)), type: String(f.type || '').slice(0, 120), n: Math.min(12, Math.max(1, Math.round(+f.n || 1))) }));
}
const fileRef = (bid, fid) => doc(fs, 'boards', bid, 'files', fid);
const chunkRef = (bid, fid, i) => doc(fs, 'boards', bid, 'files', fid, 'c', String(i));
// 파일 하나 올리기 (onp: 0~1 진행) → 글에 적을 정보
export async function uploadFile(bid, file, uid, onp) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const n = Math.max(1, Math.ceil(buf.length / CH));
  const ref = doc(collection(fs, 'boards', bid, 'files'));
  const meta = { name: safeName(file.name), type: String(file.type || '').slice(0, 120), size: buf.length, n };
  await setDoc(ref, Object.assign({}, meta, { uid, at: serverTimestamp() }));
  try {
    for (let i = 0; i < n; i++) {
      await setDoc(chunkRef(bid, ref.id, i), { d: Bytes.fromUint8Array(buf.slice(i * CH, (i + 1) * CH)) });
      if (onp) onp((i + 1) / n);
    }
  } catch (e) { await removeFile(bid, { id: ref.id, n }).catch(() => {}); throw e; }
  return Object.assign({ id: ref.id }, meta);
}
// 파일 지우기 (조각 먼저, 정보는 나중 — 보안 규칙이 정보의 주인을 보고 조각 지우기를 허락하므로)
export async function removeFile(bid, f) {
  if (!f || !f.id) return;
  for (let i = 0; i < (f.n || 1); i++) { try { await deleteDoc(chunkRef(bid, f.id, i)); } catch (e) { /* 없는 조각 */ } }
  await deleteDoc(fileRef(bid, f.id));
  cache.delete(bid + '/' + f.id);
}
// 패들렛을 영구 삭제할 때: 그 패들렛의 파일을 모두 지움
export async function purgeFiles(bid) {
  const fsnap = await getDocs(collection(fs, 'boards', bid, 'files'));
  for (const d of fsnap.docs) {
    try { for (const c of (await getDocs(collection(fs, 'boards', bid, 'files', d.id, 'c'))).docs) await deleteDoc(c.ref); } catch (e) { /* 넘어감 */ }
    await deleteDoc(d.ref);
  }
}
// 패들렛 문서 아래 모음(글·댓글·파일·반응·자리·선)을 모두 지움
export const BOARD_SUBS = ['posts', 'comments', 'reacts', 'pos', 'links'];
export async function purgeBoardSubs(bid) {
  for (const sub of BOARD_SUBS) {
    try { for (const x of (await getDocs(collection(fs, 'boards', bid, sub))).docs) await deleteDoc(x.ref); } catch (e) { /* 없으면 넘어감 */ }
  }
  try { await purgeFiles(bid); } catch (e) { /* 넘어감 */ }
}
const cache = new Map();
// 파일 내용 받기 (한 번 받은 것은 이 화면에서 다시 쓰지 않고 기억)
export function fileBlob(bid, f) {
  const key = bid + '/' + f.id;
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    const snap = await getDocs(collection(fs, 'boards', bid, 'files', f.id, 'c'));
    const parts = snap.docs.map((d) => [Number(d.id), d.data().d]).filter((x) => x[1]).sort((a, b) => a[0] - b[0]).map((x) => x[1].toUint8Array());
    if (!parts.length) throw Object.assign(new Error('nofile'), { code: 'not-found' });
    return new Blob(parts, { type: f.type || 'application/octet-stream' });
  })();
  cache.set(key, p); p.catch(() => cache.delete(key));
  return p;
}
// 다른 패들렛으로 복사할 때 (선생님): 내용을 받아 새 패들렛에 다시 올림
export async function copyFiles(srcBid, dstBid, list, uid) {
  const out = [];
  for (const f of cleanFiles(list)) {
    try {
      const blob = await fileBlob(srcBid, f);
      out.push(await uploadFile(dstBid, new File([blob], f.name, { type: f.type }), uid));
    } catch (e) { /* 못 옮긴 파일은 빼고 */ }
  }
  return out;
}
export async function downloadFile(bid, f) {
  const blob = await fileBlob(bid, f);
  // 받은 파일이 이 화면 안에서 열리지 않게(안전) 늘 '내려받기'로만 준다
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' }));
  const a = document.createElement('a'); a.href = url; a.download = f.name || '파일'; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ---------- 파일 보기 창 ---------- */
let viewer = null;
function closeViewer() {
  if (!viewer) return;
  viewer.urls.forEach((u) => URL.revokeObjectURL(u));
  viewer.el.remove();
  if (viewer.back && document.contains(viewer.back)) viewer.back.focus();
  viewer = null;
}
async function viewFile(bid, f) {
  closeViewer();
  const k = fileKind(f.name, f.type);
  const el = document.createElement('div');
  el.className = 'pk-ov';
  el.innerHTML = '<div class="pk-box pf" role="dialog" aria-modal="true" aria-label="' + esc(f.name) + ' 보기"><div class="pk-top"><span aria-hidden="true" style="font-size:22px">' + k.i + '</span><b>' + esc(f.name) + ' <small>' + esc(k.l) + ' · ' + fmtSize(f.size) + '</small></b><button type="button" class="btn sm" data-pkv="down">내려받기</button><button type="button" class="btn sm" data-pkv="x">닫기 ✕</button></div><div class="pk-body"><p class="pk-wait">불러오는 중…</p></div></div>';
  viewer = { el, urls: [], back: document.activeElement, bid, f };
  document.body.append(el);
  el.querySelector('[data-pkv=x]').focus();
  const body = el.querySelector('.pk-body');
  try {
    const blob = await fileBlob(bid, f);
    if (!viewer || viewer.el !== el) return;
    const url = (type) => { const u = URL.createObjectURL(type ? new Blob([blob], { type }) : blob); viewer.urls.push(u); return u; };
    if (k.k === 'img') body.innerHTML = '<img alt="' + esc(f.name) + '" src="' + url() + '">';
    else if (k.k === 'vid') body.innerHTML = '<video controls playsinline src="' + url() + '"></video>';
    else if (k.k === 'aud') body.innerHTML = '<audio controls src="' + url() + '"></audio>';
    else if (k.k === 'pdf') body.innerHTML = '<iframe title="' + esc(f.name) + '" src="' + url('application/pdf') + '"></iframe>';
    else if (k.k === 'txt') {
      const buf = new Uint8Array(await blob.slice(0, 300000).arrayBuffer());
      let txt = new TextDecoder('utf-8').decode(buf);
      if (/�/.test(txt)) { try { txt = new TextDecoder('euc-kr').decode(buf); } catch (e) { /* 그대로 */ } }
      const pre = document.createElement('pre'); pre.textContent = txt; body.innerHTML = ''; body.append(pre);
    } else body.innerHTML = '<p class="pk-wait">이 파일은 내려받아서 열어요.</p>';
  } catch (e) {
    body.innerHTML = '<p class="pk-wait">' + (e && e.code === 'not-found' ? '지워진 파일이에요.' : '파일을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.') + '</p>';
  }
}

/* ---------- 그리기 도우미 (HTML 글자) ---------- */
const REG = new Map(); // 화면에 그린 파일 정보 (누르면 찾아 씀)
export function filesHTML(list, opts) {
  const fl = cleanFiles(list); if (!fl.length) return '';
  return '<div class="pk-files">' + fl.map((f) => {
    REG.set(f.id, f);
    const k = fileKind(f.name, f.type);
    return '<div class="pk-file"><span class="pk-fi" aria-hidden="true">' + k.i + '</span><span class="pk-fn"><b>' + esc(f.name) + '</b><small>' + esc(k.l) + ' · ' + fmtSize(f.size) + '</small></span>' +
      (VIEW[k.k] ? '<button type="button" class="pk-fb" data-pk="view" data-fid="' + esc(f.id) + '" aria-label="' + esc(f.name) + ' 보기">보기</button>' : '') +
      '<button type="button" class="pk-fb" data-pk="down" data-fid="' + esc(f.id) + '" aria-label="' + esc(f.name) + ' 내려받기">받기</button>' +
      (opts && opts.remove ? '<button type="button" class="pk-fb" data-pk="unfile" data-fid="' + esc(f.id) + '" aria-label="' + esc(f.name) + ' 빼기">✕</button>' : '') + '</div>';
  }).join('') + '</div>';
}
const PAL = new Set(); // 열린 이모티콘 고르기 칸
// 반응 줄: rs = 이 글의 반응들, can = 누를 수 있는지
export function reactsHTML(pid, rs, myUid, can) {
  // e: 0~7 기본 이모지, 100~ 모아팡 이모티콘(100+번호, 규칙은 299까지)
  const cnt = new Map(), mine = new Set();
  (rs || []).forEach((r) => { if (okRx(r.e)) { cnt.set(r.e, (cnt.get(r.e) || 0) + 1); if (r.uid === myUid) mine.add(r.e); } });
  if (!cnt.size && !can) return '';
  const key = 'r:' + pid;
  const order = REACTS.map((_, e) => e).filter((e) => cnt.has(e)).concat([...cnt.keys()].filter((e) => e >= 100));
  const face = (e) => e >= 100 ? emoHTML(e - 100, '26px') : REACTS[e];
  const label = (e) => e >= 100 ? emoName(e - 100) : REACT_NAMES[e];
  let h = '<div class="pk-rx">' + order.map((e) => '<button type="button" class="pk-r' + (e >= 100 ? ' st' : '') + (mine.has(e) ? ' on' : '') + '" data-pk="react" data-pid="' + esc(pid) + '" data-e="' + e + '" aria-pressed="' + mine.has(e) + '" aria-label="' + esc(label(e)) + ' ' + cnt.get(e) + '개" title="' + esc(label(e)) + '"' + (can ? '' : ' disabled') + '>' + face(e) + '<b>' + cnt.get(e) + '</b></button>').join('');
  if (can) h += '<button type="button" class="pk-r add" data-pk="pal" data-key="' + esc(key) + '" aria-expanded="' + PAL.has(key) + '" aria-label="이모티콘 달기" title="이모티콘 달기">😀<span aria-hidden="true">+</span></button>';
  h += '</div>';
  if (can) h += '<div class="pk-pal" data-palk="' + esc(key) + '" role="group" aria-label="달 이모티콘 고르기"' + (PAL.has(key) ? '' : ' hidden') + '>' + REACTS.map((em, e) => '<button type="button" data-pk="react" data-pid="' + esc(pid) + '" data-e="' + e + '" aria-pressed="' + mine.has(e) + '" aria-label="' + REACT_NAMES[e] + '" title="' + REACT_NAMES[e] + '">' + em + '</button>').join('') +
    '<button type="button" class="pk-more" data-pk="rsticker" data-emopen data-pid="' + esc(pid) + '" aria-label="모아팡 이모티콘 고르기" title="모아팡 이모티콘">' + emoHTML(11, '30px') + '<span>더보기</span></button></div>';
  return h;
}
const okRx = (e) => Number.isInteger(e) && ((e >= 0 && e < REACTS.length) || (e >= 100 && e < 100 + EMO_N));
// 글자 칸에 이모티콘 넣는 단추와 고르기 칸 (sel = 넣을 칸을 찾는 CSS 선택자)
export function emojiBtn(key, label) { return '<button type="button" class="pk-eb" data-pk="pal" data-key="' + esc(key) + '" aria-expanded="' + PAL.has(key) + '" aria-label="' + esc(label || '이모티콘 넣기') + '" title="이모티콘 넣기">😀</button>'; }
export function emojiPal(key, sel) {
  return '<div class="pk-pal" data-palk="' + esc(key) + '" role="group" aria-label="넣을 이모티콘 고르기"' + (PAL.has(key) ? '' : ' hidden') + '><button type="button" class="pk-more" data-pk="emopick" data-emopen data-key="' + esc(key) + '" data-sel="' + esc(sel) + '" aria-label="모아팡 이모티콘 고르기" title="모아팡 이모티콘">' + emoHTML(11, '30px') + '<span>모아팡</span></button>' + EMOJIS.map((em) => '<button type="button" data-pk="emo" data-sel="' + esc(sel) + '" data-em="' + em + '">' + em + '</button>').join('') + '</div>';
}
export function closePals() { PAL.clear(); document.querySelectorAll('.pk-pal').forEach((p) => { p.hidden = true; }); }

/* ---------- 누르기 ---------- */
let H = {};
let installed = false;
// h: { bid(): 지금 패들렛, react(pid, e), toast(글자, 나쁨), unfile(fid), sticker(key, i): 이모티콘을 바로 보냈으면 true }
export function installPadkit(h) {
  H = h || {};
  if (installed) return; installed = true;
  injectCSS();
  document.addEventListener('click', async (e) => {
    const v = e.target.closest('[data-pkv]');
    if (v && viewer) {
      if (v.dataset.pkv === 'x') closeViewer();
      else if (v.dataset.pkv === 'down') { const { bid, f } = viewer; downloadFile(bid, f).catch(() => H.toast && H.toast('파일을 받지 못했어요.', true)); }
      return;
    }
    if (viewer && e.target === viewer.el) { closeViewer(); return; }
    const t = e.target.closest('[data-pk]'); if (!t) return;
    const a = t.dataset.pk;
    if (a === 'view' || a === 'down') {
      e.preventDefault();
      const f = REG.get(t.dataset.fid), bid = H.bid && H.bid(); if (!f || !bid) return;
      if (a === 'view') { viewFile(bid, f); return; }
      const txt = t.textContent; t.disabled = true; t.textContent = '받는 중…';
      try { await downloadFile(bid, f); } catch (err) { if (H.toast) H.toast(err && err.code === 'not-found' ? '지워진 파일이에요.' : '파일을 받지 못했어요. 인터넷 연결을 확인해 주세요.', true); }
      finally { if (document.contains(t)) { t.disabled = false; t.textContent = txt; } }
    } else if (a === 'react') {
      e.preventDefault();
      const key = 'r:' + t.dataset.pid;
      if (t.closest('.pk-pal')) { PAL.delete(key); t.closest('.pk-pal').hidden = true; }
      if (H.react) H.react(t.dataset.pid, +t.dataset.e);
    } else if (a === 'rsticker') {
      e.preventDefault();
      const pid = t.dataset.pid;
      openEmoPicker(t, (i) => { PAL.delete('r:' + pid); closePals(); if (H.react) H.react(pid, 100 + i); });
    } else if (a === 'emopick') {
      e.preventDefault();
      const key = t.dataset.key, sel = t.dataset.sel;
      openEmoPicker(t, (i) => {
        if (H.sticker && H.sticker(key, i)) { PAL.delete(key); closePals(); return; }
        const inp = document.querySelector(sel); if (!inp || inp.disabled) return;
        insertAt(inp, emoTok(i));
      });
    } else if (a === 'pal') {
      e.preventDefault();
      const key = t.dataset.key, open = !PAL.has(key);
      if (open) PAL.add(key); else PAL.delete(key);
      const pal = document.querySelector('[data-palk="' + CSS.escape(key) + '"]');
      if (pal) pal.hidden = !open;
      t.setAttribute('aria-expanded', String(open));
    } else if (a === 'emo') {
      e.preventDefault();
      const inp = document.querySelector(t.dataset.sel); if (!inp || inp.disabled) return;
      insertAt(inp, t.dataset.em);
    } else if (a === 'unfile') {
      e.preventDefault();
      if (H.unfile) H.unfile(t.dataset.fid);
    }
  });
  // 보기 창이 열려 있으면 Esc는 보기 창만 닫는다
  document.addEventListener('keydown', (e) => { if (viewer && e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); closeViewer(); } }, true);
}
function insertAt(inp, em) {
  const s = inp.selectionStart ?? inp.value.length, en = inp.selectionEnd ?? inp.value.length;
  const max = +inp.getAttribute('maxlength') || 0;
  if (max && inp.value.length - (en - s) + em.length > max) { if (H.toast) H.toast('글자 수가 꽉 찼어요.', true); return; }
  inp.setRangeText(em, s, en, 'end');
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  inp.focus();
}
function injectCSS() {
  const s = document.createElement('style');
  s.textContent = `
.pk-files{display:flex;flex-direction:column;gap:6px}
.pk-file{display:flex;align-items:center;gap:6px;padding:4px 4px 4px 8px;background:#F4F0E4;border:3px solid #1B1F3B}
.pk-fi{font-size:22px;line-height:1;flex:none}
.pk-fn{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.3}
.pk-fn b{font:700 13px/1.35 'Noto Sans KR',sans-serif;overflow-wrap:anywhere;color:#1B1F3B}
.pk-fn small{font:500 11px 'Noto Sans KR',sans-serif;color:#4B4F6B}
.pk-fb{min-height:36px;padding:0 8px;border:2px solid #1B1F3B;background:#fff;color:#1B1F3B;font:700 12px 'Noto Sans KR',sans-serif;cursor:pointer;flex:none}
.pk-fb:hover{background:#FFF1B8}
.pk-fb:disabled{opacity:.7;cursor:wait}
.pk-rx{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.pk-r{min-height:34px;padding:0 9px;border:2px solid #1B1F3B;border-radius:999px;background:#fff;color:#1B1F3B;font:400 16px/1 'Noto Sans KR',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
.pk-r b{font:700 12px 'Noto Sans KR',sans-serif}
.pk-r.on{background:#FFE9A8;border-color:#C2410C;box-shadow:inset 0 0 0 1px #C2410C}
.pk-r.add{font-size:15px;color:#4B4F6B;border-style:dashed}
.pk-r.add span{font:700 13px 'Noto Sans KR',sans-serif}
.pk-r:disabled{cursor:default}
.pk-r:not(:disabled):hover{background:#FFF6D6}
.pk-eb{flex:none;min-width:38px;min-height:38px;border:3px solid #1B1F3B;background:#fff;font-size:18px;cursor:pointer;padding:0}
.pk-eb:hover{background:#FFF1B8}
.pk-pal{display:flex;flex-wrap:wrap;gap:2px;padding:6px;background:#fff;border:3px solid #1B1F3B;box-shadow:3px 3px 0 #1B1F3B}
.pk-pal button{width:38px;height:38px;border:0;border-radius:8px;background:transparent;font-size:21px;line-height:1;cursor:pointer;padding:0}
.pk-pal button:hover,.pk-pal button[aria-pressed=true]{background:#FFF1B8}
.pk-pal .pk-more{width:auto;display:inline-flex;align-items:center;gap:3px;padding:0 8px 0 4px;border:2px dashed #1B1F3B;font:700 12px 'Noto Sans KR',sans-serif;color:#1B1F3B}
.pk-r.st{padding:0 8px 0 3px}
.pk-ov{position:fixed;inset:0;z-index:90;background:rgba(27,31,59,.72);display:flex;align-items:center;justify-content:center;padding:12px}
.pk-box{background:#fff;width:min(96vw,1040px);max-height:94vh;display:flex;flex-direction:column;padding:10px;gap:8px}
.pk-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pk-top b{flex:1;min-width:140px;font:700 15px/1.4 'Noto Sans KR',sans-serif;overflow-wrap:anywhere}
.pk-top small{font-weight:500;color:#4B4F6B}
.pk-body{flex:1;min-height:120px;overflow:auto;display:flex;justify-content:center;align-items:center;background:#F4F0E4;border:3px solid #1B1F3B}
.pk-body img,.pk-body video{max-width:100%;max-height:80vh;display:block}
.pk-body iframe{width:100%;height:80vh;border:0;background:#fff}
.pk-body audio{width:min(100%,520px);margin:30px}
.pk-body pre{margin:0;padding:12px;align-self:stretch;width:100%;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 'Noto Sans KR',monospace;background:#fff}
.pk-wait{margin:30px;font:700 15px 'Noto Sans KR',sans-serif;color:#4B4F6B}
`;
  document.head.append(s);
}
