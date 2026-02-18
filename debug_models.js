
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
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function debugModels() {
    try {
        const result = await client.models.list();
        const models = result.models || result;

        console.log("Type:", Array.isArray(models) ? "Array" : typeof models);
        if (Array.isArray(models)) {
            console.log("Count:", models.length);
            models.forEach(m => {
                if (m.name.includes('flash') || m.name.includes('gemini')) {
                    console.log(m.name);
                }
            });
        } else {
            console.log(JSON.stringify(models, null, 2));
        }
    } catch (error) {
        console.error(error.message);
    }
}

debugModels();
