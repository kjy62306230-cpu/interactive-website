/* main.js — 전역 (NAV · 앵커). Lenis는 추후 섹션 단계에서 도입.
 * 스크롤 시 NAV 배경만 살짝 어두워짐 (과한 효과 금지 — MORK.md §5 NAV).
 */
(() => {
  const nav = document.querySelector('.nav');
  if (!nav){ return; }
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
