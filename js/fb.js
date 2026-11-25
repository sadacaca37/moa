// 모아팡 Firebase 연결 (모든 화면이 함께 씀)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, onSnapshot, serverTimestamp, writeBatch, increment, limit, Bytes } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getDatabase, ref, set, update, remove, push, onValue, onChildAdded, onChildChanged, onChildRemoved, onDisconnect, query as rquery, limitToLast, serverTimestamp as rnow, get as rget } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const app = initializeApp({
  apiKey: 'AIzaSyBlA9TN1BKvnsKrzuq2fMalCrATTeFgkUo',
  authDomain: 'moaboard-943a3.firebaseapp.com',
  projectId: 'moaboard-943a3',
  storageBucket: 'moaboard-943a3.firebasestorage.app',
  messagingSenderId: '986530203160',
  appId: '1:986530203160:web:b48121b7113f38a49c656d',
  databaseURL: 'https://moaboard-943a3-default-rtdb.asia-southeast1.firebasedatabase.app'
});
export const auth = getAuth(app);
export const fs = getFirestore(app);
export const rt = getDatabase(app);
// 지금 열린 모아팡 주소 (moapang.kr 이든 예전 github.io/moa 든 그대로 따라감) — QR·반 링크에 씀
export const SITE = new URL('../', import.meta.url).href;

// 선생님 = 이메일·비밀번호로 로그인한 계정. 진짜 선생님인지는 Firebase 보안 규칙(콘솔에만 있는 선생님 이메일)이 막는다.
// 선생님 이메일은 공개 코드에 적지 않고, 로그인한 그 컴퓨터에만 기억한다(TEACHER_EM_KEY).
export const TEACHER_EM_KEY = 'moaTeacherEmail';
export const TEACHER_EMAIL = ''; // 예전 화면 파일이 기기에 남아 있을 때 깨지지 않게 (이메일은 적지 않음)
export const isTeacher = (u) => !!u && !u.isAnonymous && (u.providerData || []).some((p) => p.providerId === 'password');

// 로그인 상태가 정해지면 한 번 알려 준다
export function whenAuth() {
  return new Promise((res) => { const off = onAuthStateChanged(auth, (u) => { off(); res(u); }); });
}
// 학생: 로그인 안 되어 있으면 익명 로그인
export async function ensureUser() {
  const u = await whenAuth();
  if (u) return u;
  const c = await signInAnonymously(auth);
  return c.user;
}
// 로그인하면 이 기기가 '지금 쓰는 자리'가 된다 (다른 컴퓨터에 남아 있던 같은 계정은 스스로 로그아웃 — 아래 '한 곳에서만 로그인')
export async function teacherLogin(email, pw) {
  claiming = true;
  try {
    const u = (await signInWithEmailAndPassword(auth, email, pw)).user;
    if (isTeacher(u)) await claimSeat(u);
    return u;
  } finally { claiming = false; }
}
export async function logout() { forgetSeat(); await signOut(auth); }
// 비밀번호를 잊었을 때: 선생님 메일로 새 비밀번호 만드는 링크를 보낸다
export async function resetPassword(email) { await sendPasswordResetEmail(auth, email); }

/* ---------- 함께 쓰는 선생님 ----------
 * - 주 선생님(admin): 예전 그대로 모든 것을 다룸. 주 선생님 반에는 owner 칸이 없다
 * - 함께 쓰는 선생님(teacher): 주 선생님이 '선생님 관리'에서 이메일을 올리면, 그 선생님이 직접 가입하고 메일 인증
 *   → 자기가 만든 반(owner = 자기 uid)과 그 반 학생·패들렛·문제만 보인다
 */
export const emKey = (em) => String(em || '').trim().toLowerCase().replace(/\./g, ',');
let roleCache = null;
// 'admin' | 'teacher' | 'unverified'(메일 인증 전) | 'none'(올리지 않은 계정) | 'error' | null(선생님 로그인 아님)
export async function teacherRole(u) {
  if (!isTeacher(u)) return null;
  if (roleCache && roleCache.uid === u.uid) return roleCache.role;
  const em = String(u.email || '').toLowerCase();
  let role;
  try {
    const s = await getDoc(doc(fs, 'teachers', em));
    if (s.exists()) role = u.emailVerified ? 'teacher' : 'unverified';
    else { try { await getDocs(query(collection(fs, 'teachers'), limit(1))); role = 'admin'; } catch (e) { role = 'none'; } }
  } catch (e) { role = /permission/i.test((e && e.code) || '') ? 'none' : 'error'; }
  if (role !== 'error') roleCache = { uid: u.uid, role };
  return role;
}
export async function teacherSignup(email, pw) {
  const c = await createUserWithEmailAndPassword(auth, String(email).trim().toLowerCase(), pw);
  try { await sendEmailVerification(c.user); } catch (e) { /* 인증 메일은 다시 보내기로 */ }
  return c.user;
}
export async function resendVerify() { if (auth.currentUser) await sendEmailVerification(auth.currentUser); }
// 메일 인증을 마친 뒤: 로그인 정보를 새로 받아 와야 보안 규칙이 인증을 알아본다
export async function refreshUser() { const u = auth.currentUser; if (!u) return null; await u.reload(); await u.getIdToken(true); roleCache = null; return auth.currentUser; }
// 반 주인 선생님에 맞는 문제 상자 이름 (주 선생님 반은 예전 그대로 'ox', 함께 쓰는 선생님은 'uid_ox')
export const bankId = (owner, k) => owner ? owner + '_' + k : k;

