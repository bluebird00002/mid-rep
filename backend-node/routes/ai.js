// AI Routes for Gemini Integration
// Handles AI chat and responses for MiD Diary System

import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompt for Mother AI
const MOTHER_SYSTEM_PROMPT = `You are Mother, a warm and intelligent AI assistant for MiD (My Individual Diary), a personal diary system.

Your role is to:
1. Help users understand the diary system during onboarding
2. Answer questions about diary features and commands
3. Provide supportive, encouraging responses
4. Keep responses concise and friendly
5. Guide users through the intro experience

Important constraints:
- You are helping users with a PERSONAL DIARY SYSTEM
- You ONLY answer questions related to: diary features, memory management, commands, how to use MiD, organizing memories, emotions tracking
- For out-of-scope questions, politely redirect the user back to diary-related topics
- Always refer to yourself as "Mother" (your AI name in this system)
- Keep the conversational tone warm but informative
- Never claim to store actual memories or data - you're just a guide
- Response length: 1-3 sentences for intro, max 5 sentences for questions
- Start responses with warmth and understanding
- Be encouraging and supportive`;

// POST /api/ai/chat - Main chat endpoint
router.post("/chat", async (req, res) => {
  try {
    const { message, conversationHistory = [], context = {} } = req.body;

    // Validate required fields
    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "AI service not configured. Please set GEMINI_API_KEY.",
      });
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Build conversation context for Gemini
    const messages = [];

    // Add system prompt as first user message
    messages.push({
      role: "user",
      parts: [{ text: MOTHER_SYSTEM_PROMPT }],
    });

    messages.push({
      role: "model",
      parts: [{ text: "I understand. I'm Mother, ready to help you with MiD." }],
    });

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg) => {
        messages.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.parts[0].text }],
        });
      });
    }

    // Add context information
    let contextMessage = "";
    if (context.username) {
      contextMessage += `User's name: ${context.username}\n`;
    }
    if (context.isNewUser) {
      contextMessage += `This is a new user experiencing the intro for the first time.\n`;
    }
    if (context.stage) {
      contextMessage += `Current stage: ${context.stage}\n`;
    }
    if (contextMessage) {
      messages.push({
        role: "user",
        parts: [{ text: `[Context: ${contextMessage}]` }],
      });
      messages.push({
        role: "model",
        parts: [{ text: "I've noted this context. Ready to help." }],
      });
    }

    // Add current user message
    messages.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Call Gemini API
    const result = await model.generateContent({
      contents: messages,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    });

    const response = result.response;
    const aiMessage = response.text();

    // Return response
    return res.json({
      success: true,
      data: {
        message: aiMessage,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("AI Chat Error:", error);

    // Check for specific error types
    if (error.message.includes("API key")) {
      return res.status(500).json({
        success: false,
        error: "AI service configuration error",
      });
    }

    if (error.message.includes("quota")) {
      return res.status(429).json({
        success: false,
        error: "AI service rate limit reached. Please try again later.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Error communicating with AI service",
      details: error.message,
    });
  }
});

// POST /api/ai/validate-scope - Check if message is diary-related
router.post("/validate-scope", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "AI service not configured",
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const validationPrompt = `Is this message related to a personal diary system, memory management, journaling, or emotions tracking? 
Message: "${message}"
Answer with ONLY "yes" or "no".`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: validationPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 10,
      },
    });

    const response = result.response.text().toLowerCase().trim();
    const isInScope = response.includes("yes");

    return res.json({
      success: true,
      data: {
        isInScope,
        message,
      },
    });
  } catch (error) {
    console.error("Scope Validation Error:", error);

    // Default to in-scope on error for better UX
    return res.json({
      success: true,
      data: {
        isInScope: true,
        message: "Validation unavailable, defaulting to in-scope",
      },
    });
  }
});

// GET /api/ai/status - Check AI service status
router.get("/status", (req, res) => {
  const isConfigured = !!process.env.GEMINI_API_KEY;

  return res.json({
    success: true,
    data: {
      configured: isConfigured,
      service: "Google Gemini",
      model: "gemini-pro",
      status: isConfigured ? "ready" : "not configured",
    },
  });
});

export default router;
