
const { v4: uuidv4 } = require('uuid');

try {
    console.log('UUID:', uuidv4());
} catch (e) {
    console.error('Error:', e);
}
