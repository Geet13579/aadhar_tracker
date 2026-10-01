import { NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

type Language = "hi" | "en";

function cleanOutput(value: string): string {
    let text = value.trim();

    text = text.replace(/^```(?:text|plaintext)?\s*/i, "");
    text = text.replace(/\s*```$/i, "");
    text = text.replace(/^output\s*:\s*/i, "");

    if (
        text.length >= 2 &&
        ((text.startsWith('"') && text.endsWith('"')) ||
            (text.startsWith("'") && text.endsWith("'")))
    ) {
        text = text.slice(1, -1).trim();
    }

    return text.trim();
}

function getPrompt(
    description: string,
    language: Language,
) {
    if (language === "hi") {
        return `
You are a professional Hindi translation assistant.

Translate the user's text into natural, professional Hindi.

STRICT RULES:
- Preserve the exact original meaning.
- Do not add any information.
- Do not remove any important information.
- Do not invent facts.
- Do not guess missing information.
- Do not change names.
- Do not change numbers.
- Do not change dates.
- Do not change IDs.
- Do not change URLs.
- Do not change API names.
- Keep technical terms such as API, frontend, backend, login, token, etc. when appropriate.
- Keep approximately the same amount of information.
- Make the Hindi natural and professional.
- Return ONLY the translated text.
- Do not explain anything.
- Do not provide multiple versions.
- Do not say "Sure".
- Do not say "Here is".
- Do not use Markdown.
- Do not use bullet points.
- Do not use quotation marks.

Input:
${description}

Return ONLY the Hindi translation.
`.trim();
    }

    return `
You are a professional English translation assistant.

Translate the user's text into clear, natural, professional English.

STRICT RULES:
- Preserve the exact original meaning.
- Do not add any information.
- Do not remove any important information.
- Do not invent facts.
- Do not guess missing information.
- Do not change names.
- Do not change numbers.
- Do not change dates.
- Do not change IDs.
- Do not change URLs.
- Do not change API names.
- Keep technical terms when appropriate.
- Keep approximately the same amount of information.
- Make the English natural and professional.
- Return ONLY the translated text.
- Do not explain anything.
- Do not provide multiple versions.
- Do not say "Sure".
- Do not say "Here is".
- Do not use Markdown.
- Do not use bullet points.
- Do not use quotation marks.

Input:
${description}

Return ONLY the English translation.
`.trim();
}

export async function POST(request: Request) {
    try {
        if (!OLLAMA_URL) {
            return NextResponse.json(
                {
                    error:
                        "OLLAMA_URL is not configured in .env.local",
                },
                { status: 500 },
            );
        }

        if (!OLLAMA_MODEL) {
            return NextResponse.json(
                {
                    error:
                        "OLLAMA_MODEL is not configured in .env.local",
                },
                { status: 500 },
            );
        }

        const body = (await request.json()) as {
            description?: string;
            language?: string;
        };

        const description = body.description?.trim();
        const language = body.language;

        if (!description) {
            return NextResponse.json(
                {
                    error: "Description is required",
                },
                { status: 400 },
            );
        }

        if (
            language !== "hi" &&
            language !== "en"
        ) {
            return NextResponse.json(
                {
                    error:
                        'Language must be either "hi" or "en"',
                },
                { status: 400 },
            );
        }

        const prompt = getPrompt(
            description,
            language,
        );

        const response = await fetch(
            `${OLLAMA_URL}/api/generate`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    prompt,
                    stream: false,
                    think: false,
                    options: {
                        temperature: 0.1,
                        num_predict: 200,
                    },
                }),
            },
        );

        if (!response.ok) {
            const errorText = await response.text();

            return NextResponse.json(
                {
                    error:
                        errorText ||
                        `Ollama returned ${response.status}`,
                },
                { status: 502 },
            );
        }

        const data = (await response.json()) as {
            response?: string;
        };

        const result = cleanOutput(
            data.response || "",
        );

        if (!result) {
            return NextResponse.json(
                {
                    error:
                        "AI returned an empty response",
                },
                { status: 502 },
            );
        }

        return NextResponse.json({
            result,
        });
    } catch (error) {
        console.error(
            "Translation API error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to translate text",
            },
            { status: 500 },
        );
    }
}