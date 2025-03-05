const { chromium } = require('playwright');
const { Bezier } = require('bezier-js');

class HumanMouse {
    constructor(page) {
        this.page = page;
        this.mouse = page.mouse;
        this.currentPos = { x: 0, y: 0 }; // 内部状态跟踪
        this.config = {
            baseSpeed: 150,      // 基础速度（像素/秒）
            acceleration: 0.3,   // 加速度系数（0-1）
            stepDensity: 25,     // 移动密度（每像素步数）
            clickVariance: 0,
            curveIntensity: 30 // 曲线强度
        };

        this.initializePosition();
    }

    // 初始化位置（添加重试机制）
    async initializePosition(retry = 3) {
        try {
            await this.mouse.move(0, 0);
            this.currentPos = { x: 0, y: 0 };
        } catch (e) {
            if (retry > 0) {
                await this.page.waitForTimeout(500);
                return this.initializePosition(retry - 1);
            }
            throw new Error('Mouse initialization failed');
        }
    }

    // 缓动函数（三次贝塞尔）
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // 生成速度控制的时间序列
    generateTimeSequence(steps) {
        const times = [];
        for (let i = 0; i <= steps; i++) {
            times.push(this.easeInOutCubic(i / steps));
        }
        return times;
    }

    generateBezierPath(start, end, steps) {
        const controlPoints = [
            start,
            {
                x: start.x + (end.x - start.x) * 0.3 + Math.random() * this.config.curveIntensity - this.config.curveIntensity / 2,
                y: start.y + (end.y - start.y) * 0.3 + Math.random() * this.config.curveIntensity - this.config.curveIntensity / 2
            },
            {
                x: start.x + (end.x - start.x) * 0.7 + Math.random() * this.config.curveIntensity - this.config.curveIntensity / 2,
                y: start.y + (end.y - start.y) * 0.7 + Math.random() * this.config.curveIntensity - this.config.curveIntensity / 2
            },
            end
        ];

        const curve = new Bezier(...controlPoints);
        return curve.getLUT(steps);
    }

    // 模拟人类移动
    async humanMove(x, y, options = {}) {
        const config = { ...this.config, ...options };
        const start = this.currentPos;
        const end = { x, y };
        // 计算移动参数
        const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const steps = Math.max(5, Math.floor(distance / config.stepDensity));
        const timeSequence = this.generateTimeSequence(steps);

        // 生成路径
        const path = this.generateBezierPath(start, end, steps);
        // 计算总时间（基于移动速度公式）
        const baseTime = (distance / config.baseSpeed) * 1000;
        const totalTime = baseTime * (1 + config.acceleration * Math.random());

        let prevTime = 0;
        for (let i = 0; i <= steps; i++) {
            const point = path[i];
            const progress = timeSequence[i];

            // 计算间隔时间（带随机波动）
            const currentTime = progress * totalTime;
            const interval = currentTime - prevTime + Math.random() * 10 - 5;

            await this.mouse.move(point.x, point.y);
            this.currentPos = point;

            // 动态间隔等待
            if (interval > 0) {
                await this.page.waitForTimeout(interval);
            }
            prevTime = currentTime;
        }

        // 最终精准定位
        await this.mouse.move(end.x, end.y);
        this.currentPos = end;
    }

    // 模拟人类点击
    async humanClick(element, options = {}) {
        const p = await this.elementPoint(element)
        const config = { ...this.config, ...options };
        await this.humanMove(p.x, p.y, config);

        // 点击前随机停顿
        await this.page.waitForTimeout(50 + Math.random() * 100);

        // 添加点击偏移
        const clickX = p.x + (Math.random() * config.clickVariance - config.clickVariance / 2);
        const clickY = p.y + (Math.random() * config.clickVariance - config.clickVariance / 2);

        await this.mouse.move(clickX, clickY);
        await this.mouse.down();
        await this.page.waitForTimeout(20 + Math.random() * 50);
        await this.mouse.up();

        // 点击后回到目标位置
        await this.mouse.move(p.x, p.y);
        this.currentPos = { x: p.x, y: p.y };
    }

    async elementPoint(element) {
        const box = await element.boundingBox()
        return {
            x: box.x + box.width * Math.random(0.2, 0.8),
            y: box.y + box.height * Math.random(0.2, 0.8)
        }
    }


    async showCursor() {
        await this.page.addScriptTag({
            content: `
                let dot;
                document.addEventListener('mousemove', (e) => {
                    if (!dot) {
                        dot = document.createElement('div');
                        Object.assign(dot.style, {
                            position: 'fixed',
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: 'red',
                            pointerEvents: 'none',
                            zIndex: 999999
                        });
                        document.body.appendChild(dot);
                    }
                    dot.style.left = e.clientX + 'px';
                    dot.style.top = e.clientY + 'px';
                });
            `
        });
    }

}

// 使用示例
(async () => {
    const browser = await chromium.launch({
        headless: false,
        args: ['--window-position=100,100']
    });
    const page = await browser.newPage();

    // 关键：先设置视口再导航
    await page.setViewportSize({ width: 1280, height: 720 });



    await page.goto('https://humanbenchmark.com/tests/chimp');
    const humanMouse = new HumanMouse(page);
    await humanMouse.initialized;
    await humanMouse.showCursor();

    const cfg = {
        baseSpeed: 300,
        stepDensity: 6,
        acceleration: 0.5,
        curveIntensity: 200
    }

    // 点击开始按钮
    const startButton = page.locator('button:text("Start Test")');
    await humanMouse.humanClick(startButton, cfg);

    for (let attempt = 0; attempt < 5; attempt++) {
        // 获取所有数字块
        const blocks = await page.locator('[data-cellnumber]').all();
        const sortedBlocks = await Promise.all(
            blocks.map(async block => ({
                element: block,
                number: await block.getAttribute('data-cellnumber')
            }))
        ).then(res => res.sort((a, b) => a.number - b.number));
        // 依次点击
        for (const { number } of sortedBlocks) {
            const element = page.locator(`div[data-cellnumber="${number}"]`)
            await humanMouse.humanClick(element, cfg);
        }

        // 点击继续
        const continueButton = page.locator('button:text("Continue")');
        await humanMouse.humanClick(continueButton, cfg);
        await page.waitForTimeout(1200);
    }

    await browser.close();
})();