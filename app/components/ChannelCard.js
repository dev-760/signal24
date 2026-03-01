"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import VideoPlayer from "./VideoPlayer";

export default function ChannelCard({
    channel,
    index,
    mutedChannel,
    onMuteToggle,
    onExpand,
    listMode = false,
    onStatusChange: onParentStatus,
}) {
    const isMuted = mutedChannel !== channel.id;
    const [streamStatus, setStreamStatus] = useState("loading");
    const [logoError, setLogoError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const cardRef = useRef(null);
    const reportedRef = useRef(false);

    const initials = channel.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const handleStatusChange = useCallback((status) => {
        setStreamStatus(status);
        if (status === "playing" && !reportedRef.current && onParentStatus) {
            reportedRef.current = true;
            onParentStatus(status);
        }
    }, [onParentStatus]);

    const handleFullscreen = () => {
        const el = cardRef.current;
        if (!el) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            el.requestFullscreen().catch(() => {
                onExpand(channel);
            });
        }
    };

    const badgeClass =
        streamStatus === "playing"
            ? "channel-badge badge-live"
            : streamStatus === "error"
                ? "channel-badge badge-offline"
                : "channel-badge badge-connecting";

    const badgeText =
        streamStatus === "playing"
            ? "LIVE"
            : streamStatus === "error"
                ? "OFFLINE"
                : "CONNECTING";

    return (
        <div
            className={`video-card ${isHovered ? "video-card-hovered" : ""} ${listMode ? "video-card-list" : ""}`}
            style={{ animationDelay: `${index * 0.07}s` }}
            id={`channel-${channel.id}`}
            ref={cardRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="card-glow" />
            <div className="video-area">
                <VideoPlayer
                    url={channel.url}
                    channelName={channel.name}
                    type={channel.type || "hls"}
                    youtubeChannel={channel.youtubeChannel}
                    muted={isMuted}
                    onMuteToggle={() => onMuteToggle(channel.id)}
                    onStatusChange={handleStatusChange}
                />

                {/* Floating overlay controls on hover */}
                <div className="card-overlay-controls">
                    {channel.type === "hls" && (
                        <button
                            className={`overlay-btn ${!isMuted ? "overlay-btn-active" : ""}`}
                            onClick={(e) => { e.stopPropagation(); onMuteToggle(channel.id); }}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <line x1="23" y1="9" x2="17" y2="15" />
                                    <line x1="17" y1="9" x2="23" y2="15" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                </svg>
                            )}
                        </button>
                    )}
                    <button
                        className="overlay-btn"
                        onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
                        title="Fullscreen"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 3 21 3 21 9" />
                            <polyline points="9 21 3 21 3 15" />
                            <line x1="21" y1="3" x2="14" y2="10" />
                            <line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="channel-info">
                <div className="channel-meta">
                    <div className="channel-avatar">
                        {channel.logo && !logoError ? (
                            <img
                                src={channel.logo}
                                alt={channel.name}
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            initials
                        )}
                    </div>
                    <div className="channel-details">
                        <span className="channel-name">{channel.name}</span>
                        <div className="channel-sub">
                            <span className="channel-region">{channel.region}</span>
                            <span className={badgeClass}>
                                <span className="dot" />
                                {badgeText}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
