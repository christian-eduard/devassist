import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus,
    Search,
    Pin,
    MapPin,
    Trash2,
    FileText
} from 'lucide-react';
import './NotesModule.css';

const NotesModule = ({ showToast }) => {
    const [notes, setNotes] = useState([]);
    const [selectedNote, setSelectedNote] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const saveTimeoutRef = useRef(null);

    // ── Load notes ──
    const loadNotes = useCallback(async () => {
        if (!window.electronAPI) return;
        const data = await window.electronAPI.notes.load();
        // Sort: pinned first, then by updatedAt
        const sorted = data.sort((a, b) => {
            if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
        setNotes(sorted);
        // If no note selected, select first
        if (sorted.length > 0 && !selectedNote) {
            setSelectedNote(sorted[0]);
        }
    }, [selectedNote]);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    // ── Auto-save logic ──
    const handleNoteChange = (updates) => {
        if (!selectedNote) return;

        const updatedNote = { ...selectedNote, ...updates };
        setSelectedNote(updatedNote);

        // Update in local list immediately for UI responsiveness
        setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));

        // Debounce save to disk
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            await window.electronAPI.notes.save(updatedNote);
            // We don't reload the whole list to avoid jumping, just update timestamp locally
            // but if pinned changed, we might want to re-sort soon.
        }, 500);
    };

    // ── Actions ──
    const handleAddNewNote = async () => {
        const newNote = {
            title: 'Nueva nota',
            content: '',
            pinned: false,
        };
        const saved = await window.electronAPI.notes.save(newNote);
        await loadNotes();
        setSelectedNote(saved);
        showToast('Nota creada', 'success');
    };

    const handleDeleteNote = async (id) => {
        if (window.confirm('¿Eliminar esta nota?')) {
            await window.electronAPI.notes.delete(id);
            loadNotes();
            setSelectedNote(null);
            showToast('Nota eliminada', 'info');
        }
    };

    const togglePin = async (e, note) => {
        e.stopPropagation();
        const updated = { ...note, pinned: !note.pinned };
        await window.electronAPI.notes.save(updated);
        loadNotes();
        if (selectedNote?.id === note.id) setSelectedNote(updated);
    };

    // ── Filter ──
    const filteredNotes = notes.filter(n => {
        const title = n.title || '';
        const content = n.content || '';
        const matchesSearch =
            title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="notes-module">
            <div className="notes-list-panel">
                <header className="module-header-mini">
                    <div className="header-top">
                        <h1>Notas</h1>
                        <button className="btn btn-sm btn-icon" onClick={handleAddNewNote} title="Nueva nota">
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="search-input">
                        <Search className="search-icon" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar notas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </header>

                <div className="notes-list">
                    {filteredNotes.length === 0 ? (
                        <div className="empty-state">
                            <p>No hay notas</p>
                        </div>
                    ) : (
                        filteredNotes.map(note => (
                            <div
                                key={note.id}
                                className={`note-item ${selectedNote?.id === note.id ? 'active' : ''} ${note.pinned ? 'pinned' : ''}`}
                                onClick={() => setSelectedNote(note)}
                            >
                                <div className="note-item-header">
                                    <h4 className="note-title-preview">{note.title}</h4>
                                    <button className="btn-pin" onClick={(e) => togglePin(e, note)}>
                                        {note.pinned ? <Pin size={14} /> : <MapPin size={14} />}
                                    </button>
                                </div>
                                <p className="note-content-preview">{note.content || 'Sin contenido...'}</p>
                                <span className="note-date">{new Date(note.updatedAt).toLocaleDateString()}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="note-editor-panel">
                {selectedNote ? (
                    <div className="editor-container">
                        <div className="editor-header">
                            <input
                                type="text"
                                className="editor-title-input"
                                value={selectedNote.title}
                                onChange={(e) => handleNoteChange({ title: e.target.value })}
                                placeholder="Título de la nota"
                            />
                            <div className="editor-actions">
                                <button className={`btn-icon-plain ${selectedNote.pinned ? 'active' : ''}`} onClick={(e) => togglePin(e, selectedNote)}>
                                    {selectedNote.pinned ? <><Pin size={14} /> Anclada</> : <><MapPin size={14} /> Anclar</>}
                                </button>
                                <button className="btn-icon-plain danger" onClick={() => handleDeleteNote(selectedNote.id)}>
                                    <Trash2 size={14} /> Eliminar
                                </button>
                            </div>
                        </div>
                        <textarea
                            className="editor-textarea"
                            value={selectedNote.content}
                            onChange={(e) => handleNoteChange({ content: e.target.value })}
                            placeholder="Escribe algo aquí..."
                        />
                        <div className="editor-footer">
                            <span className="save-status">Auto-guardado activo</span>
                            <span className="last-edit">Última edición: {new Date(selectedNote.updatedAt).toLocaleString()}</span>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <FileText size={48} />
                        <h3>Selecciona o crea una nota</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesModule;
