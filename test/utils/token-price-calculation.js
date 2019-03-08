// PurchaseReturn = ContinuousTokenSupply * ((1 + ReserveTokensReceived / ReserveTokenBalance) ^ (ReserveRatio) - 1)

let continuousSupply = 1000000000000000000;
let reserveSupply = 1000000000000000000;
let buyCalc = function buyCalc(amount) {
    //return continuousSupply * ((1 + amount / reserveSupply) ** (0.5) - 1);
    // 3.8 (1 + 1 / 4) ** 0.5 - 1 = 3.8  * (1.12 - 1) = 3.8 *
    for (let i = 0; i < 2; i++) {
        continuousSupply += continuousSupply * ((1 + amount / reserveSupply) ** (0.5) - 1);
        reserveSupply += amount;
    }

    return continuousSupply;
};

let buyCalc1 = function buyCalc1(continuousSupply1, reserveSupply1, amount) {
    return continuousSupply1 * ((1 + amount / reserveSupply1) ** (0.5) - 1)
};


let sellCalc = function sellCalc(continuousSupply, reserveSupply, tokenAmount) {
    return (reserveSupply * (1 - (1 - tokenAmount / continuousSupply) ** 2));
};

module.exports = {
    buyCalc,
    buyCalc1,
    sellCalc
};