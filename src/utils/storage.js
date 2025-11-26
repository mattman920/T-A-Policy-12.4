
export const Storage = {
    async loadData() {
        if (window.electron) {
            return await window.electron.readData();
        } else {
            const data = localStorage.getItem('attendance_data');
            return data ? JSON.parse(data) : null;
        }
    },
    async saveData(data) {
        if (window.electron) {
            return await window.electron.writeData(data);
        } else {
            localStorage.setItem('attendance_data', JSON.stringify(data));
            return true;
        }
    }
};
