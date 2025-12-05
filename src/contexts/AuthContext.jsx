import React, { createContext, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    // Hardcoded session
    const session = {
        user: {
            id: 'local-user-id',
            email: 'matt@colbyfoods.com',
            role: 'authenticated'
        },
        access_token: 'mock-token'
    };

    const value = {
        session,
        loading: false,
        login: async () => ({ error: null }),
        logout: async () => { },
        organizationId: 'local-org'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
