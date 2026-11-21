// 모아팡 Firebase 연결 (모든 화면이 함께 씀)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, onSnapshot, serverTimestamp, writeBatch, increment } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
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
export async function teacherLogin(email, pw) { return (await signInWithEmailAndPassword(auth, email, pw)).user; }
export async function logout() { await signOut(auth); }
// 비밀번호를 잊었을 때: 선생님 메일로 새 비밀번호 만드는 링크를 보낸다
export async function resetPassword(email) { await sendPasswordResetEmail(auth, email); }

// 학생 이름 → 문서 이름 (같은 반에서 같은 이름이면 같은 학생)
export function nameKey(name) {
  const n = String(name || '').normalize('NFC').replace(/\s+/g, '').toLowerCase();
  return 'n_' + Array.from(n).map((ch) => /[0-9a-z가-힣]/.test(ch) ? ch : '_' + ch.codePointAt(0).toString(16)).join('').slice(0, 120);
}
export const cleanName = (s) => String(s || '').normalize('NFC').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 10);

// 이 기기에 남기는 입장 정보
const SKEY = 'moa_session';
export function getSession() { try { const s = JSON.parse(localStorage.getItem(SKEY)); return s && s.cid && s.name ? s : null; } catch (e) { return null; } }
export function setSession(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) { /* 저장 못 해도 계속 */ } }
export function clearSession() { try { localStorage.removeItem(SKEY); } catch (e) { /* 무시 */ } }

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
  if (/admin-restricted|operation-not-allowed/.test(c)) return '익명 로그인이 꺼져 있어요. 선생님께 알려 주세요.';
  return '잘 안 됐어요. 잠시 뒤에 다시 해 주세요.' + (c ? ' (' + c + ')' : '');
}

export function toast(msg, bad) {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.append(box); }
  const s = document.createElement('div'); s.className = 'toast' + (bad ? ' bad' : ''); s.textContent = msg; box.append(s);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => s.remove(), bad ? 5000 : 2600);
}

export {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, onSnapshot, serverTimestamp, writeBatch, increment,
  ref, set, update, remove, push, onValue, onChildAdded, onChildChanged, onChildRemoved, onDisconnect, rquery, limitToLast, rnow, rget
};
