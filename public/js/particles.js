// SorvoStudio - calm network + mouse highlight
// 默认：粒子彼此缓慢连线；鼠标附近：与粒子加强连线（更亮/更密）
// 轻量实现 + 简单网格加速，适合着陆页背景使用。
(() => {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  // ===== 可调参数 =====
  const BASE_DENSITY = 0.05;   // 粒子密度（减少可更清爽）
  const MAX_COUNT    = 120;    // 粒子上限
  const SPEED        = 0.10;   // 移动速度（越小越慢）
  const FRICTION     = 0.997;  // 阻尼，越接近1越平滑
  const R_MIN        = 0.6;    // 粒子半径范围
  const R_MAX        = 1.8;
  const POINT_ALPHA  = 0.75;   // 粒子点的透明度

  // 粒子→粒子连线
  const LINK_DIST    = 110;    // 彼此连线的最大距离
  const MAX_LINKS_PER_PARTICLE = 3; // 每个粒子最多连几条线（控制视觉与性能）
  const LINE_COLOR   = '#78c1ff';
  const LINE_ALPHA_BASE = 0.28; // 背景连线最大透明度

  // 鼠标强化连线
  const MOUSE_DIST   = 140;    // 鼠标连线影响半径
  const MOUSE_ALPHA  = 0.55;   // 鼠标线最大透明度
  const MOUSE_FORCE  = 0.012;  // 鼠标对粒子的轻微吸引
  const MOUSE_COLOR  = LINE_COLOR; // 可改成品牌色

  // ===== DPR & 尺寸 =====
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

  const particles = Array.from({ length: targetCount }, (_, i) => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: rand(R_MIN, R_MAX),
    dx: (Math.random() - 0.5) * SPEED,
    dy: (Math.random() - 0.5) * SPEED,
    a: rand(POINT_ALPHA * 0.8, POINT_ALPHA),
    t: Math.random() * 1000 // 个体相位，用于微小漂移
  }));

  // ===== 鼠标 =====
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

  // ===== 简单网格加速（只查附近格子） =====
  const CELL = LINK_DIST; // 一个格子边长 ≈ 连线距离
  function cellKey(x, y) {
    return ((x / CELL) | 0) + '|' + ((y / CELL) | 0);
  }

  // ===== 主循环 =====
  let rafId = 0, time = 0;
  function tick() {
    ctx.clearRect(0, 0, W, H);

    // 1) 更新粒子（慢速 + 阻尼 + 轻微正弦漂移）
    for (const p of particles) {
      p.t += 0.002; // 漂移相位
      // 轻微噪声式漂移，避免纯直线
      p.dx += Math.cos(p.t) * 0.0006;
      p.dy += Math.sin(p.t * 0.9) * 0.0006;

      p.x += p.dx;
      p.y += p.dy;
      p.dx *= FRICTION;
      p.dy *= FRICTION;

      // 边缘回弹
      if (p.x < 0) { p.x = 0; p.dx = Math.abs(p.dx); }
      else if (p.x > W) { p.x = W; p.dx = -Math.abs(p.dx); }
      if (p.y < 0) { p.y = 0; p.dy = Math.abs(p.dy); }
      else if (p.y > H) { p.y = H; p.dy = -Math.abs(p.dy); }
    }

    // 2) 构建网格
    const grid = new Map();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const key = cellKey(p.x, p.y);
      (grid.get(key) || grid.set(key, [])).push(i);
    }

    // 3) 画背景连线（粒子↔粒子，限最近的几条）
    ctx.lineWidth = 1;
    ctx.strokeStyle = LINE_COLOR;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      const cx = (a.x / CELL) | 0, cy = (a.y / CELL) | 0;
      let links = 0;

      // 查 3x3 邻域格子
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          const arr = grid.get(gx + '|' + gy);
          if (!arr) continue;

          for (const j of arr) {
            if (j <= i) continue; // 避免重复
            const b = particles[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < LINK_DIST) {
              const alpha = (1 - dist / LINK_DIST) * LINE_ALPHA_BASE;
              if (alpha <= 0) continue;
              ctx.globalAlpha = alpha;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
              links++;
              if (links >= MAX_LINKS_PER_PARTICLE) break;
            }
          }
          if (links >= MAX_LINKS_PER_PARTICLE) break;
        }
        if (links >= MAX_LINKS_PER_PARTICLE) break;
      }
    }
    ctx.globalAlpha = 1;

    // 4) 鼠标连线（更亮/更密 + 轻微吸引）
    if (mouse.active) {
      ctx.strokeStyle = MOUSE_COLOR;
      for (const p of particles) {
        const dx = mouse.x - p.x, dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_DIST) {
          // 线
          const alpha = (1 - dist / MOUSE_DIST) * MOUSE_ALPHA;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
          // 轻微吸引
          const pull = MOUSE_FORCE * (1 - dist / MOUSE_DIST);
          p.dx += (dx / (dist || 1)) * pull;
          p.dy += (dy / (dist || 1)) * pull;
        }
      }
      ctx.globalAlpha = 1;
    }

    // 5) 画粒子
    ctx.fillStyle = 'rgba(255,255,255,1)';
    for (const p of particles) {
      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    time += 1;
    rafId = requestAnimationFrame(tick);
  }

  // 减少动效偏好：直接不启动
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;

  tick();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else tick();
  });
})();