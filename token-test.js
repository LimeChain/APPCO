

let DAI = 1000000000000000000 // 1 DAI
let MGL = 1000000000000000000 // 1 MGL

// ===== Variables to  play with

let initialCOTokenSupply = 7999 * MGL
let initialDAIInvestment = 8000 * DAI
let timesDAI = 10000; // Investment amount in DAI
let investmentsCount = 15;

// =====

let buyCalc = function buyCalc(continuousTokenSupply, totalInvestedDAI, amount) {
	return continuousTokenSupply * ((1 + amount / totalInvestedDAI) ** (0.5) - 1)
};

let sellCalc = function sellCalc(continuousSupply, reserveSupply, tokenAmount) {
	return (reserveSupply * (1 - (1 - tokenAmount / continuousSupply) ** 2));
};

const calculator = {
	buyCalc,
	sellCalc
}

let run = () => {
	let investment = timesDAI * DAI

	for (let i = 0; i < investmentsCount; i++) {
		let res = calculator.buyCalc(initialCOTokenSupply, initialDAIInvestment, investment);
		let tokensPerInvestment = res / 1000000000000000000;
		let tokensPerDaIInvestment = tokensPerInvestment / timesDAI;

		console.log(`Tokens Per Investment: ${tokensPerInvestment.toFixed(15)} , Tokens Per 1 DAI investment: ${tokensPerDaIInvestment.toFixed(15)}`)

		initialCOTokenSupply += res;
		initialDAIInvestment += investment;
	}
	console.log('=================')

	console.log('Tokens per 10x investment will give you this much tokens:')

	let res = calculator.buyCalc(initialCOTokenSupply, initialDAIInvestment, 10 * investment);
	console.log(res / 1000000000000000000)

	console.log('=================')

	console.log("Total Tokens Supply:")

	console.log(initialCOTokenSupply / 1000000000000000000)

	console.log("Total DAI Invested:")
	console.log(initialDAIInvestment / 1000000000000000000)
}

run()

