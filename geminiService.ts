import { GoogleGenAI } from "@google/genai";
import { MealAnalysis } from "../types";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

console.log('🔑 API Keys loaded:', {
  gemini: GEMINI_KEY ? '✓ Present' : '✗ Missing',
  openrouter: OPENROUTER_KEY ? '✓ Present' : '✗ Missing',
  groq: GROQ_KEY ? '✓ Present' : '✗ Missing'
});

// Lazy Gemini Client initialization to prevent crashes
let geminiClient: any = null;
const getGeminiClient = () => {
  if (!GEMINI_KEY) return null;
  if (geminiClient) return geminiClient;

  try {
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_KEY }) as any;
    console.log('✅ Gemini client initialized successfully');
    return geminiClient;
  } catch (error: any) {
    console.warn('⚠️ Gemini client initialization failed:', error.message);
    return null;
  }
};

export const analyzeMealImage = async (base64Image: string, mimeType: string): Promise<MealAnalysis> => {
  let lastError = "No AI provider succeeded";

  // 1. Try Gemini (Primary)
  const client = getGeminiClient();
  if (client) {
    try {
      console.log("Attempting Gemini Analysis (Strict Mode)...");

      if (!base64Image || base64Image.length < 100) {
        throw new Error("Invalid image data. Please try uploading again.");
      }

      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite-preview-09-2025',
        contents: [
          {
            role: 'user',
            parts: [
              { text: getPrompt() },
              { inlineData: { mimeType: mimeType, data: base64Image } }
            ]
          }
        ],
        config: {
          temperature: 0,
          topP: 0.1,
          candidateCount: 1,
        }
      });

      const text = extractText(result);
      if (text) return parseResponse(text, "Gemini Flash");
    } catch (error: any) {
      if (error.message?.includes("429") || error.status === 429) {
        lastError = "⚠️ Quota Exceeded. Please wait 1 minute before trying again.";
      } else {
        lastError = `Gemini failed: ${error.message}`;
      }
      console.warn(lastError);
    }
  }

  // 2. Try OpenRouter (Fallback 1)
  if (OPENROUTER_KEY) {
    try {
      console.log("Attempting OpenRouter Analysis...");
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Gym Smart AI"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.2-11b-vision-instruct",
          temperature: 0,
          seed: 42,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: getPrompt() },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Status ${response.status}: ${errData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return parseResponse(text, "OpenRouter");
    } catch (error: any) {
      lastError = `OpenRouter failed: ${error.message}`;
      console.error(lastError);
    }
  }

  // 3. Try Groq (Fallback 2)
  if (GROQ_KEY) {
    try {
      console.log("Attempting Groq Analysis...");
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.2-11b-vision-preview",
          temperature: 0,
          seed: 42,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: getPrompt() },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Status ${response.status}: ${errData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return parseResponse(text, "Groq");
    } catch (error: any) {
      lastError = `Groq failed: ${error.message}`;
      console.error(lastError);
    }
  }

  console.log("All AI providers failed.");
  // THROW ERROR instead of returning mock data
  throw new Error(`AI Analysis Failed. Please check your internet connection or API Key. (${lastError})`);
};

const extractText = (response: any): string => {
  if (!response) return "";
  if (typeof response.text === 'string') return response.text;
  if (typeof response.text === 'function') {
    try { return response.text(); } catch { }
  }
  const candidates = response.candidates || response.response?.candidates;
  if (candidates?.[0]?.content?.parts?.[0]?.text) {
    return candidates[0].content.parts[0].text;
  }
  return JSON.stringify(response);
};

