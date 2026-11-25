// 📄 복제: 패들렛 하나, 또는 교실(반) 하나를 통째로 똑같이 하나 더 만든다 (선생님 화면·내 패들렛이 함께 씀)
//  - 패들렛 복제: 칸·형식·묶음은 그대로, 글은 '선생님 글만'(가져온 글 포함) / '모든 글' / '칸만(글 없이)' 중에서
//    사진·파일은 새 패들렛에 다시 올리고, 캔버스 메모 자리·선도 따라감. 댓글·이모티콘은 복사하지 않음
//  - 교실 복제: 이름·종류·색·맵·묶음·퀴즈 세트·반 링크는 그대로, 방번호는 새로. 학생 기록은 복사하지 않음
//    (고르면) 그 교실 패들렛도 선생님 글만 복제
import { fs, rt, ref, set, doc, getDoc, setDoc, collection, getDocs, query, where, serverTimestamp } from './fb.js';
import { cleanFiles, okColor, copyFiles, layoutOf } from './padkit.js';
import { inTrash } from './trash.js';

const PART_BYTES = 200000;
const bytes = (o) => new TextEncoder().encode(JSON.stringify(o)).length;
export const newId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const byCreated = (a, b) => String(a.created || '').localeCompare(String(b.created || '')) || a.id.localeCompare(b.id);
function cleanPost(p) {
  return { id: p.id || newId('p'), sec: p.sec || 0, title: String(p.title || '').slice(0, 200), body: String(p.body || '').slice(0, 20000), link: String(p.link || '').slice(0, 2000), author: String(p.author || '').slice(0, 60), likes: 0, comments: 0, liked: false, at: p.at || todayISO(), ...(cleanFiles(p.files).length ? { files: cleanFiles(p.files) } : {}), ...(okColor(p.color) ? { color: okColor(p.color) } : {}) };
}
function chunk(posts) {
  const parts = []; let cur = [], size = 2;
  for (const p of posts) { const s = bytes(p) + 1; if (cur.length && size + s > PART_BYTES) { parts.push(cur); cur = []; size = 2; } cur.push(p); size += s; }
  parts.push(cur); return parts;
}
const withOwner = (d, owner) => (owner ? Object.assign({}, d, { owner }) : d);

/** 새 방번호 (아직 아무 반도 안 쓰는 5자리) */
export async function freeRoomNo(used) {
  for (let i = 0; i < 40; i++) { const r = String(Math.floor(10000 + Math.random() * 90000)); if (used && used.has(r)) continue; const s = await getDoc(doc(fs, 'rooms', r)); if (!s.exists()) return r; }
  throw new Error('no room');
}

