
const dateStr = '2023-10-01';
const date = new Date(dateStr);
console.log(`Input: ${dateStr}`);
console.log(`Parsed: ${date.toString()}`);
console.log(`UTC: ${date.toUTCString()}`);
console.log(`Month (local): ${date.getMonth()}`);
console.log(`Date (local): ${date.getDate()}`);

const dateStr2 = '2023-10-01T00:00:00';
const date2 = new Date(dateStr2);
console.log(`\nInput: ${dateStr2}`);
console.log(`Parsed: ${date2.toString()}`);
console.log(`Month (local): ${date2.getMonth()}`);
