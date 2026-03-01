"use client";

import { useState, useEffect } from "react";
import { tickerHeadlines as fallbackHeadlines } from "../data/channels";

export default function NewsTicker() {
    const [headlines, setHeadlines] = useState(fallbackHeadlines);

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
        // Refresh every 5 minutes
        const interval = setInterval(fetchHeadlines, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const doubledHeadlines = [...headlines, ...headlines];

    return (
        <div className="ticker-bar">
            <div className="ticker-content">
                {doubledHeadlines.map((headline, i) => (
                    <span key={i}>
                        {i % headlines.length === 0 && (
                            <span className="ticker-label">⚡ BREAKING</span>
                        )}
                        <span className="ticker-text">{headline}</span>
                        <span className="ticker-separator">●</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
