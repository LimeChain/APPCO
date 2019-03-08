@public
def tokens_sqrt(num: uint256) -> uint256:
    if num == 0:
        return 0
    

    # Divide by 10000000000 gives better approximation because of rounding
    normalization: decimal = 10000000000.0

    tokenDecimals: decimal = 1000000000000000000.0
    normalizedNumber: decimal = (convert(num, decimal) / tokenDecimals) * normalization

    assert normalizedNumber >= 1.0
    
    root: decimal = normalizedNumber
    rootCalculations: decimal = (normalizedNumber + 1.0) / 2.0
    
    for i in range(256):
        if (rootCalculations >= root):
            break
        
        root = rootCalculations
        rootCalculations = (normalizedNumber / root + root) / 2.0
    
    # Zero rounding issues 
    root *= normalization * 1000.0

    return convert(root, uint256)