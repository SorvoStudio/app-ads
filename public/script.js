document.addEventListener('DOMContentLoaded', () => {

    // --- 功能1: 滚动渐入动画 (Scroll Reveal Animation) ---
    // 使用 IntersectionObserver API 来监听元素是否进入视口
    const observerOptions = {
        threshold: 0.2 // 当元素 20% 进入视口时触发
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('scroll-show');
                // 可选：如果希望动画只播放一次，取消下面这行的注释
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // 获取所有需要动画的元素并添加监听
    const hiddenElements = document.querySelectorAll('.scroll-hidden');
    hiddenElements.forEach((el) => observer.observe(el));


    // --- 功能2: Canvas 动态粒子背景 ---
    const canvas = document.getElementById('hero-canvas');
    const ctx = canvas.getContext('2d');
    let particlesArray;

    // 设置 Canvas 尺寸为窗口大小
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 处理窗口大小改变
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
    });

    // 鼠标交互位置
    const mouse = {
        x: null,
        y: null,
        radius: 150 // 鼠标影响半径
    }

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    // 鼠标移出窗口时清空位置
    window.addEventListener('mouseout', () => {
        mouse.x = undefined;
        mouse.y = undefined;
    })


    // 粒子类定义
    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = directionX;
            this.directionY = directionY;
            this.size = size;
            this.color = color;
            this.baseX = x; // 记录初始位置
            this.baseY = y;
        }

        // 绘制粒子
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        // 更新粒子位置 (核心交互逻辑)
        update() {
            // 检测鼠标距离
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx*dx + dy*dy);

            // 如果鼠标在附近，粒子会稍微躲避
            if (distance < mouse.radius) {
                if (mouse.x < this.x && this.x < canvas.width - this.size * 10) {
                    this.x += 2;
                }
                if (mouse.x > this.x && this.x > this.size * 10) {
                    this.x -= 2;
                }
                if (mouse.y < this.y && this.y < canvas.height - this.size * 10) {
                    this.y += 2;
                }
                if (mouse.y > this.y && this.y > this.size * 10) {
                    this.y -= 2;
                }
            } else {
                // 如果鼠标不在附近，粒子缓慢回到初始位置，并保持微小的随机浮动
                if (this.x !== this.baseX) {
                    let dxMove = this.x - this.baseX;
                    this.x -= dxMove/20;
                }
                if (this.y !== this.baseY) {
                    let dyMove = this.y - this.baseY;
                    this.y -= dyMove/20;
                }
                // 添加一点点持续的随机浮动，让画面是活的
                this.x += (Math.random() - 0.5) * 0.2;
                this.y += (Math.random() - 0.5) * 0.2;
            }
            this.draw();
        }
    }

    // 初始化粒子群
    function initParticles() {
        particlesArray = [];
        // 稍微增加一点密度 (把分母从 15000 减小到 12000)
        let numberOfParticles = (canvas.height * canvas.width) / 12000;
        for (let i = 0; i < numberOfParticles; i++) {
            // 修改 1：粒子稍微大一点 (原来是 1-4px，现在改为 2-5px)
            let size = (Math.random() * 3) + 2;
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);

            // 修改 2：颜色更亮，透明度更高 (原来最高0.4，现在提高到0.3-0.8)
            // 使用了稍微亮一点的紫色 RGB(138, 124, 245)
            let color = 'rgba(138, 124, 245, ' + (Math.random() * 0.5 + 0.3) + ')';

            particlesArray.push(new Particle(x, y, 0, 0, size, color));
        }
    }

    // 动画循环
    function animateParticles() {
        requestAnimationFrame(animateParticles);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connectParticles();
    }

    // (可选) 连接附近的粒子，增加网络感
    function connectParticles() {
        let opacityValue = 1;
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                    + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));

                // 稍微放宽一点连接距离的判断条件 (把分母的 10 改成了 9)
                if (distance < (canvas.width/7) * (canvas.height/7) / 9) {
                    opacityValue = 1 - (distance / 15000);

                    // --- 关键修改开始 ---
                    // 原来的写法（很暗）：
                    // ctx.strokeStyle = 'rgba(106, 90, 205,' + opacityValue * 0.2 + ')'; 

                    // 新写法：去掉 *0.2 的压暗系数，换用更亮的紫色，让线条清晰可见
                    ctx.strokeStyle = 'rgba(138, 124, 245,' + opacityValue + ')';

                    // 线条稍微加粗一点点 (原来是 1)
                    ctx.lineWidth = 1.5;
                    // --- 关键修改结束 ---

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