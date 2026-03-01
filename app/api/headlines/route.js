export async function GET() {
    const headlines = [];

    // Try GNews API first (most reliable free tier)
    try {
        const res = await fetch(
            `https://gnews.io/api/v4/search?q=Iran+Israel+war&lang=en&max=10&apikey=${process.env.GNEWS_API_KEY}`,
            { next: { revalidate: 300 } } // Cache for 5 minutes
        );
        if (res.ok) {
            const data = await res.json();
            if (data.articles?.length) {
                data.articles.forEach((a) => {
                    if (a.title) headlines.push(a.title);
                });
            }
        }
    } catch (e) {
        console.error("GNews API error:", e.message);
    }

    // If GNews didn't return enough, try Currents API
    if (headlines.length < 5) {
        try {
            const res = await fetch(
                `https://api.currentsapi.services/v1/search?keywords=Iran+Israel+Gulf+war&language=en&apiKey=${process.env.CURRENTS_API_KEY}`,
                { next: { revalidate: 300 } }
            );
            if (res.ok) {
                const data = await res.json();
                if (data.news?.length) {
                    data.news.slice(0, 10).forEach((a) => {
                        if (a.title && !headlines.includes(a.title)) {
                            headlines.push(a.title);
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Currents API error:", e.message);
        }
    }

    // Fallback headlines if APIs fail
    if (headlines.length === 0) {
        headlines.push(
            "BREAKING: US and Israel launch joint military strikes on Iran — Operation 'Epic Fury' and 'Roaring Lion' underway",
            "Iranian Red Crescent: At least 201 killed and 747 wounded across 24 provinces from US-Israeli airstrikes",
            "Iran retaliates with ballistic missiles targeting Israel and US bases in Bahrain, Qatar, Kuwait, UAE, Jordan",
            "Trump announces 'major combat operations in Iran' — aims to eliminate nuclear and missile programs",
            "Israeli Air Force confirms largest combat sortie in history — 200 fighter jets striking 500 military targets in Iran",
            "Dubai International Airport halts all operations indefinitely amid widespread Gulf airspace closures",
            "UN Secretary-General condemns strikes, calls for immediate ceasefire and return to negotiations",
            "Commercial shipping halted in Strait of Hormuz as naval tensions escalate in Persian Gulf"
        );
    }

    return Response.json({ headlines });
}
