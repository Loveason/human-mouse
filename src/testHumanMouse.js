const { chromium } = require('playwright');
const HumanMouse = require('./HumanMouse');


// 使用示例
(async () => {
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
    const mouse = new HumanMouse(page, {
        minSteps: 30,
        maxSteps: 80,
    });

    await mouse.showCursor();

    // 点击开始按钮
    const startButton = page.locator('button:text("Start Test")');
    const opts = {
        // steps: 50,
        // randomness: 0.4,
        speed: 0.8,
    }
    await mouse.clickEl(startButton, opts);

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
            await mouse.clickEl(element, opts);
        }

        // 点击继续
        const continueButton = page.locator('button:text("Continue")');
        await mouse.clickEl(continueButton, opts);
        await page.waitForTimeout(500);
        console.log('attempt:', attempt);
    }

    await browser.close();
})();