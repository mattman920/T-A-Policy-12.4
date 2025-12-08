import React, { useEffect, useState } from 'react';
import FiveTierTemplate from './FiveTierTemplate';

const FiveTierPrintView = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        // 1. Electron Mode (Future Proofing)
        if (window.electron && window.electron.onReceiveData) {
            const removeListener = window.electron.onReceiveData((receivedData) => {
                console.log("Received Data for 5-Tier Print (Electron):", receivedData);
                setData(receivedData);
            });
            return () => removeListener();
        }

        // 2. Browser Mode (Fallback/Primary for now)
        const localData = localStorage.getItem('fiveTierPrintData');
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                console.log("Received Data for 5-Tier Print (Browser):", parsed);
                setData(parsed);
            } catch (e) {
                console.error("Failed to parse 5-tier print data", e);
                setError('Failed to load report data.');
            }
        } else {
            console.warn("No print data found in localStorage for 'fiveTierPrintData'.");
            setError('No report data found. Please generate the report again.');
        }
    }, []);

    // Auto-Print Trigger
    useEffect(() => {
        if (data && !window.electron) {
            // Small delay to ensure styles/fonts are loaded
            const timer = setTimeout(() => {
                window.print();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [data]);

    if (error) {
        return (
            <div style={{ padding: '20px', color: 'red', textAlign: 'center', fontFamily: 'sans-serif' }}>
                Error: {error}
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontFamily: 'sans-serif',
                color: '#888',
                backgroundColor: '#0f172a' // Match dark bg
            }}>
                Preparing Document...
            </div>
        );
    }

    return <FiveTierTemplate data={data} />;
};

export default FiveTierPrintView;