// 학생 이름 → 문서 이름 (같은 반에서 같은 이름이면 같은 학생)
export function nameKey(name) {
  const n = String(name || '').normalize('NFC').replace(/\s+/g, '').toLowerCase();
  return 'n_' + Array.from(n).map((ch) => /[0-9a-z가-힣]/.test(ch) ? ch : '_' + ch.codePointAt(0).toString(16)).join('').slice(0, 120);
}
export const cleanName = (s) => String(s || '').normalize('NFC').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 10);

/* ---------- 학생 화면 미리보기 (선생님) ----------
 * 선생님 화면의 '👀 학생 화면으로 보기'(주소 ?preview=반ID&pn=반이름) → 이 탭에서만 학생처럼 보인다.
 * 미리보기 중에는 학생 기록·점수·글·댓글·채팅·자리(실시간 위치)를 남기지 않는다. 맨 위 띠의 버튼으로 선생님 화면에 돌아감. */
const PKEY = 'moa_preview';
{
  const q = new URLSearchParams(location.search), c = q.get('preview');
  if (c && /^[A-Za-z0-9_-]{1,60}$/.test(c)) { try { sessionStorage.setItem(PKEY, JSON.stringify({ cid: c, className: String(q.get('pn') || '우리 반').slice(0, 24) })); } catch (e) { /* 무시 */ } }
}
export const PREVIEW = (() => { try { const p = JSON.parse(sessionStorage.getItem(PKEY)); return p && p.cid ? p : null; } catch (e) { return null; } })();
export function endPreview() { try { sessionStorage.removeItem(PKEY); } catch (e) { /* 무시 */ } }
export const previewUrl = (c) => './class.html?preview=' + encodeURIComponent(c.id) + '&pn=' + encodeURIComponent(c.name || '');

// 이 기기에 남기는 입장 정보 (미리보기 중에는 가짜 학생 '미리보기'로, 아무것도 남기지 않음)
const SKEY = 'moa_session';
export function getSession() {
  if (PREVIEW) return { cid: PREVIEW.cid, className: PREVIEW.className, name: '미리보기', key: 'preview', outfit: null, preview: true };
  try { const s = JSON.parse(localStorage.getItem(SKEY)); return s && s.cid && s.name ? s : null; } catch (e) { return null; }
}
export function setSession(s) { if (PREVIEW) return; try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) { /* 저장 못 해도 계속 */ } }
export function clearSession() { if (PREVIEW) return; try { localStorage.removeItem(SKEY); } catch (e) { /* 무시 */ } }

export const MAPS = [
  ['classroom', '교실'], ['group_room', '모둠 교실'], ['quiz_plaza', '퀴즈 광장'], ['ox_arena', 'OX 퀴즈 경기장'],
  ['playground', '놀이터'], ['field', '학교 운동장'], ['escape_school', '학교 방탈출']
];
export const mapName = (id) => (MAPS.find((m) => m[0] === id) || [id, '교실'])[1];
export const WAIT_MAP = 'playground';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const safeUrl = (u) => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';
export const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

export function errText(e) {
  const c = (e && e.code) || '';
  if (/permission/i.test(c)) return '권한이 없어요. 다시 들어와 주세요.';
  if (/unavailable|network/i.test(c)) return '인터넷 연결이 끊겼어요. 잠시 뒤에 다시 해 주세요.';
  if (/wrong-password|invalid-credential|user-not-found|invalid-email/.test(c)) return '이메일이나 비밀번호가 맞지 않아요.';
  if (/too-many-requests/.test(c)) return '여러 번 틀렸어요. 잠시 뒤에 다시 해 주세요.';
  if (/email-already-in-use/.test(c)) return '이미 가입한 이메일이에요. 로그인해 주세요.';
  if (/weak-password/.test(c)) return '비밀번호는 6자 넘게 써 주세요.';
  if (/admin-restricted|operation-not-allowed/.test(c)) return '익명 로그인이 꺼져 있어요. 선생님께 알려 주세요.';
  return '잘 안 됐어요. 잠시 뒤에 다시 해 주세요.' + (c ? ' (' + c + ')' : '');
}

