// 패들렛 휴지통: 지운 패들렛은 30일 동안 휴지통에 있다가 영구 삭제된다
//  - 휴지통으로: boards/{id}에 trash(지운 때) · trashPub(전에 학생에게 보였는지) · trashPin(첫 화면 링크에 있었는지)를 적고,
//    학생 화면에서 바로 사라지도록 public=false, 글 묶음(parts)의 pub=false
//  - 되살리기: 그대로 돌려놓음 (반이 지워졌으면 고른 반으로)
//  - 영구 삭제: 글 묶음·함께 쓴 글·댓글·이모티콘·캔버스 자리·선·파일·패들렛 문서를 모두 지움
//  서버가 따로 없어서, 30일이 지난 것은 선생님이 '내 패들렛'이나 첫 화면을 열 때 지운다
import { fs, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from './fb.js';
import { purgeBoardSubs } from './padkit.js';

export const TRASH_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;
export const inTrash = (b) => !!(b && b.trash);
export const trashTime = (b) => { const t = Date.parse((b && b.trash) || ''); return isNaN(t) ? Date.now() : t; };
export const daysLeft = (b) => Math.max(0, Math.ceil((trashTime(b) + TRASH_DAYS * DAY - Date.now()) / DAY));
export const isExpired = (b) => inTrash(b) && Date.now() - trashTime(b) >= TRASH_DAYS * DAY;

const partsOf = async (bid, own) => (await getDocs(query(collection(fs, 'parts'), where('bid', '==', bid), ...(own || [])))).docs;

export async function trashBoard(b, { own = [], homeRef = null, extra = null } = {}) {
  let pinned = false;
  if (homeRef) {
    try {
      const s = await getDoc(homeRef); const links = (s.exists() && s.data().links) || [];
      if (links.some((l) => l.bid === b.id)) { pinned = true; await setDoc(homeRef, { links: links.filter((l) => l.bid !== b.id) }, { merge: true }); }
    } catch (e) { /* 링크 정리는 못 해도 휴지통으로는 옮김 */ }
  }
  await updateDoc(doc(fs, 'boards', b.id), Object.assign({ trash: new Date().toISOString(), trashPub: !!b.public, trashPin: pinned, public: false }, extra || {}));
  for (const p of await partsOf(b.id, own)) await updateDoc(p.ref, { pub: false });
}

export async function restoreBoard(b, { own = [], homeRef = null, cid = null, className = '' } = {}) {
  const pub = !!b.trashPub;
  const patch = { trash: '', trashPub: false, trashPin: false, trashCls: '', public: pub };
  if (cid) patch.cid = cid;
  await updateDoc(doc(fs, 'boards', b.id), patch);
  for (const p of await partsOf(b.id, own)) await updateDoc(p.ref, { pub });
  if (b.trashPin && homeRef) {
    try {
      const s = await getDoc(homeRef); const links = ((s.exists() && s.data().links) || []).filter((l) => l.bid !== b.id);
      links.unshift({ bid: b.id, t: b.title, d: className, site: '수업 보드', c: '#D7B5FF' });
      await setDoc(homeRef, { links }, { merge: true });
    } catch (e) { /* 링크는 다시 올리면 됨 */ }
  }
}

export async function purgeBoard(b, { own = [] } = {}) {
  for (const p of await partsOf(b.id, own)) await deleteDoc(p.ref);
  await purgeBoardSubs(b.id); // 함께 쓴 글·댓글·이모티콘·캔버스 자리·선·파일
  await deleteDoc(doc(fs, 'boards', b.id));
}

// 30일 지난 것 영구 삭제 (지운 개수를 돌려줌)
export async function purgeExpired(boards, opts) {
  let n = 0;
  for (const b of boards.filter(isExpired)) { try { await purgeBoard(b, opts); n++; } catch (e) { /* 다음에 다시 */ } }
  return n;
}

/* ---------- 교실 휴지통 ----------
 *  교실을 지우면: 그 교실 패들렛을 휴지통으로(trashCls 표시) · 방번호 문서를 지워 학생이 못 들어오게 · 교실 문서에 trash(지운 때)
 *  되살리기: 방번호를 다시 (그새 다른 반이 썼으면 새 번호) · 같이 지운 패들렛도 되살림
 *  영구 삭제(30일 뒤 또는 직접): 같이 지운 패들렛·학생 기록·교실 문서를 모두 지움 */
export async function trashClass(c, { own = [], homeRef = null } = {}) {
  const bs = await getDocs(query(collection(fs, 'boards'), where('cid', '==', c.id), ...own));
  for (const d of bs.docs) { const b = Object.assign({ id: d.id }, d.data()); if (!inTrash(b)) await trashBoard(b, { own, homeRef, extra: { trashCls: c.id } }); }
  if (c.room) { try { await deleteDoc(doc(fs, 'rooms', c.room)); } catch (e) { /* 방번호는 되살릴 때 다시 */ } }
  await updateDoc(doc(fs, 'classes', c.id), { trash: new Date().toISOString() });
  return bs.docs.length;
}
export async function restoreClass(c, { own = [], homeRef = null, owner = null } = {}) {
  let room = c.room;
  if (!room || (await getDoc(doc(fs, 'rooms', room))).exists()) {
    room = '';
    for (let i = 0; i < 40 && !room; i++) { const r = String(Math.floor(10000 + Math.random() * 90000)); if (!(await getDoc(doc(fs, 'rooms', r))).exists()) room = r; }
    if (!room) throw new Error('no room');
  }
  await setDoc(doc(fs, 'rooms', room), Object.assign({ cid: c.id, name: c.name || '', color: c.color || '#FFD23F' }, owner ? { owner } : {}));
  await updateDoc(doc(fs, 'classes', c.id), { trash: '', room });
  const bs = await getDocs(query(collection(fs, 'boards'), where('cid', '==', c.id), ...own));
  let n = 0;
  for (const d of bs.docs) { const b = Object.assign({ id: d.id }, d.data()); if (inTrash(b) && b.trashCls === c.id) { await restoreBoard(b, { own, homeRef, className: c.name }); n++; } }
  return { room, boards: n };
}
export async function purgeClass(c, { own = [] } = {}) {
  const bs = await getDocs(query(collection(fs, 'boards'), where('cid', '==', c.id), ...own));
  for (const d of bs.docs) { const b = Object.assign({ id: d.id }, d.data()); if (inTrash(b) && b.trashCls === c.id) await purgeBoard(b, { own }); }
  const ss = await getDocs(collection(fs, 'classes', c.id, 'students'));
  for (const s of ss.docs) await deleteDoc(s.ref);
  if (c.room) { try { const r = await getDoc(doc(fs, 'rooms', c.room)); if (r.exists() && r.data().cid === c.id) await deleteDoc(r.ref); } catch (e) { /* 무시 */ } }
  await deleteDoc(doc(fs, 'classes', c.id));
}
export async function purgeExpiredClasses(classes, opts) {
  let n = 0;
  for (const c of classes.filter(isExpired)) { try { await purgeClass(c, opts); n++; } catch (e) { /* 다음에 다시 */ } }
  return n;
}
