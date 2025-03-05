const { Tween, Easing, Group, Interpolation } = require('@tweenjs/tween.js');

class MouseSimulator {
    constructor(page) {
        this.page = page;
        this.mouse = page.mouse;
        this.tweenGroup = new Group(); // 使用 Group 管理所有补间
        this.currentPosition = { x: 0, y: 0 };

        // 启动动画循环（模拟 requestAnimationFrame）
        const animate = () => {
            this.tweenGroup.update();
            setImmediate(animate); // 使用 setImmediate 确保每帧更新
        };
        animate();
    }

    /**
   * 获取当前鼠标位置（通过内部状态维护）
   */
    getPosition() {
        return { ...this.currentPosition };
    }

    /**
   * 模拟真人鼠标移动（带缓动动画）
   * @param {number} x 目标 X 坐标
   * @param {number} y 目标 Y 坐标
   * @param {number} duration 动画时长（毫秒）
   * @param {Function} easing 缓动函数
   */
    async move(x, y, duration = 500, easing = Easing.Quadratic.InOut) {
        const start = this.getPosition();

        return new Promise((resolve) => {
            const tween = new Tween(start, this.tweenGroup)
                .to({ x, y }, duration)
                .easing(easing)
                .interpolation(Interpolation.CatmullRom)
                .onUpdate(({ x: currentX, y: currentY }) => {
                    this.mouse.move(currentX, currentY).catch(() => { }); // 忽略重复移动错误
                    this.currentPosition = { x: currentX, y: currentY };
                })
                .onComplete(resolve);

            tween.start();
        });
    }


    /**
   * 模拟真人点击（带随机延迟和微小位移）
   * @param {number} x 点击坐标 X（绝对坐标）
   * @param {number} y 点击坐标 Y（绝对坐标）
   * @param {Object} options 配置项
   */
    async click(x, y, { delay = 100, jitter = 5 } = {}) {
        // 添加随机延迟
        await new Promise(resolve => setTimeout(resolve, Math.random() * delay));

        // 添加随机偏移
        const jitterX = x + (Math.random() * jitter - jitter / 2);
        const jitterY = y + (Math.random() * jitter - jitter / 2);

        // 更新内部位置并点击
        this.currentPosition = { x: jitterX, y: jitterY };
        await this.mouse.click(jitterX, jitterY);
    }

    /**
   * 相对移动（基于当前鼠标位置）
   * @param {number} deltaX X 轴偏移量
   * @param {number} deltaY Y 轴偏移量
   * @param {number} duration 动画时长
   * @param {Function} easing 缓动函数
   */
    async moveRelative(deltaX, deltaY, duration = 500, easing = Easing.Quadratic.InOut) {
        const { x, y } = this.getPosition();
        await this.move(x + deltaX, y + deltaY, duration, easing);
    }

    async toPoint(el, options = {}) {
        const { min = 0.2, max = 0.8 } = options
        const box = await el.boundingBox();
        return {
            x: box.x + box.width * (min + (Math.random() * (max - min))),
            y: box.y + box.height * (min + (Math.random() * (max - min)))
        }
    }

    /**
     * 组合移动+点击操作
     * @param {number} x 目标 X 坐标
     * @param {number} y 目标 Y 坐标
     * @param {Object} options 配置项（透传给 move 和 click）
     */
    async moveToClick(x, y, options) {
        await this.move(x, y, options.duration, options.easing);
        await this.click(x, y, options);
    }

    // 更新所有补间动画
    update() {
        const now = Date.now();
        this.tweens.forEach(tween => tween.update(now));
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

module.exports = MouseSimulator;