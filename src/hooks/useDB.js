import { useFireproof } from 'use-fireproof';
import { connect } from '@fireproof/netlify';

export function useDB() {
    let dbName;
    const urlParams = new URLSearchParams(window.location.search);
    const existingDb = urlParams.get('db');

    if (existingDb) {
        dbName = existingDb;
    } else {
        // Use a fixed database name for persistence
        dbName = 'attendance-tracker-v3';
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('db', dbName);
        window.history.replaceState(null, '', newUrl.toString());
    }

    const { database, useLiveQuery } = useFireproof(dbName);

    try {
        let origin = window.location.origin;
        if (window.location.hostname === 'localhost') {
            origin = 'http://localhost:8888';
        }
        const netlifyUrl = origin.replace(/^http/, 'netlify');
        connect(database, '', netlifyUrl);
    } catch (error) {
        console.warn('Fireproof connect failed:', error);
    }

    return { db: database, useLiveQuery };
}
