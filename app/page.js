"use client";

import { useState } from "react";
import { channels } from "./data/channels";
import Header from "./components/Header";
import NewsTicker from "./components/NewsTicker";
import ChannelCard from "./components/ChannelCard";
import ExpandedView from "./components/ExpandedView";
import LiveChat from "./components/LiveChat";

export default function Home() {
  const [mutedChannel, setMutedChannel] = useState(null);
  const [expandedChannel, setExpandedChannel] = useState(null);

  const handleMuteToggle = (channelId) => {
    setMutedChannel((prev) => (prev === channelId ? null : channelId));
  };

  return (
    <>
      <Header />
      <NewsTicker />

      <main className="main-layout">
        <div className="content-area">
          <div className="channel-grid grid-3">
            {channels.map((channel, index) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                index={index}
                mutedChannel={mutedChannel}
                onMuteToggle={handleMuteToggle}
                onExpand={setExpandedChannel}
              />
            ))}
          </div>
        </div>

        <LiveChat />
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-text">
            © 2026 Signal24. by dev (
            <a
              href="https://github.com/dev-760"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              https://github.com/dev-760
            </a>
            )
          </span>
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
