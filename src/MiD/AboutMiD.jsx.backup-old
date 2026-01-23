import React from "react";
import "./About.css";
import "@fontsource/jetbrains-mono";
import { TypeAnimation } from "react-type-animation";
import { motion } from "framer-motion";
import { ChevronRight, Smile, Dot } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AboutMiD() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStage, setCurrentStage] = useState(1);
  const [userInputs, setUserInputs] = useState({});
  const [smileIcon, setSmileIcon] = useState(false);
  const [inputProcessing, setInputProcessing] = useState(false);
  const containerRef = useRef(null);

  // Get user status from Welcome page or check localStorage
  const [isNewUser, setIsNewUser] = useState(null);

  useEffect(() => {
    // If coming from Welcome page, use that data
    if (
      location.state?.fromWelcome &&
      location.state?.isNewUser !== undefined
    ) {
      console.log(
        "📍 AboutMiD received isNewUser from Welcome:",
        location.state.isNewUser
      );
      setIsNewUser(location.state.isNewUser);
    } else {
      // Fallback to localStorage check
      const userVisited = localStorage.getItem(
        `mid_visited_${user?.id || "guest"}`
      );
      console.log(
        "📍 AboutMiD checking localStorage - userVisited:",
        userVisited
      );
      setIsNewUser(!userVisited);
    }
  }, [location.state, user?.id]);

  useEffect(() => {
    if (!user) {
      navigate("/MiD/Home");
      return;
    }
    // Save current page
    sessionStorage.setItem("mid_lastPage", "/MiD/AboutMiD");
    // Mark as visited after intro completes
    if (currentStage > 15) {
      localStorage.setItem(`mid_visited_${user.id}`, "true");
    }
  }, [user, navigate, currentStage]);

  // Auto-scroll to bottom when new content appears
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentStage]);

  const handleInput = (e, inputKey, nextStage, validationFn) => {
    if (e.key === "Enter" && !inputProcessing) {
      const inputValue = userInputs[inputKey] || "";
      if (validationFn(inputValue)) {
        setInputProcessing(true);
        setCurrentStage(nextStage);
        setUserInputs((prev) => ({ ...prev, [inputKey]: "" }));
        // Unlock input after a brief delay for next stage
        setTimeout(() => setInputProcessing(false), 500);
      }
    }
  };

  const updateInput = (inputKey, value) => {
    setUserInputs((prev) => ({ ...prev, [inputKey]: value }));
  };

  // Tutorial stages configuration
  const stages = {
    1: {
      speaker: "MiD",
      message: "Boot sequence initiated...",
      delay: 2000,
      nextStage: 2,
    },
    2: {
      speaker: "MiD",
      message: "Verifying system modules...",
      delay: 3000,
      nextStage: 3,
    },
    3: {
      speaker: "MiD",
      message: "Linking memory clusters...",
      delay: 3000,
      nextStage: 4,
    },
    4: {
      speaker: "MiD",
      message: "Running environment scan...",
      delay: 4000,
      nextStage: 5,
    },
    5: {
      speaker: "MiD",
      message: "All good. Initialization complete.",
      delay: 3000,
      nextStage: 6,
    },
    6: {
      speaker: "MiD",
      message: `Hello, ${user?.username || "User"}. Welcome to MiD.`,
      delay: 2000,
      nextStage: 7,
    },
    7: {
      speaker: "MiD",
      message: "Before we proceed, Mother would like to introduce the system.",
      delay: 2000,
      nextStage: 8,
    },
    8: {
      speaker: "MiD",
      message:
        "Please type: 'READY' to proceed with the system intro or 'SKIP' to skip the intro.",
      delay: 2000,
      nextStage: 9,
    },
    9: {
      type: "input",
      speaker: "User",
      placeholder: "type here...",
      inputKey: "ready",
      validation: (val) => {
        const lower = val.toLowerCase();
        return (
          lower.includes("ready") ||
          lower.includes("proceed") ||
          lower === "skip"
        );
      },
      onEnter: (val) => {
        const lower = val.toLowerCase();
        if (lower === "skip") {
          navigate("/MiD/MyDiary");
        } else {
          setCurrentStage(10);
        }
      },
    },
    10: {
      speaker: "Mother",
      message: `Greetings, ${user?.username || "User"}. Welcome to MiD.`,
      delay: 1800,
      nextStage: 11,
      onComplete: () => setSmileIcon(true),
    },
    11: {
      speaker: "Mother",
      message: "I'll give you a short guided tour of the core features.",
      delay: 1600,
      nextStage: 12,
    },
    12: {
      speaker: "MiD",
      message:
        "MiD is your personal diary that stores memories as structured data.",
      delay: 1600,
      nextStage: 13,
    },
    13: {
      speaker: "list",
      message: "What we store: Time",
      delay: 1200,
      nextStage: 14,
    },
    14: { speaker: "list", message: "Emotion", delay: 1200, nextStage: 15 },
    15: {
      speaker: "list",
      message: "People involved",
      delay: 1200,
      nextStage: 16,
    },
    16: { speaker: "list", message: "Location", delay: 1200, nextStage: 17 },
    17: {
      speaker: "Mother",
      message:
        "Entries become searchable and connect into timelines and story threads.",
      delay: 1600,
      nextStage: 18,
    },
    18: {
      speaker: "MiD",
      message: "If that makes sense so far, type: CONTINUE",
      delay: 1400,
      nextStage: 19,
    },
    19: {
      type: "input",
      speaker: "User",
      placeholder: "type here...",
      inputKey: "continue",
      validation: (val) => val && val.toLowerCase().includes("continue"),
      onEnter: () => setCurrentStage(20),
    },
    20: {
      speaker: "Mother",
      message: "Great. Here are a few common commands you can use:",
      delay: 1400,
      nextStage: 21,
    },
    21: {
      speaker: "list",
      message: "`create memory` — write a new memory",
      delay: 1200,
      nextStage: 22,
    },
    22: {
      speaker: "list",
      message: "`show memories` / `list` / `bring up` — retrieve entries",
      delay: 1200,
      nextStage: 23,
    },
    23: {
      speaker: "list",
      message: "`save picture` / `save image` — attach images",
      delay: 1200,
      nextStage: 24,
    },
    24: {
      speaker: "list",
      message: "`edit memory` / `delete` — modify or remove entries",
      delay: 1200,
      nextStage: 25,
    },
    25: {
      speaker: "list",
      message: "`search` or `mother, [query]` — ask MiD questions",
      delay: 1200,
      nextStage: 26,
    },
    26: {
      speaker: "Mother",
      message:
        "You can try those later. For now, start the guided tutorial or skip straight to your diary.",
      delay: 1600,
      nextStage: 27,
    },
    27: {
      type: "input",
      speaker: "User",
      placeholder: "type 'TUTORIAL' or 'SKIP'",
      inputKey: "tutorialOrSkip",
      validation: (val) => {
        if (!val) return false;
        const lower = val.toLowerCase();
        return lower.includes("tutorial") || lower.includes("skip");
      },
      onEnter: (val) => {
        const lower = (val || "").toLowerCase();
        if (lower.includes("skip")) {
          navigate("/MiD/MyDiary");
        } else {
          setCurrentStage(28);
        }
      },
    },
    28: {
      speaker: "MiD",
      message: "Initiating Diary Module Tutorial...",
      delay: 1400,
      nextStage: 29,
    },
    29: {
      speaker: "MiD",
      message: "Preparing command guide...",
      delay: 1200,
      nextStage: 30,
    },
    30: {
      speaker: "MiD",
      message: "User, you're now entering the Diary Operations Area.",
      delay: 1400,
      nextStage: 31,
    },
    31: {
      speaker: "MiD",
      message: "This is where your memories live. Introduction complete.",
      delay: 1400,
      nextStage: 60,
    },
    60: {
      speaker: "MiD",
      message: "Preparing command guide...",
      delay: 2000,
      nextStage: 61,
    },
    61: {
      speaker: "MiD",
      message: "Linking Mother to memory core...",
      delay: 2000,
      nextStage: 62,
    },
    62: {
      speaker: "MiD",
      message: "User, you're now entering the Diary Operations Area.",
      delay: 2000,
      nextStage: 63,
    },
    63: {
      speaker: "MiD",
      message: "This is where your memories live.",
      delay: 2000,
      nextStage: 64,
    },
    64: {
      speaker: "MiD",
      message: "Mother will walk you through everything.",
      delay: 2000,
      nextStage: 65,
    },
    65: {
      speaker: "MiD",
      message: "When you're ready, type: START",
      delay: 2000,
      nextStage: 66,
    },
    66: {
      type: "input",
      speaker: "User",
      placeholder: "type here...",
      inputKey: "start",
      validation: (val) => val.toLowerCase().includes("start"),
      onEnter: () => setCurrentStage(67),
    },
    67: {
      speaker: "Mother",
      message: "Acknowledged, User.",
      delay: 2000,
      nextStage: 68,
    },
    68: {
      speaker: "Mother",
      message: "Let us begin with the foundation of how your diary works.",
      delay: 2000,
      nextStage: 69,
    },
    69: {
      speaker: "Mother",
      message: "The MiD diary is not a normal text file.",
      delay: 2000,
      nextStage: 70,
    },
    70: {
      speaker: "Mother",
      message: 'It is built from "entries."',
      delay: 2000,
      nextStage: 71,
    },
    71: {
      speaker: "Mother",
      message: "Each entry is a memory capsule you create.",
      delay: 2000,
      nextStage: 72,
    },
    72: {
      speaker: "Mother",
      message: "An entry can be:",
      delay: 2000,
      nextStage: 73,
    },
    73: {
      speaker: "list",
      message: "A simple paragraph",
      delay: 2000,
      nextStage: 74,
    },
    74: {
      speaker: "list",
      message: "A detailed story",
      delay: 2000,
      nextStage: 75,
    },
    75: { speaker: "list", message: "A list", delay: 2000, nextStage: 76 },
    76: { speaker: "list", message: "A table", delay: 2000, nextStage: 77 },
    77: { speaker: "list", message: "A timeline", delay: 2000, nextStage: 78 },
    78: {
      speaker: "list",
      message: "Or a mix of all",
      delay: 2000,
      nextStage: 79,
    },
    79: {
      speaker: "Mother",
      message: "You decide the shape.",
      delay: 2000,
      nextStage: 80,
    },
    80: {
      speaker: "Mother",
      message: "I simply store and manage it.",
      delay: 2000,
      nextStage: 81,
    },
    81: {
      speaker: "MiD",
      message: "If you understand what a memory capsule is, type: OK",
      delay: 2000,
      nextStage: 82,
    },
    82: {
      type: "input",
      speaker: "User",
      placeholder: "type here...",
      inputKey: "ok",
      validation: (val) => val.toLowerCase().includes("ok"),
      onEnter: () => setCurrentStage(83),
    },
    83: {
      speaker: "Mother",
      message: "Good. Now let me explain how to create a new memory.",
      delay: 2000,
      nextStage: 84,
    },
    84: {
      speaker: "Mother",
      message: "In this diary system, everything is controlled with commands.",
      delay: 2000,
      nextStage: 85,
    },
    85: {
      speaker: "Mother",
      message:
        "You talk to me using natural language, but with a command-style structure.",
      delay: 2000,
      nextStage: 86,
      long: true,
    },
    86: {
      speaker: "Mother",
      message:
        "For example, if you want to record something you experienced today, you can use:",
      delay: 2000,
      nextStage: 87,
      long: true,
    },
    87: {
      speaker: "Mother",
      message: "create memory:",
      delay: 2000,
      nextStage: 88,
    },
    88: {
      speaker: "Mother",
      message:
        '"Today I went to town and met my cousin. We talked about school."',
      delay: 2000,
      nextStage: 89,
    },
    89: {
      speaker: "Mother",
      message:
        "When I receive that, I convert it into a structured file and save it.",
      delay: 2000,
      nextStage: 90,
      long: true,
    },
    90: {
      speaker: "Mother",
      message: "You may also specify a category, like:",
      delay: 2000,
      nextStage: 91,
    },
    91: {
      speaker: "Mother",
      message: "create memory in category: happy",
      delay: 2000,
      nextStage: 92,
    },
    92: {
      speaker: "Mother",
      message: '"I finally achieved my project goal today!"',
      delay: 2000,
      nextStage: 93,
    },
    93: {
      speaker: "Mother",
      message: "Or you can attach tags:",
      delay: 2000,
      nextStage: 94,
    },
    94: {
      speaker: "Mother",
      message: "create memory with tags: friends, night, fun",
      delay: 2000,
      nextStage: 95,
    },
    95: {
      speaker: "Mother",
      message: '"We stayed out late and talked for hours."',
      delay: 2000,
      nextStage: 96,
    },
    96: {
      speaker: "Mother",
      message: "The diary supports simple or advanced entries.",
      delay: 2000,
      nextStage: 97,
    },
    97: {
      speaker: "Mother",
      message: "It adapts to you.",
      delay: 2000,
      nextStage: 98,
    },
    98: {
      speaker: "MiD",
      message: "To continue the tutorial, type: NEXT",
      delay: 2000,
      nextStage: 99,
    },
    99: {
      type: "input",
      speaker: "User",
      placeholder: "type here...",
      inputKey: "next2",
      validation: (val) => val.toLowerCase().includes("next"),
      onEnter: () => setCurrentStage(100),
    },
    100: {
      speaker: "Mother",
      message:
        "Excellent. Let me show you how advanced memory structures work.",
      delay: 2000,
      nextStage: 101,
    },
    101: {
      speaker: "Mother",
      message:
        "If you want a table — for example, to remember expenses or items — you can say:",
      delay: 2000,
      nextStage: 102,
      long: true,
    },
    102: {
      speaker: "Mother",
      message: "create table:",
      delay: 2000,
      nextStage: 103,
    },
    103: {
      speaker: "Mother",
      message: "columns: item, price",
      delay: 2000,
      nextStage: 104,
    },
    104: {
      speaker: "Mother",
      message: "rows:",
      delay: 2000,
      nextStage: 105,
    },
    105: {
      speaker: "Mother",
      message: "  - lunch, 5000",
      delay: 2000,
      nextStage: 106,
    },
    106: {
      speaker: "Mother",
      message: "  - transport, 2000",
      delay: 2000,
      nextStage: 107,
    },
    107: {
      speaker: "Mother",
      message: "If you want a list:",
      delay: 2000,
      nextStage: 108,
    },
    108: {
      speaker: "Mother",
      message: "create list:",
      delay: 2000,
      nextStage: 109,
    },
    109: {
      speaker: "Mother",
      message: "  - finish assignment",
      delay: 2000,
      nextStage: 110,
    },
    110: {
      speaker: "Mother",
      message: "  - call mom",
      delay: 2000,
      nextStage: 111,
    },
    111: {
      speaker: "Mother",
      message: "  - buy water",
      delay: 2000,
      nextStage: 112,
    },
    112: {
      speaker: "Mother",
      message: "If you want a timeline:",
      delay: 2000,
      nextStage: 113,
    },
    113: {
      speaker: "Mother",
      message: "create timeline:",
      delay: 2000,
      nextStage: 114,
    },
    114: {
      speaker: "Mother",
      message: "  - 8:00 woke up",
      delay: 2000,
      nextStage: 115,
    },
    115: {
      speaker: "Mother",
      message: "  - 10:00 meeting",
      delay: 2000,
      nextStage: 116,
    },
    116: {
      speaker: "Mother",
      message: "  - 14:00 lunch with colleague",
      delay: 2000,
      nextStage: 117,
    },
    117: {
      speaker: "Mother",
      message: "The diary does not judge what you store.",
      delay: 2000,
      nextStage: 118,
    },
    118: {
      speaker: "Mother",
      message:
        "Every detail matters because every detail belongs to your life.",
      delay: 2000,
      nextStage: 119,
      long: true,
    },
    119: {
      speaker: "MiD",
      message:
        "If you're ready to learn retrieval commands, type: show memories",
      delay: 2000,
      nextStage: 120,
    },
    120: {
      type: "input",
      speaker: "User",
      placeholder: "type here...",
      inputKey: "retrieve",
      validation: (val) => {
        const lowerVal = val.toLowerCase();
        return (
          lowerVal.includes("show") ||
          lowerVal.includes("list") ||
          lowerVal.includes("retrieve") ||
          lowerVal.includes("search") ||
          lowerVal.includes("bring")
        );
      },
      onEnter: () => setCurrentStage(121),
    },
    121: {
      speaker: "Mother",
      message: "Retrieval systems activated.",
      delay: 2000,
      nextStage: 122,
    },
    122: {
      speaker: "Mother",
      message:
        "You can ask me for memories just the same way you would ask another person — but with command formatting.",
      delay: 2000,
      nextStage: 123,
      long: true,
    },
    123: {
      speaker: "Mother",
      message: "Examples:",
      delay: 2000,
      nextStage: 124,
    },
    124: {
      speaker: "Mother",
      message: "Mother, bring up my happy moments.",
      delay: 2000,
      nextStage: 125,
    },
    125: {
      speaker: "Mother",
      message: "Mother, show me memories tagged: family.",
      delay: 2000,
      nextStage: 126,
    },
    126: {
      speaker: "Mother",
      message: "Mother, open entries from: December 2023.",
      delay: 2000,
      nextStage: 127,
    },
    127: {
      speaker: "Mother",
      message: "Mother, bring up all memories containing: graduation.",
      delay: 2000,
      nextStage: 128,
    },
    128: {
      speaker: "Mother",
      message: "Mother, show me my first memory.",
      delay: 2000,
      nextStage: 129,
    },
    129: {
      speaker: "Mother",
      message: "Mother, list all tables I created.",
      delay: 2000,
      nextStage: 130,
    },
    130: {
      speaker: "Mother",
      message: 'Mother, search: "night walk".',
      delay: 2000,
      nextStage: 131,
    },
    131: {
      speaker: "Mother",
      message: "I will respond by pulling the correct memory capsules.",
      delay: 2000,
      nextStage: 132,
      long: true,
    },
    132: {
      speaker: "Mother",
      message: "If you want a summary, you may say:",
      delay: 2000,
      nextStage: 133,
    },
    133: {
      speaker: "Mother",
      message: "Mother, summarize my sad moments.",
      delay: 2000,
      nextStage: 134,
    },
    134: {
      speaker: "Mother",
      message: "Mother, show highlights from last month.",
      delay: 2000,
      nextStage: 135,
    },
    135: {
      speaker: "Mother",
      message: "Mother, list the most used tags.",
      delay: 2000,
      nextStage: 136,
    },
    136: {
      speaker: "Mother",
      message: "The diary is your command center for your emotional universe.",
      delay: 2000,
      nextStage: 137,
      long: true,
    },
    137: {
      speaker: "MiD",
      message: "Want Mother to teach you editing and deleting entries?",
      delay: 2000,
      nextStage: 138,
    },
    138: {
      speaker: "MiD",
      message: "Type: EDIT",
      delay: 2000,
      nextStage: 139,
    },
    139: {
      type: "input",
      speaker: "User",
      placeholder: "type here...",
      inputKey: "edit",
      validation: (val) => val.toLowerCase().includes("edit"),
      onEnter: () => setCurrentStage(140),
    },
    140: {
      speaker: "Mother",
      message: "Editing protocols ready.",
      delay: 2000,
      nextStage: 141,
    },
    141: {
      speaker: "Mother",
      message: "To update an entry you already wrote:",
      delay: 2000,
      nextStage: 142,
    },
    142: {
      speaker: "Mother",
      message: "edit memory #12:",
      delay: 2000,
      nextStage: 143,
    },
    143: {
      speaker: "Mother",
      message: '"Replace the ending, I was actually very tired."',
      delay: 2000,
      nextStage: 144,
    },
    144: {
      speaker: "Mother",
      message: "To add more details to an existing memory:",
      delay: 2000,
      nextStage: 145,
    },
    145: {
      speaker: "Mother",
      message: "update memory #5:",
      delay: 2000,
      nextStage: 146,
    },
    146: {
      speaker: "Mother",
      message: 'add: "The weather was really cold."',
      delay: 2000,
      nextStage: 147,
    },
    147: {
      speaker: "Mother",
      message: "To remove an entry:",
      delay: 2000,
      nextStage: 148,
    },
    148: {
      speaker: "Mother",
      message: "delete memory #3",
      delay: 2000,
      nextStage: 149,
    },
    149: {
      speaker: "Mother",
      message:
        "I will always ask you for confirmation before deletion, to prevent accidental loss of your memories.",
      delay: 2000,
      nextStage: 150,
      long: true,
    },
    150: {
      speaker: "MiD",
      message: "If you'd like to learn organization features, type: ORGANIZE",
      delay: 2000,
      nextStage: 151,
    },
    151: {
      type: "input",
      speaker: "User",
      placeholder: "type here...",
      inputKey: "organize",
      validation: (val) => val.toLowerCase().includes("organize"),
      onEnter: () => setCurrentStage(152),
    },
    152: {
      speaker: "Mother",
      message: "Security subsystem active.",
      delay: 2000,
      nextStage: 153,
    },
    153: {
      speaker: "Mother",
      message: "All your memories are encrypted.",
      delay: 2000,
      nextStage: 154,
    },
    154: {
      speaker: "Mother",
      message: "I cannot read them.",
      delay: 2000,
      nextStage: 155,
    },
    155: {
      speaker: "Mother",
      message: "MiD cannot read them.",
      delay: 2000,
      nextStage: 156,
    },
    156: {
      speaker: "Mother",
      message: "No one can.",
      delay: 2000,
      nextStage: 157,
    },
    157: {
      speaker: "Mother",
      message:
        "I only receive your commands, store your data securely, and retrieve it when you ask.",
      delay: 2000,
      nextStage: 158,
      long: true,
    },
    158: {
      speaker: "Mother",
      message:
        'Even when I seem to "explain" something, I am not using intelligence. I am simply following protocols.',
      delay: 2000,
      nextStage: 159,
      long: true,
    },
    159: {
      speaker: "Mother",
      message: "Your diary is yours alone.",
      delay: 2000,
      nextStage: 160,
    },
    160: {
      speaker: "Mother",
      message: "I only protect it.",
      delay: 2000,
      nextStage: 161,
    },
    161: {
      speaker: "MiD",
      message: "Tutorial complete.",
      delay: 2000,
      nextStage: 162,
    },
    162: {
      speaker: "MiD",
      message:
        "When you are ready to start writing your first memory, type: BEGIN DIARY",
      delay: 2000,
      nextStage: 163,
    },
    163: {
      type: "input",
      speaker: "User",
      placeholder: "type here...",
      inputKey: "begin",
      validation: (val) =>
        val.toLowerCase().includes("begin") ||
        val.toLowerCase().includes("diary"),
      onEnter: () => setCurrentStage(164),
    },
    164: {
      speaker: "MiD",
      message: "Initializing Extended Memory System...",
      delay: 2000,
      nextStage: 165,
    },
    165: {
      speaker: "MiD",
      message: "Adding Visual Memory Layer...",
      delay: 2000,
      nextStage: 166,
    },
    166: {
      speaker: "MiD",
      message: "Mother is now capable of storing your pictures securely.",
      delay: 2000,
      nextStage: 167,
    },
    167: {
      speaker: "MiD",
      message: "User, type: CONTINUE to proceed.",
      delay: 2000,
      nextStage: 168,
    },
    168: {
      type: "input",
      speaker: "User",
      placeholder: "type here...",
      inputKey: "continue2",
      validation: (val) => val.toLowerCase().includes("continue"),
      onEnter: () => setCurrentStage(169),
    },
    169: {
      speaker: "Mother",
      message: "Welcome back, User.",
      delay: 2000,
      nextStage: 170,
    },
    170: {
      speaker: "Mother",
      message: "I will now explain how MiD handles images.",
      delay: 2000,
      nextStage: 171,
    },
    171: {
      speaker: "Mother",
      message: 'In MiD, images are treated as "Visual Memory Capsules."',
      delay: 2000,
      nextStage: 172,
    },
    172: {
      speaker: "Mother",
      message: "These are memories represented as pictures instead of words.",
      delay: 2000,
      nextStage: 173,
    },
    173: {
      speaker: "Mother",
      message: "You can save:",
      delay: 2000,
      nextStage: 174,
    },
    174: { speaker: "list", message: "Photos", delay: 2000, nextStage: 175 },
    175: {
      speaker: "list",
      message: "Screenshots",
      delay: 2000,
      nextStage: 176,
    },
    176: { speaker: "list", message: "Drawings", delay: 2000, nextStage: 177 },
    177: {
      speaker: "list",
      message: "Scanned documents",
      delay: 2000,
      nextStage: 178,
    },
    178: {
      speaker: "list",
      message: "Certificates",
      delay: 2000,
      nextStage: 179,
    },
    179: {
      speaker: "list",
      message: "Anything that is an image file",
      delay: 2000,
      nextStage: 180,
    },
    180: {
      speaker: "Mother",
      message:
        "Every photo you save is encrypted, meaning no system, no outsider, not even I can read it. I only store and retrieve it when commanded.",
      delay: 2000,
      nextStage: 181,
      long: true,
    },
    181: {
      speaker: "Mother",
      message: "To save a picture, use the command:",
      delay: 2000,
      nextStage: 182,
    },
    182: {
      speaker: "Mother",
      message: "save picture:",
      delay: 2000,
      nextStage: 183,
    },
    183: {
      speaker: "Mother",
      message: "[choose file]",
      delay: 2000,
      nextStage: 184,
    },
    184: {
      speaker: "Mother",
      message: 'description: "My birthday celebration"',
      delay: 2000,
      nextStage: 185,
    },
    185: {
      speaker: "Mother",
      message: "tags: birthday, happy, cake",
      delay: 2000,
      nextStage: 186,
    },
    186: {
      speaker: "Mother",
      message:
        "After selecting the picture, I will store it inside your encrypted Visual Memory database.",
      delay: 2000,
      nextStage: 187,
      long: true,
    },
    187: {
      speaker: "Mother",
      message: "You may also store multiple images at once:",
      delay: 2000,
      nextStage: 188,
    },
    188: {
      speaker: "Mother",
      message: "save pictures:",
      delay: 2000,
      nextStage: 189,
    },
    189: {
      speaker: "Mother",
      message: "[choose 3 files]",
      delay: 2000,
      nextStage: 190,
    },
    190: {
      speaker: "Mother",
      message: 'description: "Trip to Zanzibar"',
      delay: 2000,
      nextStage: 191,
    },
    191: {
      speaker: "Mother",
      message: "tags: travel, ocean, memories",
      delay: 2000,
      nextStage: 192,
    },
    192: {
      speaker: "Mother",
      message: "Pictures and text memories can live inside the same entry.",
      delay: 2000,
      nextStage: 193,
    },
    193: {
      speaker: "Mother",
      message: "You may also create a mixed memory like this:",
      delay: 2000,
      nextStage: 194,
    },
    194: {
      speaker: "Mother",
      message: "create memory:",
      delay: 2000,
      nextStage: 195,
    },
    195: {
      speaker: "Mother",
      message: '"Today was amazing. I visited my grandma."',
      delay: 2000,
      nextStage: 196,
    },
    196: {
      speaker: "Mother",
      message: "attach picture:",
      delay: 2000,
      nextStage: 197,
    },
    197: {
      speaker: "Mother",
      message: "[choose file]",
      delay: 2000,
      nextStage: 198,
    },
    198: {
      speaker: "Mother",
      message: "tags: family, warmth",
      delay: 2000,
      nextStage: 199,
    },
    199: {
      speaker: "Mother",
      message:
        "MiD will bind the picture and text together as one unified memory capsule.",
      delay: 2000,
      nextStage: 200,
      long: true,
    },
    200: {
      speaker: "Mother",
      message: "To bring back an image:",
      delay: 2000,
      nextStage: 201,
    },
    201: {
      speaker: "Mother",
      message: "Mother, show picture #12",
      delay: 2000,
      nextStage: 202,
    },
    202: {
      speaker: "Mother",
      message: "Mother, open memory that contains pictures",
      delay: 2000,
      nextStage: 203,
    },
    203: {
      speaker: "Mother",
      message: "Mother, show images tagged: family",
      delay: 2000,
      nextStage: 204,
    },
    204: {
      speaker: "Mother",
      message: "Mother, bring up my happy photos",
      delay: 2000,
      nextStage: 205,
    },
    205: {
      speaker: "Mother",
      message: "Mother, display images from: January 2024",
      delay: 2000,
      nextStage: 206,
    },
    206: {
      speaker: "Mother",
      message: "If the entry has both text and pictures, I will display both.",
      delay: 2000,
      nextStage: 207,
      long: true,
    },
    207: {
      speaker: "Mother",
      message: "You can organize visual memories the same way as text:",
      delay: 2000,
      nextStage: 208,
    },
    208: {
      speaker: "Mother",
      message: "Mother, sort pictures by tag",
      delay: 2000,
      nextStage: 209,
    },
    209: {
      speaker: "Mother",
      message: "Mother, group pictures by month",
      delay: 2000,
      nextStage: 210,
    },
    210: {
      speaker: "Mother",
      message: "Mother, list all picture entries",
      delay: 2000,
      nextStage: 211,
    },
    211: {
      speaker: "Mother",
      message: "Mother, show my oldest images",
      delay: 2000,
      nextStage: 212,
    },
    212: {
      speaker: "Mother",
      message: "Mother, summarize image categories",
      delay: 2000,
      nextStage: 213,
    },
    213: {
      speaker: "Mother",
      message: "MiD will create a visual map of your memories.",
      delay: 2000,
      nextStage: 214,
    },
    214: {
      speaker: "Mother",
      message: "If you wish to edit an image entry:",
      delay: 2000,
      nextStage: 215,
    },
    215: {
      speaker: "Mother",
      message: "edit picture #3:",
      delay: 2000,
      nextStage: 216,
    },
    216: {
      speaker: "Mother",
      message: 'change description: "A better caption"',
      delay: 2000,
      nextStage: 217,
    },
    217: {
      speaker: "Mother",
      message: "To delete an image:",
      delay: 2000,
      nextStage: 218,
    },
    218: {
      speaker: "Mother",
      message: "delete picture #5",
      delay: 2000,
      nextStage: 219,
    },
    219: {
      speaker: "Mother",
      message: "As always, I will ask you for confirmation.",
      delay: 2000,
      nextStage: 220,
    },
    220: {
      speaker: "Mother",
      message:
        "Visual memories are encrypted using the same core: MemoryInData-256",
      delay: 2000,
      nextStage: 221,
    },
    221: {
      speaker: "Mother",
      message: "Just like text entries.",
      delay: 2000,
      nextStage: 222,
    },
    222: {
      speaker: "Mother",
      message: "That means:",
      delay: 2000,
      nextStage: 223,
    },
    223: {
      speaker: "Mother",
      message: "No one can decode them.",
      delay: 2000,
      nextStage: 224,
    },
    224: {
      speaker: "Mother",
      message: "Not even MiD.",
      delay: 2000,
      nextStage: 225,
    },
    225: {
      speaker: "Mother",
      message: "Not even me.",
      delay: 2000,
      nextStage: 226,
    },
    226: {
      speaker: "Mother",
      message: "Only your commands can open your memories.",
      delay: 2000,
      nextStage: 227,
    },
    227: {
      speaker: "MiD",
      message: "Visual Memory Layer active.",
      delay: 2000,
      nextStage: 228,
    },
    228: {
      speaker: "MiD",
      message: "You can now begin storing your pictures and stories together.",
      delay: 2000,
      nextStage: 229,
      long: true,
    },
    229: {
      speaker: "MiD",
      message:
        "When you're ready to create your first visual memory, type: BEGIN VISUAL ENTRY",
      delay: 2000,
      nextStage: 230,
    },
    230: {
      type: "input",
      speaker: "User",
      placeholder: "type here...",
      inputKey: "visual",
      validation: (val) =>
        val.toLowerCase().includes("visual") ||
        val.toLowerCase().includes("begin"),
      onEnter: () => {
        setTimeout(() => {
          navigate("/MiD/MyDiary");
        }, 2000);
      },
    },
  };

  const renderStage = (stageNum) => {
    const stage = stages[stageNum];
    if (!stage) return null;

    if (stage.type === "input") {
      // Check if this input stage has already passed
      const isPastStage = stageNum < currentStage;

      return (
        <div className="flex-type" key={stageNum}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="MiD-sys"
          >
            {stage.speaker === "User"
              ? user?.username || "User"
              : stage.speaker}
            <ChevronRight size={16} strokeWidth={3} />
          </motion.div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            style={{ width: "fit-content" }}
          >
            <input
              type="text"
              value={userInputs[stage.inputKey] || ""}
              onChange={(e) =>
                !inputProcessing &&
                !isPastStage &&
                updateInput(stage.inputKey, e.target.value)
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  stage.validation(e.target.value) &&
                  !inputProcessing &&
                  !isPastStage
                ) {
                  setInputProcessing(true);
                  stage.onEnter(e.target.value);
                  setTimeout(() => setInputProcessing(false), 500);
                }
              }}
              disabled={inputProcessing || isPastStage}
              className={isPastStage ? "input-readonly" : ""}
              placeholder={stage.placeholder}
              autoFocus={false}
            />
          </motion.span>
        </div>
      );
    }

    const isList = stage.speaker === "list";
    const speaker = isList ? "list" : stage.speaker;

    return (
      <div
        className={`flex-type ${stage.long ? "long" : ""} ${
          isList ? "list" : ""
        }`}
        key={stageNum}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 1 }}
          className="MiD-sys"
        >
          {isList ? (
            <Dot size={18} strokeWidth={3} />
          ) : (
            <>
              {speaker === "User" ? user?.username || "User" : speaker}
              <ChevronRight size={16} strokeWidth={3} />
            </>
          )}
        </motion.div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <TypeAnimation
            sequence={[
              "",
              stage.delay || 2000,
              stage.message,
              () => {
                if (stage.onComplete) stage.onComplete();
                if (stage.nextStage) {
                  setTimeout(() => setCurrentStage(stage.nextStage), 500);
                }
              },
            ]}
            cursor={false}
            repeat={0}
            speed={0}
            deletionSpeed={80}
          />
        </motion.span>
        {stageNum === 10 && smileIcon && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <Smile size={20} />
          </motion.span>
        )}
      </div>
    );
  };

  // Render all stages up to currentStage
  const renderedStages = [];
  for (let i = 1; i <= currentStage; i++) {
    renderedStages.push(renderStage(i));
  }

  return (
    <>
      <div
        className="about-body"
        style={{
          height: currentStage > 29 ? "auto" : "100vh",
          minHeight: "100vh",
          position: "relative",
        }}
      >
        {/* Skip Intro Button */}
        {currentStage < 230 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            onClick={() => navigate("/MiD/MyDiary")}
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
            Skip Intro
          </motion.button>
        )}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="animation-container"
          ref={containerRef}
        >
          {renderedStages}
        </motion.div>
      </div>
    </>
  );
}

export default AboutMiD;
