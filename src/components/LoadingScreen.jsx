import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ message, progress }) => {
    return (
        <div className="loading-screen-overlay">
            <div className="loading-content">
                {/* Optional: Add a Logo here if available in the future */}
                {/* <img src="/logo.svg" alt="Logo" className="loading-logo" /> */}

                <h2 className="loading-title">{message || 'Loading...'}</h2>

                <div className="loading-progress-track">
                    <div
                        className="loading-progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="loading-percentage">{Math.round(progress)}%</div>
            </div>
        </div>
    );
};

export default LoadingScreen;