// 미리보기 띠 (선생님 화면·패들렛 관리·진행판 안 교실 화면에는 안 보임)
if (PREVIEW && !/(teacher|padlet)\.html$/.test(location.pathname) && !new URLSearchParams(location.search).get('teach') && window.self === window.top) { // 안에 넣어 보이는 패들렛(iframe)에는 띠를 또 달지 않음
  const bar = document.createElement('div'); bar.className = 'pv-bar'; bar.setAttribute('role', 'note');
  bar.innerHTML = '<b>👀 학생 화면 미리보기</b><span>' + esc(PREVIEW.className) + ' 학생에게 이렇게 보여요 · 점수·글·채팅은 남지 않아요</span><a class="pv-back" href="teacher.html#live-' + encodeURIComponent(PREVIEW.cid) + '">선생님 화면으로 ◀</a>';
  bar.querySelector('a').addEventListener('click', () => endPreview());
  document.body.prepend(bar);
}
export const previewToast = () => toast('미리보기에서는 남기지 않아요 (학생 화면에서는 돼요)');

// 진행 상태(live/반/state)를 받되, 다 같이 하는 미니 게임 화면 자료(gm: 1초에 여러 번 바뀜)는 빼고 알려 준다
export function onLiveState(base, cb, err) {
  const r = ref(rt, base + '/state'), cur = {};
  let ready = false, pend = false;
  const fire = () => { if (!ready || pend) return; pend = true; queueMicrotask(() => { pend = false; cb(Object.assign({}, cur)); }); };
  const put = (s) => { if (s.key === 'gm') return; cur[s.key] = s.val(); fire(); };
  const offs = [onChildAdded(r, put, err), onChildChanged(r, put, err), onChildRemoved(r, (s) => { if (s.key === 'gm') return; delete cur[s.key]; fire(); }, err)];
  offs.push(onValue(r, () => { ready = true; fire(); }, err, { onlyOnce: true }));
  return () => offs.forEach((f) => { try { f(); } catch (e) { /* 무시 */ } });
}

export function toast(msg, bad) {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.append(box); }
  const s = document.createElement('div'); s.className = 'toast' + (bad ? ' bad' : ''); s.textContent = msg; box.append(s);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => s.remove(), bad ? 5000 : 2600);
}

/* ---------- 선생님 계정: 한 곳에서만 로그인 ----------
 * 선생님이 로그인하면 이 기기에 자리표(sid)를 만들어 config/sess_{uid} 에 적는다.
 * 다른 컴퓨터에서 같은 계정으로 로그인하면 자리표가 새것으로 바뀌고,
 * 예전 컴퓨터는 바뀐 자리표를 보고 스스로 로그아웃한 뒤 선생님 로그인 화면으로 간다.
 * 같은 컴퓨터의 여러 탭은 자리표를 함께 쓰므로 서로 밀어내지 않는다.
 * 자리표를 적지 못하는 계정(보안 규칙이 막는 경우)은 이 기능 없이 예전처럼 쓴다. */
const SEAT_KEY = 'moaTeacherSeat';
let claiming = false, seatMem = '', seatOff = null, leaving = false;
const seatRef = (uid) => doc(fs, 'config', 'sess_' + uid);
const mySeat = () => { try { return localStorage.getItem(SEAT_KEY) || seatMem; } catch (e) { return seatMem; } };
function forgetSeat() { seatMem = ''; try { localStorage.removeItem(SEAT_KEY); } catch (e) { /* 무시 */ } }
async function claimSeat(u) {
  const sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  seatMem = sid;
  try { localStorage.setItem(SEAT_KEY, sid); } catch (e) { /* 이 탭에서만 기억 */ }
  try { await setDoc(seatRef(u.uid), { sid, at: serverTimestamp() }, { merge: true }); } catch (e) { /* 자리표를 못 적으면 이 기능만 꺼짐 */ }
}
async function leaveSeat() {
  if (leaving) return;
  leaving = true;
  forgetSeat();
  try { await signOut(auth); } catch (e) { /* 무시 */ }
  location.href = SITE + 'teacher.html?out=other';
}
onAuthStateChanged(auth, (u) => {
  if (seatOff) { seatOff(); seatOff = null; }
  if (!isTeacher(u)) return;
  seatOff = onSnapshot(seatRef(u.uid), (s) => {
    if (claiming || leaving) return;
    const d = s.exists() ? s.data() : null, mine = mySeat();
    if (!d || !d.sid) { if (!s.metadata.fromCache) { claiming = true; claimSeat(u).finally(() => { claiming = false; }); } return; }
    if (d.sid !== mine && !s.metadata.fromCache) leaveSeat();
  }, () => { /* 읽지 못하면 이 기능만 꺼짐 */ });
});

export {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, onSnapshot, serverTimestamp, writeBatch, increment, limit, Bytes,
  ref, set, update, remove, push, onValue, onChildAdded, onChildChanged, onChildRemoved, onDisconnect, rquery, limitToLast, rnow, rget
};