/** 패들렛 하나 복제 → 새 패들렛 번호. mode: 'mine'(선생님 글만) | 'all'(모든 글) | 'none'(칸만) */
export async function duplicateBoard(src, { cid, title, mode = 'mine', uid, owner = null, own = [], from = '복제함', pub = false } = {}) {
  const meta = { cid: cid || src.cid, title: String(title || src.title || '모아보드').slice(0, 60), from, date: todayISO(), created: new Date().toISOString(), sections: (src.sections || ['글 모음']).slice(), layout: layoutOf(src), groups: src.groups !== false, src: src.src || src.id, public: !!pub, lock: !!src.lock };
  if (src.grp) meta.grp = src.grp;
  const id = newId('b');
  // 1) 패들렛 문서 먼저 (파일을 올릴 자리)
  await setDoc(doc(fs, 'boards', id), withOwner(Object.assign({}, meta, { parts: 1, postCount: 0 }), owner));
  if (mode === 'none') { await setDoc(doc(fs, 'parts', id + '-0'), withOwner({ bid: id, n: 0, posts: [], pub: !!pub }, owner)); return id; }
  const idMap = new Map();
  // 2) 묶음 글(가져온 글·예전 글) — 선생님 자료
  const parts = (await getDocs(query(collection(fs, 'parts'), where('bid', '==', src.id), ...own))).docs.map((d) => d.data()).sort((a, b) => (a.n || 0) - (b.n || 0));
  const olds = [];
  for (const p of parts) for (const x of (p.posts || [])) {
    const q = Object.assign({}, x, { id: newId('p') });
    if (cleanFiles(q.files).length) q.files = await copyFiles(src.id, id, q.files, uid);
    idMap.set(x.id, q.id); olds.push(cleanPost(q));
  }
  const ch = chunk(olds);
  for (let i = 0; i < ch.length; i++) await setDoc(doc(fs, 'parts', id + '-' + i), withOwner({ bid: id, n: i, posts: ch[i], pub: !!pub }, owner));
  // 3) 함께 쓴 글 (선생님 글만 / 모든 글)
  const lives = (await getDocs(collection(fs, 'boards', src.id, 'posts'))).docs.map((d) => Object.assign({ id: d.id }, d.data())).filter((p) => mode === 'all' || p.uid === uid);
  for (const p of lives) {
    const d = { sec: p.sec || 0, title: p.title || '', body: p.body || '', link: p.link || '', img: p.img || '', author: p.author || '', uid, at: p.at || serverTimestamp() };
    const fl = cleanFiles(p.files); if (fl.length) d.files = await copyFiles(src.id, id, fl, uid);
    const col = okColor(p.color); if (col) d.color = col;
    const nid = newId('q'); idMap.set(p.id, nid);
    await setDoc(doc(fs, 'boards', id, 'posts', nid), d);
  }
  await setDoc(doc(fs, 'boards', id), withOwner(Object.assign({}, meta, { parts: ch.length, postCount: olds.length }), owner));
  // 4) 캔버스 메모 자리와 선
  if (idMap.size) {
    const [ps, ls] = await Promise.all([getDocs(collection(fs, 'boards', src.id, 'pos')), getDocs(collection(fs, 'boards', src.id, 'links'))]);
    for (const d of ps.docs) { const n = idMap.get(d.id), v = d.data(); if (n) await setDoc(doc(fs, 'boards', id, 'pos', n), { x: v.x, y: v.y, uid }); }
    for (const d of ls.docs) { const l = d.data(), a = idMap.get(l.a), b = idMap.get(l.b); if (a && b) await setDoc(doc(collection(fs, 'boards', id, 'links')), { a, b, uid, at: serverTimestamp() }); }
  }
  return id;
}

/** 교실 하나 복제 → { id, room, boards: 복제한 패들렛 수 } */
export async function duplicateClass(c, { name, withBoards = true, uid, owner = null, own = [], used } = {}) {
  const id = newId('c'), room = await freeRoomNo(used), nm = String(name || c.name + ' 사본').slice(0, 24);
  const data = { name: nm, kind: c.kind || '정규반', color: c.color || '#FFD23F', map: c.map || 'classroom', room, created: new Date().toISOString() };
  if (c.grp) data.grp = c.grp;
  if (c.qz) data.qz = c.qz;
  if (Array.isArray(c.links) && c.links.length) data.links = c.links;
  await setDoc(doc(fs, 'classes', id), withOwner(data, owner));
  if (owner) await set(ref(rt, 'owners/' + id), owner); // 실시간 교실(진행판)을 이 선생님만 다루게
  await setDoc(doc(fs, 'rooms', room), withOwner({ cid: id, name: nm, color: data.color }, owner));
  let n = 0;
  if (withBoards) {
    const bs = (await getDocs(query(collection(fs, 'boards'), where('cid', '==', c.id), ...own))).docs.map((d) => Object.assign({ id: d.id }, d.data())).filter((b) => !inTrash(b)).sort(byCreated);
    for (const b of bs) { await duplicateBoard(b, { cid: id, title: b.title, mode: 'mine', uid, owner, own, from: c.name + '에서 복제', pub: !!b.public }); n++; }
  }
  return { id, room, name: nm, boards: n };
}
