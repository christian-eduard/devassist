// src/components/project/ImageCarousel.jsx — Image carousel with Nano Banana variations
import React, { useState } from 'react';

export default function ImageCarousel({ images, onPreview }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    if (!images.length) return null;
    const current = images[currentIdx];

    return (
        <div onClick={(e) => e.stopPropagation()}>
            {/* Main image */}
            <div style={{ position: 'relative' }}>
                <img
                    src={current.url}
                    alt={current.label}
                    onClick={() => onPreview(current.url)}
                    style={{
                        width: '100%', maxHeight: '380px', objectFit: 'contain',
                        cursor: 'zoom-in', display: 'block', background: 'rgba(15,23,42,0.8)',
                    }}
                />
                {/* Label badge */}
                <div style={{
                    position: 'absolute', top: '10px', left: '10px',
                    background: current.type === 'original' ? 'rgba(52,211,153,0.9)' : 'rgba(99,102,241,0.9)',
                    color: '#fff', fontSize: '11px', fontWeight: '600',
                    padding: '4px 10px', borderRadius: '8px', backdropFilter: 'blur(4px)',
                }}>
                    {current.label}
                </div>
                {/* Counter */}
                {images.length > 1 && (
                    <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px',
                        padding: '4px 8px', borderRadius: '8px',
                    }}>
                        {currentIdx + 1}/{images.length}
                    </div>
                )}
                {/* Nav arrows */}
                {images.length > 1 && (
                    <>
                        <button onClick={() => setCurrentIdx((currentIdx - 1 + images.length) % images.length)} style={{
                            position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: '18px',
                            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                        }}>‹</button>
                        <button onClick={() => setCurrentIdx((currentIdx + 1) % images.length)} style={{
                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: '18px',
                            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                        }}>›</button>
                    </>
                )}
            </div>
            {/* Dot navigation */}
            {images.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '8px 0' }}>
                    {images.map((img, i) => (
                        <button key={i} onClick={() => setCurrentIdx(i)} style={{
                            width: i === currentIdx ? '20px' : '8px', height: '8px',
                            borderRadius: '4px', border: 'none', cursor: 'pointer',
                            background: i === currentIdx
                                ? (img.type === 'original' ? '#34d399' : '#818cf8')
                                : 'rgba(148,163,184,0.3)',
                            transition: 'all 0.2s ease',
                        }} />
                    ))}
                </div>
            )}
        </div>
    );
}
