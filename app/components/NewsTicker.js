"use client";

import { useState, useEffect } from "react";
import { tickerHeadlines as fallbackHeadlines } from "../data/channels";

export default function NewsTicker() {
    const [headlines, setHeadlines] = useState(fallbackHeadlines);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        async function fetchHeadlines() {
            try {
                const res = await fetch("/api/headlines");
                if (res.ok) {
                    const data = await res.json();
                    if (data.headlines?.length) {
                        setHeadlines(data.headlines);
                    }
                }
            } catch (e) {
                // Use fallback headlines
            }
        }

        fetchHeadlines();
        const interval = setInterval(fetchHeadlines, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const doubledHeadlines = [...headlines, ...headlines];

    return (
        <div
            className="ticker-bar"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="ticker-flash">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                BREAKING
            </div>
            <div className={`ticker-content ${isPaused ? "ticker-paused" : ""}`}>
                {doubledHeadlines.map((headline, i) => (
                    <span key={i} className="ticker-item">
                        <span className="ticker-text">{headline}</span>
                        <span className="ticker-separator">
                            <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                                <circle cx="3" cy="3" r="3" />
                            </svg>
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
}
