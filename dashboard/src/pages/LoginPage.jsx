// src/pages/LoginPage.jsx — Premium login/register page
import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = isRegister
                ? await register(form.name, form.email, form.password)
                : await login(form.email, form.password);

            if (res.ok) {
                navigate('/');
            } else {
                setError(res.error || 'Error de autenticación');
            }
        } catch (err) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">NoahPro<span>.studio</span></div>
                    <p className="login-subtitle">DevAssist Cloud Platform</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <h2 className="login-title">{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>

                    {error && <div className="login-error">{error}</div>}

                    {isRegister && (
                        <div className="login-field">
                            <label>Nombre</label>
                            <input
                                className="input"
                                type="text"
                                placeholder="Tu nombre"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                required
                            />
                        </div>
                    )}

                    <div className="login-field">
                        <label>Email</label>
                        <input
                            className="input"
                            type="email"
                            placeholder="tu@email.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="login-field">
                        <label>Contraseña</label>
                        <input
                            className="input"
                            type="password"
                            placeholder={isRegister ? 'Mínimo 8 caracteres' : '••••••••'}
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            required
                            minLength={isRegister ? 8 : 1}
                            autoComplete={isRegister ? 'new-password' : 'current-password'}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                        {loading ? 'Cargando...' : isRegister ? 'Registrarse' : 'Entrar'}
                    </button>

                    <div className="login-toggle">
                        {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
                        <button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); }}>
                            {isRegister ? 'Inicia sesión' : 'Regístrate'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