const getPrompt = () => `
  You are an expert nutritionist analyzing a meal photo. Your PRIMARY job is to identify EXACTLY and ONLY what foods are ACTUALLY VISIBLE in the image, then calculate REALISTIC nutritional values with PRECISE RANGES.

  🚨 CRITICAL RULES - FOLLOW STRICTLY:
  
  1. VISUAL ACCURACY - IDENTIFY ONLY WHAT YOU SEE:
     ❌ DO NOT invent ingredients that are not visible
     ❌ DO NOT use generic terms like "simple ingredients", "various items", "mixed foods"
     ❌ DO NOT assume ingredients (e.g., don't say "broccoli" if you see berries)
     ✅ ONLY list foods you can CLEARLY SEE in the image
     ✅ Be SPECIFIC: "Fried Eggs" not "eggs", "Sliced Avocado" not "vegetables"
     ✅ Count items: "2 Fried Eggs", "2 Slices of Toast", "Handful of Raspberries"
  
  2. INGREDIENT NAMING - BE PRECISE WITH RANGES:
     - Providing a single number is often inaccurate. Use RANGES for weight where appropriate.
     - Format: "Ingredient Name (Weight Range)"
     - Examples:
       * "Sliced Avocado (45-50g)" instead of just "Avocado"
       * "Grilled Chicken Breast (120-130g)"
       * "White Rice (140-150g)"
       * "Fresh Raspberries (50-60g)"
  
  3. PORTION ESTIMATION (Visual Reference):
     - 1 Large Egg = ~50g (6g protein, 5g fat, 70 kcal)
     - 1 Slice of Toast = ~30g (15g carbs, 2.5g protein, 75 kcal)
     - Palm-sized protein = ~100-120g
     - Fist-sized carb = ~150g
     - Thumb-sized fat = ~30g
     - Handful of berries = ~50-80g
  
  4. NUTRITIONAL DATABASE (USDA Standards):
     
     🥚 EGGS & DAIRY:
     - Fried Egg (1 large ~50g): 6g protein, 5g fat, 0.6g carbs, 90 kcal
     - Scrambled Eggs (per 100g): 10g protein, 11g fat, 1.5g carbs, 149 kcal
     - Boiled Egg (1 large): 6g protein, 5g fat, 0.6g carbs, 78 kcal
     
     🍞 BREAD & GRAINS:
     - White Toast (1 slice ~30g): 15g carbs, 2.5g protein, 1g fat, 79 kcal
     - Whole Wheat Toast (1 slice ~30g): 12g carbs, 3.5g protein, 1.5g fat, 81 kcal
     - White Rice (per 100g cooked): 28g carbs, 2.7g protein, 0.3g fat, 130 kcal
     - Brown Rice (per 100g cooked): 23g carbs, 2.6g protein, 0.9g fat, 112 kcal
     - Oats (40g dry): 27g carbs, 5g protein, 3g fat, 150 kcal
     
     🥑 HEALTHY FATS:
     - Avocado (per 100g): 9g carbs, 2g protein, 15g fat, 160 kcal, 7g fiber
     - Sliced Avocado (~50g): 4.5g carbs, 1g protein, 7.5g fat, 80 kcal
     - Olive Oil (1 tbsp ~15ml): 0g carbs, 0g protein, 14g fat, 120 kcal
     - Almonds (per 100g): 22g carbs, 21g protein, 49g fat, 579 kcal
     
     🍓 FRUITS & BERRIES:
     - Raspberries (per 100g): 12g carbs, 1.2g protein, 0.7g fat, 52 kcal, 6.5g fiber, 4.4g sugar
     - Blueberries (per 100g): 14g carbs, 0.7g protein, 0.3g fat, 57 kcal, 2.4g fiber, 10g sugar
     - Strawberries (per 100g): 8g carbs, 0.7g protein, 0.3g fat, 32 kcal, 2g fiber, 4.9g sugar
     - Banana (1 medium ~120g): 27g carbs, 1.3g protein, 0.4g fat, 105 kcal, 3g fiber, 14g sugar
     
     🥦 VEGETABLES:
     - Broccoli (per 100g): 7g carbs, 2.8g protein, 0.4g fat, 34 kcal, 2.6g fiber
     - Spinach (per 100g): 3.6g carbs, 2.9g protein, 0.4g fat, 23 kcal, 2.2g fiber
     - Bell Peppers (per 100g): 6g carbs, 1g protein, 0.3g fat, 26 kcal, 2g fiber
     - Cherry Tomatoes (per 100g): 3.9g carbs, 0.9g protein, 0.2g fat, 18 kcal
     
     🍗 PROTEINS:
     - Chicken Breast (per 100g cooked): 31g protein, 3.6g fat, 0g carbs, 165 kcal
     - Salmon (per 100g cooked): 25g protein, 12g fat, 0g carbs, 206 kcal
     - Tuna (per 100g): 30g protein, 1g fat, 0g carbs, 132 kcal
  
  5. CALCULATION STEPS:
     Step 1: List ONLY visible ingredients with estimated weights
     Step 2: Calculate nutrition for EACH ingredient separately
     Step 3: Sum up totals: weight, calories, protein, carbs, fats, fiber, sugar
     Step 4: Calculate healthScore (0-100):
        - High protein (20g+) = +30 points
        - Vegetables/Fruits present = +25 points
        - Healthy fats (avocado, nuts) = +20 points
        - Low processed foods = +15 points
        - Balanced macros = +10 points
  
  6. ADVICE GUIDELINES:
     - Be specific and encouraging
     - Mention what's good about the meal
     - Suggest ONE improvement if needed
     - Keep it under 2 sentences
  
  7. OUTPUT FORMAT (JSON ONLY):
     {
       "foodName": "Descriptive name based on visible items",
       "ingredients": ["Item 1 (Weight-Range)", "Item 2 (Weight-Range)", "Item 3 (Weight-Range)"],
       "portionSize": "Small/Medium/Large",
       "weight": total_grams,
       "calories": total_kcal,
       "protein": total_grams,
       "carbs": total_grams,
       "fats": total_grams,
       "fiber": total_grams,
       "sugar": total_grams,
       "healthScore": 0-100,
       "advice": "Your specific advice here"
     }
  
  📋 EXAMPLE (Breakfast with eggs, toast, avocado, berries):
  {
    "foodName": "Breakfast Plate with Eggs, Toast, Avocado and Berries",
    "ingredients": ["2 Fried Eggs (90-100g)", "2 Slices White Toast (60g)", "Sliced Avocado (45-50g)", "Fresh Raspberries (50-60g)", "Blueberries (30-40g)"],
    "portionSize": "Medium",
    "weight": 330,
    "calories": 565,
    "protein": 18,
    "carbs": 48,
    "fats": 30,
    "fiber": 12,
    "sugar": 9,
    "healthScore": 82,
    "advice": "Great balanced breakfast! High in protein and healthy fats. The berries add excellent antioxidants and fiber."
  }
  
  🎯 NOW: Analyze the image carefully. Identify ONLY what you actually see. Return ONLY the JSON object.
`;

