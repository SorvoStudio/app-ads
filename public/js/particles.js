// SorvoStudio - lightweight particles background
(() => {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  // DPR 适配，避免视网膜屏模糊
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

  // 粒子参数（可按需微调）
  const BASE_DENSITY = 0.08;           // 每像素的密度系数（越大越多）
  const MAX_COUNT = 160;               // 上限，避免超大屏爆量
  const LINK_DIST = 110;               // 连线距离
  const SPEED = 0.35;                  // 基础速度

  // 计算数量：随屏幕大小变化，并限定上限
  const targetCount = Math.min(
    MAX_COUNT,
    Math.floor((W * H) * BASE_DENSITY / 10000)
  );

  // 初始化粒子
  const particles = Array.from({ length: targetCount }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.8 + 0.6,
    dx: (Math.random() - 0.5) * SPEED,
    dy: (Math.random() - 0.5) * SPEED,
    a: Math.random() * 0.5 + 0.3 // 点亮度（0~1）
  }));

  // 轻微的鼠标/触控视差（不强依赖输入）
  const mouse = { x: W * 0.5, y: H * 0.5, active: false };
  function onMove(e) {
    const t = e.touches ? e.touches[0] : e;
    mouse.x = t.clientX; mouse.y = t.clientY; mouse.active = true;
  }
  function onLeave() { mouse.active = false; }
  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseleave', onLeave, { passive: true });
  window.addEventListener('touchend', onLeave, { passive: true });

  let rafId = 0;
  function tick() {
    ctx.clearRect(0, 0, W, H);

    // 1) 连线（近邻）
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < LINK_DIST) {
          const alpha = (1 - dist / LINK_DIST) * 0.45; // 渐隐
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

    // 2) 粒子本体
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const p of particles) {
      // 轻微被鼠标吸引（可注释关闭）
      if (mouse.active) {
        const mdx = (mouse.x - p.x) * 0.0006;
        const mdy = (mouse.y - p.y) * 0.0006;
        p.dx += mdx; p.dy += mdy;
      }

      p.x += p.dx;
      p.y += p.dy;

      // 边缘回弹
      if (p.x < 0 || p.x > W) p.dx *= -1;
      if (p.y < 0 || p.y > H) p.dy *= -1;

      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    rafId = requestAnimationFrame(tick);
  }

  // 尊重“减少动态效果”设置
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) {
    // 不启动动画，保留静态背景（index 已隐藏 canvas）
    return;
  }

  tick();

  // 页面隐藏时暂停，返回继续
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else tick();
  });
})();