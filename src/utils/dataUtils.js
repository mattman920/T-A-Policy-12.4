export const deepSanitize = (obj) => {
    if (Number.isNaN(obj)) return null; // Handle NaN
    if (obj instanceof Date) {
        return obj.toISOString();
    }
    if (Array.isArray(obj)) {
        return obj.map(v => {
            const sanitized = deepSanitize(v);
            return sanitized === undefined ? null : sanitized;
        });
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
