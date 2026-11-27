/* 🏷 교실 분류 — 선생님이 직접 정하는 반 종류 (처음에는 정규반 · 특강반)
   - 저장: banks/kinds (주 선생님) · banks/{uid}_kinds (함께 쓰는 선생님) → { list: [분류 이름…], at }
   - 교실 문서의 kind 에 분류 이름을 적음. 분류 이름을 바꾸거나 지우면 그 분류의 교실도 같이 바꿈
   - 선생님 화면(교실)과 내 모아보드가 같이 씀 */
import { fs, doc, setDoc, onSnapshot, bankId, esc } from './fb.js';
import { setKindOrder, kindOrder, kindOf, cleanKind } from './groups.js';

export const MAX_KINDS = 12;
const refOf = (owner) => doc(fs, 'banks', bankId(owner, 'kinds'));

/** 저장된 분류 목록을 받아 groups.js 순서에 알려 줌 (바뀔 때마다 cb) */
export function watchKinds(owner, cb) {
  return onSnapshot(refOf(owner), (s) => {
    setKindOrder(s.exists() && Array.isArray(s.data().list) ? s.data().list : []);
    if (cb) cb();
  }, () => { if (cb) cb(); });
}
async function saveList(owner, list) {
  const l = [...new Set(list.map(cleanKind).filter(Boolean))].slice(0, MAX_KINDS);
  await setDoc(refOf(owner), { list: l, at: Date.now() });
  setKindOrder(l);
}

/* ---------- 교실 만들기·고치기 창: 분류 고르기 + '＋ 새 분류' ---------- */
/** cls: 그 화면의 단추 모양 (선생님 화면 'btn sm', 모아보드 'chip') */
export function kindPickHTML(cur, cs, cls) {
  const ks = kindOrder(cs); if (cur && !ks.includes(cur)) ks.push(cur);
  return '<div class="seg" id="kPick" role="group" aria-label="분류">' + ks.map((k) => '<button type="button" class="' + cls + '" data-k="' + esc(k) + '" aria-pressed="' + (k === cur) + '">' + esc(k) + '</button>').join('') +
    (ks.length < MAX_KINDS ? '<button type="button" class="' + cls + '" data-knew aria-pressed="false">＋ 새 분류</button>' : '') + '</div>' +
    '<input class="field" id="kNew" maxlength="12" autocomplete="off" placeholder="새 분류 이름 (예: 월요일반, 동광초, 1학기)" hidden>';
}
export function bindKindPick(onPick) {
  const box = document.getElementById('kPick'), inp = document.getElementById('kNew'); if (!box) return;
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k],[data-knew]'); if (!b) return;
    e.stopPropagation();
    box.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (b.hasAttribute('data-knew')) { inp.hidden = false; inp.focus(); } else { inp.hidden = true; onPick(b.dataset.k); }
  });
}
/** 저장할 때: '＋ 새 분류'에 이름을 썼으면 목록에 더하고 그 이름, 아니면 고른 분류 */
export async function pickedKind(owner, chosen, cs) {
  const inp = document.getElementById('kNew');
  if (inp && !inp.hidden) {
    const k = cleanKind(inp.value); if (!k) return '';
    const cur = kindOrder(cs); if (!cur.includes(k)) await saveList(owner, cur.concat(k));
    return k;
  }
  return cleanKind(chosen) || kindOrder(cs)[0];
}

/* ---------- 🏷 분류 정하기 창: 더하기 · 이름 바꾸기 · 순서 · 지우기(교실은 다른 분류로 옮김) ----------
   o = { owner, classes, trash, openDlg, closeDlg, toast, errText, titleId } */
