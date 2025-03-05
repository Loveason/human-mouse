const { chromium } = require('playwright');
const HumanMouse = require('./HumanMouseTongyi');

async function toPoint(element) {
    const box = await element.boundingBox()
    return {
        x: box.x + box.width * Math.random(0.3, 0.7),
        y: box.y + box.height * Math.random(0.3, 0.7)
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
    await humanMouse.showCursor();

    // const cfg = {
    //     baseSpeed: 300,
    //     stepDensity: 6,
    //     acceleration: 0.5,
    //     curveIntensity: 200
    // }

    // 点击开始按钮
    const startButton = page.locator('button:text("Start Test")');
    let point = await toPoint(startButton)
    await humanMouse.click(point.x, point.y, { speed: 0.8 });

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
            point = await toPoint(element)
            await humanMouse.click(point.x, point.y, { speed: 0.8 });
        }

        // 点击继续
        const continueButton = page.locator('button:text("Continue")');
        point = await toPoint(continueButton)
        await humanMouse.click(point.x, point.y, { speed: 0.8 });
        await page.waitForTimeout(1200);
        console.log('attempt:', attempt);
    }

    await browser.close();
})();