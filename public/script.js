document.addEventListener('DOMContentLoaded', () => {

    // --- 滚动渐入动画保持不变 ---
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('scroll-show');
            }
        });
    }, observerOptions);

    const hiddenElements = document.querySelectorAll('.scroll-hidden');
    hiddenElements.forEach((el) => observer.observe(el));


    // --- Canvas 粒子系统 (核心修改) ---
    const canvas = document.getElementById('hero-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particlesArray;

    // 鼠标交互对象
    let mouse = {
        x: null,
        y: null,
        radius: (canvas.height / 80) * (canvas.width / 80) // 动态调整感应半径
    }

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    // 窗口调整大小时重置
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        mouse.radius = (canvas.height / 80) * (canvas.width / 80);
        initParticles();
    });

    // 鼠标移出屏幕时清空坐标
    window.addEventListener('mouseout', () => {
        mouse.x = undefined;
        mouse.y = undefined;
    });

    // 粒子类定义
    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = directionX; // X轴移动速度
            this.directionY = directionY; // Y轴移动速度
            this.size = size;
            this.color = color;
        }

        // 绘制
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        // 更新位置 (核心物理逻辑)
        update() {
            // 1. 边界检测：如果碰到屏幕边缘，反弹 (速度反向)
            if (this.x > canvas.width || this.x < 0) {
                this.directionX = -this.directionX;
            }
            if (this.y > canvas.height || this.y < 0) {
                this.directionY = -this.directionY;
            }

            // 2. 鼠标排斥交互
            // 计算鼠标和粒子的距离
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx*dx + dy*dy);

            if (distance < mouse.radius + this.size) {
                if (mouse.x < this.x && this.x < canvas.width - this.size * 10) {
                    this.x += 3; // 向右推，增加力度
                }
                if (mouse.x > this.x && this.x > this.size * 10) {
                    this.x -= 3; // 向左推
                }
                if (mouse.y < this.y && this.y < canvas.height - this.size * 10) {
                    this.y += 3; // 向下推
                }
                if (mouse.y > this.y && this.y > this.size * 10) {
                    this.y -= 3; // 向上推
                }
            }

            // 3. 常规移动：让粒子一直保持缓慢漂浮
            this.x += this.directionX;
            this.y += this.directionY;

            // 绘制
            this.draw();
        }
    }

    // 初始化粒子群
    function initParticles() {
        particlesArray = [];
        // 粒子数量：根据屏幕面积计算，避免过密或过疏
        let numberOfParticles = (canvas.height * canvas.width) / 9000;

        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 3) + 1; // 粒子大小 1-4px

            // 随机生成位置
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);

            // 随机生成速度 (方向和快慢)
            // 这里的数值越小，漂浮越慢。 (Math.random() - 0.5) 会生成正负数，代表向左或向右
            let directionX = (Math.random() * 0.4) - 0.2;
            let directionY = (Math.random() * 0.4) - 0.2;

            // 颜色：高亮的蓝紫色
            let color = 'rgba(138, 124, 245, ' + (Math.random() * 0.5 + 0.3) + ')';

            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }

    // 连线动画
    function animateParticles() {
        requestAnimationFrame(animateParticles);
        ctx.clearRect(0, 0, innerWidth, innerHeight);

        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connectParticles();
    }

    // 粒子连线逻辑
    function connectParticles() {
        let opacityValue = 1;
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                // 计算两个粒子之间的距离
                let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                    + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));

                // 如果距离足够近，画线
                if (distance < (canvas.width/7) * (canvas.height/7) / 7) {
                    opacityValue = 1 - (distance / 20000);
                    // 线条颜色：亮紫色
                    ctx.strokeStyle = 'rgba(138, 124, 245,' + opacityValue + ')';
                    ctx.lineWidth = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    // 启动
    initParticles();
    animateParticles();
});