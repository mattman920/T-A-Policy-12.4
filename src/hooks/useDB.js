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
        localStorage.setItem('last_active_db', dbName);
    } else {
        // Check for last active DB or use default
        const lastActive = localStorage.getItem('last_active_db');
        dbName = lastActive || 'attendance-tracker-v11';

        const newUrl = new URL(window.location);
        newUrl.searchParams.set('db', dbName);
        window.history.replaceState(null, '', newUrl.toString());
    }

    // Antigravity: Track known databases for Settings page
    try {
        const stored = localStorage.getItem('available_databases');
        let dbs = stored ? JSON.parse(stored) : [];
        if (!dbs.includes(dbName)) {
            dbs.push(dbName);
            localStorage.setItem('available_databases', JSON.stringify(dbs));
        }
    } catch (e) {
        console.warn('Failed to update available_databases list:', e);
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

                // Retry logic for connection (to handle Netlify password prompt delays)
                let retryAttempts = 0;
                const maxAttempts = 8;
                let isConnected = false;

                while (retryAttempts < maxAttempts && !isConnected) {
                    try {
                        retryAttempts++;
                        await connect(database, dbName, netlifyUrl);
                        connectionRef.current = dbName;
                        setConnected(true);
                        isConnected = true;
                    } catch (e) {
                        console.warn(`Connection attempt ${retryAttempts}/${maxAttempts} failed:`, e.message);
                        if (retryAttempts < maxAttempts) {
                            // Exponential backoff: 1s, 1.5s, 2.25s, ... 
                            // Total wait time approx 49s for 8 attempts
                            const delay = 1000 * Math.pow(1.5, retryAttempts - 1);
                            await new Promise(resolve => setTimeout(resolve, delay));
                        } else {
                            throw e; // Use the outer catch block for final failure
                        }
                    }
                }

                // Debug: Check if data is actually in the DB with polling
                let attempts = 0;
                const checkData = async () => {
                    try {
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
                        } else if (attempts < 10) { // Increased max retries for empty db check
                            attempts++;
                            setTimeout(checkData, 1000);
                        }
                    } catch (e) {
                        console.warn(`useDB: Connection verification failed (attempt ${attempts + 1}/10):`, e.message);
                        if (attempts < 10) {
                            attempts++;
                            // Retry faster on error than on empty data
                            setTimeout(checkData, 1500);
                        } else {
                            console.error('useDB: Connection verification gave up after 10 attempts.');
                        }
                    }
                };
                checkData();
            } catch (error) {
                console.error('Fireproof connect failed:', error);
                setConnected(true); // Allow to proceed even if connect fails (offline mode)
            }
        };

        initConnection();
    }, [database, dbName]);

    return { db: database, useLiveQuery, connected };
}

