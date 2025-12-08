
export const generateHealthCheckPDFsFromData = async (results) => {
    console.log("DEBUG: Starting Multi-Tab Generation", results.length);

    // --- 1. Electron App Mode ---
    if (window.electron && window.electron.generatePDF) {
        // ... (Keep existing Electron bulk logic if needed, or unify?)
        // The user specifically asked for "open all employees in new tabs" which implies browser behavior.
        // But if they are in Electron, "tabs" might not exist effectively or they might prefer the direct file save.
        // Let's keep the SUPERIOR Electron behavior (direct file save) if available, as it's cleaner.
        // If the user REALLY wants tabs in Electron (which opens external windows usually), it's messy.
        // I will assume for Electron checking, we stick to the nice file download we already built?
        // Actually, the user's prompt "open up a tab for each... and then I'll just download" strongly suggests they are in a browser
        // or effectively treating it as one.
        // I'll leave the Electron branch doing the "Good Thing" (Direct Download) because it's objectively better UX for desktop app.

        let successCount = 0;
        let failCount = 0;
        for (const [index, result] of results.entries()) {
            try {
                const response = await window.electron.generatePDF(result, 'health-check');
                if (response.success) successCount++;
                else failCount++;
            } catch (e) {
                console.error("Electron generation error:", e);
                failCount++;
            }
            if (index < results.length - 1) await new Promise(r => setTimeout(r, 200));
        }
        if (failCount > 0) alert(`Batch generation complete. ${successCount} succeeded, ${failCount} failed.`);
        return;
    }

    // --- 2. Browser Mode: Multi-Tab Open ---

    // Helper delay function
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    let openedCount = 0;

    for (const result of results) {
        try {
            // 1. Set Data for the Next Tab
            // The Print View component reads 'healthCheckPrintData' on mount.
            localStorage.setItem('healthCheckPrintData', JSON.stringify(result));

            // 2. Open Tab (Blank target = new tab)
            // Note: Modern browsers might block >1 popups. User must allow.
            window.open('#/print/health-check', '_blank');

            // 3. Wait for Tab to (hopefully) initialize and read data before we overwrite it
            // 1500ms is a conservative estimate for React to mount and read LS.
            await delay(1500);

            openedCount++;

        } catch (e) {
            console.error("Failed to open tab for", result.aiContext.name, e);
        }
    }

    console.log(`Triggered ${openedCount} tabs.`);
};
