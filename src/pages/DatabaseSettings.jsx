import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Database, Plus, Trash2, Check, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const DatabaseSettings = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isDark } = useTheme();

    const [databases, setDatabases] = useState([]);
    const [currentDb, setCurrentDb] = useState('');
    const [newDbName, setNewDbName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Get current DB from URL or default
        const params = new URLSearchParams(window.location.search);
        const db = params.get('db') || 'attendance-tracker-v11';
        setCurrentDb(db);

        // Load list
        loadDatabases();
    }, []);

    const loadDatabases = () => {
        try {
            const stored = localStorage.getItem('available_databases');
            let dbs = stored ? JSON.parse(stored) : [];
            // Ensure current is always in the list (if useDB logic hasn't run yet or storage cleared)
            const params = new URLSearchParams(window.location.search);
            const active = params.get('db') || 'attendance-tracker-v11';

            if (!dbs.includes(active)) {
                dbs.push(active);
                localStorage.setItem('available_databases', JSON.stringify(dbs));
            }
            setDatabases(dbs);
        } catch (e) {
            console.error('Failed to load databases', e);
            setDatabases([]);
        }
    };

    const handleCreate = () => {
        const name = newDbName.trim();
        if (!name) return;
        if (databases.includes(name)) {
            setError('Database already exists');
            return;
        }
        if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
            setError('Use only letters, numbers, hyphens, and underscores');
            return;
        }

        const newDbs = [...databases, name];
        localStorage.setItem('available_databases', JSON.stringify(newDbs));
        setDatabases(newDbs);
        setNewDbName('');
        setError('');

        if (confirm(`Database "${name}" created. Switch to it now?`)) {
            switchDatabase(name);
        }
    };

    const switchDatabase = (name) => {
        const url = new URL(window.location);
        url.searchParams.set('db', name);
        window.location.href = url.toString();
    };

    const handleDelete = (name) => {
        if (name === currentDb) {
            setError("Cannot delete the active database. Switch to another one first.");
            return;
        }
        if (!confirm(`Are you sure you want to remove "${name}" from your list? Data may still exist in your browser storage but will be hidden.`)) {
            return;
        }

        const newDbs = databases.filter(d => d !== name);
        localStorage.setItem('available_databases', JSON.stringify(newDbs));
        setDatabases(newDbs);
    };

    const sectionStyle = {
        backgroundColor: 'var(--bg-secondary)',
        padding: '2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '2rem',
        border: '1px solid var(--border-color)'
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <button
                    onClick={() => navigate('/settings')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Databases</h1>
            </div>

            <section style={sectionStyle}>
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Database size={20} /> active Database
                    </h2>
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <span style={{ fontWeight: '600', color: '#10B981', fontSize: '1.1rem' }}>{currentDb}</span>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Currently loaded into application memory.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981' }}>
                            <Check size={20} />
                            <span style={{ fontWeight: '500' }}>Active</span>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={20} /> Create New Database
                    </h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="New database name (e.g. attendance-2025)"
                            value={newDbName}
                            onChange={(e) => setNewDbName(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem'
                            }}
                        />
                        <button
                            onClick={handleCreate}
                            disabled={!newDbName}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'var(--accent-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: '600',
                                cursor: newDbName ? 'pointer' : 'not-allowed',
                                opacity: newDbName ? 1 : 0.6,
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Create
                        </button>
                    </div>
                    {error && (
                        <p style={{ marginTop: '0.5rem', color: 'var(--accent-danger)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <AlertCircle size={16} /> {error}
                        </p>
                    )}
                </div>

                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw size={20} /> Switch Database
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {databases.map(db => (
                            <div key={db} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '1rem',
                                backgroundColor: 'var(--bg-primary)',
                                border: db === currentDb ? '1px solid #10B981' : '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Database size={20} color={db === currentDb ? '#10B981' : 'var(--text-secondary)'} />
                                    <span style={{
                                        fontWeight: '500',
                                        color: db === currentDb ? '#10B981' : 'var(--text-primary)'
                                    }}>
                                        {db}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {db !== currentDb && (
                                        <>
                                            <button
                                                onClick={() => switchDatabase(db)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: 'var(--radius-md)',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Switch
                                            </button>
                                            <button
                                                onClick={() => handleDelete(db)}
                                                style={{
                                                    padding: '0.5rem',
                                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid transparent',
                                                    borderRadius: 'var(--radius-md)',
                                                    color: 'var(--accent-danger)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Remove from list"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                    {db === currentDb && (
                                        <span style={{
                                            padding: '0.5rem 1rem',
                                            fontSize: '0.8rem',
                                            color: '#10B981',
                                            fontWeight: '600',
                                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                            borderRadius: 'var(--radius-md)'
                                        }}>
                                            Current
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DatabaseSettings;
