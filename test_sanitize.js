const deepSanitize = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(deepSanitize);
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const value = deepSanitize(obj[key]);
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {});
    }
    return obj;
};

const testObj = {
    a: 1,
    b: undefined,
    c: {
        d: 2,
        e: undefined,
        f: [3, undefined, 4]
    },
    g: [undefined]
};

const sanitized = deepSanitize(testObj);
console.log(JSON.stringify(sanitized, null, 2));

if (JSON.stringify(sanitized) === JSON.stringify({ a: 1, c: { d: 2, f: [3, undefined, 4] }, g: [undefined] })) {
    // Wait, arrays with undefined? JSON.stringify turns undefined in arrays to null.
    // deepSanitize maps array elements. deepSanitize(undefined) returns undefined.
    // [undefined] becomes [undefined].
    // JSON.stringify([undefined]) is [null].
    // Fireproof might not like [undefined] in arrays either!
    console.log("Sanitized object contains undefined in array?");
}
