import { NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

export async function POST(request: Request) {
    try {
        // -------------------------------------------------
        // CHECK ENVIRONMENT VARIABLES
        // -------------------------------------------------

        if (!OLLAMA_URL) {
            console.error("OLLAMA_URL is missing");

            return NextResponse.json(
                {
                    error:
                        "OLLAMA_URL is not configured. Please add OLLAMA_URL to .env.local",
                },
                { status: 500 }
            );
        }

        if (!OLLAMA_MODEL) {
            console.error("OLLAMA_MODEL is missing");

            return NextResponse.json(
                {
                    error:
                        "OLLAMA_MODEL is not configured. Please add OLLAMA_MODEL to .env.local",
                },
                { status: 500 }
            );
        }

        // -------------------------------------------------
        // READ REQUEST BODY
        // -------------------------------------------------

        const body = (await request.json()) as {
            description?: unknown;
        };

        const description =
            typeof body.description === "string"
                ? body.description.trim()
                : "";

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!description) {
            return NextResponse.json(
                {
                    error: "Description is required.",
                },
                { status: 400 }
            );
        }

        if (description.length > 4000) {
            return NextResponse.json(
                {
                    error:
                        "Description is too long. Please keep it under 4000 characters.",
                },
                { status: 400 }
            );
        }

        // -------------------------------------------------
        // REPHRASING PROMPT
        // -------------------------------------------------

        const prompt = `
You are a professional rephrasing assistant.

Your task is to REPHRASE the user's text.

Make the text:
- Clear
- Professional
- Natural
- Concise

IMPORTANT:
This is REPHRASING, not content generation.

STRICT RULES:
- Change the wording and sentence structure.
- Preserve the exact original meaning.
- Do not add new information.
- Do not remove important information.
- Do not invent facts.
- Do not guess missing information.
- Do not assume a project name.
- Do not assume a task.
- Do not assume a feature.
- Do not assume a status.
- Do not assume dates.
- Do not add technical details that were not provided.
- Do not make the text unnecessarily long.
- Keep approximately the same amount of information as the original.
- Return ONLY the rephrased text.
- Do not explain the changes.
- Do not provide multiple versions.
- Do not say "Sure".
- Do not say "Here is".
- Do not say "Here's".
- Do not say "Let me know".
- Do not use Markdown.
- Do not use bullet points.
- Do not use quotation marks.
- Do not add headings.

Examples:

Input:
working on login api

Output:
Currently focusing on the login API.

Input:
login api completed

Output:
The login API implementation has been completed.

Input:
working on token issue

Output:
Currently investigating the token-related issue.

Input:
testing is going on

Output:
Testing activities are currently in progress.

Input:
API is done but testing remaining

Output:
The API has been completed, while testing is still in progress.

Input:
I am developer

Output:
I work as a developer.

Input:
working on frontend

Output:
Currently working on the frontend.

Input:
fixed login issue

Output:
Resolved the login issue.

Now rephrase this text:

${description}

Return ONLY the rephrased text.
`.trim();

        // -------------------------------------------------
        // OLLAMA URL
        // -------------------------------------------------

        const ollamaUrl =
            `${OLLAMA_URL.replace(/\/$/, "")}/api/generate`;

        console.log(
            "Calling Ollama:",
            ollamaUrl
        );

        console.log(
            "Using model:",
            OLLAMA_MODEL
        );

        console.log(
            "Original text:",
            description
        );

        // -------------------------------------------------
        // CALL OLLAMA
        // -------------------------------------------------

        const response = await fetch(
            ollamaUrl,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify({
                    model: OLLAMA_MODEL,

                    prompt,

                    // We want complete response
                    // instead of streamed chunks
                    stream: false,

                    // Qwen3 thinking/reasoning disabled
                    think: false,

                    // -------------------------------------------------
                    // MODEL OPTIONS
                    // -------------------------------------------------

                    options: {
                        // Some creativity for rephrasing
                        temperature: 0.3,

                        // Keep response short
                        num_predict: 150,
                    },
                }),
            }
        );

        // -------------------------------------------------
        // READ OLLAMA RESPONSE
        // -------------------------------------------------

        const responseText =
            await response.text();

        let data: {
            response?: string;
            error?: string;
        } = {};

        try {
            data = responseText
                ? (JSON.parse(
                    responseText
                ) as {
                    response?: string;
                    error?: string;
                })
                : {};
        } catch {
            console.error(
                "Invalid Ollama JSON:",
                responseText
            );

            return NextResponse.json(
                {
                    error:
                        "Invalid response received from Ollama.",
                },
                { status: 502 }
            );
        }

        // -------------------------------------------------
        // HANDLE OLLAMA ERROR
        // -------------------------------------------------

        if (!response.ok) {
            console.error(
                "Ollama error:",
                data
            );

            return NextResponse.json(
                {
                    error:
                        data.error ||
                        "Ollama API request failed.",
                },
                {
                    status:
                        response.status || 502,
                }
            );
        }

        // -------------------------------------------------
        // GET REPHRASED TEXT
        // -------------------------------------------------

        let enhancedDescription =
            typeof data.response === "string"
                ? data.response.trim()
                : "";

        if (!enhancedDescription) {
            return NextResponse.json(
                {
                    error:
                        "Ollama returned an empty response.",
                },
                { status: 502 }
            );
        }

        // -------------------------------------------------
        // CLEAN RESPONSE
        // -------------------------------------------------

        enhancedDescription =
            cleanAiResponse(
                enhancedDescription
            );

        // -------------------------------------------------
        // VALIDATE RESPONSE
        // -------------------------------------------------

        if (
            isInvalidAiResponse(
                enhancedDescription
            )
        ) {
            console.warn(
                "AI returned unwanted content."
            );

            console.warn(
                "AI response:",
                enhancedDescription
            );

            // Safe fallback:
            // Don't return hallucinated information.
            enhancedDescription =
                description;
        }

        // -------------------------------------------------
        // FINAL RESPONSE
        // -------------------------------------------------

        console.log(
            "Rephrased text:",
            enhancedDescription
        );

        return NextResponse.json({
            enhancedDescription,
        });
    } catch (error) {
        console.error(
            "Ollama enhancement error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to rephrase text.",
            },
            { status: 500 }
        );
    }
}

