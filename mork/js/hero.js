/* hero.js — 히어로 시퀀스 스크럽
 * hero-demo-VERIFIED.html 검증 로직을 모듈화.
 *   · 시퀀스: assets/seq/hero/mork-NNNN.jpg 외부 파일 로드 (정방향 그대로, 역재생/재배열 금지)
 *   · lerp 스무딩(0.05) + 인접 프레임 알파 블렌딩
 *   · 진행률(p) 기준 타이포 레이어 토글
 *   · 반응형 캔버스는 CSS(max/min-aspect-ratio)가 담당
 */
(() => {
  const canvas = document.getElementById('c');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;          // 내부 해상도 (900×900)
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 프레임 목록: mork-0001.jpg 부터 끝까지 자동 탐지 (정방향, 개수 하드코딩 X) ----
  const BASE = 'assets/seq/hero/';
  const name = (i) => BASE + 'mork-' + String(i).padStart(4, '0') + '.jpg';

  let FRAMES = [];
  let N = 0;
  const imgs = [];
  let loaded = 0;
  const loadingEl = document.getElementById('loading');

  // 존재 여부 확인 (HEAD — 본문 다운로드 없이 가볍게)
  async function exists(i){
    try { const r = await fetch(name(i), { method: 'HEAD', cache: 'no-store' }); return r.ok; }
    catch { return false; }
  }

  // 마지막 프레임 인덱스 탐지: 지수 탐색 → 이분 탐색 (연속 시퀀스 가정)
  async function discoverCount(){
    if (!(await exists(1))) return 0;
    let lo = 1, hi = 2;
    while (await exists(hi)) { lo = hi; hi *= 2; }   // hi는 없음, lo는 있음
    while (hi - lo > 1){
      const mid = (lo + hi) >> 1;
      if (await exists(mid)) lo = mid; else hi = mid;
    }
    return lo;                                        // = 마지막 존재 프레임 수
  }

  async function pre(){
    N = await discoverCount();
    if (N === 0){ console.error('[hero] 프레임을 찾을 수 없습니다:', name(1)); return; }
    FRAMES = Array.from({ length: N }, (_, k) => name(k + 1));
    console.log('[hero] frames detected:', N, '(', FRAMES[0], '…', FRAMES[N-1], ')');

    FRAMES.forEach((src, i) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = im.onerror = () => { loaded++; if (loaded === N) go(); };
      im.src = src;
      imgs[i] = im;
    });
  }

  function go(){
    if (loadingEl) loadingEl.classList.add('hide');
    draw(cur);
    requestAnimationFrame(loop);
  }

  // ---- 드로잉: 인접 두 프레임 알파 블렌딩 ----
  function draw(f){
    f = Math.max(0, Math.min(N - 1, f));
    const i = Math.floor(f), fr = f - i;
    ctx.clearRect(0, 0, W, H);
    const a = imgs[i];
    const b = imgs[Math.min(N - 1, i + 1)];
    if (a){ ctx.globalAlpha = 1; ctx.drawImage(a, 0, 0, W, H); }
    if (b && fr > 0){ ctx.globalAlpha = fr; ctx.drawImage(b, 0, 0, W, H); ctx.globalAlpha = 1; }
  }

  // ---- lerp 스크럽 루프 ----
  //   터치 기기(폰): 플릭 스크롤이 빨라 0.05면 캔버스가 한참 뒤따라옴(스크롤에 안 붙는 느낌)
  //   → 0.12로 더 단단히 따라붙게. 데스크탑은 기존 0.05 유지(부드러운 관성감).
  const LERP = matchMedia('(pointer:coarse)').matches ? 0.12 : 0.05;
  let cur = 0, tar = 0;
  function loop(){
    cur += (tar - cur) * (reduce ? 1 : LERP);   // reduce: 즉시(스무딩 없음)
    draw(cur);
    lay();
    requestAnimationFrame(loop);
  }

  // ---- 스크롤 → 목표 프레임 ----
  const track = document.querySelector('.scroll-track');
  const hint  = document.getElementById('hint');
  function onScroll(){
    if (!track) return;
    const m = track.offsetHeight - innerHeight;
    const p = Math.max(0, Math.min(1, scrollY / m));
    tar = p * (N - 1);
    if (hint) hint.style.opacity = scrollY > 60 ? '0' : '';
  }

  // ---- 타이포 레이어 토글 (진행률 기준) ----
  function st(id, on){
    const e = document.getElementById(id);
    if (e) e.classList.toggle('show', on);
  }
  function lay(){
    const p = cur / (N - 1);
    st('l-intro', p < 0.09);
    st('l-left',  p >= 0.20 && p < 0.46);
    st('l-right', p >= 0.52 && p < 0.80);
    st('l-end',   p >= 0.88);
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { onScroll(); draw(cur); });
  pre();
})();
