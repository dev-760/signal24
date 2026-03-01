"use client";

import { useEffect, useCallback } from "react";
import VideoPlayer from "./VideoPlayer";

export default function ExpandedView({ channel, onClose }) {
    if (!channel) return null;

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === "Escape") onClose();
        },
        [onClose]
    );

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [handleKeyDown]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-float" onClick={onClose} id="modal-close" title="Close (Esc)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
                <div className="modal-video">
                    <VideoPlayer
                        url={channel.url}
                        channelName={channel.name}
                        type={channel.type || "hls"}
                        youtubeChannel={channel.youtubeChannel}
                        muted={false}
                    />
                </div>
                <div className="modal-info">
                    <div className="modal-info-left">
                        <div className="modal-avatar">
                            {channel.logo ? (
                                <img src={channel.logo} alt={channel.name} />
                            ) : (
                                channel.name.slice(0, 2).toUpperCase()
                            )}
                        </div>
                        <div>
                            <div className="modal-channel-name">{channel.name}</div>
                            <div className="modal-channel-region">
                                {channel.region} · Live Coverage
                            </div>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <div className="channel-badge badge-live">
                            <span className="dot" />
                            LIVE
                        </div>
                        <div className="modal-shortcut">
                            <kbd>ESC</kbd> to close
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
