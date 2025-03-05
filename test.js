function randomChoices(population, { weights, cumWeights, k = 1 } = {}) {
    // 参数校验
    if (!Array.isArray(population)) throw new Error("population 必须是数组");
    if (weights && cumWeights) throw new Error("不能同时指定 weights 和 cumWeights");

    // 生成累积权重数组
    let cumulative = [];
    if (cumWeights) {
        cumulative = [...cumWeights];
    } else if (weights) {
        cumulative = weights.reduce((acc, w, i) => {
            acc.push(i === 0 ? w : w + acc[i - 1]);
            return acc;
        }, []);
    } else {
        // 默认等权重
        cumulative = population.map((_, i) => i + 1);
    }

    // 计算总权重
    const total = cumulative[cumulative.length - 1] || 0;

    // 执行 k 次选择（优化版二分查找）
    return Array.from({ length: k }, () => {
        const rand = Math.random() * total;
        let left = 0, right = cumulative.length - 1;

        while (left <= right) {
            const mid = (left + right) >> 1; // 位运算优化
            if (cumulative[mid] < rand) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return population[Math.min(left, population.length - 1)];
    });
}

function range(start, end) {
    console.log('start:', start, 'end:', end)
    return Array.from({ length: end - start }, (_, i) => start + i);
}

function randomChoice(arr) {
    if (arr.length === 0) {
        throw new Error('数组不能为空');
    }
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}

// const items = [[20, 45], [45, 75], [75, 100]];
// const weights = [0.2, 0.65, 0.15]; // 总权重 6，C 的概率为 3/6=50%
// const choices = randomChoices([[20, 45], [45, 75], [75, 100]], { weights: [0.2, 0.65, 0.15] })

const choice = randomChoice(range(...randomChoices([[20, 45], [45, 75], [75, 100]], { weights: [0.2, 0.65, 0.15] })[0]))

// console.log(choices);
console.log(choice);

console.log(randomChoices([1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [0.15, 0.36, 0.17, 0.12, 0.08, 0.04, 0.03, 0.02, 0.015, 0.005])[0])
// console.log(randomChoice(range(...randomChoices([[20, 45], [45, 75], [75, 100]], { weights: [0.2, 0.65, 0.15] }))))