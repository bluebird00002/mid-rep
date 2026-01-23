import React from "react";
import "./About.css";
import "@fontsource/jetbrains-mono";
import { TypeAnimation } from "react-type-animation";
import { motion } from "framer-motion";
import { ChevronRight, Smile, Dot, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import geminiService from "../services/geminiService";
import api from "../services/api";

function AboutMiD() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStage, setCurrentStage] = useState(1);
  const [userInputs, setUserInputs] = useState({});
  const [smileIcon, setSmileIcon] = useState(false);
  const [inputProcessing, setInputProcessing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const containerRef = useRef(null);
  const [isNewUser, setIsNewUser] = useState(null);
  const [messages, setMessages] = useState([]);

  // Initialize AI when component mounts
  useEffect(() => {
    const initializeAI = async () => {
      try {
        const status = await api.request("/ai/status");
        if (status.success && status.data.configured) {
          setAiEnabled(true);
          geminiService.initializeContext(user?.username || "User");
          console.log("✅ AI Service Enabled");
        } else {
          console.log("⚠️ AI Service not configured, using fallback mode");
          setAiEnabled(false);
        }
      } catch (error) {
        console.error("Failed to initialize AI:", error);
        setAiEnabled(false);
      }
    };

    if (user) {
      initializeAI();
    }
  }, [user]);

  // Get user status from Welcome page
  useEffect(() => {
    if (
      location.state?.fromWelcome &&
      location.state?.isNewUser !== undefined
    ) {
      setIsNewUser(location.state.isNewUser);
    } else {
      const userVisited = localStorage.getItem(
        `mid_visited_${user?.id || "guest"}`
      );
      setIsNewUser(!userVisited);
    }
  }, [location.state, user?.id]);

  useEffect(() => {
    if (!user) {
      navigate("/MiD/Home");
      return;
    }
    sessionStorage.setItem("mid_lastPage", "/MiD/AboutMiD");
    if (currentStage > 15) {
      localStorage.setItem(`mid_visited_${user.id}`, "true");
    }
  }, [user, navigate, currentStage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }, 100);
    }
  }, [currentStage, messages]);

  // Auto-advance through intro stages
  useEffect(() => {
    if (currentStage >= 1 && currentStage <= 3) {
      const timer = setTimeout(() => {
        setCurrentStage(currentStage + 1);
      }, 2000); // 2 second delay between stages
      return () => clearTimeout(timer);
    }
  }, [currentStage]);

  // Get AI response for user input
  const getAIResponse = async (userMessage) => {
    if (!aiEnabled) {
      return null;
    }

    try {
      setAiLoading(true);
      const response = await geminiService.generateResponse(userMessage, {
        stage: currentStage,
        isNewUser: isNewUser,
        username: user?.username,
      });

      if (response.success) {
        setConversationHistory([
          ...conversationHistory,
          { role: "user", content: userMessage },
          { role: "model", content: response.message },
        ]);
        return response.message;
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
    } finally {
      setAiLoading(false);
    }
    return null;
  };

  const addMessage = (speaker, message, isAI = false) => {
    setMessages((prev) => [...prev, { speaker, message, isAI }]);
  };

  const handleUserInput = async (inputValue, inputKey, nextStage, onEnter) => {
    if (inputProcessing || inputValue.trim() === "") return;

    setInputProcessing(true);

    // Add user message to display
    addMessage("User", inputValue);

    // Get AI response if asking a question
    let shouldProceed = true;
    if (
      inputKey === "question" ||
      (aiEnabled && nextStage && nextStage > currentStage)
    ) {
      const aiResponse = await getAIResponse(inputValue);
      if (aiResponse) {
        addMessage("Mother", aiResponse, true);
        shouldProceed = true;
      } else if (inputKey !== "question") {
        shouldProceed = true;
      }
    }

    // Clear input
    setUserInputs((prev) => ({ ...prev, [inputKey]: "" }));

    // Execute callback
    if (onEnter) {
      onEnter(inputValue);
    } else if (shouldProceed && nextStage) {
      setTimeout(() => setCurrentStage(nextStage), 500);
    }

    setTimeout(() => setInputProcessing(false), 500);
  };

  const updateInput = (inputKey, value) => {
    setUserInputs((prev) => ({ ...prev, [inputKey]: value }));
  };

  // System messages that don't need AI
  const systemMessages = [
    {
      stage: 1,
      speaker: "System",
      message: `Welcome, ${user?.username || "User"}. Initializing Mother AI...`,
      delay: 1500,
    },
    {
      stage: 2,
      speaker: "System",
      message: "Connecting to diary core...",
      delay: 1500,
    },
    {
      stage: 3,
      speaker: "System",
      message: "Loading memory interface...",
      delay: 1500,
    },
    {
      stage: 4,
      speaker: "System",
      message: "Initialization complete. Engaging Mother AI.",
      delay: 2000,
      nextStage: 5,
    },
  ];

  const skipIntro = () => {
    navigate("/MiD/MyDiary");
  };

  const renderMessage = (msg, index) => {
    const { speaker, message, isAI } = msg;
    const isList = speaker === "list";

    return (
      <div
        className={`flex-type ${isList ? "list" : ""}`}
        key={`msg-${index}`}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="MiD-sys"
        >
          {isList ? (
            <Dot size={18} strokeWidth={3} />
          ) : (
            <>
              {speaker}
              <ChevronRight size={16} strokeWidth={3} />
            </>
          )}
        </motion.div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <TypeAnimation
            sequence={[
              "",
              isAI ? 500 : 1000,
              message,
              () => {},
            ]}
            cursor={false}
            repeat={0}
            speed={0}
            deletionSpeed={80}
          />
        </motion.span>
        {speaker === "Mother" && smileIcon && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Smile size={20} />
          </motion.span>
        )}
      </div>
    );
  };

  const renderInitialStages = () => {
    const rendered = [];
    for (let i = 1; i <= currentStage && i <= 4; i++) {
      const msg = systemMessages[i - 1];
      if (msg && currentStage >= i) {
        rendered.push(renderMessage(msg, `init-${i}`));
      }
    }
    return rendered;
  };

  return (
    <>
      <div
        className="about-body"
        style={{
          height: "auto",
          minHeight: "100vh",
          position: "relative",
        }}
      >
        {/* Skip Intro Button */}
        {currentStage < 100 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            onClick={skipIntro}
            className="skip-intro-button"
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              padding: "8px 16px",
              backgroundColor: "rgba(100, 100, 100, 0.5)",
              color: "#fff",
              border: "1px solid rgba(150, 150, 150, 0.7)",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "500",
              zIndex: 1000,
              transition: "all 0.3s ease",
            }}
            whileHover={{
              backgroundColor: "rgba(100, 100, 100, 0.8)",
              borderColor: "rgba(200, 200, 200, 0.9)",
            }}
            whileTap={{
              scale: 0.95,
            }}
          >
            Skip
          </motion.button>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="animation-container"
          ref={containerRef}
        >
          {/* Initial system messages */}
          {renderInitialStages()}

          {/* Main introduction with AI */}
          {currentStage >= 4 && (
            <>
              {/* Mother's greeting */}
              {currentStage >= 5 && (
                <div className="flex-type">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="MiD-sys"
                  >
                    Mother<ChevronRight size={16} strokeWidth={3} />
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <TypeAnimation
                      sequence={[
                        "",
                        500,
                        `Greetings, ${user?.username || "User"}. I'm Mother, your AI guide for MiD.`,
                        () => setSmileIcon(true),
                      ]}
                      cursor={false}
                      repeat={0}
                      speed={0}
                    />
                  </motion.span>
                  {smileIcon && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Smile size={20} />
                    </motion.span>
                  )}
                </div>
              )}

              {/* AI enabled message */}
              {currentStage >= 6 && aiEnabled && (
                <div className="flex-type">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="MiD-sys"
                  >
                    Mother<ChevronRight size={16} strokeWidth={3} />
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <TypeAnimation
                      sequence={[
                        "",
                        500,
                        "I'm an AI assistant integrated into your diary system. I can help you organize memories, answer questions about the diary, and guide you through features. What would you like to know?",
                      ]}
                      cursor={false}
                      repeat={0}
                      speed={0}
                    />
                  </motion.span>
                </div>
              )}

              {/* User messages and AI responses */}
              {messages.map((msg, idx) => renderMessage(msg, `chat-${idx}`))}

              {/* AI Loading indicator */}
              {aiLoading && (
                <div className="flex-type">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="MiD-sys"
                  >
                    <Loader2 size={16} strokeWidth={3} />
                  </motion.div>
                  <span>Mother is thinking...</span>
                </div>
              )}

              {/* User input */}
              {currentStage >= 6 && (
                <div className="flex-type input-type">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="MiD-sys"
                  >
                    {user?.username || "User"}
                    <ChevronRight size={16} strokeWidth={3} />
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="input-field-wrapper"
                  >
                    <input
                      type="text"
                      value={userInputs.question || ""}
                      onChange={(e) =>
                        !inputProcessing && updateInput("question", e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !inputProcessing && aiEnabled) {
                          handleUserInput(
                            e.target.value,
                            "question",
                            null,
                            null
                          );
                        } else if (e.key === "Enter" && !inputProcessing && !aiEnabled) {
                          skipIntro();
                        }
                      }}
                      disabled={inputProcessing}
                      placeholder={
                        aiEnabled
                          ? "Ask me anything about the diary..."
                          : "Press ENTER to continue to your diary"
                      }
                      autoFocus={true}
                      className="intro-input"
                    />
                  </motion.span>
                </div>
              )}

              {/* Proceed button if AI not available */}
              {currentStage >= 6 && !aiEnabled && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  onClick={skipIntro}
                  className="proceed-button"
                  style={{
                    padding: "10px 20px",
                    marginTop: "20px",
                    backgroundColor: "rgba(186, 113, 4, 0.7)",
                    color: "#fff",
                    border: "1px solid rgba(186, 113, 4, 0.9)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                  whileHover={{
                    backgroundColor: "rgba(186, 113, 4, 0.9)",
                  }}
                  whileTap={{
                    scale: 0.95,
                  }}
                >
                  Go to Diary
                </motion.button>
              )}
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}

export default AboutMiD;
