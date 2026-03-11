import React, { useMemo, useEffect, useState, useRef } from 'react';
import './VectronOrb.css';

const VectronOrb = ({ isListening, isThinking, isSpeaking, sentiment, size = 120 }) => {
    const [volume, setVolume] = useState(0);
    const analyserRef = useRef(null);
    const audioContentRef = useRef(null);

    useEffect(() => {
        if (!isSpeaking) {
            setVolume(0);
            return;
        }

        // Web Audio API para reactividad
        const initAudio = async () => {
            try {
                if (!audioContentRef.current) {
                    audioContentRef.current = new (window.AudioContext || window.webkitAudioContext)();
                    analyserRef.current = audioContentRef.current.createAnalyser();
                    analyserRef.current.fftSize = 256;
                }

                // NOTA: En un entorno real necesitaríamos conectar la fuente de audio local.
                // Como TTSManager usa Audio() objects dinámicos, usaremos un loop de animación
                // que simule o capte el volumen si el audio estuviera ruteado.
                // Para V3.0, usaremos un mock reactivo sofisticado si no hay acceso directo al stream PCM.
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

                const update = () => {
                    if (!isSpeaking) return;
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                    setVolume(avg / 128); // Normalizado 0-1
                    requestAnimationFrame(update);
                };
                update();
            } catch (e) { console.warn('[Orb] AudioContext block:', e); }
        };

        initAudio();
    }, [isSpeaking]);

    return (
        <div className={`vectron-orb-container ${isListening ? 'listening' : ''} ${isThinking ? 'thinking' : ''} ${isSpeaking ? 'speaking' : ''} ${sentiment ? `sentiment-${sentiment.toLowerCase()}` : ''}`}
            style={{
                transform: `scale(${1 + volume * 0.3})`,
                filter: `brightness(${1 + volume * 0.5})`
            }}>
            <div className="orb-base">
                <div className="orb-ring"></div>
                <div className="orb-core"></div>
                <div className="orb-particles"></div>
            </div>

            {/* SVG Filter para efecto orgánico/fluido */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id="orb-goo">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
                    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
            </svg>
        </div>
    );
};

export default VectronOrb;
