/**
 * Compares two arrays. From http://stackoverflow.com/a/14853974/1629802
 *
 * @param {Array} array1
 * @param {Array} array2
 * @returns {Boolean} Whether the arrays are equal
 */
exports.equals = function equals(array1, array2) {
    // If either is falsy or lengths are different, return
    if (!array1 || !array2 || array1.length !== array2.length) return false;

    for (var i = 0, l = array1.length; i < l; i++) {
        // Check if we have nested arrays
        if (array1[i] instanceof Array && array2[i] instanceof Array) {
            // Recurse into nested arrays
            if (!equals(array1[i], array2[i])) return false;
        } else if (array1[i] != array2[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
};
