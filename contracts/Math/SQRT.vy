@public
@constant
def sqrt_high_precision(num: decimal) -> uint256:
    if num == 0.0:
        return 0

    assert num >= 1.0


    root: decimal = sqrt(num)
    

    return convert(root, uint256)

@public
@constant
def calc_purchase(tokenSupply: uint256, preMintedAmount: uint256, amount: uint256) -> uint256:
    # 

    normalization: uint256 = 100000000

    tokenSupplyTruncated: uint256 = tokenSupply / normalization
    preMintedAmountTruncated: uint256 = preMintedAmount / normalization
    amountTruncated: uint256 = amount / normalization

    x1: uint256 = tokenSupplyTruncated * tokenSupplyTruncated
    x2: uint256 = 2 * amountTruncated * preMintedAmountTruncated
    x3: uint256 = x1 + x2
    x3Decimal: decimal = convert(x3, decimal)
    x4: uint256 = self.sqrt_high_precision(x3Decimal)

    res: uint256 = x4 - tokenSupplyTruncated
    
    return res * normalization

@public
@constant
def calc_sell(tokenSupply: uint256, totalSupply: uint256, tokenAmount: uint256) -> uint256:
    # totalSupply * (1 - (1 - tokenAmount / tokenSupply) ^2)

    tokenSupplyAsDecimal: decimal = convert(tokenSupply, decimal)
    totalSupplyAsDecimal: decimal = convert(totalSupply, decimal)
    tokenAmountAsDecimal: decimal = convert(tokenAmount, decimal)

    a: decimal = 1.0 - tokenAmountAsDecimal / tokenSupplyAsDecimal
    b: decimal = 1.0 - (a * a)
    return convert(totalSupplyAsDecimal * b, uint256)
