// PurchaseReturn = ContinuousTokenSupply * ((1 + ReserveTokensReceived / ReserveTokenBalance) ^ (ReserveRatio) - 1)
let buyCalc = function buyCalc(continuousTokenSupply, totalInvestedDAI, amount) {
    return continuousTokenSupply * ((1 + amount / totalInvestedDAI) ** (0.5) - 1)
};

let sellCalc = function sellCalc(continuousSupply, reserveSupply, tokenAmount) {
    return (reserveSupply * (1 - (1 - tokenAmount / continuousSupply) ** 2));
};

module.exports = {
    buyCalc,
    sellCalc
};

