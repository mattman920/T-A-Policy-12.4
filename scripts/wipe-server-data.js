// Native fetch is available in Node.js 18+

async function wipeServerData() {
    const dbName = 'attendance-tracker-v6';
    const baseUrl = 'https://timeattendancetracker.netlify.app';
    const url = `${baseUrl}/fireproof?meta=${dbName}`;

    console.log(`Targeting DB: ${dbName}`);
    console.log(`URL: ${url}`);
    console.log('Sending DELETE request...');

    try {
        const response = await fetch(url, {
            method: 'DELETE'
        });

        if (response.ok) {
            const text = await response.text();
            console.log('Success:', text);
            console.log('Server data wiped. Please reload all open browser tabs to re-sync.');
        } else {
            console.error('Failed:', response.status, response.statusText);
            const text = await response.text();
            console.error('Response:', text);
        }
    } catch (error) {
        console.error('Error executing wipe:', error);
    }
}

wipeServerData();
