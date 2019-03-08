@private
@constant
def recalculate_root(root: decimal) -> decimal:

    lastRootDigit: decimal = root % 10.0
    rootWithoutLastDigit: uint256 = convert(root / 10.0, uint256)

    return convert(rootWithoutLastDigit, decimal) * 100.0 + lastRootDigit


@private
@constant
def normalize(num: decimal) -> (decimal, int128):

    normalizationSteps: int128 = 0
    rangedNumber: decimal = num

    for i in range(256):
        if rangedNumber <= 100.0:
            normalizationSteps = i
            break

        rangedNumber /= 100.0

    return rangedNumber, normalizationSteps


# High fraction precision sqrt
# Advantages:
#   Vyper decimals are rounded at 10 fraction symbol, and this is a problem when working with Tokens calculations
#   This algorithm provides you a fraction containing as many symbols as you want
#   It is useful for Tokens Calculations


@private
@constant
def sqrt_hfp(num: decimal, fractionLength: int128) -> uint256:

    # normalizedNumber => 0 < normalizedNumber < 100
    normalizedNumber: decimal = 0.0
    normalizationSteps: int128 = 0

    (normalizedNumber, normalizationSteps) = self.normalize(num)

    normalizationSteps += fractionLength + 1

    root: decimal = 5.0
    rootCalculation: decimal = normalizedNumber * root

    fractionLengthCounter: int128 = 0

    for i in range(256):

        if fractionLengthCounter == normalizationSteps:
            break

        if rootCalculation >= root:
            rootCalculation = rootCalculation - root
            root += 10.0
        else:
            rootCalculation *= 100.0
            root = self.recalculate_root(root)
            fractionLengthCounter += 1

    return convert(root / 100.0, uint256)


# This function could be used only in Vyper contracts because of decimal input
@public
@constant
def sqrt_decimal(num: decimal, fractionLength: int128) -> uint256:
    return self.sqrt_hfp(num, fractionLength)


# This function could be used from Vyper and Solidity contracts
@public
@constant
def sqrt_uint256(num: uint256, fractionLength: int128) -> uint256:
    return self.sqrt_hfp(convert(num, decimal), fractionLength)
