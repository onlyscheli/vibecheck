
exports.handler = async function (event) {
    const allowedOrigins = [
        "https://onlyscheli.github.io",
        "https://onlyscheli.com",
        "https://www.onlysheli.com"
    ];

    const origin = event.headers?.origin || "";

    const headers = {
        "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
            ? origin
            : "https://onlyscheli.github.io",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
        "Vary": "Origin"
    };

    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers,
            body: ""
        };
    }

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: "Method Not Allowed"
            })
        };
    }

    try {
        const body = JSON.parse(event.body || "{}");

        const {
            vorname,
            sternzeichen,
            verfassungVal,
            generation,
            verfassungLabel
        } = body;

        if (!vorname || !sternzeichen || !generation) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: "Bitte fülle alle Pflichtfelder aus."
                })
            };
        }

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: "OPENAI_API_KEY ist in Netlify nicht konfiguriert."
                })
            };
        }

        const prompt = `Erstelle einen Vibecheck für ${vorname}.
Sternzeichen: ${sternzeichen}.
Tagesverfassung Stufe (1=fröhlich, 5=genervt): ${verfassungVal} (${verfassungLabel}).
Generation: ${generation}.

Anforderungen:
- Genau 2 Absätze.
- Absatz 1: Humorvoller Roast, maximal 2 Sätze.
- Absatz 2: Motivierende positive Vibes, maximal 2 Sätze.
- Keine Einleitung und keine Überschriften.`;

        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey.trim()}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.8
                })
            }
        );

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error("OpenAI API Fehler:", data.error);

            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    error: data.error?.message || "Fehler bei OpenAI."
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                result: data.choices?.[0]?.message?.content?.trim() || ""
            })
        };

    } catch (error) {
        console.error("Vibecheck Function Fehler:", error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Serverfehler bei der Verarbeitung."
            })
        };
    }
};
