import { useFireproof } from '@fireproof/react';
import { connect } from '@fireproof/netlify';

export function useDB() {
    let dbName;
    const urlParams = new URLSearchParams(window.location.search);
    const existingDb = urlParams.get('db');

    if (existingDb) {
        dbName = existingDb;
    } else {
        dbName = Math.random().toString(36).substring(2, 15);
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('db', dbName);
        window.history.replaceState(null, '', newUrl.toString());
    }

    const { database, useLiveQuery } = useFireproof(dbName);

    try {
        connect(database);
    } catch (error) {
        console.warn('Fireproof connect failed:', error);
    }

    return { db: database, useLiveQuery };
}
