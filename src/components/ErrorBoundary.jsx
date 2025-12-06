import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    handleHardReset = async () => {
        if (window.confirm('WARNING: This will delete ALL local data and reset the application. This cannot be undone. Are you sure?')) {
            try {
                const dbName = 'attendance-tracker-v8';
                const dbsToDelete = [dbName, `fp.${dbName}`, 'fireproof', 'fp.fireproof', 'attendance-tracker-v7', 'fp.attendance-tracker-v7', 'attendance-tracker-v6', 'fp.attendance-tracker-v6'];

                // Clear IndexedDB
                if (window.indexedDB && window.indexedDB.databases) {
                    const dbs = await window.indexedDB.databases();
                    for (const db of dbs) {
                        try {
                            window.indexedDB.deleteDatabase(db.name);
                            console.log(`Deleted IndexedDB: ${db.name}`);
                        } catch (e) {
                            console.warn(`Failed to delete ${db.name}`, e);
                        }
                    }
                }

                // Fallback for specific names if databases() is not supported or incomplete
                for (const name of dbsToDelete) {
                    try {
                        window.indexedDB.deleteDatabase(name);
                    } catch (e) { }
                }

                localStorage.clear();
                alert('Database reset complete. Reloading...');
                window.location.reload();
            } catch (error) {
                console.error('Hard reset failed:', error);
                alert('Hard reset failed: ' + error.message);
            }
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    padding: '2rem',
                    textAlign: 'center',
                    backgroundColor: '#fef2f2',
                    color: '#991b1b'
                }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong</h1>
                    <p style={{ marginBottom: '2rem', maxWidth: '600px' }}>
                        The application encountered a critical error. This is likely due to a database synchronization issue.
                        Please try resetting the database.
                    </p>
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#fff',
                        borderRadius: '0.5rem',
                        border: '1px solid #fca5a5',
                        marginBottom: '2rem',
                        overflow: 'auto',
                        maxHeight: '200px',
                        width: '100%',
                        maxWidth: '800px',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem'
                    }}>
                        {this.state.error && this.state.error.toString()}
                    </div>
                    <button
                        onClick={this.handleHardReset}
                        style={{
                            padding: '1rem 2rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontSize: '1.1rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                    >
                        Reset Database & Fix
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '1rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'transparent',
                            color: '#7f1d1d',
                            border: '1px solid #7f1d1d',
                            borderRadius: '0.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        Try Reloading
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
