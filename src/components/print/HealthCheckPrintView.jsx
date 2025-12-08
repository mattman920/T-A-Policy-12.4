import React, { useEffect, useState } from 'react';
import HealthCheckTemplate from './HealthCheckTemplate';

const HealthCheckPrintView = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        // 1. Electron Mode
        if (window.electron && window.electron.onReceiveData) {
            const removeListener = window.electron.onReceiveData((receivedData) => {
                console.log("Received Data for Print (Electron):", receivedData);
                setData(receivedData);
            });
            return () => removeListener();
        }

        // 2. Browser Mode (Fallback)
        const localData = localStorage.getItem('healthCheckPrintData');
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                console.log("Received Data for Print (Browser):", parsed);
                setData(parsed);
                // Clear after read to prevent stale data on reload (optional, but good practice)
                // localStorage.removeItem('healthCheckPrintData'); 
            } catch (e) {
                console.error("Failed to parse print data", e);
            }
        } else {
            console.warn("No print data found in Electron or LocalStorage.");
        }
    }, []);

    // Auto-Print Trigger for Browser Mode
    useEffect(() => {
        if (data && !window.electron) {
            // Small delay to ensure styles/fonts are loaded
            const timer = setTimeout(() => {
                window.print();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [data]);

    if (!data) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontFamily: 'sans-serif',
                color: '#888'
            }}>
                Preparing Document...
            </div>
        );
    }

    return <HealthCheckTemplate data={data} />;
};

export default HealthCheckPrintView;
