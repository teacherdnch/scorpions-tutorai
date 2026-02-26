'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const LangContext = createContext(null);

export function LangProvider({ children }) {
    const [lang, setLangState] = useState('en');
    const [theme, setThemeState] = useState('light');

    useEffect(() => {
        const savedLang = localStorage.getItem('lang');
        if (savedLang === 'ru' || savedLang === 'en') setLangState(savedLang);

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
            setThemeState(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, []);

    function setLang(l) {
        setLangState(l);
        localStorage.setItem('lang', l);
    }

    function setTheme(t) {
        setThemeState(t);
        localStorage.setItem('theme', t);
        document.documentElement.setAttribute('data-theme', t);
    }

    function toggleTheme() {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }

    function t(key) {
        return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
    }

    return (
        <LangContext.Provider value={{ lang, setLang, theme, setTheme, toggleTheme, t }}>
            {children}
        </LangContext.Provider>
    );
}

export function useLang() {
    const ctx = useContext(LangContext);
    if (!ctx) throw new Error('useLang must be used inside LangProvider');
    return ctx;
}
