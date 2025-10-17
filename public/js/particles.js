// SorvoStudio - particles with mouse lines (clean, calm)
(() => {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  // ===== 可调参数 =====
  const BASE_DENSITY = 0.3;   // 粒子密度（越小越少）
  const MAX_COUNT    = 120;    // 粒子上限（防止超大屏过多）
  const SPEED        = 0.3;   // 粒子基础速度（越小越慢）
  const FRICTION     = 0.996;  // 阻尼，越接近1越平滑
  const POINT_ALPHA  = 0.85;   // 粒子透明度
  const POINT_R_MIN  = 1;    // 半径范围
  const POINT_R_MAX  = 1.8;

  // 鼠标相关连线
  const MOUSE_LINE_COLOR = '#78c1ff';
  const MOUSE_DIST   = 140;    // 鼠标与粒子连线的距离阈值
  const MOUSE_FORCE  = 0.03;  // 鼠标对粒子的轻微吸引（数值小、不突兀）
  const ENABLE_PARTICLE_LINKS = false; // 若想粒子之间也有连线改成 true
  const LINK_DIST    = 80;     // 粒子之间的连线距离（仅在上面为 true 时生效)

  // ===== DPR & 尺寸适配 =====
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

  // ===== 初始化粒子 =====
  const targetCount = Math.min(
    MAX_COUNT,
    Math.floor((W * H) * BASE_DENSITY / 10000)
  );
  const rand = (a, b) => a + Math.random() * (b - a);

  const particles = Array.from({ length: targetCount }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: rand(POINT_R_MIN, POINT_R_MAX),
    dx: (Math.random() - 0.5) * SPEED,
    dy: (Math.random() - 0.5) * SPEED,
    a: rand(POINT_ALPHA * 0.8, POINT_ALPHA) // 透明度微差
  }));

  // ===== 鼠标 / 触控 =====
  const mouse = { x: W * 0.5, y: H * 0.5, active: false };
  function onMove(e) {
    const t = e.touches ? e.touches[0] : e;
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    mouse.active = true;
  }
  function onLeave() { mouse.active = false; }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseleave', onLeave, { passive: true });
  window.addEventListener('touchend', onLeave, { passive: true });

  // ===== 动画主循环 =====
  let rafId = 0;
  function tick() {
    ctx.clearRect(0, 0, W, H);

    // 1)（可选）粒子之间的连线 —— 默认关闭以保持干净
    if (ENABLE_PARTICLE_LINKS) {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.28;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineWidth = 1;
            ctx.strokeStyle = MOUSE_LINE_COLOR;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // 2) 与鼠标的连线 + 轻微吸引
    if (mouse.active) {
      for (const p of particles) {
        const mdx = mouse.x - p.x;
        const mdy = mouse.y - p.y;
        const dist = Math.hypot(mdx, mdy);

        if (dist < MOUSE_DIST) {
          // 画与鼠标的连线（随距离衰减）
          const alpha = (1 - dist / MOUSE_DIST) * 0.6;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.lineWidth = 1;
          ctx.strokeStyle = MOUSE_LINE_COLOR;
          ctx.stroke();

          // 轻微吸引（很小，不会“乱”）
          const pull = MOUSE_FORCE * (1 - dist / MOUSE_DIST);
          p.dx += mdx * pull / (dist || 1);
          p.dy += mdy * pull / (dist || 1);
        }
      }
      ctx.globalAlpha = 1;
    }

    // 3) 更新 & 绘制粒子（慢速 + 阻尼）
    ctx.fillStyle = 'rgba(255,255,255,1)';
    for (const p of particles) {
      p.x += p.dx;
      p.y += p.dy;

      p.dx *= FRICTION;
      p.dy *= FRICTION;

      // 边缘回弹
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

  // ===== 无障碍：减少动效则不启动 =====
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;

  tick();

  // 页面不可见时暂停
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else tick();
  });
})();