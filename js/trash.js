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

export async function trashBoard(b, { own = [], homeRef = null } = {}) {
  let pinned = false;
  if (homeRef) {
    try {
      const s = await getDoc(homeRef); const links = (s.exists() && s.data().links) || [];
      if (links.some((l) => l.bid === b.id)) { pinned = true; await setDoc(homeRef, { links: links.filter((l) => l.bid !== b.id) }, { merge: true }); }
    } catch (e) { /* 링크 정리는 못 해도 휴지통으로는 옮김 */ }
  }
  await updateDoc(doc(fs, 'boards', b.id), { trash: new Date().toISOString(), trashPub: !!b.public, trashPin: pinned, public: false });
  for (const p of await partsOf(b.id, own)) await updateDoc(p.ref, { pub: false });
}

export async function restoreBoard(b, { own = [], homeRef = null, cid = null, className = '' } = {}) {
  const pub = !!b.trashPub;
  const patch = { trash: '', trashPub: false, trashPin: false, public: pub };
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
