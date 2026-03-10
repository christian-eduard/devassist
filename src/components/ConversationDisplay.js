import React, { useEffect, useState } from 'react';
import './ConversationDisplay.css';

const ConversationDisplay = ({ lastUserText, lastVectronText, isThinking, isSpeaking }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (lastUserText || lastVectronText || isThinking || isSpeaking) {
            setVisible(true);
            const timer = setTimeout(() => {
                if (!isThinking && !isSpeaking) setVisible(false);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [lastUserText, lastVectronText, isThinking, isSpeaking]);

    if (!visible && !isThinking && !isSpeaking) return null;

    return (
        <div className={`conversation-overlay ${visible ? 'visible' : ''}`}>
            <div className="conversation-content">
                {lastUserText && (
                    <div className="user-text">
                        <span className="speaker-label">TÚ:</span>
                        <p>{lastUserText}</p>
                    </div>
                )}
                {isThinking && (
                    <div className="thinking-indicator">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <span>VECTRON interpretando...</span>
                    </div>
                )}
                {lastVectronText && !isThinking && (
                    <div className="vectron-text">
                        <span className="speaker-label">VECTRON:</span>
                        <p>{lastVectronText}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConversationDisplay;
