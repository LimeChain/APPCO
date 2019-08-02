// PurchaseReturn = ContinuousTokenSupply * ((1 + ReserveTokensReceived / ReserveTokenBalance) ^ (ReserveRatio) - 1)
const buyCalc = (
    continuousTokenSupply,
    preMintedAmount,
    amount
) => {
    const x1 = continuousTokenSupply ** 2;
    const x2 = 2 * amount * preMintedAmount;
    const x3 = (x1 + x2) ** 0.5;
    return x3 - continuousTokenSupply;
};

const sellCalc = (
    continuousTokenSupply,
    reserveSupply,
    tokenAmount
) => {
    const a = 1 - tokenAmount / continuousTokenSupply;
    const b = 1 - a * a;

    return reserveSupply * b;
};

module.exports = {
    buyCalc,
    sellCalc
};

