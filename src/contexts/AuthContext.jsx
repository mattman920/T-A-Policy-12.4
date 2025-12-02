import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [organizationId, setOrganizationId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchOrganization(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                fetchOrganization(session.user.id);
            } else {
                setOrganizationId(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchOrganization = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', userId)
                .limit(1);

            const orgData = data?.[0];

            if (error) {
                // If no organization found, it might be a new user or migration hasn't run.
                // For now, we'll just log it. In a real app, we might redirect to an onboarding flow.
                console.error('Error fetching organization:', error);
            }

            if (orgData) {
                setOrganizationId(orgData.organization_id);
            }
        } catch (error) {
            console.error('Error fetching organization:', error);
        } finally {
            setLoading(false);
        }
    };

    const value = {
        session,
        organizationId,
        loading
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
