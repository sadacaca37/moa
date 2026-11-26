// 🧩 샌드박스 도구 (sandbox.html · padlet.html · class.html · index.html · padcopy.js가 함께 씀)
//  샌드박스 = 패들렛 샌드박스처럼 '카드(쪽)'마다 그리기·글자·메모지·도형·선·사진·스티커를 올리는 판.
//  저장: boards/{번호} 문서에 kind: 'sandbox' (모아보드와 같은 자리 → 과제 보관함·교실·휴지통·같이 쓰는 교실을 그대로 씀)
//    cards: [{ id, n(이름), bg('색|무늬'), col(모둠 색) }]  · gc: { 카드: true } 모둠 카드 · ro: { 카드: true } 학생은 보기만
//    join: 'free'(학생이 골라 들어가기) | 'pick'(선생님이 정해 주기) · brk: true 면 학생은 자기 모둠 카드만 봄
//  boards/{번호}/sb/{물건}  카드 위 물건 하나 (c 카드, t 종류, x y w h z, …, uid 쓴 사람)
//  boards/{번호}/sbm/{반_학생}  모둠에 들어간 학생 { cl 반, k 학생, c 모둠 카드, n 이름, uid, by }
import { fs, doc, setDoc, collection, getDocs, writeBatch, serverTimestamp } from './fb.js';

export const SB_W = 1600, SB_H = 900;
export const MAX_CARDS = 40;
export const isSandbox = (b) => !!b && b.kind === 'sandbox';
/** 모아보드·샌드박스 여는 주소 (b: { id, kind }) */
export const boardHref = (b, extra) => (isSandbox(b) ? 'sandbox.html' : 'board.html') + '?b=' + encodeURIComponent(b.id) + (extra || '');
export const newCardId = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// 모둠 색
export const GCOLORS = ['#FF8A65', '#4FC3F7', '#81C784', '#FFD54F', '#BA68C8', '#F06292', '#4DB6AC', '#9575CD', '#FFB74D', '#A1887F', '#90A4AE', '#AED581'];
const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/** 저장된 카드 목록을 믿을 수 있는 모양으로 */
export function cardsOf(b) {
  const list = (b && Array.isArray(b.cards) ? b.cards : []).filter((c) => c && typeof c.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(c.id));
  const seen = new Set();
  return list.filter((c) => (seen.has(c.id) ? false : seen.add(c.id))).map((c) => ({ id: c.id, n: String(c.n || '').slice(0, 30), bg: String(c.bg || '#FFFFFF|').slice(0, 30), col: String(c.col || '').slice(0, 9) }));
}
export const isGroupCard = (b, id) => !!(b && b.gc && b.gc[id] === true);
export const isReadOnly = (b, id) => !!(b && b.ro && b.ro[id] === true);

/** 새 샌드박스 문서 (id는 따로) */
export function sandboxMeta({ cid, title, from }) {
  return { kind: 'sandbox', cid, title: String(title || '새 샌드박스').slice(0, 60), from: from || '직접 만듦', date: todayISO(), created: new Date().toISOString(), cards: [{ id: newCardId(), n: '', bg: '#FFFFFF|', col: '' }], gc: {}, ro: {}, join: 'free', brk: false, sections: [], parts: 0, postCount: 0 };
}

/** 샌드박스 하나를 새 샌드박스로 복사 → 새 번호
 *  meta: 새 문서의 { id, cid, title, from, public, lock, … } (카드·모둠 카드·보기만 표시는 원래 것을 따라감)
 *  mode: 'mine'(선생님이 올린 것만) | 'all'(모두 — 선생님 것으로 바뀜) | 'none'(카드만) · groups: false 면 모둠 카드를 보통 카드로 */
export async function copySandbox(src, meta, { uid, owner = null, mode = 'mine', groups = true } = {}) {
  const cards = cardsOf(src);
  const keep = new Set(cards.map((c) => c.id));
  const d = Object.assign({ kind: 'sandbox', cards, gc: groups ? Object.assign({}, src.gc || {}) : {}, ro: Object.assign({}, src.ro || {}), join: src.join === 'pick' ? 'pick' : 'free', brk: false, sections: [], parts: 0, postCount: 0, date: todayISO(), created: new Date().toISOString() }, meta);
  if (!groups) d.cards = cards.map((c) => Object.assign({}, c, { col: '' }));
  if (src.grp && !d.grp) d.grp = src.grp;
  const id = d.id; delete d.id;
  if (owner) d.owner = owner;
  await setDoc(doc(fs, 'boards', id), d);
  if (mode === 'none') return id;
  const snap = await getDocs(collection(fs, 'boards', src.id, 'sb'));
  let batch = writeBatch(fs), n = 0;
  for (const x of snap.docs) {
    const v = x.data();
    if (!keep.has(v.c) || (mode === 'mine' && v.uid !== uid)) continue;
    const o = Object.assign({}, v, { uid, at: serverTimestamp() });
    delete o.k; delete o.cl;
    if (mode === 'all' && v.uid !== uid) o.n = v.n || '';
    batch.set(doc(fs, 'boards', id, 'sb', x.id), o);
    if (++n % 400 === 0) { await batch.commit(); batch = writeBatch(fs); }
  }
  if (n % 400) await batch.commit();
  return id;
}
