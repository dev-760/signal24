"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { channels } from "./data/channels";
import Header from "./components/Header";
import NewsTicker from "./components/NewsTicker";
import ChannelCard from "./components/ChannelCard";
import ExpandedView from "./components/ExpandedView";
import LiveChat from "./components/LiveChat";

export default function Home() {
  const [mutedChannel, setMutedChannel] = useState(null);
  const [expandedChannel, setExpandedChannel] = useState(null);
  const [gridCols, setGridCols] = useState(3);
  const [liveCount, setLiveCount] = useState(0);
  const [currentSnap, setCurrentSnap] = useState(0);
  const snapRef = useRef(null);

  const handleMuteToggle = (channelId) => {
    setMutedChannel((prev) => (prev === channelId ? null : channelId));
  };

  const isList = gridCols === 1;

  // Track current snap card in list mode
  const handleSnapScroll = useCallback(() => {
    const el = snapRef.current;
    if (!el) return;
    const children = el.children;
    if (!children.length) return;
    const scrollTop = el.scrollTop;
    const childH = children[0].offsetHeight + 12; // gap
    const idx = Math.round(scrollTop / childH);
    setCurrentSnap(Math.min(idx, channels.length - 1));
  }, []);

  // Navigate snap
  const snapTo = useCallback((dir) => {
    const el = snapRef.current;
    if (!el) return;
    const children = el.children;
    if (!children.length) return;
    const next = Math.max(0, Math.min(currentSnap + dir, channels.length - 1));
    children[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setCurrentSnap(next);
  }, [currentSnap]);

  // Keyboard navigation in list mode
  useEffect(() => {
    if (!isList) return;
    const handleKey = (e) => {
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); snapTo(1); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); snapTo(-1); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isList, snapTo]);

  return (
    <>
      <Header />
      <NewsTicker />

      <main className="main-layout">
        <div className="content-area">
          {/* Toolbar */}
          <div className="toolbar">
            <div className="toolbar-left">
              <h2 className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                Live Channels
              </h2>
              <span className="stream-count">
                <span className="stream-count-dot" />
                {liveCount > 0 ? `${liveCount} live` : `${channels.length} streams`}
              </span>
            </div>
            <div className="toolbar-right">
              {isList && (
                <span className="snap-indicator">
                  {currentSnap + 1} / {channels.length}
                </span>
              )}
              <div className="grid-toggle">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    className={`grid-toggle-btn ${gridCols === n ? "grid-toggle-active" : ""}`}
                    onClick={() => setGridCols(n)}
                    title={n === 1 ? "Card view" : `${n} columns`}
                  >
                    <GridIcon cols={n} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Snap navigation arrows for list mode */}
          {isList && (
            <div className="snap-nav">
              <button
                className="snap-nav-btn"
                onClick={() => snapTo(-1)}
                disabled={currentSnap === 0}
                title="Previous (↑)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
              <div className="snap-dots">
                {channels.map((_, i) => (
                  <button
                    key={i}
                    className={`snap-dot ${i === currentSnap ? "snap-dot-active" : ""}`}
                    onClick={() => {
                      const el = snapRef.current;
                      if (el?.children[i]) {
                        el.children[i].scrollIntoView({ behavior: "smooth", block: "start" });
                        setCurrentSnap(i);
                      }
                    }}
                  />
                ))}
              </div>
              <button
                className="snap-nav-btn"
                onClick={() => snapTo(1)}
                disabled={currentSnap === channels.length - 1}
                title="Next (↓)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          )}

          {/* Grid / Snap container */}
          <div
            className={`channel-grid grid-${gridCols} ${isList ? "snap-container" : ""}`}
            ref={isList ? snapRef : null}
            onScroll={isList ? handleSnapScroll : undefined}
          >
            {channels.map((channel, index) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                index={index}
                mutedChannel={mutedChannel}
                onMuteToggle={handleMuteToggle}
                onExpand={setExpandedChannel}
                listMode={isList}
                onStatusChange={(status) => {
                  if (status === "playing") {
                    setLiveCount((prev) => prev + 1);
                  }
                }}
              />
            ))}
          </div>
        </div>

        <LiveChat />
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">SIGNAL<span>24</span></span>
            <span className="footer-divider" />
            <span className="footer-text">
              © 2026 Signal24 · by{" "}
              <a
                href="https://github.com/dev-760"
                target="_blank"
                rel="noopener noreferrer"
              >
                dev-760
              </a>
            </span>
          </div>
          <div className="footer-links">
            <span className="footer-link">
              All streams are property of their respective broadcasters.
            </span>
          </div>
        </div>
      </footer>

      {expandedChannel && (
        <ExpandedView
          channel={expandedChannel}
          onClose={() => setExpandedChannel(null)}
        />
      )}
    </>
  );
}

function GridIcon({ cols }) {
  if (cols === 1) {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="0" y="1" width="14" height="5" rx="1.5" fill="currentColor" />
        <rect x="0" y="8" width="14" height="5" rx="1.5" fill="currentColor" />
      </svg>
    );
  }
  const gap = 1.5;
  const size = 14;
  const cellSize = (size - gap * (cols - 1)) / cols;
  const rects = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push(
        <rect
          key={`${r}-${c}`}
          x={c * (cellSize + gap)}
          y={r * (cellSize + gap) + (size - 2 * cellSize - gap) / 2}
          width={cellSize}
          height={cellSize}
          rx={1}
          fill="currentColor"
        />
      );
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rects}
    </svg>
  );
}
