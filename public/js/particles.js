// SorvoStudio - calm particles (slow, clean, no interactivity)
(() => {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  // ---- 可调参数（按需微调） ----
  const ENABLE_LINES = false;  // 默认关闭连线，想要就改成 true
  const BASE_DENSITY = 0.05;   // 粒子密度（越小越少）
  const MAX_COUNT = 90;        // 粒子上限
  const SPEED = 0.12;          // 粒子基础速度（越小越慢）
  const FRICTION = 0.995;      // 速度阻尼，越接近1越平滑
  const LINK_DIST = 85;        // 连线距离（仅在开启连线时有效）
  const POINT_ALPHA = 0.7;     // 粒子透明度
  const POINT_RADIUS_MIN = 0.6;
  const POINT_RADIUS_MAX = 1.6;

  // ---- 适配分辨率 ----
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let W = 0, H = 0;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // ---- 初始化粒子（数量随尺寸而变，且有上限）----
  const targetCount = Math.min(
    MAX_COUNT,
    Math.floor((W * H) * BASE_DENSITY / 10000)
  );
  const rand = (a, b) => a + Math.random() * (b - a);

  const particles = Array.from({ length: targetCount }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: rand(POINT_RADIUS_MIN, POINT_RADIUS_MAX),
    dx: (Math.random() - 0.5) * SPEED,
    dy: (Math.random() - 0.5) * SPEED,
    a: rand(POINT_ALPHA * 0.8, POINT_ALPHA) // 亮度轻微随机
  }));

  let rafId = 0;
  function tick() {
    ctx.clearRect(0, 0, W, H);

    // （可选）连线：默认关闭，想开把 ENABLE_LINES 设为 true
    if (ENABLE_LINES) {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.35;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#78c1ff';
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // 粒子本体（慢速 + 阻尼，运动更平滑）
    ctx.fillStyle = 'rgba(255,255,255,1)';
    for (const p of particles) {
      p.x += p.dx;
      p.y += p.dy;

      // 轻微阻尼，去“乱跳”感
      p.dx *= FRICTION;
      p.dy *= FRICTION;

      // 边缘回弹（平滑不穿帮）
      if (p.x < 0) { p.x = 0; p.dx = Math.abs(p.dx); }
      else if (p.x > W) { p.x = W; p.dx = -Math.abs(p.dx); }
      if (p.y < 0) { p.y = 0; p.dy = Math.abs(p.dy); }
      else if (p.y > H) { p.y = H; p.dy = -Math.abs(p.dy); }

      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    rafId = requestAnimationFrame(tick);
  }

  // 尊重“减少动效”
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;

  tick();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else tick();
  });
})();