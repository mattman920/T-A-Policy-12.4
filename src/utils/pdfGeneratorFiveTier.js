/**
 * Generates the 5-Tier Analysis Report by opening a new tab with the Print View.
 * Matches the architecture of pdfGeneratorHealthCheck.js (Browser Fallback).
 */
export const generateFiveTierPDF = async (reportData) => {
    console.log("DEBUG: Generating 5-Tier PDF for", reportData.employee.name);

    if (window.electron && window.electron.generatePDF) {
        // Future Electron Support Stub
        // window.electron.generatePDF(reportData, '5-tier-analysis');
        console.warn("Electron PDF generation not fully implemented for 5-Tier yet. Falling back to browser print.");
    }

    try {
        // 1. Save data for the new tab to pick up
        localStorage.setItem('fiveTierPrintData', JSON.stringify(reportData));

        // 2. Open the specific print route
        window.open('#/print/5-tier-analysis', '_blank');

    } catch (e) {
        console.error("Browser print error:", e);
        alert("Failed to open print view.");
    }
};
