/**
 * Exports the current application data to a JSON file.
 * @param {Object} data - The data object to export (employees, violations, etc.)
 */
export const exportData = (data) => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `time_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
};

/**
 * Imports application data from a JSON file.
 * @param {File} file - The file object selected by the user.
 * @returns {Promise<Object>} - A promise that resolves with the parsed data.
 */
export const importData = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const jsonObj = JSON.parse(event.target.result);
                // Basic validation: check if it looks like our data
                if (!jsonObj.employees || !Array.isArray(jsonObj.employees)) {
                    reject(new Error('Invalid backup file: missing employees data'));
                    return;
                }
                resolve(jsonObj);
            } catch (error) {
                reject(new Error('Failed to parse backup file: ' + error.message));
            }
        };

        reader.onerror = () => {
            reject(new Error('Error reading file'));
        };

        reader.readAsText(file);
    });
};
