
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ VITE_GEMINI_API_KEY not found in .env");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        console.log("Fetching available models...");
        const result = await client.models.list();

        console.log("\n✅ Available Models:");
        // The structure works differently in some versions, try to adapt
        const models = result.models || result;

        if (Array.isArray(models)) {
            models.forEach((m) => {
                // Only show gemini models to keep list short
                if (m.name && m.name.includes('gemini')) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("Raw result:", JSON.stringify(result, null, 2));
        }

    } catch (error) {
        console.error("❌ Error listing models:", error.message);
    }
}

listModels();
