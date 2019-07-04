@public
def tokens_sqrt(num: uint256) -> uint256:
    if num == 0:
        return 0
    
    normalization: decimal = 1000000000000000000.0
    normalizedNumber: decimal = convert(num, decimal) / normalization

    assert normalizedNumber >= 1.0
    
    root: decimal = sqrt(normalizedNumber)

    root *= normalization

    return convert(root, uint256)