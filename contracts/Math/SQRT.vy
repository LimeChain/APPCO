@public
@constant
def sqrt(num: decimal) -> uint256:
    if num == 0.0:
        return 0

    normalization: decimal = 1000000000000000000.0

    assert num >= 1.0

    root: decimal = num
    rootCalculations: decimal = (num + 1.0) / 2.0

    for i in range(256):
        if (rootCalculations >= root):
            break

        root = rootCalculations
        rootCalculations = (num / root + root) / 2.0

    root *= normalization

    return convert(root, uint256)

@public
@constant
def calc_purchase(tokenSupply: uint256, etherSupply: uint256, etherAmount: uint256) -> uint256:
    # tokenSupply * (sqrt(1 + (etherAmount/etherSupply)) - 1)

    normalization: uint256 = 1000000000000000000

    ethSupplyAsDecimal: decimal = convert(etherSupply, decimal)
    etherAmountAsDecimal: decimal = convert(etherAmount, decimal)

    temp: decimal = (1.0 + etherAmountAsDecimal / ethSupplyAsDecimal)
    sqrtCalc: uint256 = self.sqrt(temp)
    tokensAfterPurchase: uint256 = tokenSupply * (sqrtCalc - 1) / normalization
    return tokensAfterPurchase

@public
@constant
def calc_sell(tokenSupply: uint256, etherSupply: uint256, tokenAmount: uint256) -> uint256:
    # etherSuply * (1 - (1 - tokenAmount / tokenSuply) ^2)
    normalization: decimal = 1000000000000000000.0

    tokenSupplyAsDecimal: decimal = convert(tokenSupply, decimal)
    ethSupplyAsDecimal: decimal = convert(etherSupply, decimal)
    tokenAmountAsDecimal: decimal = convert(tokenAmount, decimal)


    a: decimal = 1.0 - tokenAmountAsDecimal / tokenSupplyAsDecimal
    b: decimal = a * a
    c: decimal = 1.0 - b
    return convert(ethSupplyAsDecimal * c, uint256)