export function kindsDlg(o) {
  const cs = o.classes || [], all = cs.concat(o.trash || []);
  const count = (k) => cs.filter((c) => kindOf(c) === k).length;
  const rows = kindOrder(cs).map((k) => ({ orig: k, name: k, del: false, to: null }));
  const live = () => rows.filter((r) => !r.del);
  const html = () => '<div class="row" style="justify-content:space-between;align-items:center"><h2 id="' + (o.titleId || 'dlgT') + '">🏷 교실 분류 정하기</h2><button type="button" class="btn sm" id="kdX">닫기 ✕</button></div>' +
    '<p style="margin:0;font-size:14px;color:#4B4F6B">교실을 나눠 볼 분류를 직접 정해요. 예: 정규반 · 특강반 · 월요일반 · 동광초. 이름을 바꾸면 그 분류의 교실도 같이 바뀌어요. ▲▼로 보이는 순서를 바꿔요.</p>' +
    '<ul id="kdL" style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow:auto">' + rows.map((r, i) => {
      const n = r.orig ? count(r.orig) : 0;
      if (r.del) {
        const others = live();
        return '<li data-i="' + i + '" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px;border:1px dashed #E0A39A;border-radius:10px;background:#FFF4F2"><s style="font-weight:700">' + esc(r.name) + '</s>' +
          (n ? '<span style="font-size:14px">교실 ' + n + '개는</span><select class="field" data-to style="width:auto;min-width:120px">' + others.map((x) => '<option value="' + rows.indexOf(x) + '"' + (x === r.to ? ' selected' : '') + '>' + esc(x.name || '(이름 없음)') + '</option>').join('') + '</select><span style="font-size:14px">(으)로 옮기고 지워요</span>' : '<span style="font-size:14px">지워요</span>') +
          '<button type="button" class="btn sm" data-undo style="margin-left:auto">↩ 되돌리기</button></li>';
      }
      return '<li data-i="' + i + '" style="display:flex;gap:6px;align-items:center;padding:6px 8px;border:1px solid #E3E6EC;border-radius:10px;background:#fff">' +
        '<button type="button" class="btn sm" data-up aria-label="위로"' + (i === 0 ? ' disabled' : '') + '>▲</button><button type="button" class="btn sm" data-dn aria-label="아래로"' + (i === rows.length - 1 ? ' disabled' : '') + '>▼</button>' +
        '<input class="field" data-nm maxlength="12" value="' + esc(r.name) + '" aria-label="분류 이름" style="flex:1;min-width:0">' +
        '<small style="white-space:nowrap;color:#4B4F6B">교실 ' + n + '개</small>' +
        '<button type="button" class="btn sm" data-del aria-label="' + esc(r.name) + ' 분류 지우기" title="분류 지우기">🗑</button></li>';
    }).join('') + '</ul>' +
    (rows.length < MAX_KINDS ? '<div class="row" style="flex-wrap:nowrap"><input class="field" id="kdNew" maxlength="12" autocomplete="off" placeholder="새 분류 이름 (예: 월요일반)" style="flex:1;min-width:0"><button type="button" class="btn sm" id="kdAdd">＋ 분류 더하기</button></div>' : '<p style="margin:0;font-size:13px;color:#4B4F6B">분류는 ' + MAX_KINDS + '개까지 만들 수 있어요.</p>') +
    '<p id="kdMsg" role="alert" style="margin:0;color:#B3261E;font-weight:700;font-size:14px"></p>' +
    '<div class="row"><button type="button" class="btn blue" id="kdSave">저장하기 ▶</button><button type="button" class="btn" id="kdNo">그만두기</button></div>';
  const keepNames = () => document.querySelectorAll('#kdL [data-nm]').forEach((x) => { const r = rows[+x.closest('li').dataset.i]; if (r) r.name = x.value; });
  const draw = (focus) => { o.openDlg(html(), focus || '#kdNew'); bind(); };
  function bind() {
    const $ = (id) => document.getElementById(id);
    $('kdX').onclick = $('kdNo').onclick = () => o.closeDlg();
    if ($('kdAdd')) {
      const add = () => { keepNames(); const k = cleanKind($('kdNew').value); if (!k) { $('kdNew').focus(); return; } if (rows.some((r) => !r.del && cleanKind(r.name) === k)) { $('kdMsg').textContent = '\'' + k + '\'은(는) 이미 있어요.'; return; } rows.push({ orig: null, name: k, del: false, to: null }); draw(); };
      $('kdAdd').onclick = add;
      $('kdNew').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
    }
    $('kdL').onclick = (e) => {
      const li = e.target.closest('li[data-i]'); if (!li) return;
      const i = +li.dataset.i, r = rows[i];
      if (e.target.closest('[data-up]') && i > 0) { keepNames(); rows.splice(i - 1, 0, rows.splice(i, 1)[0]); draw('#kdL li[data-i="' + (i - 1) + '"] [data-up]'); }
      else if (e.target.closest('[data-dn]') && i < rows.length - 1) { keepNames(); rows.splice(i + 1, 0, rows.splice(i, 1)[0]); draw('#kdL li[data-i="' + (i + 1) + '"] [data-dn]'); }
      else if (e.target.closest('[data-del]')) {
        keepNames();
        if (live().length <= 1) { $('kdMsg').textContent = '분류는 하나는 있어야 해요.'; return; }
        r.del = true; r.to = live()[0]; draw(); // 옮길 분류는 줄 자체를 기억 (순서를 바꿔도 그대로)
      } else if (e.target.closest('[data-undo]')) { keepNames(); r.del = false; draw(); }
    };
    $('kdL').onchange = (e) => { const s = e.target.closest('[data-to]'); if (s) rows[+s.closest('li').dataset.i].to = rows[+s.value]; };
    $('kdSave').onclick = async () => {
      keepNames();
      const keep = live(), names = keep.map((r) => cleanKind(r.name));
      if (names.some((n) => !n)) { $('kdMsg').textContent = '이름이 빈 분류가 있어요.'; return; }
      if (new Set(names).size !== names.length) { $('kdMsg').textContent = '같은 이름의 분류가 두 개 있어요.'; return; }
      // 옛 이름 → 새 이름 (이름 바꾸기 · 지운 분류는 옮길 분류로)
      const map = {};
      for (const r of keep) if (r.orig && r.orig !== cleanKind(r.name)) map[r.orig] = cleanKind(r.name);
      for (const r of rows) if (r.del && r.orig) { const t = r.to; map[r.orig] = t && !t.del ? cleanKind(t.name) : names[0]; }
      $('kdSave').disabled = true; $('kdSave').textContent = '저장하는 중…';
      try {
        for (const c of all) { const k = kindOf(c), to = map[k]; if (to && to !== c.kind) await setDoc(doc(fs, 'classes', c.id), { kind: to }, { merge: true }); }
        await saveList(o.owner, names);
        o.closeDlg(); o.toast('교실 분류를 저장했어요.');
        if (o.onDone) o.onDone();
      } catch (err) { $('kdSave').disabled = false; $('kdSave').textContent = '저장하기 ▶'; $('kdMsg').textContent = o.errText ? o.errText(err) : String(err.message || err); }
    };
  }
  draw('#kdNew');
}
