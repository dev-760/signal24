"use client";

import { useState, useEffect } from "react";

export default function Header() {
    const [time, setTime] = useState("");
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(
                now.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                })
            );
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header className={`header ${scrolled ? "header-scrolled" : ""}`}>
            <div className="header-inner">
                <div className="logo-container">
                    <div className="logo-icon-wrap">
                        <img src="/Logo.svg" alt="Signal24" className="logo-icon" />
                        <span className="logo-pulse" />
                    </div>
                    <h1 className="logo-text">
                        SIGNAL<span>24</span>
                    </h1>
                </div>

                <div className="header-right">
                    <div className="live-indicator">
                        <span className="live-dot" />
                        <span>LIVE</span>
                    </div>
                    <div className="header-time" title="Current time (UTC)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span className="time-value">{time}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
