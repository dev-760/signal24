"use client";

import { useState, useRef, useCallback } from "react";
import VideoPlayer from "./VideoPlayer";

export default function ChannelCard({
    channel,
    index,
    mutedChannel,
    onMuteToggle,
    onExpand,
}) {
    const isMuted = mutedChannel !== channel.id;
    const [streamStatus, setStreamStatus] = useState("loading");
    const [logoError, setLogoError] = useState(false);
    const cardRef = useRef(null);

    const initials = channel.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const handleStatusChange = useCallback((status) => {
        setStreamStatus(status);
    }, []);

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
            className="video-card"
            style={{ animationDelay: `${index * 0.08}s` }}
            id={`channel-${channel.id}`}
            ref={cardRef}
        >
            <VideoPlayer
                url={channel.url}
                channelName={channel.name}
                type={channel.type || "hls"}
                youtubeChannel={channel.youtubeChannel}
                muted={isMuted}
                onMuteToggle={() => onMuteToggle(channel.id)}
                onStatusChange={handleStatusChange}
            />

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
                        <span className="channel-region">{channel.region}</span>
                    </div>
                </div>

                <div className="channel-actions">
                    <div className={badgeClass}>
                        <span className="dot" />
                        {badgeText}
                    </div>
                    {channel.type === "hls" && (
                        <button
                            className={`mute-btn ${!isMuted ? "unmuted" : ""}`}
                            onClick={() => onMuteToggle(channel.id)}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? "🔇" : "🔊"}
                        </button>
                    )}
                    <button
                        className="expand-btn"
                        onClick={handleFullscreen}
                        title="Fullscreen"
                    >
                        ⛶
                    </button>
                </div>
            </div>
        </div>
    );
}
