const { Bezier } = require('bezier-js');
const { setTimeout } = require('timers/promises');

class HumanMouse {
    constructor(page) {
        this.page = page;
        this.currentPosition = { x: 0, y: 0 };
    }

    async moveTo(x, y, options = {}) {
        try {
            const { speed = 0.5, randomness = 0.3 } = options;
            const start = this.currentPosition;
            const end = { x, y };

            // 生成贝塞尔曲线控制点
            const controlPoints = this.generateControlPoints(start, end, randomness);
            const curve = new Bezier(...controlPoints);
            const points = curve.getLUT(50); // 生成50个插值点

            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                const delay = this.getDynamicDelay(i, points.length, speed);

                await this.page.mouse.move(point.x, point.y);
                await setTimeout(delay);
                console.log(`point${i}:`, point);
            }
            console.log('end:', end);
            this.currentPosition = end;
        } catch (err) {
            console.log('moveTo err:', err)
        }
    }

    async click(x, y, options = {}) {
        try {
            const { doubleClick = false, button = 'left' } = options;

            await this.moveTo(x, y);
            await this.page.mouse.down({ button });
            await setTimeout(this.getRandomDelay(50, 150));
            await this.page.mouse.up({ button });

            if (doubleClick) {
                await setTimeout(this.getRandomDelay(100, 300));
                await this.page.mouse.down({ button });
                await setTimeout(this.getRandomDelay(50, 150));
                await this.page.mouse.up({ button });
            }
        } catch (err) {
            console.log('click err:', err)
        }
    }

    generateControlPoints(start, end, randomness) {
        const distance = Math.hypot(end.x - start.x, end.y - start.y);
        const cp1 = {
            x: start.x + (end.x - start.x) * 0.3 + (Math.random() - 0.5) * distance * randomness,
            y: start.y + (end.y - start.y) * 0.3 + (Math.random() - 0.5) * distance * randomness
        };
        const cp2 = {
            x: end.x - (end.x - start.x) * 0.3 + (Math.random() - 0.5) * distance * randomness,
            y: end.y - (end.y - start.y) * 0.3 + (Math.random() - 0.5) * distance * randomness
        };
        return [start, cp1, cp2, end];
    }

    getDynamicDelay(index, totalPoints, speed) {
        // 模拟加速减速效果
        const progress = index / totalPoints;
        const baseDelay = 10 + (1 - speed) * 50;
        return Math.max(10, baseDelay * (1 - Math.sin(progress * Math.PI)) * 0.5);
    }

    getRandomDelay(min = 20, max = 100) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
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

module.exports = HumanMouse;