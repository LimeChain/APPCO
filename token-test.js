const calculator = require('./test/utils/token-price-calculation');

let DAI = 1000000000000000000 // 1 DAI
let totalCOSupply = 499 * DAI
let totalDAIInvested = 500 * DAI
let timesDAI = 1000;
let investment = timesDAI * DAI



for (let i = 0; i < 150; i++) {
	let res = calculator.buyCalc(totalCOSupply, totalDAIInvested, investment);
	let tokensPerInvestment = res / 1000000000000000000;
	let tokensPerDaIInvestment = tokensPerInvestment / timesDAI;

	console.log(`Tokens Per Investment: ${tokensPerInvestment.toFixed(15)} , Tokens Per DAI in investment: ${tokensPerDaIInvestment.toFixed(15)}`)

	totalCOSupply += res;
	totalDAIInvested += investment;
}
console.log('=================')

let res = calculator.buyCalc(totalCOSupply, totalDAIInvested, 10 * investment);
console.log(res / 1000000000000000000)

console.log('=================')

console.log(totalCOSupply / 1000000000000000000)
console.log(totalDAIInvested / 1000000000000000000)