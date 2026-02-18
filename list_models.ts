import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars manually since we are running this with ts-node or similar
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.config({ path: envPath });

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ VITE_GEMINI_API_KEY not found in .env");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        console.log("Fetching available models...");
        // @ts-ignore - formatting might vary in different lib versions
        const result = await client.models.list();

        console.log("\n✅ Available Models:");
        // The structure might be result.models or result directly depending on version
        const models = result.models || result;

        if (Array.isArray(models)) {
            models.forEach((m: any) => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name} (${m.supportedGenerationMethods?.join(', ')})`);
                }
            });
        } else {
            console.log("Could not parse models list:", JSON.stringify(result, null, 2));
        }

    } catch (error: any) {
        console.error("❌ Error listing models:", error.message);
        if (error.response) {
            console.error("Response:", JSON.stringify(error.response, null, 2));
        }
    }
}

listModels();
