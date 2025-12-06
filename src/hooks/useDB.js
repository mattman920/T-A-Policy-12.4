import { useFireproof } from 'use-fireproof';
import { connect } from '@fireproof/netlify';
import { useEffect, useRef, useState } from 'react';

import { deepSanitize } from '../utils/dataUtils';

export function useDB() {
    let dbName;
    const urlParams = new URLSearchParams(window.location.search);
    const existingDb = urlParams.get('db');

    if (existingDb) {
        dbName = existingDb;
    } else {
        // Use a fixed database name for persistence
        dbName = 'attendance-tracker-v8';
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('db', dbName);
        window.history.replaceState(null, '', newUrl.toString());
    }

    const { database, useLiveQuery } = useFireproof(dbName);

    const connectionRef = useRef(null);

    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (connectionRef.current === dbName) {
            setConnected(true);
            return;
        }

        const initConnection = async () => {
            try {
                let origin = window.location.origin;
                if (window.location.hostname === 'localhost') {
                    origin = 'http://localhost:8888';
                }
                const netlifyUrl = origin.replace(/^https?/, 'netlify');
                console.log('Fireproof connecting to:', netlifyUrl, 'with db:', dbName);
                const connection = await connect(database, dbName, netlifyUrl);
                connectionRef.current = dbName;
                setConnected(true);

                // Debug: Check if data is actually in the DB with polling
                let attempts = 0;
                const checkData = async () => {
                    const allDocs = await database.allDocs();

                    if (allDocs.rows.length > 0) {
                        // Repair data if needed
                        for (const row of allDocs.rows) {
                            const doc = row.value;
                            const sanitized = deepSanitize(doc);
                            // Simple check: if JSON stringify differs, it needed sanitization
                            if (JSON.stringify(doc) !== JSON.stringify(sanitized)) {
                                await database.put(sanitized);
                            }
                        }
                    }

                    if (allDocs.rows.length === 0 && attempts < 5) {
                        attempts++;
                        setTimeout(checkData, 1000);
                    }
                };
                checkData().catch(e => console.error('Error in checkData:', e));
            } catch (error) {
                console.error('Fireproof connect failed:', error);
                setConnected(true); // Allow to proceed even if connect fails (offline mode)
            }
        };

        initConnection();
    }, [database, dbName]);

    return { db: database, useLiveQuery, connected };
}

