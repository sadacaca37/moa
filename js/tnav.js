/* 선생님 위 메뉴 — 선생님이 보는 모든 화면 맨 위에 똑같이, 내려도 위에 붙어 있게 (2026-11-27 선생님 요청)
   차례는 선생님 화면(teacher.html)과 같음: 교실 → 내 모아보드 → 퀴즈 보관함 → 미니 게임 → 출석·문자 → 첫 화면 꾸미기 → 선생님 관리 → 로그아웃
   (teacher.html 은 자기 머리 띠에 같은 단추가 있음. 단추를 바꾸면 두 곳을 같이 고쳐요) */
import { logout } from './fb.js';

export const NAV = [
  ['classes', 'teacher.html#classes', '🏫 교실'],
  ['pad', 'padlet.html', '📋 내 모아보드'],
  ['quiz', 'teacher.html#quiz', '📚 퀴즈 보관함'],
  ['games', 'games.html', '🎮 미니 게임'],
  ['sms', 'sms.html', '📱 출석·문자', 'admin'],
  ['home', 'teacher.html#home', '🏠 첫 화면 꾸미기'],
  ['team', 'teacher.html#team', '👥 선생님 관리', 'admin'],
];
const CSS = `
.tnav-top{position:sticky;top:0;z-index:9;display:flex;align-items:center;gap:10px 12px;flex-wrap:wrap;margin:0;background:rgba(255,255,255,.96);border-bottom:1px solid rgba(16,24,40,.12);box-shadow:0 1px 6px rgba(16,24,40,.08);padding:6px clamp(12px,2vw,24px);font-family:'Noto Sans KR',sans-serif}
.tnav-top .tn-brand{display:flex;gap:4px;flex:none}
.tnav-top .tn-brand img{display:block;width:34px;height:34px}
.tnav-top nav{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
.tnav-top nav a,.tnav-top nav button{display:inline-flex;align-items:center;gap:4px;min-height:36px;padding:0 12px;border:1px solid #CDD2DC;border-radius:10px;background:#fff;font:700 14px/1 'Noto Sans KR',sans-serif;color:#1D2030;text-decoration:none;cursor:pointer;box-sizing:border-box;box-shadow:none;margin:0}
.tnav-top nav a:hover,.tnav-top nav button:hover{background:#F2F4F7}
.tnav-top nav [aria-current=page]{background:#1D2030;border-color:#1D2030;color:#fff}
.tnav-top nav a:focus-visible,.tnav-top nav button:focus-visible{outline:3px solid #3A6FF2;outline-offset:2px}
@media (max-width:760px){
  .tnav-top{flex-wrap:nowrap;gap:8px;padding:6px 10px}
  .tnav-top .tn-brand img{width:30px;height:30px}
  .tnav-top nav{flex:1;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .tnav-top nav::-webkit-scrollbar{display:none}
  .tnav-top nav a,.tnav-top nav button{flex:none;white-space:nowrap}
}
@media print{.tnav-top{display:none!important}}`;

/** cur: 지금 화면 (NAV 첫 칸), admin: 주 선생님이면 출석·문자·선생님 관리도, before: 이 요소 앞에 붙임 (없으면 맨 위) */
export function mountTopNav(cur, { admin = false, before = null } = {}) {
  if (!document.getElementById('tnavCss')) { const s = document.createElement('style'); s.id = 'tnavCss'; s.textContent = CSS; document.head.append(s); }
  let h = document.getElementById('tnav');
  if (!h) {
    h = document.createElement('div'); h.id = 'tnav'; h.className = 'tnav-top'; h.setAttribute('role', 'banner');
    document.body.insertBefore(h, before || document.body.firstChild);
    // 아래에 붙는 다른 머리 띠가 이 메뉴 밑에 오게 (--tnav-h)
    const fit = () => document.documentElement.style.setProperty('--tnav-h', h.offsetHeight + 'px');
    if (window.ResizeObserver) new ResizeObserver(fit).observe(h); else addEventListener('resize', fit);
    fit();
  }
  h.innerHTML = '<span class="tn-brand"><a href="taja/" title="타자팡으로 가기"><img src="assets/brand/tajapang.webp" alt="타자팡" draggable="false"></a><a href="./" title="모아팡 첫 화면"><img src="assets/brand/moapang.webp" alt="모아팡" draggable="false"></a></span>' +
    '<nav aria-label="선생님 메뉴">' + NAV.filter((x) => !x[3] || admin).map(([k, href, t]) => '<a href="' + href + '"' + (k === cur ? ' aria-current="page"' : '') + '>' + t + '</a>').join('') +
    '<button type="button" data-tnav-out>로그아웃</button></nav>';
  h.querySelector('[data-tnav-out]').addEventListener('click', async () => { try { await logout(); } catch (e) { /* 그래도 첫 화면으로 */ } location.href = './'; });
  const on = h.querySelector('[aria-current=page]'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  return h;
}
