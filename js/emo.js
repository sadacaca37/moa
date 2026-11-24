/* 모아팡 이모티콘 100개 (그림: 제미나이, 한 장 그림 assets/emo/emo.webp, 10×10칸, 한 칸 96px)
   글 안에서는 ':e12:' 같은 표시로 저장하고, 보여 줄 때 그림으로 바꾼다.
   - 패들렛: 반응·댓글·글 내용 / 가상 교실 채팅 / 미니 게임 말풍선 */
export const EMO_SRC = new URL('../assets/emo/emo.webp', import.meta.url).href;
export const EMO_N = 100, EMO_PX = 96;
export const EMO_CHARS = [['moa', '모아', 0, 16], ['pop', '팡팡이', 16, 14], ['star', '반짝이', 30, 15], ['dog', '몽이', 45, 15], ['frog', '폴짝이', 60, 15], ['peng', '뒤뚱이', 75, 14], ['mouse', '딸깍이', 89, 11]];
export const EMO_NAMES = ["활짝", "엄지 척", "하트 꼭", "하트 눈", "깜짝", "글썽", "엉엉", "부글부글", "쿨쿨", "갸웃", "아하!", "안녕", "고마워", "브이", "부끄", "최고", "엄지 척", "하트 꼭", "하트 눈", "깜짝", "훌쩍", "엉엉", "팡 터짐", "쿨쿨", "갸웃", "아하!", "안녕", "브이", "응원", "최고", "하트 꼭", "하트 눈", "깜짝", "엉엉", "씩씩", "최고", "윙크", "메롱", "당황", "책 읽기", "쓰기", "O X", "트로피", "축하", "힘내", "반가워", "하트 뿅", "침 질질", "어이없음", "영혼 가출", "동공지진", "썩소", "발라당", "불태움", "째릿", "멘붕", "콧물 풍선", "데굴데굴", "쭈뼛", "잘 자", "OK", "메롱", "뻗음", "볼 빵빵", "녹아내림", "꽁꽁", "납작", "꽈당", "띵~", "헉", "해탈", "덜덜", "눈물 콧물", "뚱", "룰루랄라", "감동", "냠냠", "슝~", "얼음", "화났어", "멘붕", "기절", "빼꼼", "삐짐", "안 볼래", "빵 터짐", "꾸벅꾸벅", "저요!", "쭈구리", "딸깍", "엄지 척", "컴퓨터", "타닥타닥", "저장!", "렉 걸림", "오류!", "어이없음", "영혼 가출", "썩소", "금메달"];

export const okEmo = (i) => Number.isInteger(i) && i >= 0 && i < EMO_N;
export function emoChar(i) { return EMO_CHARS.find((c) => i >= c[2] && i < c[2] + c[3]) || EMO_CHARS[0]; }
export function emoName(i) { return okEmo(i) ? emoChar(i)[1] + ' · ' + EMO_NAMES[i] : ''; }
export const emoTok = (i) => ':e' + i + ':';
const ONE = /^\s*:e(\d{1,2}):\s*$/, ALL = /:e(\d{1,2}):/g;
/** 글 전체가 이모티콘 하나면 번호, 아니면 -1 */
export function emoOnly(s) { const m = ONE.exec(String(s || '')); return m && okEmo(+m[1]) ? +m[1] : -1; }
export function hasEmo(s) { ALL.lastIndex = 0; return ALL.test(String(s || '')); }
/** 미리보기·알림용: ':e12:' → '[모아 · 아하!]' */
export function emoPlain(s) { return String(s || '').replace(ALL, (t, n) => okEmo(+n) ? '[' + emoName(+n) + ']' : t); }

/** 이모티콘 그림 한 개 (size: '48px', '1.6em' 처럼) */
export function emoHTML(i, size, cls) {
  if (!okEmo(i)) return '';
  ensureCSS();
  return '<span class="mpemo' + (cls ? ' ' + cls : '') + '" role="img" aria-label="' + emoName(i) + '" title="' + emoName(i) + '" style="--s:' + (size || '32px') + ';--x:' + (i % 10) + ';--y:' + Math.floor(i / 10) + '"></span>';
}
/** 이미 이스케이프한 글 안의 ':e12:'를 그림으로 */
export function emoRich(html, size) { return String(html).replace(ALL, (t, n) => okEmo(+n) ? emoHTML(+n, size || '1.7em', 'in') : t); }

/* ---------- 캔버스(가상 교실·게임 말풍선) ---------- */
let IMG = null;
export function emoImg() { if (!IMG) { IMG = new Image(); IMG.src = EMO_SRC; } return IMG; }
/** (x, bottom) 위에 이모티콘 말풍선. 그렸으면 true */
export function drawEmoBubble(g, i, x, bottom, size, ui, alpha, minX, maxX) {
  const im = emoImg(); if (!okEmo(i) || !im.complete || !im.naturalWidth) return false;
  const pad = 4 * ui, w = size + pad * 2, h = size + pad * 2;
  const bx = Math.max(minX ?? -1e9, Math.min((maxX ?? 1e9) - w, x - w / 2)), by = bottom - h - 7 * ui;
  g.save(); g.globalAlpha = alpha ?? 1;
  g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 2.5 * ui;
  const r = 10 * ui; g.beginPath(); g.moveTo(bx + r, by); g.arcTo(bx + w, by, bx + w, by + h, r); g.arcTo(bx + w, by + h, bx, by + h, r); g.arcTo(bx, by + h, bx, by, r); g.arcTo(bx, by, bx + w, by, r); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - 6 * ui, by + h - 1); g.lineTo(x, by + h + 7 * ui); g.lineTo(x + 6 * ui, by + h - 1); g.fill();
  g.imageSmoothingEnabled = true;
  g.drawImage(im, (i % 10) * EMO_PX, Math.floor(i / 10) * EMO_PX, EMO_PX, EMO_PX, bx + pad, by + pad, size, size);
  g.restore(); return true;
}

