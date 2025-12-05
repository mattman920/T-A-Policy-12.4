import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDB } from '../hooks/useDB';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const { db, useLiveQuery } = useDB();
    const themeQuery = useLiveQuery(doc => doc.docType === 'theme' ? doc : undefined);

    // Default to dark if system preference or no setting
    const [isDark, setIsDark] = useState(() => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        if (themeQuery.docs) {
            const themeDoc = themeQuery.docs.find(d => d.docType === 'theme');
            if (themeDoc) {
                setIsDark(themeDoc.value === 'dark');
            }
        }
    }, [themeQuery.docs]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        // We don't save here to avoid loops, we save in toggleTheme
    }, [isDark]);

    const toggleTheme = async () => {
        const newTheme = !isDark ? 'dark' : 'light';
        setIsDark(!isDark);
        await db.put({ _id: 'theme_settings', docType: 'theme', value: newTheme });
    };

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
