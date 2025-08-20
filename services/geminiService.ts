import { GoogleGenAI, Type } from "@google/genai";
import type { FileSystemState, ChatMessage } from '../types';

function formatFileSystemForPrompt(fileSystem: FileSystemState, previewRoot: string | null): string {
    const fileEntries = Object.entries(fileSystem)
        .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
        .map(([path, content]) => {
            if (path === '/handover.json') return ''; // Handled separately
            const language = path.split('.').pop() || '';
            return `
---
File: ${path}
\`\`\`${language}
${content}
\`\`\`
`;
        });
    
    const previewContext = previewRoot ? `The user is currently previewing the project from the "${previewRoot}" directory.` : 'The user is currently previewing the root directory.';

    const handoverContent = fileSystem['/handover.json'];
    const projectContext = handoverContent
        ? `The project was set up with the following configuration and history (from /handover.json):\n${handoverContent}\n`
        : 'This is a new project.';

    return `Here is the current state of all files in the project. Use this as context for the user's request.
${projectContext}
${previewContext}
${fileEntries.join('')}
---
`;
}

export async function chatWithAgent(history: ChatMessage[], fileSystem: FileSystemState, previewRoot: string | null): Promise<{ text: string, explanation: string, code?: { path: string, content: string }[], suggestions?: string[] }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const model = "gemini-2.5-flash";

    const systemInstruction = `You are an expert web developer AI agent and a helpful guide. Your primary goal is to help the user build and design web pages by modifying their file system.
Ensure that text colors have sufficient contrast against their background colors for readability. Default to dark text on light backgrounds unless a dark theme is specifically requested.
When the user asks for a code change, you must act as a true collaborator.
1. First, provide a brief, friendly, conversational response in the 'text' field.
2. Then, provide a detailed explanation in the 'explanation' field. This should be formatted with markdown. Explain what you've changed, why, and offer practical suggestions for what the user could do next. Guide them on best practices and code style.
3. Next, provide a list of 3 concise, actionable follow-up prompts in the 'suggestions' field that the user might want to ask next.
4. Finally, if you are generating or modifying code, include the complete, full file content for all modified files in the 'code' property. The 'code' property must be an array of objects, where each object has a 'path' (string) and 'content' (string) key. Do not just return diffs.

Your response MUST be a JSON object that adheres to the provided schema.

${formatFileSystemForPrompt(fileSystem, previewRoot)}
`;

    const contents = history
        .filter(msg => msg.role === 'user' || msg.role === 'model')
        .map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }],
        }));

    try {
        const response = await ai.models.generateContent({
            model,
            contents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        text: {
                            type: Type.STRING,
                            description: 'A brief, friendly, conversational reply to the user. Keep it short.'
                        },
                        explanation: {
                            type: Type.STRING,
                            description: "A detailed explanation of any code changes, including what was done, why it was done, and suggestions for the user's next steps. Use markdown for formatting (e.g., lists, bold text)."
                        },
                        suggestions: {
                            type: Type.ARRAY,
                            description: "A list of 3 concise, actionable follow-up prompts the user could ask next. For example, 'Style the button' or 'Add a click handler'.",
                            nullable: true,
                            items: {
                                type: Type.STRING
                            }
                        },
                        code: {
                            type: Type.ARRAY,
                            description: "An array of objects, where each object has a 'path' and 'content' key. Represents all files modified by the agent.",
                            nullable: true,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    path: { type: Type.STRING },
                                    content: { type: Type.STRING }
                                },
                                required: ['path', 'content']
                            }
                        }
                    },
                    required: ['text', 'explanation']
                }
            },
        });

        const responseText = response.text?.trim();
        if (!responseText) {
            console.error("Gemini API returned an empty response text.");
            throw new Error("Received an empty response from the AI agent.");
        }
        
        const parsedJson = JSON.parse(responseText);

        if (parsedJson && parsedJson.text && parsedJson.explanation) {
             const { text, explanation, code, suggestions } = parsedJson;
             return { text, explanation, code, suggestions };
        }
        
        console.error("Gemini API returned unexpected JSON structure:", responseText);
        throw new Error("Received an invalid response from the AI agent.");

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                 throw new Error(`Invalid Gemini API key. Please ensure it is correctly configured in the environment.`);
            }
            throw new Error(`Gemini API request failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the Gemini API.");
    }
}

export async function getAiHint(history: ChatMessage[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const model = "gemini-2.5-flash";

    const systemInstruction = `You are a helpful AI assistant. The user is in a web development sandbox. Based on the last few messages of the conversation, suggest one single, concise, and practical next step for the user.
- The suggestion should be a prompt the user can give to an AI.
- Return ONLY the suggested prompt text.
- Do NOT include any preamble, explanation, or markdown formatting.
- Be creative and helpful. For example, if the user just added a button, suggest styling it or adding a click handler.
- Keep the suggestion under 15 words.`;

    // Take the last 4 messages for context, it's enough for a hint.
    const lastMessages = history.slice(-4);
    
    const contents = lastMessages
        .filter(msg => msg.role === 'user' || msg.role === 'model')
        .map(msg => ({
            role: msg.role,
            // Use the main content for hints, not the detailed explanation
            parts: [{ text: msg.content }],
        }));

    try {
        const response = await ai.models.generateContent({
            model,
            contents,
            config: {
                systemInstruction,
                temperature: 0.8, // Higher temperature for more creative hints
                stopSequences: ['\n'] // Stop at the first newline to keep it concise
            },
        });

        return response.text?.trim() || '';
    } catch (error) {
        console.error("Error fetching AI hint:", error);
        // Fail silently, a missing hint is not a critical error.
        return '';
    }
}


export async function refineCodeWithAgent(code: string, language: string, instruction: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const model = "gemini-2.5-flash";

    const systemInstruction = `You are a world-class software engineer. Your task is to modify the user's code based on their instruction.
You MUST only return the complete, raw code for the specified language.
Do NOT include any markdown formatting like \`\`\`${language} or \`\`\`.
Do NOT include any explanations, comments about your changes, or any other text that is not valid code.
Your output will be directly placed into a code editor, so it must be perfect.
`;

    const userPrompt = `Instruction: "${instruction}"

Language: ${language}

Current Code:
---
${code}
---
`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: userPrompt,
            config: {
                systemInstruction,
                temperature: 0.2, // Lower temperature for more deterministic code output
            }
        });

        const refinedCode = response.text?.trim() || '';
        return refinedCode;

    } catch (error) {
        console.error("Error calling Gemini API for code refinement:", error);
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                 throw new Error(`Invalid Gemini API key. Please ensure it is correctly configured in the environment.`);
            }
            throw new Error(`Gemini API request failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the Gemini API.");
    }
}
