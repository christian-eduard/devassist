// src/lib/AuthContext.jsx — Global auth state management
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('da_token');
        if (token) {
            api.auth.me(token)
                .then(res => { if (res.ok) setUser(res.user); else localStorage.removeItem('da_token'); })
                .catch(() => localStorage.removeItem('da_token'))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await api.auth.login(email, password);
        if (res.ok) {
            localStorage.setItem('da_token', res.token);
            setUser(res.user);
        }
        return res;
    }, []);

    const register = useCallback(async (name, email, password) => {
        const res = await api.auth.register(name, email, password);
        if (res.ok) {
            localStorage.setItem('da_token', res.token);
            setUser(res.user);
        }
        return res;
    }, []);

    const logout = useCallback(async () => {
        const token = localStorage.getItem('da_token');
        if (token) {
            try { await api.auth.logout(token); } catch (_) {}
        }
        localStorage.removeItem('da_token');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
