import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Tag, MessageSquare, Info, AlertTriangle, CheckCircle, Shield, Zap } from 'lucide-react';
import './NotificationModal.css';

const NotificationModal = ({ notification, onClose, onSaveNotes }) => {
    const [notes, setNotes] = useState(notification.notes || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSaveNotes(notification.id, notes);
            setIsSaving(false);
            // Si quieres que se cierre al guardar, descomenta la siguiente línea
            // onClose();
        } catch (err) {
            console.error('Error al guardar notas:', err);
            setIsSaving(false);
        }
    };

    if (!notification) return null;

    const getIcon = (type) => {
        switch (type) {
            case 'error': return <AlertTriangle size={32} color="#ff4f4f" />;
            case 'success': return <CheckCircle size={32} color="#00ff99" />;
            case 'info': return <Info size={32} color="#4af7ff" />;
            case 'system': return <Shield size={32} color="#b84bff" />;
            default: return <Zap size={32} color="#f9f9f9" />;
        }
    };

    return (
        <div className="nm-overlay" onClick={onClose}>
            <div className="nm-modal" onClick={e => e.stopPropagation()}>
                <header className="nm-header">
                    <div className="nm-header-left">
                        {getIcon(notification.type)}
                        <div>
                            <h1>{notification.title || 'Detalles de Notificación'}</h1>
                            <span className="nm-time">
                                <Clock size={12} /> {new Date(notification.timestamp).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <button className="nm-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </header>

                <div className="nm-body">
                    <div className="nm-section message-section">
                        <label><Tag size={14} /> Mensaje del Sistema</label>
                        <div className="nm-message-body">
                            {notification.message}
                        </div>
                    </div>

                    <div className="nm-section notes-section">
                        <label><MessageSquare size={14} /> Notas y Observaciones</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Añade notas personales sobre esta notificación..."
                            className="nm-notes-input scrollable"
                        />
                    </div>
                </div>

                <footer className="nm-footer">
                    <div className="nm-id">ID: {notification.id}</div>
                    <button 
                        className={`nm-save-btn ${isSaving ? 'loading' : ''}`} 
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <Save size={16} />
                        {isSaving ? 'Guardando...' : 'Guardar Notas'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default NotificationModal;
