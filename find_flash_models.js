
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ API Key missing");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function findFlashModel() {
    try {
        console.log("Searching for Flash models...");
        const result = await client.models.list();
        const models = result.models || result;

        if (Array.isArray(models)) {
            const flashModels = models.filter((m) => m.name && m.name.toLowerCase().includes('flash'));
            console.log("\n✅ Found Flash Models:");
            flashModels.forEach(m => console.log(`- ${m.name.replace('models/', '')}`)); // Print clean names
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

findFlashModel();
