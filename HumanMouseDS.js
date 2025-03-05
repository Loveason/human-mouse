const { Bezier } = require('bezier-js');
const { setTimeout } = require('timers/promises');

class HumanMouse {
    /**
     * @param {import('playwright').Page} page 
     * @param {object} [config]
     * @param {number} [config.minSteps=20] 最小移动步数
     * @param {number} [config.maxSteps=40] 最大移动步数
     * @param {number} [config.baseSpeed=80] 基准速度（毫秒/步）
     */
    constructor(page, config = {}) {
        this.page = page;
        this.currentPosition = { x: 0, y: 0 }; // 手动跟踪鼠标位置
        this.config = {
            minSteps: 20,
            maxSteps: 40,
            baseSpeed: 80,
            ...config
        };
    }

    /**
     * 模拟真人鼠标移动
     * @param {number} targetX 目标X坐标
     * @param {number} targetY 目标Y坐标
     * @param {object} [options]
     * @param {boolean} [options.click=false] 是否执行点击
     * @param {number} [options.steps] 覆盖默认步数配置
     */
    async moveTo(targetX, targetY, options = {}) {
        const startX = this.currentPosition.x;
        const startY = this.currentPosition.y;
        const steps = options.steps || this._randomSteps();
        // 生成贝塞尔曲线路径
        const path = this._generateBezierPath(
            { x: startX, y: startY },
            { x: targetX, y: targetY },
            steps
        );


        // 执行移动
        await this._moveThroughPath(path);
        this.currentPosition = { x: targetX, y: targetY }; // 更新位置
        // 执行点击
        if (options.click) {
            await this._humanClick();
        }
    }

    /** 相对移动 */
    async moveBy(deltaX, deltaY, options = {}) {
        const targetX = this.currentPosition.x + deltaX;
        const targetY = this.currentPosition.y + deltaY;
        return this.moveTo(targetX, targetY, options);
    }

    async click(targetX, targetY, options = {}) {
        options.click = true
        await this.moveTo(targetX, targetY, options);
    }

    /** 生成随机步数 */
    _randomSteps() {
        return Math.floor(Math.random() *
            (this.config.maxSteps - this.config.minSteps)) + this.config.minSteps;
    }

    /** 生成贝塞尔路径 */
    _generateBezierPath(start, end, steps) {
        // // 生成随机控制点
        // const controlPoints = this._generateControlPoints(start, end);
        // const curve = new Bezier(
        //     start.x, start.y,
        //     controlPoints[0].x, controlPoints[0].y,
        //     controlPoints[1].x, controlPoints[1].y,
        //     end.x, end.y
        // );

        // // 获取等距点
        // return curve.getLUT(steps);
        // 添加10%的过冲幅度
        const overshoot = {
            x: (end.x - start.x) * 0.1 * (Math.random() > 0.5 ? 1 : -1),
            y: (end.y - start.y) * 0.1 * (Math.random() > 0.5 ? 1 : -1)
        };

        // 生成带过冲的路径
        const controlPoints = [
            { x: start.x + overshoot.x, y: start.y + overshoot.y },
            { x: end.x + overshoot.x, y: end.y + overshoot.y }
        ];

        return new Bezier(
            start.x, start.y,
            controlPoints[0].x, controlPoints[0].y,
            controlPoints[1].x, controlPoints[1].y,
            end.x, end.y
        ).getLUT(steps);
    }

    /** 生成随机控制点 */
    _generateControlPoints(start, end) {
        const delta = 0.3;
        const dx = end.x - start.x;
        const dy = end.y - start.y;

        return [
            {
                x: start.x + dx * (delta + Math.random() * 0.2),
                y: start.y + dy * (delta + Math.random() * 0.2)
            },
            {
                x: start.x + dx * (0.7 + Math.random() * 0.2),
                y: start.y + dy * (0.7 + Math.random() * 0.2)
            }
        ];
    }

    /** 沿路径移动 */
    async _moveThroughPath(points) {
        for (const point of points) {
            // 添加随机移动速度变化
            await this.page.mouse.move(point.x, point.y);
            this.currentPosition = { x: point.x, y: point.y }; // 实时更新位置
            await this._randomDelay();
        }
    }

    /** 生成随机延迟 */
    async _randomDelay() {
        const delay = this.config.baseSpeed * (0.7 + Math.random() * 0.6);
        await setTimeout(delay)
    }

    /** 模拟真人点击 */
    async _humanClick() {
        await this.page.mouse.down();
        await setTimeout(50 + Math.random() * 100); // 点击保持随机时长
        await this.page.mouse.up();

        // 点击后随机微小移动
        const { x, y } = this.currentPosition

        const endX = x + (Math.random() * 4 - 2)
        const endY = y + (Math.random() * 4 - 2)
        await this.page.mouse.move(endX, endY);
        this.currentPosition = { x: endX, y: endY }
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