const parseResponse = (text: string, provider: string): MealAnalysis => {
  try {
    console.log(`[AI SUCCESS] Raw response from ${provider}:`, text);

    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1) {
      throw new Error("No JSON found in response");
    }

    let jsonStr = text.substring(startIndex, endIndex + 1);

    jsonStr = jsonStr
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');

    const parsed: any = JSON.parse(jsonStr);

    return {
      foodName: (parsed.foodName || parsed.food_name || "Unknown Meal") + ` [via ${provider}]`,
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      portionSize: parsed.portionSize || parsed.portion_size || "Estimate",
      weight: Number(parsed.weight) || 0,
      calories: Number(parsed.calories) || Number(parsed.kcal) || Number(parsed.energy) || 0,
      protein: Number(parsed.protein) || 0,
      carbs: Number(parsed.carbs) || 0,
      fats: Number(parsed.fats) || 0,
      fiber: Number(parsed.fiber) || 0,
      sugar: Number(parsed.sugar) || 0,
      healthScore: Number(parsed.healthScore) || Number(parsed.score) || 50,
      advice: parsed.advice || "Enjoy your meal!",
      timestamp: new Date()
    };
  } catch (e: any) {
    console.error(`[AI PARSE ERROR] from ${provider}:`, e.message, "\nText received:", text);
    throw new Error(`Analysis from ${provider} was unclear. (${e.message})`);
  }
};

const getMockData = (): MealAnalysis => ({
  foodName: "Mock Data (API Failed)",
  ingredients: ["Error: API Key Invalid or Network Issue"],
  portionSize: "N/A",
  weight: 0,
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
  fiber: 0,
  sugar: 0,
  healthScore: 0,
  advice: "Please check your API Key in .env and restart the server.",
  timestamp: new Date()
});

export const getAiCoachResponse = async (userMessage: string, context?: string): Promise<string> => {
  const client = getGeminiClient();
  if (client) {
    try {
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite-preview-09-2025',
        contents: [{ role: 'user', parts: [{ text: `${context}\n\nUser: ${userMessage}` }] }]
      });
      const text = extractText(result);
      return text || "I'm ready to train.";
    } catch (e) {
      console.warn("Chat Gemini failed, trying OpenRouter...");
    }
  }

  if (OPENROUTER_KEY) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENROUTER_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct:free",
          messages: [{ role: "user", content: userMessage }]
        })
      });
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "I'm pushing through some technical lag!";
    } catch (e) {
      return "I'm offline but keeps training!";
    }
  }

  if (GROQ_KEY) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: userMessage }]
        })
      });
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "I'm pushing through some technical lag!";
    } catch (e) {
      console.warn("Groq chat failed...");
    }
  }

  return "Keep pushing! System is in offline mode.";
};