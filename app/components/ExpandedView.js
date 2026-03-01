"use client";

import VideoPlayer from "./VideoPlayer";

export default function ExpandedView({ channel, onClose }) {
    if (!channel) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                    <div>
                        <div className="modal-channel-name">{channel.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                            {channel.region} · Live Coverage
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="channel-badge badge-live">
                            <span className="dot" />
                            LIVE
                        </div>
                        <button className="modal-close" onClick={onClose} id="modal-close">
                            ✕ Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
