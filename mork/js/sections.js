/* sections.js — STATEMENT/SPEC/GALLERY/CTA 리빌 (GSAP ScrollTrigger)
 * 초기 숨김 상태는 런타임 gsap.set으로만 적용 → GSAP 미로딩 시 콘텐츠는 그냥 보임(안전).
 */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  if (!gsap){ console.warn('[sections] GSAP 미로딩 — 정적 표시'); return; }
  if (ST) gsap.registerPlugin(ST);

  // ── 모바일 터치 보정 ──
  //   · ignoreMobileResize: 주소창 접힘/펼침(높이만 변동)으로 인한 리프레시 점프 방지
  //   · normalizeScroll: 터치 스크롤을 JS로 일원화 → 핀+스크럽이 터치에서 끊기지 않음
  //     (isTouch===1: 순수 터치 기기에서만. 터치 노트북(2)·데스크탑(0) 제외)
  if (ST){
    ST.config({ ignoreMobileResize: true });
    if (ST.isTouch === 1) ST.normalizeScroll(true);
  }
  const mobileMQ = window.matchMedia('(max-width:780px)');

  /* ===== 시퀀스 스크럽 헬퍼 (hero.js 로직 재사용: 프리로드 + lerp + 인접 프레임 블렌딩) ===== */
  function makeSequence(canvas, dir, prefix){
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const name = (i) => dir + prefix + String(i).padStart(4, '0') + '.jpg';
    const imgs = [];
    let N = 0, cur = 0, tar = 0, running = false;

    async function exists(i){
      try { const r = await fetch(name(i), { method: 'HEAD', cache: 'no-store' }); return r.ok; }
      catch { return false; }
    }
    async function discoverCount(){
      if (!(await exists(1))) return 0;
      let lo = 1, hi = 2;
      while (await exists(hi)) { lo = hi; hi *= 2; }
      while (hi - lo > 1){ const m = (lo + hi) >> 1; if (await exists(m)) lo = m; else hi = m; }
      return lo;
    }
    function preload(){
      return new Promise((res) => {
        let done = 0;
        for (let i = 1; i <= N; i++){
          const im = new Image();
          im.decoding = 'async';
          im.onload = im.onerror = () => { done++; if (done === N) res(); };
          im.src = name(i);
          imgs[i - 1] = im;
        }
      });
    }
    function draw(f){
      f = Math.max(0, Math.min(N - 1, f));
      const i = Math.floor(f), fr = f - i;
      ctx.clearRect(0, 0, W, H);
      const a = imgs[i], b = imgs[Math.min(N - 1, i + 1)];
      if (a){ ctx.globalAlpha = 1; ctx.drawImage(a, 0, 0, W, H); }
      if (b && fr > 0){ ctx.globalAlpha = fr; ctx.drawImage(b, 0, 0, W, H); ctx.globalAlpha = 1; }
    }
    // lerp 계수: 터치 기기는 플릭 스크롤이 빨라 더 단단히(0.13) 따라붙게 — 진행감 확보
    const LERP = matchMedia('(pointer:coarse)').matches ? 0.13 : 0.07;
    function loop(){ cur += (tar - cur) * LERP; draw(cur); requestAnimationFrame(loop); }

    return {
      get count(){ return N; },
      setProgress(p){ tar = Math.max(0, Math.min(1, p)) * (N - 1); },
      // animated=true: lerp 루프 시작 / false: 마지막 프레임 정적 표시(reduced-motion)
      async init(animated){
        N = await discoverCount();
        if (N === 0){ console.error('[spec-seq] 프레임 없음:', name(1)); return; }
        console.log('[spec-seq] frames detected:', N);
        await preload();
        if (animated){ running = true; cur = tar = 0; loop(); }
        else { draw(N - 1); }   // 정적: 마지막(케이스 열린) 프레임
      }
    };
  }

  // ── 히어로 스크럽 종료 시 fixed 히어로 비주얼 숨김 ──
  const track = document.querySelector('.scroll-track');
  if (ST && track){
    ST.create({
      trigger: track, start: 'bottom bottom',
      onEnter:     () => document.body.classList.add('hero-ended'),
      onLeaveBack: () => document.body.classList.remove('hero-ended'),
    });
  }

  // 스펙 시퀀스 캔버스 (모든 모드에서 생성 — reduced-motion에선 정적 프레임)
  const specCanvas = document.getElementById('spec-c');
  const specSeq = specCanvas ? makeSequence(specCanvas, 'assets/seq/seq-spec/', 'spec-') : null;

  // ── reduced-motion 또는 ScrollTrigger 부재: 전부 정적 표시 ──
  if (reduce || !ST){
    if (specSeq) specSeq.init(false);   // 정적 프레임만
    return;                              // 초기 숨김 미적용 → 콘텐츠 그대로 보임
  }

  if (specSeq) specSeq.init(true);       // lerp 스크럽 루프 시작

  // ── 공통 리빌 ──
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 40, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 84%', once: true }
    });
  });

  // ── [2] STATEMENT: 단어 단위 클립업 ──
  const words = gsap.utils.toArray('.statement .i');
  if (words.length){
    gsap.set(words, { yPercent: 110 });
    gsap.to(words, {
      yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12,
      scrollTrigger: { trigger: '.statement', start: 'top 68%', once: true }
    });
  }

  // ── [3] SPEC: "열림→닫힘" 완결 흐름 ──
  //   프레임: 전반 1→77(열림) / 후반 77→1(닫힘, 미세 회전)
  //   텍스트: 전반 순차 등장 / 후반 등장 역순 소멸 → 제품·슬로건 하강 퇴장
  const specItems = gsap.utils.toArray('.spec-item');
  const slogan = document.querySelector('.spec-slogan');
  const specFig = document.querySelector('.spec-seq');
  const sloganDesktop = window.matchMedia('(min-width: 781px)').matches;
  const N = specItems.length;

  if (document.querySelector('.spec-pin') && N){
    const lineW = sloganDesktop ? '2.5rem' : '1.6rem';
    if (specCanvas) gsap.set(specCanvas, { rotation: 0 });   // 회전 제거: 순수 열림→닫힘만

    // 초기 숨김
    gsap.set(specItems, { autoAlpha: 0, x: 34 });
    gsap.set(gsap.utils.toArray('.spec-line'), { width: 0 });

    // 삼각 매핑: 피크 0.5 (열림:닫힘 50:50 균등).
    //   피크에 짧은 hold(0.46~0.54) → 프레임 1→77 끝까지 활짝 도달 보장 + "후다닥" 방지.
    const OPEN_END = 0.46, CLOSE_START = 0.54;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.spec', start: 'top top', end: '+=700%',   // 360% → 700% (≈1.94배): 타임라인이 더 긴 스크롤에 펼쳐져 한 번 밀어도 천천히
        scrub: 1, pin: '.spec-pin', invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (self) => {
          const p = self.progress;
          let fp;
          if (p <= OPEN_END)        fp = p / OPEN_END;               // 0→1 열림 (핀 진입 즉시 시작, 끝까지)
          else if (p < CLOSE_START) fp = 1;                           // 활짝 유지 (프레임77 도달 보장)
          else                      fp = (1 - p) / (1 - CLOSE_START); // 1→0 닫힘 (열림과 동일 span = 같은 속도)
          if (specSeq) specSeq.setProgress(fp);                       // 회전 없음 — 순수 열림→닫힘
        }
      }
    });

    // 슬로건: 처음부터 "보이는" 작은 상태(scale .45)로 제품 위 중앙에 떠 있다가
    //   → 스크롤하면 커지며(scale 1) + 아래로 내려와(y 음수→0) 헤드 자리에 안착.
    //   ⚠️ fade-up(아래→위) 아님. autoAlpha 1로 시작해 "새로 올라오는" 느낌 제거.
    if (slogan && sloganDesktop){
      gsap.set(slogan, { scale: 0.45, y: () => -window.innerHeight * 0.06, autoAlpha: 1, transformOrigin: 'center top' });
      tl.to(slogan, { scale: 1, y: 0, ease: 'none', duration: 0.65 }, 0);   // 위→아래 + 확대 (총길이↑에 맞춰 안착 타이밍 유지)
    } else if (slogan){
      gsap.set(slogan, { autoAlpha: 1 });   // 모바일: 정적 표시(스택)
    }

    // 전반부(열림): 4항목 fade-up — ★건드리지 않음. 타임라인 총길이↑(퇴장 확장)에 맞춰
    //   위치/시간을 동일 비율(≈1.3×)로 확대 → 스크롤 체감 속도는 이전과 동일.
    specItems.forEach((it, i) => {
      const at = 0.15 + i * 0.36;            // 0.15 · 0.51 · 0.87 · 1.23  (열림 구간 안)
      tl.to(it, { autoAlpha: 1, x: 0, duration: 0.64, ease: 'power2.out' }, at)
        .to(it.querySelector('.spec-line'), { width: lineW, duration: 0.57 }, at + 0.04);
    });

    // 후반부(닫힘): 등장 역순 fade-out — 더 천천히/넓게.
    //   간격 0.28→0.40, 시간 0.5→0.72, ease power2.in(급함)→power1.inOut(부드럽게).
    //   닫힘 구간(스크롤 후반) 시작점(≈2.55)부터 끝까지 충분히 펼쳐 등장과 균형.
    for (let k = N - 1, step = 0; k >= 0; k--, step++){
      const at = 2.55 + step * 0.40;         // 2.55 · 2.95 · 3.35 · 3.75  (닫힘 구간 안, 넓게)
      tl.to(specItems[k], { autoAlpha: 0, x: -20, duration: 0.72, ease: 'power1.inOut' }, at)
        .to(specItems[k].querySelector('.spec-line'), { width: 0, duration: 0.6 }, at);
    }

    // 마무리: 텍스트 사라지고 뚜껑 닫히면 제품·슬로건이 아래로 내려가며 다음 섹션으로
    const exitAt = 4.5;
    if (specFig) tl.to(specFig, { y: () => window.innerHeight * 0.12, autoAlpha: 0, ease: 'power1.in', duration: 0.22 }, exitAt);
    if (slogan)  tl.to(slogan,  { y: () => window.innerHeight * 0.14, autoAlpha: 0, ease: 'power1.in', duration: 0.22 }, exitAt);
  }

  // ── [4] GALLERY: 가로 스크롤(핀) — 데스크탑·모바일 통일, 거리 1.8배로 느리게 ──
  const galleryTrack = document.querySelector('.gallery-track');
  if (galleryTrack){
    const amount = () => Math.max(0, galleryTrack.scrollWidth - window.innerWidth + 48);
    const SPEED = 1.8;   // 스크롤 거리 = 가로 이동량 × 1.8 → 카드가 더 천천히 지나감
    gsap.to(galleryTrack, {
      x: () => -amount(), ease: 'none',
      scrollTrigger: {
        trigger: '.gallery', start: 'top top',
        end: () => '+=' + Math.max(1, amount() * SPEED),
        pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1
      }
    });
  }

  // 갤러리 카드 커서 틸트 (절제)
  gsap.utils.toArray('.g-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(card, { rotateY: px * 8, rotateX: -py * 8, duration: 0.4, ease: 'power2.out', transformPerspective: 900 });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out' });
    });
  });

  // ── [5] CTA: 진입 시 요소 순차 fade-up ──
  //   (figure에 transform → 내부 img의 float 애니와 충돌 없음)
  const ctaEls = gsap.utils.toArray('.cta-inner > *');
  if (ctaEls.length){
    gsap.from(ctaEls, {
      y: 42, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15,
      scrollTrigger: {
        trigger: '.cta',
        // 모바일: 주소창 변동으로 시작점이 밀려 첫 하강 때 안 나타나는 문제 → 더 일찍(85%) 발동
        start: () => mobileMQ.matches ? 'top 85%' : 'top 72%',
        once: true, invalidateOnRefresh: true
      }
    });
  }

  // ── [5] CTA: 마그네틱 버튼 ──
  const btn = document.querySelector('.cta-btn');
  if (btn){
    const label = btn.querySelector('span');
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      gsap.to(btn, { x: x * 0.3, y: y * 0.4, duration: 0.4, ease: 'power2.out' });
      if (label) gsap.to(label, { x: x * 0.15, y: y * 0.2, duration: 0.4 });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1,0.4)' });
      if (label) gsap.to(label, { x: 0, y: 0, duration: 0.5 });
    });
    // 클릭: placeholder('#')일 때만 점프 차단(추후 buy.html 링크 넣으면 자동으로 정상 이동)
    //       + 미세 눌림 피드백(scale 0.97 눌렸다 복귀) + 글로우 깜빡
    btn.addEventListener('click', (e) => {
      const href = btn.getAttribute('href');
      if (!href || href === '#') e.preventDefault();
      gsap.timeline()
        .to(btn, { scale: 0.97, duration: 0.09, ease: 'power2.out' })
        .to(btn, { scale: 1, duration: 0.55, ease: 'elastic.out(1,0.45)' });
      btn.classList.remove('flash'); void btn.offsetWidth; btn.classList.add('flash');   // 글로우 깜빡 재시작
    });
  }

  // 이미지 로드 후 레이아웃 재계산
  window.addEventListener('load', () => ST.refresh());
})();
