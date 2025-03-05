const { Bezier } = require('bezier-js');
const { setTimeout } = require('timers/promises');

class HumanMouse {
    /**
     * @param {import('playwright').Page} page 
     * @param {object} [config]
     * @param {number} [config.minSteps=20] 最小移动步数
     * @param {number} [config.maxSteps=80] 最大移动步数
     */
    constructor(page, config = {}) {
        this.page = page;
        this.currentPosition = { x: 0, y: 0 };
        this.config = {
            minSteps: 15,
            maxSteps: 50,
            ...config
        };
    }

    _randomSteps() {
        return Math.floor(Math.random() *
            (this.config.maxSteps - this.config.minSteps)) + this.config.minSteps;
    }

    async _toPoint(el, options = {}) {
        const { min = 0.2, max = 0.8 } = options
        const box = await el.boundingBox();
        return {
            x: box.x + box.width * (min + (Math.random() * (max - min))),
            y: box.y + box.height * (min + (Math.random() * (max - min)))
        }
    }

    /**
    * 模拟真人鼠标绝对移动
    * @param {number} x 目标X坐标
    * @param {number} y 目标Y坐标
    * @param {object} [options]
    * @param {number} [options.steps] 覆盖默认步数配置
    * @param {number} [options.speed = 0.5] 覆盖默认速度[0~1]
    * @param {number} [options.randomness = 0.3] randomness
    */
    async moveTo(x, y, options = {}) {
        const { speed = 0.5, randomness = 0.3 } = options;
        const start = this.currentPosition;
        const end = { x, y };
        // 生成贝塞尔曲线控制点
        const controlPoints = this.generateControlPoints(start, end, randomness);
        const curve = new Bezier(...controlPoints);
        const steps = options.steps || this._randomSteps()
        const points = curve.getLUT(steps); // 生成50个插值点
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const delay = this.getDynamicDelay(i, points.length, speed);

            await this.page.mouse.move(point.x, point.y);
            await setTimeout(delay);
        }
        this.currentPosition = end;
    }

    /**
    * 模拟真人鼠标移动指定元素
    * @param {import('playwright').Locator} el locator
    * @param {object} [options]
    * @param {number} [options.steps] 覆盖默认步数配置
    * @param {number} [options.min=0.3] 目标元素最小边界
    * @param {number} [options.max=0.7] 目标元素最大边界
    */
    async moveToEl(el, options = {}) {
        const point = await this._toPoint(el, options);
        await this.moveTo(point.x, point.y, options);
    }

    /**
   * 模拟真人鼠标相对移动
   * @param {number} deltaX 偏移X坐标
   * @param {number} deltaY 偏移Y坐标
   * @param {object} [options]
   * @param {number} [options.steps] 覆盖默认步数配置
   */
    async moveBy(deltaX, deltaY, options = {}) {
        const targetX = this.currentPosition.x + deltaX;
        const targetY = this.currentPosition.y + deltaY;
        return this.moveTo(targetX, targetY, options);
    }

    /**
     * 模拟真人鼠标单击
     * @param {number} x 目标X坐标
     * @param {number} y 目标Y坐标
     * @param {object} [options]
     * @param {number} [options.doubleClick=false] 是否双击
     * @param {number} [options.button='left'] 鼠标按键
     * @param {number} [options.steps] 覆盖默认步数配置
     */
    async click(x, y, options = {}) {
        const { doubleClick = false, button = 'left' } = options;
        await this.moveTo(x, y, {
            steps: options.steps,
            speed: options.speed,
            randomness: options.randomness
        });
        await this.page.mouse.down({ button });
        await setTimeout(this.getRandomDelay(50, 150));
        await this.page.mouse.up({ button });

        if (doubleClick) {
            await setTimeout(this.getRandomDelay(100, 300));
            await this.page.mouse.down({ button });
            await setTimeout(this.getRandomDelay(50, 150));
            await this.page.mouse.up({ button });
        }
    }

    /**
    * 模拟真人鼠标单击指定元素
    * @param {import('playwright').Locator} el locator
    * @param {object} [options]
    * @param {number} [options.doubleClick=false] 是否双击
    * @param {number} [options.button='left'] 鼠标按键
    * @param {number} [options.steps] 覆盖默认步数配置
    * @param {number} [options.min=0.3] 目标元素最小边界
    * @param {number} [options.max=0.7] 目标元素最大边界
    */
    async clickEl(el, options = {}) {
        try {
            const point = await this._toPoint(el, options);
            await this.click(point.x, point.y, options)
        } catch (err) {
            console.log('clickEl err: ', err, 'el: ', el)
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