/* ========================================================
   CLEAN AI RESPONSE
======================================================== */

function cleanAiResponse(
    text: string
): string {
    let result = text.trim();

    // Remove code fences
    result = result.replace(
        /^```(?:text|markdown)?\s*/i,
        ""
    );

    result = result.replace(
        /\s*```$/i,
        ""
    );

    // Remove common AI prefixes
    result = result.replace(
        /^sure[!,.:\s-]*/i,
        ""
    );

    result = result.replace(
        /^here(?:'s| is)\s*/i,
        ""
    );

    result = result.replace(
        /^final answer\s*[:\-]\s*/i,
        ""
    );

    result = result.replace(
        /^final text\s*[:\-]\s*/i,
        ""
    );

    result = result.replace(
        /^rephrased\s*(?:text|description|version)?\s*[:\-]\s*/i,
        ""
    );

    result = result.replace(
        /^rewritten\s*(?:text|description|version)?\s*[:\-]\s*/i,
        ""
    );

    result = result.replace(
        /^improved\s*(?:text|description|version)?\s*[:\-]\s*/i,
        ""
    );

    // If model returns an "Improved:" section,
    // keep only that part.
    const improvedMatch =
        result.match(
            /(?:\*\*)?improved(?:\*\*)?\s*[:\-]\s*([\s\S]*)/i
        );

    if (
        improvedMatch &&
        improvedMatch[1]
    ) {
        result =
            improvedMatch[1].trim();
    }

    // Remove markdown bold
    result = result.replace(
        /^\*\*([\s\S]*?)\*\*$/,
        "$1"
    );

    // Remove surrounding quotes
    if (
        result.length >= 2 &&
        (
            (
                result.charAt(0) === '"' &&
                result.charAt(
                    result.length - 1
                ) === '"'
            ) ||
            (
                result.charAt(0) === "'" &&
                result.charAt(
                    result.length - 1
                ) === "'"
            )
        )
    ) {
        result =
            result.slice(
                1,
                result.length - 1
            ).trim();
    }

    // Remove excessive spaces
    result = result
        .replace(/\r/g, "")
        .replace(
            /[ \t]+/g,
            " "
        )
        .replace(
            /\n{2,}/g,
            "\n"
        )
        .trim();

    return result;
}

/* ========================================================
   INVALID RESPONSE CHECK
======================================================== */

function isInvalidAiResponse(
    text: string
): boolean {
    const lower =
        text.toLowerCase();

    const forbiddenPhrases = [
        "here's an improved",
        "here is an improved",
        "here's a better",
        "here is a better",
        "original:",
        "improved:",
        "original text:",
        "improved text:",
        "let me know",
        "if you'd like",
        "if you would like",
        "hope this helps",
        "sure!",
        "sure,",
    ];

    // AI explanation detected
    if (
        forbiddenPhrases.some(
            (phrase) =>
                lower.includes(
                    phrase
                )
        )
    ) {
        return true;
    }

    // Placeholder detected
    if (
        /\[[^\]]+\]/.test(text)
    ) {
        return true;
    }

    // Markdown detected
    if (
        text.includes("**") ||
        text.includes("```")
    ) {
        return true;
    }

    // Multiple paragraphs detected
    const lines =
        text
            .split("\n")
            .filter(
                (line) =>
                    line.trim().length > 0
            );

    if (lines.length > 2) {
        return true;
    }

    return false;
}