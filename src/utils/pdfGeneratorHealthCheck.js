import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { calculateCurrentPoints, determineTier, calculateQuarterlyStart, TIERS } from './pointCalculator';
import { getQuarterKey } from './dateUtils';
import { getHealthStage, prepareAiPayload } from '../services/healthCheckService';
import { generateHealthCheckFeedback } from '../services/aiService';

export const generateHealthCheckPDF = async (employees, startDate, endDate, data) => {
    const violations = data.violations || [];
    const penalties = data.settings?.violationPenalties || {};
    const issuedDAs = data.issuedDAs || [];

    const daSettings = data.settings?.daSettings;

    // Filter violations by date range for the report table
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Adjust end date to include the full day
    end.setHours(23, 59, 59, 999);

    const generatedFiles = [];

    // Helper to get quarter date range
    const getQuarterDateRange = (date) => {
        const d = new Date(date);
        const quarter = Math.floor((d.getMonth() + 3) / 3);
        const startMonth = (quarter - 1) * 3;
        const start = new Date(d.getFullYear(), startMonth, 1);
        const end = new Date(d.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999);
        return { start, end };
    };

    // Determine the quarter based on the REPORT END DATE
    // "If you select a period that is in q4 it should displays... based on the quarter the selected period lands in"
    const reportEnd = new Date(endDate);
    const { start: quarterStart, end: quarterEnd } = getQuarterDateRange(reportEnd);

    for (let i = 0; i < employees.length; i++) {
        const employee = employees[i];
        const doc = new jsPDF();

        // 1. Calculate Score (Based on the QUARTER of the report period)
        const empViolationsAll = violations.filter(v => v.employeeId === employee.id);

        // Filter violations to only those within the relevant quarter
        const empViolationsInQuarter = empViolationsAll.filter(v => {
            const d = new Date(v.date);
            return d >= quarterStart && d <= quarterEnd;
        });

        const qKey = getQuarterKey(quarterStart);
        const startPoints = calculateQuarterlyStart(qKey, violations, data.settings);
        const currentScore = calculateCurrentPoints(startPoints, empViolationsInQuarter, penalties);

        // Violations in the specific 2-week range (for the table display)
        const empViolationsInRange = empViolationsAll.filter(v => {
            const d = new Date(v.date);
            return d >= start && d <= end;
        });

        // 2. Get Health Stage & AI Feedback
        const stage = getHealthStage(currentScore, daSettings);
        const tier = determineTier(currentScore, daSettings);
        const aiPayload = prepareAiPayload(employee, currentScore, empViolationsInRange, daSettings);
        const aiFeedback = await generateHealthCheckFeedback(aiPayload, data.settings?.geminiApiKey);

        // 3. Check for DA Alert Logic
        // Alert only if in Coaching, Severe, or Final AND DA not issued
        const daKey = `${employee.id}-${tier.name}`;
        const isIssued = issuedDAs.includes(daKey);
        const needsAlert = (tier.name === TIERS.COACHING.name || tier.name === TIERS.SEVERE.name || tier.name === TIERS.FINAL.name) && !isIssued;

        // 4. Draw Alert Banner (Top of Page) if needed
        let yPos = 20;

        // Calculate Reward Tier for Banner
        let rewardTier = null;
        if (currentScore >= 126) {
            if (currentScore >= 145) rewardTier = "Gold Tier";
            else if (currentScore >= 138) rewardTier = "Silver Tier";
            else if (currentScore >= 130) rewardTier = "Bronze Tier";
        }

        if (needsAlert) {
            doc.setFillColor(220, 38, 38); // Red
            doc.rect(14, yPos, 182, 12, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('ALERT: ATTENDANCE STATUS UNDER REVIEW', 105, yPos + 8, { align: 'center' });
            doc.setFont(undefined, 'normal');
            yPos += 25;
        } else if (rewardTier) {
            // Reward Tier Banner
            let bannerColor = [205, 127, 50]; // Bronze default
            if (rewardTier === "Silver Tier") bannerColor = [192, 192, 192];
            if (rewardTier === "Gold Tier") bannerColor = [255, 215, 0];

            doc.setFillColor(...bannerColor);
            doc.rect(14, yPos, 182, 12, 'F');

            // Text color: Black for Gold/Silver/Bronze for better contrast? 
            // Gold is bright, Silver is bright. Bronze is dark.
            // Let's use Black for Gold/Silver, White for Bronze?
            // Or just Black for all to be safe on these colors.
            doc.setTextColor(0, 0, 0);

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`${rewardTier.toUpperCase()} ACHIEVED`, 105, yPos + 8, { align: 'center' });
            doc.setFont(undefined, 'normal');
            yPos += 25;
        } else {
            yPos += 10; // Spacing if no banner
        }

        // 5. Draw Header
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text('Employee Health Check', 105, yPos, { align: 'center' });
        yPos += 10;

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Employee: ${employee.name}`, 14, yPos);
        yPos += 6;
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, yPos);
        yPos += 6;
        doc.text(`Report Range: ${startDate} to ${endDate}`, 14, yPos);
        yPos += 15;

        // 6. Draw Health Bar
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);


        // Bar Background
        doc.setFillColor(230, 230, 230);
        doc.rect(14, yPos, 182, 10, 'F');

        // Bar Fill
        const clampedScore = Math.max(0, Math.min(currentScore, 150));
        const fillWidth = (clampedScore / 150) * 182;

        doc.setFillColor(stage.color);
        doc.rect(14, yPos, fillWidth, 10, 'F');

        // Markers
        const markers = daSettings ? [
            { score: 0, label: 'Termination' },
            { score: daSettings.final, label: 'Final' },
            { score: daSettings.severe, label: 'Severe' },
            { score: daSettings.coaching, label: 'Coaching' },
            { score: daSettings.educational, label: 'Educational' }
        ] : [
            { score: 0, label: 'Termination' },
            { score: 50, label: 'Final' },
            { score: 75, label: 'Severe' },
            { score: 100, label: 'Coaching' },
            { score: 125, label: 'Educational' }
        ];

        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);

        markers.forEach(marker => {
            const markerX = 14 + (marker.score / 150) * 182;

            // Draw tick line
            doc.setDrawColor(100, 100, 100);
            doc.line(markerX, yPos, markerX, yPos + 12); // Tick extends slightly below bar

            // Draw label
            // Adjust label position to not overlap too much
            // For 0, align left. For others, align center.
            const align = marker.score === 0 ? 'left' : 'center';
            // Offset text slightly below tick
            doc.text(marker.label, markerX, yPos + 15, { align: align });
        });

        // Add Reward Tier Markers (Bronze 130, Silver 138, Gold 145)
        const rewardMarkers = [
            { score: 130, label: 'Bronze' },
            { score: 138, label: 'Silver' },
            { score: 145, label: 'Gold' }
        ];

        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100); // Lighter color for these markers

        rewardMarkers.forEach(marker => {
            const markerX = 14 + (marker.score / 150) * 182;

            // Draw tick line (shorter or different style?)
            doc.setDrawColor(150, 150, 150);
            doc.line(markerX, yPos, markerX, yPos + 6); // Shorter tick

            // Draw label
            doc.text(marker.label, markerX, yPos - 2, { align: 'center' }); // Label ABOVE the bar
        });

        // Stage Label
        yPos += 22; // Increased spacing for markers
        doc.setFontSize(12);
        doc.setTextColor(stage.color);
        doc.setFont(undefined, 'bold');

        // Revert to just Stage Name since we have the banner now
        doc.text(`Current Stage: ${stage.name}`, 14, yPos);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);

        yPos += 15;

        // 7. AI Feedback Section
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Status Summary', 14, yPos);
        yPos += 7;

        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        // Use statusAnalysis if available, fallback to summary (backward compatibility/mock)
        const summaryText = aiFeedback.statusAnalysis || aiFeedback.summary;
        const summaryLines = doc.splitTextToSize(summaryText, 180);
        doc.text(summaryLines, 14, yPos);
        yPos += (summaryLines.length * 5) + 5;

        // Corrective Action Section
        if (aiFeedback.correctiveActionStrategies || aiFeedback.correctiveActionConsequences) {
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Corrective Action', 14, yPos);
            yPos += 7;

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');

            if (aiFeedback.correctiveActionStrategies) {
                const stratLines = doc.splitTextToSize(aiFeedback.correctiveActionStrategies, 180);
                doc.text(stratLines, 14, yPos);
                yPos += (stratLines.length * 5) + 3;
            }

            if (aiFeedback.correctiveActionConsequences) {
                const consLines = doc.splitTextToSize(aiFeedback.correctiveActionConsequences, 180);
                doc.text(consLines, 14, yPos);
                yPos += (consLines.length * 5) + 2;
            }
        } else if (aiFeedback.tips && aiFeedback.tips.length > 0) {
            // Fallback for old style tips if new fields aren't present
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Strategic Advice', 14, yPos);
            yPos += 7;

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            aiFeedback.tips.forEach(tip => {
                const tipText = `• ${tip}`;
                const tipLines = doc.splitTextToSize(tipText, 180);
                doc.text(tipLines, 14, yPos);
                yPos += (tipLines.length * 5) + 2;
            });
        }

        yPos += 10;

        // 8. Violation History Table
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Violation History (Selected Range)', 14, yPos);
        yPos += 5;

        const tableColumn = ["Date", "Violation Type"];
        const tableRows = empViolationsInRange.map(v => [
            v.date,
            v.type
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [60, 60, 60] },
            margin: { top: 20 },
            pageBreak: 'auto'
        });

        // 9. Total Violations Count (Current Quarter)
        // Filter out non-attendance violations
        const attendanceViolations = empViolationsInQuarter.filter(v =>
            v.type !== 'Early Arrival' && v.type !== 'Shift Pickup'
        );
        const totalViolations = attendanceViolations.length;

        yPos = doc.lastAutoTable.finalY + 10; // Position below table

        // Check if we need a new page
        if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Attendance Violations (Current Quarter): ${totalViolations}`, 14, yPos);

        // Add note about exclusions
        yPos += 5;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('(Excludes Early Arrival and Shift Pickup)', 14, yPos);

        // 9. Source Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        // doc.text(`Feedback generated via ${aiFeedback.source || 'Unknown Source'}`, 105, pageHeight - 10, { align: 'center' });

        // Add to generated files list
        const pdfData = doc.output('datauristring').split(',')[1];
        generatedFiles.push({
            fileName: `${employee.name} - Health Check.pdf`,
            pdfData: pdfData
        });
    }

    // Save Logic
    if (window.electron) {
        if (generatedFiles.length === 1) {
            // Single file save
            await window.electron.savePdf({
                pdfData: generatedFiles[0].pdfData,
                defaultPath: generatedFiles[0].fileName
            }).then(result => {
                if (result.success) {
                    alert(`Report saved to ${result.filePath}`);
                }
            });
        } else {
            // Multiple files save
            await window.electron.saveMultiplePdfs(generatedFiles).then(result => {
                if (result.success) {
                    alert(`Successfully saved ${result.results.length} reports to ${result.outputDir}`);
                } else if (!result.canceled) {
                    alert('Failed to save reports.');
                }
            });
        }
    } else {
        // Fallback for non-electron (browser dev)
        if (generatedFiles.length === 1) {
            const file = generatedFiles[0];
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${file.pdfData}`;
            link.download = file.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (generatedFiles.length > 1) {
            const zip = new JSZip();
            generatedFiles.forEach(file => {
                zip.file(file.fileName, file.pdfData, { base64: true });
            });

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'Health_Check_Reports.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
};

export const generateHealthCheckPDFsFromData = async (results) => {
    const generatedFiles = [];

    for (const result of results) {
        const { employee, currentScore, stage, tier, empViolationsInRange, empViolationsInQuarter, aiFeedback, startDate, endDate, issuedDAs, daSettings } = result;
        const doc = new jsPDF();

        // 3. Check for DA Alert Logic
        // Alert only if in Coaching, Severe, or Final AND DA not issued
        const daKey = `${employee.id}-${tier.name}`;
        const isIssued = issuedDAs.includes(daKey);
        const needsAlert = (tier.name === TIERS.COACHING.name || tier.name === TIERS.SEVERE.name || tier.name === TIERS.FINAL.name) && !isIssued;

        // 4. Draw Alert Banner (Top of Page) if needed
        let yPos = 20;

        // Calculate Reward Tier for Banner
        let rewardTier = null;
        if (currentScore >= 126) {
            if (currentScore >= 145) rewardTier = "Gold Tier";
            else if (currentScore >= 138) rewardTier = "Silver Tier";
            else if (currentScore >= 130) rewardTier = "Bronze Tier";
        }

        if (needsAlert) {
            doc.setFillColor(220, 38, 38); // Red
            doc.rect(14, yPos, 182, 12, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('ALERT: ATTENDANCE STATUS UNDER REVIEW', 105, yPos + 8, { align: 'center' });
            doc.setFont(undefined, 'normal');
            yPos += 25;
        } else if (rewardTier) {
            // Reward Tier Banner
            let bannerColor = [205, 127, 50]; // Bronze default
            if (rewardTier === "Silver Tier") bannerColor = [192, 192, 192];
            if (rewardTier === "Gold Tier") bannerColor = [255, 215, 0];

            doc.setFillColor(...bannerColor);
            doc.rect(14, yPos, 182, 12, 'F');
            doc.setTextColor(0, 0, 0);

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`${rewardTier.toUpperCase()} ACHIEVED`, 105, yPos + 8, { align: 'center' });
            doc.setFont(undefined, 'normal');
            yPos += 25;
        } else {
            yPos += 10; // Spacing if no banner
        }

        // 5. Draw Header
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text('Employee Health Check', 105, yPos, { align: 'center' });
        yPos += 10;

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Employee: ${employee.name}`, 14, yPos);
        yPos += 6;
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, yPos);
        yPos += 6;
        doc.text(`Report Range: ${startDate} to ${endDate}`, 14, yPos);
        yPos += 15;

        // 6. Draw Health Bar
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);


        // Bar Background
        doc.setFillColor(230, 230, 230);
        doc.rect(14, yPos, 182, 10, 'F');

        // Bar Fill
        const clampedScore = Math.max(0, Math.min(currentScore, 150));
        const fillWidth = (clampedScore / 150) * 182;

        doc.setFillColor(stage.color);
        doc.rect(14, yPos, fillWidth, 10, 'F');

        // Markers
        const markers = daSettings ? [
            { score: 0, label: 'Termination' },
            { score: daSettings.final, label: 'Final' },
            { score: daSettings.severe, label: 'Severe' },
            { score: daSettings.coaching, label: 'Coaching' },
            { score: daSettings.educational, label: 'Educational' }
        ] : [
            { score: 0, label: 'Termination' },
            { score: 50, label: 'Final' },
            { score: 75, label: 'Severe' },
            { score: 100, label: 'Coaching' },
            { score: 125, label: 'Educational' }
        ];

        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);

        markers.forEach(marker => {
            const markerX = 14 + (marker.score / 150) * 182;

            // Draw tick line
            doc.setDrawColor(100, 100, 100);
            doc.line(markerX, yPos, markerX, yPos + 12); // Tick extends slightly below bar

            // Draw label
            // Adjust label position to not overlap too much
            // For 0, align left. For others, align center.
            const align = marker.score === 0 ? 'left' : 'center';
            // Offset text slightly below tick
            doc.text(marker.label, markerX, yPos + 15, { align: align });
        });

        // Add Reward Tier Markers (Bronze 130, Silver 138, Gold 145)
        const rewardMarkers = [
            { score: 130, label: 'Bronze' },
            { score: 138, label: 'Silver' },
            { score: 145, label: 'Gold' }
        ];

        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100); // Lighter color for these markers

        rewardMarkers.forEach(marker => {
            const markerX = 14 + (marker.score / 150) * 182;

            // Draw tick line (shorter or different style?)
            doc.setDrawColor(150, 150, 150);
            doc.line(markerX, yPos, markerX, yPos + 6); // Shorter tick

            // Draw label
            doc.text(marker.label, markerX, yPos - 2, { align: 'center' }); // Label ABOVE the bar
        });

        // Stage Label
        yPos += 22; // Increased spacing for markers
        doc.setFontSize(12);
        doc.setTextColor(stage.color);
        doc.setFont(undefined, 'bold');

        // Revert to just Stage Name since we have the banner now
        doc.text(`Current Stage: ${stage.name}`, 14, yPos);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);

        yPos += 15;

        // 7. AI Feedback Section
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Status Summary', 14, yPos);
        yPos += 7;

        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        // Use statusAnalysis if available, fallback to summary (backward compatibility/mock)
        const summaryText = aiFeedback.statusAnalysis || aiFeedback.summary;
        const summaryLines = doc.splitTextToSize(summaryText, 180);
        doc.text(summaryLines, 14, yPos);
        yPos += (summaryLines.length * 5) + 5;

        // Corrective Action Section
        if (aiFeedback.correctiveActionStrategies || aiFeedback.correctiveActionConsequences) {
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Corrective Action', 14, yPos);
            yPos += 7;

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');

            if (aiFeedback.correctiveActionStrategies) {
                const stratLines = doc.splitTextToSize(aiFeedback.correctiveActionStrategies, 180);
                doc.text(stratLines, 14, yPos);
                yPos += (stratLines.length * 5) + 3;
            }

            if (aiFeedback.correctiveActionConsequences) {
                const consLines = doc.splitTextToSize(aiFeedback.correctiveActionConsequences, 180);
                doc.text(consLines, 14, yPos);
                yPos += (consLines.length * 5) + 2;
            }
        } else if (aiFeedback.tips && aiFeedback.tips.length > 0) {
            // Fallback for old style tips if new fields aren't present
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Strategic Advice', 14, yPos);
            yPos += 7;

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            aiFeedback.tips.forEach(tip => {
                const tipText = `• ${tip}`;
                const tipLines = doc.splitTextToSize(tipText, 180);
                doc.text(tipLines, 14, yPos);
                yPos += (tipLines.length * 5) + 2;
            });
        }

        yPos += 10;

        // 8. Violation History Table
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Violation History (Selected Range)', 14, yPos);
        yPos += 5;

        const tableColumn = ["Date", "Violation Type"];
        const tableRows = empViolationsInRange.map(v => [
            v.date,
            v.type
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [60, 60, 60] },
            margin: { top: 20 },
            pageBreak: 'auto'
        });

        // 9. Total Violations Count (Current Quarter)
        // Filter out non-attendance violations
        const attendanceViolations = empViolationsInQuarter.filter(v =>
            v.type !== 'Early Arrival' && v.type !== 'Shift Pickup'
        );
        const totalViolations = attendanceViolations.length;

        yPos = doc.lastAutoTable.finalY + 10; // Position below table

        const pageHeight = doc.internal.pageSize.height;

        // Check if we need a new page
        if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Attendance Violations (Current Quarter): ${totalViolations}`, 14, yPos);

        // Add note about exclusions
        yPos += 5;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('(Excludes Early Arrival and Shift Pickup)', 14, yPos);

        // Add to generated files list
        const pdfData = doc.output('datauristring').split(',')[1];
        generatedFiles.push({
            fileName: `${employee.name} - Health Check.pdf`,
            pdfData: pdfData
        });
    }

    // Save Logic
    if (window.electron) {
        if (generatedFiles.length === 1) {
            // Single file save
            await window.electron.savePdf({
                pdfData: generatedFiles[0].pdfData,
                defaultPath: generatedFiles[0].fileName
            }).then(result => {
                if (result.success) {
                    alert(`Report saved to ${result.filePath}`);
                }
            });
        } else {
            // Multiple files save
            await window.electron.saveMultiplePdfs(generatedFiles).then(result => {
                if (result.success) {
                    alert(`Successfully saved ${result.results.length} reports to ${result.outputDir}`);
                } else if (!result.canceled) {
                    alert('Failed to save reports.');
                }
            });
        }
    } else {
        // Fallback for non-electron (browser dev)
        if (generatedFiles.length === 1) {
            const file = generatedFiles[0];
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${file.pdfData}`;
            link.download = file.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (generatedFiles.length > 1) {
            const zip = new JSZip();
            generatedFiles.forEach(file => {
                zip.file(file.fileName, file.pdfData, { base64: true });
            });

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'Health_Check_Reports.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
};
