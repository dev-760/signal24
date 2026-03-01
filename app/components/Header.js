"use client";

export default function Header() {
    return (
        <header className="header">
            <div className="header-inner">
                <div className="logo-container">
                    <img src="/logo.svg" alt="Signal24" className="logo-icon" />
                    <h1 className="logo-text">
                        SIGNAL<span>24</span>
                    </h1>
                </div>
            </div>
        </header>
    );
}
