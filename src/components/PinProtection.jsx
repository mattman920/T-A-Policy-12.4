import React, { useState } from 'react';

const PinProtection = ({ onAuthenticated }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (pin === '3681') {
            const now = new Date();
            localStorage.setItem('auth_token', now.toISOString());
            onAuthenticated();
        } else {
            setError('Incorrect PIN');
            setPin('');
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            color: '#ffffff'
        }}>
            <div style={{
                backgroundColor: '#2d2d2d',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <h2 style={{ marginBottom: '1.5rem', color: '#ffffff' }}>Enter Access PIN</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => {
                            setPin(e.target.value);
                            setError('');
                        }}
                        placeholder="Enter PIN"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            marginBottom: '1rem',
                            borderRadius: '4px',
                            border: '1px solid #404040',
                            backgroundColor: '#1a1a1a',
                            color: '#ffffff',
                            fontSize: '1.2rem',
                            textAlign: 'center'
                        }}
                        autoFocus
                    />
                    {error && (
                        <div style={{ color: '#ff4444', marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            backgroundColor: '#DC143C',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        Access System
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PinProtection;
