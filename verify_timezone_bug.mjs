
import { parseDate } from './verify_temp.mjs';

console.log("--- Timezone Mismatch Reproduction ---");

const dateStr = "2023-12-07"; // Input from Date Picker
const dateIso = "2023-12-07T00:00:00.000Z"; // Input from Database/JSON

const parsedStr = parseDate(dateStr);
const parsedIso = parseDate(dateIso);

console.log(`Input String: "${dateStr}"`);
console.log(`Parsed String: ${parsedStr.toString()} (Day: ${parsedStr.getDate()})`);

console.log(`Input ISO: "${dateIso}"`);
console.log(`Parsed ISO: ${parsedIso.toString()} (Day: ${parsedIso.getDate()})`);

const diffTime = Math.abs(parsedStr - parsedIso);
const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

console.log(`Difference in Days: ${diffDays}`);

if (diffDays !== 0) {
    console.log("FAIL: Dates should be identical but are different due to TZ mismatch.");
} else {
    console.log("PASS: Dates match.");
}
