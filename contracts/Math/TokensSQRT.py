@public
def tokens_sqrt(num: uint256) -> uint256:
    if num == 0:
        return 0
    
    normalization: decimal = 1000000000000000000.0
    normalizedNumber: decimal = convert(num, decimal) / normalization

    assert normalizedNumber >= 1.0
    
    root: decimal = normalizedNumber
    rootCalculations: decimal = (normalizedNumber + 1.0) / 2.0
    
    for i in range(256):
        if (rootCalculations >= root):
            break
        
        root = rootCalculations
        rootCalculations = (normalizedNumber / root + root) / 2.0
    
    root *= normalization

    return convert(root, uint256)