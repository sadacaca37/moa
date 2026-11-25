/* 모아팡 공통 장면 — 첫 화면과 같게: 하늘·풀밭 배경, 땅 위를 걷는 친구들(공룡 옷 아이 · 분홍 머리 아이 · 갈색 옷 아이),
   땅 띠, 오른쪽 아래 만든 사람. <script src="js/scene.js" defer></script> 한 줄로 붙인다.
   패들렛을 다른 화면 안에 넣어 보일 때(?embed=1)는 붙이지 않는다(바깥 화면 배경이 비쳐 보임). */
(() => {
  const b = document.body;
  if (!b || b.classList.contains('embed') || new URLSearchParams(location.search).get('embed') === '1') return;
  b.classList.remove('tpage');
  b.classList.add('scene');
  const add = (html) => b.insertAdjacentHTML('beforeend', html);
  if (!document.querySelector('.walkers')) add('<div class="walkers" aria-hidden="true"></div>');
  if (!document.querySelector('.ground')) add('<div class="ground" aria-hidden="true"></div>');
  let ft = document.querySelector('body > footer');
  if (!ft) { add('<footer><span class="studio">© 2026 MOAPANG STUDIO · All rights reserved</span><span>Created by Eunkyung Kim</span><a href="mailto:sadacaca@naver.com">sadacaca@naver.com</a></footer>'); ft = document.querySelector('body > footer'); }
  ft.classList.add('mfoot');

  // 걷는 친구들 (걷는 그림 30장)
  const box = document.querySelector('.walkers');
  if (!box || box.childElementCount) return;
  const base = new URL('../assets/walk/', document.currentScript ? document.currentScript.src : location.href).href;
  const H = 100, N = 30, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kinds = [['dino', 90, 158], ['girl', 103, 163], ['boy', 79, 157]];
  const list = kinds.map(([n, fw, fh], i) => {
    const w = Math.round(fw * H / fh);
    const el = document.createElement('span');
    el.style.cssText = 'width:' + w + 'px;background-image:url(' + base + n + '.webp);background-size:' + (w * N) + 'px ' + H + 'px';
    box.append(el);
    return { el, w, x: innerWidth * (0.2 + 0.3 * i), v: (i % 2 ? -1 : 1) * (40 + i * 9), f: i * 7 };
  });
  const place = (a) => { a.el.style.transform = 'translateX(' + a.x.toFixed(1) + 'px)' + (a.v < 0 ? ' scaleX(-1)' : ''); };
  if (still) { list.forEach(place); return; }
  let last = performance.now(), t = 0;
  (function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const W = innerWidth;
    for (const a of list) {
      a.x += a.v * dt;
      if (a.x > W - a.w - 10) a.v = -Math.abs(a.v);
      if (a.x < 10) a.v = Math.abs(a.v);
      place(a);
      a.el.style.backgroundPosition = (-((Math.floor(t / 0.1) + a.f) % N) * a.w) + 'px 0';
    }
    requestAnimationFrame(step);
  })(last);
})();

/* 카드 ⋮ 메뉴 (내 패들렛·우리 반 목록): 누르면 펼치고, 바깥을 누르거나 Esc를 누르면 접음 */
(() => {
  const closeAll = (keep) => document.querySelectorAll('.dk-menu:not([hidden])').forEach((m) => { if (m === keep) return; m.hidden = true; const b = m.previousElementSibling; if (b) b.setAttribute('aria-expanded', 'false'); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.dk-dots');
    if (b) { e.preventDefault(); const m = b.nextElementSibling; closeAll(m); m.hidden = !m.hidden; b.setAttribute('aria-expanded', String(!m.hidden)); if (!m.hidden) { const f = m.querySelector('button,a'); if (f) f.focus(); } return; }
    closeAll();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('.dk-menu:not([hidden])')) { closeAll(); } });
})();
