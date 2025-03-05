const { chromium } = require('playwright');
const MouseSimulator = require('./MouseSimulator');
const { Easing } = require('@tweenjs/tween.js');

(async () => {
    // const browser = await chromium.launch({ headless: false });
    // const page = await browser.newPage();
    // await page.goto('https://example.com');

    // const mouse = new MouseSimulator(page);
    // await mouse.showCursor()
    // // 移动到指定坐标并点击
    // await mouse.moveToClick(100, 100, {
    //     duration: 800,      // 移动耗时 800ms
    //     easing: Easing.Sinusoidal.InOut,
    //     delay: 300,         // 点击前随机延迟 0-300ms
    //     jitter: 10          // 点击位置 ±5px 随机偏移
    // });

    // 链式调用多个操作
    // await mouse.move(200, 200, 1000)
    //     .then(() => mouse.click(200, 200))
    //     .then(() => mouse.moveToClick(300, 300));

    // await browser.close();

    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized']
    });
    // 创建无视口限制的上下文
    const context = await browser.newContext({
        viewport: null // 禁用视口限制，使用实际窗口大小
    });

    const page = await context.newPage();

    await page.goto('https://humanbenchmark.com/tests/chimp');
    const mouse = new MouseSimulator(page);

    await mouse.showCursor();

    function createNoisyEasing(randomProportion, easingFunction) {
        const normalProportion = 1.0 - randomProportion
        return function (k) {
            return randomProportion * Math.random() + normalProportion * easingFunction(k)
        }
    }

    // 点击开始按钮
    const startButton = page.locator('button:text("Start Test")');
    const opts = {
        duration: 800,      // 移动耗时 800ms
        // easing: createNoisyEasing(0.1, Easing.Quintic.InOut),
        easing: Easing.Quintic.InOut,
        delay: 100,         // 点击前随机延迟 0-300ms
        jitter: 5          // 点击位置 ±5px 随机偏移
    }
    let p = await mouse.toPoint(startButton)
    await mouse.moveToClick(p.x, p.y, opts);

    for (let attempt = 0; attempt < 30; attempt++) {
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
            p = await mouse.toPoint(element)
            await mouse.moveToClick(p.x, p.y, opts);
        }

        // 点击继续
        const continueButton = page.locator('button:text("Continue")');
        p = await mouse.toPoint(continueButton)
        await mouse.moveToClick(p.x, p.y, opts);
        await page.waitForTimeout(500);
        console.log('attempt:', attempt);
    }

    await browser.close();
})();