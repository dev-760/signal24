"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";

export default function VideoPlayer({
    url,
    channelName,
    type = "hls",
    youtubeChannel,
    muted = true,
    onStatusChange,
}) {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const containerRef = useRef(null);
    const [status, setStatus] = useState("loading"); // loading | playing | error

    const updateStatus = useCallback(
        (newStatus) => {
            setStatus(newStatus);
            if (onStatusChange) onStatusChange(newStatus);
        },
        [onStatusChange]
    );

    const destroyHls = useCallback(() => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
    }, []);

    const initHlsPlayer = useCallback(() => {
        const video = videoRef.current;
        if (!video || !url) return;

        destroyHls();
        updateStatus("loading");

        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                maxBufferLength: 10,
                maxMaxBufferLength: 20,
                maxBufferSize: 10 * 1024 * 1024,
                startLevel: -1,
                capLevelToPlayerSize: true,
                fragLoadingTimeOut: 10000,
                manifestLoadingTimeOut: 10000,
                levelLoadingTimeOut: 10000,
                fragLoadingMaxRetry: 2,
                manifestLoadingMaxRetry: 2,
                levelLoadingMaxRetry: 2,
            });

            hlsRef.current = hls;
            hls.loadSource(url);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video
                    .play()
                    .then(() => updateStatus("playing"))
                    .catch(() => updateStatus("playing"));
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            setTimeout(() => {
                                if (status !== "playing") updateStatus("error");
                            }, 8000);
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            updateStatus("error");
                            break;
                    }
                }
            });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
            video.addEventListener("loadedmetadata", () => {
                video
                    .play()
                    .then(() => updateStatus("playing"))
                    .catch(() => updateStatus("playing"));
            });
            video.addEventListener("error", () => updateStatus("error"));
        } else {
            updateStatus("error");
        }
    }, [url, destroyHls, updateStatus, status]);

    useEffect(() => {
        if (type === "hls") {
            initHlsPlayer();
        } else if (type === "iframe" || type === "youtube") {
            // For iframe/youtube, set status based on load
            updateStatus("loading");
            // Give iframe a moment to load, then mark as playing
            const timer = setTimeout(() => updateStatus("playing"), 3000);
            return () => clearTimeout(timer);
        }
        return destroyHls;
    }, [url, type]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = muted;
        }
    }, [muted]);

    const handleRetry = () => {
        if (type === "hls") {
            initHlsPlayer();
        } else {
            updateStatus("loading");
            setTimeout(() => updateStatus("playing"), 3000);
        }
    };

    const handleIframeError = () => {
        updateStatus("error");
    };

    const handleIframeLoad = () => {
        updateStatus("playing");
    };

    // YouTube embed URL
    const getYoutubeEmbedUrl = () => {
        if (youtubeChannel) {
            return `https://www.youtube.com/embed/live_stream?channel=${youtubeChannel}&autoplay=1&mute=${muted ? 1 : 0}`;
        }
        return url;
    };

    // Render iframe-based players
    if (type === "iframe" || type === "youtube") {
        const embedUrl = type === "youtube" ? getYoutubeEmbedUrl() : url;

        return (
            <div className="video-wrapper" ref={containerRef}>
                {status === "loading" && (
                    <div className="video-loading">
                        <div className="loading-spinner" />
                        <span className="loading-text">Connecting...</span>
                    </div>
                )}

                <iframe
                    src={embedUrl}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        border: "none",
                        display: status === "error" ? "none" : "block",
                    }}
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    title={channelName}
                />

                {status === "error" && (
                    <div className="video-error">
                        <span className="error-icon">📡</span>
                        <span className="error-text">
                            Stream unavailable for {channelName}
                        </span>
                        <button className="retry-btn" onClick={handleRetry}>
                            ↻ Retry
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Render HLS player
    return (
        <div className="video-wrapper" ref={containerRef}>
            <video
                ref={videoRef}
                muted={muted}
                playsInline
                autoPlay
                style={{ display: status === "playing" ? "block" : "none" }}
            />
            <div className="video-overlay" />

            {status === "loading" && (
                <div className="video-loading">
                    <div className="loading-spinner" />
                    <span className="loading-text">Connecting...</span>
                </div>
            )}

            {status === "error" && (
                <div className="video-error">
                    <span className="error-icon">📡</span>
                    <span className="error-text">
                        Stream unavailable for {channelName}
                    </span>
                    <button className="retry-btn" onClick={handleRetry}>
                        ↻ Retry
                    </button>
                </div>
            )}
        </div>
    );
}
