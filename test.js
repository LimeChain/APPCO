function sqrt(num) {
    if (num == 0) return 0

    let root = num;
    let rootCalculations = (num + 1.0) / 2.0;

    for (var i = 0; i < 256; i++) {
        if (rootCalculations >= root) {
            break;
        }

        root = rootCalculations;
        console.log(root);
        console.log('-------------');
        rootCalculations = (num / root + root) / 2.0;
    }

    console.log(root);
}



function reCalculateRoot(root) {

    let modRoot = root % 10 // 15 % 10 = 5
    let tenDividedRoot = Math.trunc(root / 10)

    return tenDividedRoot * 100 + modRoot
}


function putInRange(num) {

    let funcStorageNumber = num


    for (let i = 0; i < 256; i++) {
        if (funcStorageNumber <= 100.0) {
            break
        }

        funcStorageNumber /= 100.0
    }

    return funcStorageNumber
}


function sqrt_sp(num) {

    let normalizedNumber = putInRange(num)

    let a = normalizedNumber * 5
    let root = 5

    let fractionLengthCounter = 1

    for (let i = 0; i < 256; i++) {
        if (fractionLengthCounter == 18) {
            break
        }

        if (a >= root) {

            a = a - root
            root += 10
        }
        else {
            a *= 100
            root = reCalculateRoot(root)
            fractionLengthCounter += 1
        }

    }

    return root / 100

}

console.log(sqrt_sp(1331));
