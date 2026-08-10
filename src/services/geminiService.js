// Gemini AI Service for MiD Diary System
// Legacy filename retained for compatibility; requests use the backend's Groq-powered Mother service.

import api from "./api";

class GeminiService {
  constructor() {
    this.conversationHistory = [];
    this.systemPrompt = `You are Mother, a warm and intelligent AI assistant for MiD (My Individual Diary), a personal diary system. 

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
- Response length: 1-3 sentences for intro, max 5 sentences for questions`;
  }

  // Initialize conversation context for a user
  initializeContext(username) {
    this.username = username;
    this.conversationHistory = [
      {
        role: "user",
        parts: [{ text: `My name is ${username}` }],
      },
      {
        role: "model",
        parts: [
          {
            text: `Greetings, ${username}. Welcome to MiD. I'm Mother, your AI guide for this personal diary system.`,
          },
        ],
      },
    ];
  }

  // Get AI response based on user input and context
  async generateResponse(userMessage, context = {}) {
    try {
      // Call backend endpoint for Gemini integration
      const response = await api.request("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: this.conversationHistory,
          context: {
            username: this.username,
            stage: context.stage,
            isNewUser: context.isNewUser,
            ...context,
          },
        }),
      });

      if (response.success) {
        const aiMessage = response.data.message;

        // Add to conversation history
        this.conversationHistory.push({
          role: "user",
          parts: [{ text: userMessage }],
        });
        this.conversationHistory.push({
          role: "model",
          parts: [{ text: aiMessage }],
        });

        return {
          success: true,
          message: aiMessage,
        };
      } else {
        return {
          success: false,
          message: "I apologize, but I'm having trouble responding right now.",
        };
      }
    } catch (error) {
      console.error("Gemini Service Error:", error);
      return {
        success: false,
        message:
          "I apologize, I'm temporarily unavailable. Please try again.",
      };
    }
  }

  // Get intro greeting from Mother
  async getIntroGreeting(username) {
    this.initializeContext(username);
    return {
      success: true,
      message: `Greetings, ${username}. Welcome to MiD. I'm Mother, your AI guide.`,
    };
  }

  // Get feature explanation
  async explainFeature(feature) {
    const prompt = `User is asking about the "${feature}" feature of MiD diary system. Explain it briefly and warmly.`;

    return this.generateResponse(prompt, { stage: "feature_explanation" });
  }

  // Validate if message is diary-related (out-of-scope detection)
  async validateDiaryScope(userMessage) {
    try {
      const response = await api.request("/ai/validate-scope", {
        method: "POST",
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      return response.data.isInScope || false;
    } catch (error) {
      // If validation fails, assume it's in scope
      return true;
    }
  }

  // Get helpful out-of-scope redirect message
  getOutOfScopeResponse() {
    return "I'm here to help you with the MiD diary system. Could you ask me something about your diary, memories, or how to use the features?";
  }

  // Clear conversation history (for starting fresh)
  clearHistory() {
    this.conversationHistory = [];
  }

  // Get conversation history (for context)
  getHistory() {
    return this.conversationHistory;
  }
}

// Export singleton instance
const geminiService = new GeminiService();
export default geminiService;
