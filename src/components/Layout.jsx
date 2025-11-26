import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <Sidebar />
            <main style={{
                flex: 1,
                overflowY: 'auto',
                padding: '2rem',
                backgroundColor: 'var(--bg-primary)'
            }}>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
