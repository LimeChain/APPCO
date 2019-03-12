// PurchaseReturn = ContinuousTokenSupply * ((1 + ReserveTokensReceived / ReserveTokenBalance) ^ (ReserveRatio) - 1)
let buyCalc = function buyCalc(continuousSupply, reserveSupply, amount) {
    return continuousSupply * ((1 + amount / reserveSupply) ** (0.5) - 1)
};

let sellCalc = function sellCalc(continuousSupply, reserveSupply, tokenAmount) {
    return (reserveSupply * (1 - (1 - tokenAmount / continuousSupply) ** 2));
};

module.exports = {
    buyCalc,
    sellCalc
};

