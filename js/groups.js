/* 교실(클래스)·패들렛 나눠 보기
   - 분류(반 종류 kind): 선생님이 직접 정함 (처음에는 정규반·특강반). 순서·이름은 js/kinds.js 가 불러와 setKindOrder 로 알려 줌
   - 그 안에서 선생님이 정한 묶음(grp: 예 '월요일반', '동광초', '1학기')으로 한 번 더 나눔
   - 머리를 누르면 접고 펴기 (이 컴퓨터에 기억) */
export const KINDS = [['정규반', '정규 교실'], ['특강반', '특강 교실']];
export const DEF_KINDS = KINDS.map((k) => k[0]);
export const cleanKind = (s) => String(s || '').replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
/** 교실의 분류 (적혀 있지 않으면 예전처럼 정규반) */
export const kindOf = (c) => cleanKind(c && c.kind) || '정규반';
let ORDER = DEF_KINDS.slice();
/** 선생님이 정한 분류 순서 (빈 목록이면 처음 값) */
export function setKindOrder(list) { const l = [...new Set((list || []).map(cleanKind).filter(Boolean))]; ORDER = l.length ? l : DEF_KINDS.slice(); }
/** 정한 분류 + 교실에 적혀 있는데 목록에 없는 분류(뒤에) */
export function kindOrder(cs) { const extra = [...new Set((cs || []).map(kindOf))].filter((k) => !ORDER.includes(k)).sort((a, b) => a.localeCompare(b, 'ko')); return ORDER.concat(extra); }
export const cleanGrp = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 20);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 묶음 이름 가나다순, 묶음 없는 것은 맨 뒤 → [{ name, list }] */
export function groupBy(list, getGrp) {
  const m = new Map();
  for (const x of list) { const g = cleanGrp(getGrp(x)); if (!m.has(g)) m.set(g, []); m.get(g).push(x); }
  const named = [...m.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko'));
  return named.map((n) => ({ name: n, list: m.get(n) })).concat(m.has('') ? [{ name: '', list: m.get('') }] : []);
}
/** 반 목록 → 종류별 칸 [{ kind, label, list, groups }] (빈 종류는 뺌) */
export function classSections(cs, labels) {
  return kindOrder(cs).map((k) => ({ kind: k, label: (labels && labels[k]) || k, list: cs.filter((c) => kindOf(c) === k) })) // 칸 이름 = 선생님이 정한 분류 이름 그대로
    .filter((s) => s.list.length).map((s) => Object.assign(s, { groups: groupBy(s.list, (c) => c.grp) }));
}
/** 이미 쓰고 있는 묶음 이름들 */
export const grpNames = (list) => [...new Set(list.map((x) => cleanGrp(x.grp)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));

const FK = 'moa_fold';
export function folded(k) { try { return (JSON.parse(localStorage.getItem(FK) || '[]') || []).includes(k); } catch { return false; } }
export function toggleFold(k) {
  try { const a = JSON.parse(localStorage.getItem(FK) || '[]') || []; const i = a.indexOf(k); if (i >= 0) a.splice(i, 1); else a.push(k); localStorage.setItem(FK, JSON.stringify(a.slice(-100))); } catch { /* 기억 못 해도 그냥 넘어감 */ }
}
const head = (cls, key, label, n, f) => '<button type="button" class="' + cls + '" data-fold="' + esc(key) + '" aria-expanded="' + !f + '"><i aria-hidden="true">' + (f ? '▸' : '▾') + '</i>' + label + '<small>' + n + '</small></button>';

/** 종류 → 묶음 → 카드 HTML. first: 맨 위 카드(＋ 만들기 등), pre: 접기 기억 이름 앞말 */
export function sectionsHTML(secs, card, first, pre) {
  // ＋ 만들기 같은 첫 카드는 어느 칸에도 속하지 않게 맨 위에 따로
  let h = first ? '<div class="dk-grid">' + first + '</div>' : '';
  for (const s of secs) {
    const fk = pre + 'k:' + s.kind, f = folded(fk);
    h += '<section class="dk-sec">' + head('dk-sech', fk, esc(s.label), s.list.length, f);
    if (!f) for (const g of s.groups) {
      const gk = pre + 'g:' + s.kind + '/' + g.name, showHead = !!g.name || s.groups.length > 1, gf = showHead && folded(gk);
      if (showHead) h += head('dk-subh', gk, '📁 ' + esc(g.name || '묶음 없음'), g.list.length, gf);
      if (!gf) h += '<div class="dk-grid">' + g.list.map(card).join('') + '</div>';
    }
    h += '</section>';
  }
  return h;
}
/** 묶음 고르기 칸: 입력 + 이미 있는 묶음 단추 */
export function grpField(id, value, names, label) {
  return '<div class="grpf"><label class="lb">' + esc(label || '묶음 (같은 종류 안에서 한 번 더 나눠 보기)') + '<input class="field" id="' + id + '" maxlength="20" autocomplete="off" value="' + esc(value || '') + '" placeholder="예: 월요일반, 동광초, 1학기 — 안 써도 돼요"></label>' +
    (names.length ? '<div class="grpchips" data-for="' + id + '">' + names.map((n) => '<button type="button" class="grpchip" data-g="' + esc(n) + '">📁 ' + esc(n) + '</button>').join('') + '<button type="button" class="grpchip" data-g="">✕ 묶음 빼기</button></div>' : '') + '</div>';
}
// 묶음 단추를 누르면 입력 칸에 넣음 (어느 화면이든)
document.addEventListener('click', (e) => {
  const b = e.target.closest('.grpchip'); if (!b) return;
  const box = b.closest('.grpchips'), inp = box && document.getElementById(box.dataset.for);
  if (inp) { inp.value = b.dataset.g; inp.focus(); }
});
