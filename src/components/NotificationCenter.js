import React from 'react';
import { X, Bell, Info, AlertTriangle, CheckCircle, ExternalLink, Trash2 } from 'lucide-react';
import './NotificationCenter.css';

const NotificationCenter = ({
    notifications,
    onClose,
    onClearAll,
    onAction,
    onDelete
}) => {
    return (
        <div className="notification-center-overlay" onClick={onClose}>
            <div className="notification-center-panel" onClick={e => e.stopPropagation()}>
                <header className="nc-header">
                    <div className="nc-title">
                        <Bell size={18} />
                        <h2>Centro de Notificaciones</h2>
                        <span className="nc-count">{notifications.length}</span>
                    </div>
                    <div className="nc-actions">
                        <button className="btn-icon" onClick={onClearAll} title="Limpiar todo">
                            <Trash2 size={16} />
                        </button>
                        <button className="btn-icon" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <div className="nc-body scrollable">
                    {notifications.length === 0 ? (
                        <div className="nc-empty">
                            <Bell size={48} className="empty-icon" />
                            <p>No tienes notificaciones pendientes</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} className={`nc-item ${n.type} ${n.read ? 'read' : 'unread'}`}>
                                <div className="nc-item-icon">
                                    {n.type === 'error' && <AlertTriangle size={18} />}
                                    {n.type === 'success' && <CheckCircle size={18} />}
                                    {n.type === 'info' && <Info size={18} />}
                                    {!['error', 'success', 'info'].includes(n.type) && <Bell size={18} />}
                                </div>
                                <div className="nc-item-content">
                                    <div className="nc-item-header">
                                        <span className="nc-item-title">{n.title || 'VECTRON Update'}</span>
                                        <span className="nc-item-time">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="nc-item-message">{n.message}</p>

                                    {n.actions && n.actions.length > 0 && (
                                        <div className="nc-item-footer">
                                            {n.actions.map((action, idx) => (
                                                <button
                                                    key={idx}
                                                    className={`nc-action-btn ${action.primary ? 'primary' : ''}`}
                                                    onClick={() => onAction(n.id, action)}
                                                >
                                                    {action.icon && <span className="btn-icon-tiny">{action.icon}</span>}
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button className="nc-item-close" onClick={() => onDelete(n.id)}>
                                    <X size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <footer className="nc-footer">
                    <span className="nc-system-tag">SISTEMA VECTRON 3.0</span>
                </footer>
            </div>
        </div>
    );
};

export default NotificationCenter;