/* ---------- 고르는 창 ---------- */
const RKEY = 'moa_emo_recent';
function recent() { try { return (JSON.parse(localStorage.getItem(RKEY) || '[]') || []).filter(okEmo).slice(0, 18); } catch { return []; } }
function addRecent(i) { try { localStorage.setItem(RKEY, JSON.stringify([i].concat(recent().filter((x) => x !== i)).slice(0, 18))); } catch { /* 저장 안 되면 그냥 넘어감 */ } }
let pop = null, popPick = null, popTab = null;
export function closeEmoPicker() { if (pop) { pop.remove(); pop = null; popPick = null; } }
/** anchor 옆에 이모티콘 고르는 창을 연다. onPick(i) */
export function openEmoPicker(anchor, onPick, opt) {
  ensureCSS();
  if (pop && popPick === onPick) { closeEmoPicker(); return; }
  closeEmoPicker();
  popPick = onPick;
  pop = document.createElement('div'); pop.className = 'mpep'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', '이모티콘 고르기');
  const rc = recent();
  if (!popTab) popTab = rc.length ? 'recent' : EMO_CHARS[0][0];
  const tabs = (rc.length ? [['recent', '최근', rc[0]]] : []).concat(EMO_CHARS.map((c) => [c[0], c[1], c[2]]));
  if (!tabs.some((t) => t[0] === popTab)) popTab = tabs[0][0];
  const grid = () => {
    const list = popTab === 'recent' ? recent() : (() => { const c = EMO_CHARS.find((x) => x[0] === popTab); return Array.from({ length: c[3] }, (_, k) => c[2] + k); })();
    return list.map((i) => '<button type="button" class="mpeb" data-emo="' + i + '">' + emoHTML(i, '100%') + '</button>').join('');
  };
  const draw = () => {
    pop.innerHTML = '<div class="mpet" role="tablist">' + tabs.map((t) => '<button type="button" role="tab" aria-selected="' + (t[0] === popTab) + '" data-emtab="' + t[0] + '" title="' + t[1] + '">' + emoHTML(t[2], '30px') + '<b>' + t[1] + '</b></button>').join('') + '</div><div class="mpeg">' + grid() + '</div>';
  };
  draw();
  pop.addEventListener('click', (e) => {
    const t = e.target.closest('[data-emtab]'); if (t) { popTab = t.dataset.emtab; draw(); return; }
    const b = e.target.closest('[data-emo]'); if (!b) return;
    const i = +b.dataset.emo; addRecent(i); const f = popPick;
    if (!(opt && opt.keep)) closeEmoPicker();
    if (f) f(i);
  });
  document.body.append(pop);
  place(anchor);
  return pop;
}
function place(anchor) {
  if (!pop) return;
  const r = anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, vw = innerWidth, vh = innerHeight;
  let x = Math.min(Math.max(8, r.left), vw - w - 8), y = r.top - h - 6;
  if (y < 8) y = Math.min(vh - h - 8, r.bottom + 6);
  pop.style.left = x + 'px'; pop.style.top = Math.max(8, y) + 'px';
}
document.addEventListener('pointerdown', (e) => { if (pop && !pop.contains(e.target) && !e.target.closest('[data-emopen]')) closeEmoPicker(); }, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pop) { closeEmoPicker(); } });
addEventListener('resize', closeEmoPicker);

let cssDone = false;
function ensureCSS() {
  if (cssDone) return; cssDone = true;
  const st = document.createElement('style');
  st.textContent = `
.mpemo{display:inline-block;flex:none;width:var(--s);height:var(--s);background:url("${EMO_SRC}") no-repeat;background-size:calc(var(--s)*10) calc(var(--s)*10);background-position:calc(var(--s)*var(--x)*-1) calc(var(--s)*var(--y)*-1);vertical-align:middle}
.mpemo.in{margin:0 .05em;vertical-align:-.45em}
.mpep{position:fixed;z-index:9999;width:min(372px,calc(100vw - 16px));background:#fff;border:3px solid #1b1f3b;box-shadow:4px 4px 0 rgba(27,31,59,.35);font-family:'Noto Sans KR',sans-serif}
.mpet{display:flex;overflow-x:auto;border-bottom:3px solid #1b1f3b;background:#f4f1e8}
.mpet button{flex:none;display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px 6px 3px;border:0;border-right:2px solid #e2ddd0;background:none;cursor:pointer;font:700 11px/1.1 'Noto Sans KR',sans-serif;color:#555}
.mpet button[aria-selected=true]{background:#ffd23f;color:#1b1f3b}
.mpeg{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:2px;padding:6px;max-height:244px;overflow-y:auto}
.mpeb{aspect-ratio:1;border:0;background:none;border-radius:8px;padding:3px;cursor:pointer;display:flex}
.mpeb:hover,.mpeb:focus-visible{background:#fff3a6;outline:2px solid #1b1f3b}
.mpeb .mpemo{width:100%;height:100%;--s:100%;background-size:1000% 1000%;background-position:calc(var(--x)*100%/9) calc(var(--y)*100%/9)}`;
  document.head.append(st);
}
