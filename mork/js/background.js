/* background.js — 전역 배경 캔버스
 * 베이스 #050506 + 중앙 포커싱 스포트 + 좌상단 광선 + 흰 파티클(글로우) + 강한 비네트
 * (hero-demo-VERIFIED.html 검증 로직 그대로 이식)
 */
(() => {
  const bg = document.getElementById('bg');
  if (!bg) return;
  const bx = bg.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let BW, BH, parts = [];

  function fit(){
    BW = bg.width  = innerWidth  * DPR;
    BH = bg.height = innerHeight * DPR;
    bg.style.width  = innerWidth  + 'px';
    bg.style.height = innerHeight + 'px';
  }

  function initParts(){
    parts = [];
    const n = Math.round((innerWidth * innerHeight) / 9000);
    for (let k = 0; k < n; k++){
      parts.push({
        x:  Math.random() * BW,
        y:  Math.random() * BH,
        r:  (Math.random() * 2.2 + .6) * DPR,
        sp: Math.random() * .35 + .08,
        a:  Math.random() * .5 + .25,
        ph: Math.random() * 6.28
      });
    }
  }

  function draw(t){
    // 베이스: 거의 검정 (포커싱 강화)
    bx.fillStyle = '#050506';
    bx.fillRect(0, 0, BW, BH);

    // 중앙 조명 스포트 (제품 비추는 빛)
    let c = bx.createRadialGradient(BW*.5, BH*.46, 0, BW*.5, BH*.5, BH*.5);
    c.addColorStop(0,  'rgba(60,58,54,.95)');
    c.addColorStop(.4, 'rgba(28,27,26,.6)');
    c.addColorStop(1,  'transparent');
    bx.fillStyle = c;
    bx.fillRect(0, 0, BW, BH);

    // 좌상단 광선
    let s = bx.createRadialGradient(BW*.2, BH*.08, 0, BW*.2, BH*.08, BH*.55);
    s.addColorStop(0, 'rgba(220,212,198,.14)');
    s.addColorStop(1, 'transparent');
    bx.fillStyle = s;
    bx.fillRect(0, 0, BW, BH);

    // 흰색 입자 (글로우)
    for (const p of parts){
      if (!reduce){
        p.y -= p.sp * DPR;
        p.x += Math.sin(t*.0004 + p.ph) * .25 * DPR;
        if (p.y < -5){ p.y = BH + 5; p.x = Math.random() * BW; }
      }
      const tw = reduce ? p.a*.7 : p.a * (.5 + .5 * Math.sin(t*.0012 + p.ph));
      bx.beginPath();
      bx.arc(p.x, p.y, p.r, 0, 6.28);
      bx.fillStyle = 'rgba(255,255,255,' + tw + ')';
      bx.shadowBlur = p.r * 5;
      bx.shadowColor = 'rgba(255,255,255,.7)';
      bx.fill();
    }
    bx.shadowBlur = 0;

    // 강한 비네트 (여백 확실히 어둡게)
    let v = bx.createRadialGradient(BW*.5, BH*.5, BH*.28, BW*.5, BH*.5, Math.max(BW,BH)*.62);
    v.addColorStop(0, 'transparent');
    v.addColorStop(1, 'rgba(0,0,0,.92)');
    bx.fillStyle = v;
    bx.fillRect(0, 0, BW, BH);
  }

  function loop(t){ draw(t); requestAnimationFrame(loop); }

  fit(); initParts();
  if (reduce){
    draw(0);                        // 정적 1프레임
  } else {
    requestAnimationFrame(loop);
  }
  addEventListener('resize', () => { fit(); initParts(); if (reduce) draw(0); });
})();
