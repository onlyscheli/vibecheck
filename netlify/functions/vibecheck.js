
exports.handler = async function (event) {
    // CORS: Anfragen von GitHub Pages und anderen Seiten testweise erlauben
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    // Browser prüft zuerst, ob die Anfrage erlaubt ist
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers,
            body: ""
        };
    }

    // Nur POST-Anfragen erlauben
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
        // Daten aus dem Frontend lesen
        const body = JSON.parse(event.body || "{}");

        const {
            vorname,
            sternzeichen,
            verfassungVal,
            generation,
            verfassungLabel
        } = body;

        // Prüfen, ob die Pflichtfelder vorhanden sind
        if (!vorname || !sternzeichen || !generation) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: "Bitte fülle alle Pflichtfelder aus."
                })
            };
        }

        // OpenAI API-Schlüssel aus Netlify laden
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

        // Prompt für den VibeCheck erstellen
        const prompt = `Erstelle einen Vibecheck für ${vorname}.

Sternzeichen: ${sternzeichen}.
Tagesverfassung Stufe (1=fröhlich, 5=genervt): ${verfassungVal} (${verfassungLabel || ""}).
Generation: ${generation}.

Anforderungen:
- Genau 2 Absätze.
- Absatz 1: Humorvoller Roast, maximal 2 Sätze.
- Absatz 2: Motivierende positive Vibes, maximal 2 Sätze.
- Keine Einleitung und keine Überschriften.
- Schreibe auf Deutsch.`;

        // Anfrage an OpenAI senden
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

        // Fehler von OpenAI weitergeben
        if (!response.ok || data.error) {
            console.error("OpenAI-Fehler:", data.error);

            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    error: data.error?.message || "Fehler bei OpenAI."
                })
            };
        }

        // Ergebnis zurück ans Frontend senden
        const result =
            data.choices?.[0]?.message?.content?.trim() || "";

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                result: result
            })
        };

    } catch (error) {
        console.error("VibeCheck-Fehler:", error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Serverfehler bei der Verarbeitung."
            })
        };
    }
};
