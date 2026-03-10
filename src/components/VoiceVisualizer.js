import React, { useEffect, useRef } from 'react';

const VoiceVisualizer = ({ isListening, stream }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const analyserRef = useRef();

    useEffect(() => {
        if (isListening && stream && canvasRef.current) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 64;
            analyserRef.current = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            const draw = () => {
                if (!isListening) return;
                requestRef.current = requestAnimationFrame(draw);
                analyser.getByteFrequencyData(dataArray);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const barWidth = (canvas.width / bufferLength) * 2.5;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = (dataArray[i] / 255) * canvas.height;

                    // Gradient based on volume
                    const opacity = dataArray[i] / 255;
                    ctx.fillStyle = `rgba(124, 106, 247, ${opacity})`;

                    // Rounded bars
                    const radius = 2;
                    const y = (canvas.height - barHeight) / 2;

                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth - 2, barHeight, radius);
                    ctx.fill();

                    x += barWidth;
                }
            };

            draw();

            return () => {
                cancelAnimationFrame(requestRef.current);
                audioContext.close();
            };
        }
    }, [isListening, stream]);

    if (!isListening) return null;

    return (
        <canvas
            ref={canvasRef}
            width={120}
            height={30}
            style={{
                marginTop: '10px',
                opacity: 0.8,
                filter: 'drop-shadow(0 0 5px rgba(124, 106, 247, 0.4))'
            }}
        />
    );
};

export default VoiceVisualizer;
