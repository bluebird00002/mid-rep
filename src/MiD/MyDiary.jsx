import React from "react";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Send,
  Loader2,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import CommandParser from "../utils/commandParser";
import api from "../services/api";
import MemoryCard from "../components/MemoryCard";
import { useAuth } from "../context/AuthContext";
import "./MyDiary.css";
import "@fontsource/jetbrains-mono";

function MyDiary() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState([]);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingMemory, setEditingMemory] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageBuilder, setImageBuilder] = useState(null); // { step: 'description'|'tags'|'album'|'confirm', data: {...} }
  const [currentInput, setCurrentInput] = useState("");
  const [pendingAction, setPendingAction] = useState(null); // { type: 'delete'|'edit', data: {...} }
  const [tableBuilder, setTableBuilder] = useState(null); // { step: 'title'|'columns'|'rows'|'more'|'tags', data: {...} }
  const [tableEditor, setTableEditor] = useState(null); // { step: 'menu'|'title'|'columns'|'rows'|'add_row'|'edit_row'|'delete_row'|'tags'|'category', memory: {...}, data: {...} }
  const [listBuilder, setListBuilder] = useState(null); // { step: 'title'|'items'|'tags'|'category', data: {...} }
  const [listEditor, setListEditor] = useState(null); // { step: 'menu'|'title'|'add'|'edit'|'delete'|'tags'|'category', memory: {...}, data: {...} }
  const [timelineBuilder, setTimelineBuilder] = useState(null); // { step: 'title'|'events'|'tags'|'category', data: {...} }
  const [timelineEditor, setTimelineEditor] = useState(null); // { step: 'menu'|..., memory: {...}, data: {...} }
  const commandInputRef = useRef(null);
  const historyEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const welcomeShownRef = useRef(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!user) {
      navigate("/MiD/Home");
      return;
    }
    // Save current page
    sessionStorage.setItem("mid_lastPage", "/MiD/MyDiary");
    // Do NOT auto-load memories on login. Only load when user requests them via 'show' command.
    // Only show welcome message once, not on every render
    if (!welcomeShownRef.current) {
      addSystemMessage(`Welcome, ${user.username}. Type 'help' for commands.`);
      welcomeShownRef.current = true;
    }
    commandInputRef.current?.focus();
  }, [user, navigate, authLoading]);

  useEffect(() => {
    scrollToBottom();
  }, [history, memories]);

  const scrollToBottom = () => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Normalize common time inputs (keep colons in times like "9:00 AM")
  const normalizeTime = (input) => {
    if (!input) return "";
    const s = String(input).trim();
    // Match forms: 9, 9am, 9:00, 9:00am, 09 00 pm, 0900pm
    const m = s.match(/^(\d{1,2})(?::|\s)?(\d{2})?\s*(am|pm)?$/i);
    if (m) {
      let h = parseInt(m[1], 10);
      let mm = m[2] || "00";
      const ampm = m[3];
      // Normalize minute to two digits
      if (mm.length === 1) mm = `0${mm}`;
      if (ampm) {
        return `${h}:${mm} ${ampm.toUpperCase()}`;
      }
      return `${h}:${mm}`;
    }
    return s;
  };

  const addSystemMessage = (message) => {
    setHistory((prev) => [
      ...prev,
      { type: "system", speaker: "MiD", message, timestamp: new Date() },
    ]);
  };

  const addUserMessage = (message) => {
    setHistory((prev) => [
      ...prev,
      {
        type: "user",
        speaker: user?.username || "User",
        message,
        timestamp: new Date(),
      },
    ]);
  };

  const addMotherMessage = (message) => {
    setHistory((prev) => [
      ...prev,
      { type: "mother", speaker: "Mother", message, timestamp: new Date() },
    ]);
  };

  const loadMemories = async () => {
    try {
      setLoading(true);
      const data = await api.getAllMemories();
      // Try to also fetch images and merge them as image-type memories so 'show' lists images
      let all = data.data?.memories || data.memories || data || [];
      try {
        const imgs = await api.getAllImages();
        const images = imgs.data?.images || imgs.images || [];
        const mapped = images.map((img) => ({
          id: img.id || img.image_id || Date.now(),
          type: "image",
          image_url: img.url || img.image_url || img.path || img.src,
          description: img.description || img.caption || "",
          tags: img.tags || [],
          album: img.album || null,
          created_at:
            img.created_at || img.createdAt || new Date().toISOString(),
          has_image: true,
        }));
        // Merge images at the front so they show up prominently
        all = [...mapped, ...all.filter((m) => m.type !== "image")];
      } catch (e) {
        // ignore image fetch errors
        console.warn("Failed to fetch images when loading memories", e);
      }

      setMemories(all || []);
    } catch (err) {
      console.error("Failed to load memories from API:", err);
      // Fallback to local storage if API fails
      const localMemories = loadFromLocalStorage();
      setMemories(localMemories);
    } finally {
      setLoading(false);
    }
  };

  const handleCommand = async (cmd) => {
    if (!cmd.trim()) {
      // Don't add empty commands to history
      return;
    }

    addUserMessage(cmd);
    setCurrentInput("");
    setCommand("");
    setError(null);

    // Handle pending confirmation responses
    if (pendingAction) {
      const response = cmd.trim().toLowerCase();
      if (response === "yes" || response === "y") {
        if (pendingAction.type === "delete") {
          await executeDelete(pendingAction.data);
        } else if (pendingAction.type === "edit") {
          executeEdit(pendingAction.data);
        }
      } else if (response === "no" || response === "n") {
        addMotherMessage("Action cancelled.");
      } else {
        addSystemMessage("Please type 'yes' or 'no' to confirm.");
        return; // Keep pending action active
      }
      setPendingAction(null);
      return;
    }

    // Handle table builder flow
    if (tableBuilder) {
      await handleTableBuilderInput(cmd);
      return;
    }

    // Handle image builder flow
    if (imageBuilder) {
      await handleImageBuilderInput(cmd);
      return;
    }

    // Handle table editor flow
    if (tableEditor) {
      await handleTableEditorInput(cmd);
      return;
    }

    // Handle list builder flow
    if (listBuilder) {
      await handleListBuilderInput(cmd);
      return;
    }

    // Handle list editor flow
    if (listEditor) {
      await handleListEditorInput(cmd);
      return;
    }

    // Handle timeline builder flow
    if (timelineBuilder) {
      await handleTimelineBuilderInput(cmd);
      return;
    }

    // Handle timeline editor flow
    if (timelineEditor) {
      await handleTimelineEditorInput(cmd);
      return;
    }

    try {
      const parsed = CommandParser.parse(cmd);

      // Check if command is unknown
      if (parsed.type === "unknown") {
        addSystemMessage(
          `Unknown command: "${cmd}". Type 'help' to see available commands.`
        );
        return;
      }

      switch (parsed.type) {
        case "create_memory":
          await handleCreateMemory(parsed);
          break;

        case "create_table":
          await handleCreateTable(parsed);
          break;

        case "create_list":
          await handleCreateList(parsed);
          break;

        case "create_timeline":
          await handleCreateTimeline(parsed);
          break;

        case "save_picture":
          // Check if command contains description and tags
          const descMatch = cmd.match(/description:\s*["']([^"']+)["']/i);
          const tagsMatch = cmd.match(/tags:\s*([^"']+)/i);

          if (descMatch && imageFile) {
            const description = descMatch[1];
            const tags = tagsMatch
              ? tagsMatch[1].split(",").map((t) => t.trim())
              : [];
            await processImageUpload(imageFile, description, tags, null);
          } else if (descMatch && !imageFile) {
            // Pre-fill description/tags and prompt for file
            const preDesc = descMatch[1];
            const preTags = tagsMatch
              ? tagsMatch[1].split(",").map((t) => t.trim())
              : [];
            setImageBuilder({
              step: "select",
              data: { description: preDesc, tags: preTags },
            });
            fileInputRef.current?.click();
          } else {
            handleSavePicture();
          }
          break;

        case "edit_memory":
          await handleEditMemory(parsed);
          break;

        case "delete":
          await handleDelete(parsed);
          break;

        case "retrieve":
          await handleRetrieve(parsed);
          break;

        case "help":
          showHelp();
          break;

        case "clear":
          setHistory([]);
          setMemories([]);
          addSystemMessage("Terminal cleared.");
          break;

        default:
          // Unknown command type - show error
          addSystemMessage(
            `Unknown command: "${cmd}". Type 'help' to see available commands.`
          );
      }
    } catch (err) {
      setError(err.message);
      addSystemMessage(`Error: ${err.message}`);
    }

    // Focus will be handled by the inline input
  };

  const handleCreateMemory = async (parsed) => {
    try {
      console.log("DEBUG handleCreateMemory - parsed object:", parsed);

      const memoryData = {
        type: "text",
        content: parsed.content,
        category: parsed.category,
        tags: parsed.tags && Array.isArray(parsed.tags) ? parsed.tags : [],
        created_at: new Date().toISOString(),
      };

      console.log("DEBUG handleCreateMemory - memoryData to send:", memoryData);

      const result = await api.createMemory(memoryData);
      if (result && (result.success || result.data)) {
        let msg = `Memory created successfully.`;
        if (parsed.tags?.length) msg += ` Tags: ${parsed.tags.join(", ")}.`;
        if (parsed.category) msg += ` Category: ${parsed.category}.`;
        addMotherMessage(msg);
      } else {
        throw new Error("Failed to save memory");
      }
      await loadMemories();
    } catch (err) {
      console.error("Error creating memory:", err);
      // Only fallback to local storage if it's a network/server error
      const errorMsg = err.message || "";
      if (
        errorMsg.includes("500") ||
        errorMsg.includes("Failed to fetch") ||
        errorMsg.includes("Network") ||
        errorMsg.includes("Backend unavailable")
      ) {
        const newMemory = {
          id: Date.now(),
          ...parsed,
          type: "text",
          created_at: new Date().toISOString(),
        };
        saveToLocalStorage(newMemory);
        addMotherMessage(`Memory saved locally. (Backend unavailable)`);
        await loadMemories();
      } else {
        // For validation or other errors, show error message
        addSystemMessage(`Error: ${errorMsg || "Failed to create memory"}`);
      }
    }
  };

  const handleCreateTable = async (parsed) => {
    // Start interactive table builder
    setTableBuilder({
      step: "title",
      data: {
        title: "",
        columns: [],
        rows: [],
        tags: [],
        category: null,
      },
    });
    addMotherMessage(
      "Let's create a table! First, what's the title/heading for this table? (or type 'skip' to skip)"
    );
  };

  const handleTableBuilderInput = async (input) => {
    const trimmedInput = input.trim();
    const lowerInput = trimmedInput.toLowerCase();

    // Allow cancel at any step
    if (lowerInput === "cancel" || lowerInput === "exit") {
      setTableBuilder(null);
      addMotherMessage("Table creation cancelled.");
      return;
    }

    switch (tableBuilder.step) {
      case "title":
        const title = lowerInput === "skip" ? "" : trimmedInput;
        setTableBuilder({
          ...tableBuilder,
          step: "columns",
          data: { ...tableBuilder.data, title },
        });
        addMotherMessage(
          "Enter column names separated by commas (e.g., Name, Age, City):"
        );
        break;

      case "columns":
        const columns = trimmedInput
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c);
        if (columns.length === 0) {
          addSystemMessage("Please enter at least one column name.");
          return;
        }
        setTableBuilder({
          ...tableBuilder,
          step: "rows",
          data: { ...tableBuilder.data, columns },
        });
        addMotherMessage(`Columns: ${columns.join(" | ")}`);
        addMotherMessage(
          `Now enter row data. Each row should have ${columns.length} values separated by commas.`
        );
        addMotherMessage("Type 'done' when finished adding rows.");
        break;

      case "rows":
        if (lowerInput === "done") {
          if (tableBuilder.data.rows.length === 0) {
            addSystemMessage("Please add at least one row of data.");
            return;
          }
          setTableBuilder({
            ...tableBuilder,
            step: "tags",
          });
          addMotherMessage(
            "Add tags for this table (comma-separated, or 'skip'):"
          );
          return;
        }

        const rowValues = trimmedInput.split(",").map((v) => v.trim());
        if (rowValues.length !== tableBuilder.data.columns.length) {
          addSystemMessage(
            `Row should have ${tableBuilder.data.columns.length} values (you entered ${rowValues.length}). Try again:`
          );
          return;
        }

        const newRows = [...tableBuilder.data.rows, rowValues];
        setTableBuilder({
          ...tableBuilder,
          data: { ...tableBuilder.data, rows: newRows },
        });
        addMotherMessage(
          `Row ${newRows.length} added: ${rowValues.join(" | ")}`
        );
        addSystemMessage("Enter next row or type 'done' to finish:");
        break;

      case "tags":
        const tags =
          lowerInput === "skip"
            ? []
            : trimmedInput
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t);
        setTableBuilder({
          ...tableBuilder,
          step: "category",
          data: { ...tableBuilder.data, tags },
        });
        addMotherMessage("Enter a category for this table (or 'skip'):");
        break;

      case "category":
        const category = lowerInput === "skip" ? null : trimmedInput;

        // Save the table
        const tableData = {
          type: "table",
          content: tableBuilder.data.title || "Table",
          columns: tableBuilder.data.columns,
          rows: tableBuilder.data.rows,
          tags: tableBuilder.data.tags,
          category: category,
          created_at: new Date().toISOString(),
        };

        try {
          await api.createMemory(tableData);
          let successMsg = "Table created successfully!";
          if (tableBuilder.data.tags.length)
            successMsg += ` Tags: ${tableBuilder.data.tags.join(", ")}.`;
          if (category) successMsg += ` Category: ${category}.`;
          addMotherMessage(successMsg);
          await loadMemories();
        } catch (err) {
          const newMemory = {
            id: Date.now(),
            ...tableData,
          };
          saveToLocalStorage(newMemory);
          addMotherMessage("Table saved locally. (Backend unavailable)");
          await loadMemories();
        }

        setTableBuilder(null);
        break;

      default:
        setTableBuilder(null);
        addSystemMessage("Something went wrong. Please try again.");
    }
  };

  const handleCreateList = async (parsed) => {
    // Start interactive list builder
    setListBuilder({
      step: "title",
      data: {
        title: "",
        items: [],
        tags: [],
        category: null,
      },
    });
    addMotherMessage(
      "Let's create a list! First, what's the title for this list? (or type 'skip')"
    );
  };

  const handleListBuilderInput = async (input) => {
    const trimmedInput = input.trim();
    const lowerInput = trimmedInput.toLowerCase();

    // Allow cancel at any step
    if (lowerInput === "cancel" || lowerInput === "exit") {
      setListBuilder(null);
      addMotherMessage("List creation cancelled.");
      return;
    }

    switch (listBuilder.step) {
      case "title":
        const title = lowerInput === "skip" ? "" : trimmedInput;
        setListBuilder({
          ...listBuilder,
          step: "items",
          data: { ...listBuilder.data, title },
        });
        addMotherMessage("Now add your list items. Enter one item at a time.");
        addSystemMessage("Type 'done' when finished adding items.");
        break;

      case "items":
        if (lowerInput === "done") {
          if (listBuilder.data.items.length === 0) {
            addSystemMessage("Please add at least one item to the list.");
            return;
          }
          setListBuilder({
            ...listBuilder,
            step: "tags",
          });
          addMotherMessage(
            "Add tags for this list (comma-separated, or 'skip'):"
          );
          return;
        }

        const newItems = [...listBuilder.data.items, trimmedInput];
        setListBuilder({
          ...listBuilder,
          data: { ...listBuilder.data, items: newItems },
        });
        addMotherMessage(`  ${newItems.length}. ${trimmedInput}`);
        addSystemMessage("Add another item or type 'done' to finish:");
        break;

      case "tags":
        const tags =
          lowerInput === "skip"
            ? []
            : trimmedInput
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t);
        setListBuilder({
          ...listBuilder,
          step: "category",
          data: { ...listBuilder.data, tags },
        });
        addMotherMessage("Enter a category for this list (or 'skip'):");
        break;

      case "category":
        const category = lowerInput === "skip" ? null : trimmedInput;

        // Save the list
        const listData = {
          type: "list",
          content: listBuilder.data.title || "List",
          items: listBuilder.data.items,
          tags: listBuilder.data.tags,
          category: category,
          created_at: new Date().toISOString(),
        };

        try {
          await api.createMemory(listData);
          let successMsg = "List created successfully!";
          if (listBuilder.data.tags.length)
            successMsg += ` Tags: ${listBuilder.data.tags.join(", ")}.`;
          if (category) successMsg += ` Category: ${category}.`;
          addMotherMessage(successMsg);

          // Show list preview
          addSystemMessage(`── ${listBuilder.data.title || "List"} ──`);
          listBuilder.data.items.forEach((item, i) => {
            addSystemMessage(`  • ${item}`);
          });

          await loadMemories();
        } catch (err) {
          const newMemory = {
            id: Date.now(),
            ...listData,
          };
          saveToLocalStorage(newMemory);
          addMotherMessage("List saved locally. (Backend unavailable)");
          await loadMemories();
        }

        setListBuilder(null);
        break;

      default:
        setListBuilder(null);
        addSystemMessage("Something went wrong. Please try again.");
    }
  };

  const handleCreateTimeline = async (parsed) => {
    // Start interactive timeline builder
    setTimelineBuilder({
      step: "title",
      data: {
        title: "",
        events: [],
        tags: [],
        category: null,
      },
    });
    addMotherMessage(
      "Let's create a timeline! First, what's the title for this timeline? (or type 'skip')"
    );
  };

  const handleTimelineBuilderInput = async (input) => {
    const trimmedInput = input.trim();
    const lowerInput = trimmedInput.toLowerCase();

    // Allow cancel at any step
    if (lowerInput === "cancel" || lowerInput === "exit") {
      setTimelineBuilder(null);
      addMotherMessage("Timeline creation cancelled.");
      return;
    }

    switch (timelineBuilder.step) {
      case "title":
        const title = lowerInput === "skip" ? "" : trimmedInput;
        setTimelineBuilder((prev) => ({
          ...prev,
          step: "events",
          data: { ...prev.data, title },
        }));
        addMotherMessage("Now add your timeline events.");
        addSystemMessage(
          "Format: TIME - DESCRIPTION (e.g., '9:00 AM - Wake up' or just 'Morning - Wake up')"
        );
        addSystemMessage("Type 'done' when finished adding events.");
        break;

      case "events":
        if (lowerInput === "done") {
          if (timelineBuilder.data.events.length === 0) {
            addSystemMessage("Please add at least one event to the timeline.");
            return;
          }
          setTimelineBuilder((prev) => ({
            ...prev,
            step: "tags",
          }));
          addMotherMessage(
            "Add tags for this timeline (comma-separated, or 'skip'):"
          );
          return;
        }

        // Parse event: prefer splitting on a dash separator (e.g. "9:00 AM - Wake up");
        // do NOT split on a colon so times like "9:00" keep their minutes.
        let time = "";
        let description = trimmedInput;

        const dashMatch = trimmedInput.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        if (dashMatch) {
          time = normalizeTime(dashMatch[1].trim());
          description = dashMatch[2].trim();
        }

        const newEvent = { time, description };
        setTimelineBuilder((prev) => {
          const newEvents = [...prev.data.events, newEvent];
          return {
            ...prev,
            data: { ...prev.data, events: newEvents },
          };
        });

        const eventDisplay = time
          ? `${time} — ${description}`
          : `• ${description}`;
        const currentLength = timelineBuilder.data.events.length + 1;
        addMotherMessage(`  ${currentLength}. ${eventDisplay}`);
        addSystemMessage("Add another event or type 'done' to finish:");
        break;

      case "tags":
        const tags =
          lowerInput === "skip"
            ? []
            : trimmedInput
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t);
        setTimelineBuilder((prev) => ({
          ...prev,
          step: "category",
          data: { ...prev.data, tags },
        }));
        addMotherMessage("Enter a category for this timeline (or 'skip'):");
        break;

      case "category":
        const category = lowerInput === "skip" ? null : trimmedInput;

        // Save the timeline - use functional update to get latest state
        const timelineData = {
          type: "timeline",
          content: timelineBuilder.data.title || "Timeline",
          events: timelineBuilder.data.events,
          tags: timelineBuilder.data.tags,
          category: category,
          created_at: new Date().toISOString(),
        };

        try {
          await api.createMemory(timelineData);
          let successMsg = "Timeline created successfully!";
          if (timelineBuilder.data.tags.length)
            successMsg += ` Tags: ${timelineBuilder.data.tags.join(", ")}.`;
          if (category) successMsg += ` Category: ${category}.`;
          addMotherMessage(successMsg);

          // Show timeline preview
          addSystemMessage(`── ${timelineBuilder.data.title || "Timeline"} ──`);
          timelineBuilder.data.events.forEach((event, i) => {
            const display = event.time
              ? `${event.time} — ${event.description}`
              : `• ${event.description}`;
            addSystemMessage(`  ${display}`);
          });

          await loadMemories();
        } catch (err) {
          const newMemory = {
            id: Date.now(),
            ...timelineData,
          };
          saveToLocalStorage(newMemory);
          addMotherMessage("Timeline saved locally. (Backend unavailable)");
          await loadMemories();
        }

        setTimelineBuilder(null);
        break;

      default:
        setTimelineBuilder(null);
        addSystemMessage("Something went wrong. Please try again.");
    }
  };

  const handleSavePicture = () => {
    // Start interactive image save: prompt for file selection
    setImageBuilder({ step: "select", data: {} });
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    // create a temporary preview memory entry so user sees the photo inline
    const tempId = -Date.now();
    const previewMemory = {
      id: tempId,
      type: "image",
      image_url: preview,
      description: "",
      tags: [],
      album: null,
      created_at: new Date().toISOString(),
      has_image: true,
    };
    setImageFile(file);
    setImageBuilder({
      step: "description",
      data: { file, preview, description: "", tags: [], tempId },
    });
    setMemories((prev) => [previewMemory, ...prev]);

    addMotherMessage(`Image selected: ${file.name}`);
    addSystemMessage("Enter a description for this image (or type 'skip'):");
  };

  const processImageUpload = async (file, description, tags, album) => {
    if (!file) return;

    try {
      const result = await api.uploadImage(file, description, tags, album);

      // Try to obtain the uploaded image URL from various possible response shapes
      const imageUrl =
        result.data?.image_url ||
        result.data?.url ||
        result.image_url ||
        result.url ||
        (result.data && (result.data.path || result.data.src));

      addMotherMessage(`Image uploaded successfully.`);

      // Detect if the upload response already included a memory record to avoid duplicates
      let returnedMemory = null;
      try {
        const resp = result || {};
        returnedMemory =
          resp.data?.memory ||
          resp.memory ||
          resp.data?.record ||
          resp.record ||
          null;

        if (!returnedMemory) {
          const maybeId =
            resp.data?.id || resp.id || resp.data?.memory_id || resp.memory_id;
          const maybeUrl =
            resp.data?.image_url ||
            resp.image_url ||
            resp.data?.url ||
            resp.url ||
            (resp.data && (resp.data.path || resp.data.src));
          if (maybeId && maybeUrl) {
            returnedMemory = {
              id: maybeId,
              image_url: maybeUrl,
              description:
                resp.data?.description || description || resp.description || "",
              tags: resp.data?.tags || tags || [],
              album: resp.data?.album || album || null,
              type: "image",
              has_image: true,
              created_at:
                resp.data?.created_at ||
                resp.created_at ||
                new Date().toISOString(),
            };
          }
        }
      } catch (e) {
        console.warn("Error inspecting upload response for memory:", e);
      }

      if (!returnedMemory) {
        try {
          const memoryData = {
            type: "image",
            content: description || "Image",
            description: description || "",
            tags: tags || [],
            album: null,
            image_url:
              imageUrl || (typeof result === "string" ? result : undefined),
            has_image: true,
            created_at: new Date().toISOString(),
          };

          const created = await api.createMemory(memoryData);
          returnedMemory = created?.data || created?.memory || created || null;
        } catch (memErr) {
          console.warn("Failed to create image memory record:", memErr);
        }
      }

      setImageFile(null);
      setImageBuilder(null);
      // reload memories; loadMemories will merge images and dedupe
      await loadMemories();
    } catch (err) {
      // Fallback to local storage
      const newMemory = {
        id: Date.now(),
        type: "image",
        description: description || "Untitled image",
        tags: tags || [],
        album: album || null,
        image_url: URL.createObjectURL(file),
        created_at: new Date().toISOString(),
      };
      saveToLocalStorage(newMemory);
      addMotherMessage(`Image saved locally. (Backend unavailable)`);
      setImageFile(null);
      setImageBuilder(null);
      await loadMemories();
    }
  };

  const handleImageBuilderInput = async (input) => {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    // If in image editor mode, delegate to image editor handler
    if (
      imageBuilder?.step === "image_editor" ||
      imageBuilder?.step?.includes("edit_")
    ) {
      await handleImageEditorInput(input);
      return;
    }

    // Allow cancel
    if (lower === "cancel" || lower === "exit") {
      // remove preview memory if present
      const tempId = imageBuilder?.data?.tempId;
      if (tempId) setMemories((prev) => prev.filter((m) => m.id !== tempId));
      setImageBuilder(null);
      setImageFile(null);
      addMotherMessage("Image upload cancelled.");
      return;
    }

    switch (imageBuilder.step) {
      case "select":
        addSystemMessage("Please select an image file to continue.");
        break;

      case "description":
        if (lower === "skip") {
          imageBuilder.data.description = "";
        } else {
          imageBuilder.data.description = trimmed;
        }
        setImageBuilder({ ...imageBuilder, step: "tags" });
        addSystemMessage("Add tags (comma-separated) or type 'skip':");
        break;

      case "tags":
        if (lower === "skip") {
          imageBuilder.data.tags = [];
        } else {
          imageBuilder.data.tags = trimmed
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        }
        setImageBuilder({ ...imageBuilder, step: "album" });
        addSystemMessage("Enter an album name (or type 'skip'):");
        break;

      case "album":
        if (lower === "skip") {
          imageBuilder.data.album = null;
        } else {
          imageBuilder.data.album = trimmed;
        }
        setImageBuilder({ ...imageBuilder, step: "confirm" });
        addMotherMessage("Ready to upload the image with the following:");
        addSystemMessage(
          `  Description: ${imageBuilder.data.description || "(none)"}`
        );
        addSystemMessage(
          `  Tags: ${imageBuilder.data.tags.join(", ") || "(none)"}`
        );
        addSystemMessage(`  Album: ${imageBuilder.data.album || "(none)"}`);
        addSystemMessage("Type 'save' to upload or 'cancel' to abort.");
        break;

      case "confirm":
        if (lower === "save" || lower === "yes" || lower === "y") {
          await processImageUpload(
            imageBuilder.data.file || imageFile,
            imageBuilder.data.description,
            imageBuilder.data.tags,
            imageBuilder.data.album
          );
        } else {
          // remove preview memory if present
          const tempId = imageBuilder?.data?.tempId;
          if (tempId)
            setMemories((prev) => prev.filter((m) => m.id !== tempId));
          addMotherMessage("Image upload cancelled.");
          setImageBuilder(null);
          setImageFile(null);
        }
        break;

      default:
        setImageBuilder(null);
        addSystemMessage("Something went wrong with image upload. Try again.");
    }
  };

  const handleEditMemory = async (parsed) => {
    if (!parsed.id && parsed.id !== 0) {
      addSystemMessage("Please specify memory ID: edit memory #12");
      return;
    }

    // Convert to number for comparison since API might return strings
    const memoryId = parseInt(parsed.id, 10);
    const memory = memories.find((m) => parseInt(m.id, 10) === memoryId);

    if (!memory) {
      addSystemMessage(`Memory #${parsed.id} not found.`);
      return;
    }

    // If it's a table, start interactive editor
    if (memory.type === "table") {
      startTableEditor(memory);
      return;
    }

    // If it's a list, start interactive editor
    if (memory.type === "list") {
      startListEditor(memory);
      return;
    }

    // If it's a timeline, start interactive editor
    if (memory.type === "timeline") {
      startTimelineEditor(memory);
      return;
    }

    // If it's an image, start image editor
    if (memory.type === "image") {
      startImageEditor(memory);
      return;
    }

    // For other memories, use simple update
    try {
      await api.updateMemory(parsed.id, parsed.updates);
      addMotherMessage(`Memory updated successfully.`);
      await loadMemories();
    } catch (err) {
      addSystemMessage(`Error: ${err.message}`);
    }
  };

  const startImageEditor = (memory) => {
    addMotherMessage(
      `Editing Image #${memory.id}: "${memory.description || "Untitled"}"`
    );
    addSystemMessage("What would you like to edit?");
    addSystemMessage("  1. Description");
    addSystemMessage("  2. Tags");
    addSystemMessage("  3. Album");
    addSystemMessage("  4. View current image");
    addSystemMessage("  save - Save changes");
    addSystemMessage("  cancel - Discard changes");

    setImageBuilder({
      step: "image_editor",
      memory: memory,
      data: {
        description: memory.description || "",
        tags: [...(memory.tags || [])],
      },
    });
  };

  const handleImageEditorInput = async (input) => {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    // Allow cancel
    if (lower === "cancel" || lower === "exit") {
      setImageBuilder(null);
      addMotherMessage("Image editing cancelled.");
      return;
    }

    // Save changes
    if (lower === "save") {
      try {
        const updates = {
          description: imageBuilder.data.description,
          tags: imageBuilder.data.tags,
        };
        // Use updateImage for image type, not updateMemory
        await api.updateImage(imageBuilder.memory.id, updates);
        addMotherMessage(
          `Image #${imageBuilder.memory.id} updated successfully.`
        );
        setImageBuilder(null);
        await loadMemories();
      } catch (err) {
        addSystemMessage(`Error: ${err.message}`);
      }
      return;
    }

    switch (imageBuilder.step) {
      case "image_editor":
        if (lower === "1" || lower === "description") {
          setImageBuilder({ ...imageBuilder, step: "edit_description" });
          addMotherMessage(
            `Current description: "${
              imageBuilder.data.description || "(none)"
            }"`
          );
          addSystemMessage("Enter new description:");
        } else if (lower === "2" || lower === "tags") {
          setImageBuilder({ ...imageBuilder, step: "edit_tags" });
          addMotherMessage(
            `Current tags: ${imageBuilder.data.tags.join(", ") || "(none)"}`
          );
          addSystemMessage("Enter new tags (comma-separated) or 'clear':");
        } else if (lower === "3" || lower === "view") {
          addMotherMessage(`Image #${imageBuilder.memory.id}:`);
          addSystemMessage(
            `  Description: ${imageBuilder.data.description || "(none)"}`
          );
          addSystemMessage(
            `  Tags: ${imageBuilder.data.tags.join(", ") || "(none)"}`
          );
          addSystemMessage("─────────────────────");
          addSystemMessage("What would you like to edit?");
          addSystemMessage("  1. Description");
          addSystemMessage("  2. Tags");
          addSystemMessage("  3. View current image");
          addSystemMessage("  save - Save changes");
          addSystemMessage("  cancel - Discard changes");
        } else {
          addSystemMessage("Please enter 1-3, 'save', or 'cancel'.");
        }
        break;

      case "edit_description":
        if (lower === "skip") {
          imageBuilder.data.description = "";
        } else {
          imageBuilder.data.description = trimmed;
        }
        setImageBuilder({ ...imageBuilder, step: "image_editor" });
        addSystemMessage("What would you like to edit?");
        addSystemMessage("  1. Description");
        addSystemMessage("  2. Tags");
        addSystemMessage("  3. View current image");
        addSystemMessage("  save - Save changes");
        addSystemMessage("  cancel - Discard changes");
        break;

      case "edit_tags":
        if (lower === "clear") {
          imageBuilder.data.tags = [];
        } else {
          imageBuilder.data.tags = trimmed
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        }
        setImageBuilder({ ...imageBuilder, step: "image_editor" });
        addSystemMessage("What would you like to edit?");
        addSystemMessage("  1. Description");
        addSystemMessage("  2. Tags");
        addSystemMessage("  3. View current image");
        addSystemMessage("  save - Save changes");
        addSystemMessage("  cancel - Discard changes");
        break;

      default:
        setImageBuilder(null);
        addSystemMessage("Something went wrong. Try again.");
    }
  };

  const startTableEditor = (memory) => {
    setTableEditor({
      step: "menu",
      memory: memory,
      data: {
        title: memory.content || "",
        columns: [...(memory.columns || [])],
        rows: memory.rows ? memory.rows.map((r) => [...r]) : [],
        tags: [...(memory.tags || [])],
        category: memory.category || null,
      },
    });

    addMotherMessage(
      `Editing Table #${memory.id}: "${memory.content || "Untitled"}"`
    );
    showTableEditorMenu();
  };

  const showTableEditorMenu = () => {
    addSystemMessage("What would you like to edit?");
    addSystemMessage("  1. Title");
    addSystemMessage("  2. Columns");
    addSystemMessage("  3. Add row");
    addSystemMessage("  4. Edit row");
    addSystemMessage("  5. Delete row");
    addSystemMessage("  6. Tags");
    addSystemMessage("  7. Category");
    addSystemMessage("  8. View current table");
    addSystemMessage("  save - Save changes");
    addSystemMessage("  cancel - Discard changes");
  };

  const handleTableEditorInput = async (input) => {
    const trimmedInput = input.trim();
    const lowerInput = trimmedInput.toLowerCase();

    // Allow cancel at any step
    if (lowerInput === "cancel" || lowerInput === "exit") {
      setTableEditor(null);
      addMotherMessage("Table editing cancelled. No changes saved.");
      return;
    }

    // Save changes
    if (lowerInput === "save") {
      await saveTableEdits();
      return;
    }

    switch (tableEditor.step) {
      case "menu":
        handleTableEditorMenuChoice(lowerInput);
        break;

      case "title":
        setTableEditor({
          ...tableEditor,
          step: "menu",
          data: { ...tableEditor.data, title: trimmedInput },
        });
        addMotherMessage(`Title updated to: "${trimmedInput}"`);
        showTableEditorMenu();
        break;

      case "columns":
        const newColumns = trimmedInput
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c);
        if (newColumns.length === 0) {
          addSystemMessage("Please enter at least one column name.");
          return;
        }
        // Adjust rows to match new column count
        const adjustedRows = tableEditor.data.rows.map((row) => {
          if (row.length < newColumns.length) {
            return [...row, ...Array(newColumns.length - row.length).fill("")];
          } else if (row.length > newColumns.length) {
            return row.slice(0, newColumns.length);
          }
          return row;
        });
        setTableEditor({
          ...tableEditor,
          step: "menu",
          data: {
            ...tableEditor.data,
            columns: newColumns,
            rows: adjustedRows,
          },
        });
        addMotherMessage(`Columns updated: ${newColumns.join(" | ")}`);
        showTableEditorMenu();
        break;

      case "add_row":
        const addValues = trimmedInput.split(",").map((v) => v.trim());
        if (addValues.length !== tableEditor.data.columns.length) {
          addSystemMessage(
            `Row should have ${tableEditor.data.columns.length} values (you entered ${addValues.length}). Try again:`
          );
          return;
        }
        const rowsWithNew = [...tableEditor.data.rows, addValues];
        setTableEditor({
          ...tableEditor,
          step: "menu",
          data: { ...tableEditor.data, rows: rowsWithNew },
        });
        addMotherMessage(
          `Row ${rowsWithNew.length} added: ${addValues.join(" | ")}`
        );
        showTableEditorMenu();
        break;

      case "select_edit_row":
        const editRowNum = parseInt(trimmedInput);
        if (
          isNaN(editRowNum) ||
          editRowNum < 1 ||
          editRowNum > tableEditor.data.rows.length
        ) {
          addSystemMessage(
            `Please enter a valid row number (1-${tableEditor.data.rows.length}):`
          );
          return;
        }
        setTableEditor({
          ...tableEditor,
          step: "edit_row",
          editingRowIndex: editRowNum - 1,
        });
        const currentRow = tableEditor.data.rows[editRowNum - 1];
        addMotherMessage(
          `Current row ${editRowNum}: ${currentRow.join(" | ")}`
        );
        addSystemMessage(
          `Enter new values (${tableEditor.data.columns.length} values, comma-separated):`
        );
        break;

      case "edit_row":
        const editValues = trimmedInput.split(",").map((v) => v.trim());
        if (editValues.length !== tableEditor.data.columns.length) {
          addSystemMessage(
            `Row should have ${tableEditor.data.columns.length} values. Try again:`
          );
          return;
        }
        const updatedRows = [...tableEditor.data.rows];
        updatedRows[tableEditor.editingRowIndex] = editValues;
        setTableEditor({
          ...tableEditor,
          step: "menu",
          data: { ...tableEditor.data, rows: updatedRows },
          editingRowIndex: undefined,
        });
        addMotherMessage(
          `Row ${tableEditor.editingRowIndex + 1} updated: ${editValues.join(
            " | "
          )}`
        );
        showTableEditorMenu();
        break;

      case "select_delete_row":
        const deleteRowNum = parseInt(trimmedInput);
        if (
          isNaN(deleteRowNum) ||
          deleteRowNum < 1 ||
          deleteRowNum > tableEditor.data.rows.length
        ) {
          addSystemMessage(
            `Please enter a valid row number (1-${tableEditor.data.rows.length}):`
          );
          return;
        }
        const rowsAfterDelete = tableEditor.data.rows.filter(
          (_, i) => i !== deleteRowNum - 1
        );
        setTableEditor({
          ...tableEditor,
          step: "menu",
          data: { ...tableEditor.data, rows: rowsAfterDelete },
        });
        addMotherMessage(
          `Row ${deleteRowNum} deleted. ${rowsAfterDelete.length} rows remaining.`
        );
        showTableEditorMenu();
        break;

      case "tags":
        const newTags =
          lowerInput === "clear"
            ? []
            : trimmedInput
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t);
        setTableEditor({
          ...tableEditor,
          step: "menu",
          data: { ...tableEditor.data, tags: newTags },
        });
        addMotherMessage(
          newTags.length
            ? `Tags updated: ${newTags.join(", ")}`
            : "Tags cleared."
        );
        showTableEditorMenu();
        break;

      case "category":
        const newCategory = lowerInput === "clear" ? null : trimmedInput;
        setTableEditor({
          ...tableEditor,
          step: "menu",
          data: { ...tableEditor.data, category: newCategory },
        });
        addMotherMessage(
          newCategory ? `Category updated: ${newCategory}` : "Category cleared."
        );
        showTableEditorMenu();
        break;

      default:
        setTableEditor({ ...tableEditor, step: "menu" });
        showTableEditorMenu();
    }
  };

  const handleTableEditorMenuChoice = (choice) => {
    switch (choice) {
      case "1":
      case "title":
        setTableEditor({ ...tableEditor, step: "title" });
        addMotherMessage(
          `Current title: "${tableEditor.data.title || "(none)"}"`
        );
        addSystemMessage("Enter new title:");
        break;

      case "2":
      case "columns":
        setTableEditor({ ...tableEditor, step: "columns" });
        addMotherMessage(
          `Current columns: ${tableEditor.data.columns.join(" | ") || "(none)"}`
        );
        addSystemMessage("Enter new column names (comma-separated):");
        break;

      case "3":
      case "add":
      case "add row":
        if (tableEditor.data.columns.length === 0) {
          addSystemMessage("Please add columns first (option 2).");
          return;
        }
        setTableEditor({ ...tableEditor, step: "add_row" });
        addSystemMessage(
          `Enter row values (${tableEditor.data.columns.length} values, comma-separated):`
        );
        addSystemMessage(`Columns: ${tableEditor.data.columns.join(" | ")}`);
        break;

      case "4":
      case "edit":
      case "edit row":
        if (tableEditor.data.rows.length === 0) {
          addSystemMessage("No rows to edit. Add rows first (option 3).");
          return;
        }
        setTableEditor({ ...tableEditor, step: "select_edit_row" });
        addMotherMessage("Current rows:");
        tableEditor.data.rows.forEach((row, i) => {
          addSystemMessage(`  ${i + 1}. ${row.join(" | ")}`);
        });
        addSystemMessage("Enter row number to edit:");
        break;

      case "5":
      case "delete":
      case "delete row":
        if (tableEditor.data.rows.length === 0) {
          addSystemMessage("No rows to delete.");
          return;
        }
        setTableEditor({ ...tableEditor, step: "select_delete_row" });
        addMotherMessage("Current rows:");
        tableEditor.data.rows.forEach((row, i) => {
          addSystemMessage(`  ${i + 1}. ${row.join(" | ")}`);
        });
        addSystemMessage("Enter row number to delete:");
        break;

      case "6":
      case "tags":
        setTableEditor({ ...tableEditor, step: "tags" });
        addMotherMessage(
          `Current tags: ${tableEditor.data.tags.join(", ") || "(none)"}`
        );
        addSystemMessage(
          "Enter new tags (comma-separated) or 'clear' to remove all:"
        );
        break;

      case "7":
      case "category":
        setTableEditor({ ...tableEditor, step: "category" });
        addMotherMessage(
          `Current category: ${tableEditor.data.category || "(none)"}`
        );
        addSystemMessage("Enter new category or 'clear' to remove:");
        break;

      case "8":
      case "view":
        viewCurrentTable();
        break;

      default:
        addSystemMessage(
          "Invalid option. Please enter 1-8, 'save', or 'cancel'."
        );
    }
  };

  const viewCurrentTable = () => {
    addMotherMessage(`═══ Table Preview ═══`);
    addMotherMessage(`Title: ${tableEditor.data.title || "(none)"}`);
    addMotherMessage(
      `Columns: ${tableEditor.data.columns.join(" | ") || "(none)"}`
    );
    if (tableEditor.data.rows.length > 0) {
      addMotherMessage("Rows:");
      tableEditor.data.rows.forEach((row, i) => {
        addSystemMessage(`  ${i + 1}. ${row.join(" | ")}`);
      });
    } else {
      addSystemMessage("  (no rows)");
    }
    addMotherMessage(`Tags: ${tableEditor.data.tags.join(", ") || "(none)"}`);
    addMotherMessage(`Category: ${tableEditor.data.category || "(none)"}`);
    addSystemMessage("─────────────────────");
    showTableEditorMenu();
  };

  const saveTableEdits = async () => {
    try {
      const updates = {
        content: tableEditor.data.title,
        columns: tableEditor.data.columns,
        rows: tableEditor.data.rows,
        tags: tableEditor.data.tags,
        category: tableEditor.data.category,
      };

      await api.updateMemory(tableEditor.memory.id, updates);
      addMotherMessage(`Table #${tableEditor.memory.id} updated successfully!`);
      setTableEditor(null);
      await loadMemories();
    } catch (err) {
      addSystemMessage(`Error saving: ${err.message}`);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // LIST EDITOR FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const startListEditor = (memory) => {
    setListEditor({
      step: "menu",
      memory: memory,
      data: {
        title: memory.content || "",
        items: [...(memory.items || [])],
        tags: [...(memory.tags || [])],
        category: memory.category || null,
      },
    });

    addMotherMessage(
      `Editing List #${memory.id}: "${memory.content || "Untitled"}"`
    );
    showListEditorMenu();
  };

  const showListEditorMenu = () => {
    addSystemMessage("What would you like to edit?");
    addSystemMessage("  1. Title");
    addSystemMessage("  2. Add item");
    addSystemMessage("  3. Edit item");
    addSystemMessage("  4. Delete item");
    addSystemMessage("  5. Reorder items");
    addSystemMessage("  6. Tags");
    addSystemMessage("  7. Category");
    addSystemMessage("  8. View current list");
    addSystemMessage("  save - Save changes");
    addSystemMessage("  cancel - Discard changes");
  };

  const handleListEditorInput = async (input) => {
    const trimmedInput = input.trim();
    const lowerInput = trimmedInput.toLowerCase();

    // Allow cancel at any step
    if (lowerInput === "cancel" || lowerInput === "exit") {
      setListEditor(null);
      addMotherMessage("List editing cancelled. No changes saved.");
      return;
    }

    // Save changes
    if (lowerInput === "save") {
      await saveListEdits();
      return;
    }

    switch (listEditor.step) {
      case "menu":
        handleListEditorMenuChoice(lowerInput);
        break;

      case "title":
        setListEditor({
          ...listEditor,
          step: "menu",
          data: { ...listEditor.data, title: trimmedInput },
        });
        addMotherMessage(`Title updated to: "${trimmedInput}"`);
        showListEditorMenu();
        break;

      case "add_item":
        const newItems = [...listEditor.data.items, trimmedInput];
        setListEditor({
          ...listEditor,
          step: "menu",
          data: { ...listEditor.data, items: newItems },
        });
        addMotherMessage(`Item added: "${trimmedInput}"`);
        showListEditorMenu();
        break;

      case "select_edit_item":
        const editItemNum = parseInt(trimmedInput);
        if (
          isNaN(editItemNum) ||
          editItemNum < 1 ||
          editItemNum > listEditor.data.items.length
        ) {
          addSystemMessage(
            `Please enter a valid item number (1-${listEditor.data.items.length}):`
          );
          return;
        }
        setListEditor({
          ...listEditor,
          step: "edit_item",
          editingItemIndex: editItemNum - 1,
        });
        addMotherMessage(
          `Current: "${listEditor.data.items[editItemNum - 1]}"`
        );
        addSystemMessage("Enter new text for this item:");
        break;

      case "edit_item":
        const updatedItems = [...listEditor.data.items];
        updatedItems[listEditor.editingItemIndex] = trimmedInput;
        setListEditor({
          ...listEditor,
          step: "menu",
          data: { ...listEditor.data, items: updatedItems },
          editingItemIndex: undefined,
        });
        addMotherMessage(
          `Item ${
            listEditor.editingItemIndex + 1
          } updated to: "${trimmedInput}"`
        );
        showListEditorMenu();
        break;

      case "select_delete_item":
        const deleteItemNum = parseInt(trimmedInput);
        if (
          isNaN(deleteItemNum) ||
          deleteItemNum < 1 ||
          deleteItemNum > listEditor.data.items.length
        ) {
          addSystemMessage(
            `Please enter a valid item number (1-${listEditor.data.items.length}):`
          );
          return;
        }
        const itemsAfterDelete = listEditor.data.items.filter(
          (_, i) => i !== deleteItemNum - 1
        );
        setListEditor({
          ...listEditor,
          step: "menu",
          data: { ...listEditor.data, items: itemsAfterDelete },
        });
        addMotherMessage(
          `Item ${deleteItemNum} deleted. ${itemsAfterDelete.length} items remaining.`
        );
        showListEditorMenu();
        break;

      case "reorder":
        const [fromStr, toStr] = trimmedInput.split(/\s+to\s+|\s*,\s*|\s+/);
        const fromNum = parseInt(fromStr);
        const toNum = parseInt(toStr);
        if (
          isNaN(fromNum) ||
          isNaN(toNum) ||
          fromNum < 1 ||
          fromNum > listEditor.data.items.length ||
          toNum < 1 ||
          toNum > listEditor.data.items.length
        ) {
          addSystemMessage(`Invalid. Enter two numbers like: 3 to 1 or 3, 1`);
          return;
        }
        const reorderedItems = [...listEditor.data.items];
        const [movedItem] = reorderedItems.splice(fromNum - 1, 1);
        reorderedItems.splice(toNum - 1, 0, movedItem);
        setListEditor({
          ...listEditor,
          step: "menu",
          data: { ...listEditor.data, items: reorderedItems },
        });
        addMotherMessage(`Moved item ${fromNum} to position ${toNum}.`);
        showListEditorMenu();
        break;

      case "tags":
        const newTags =
          lowerInput === "clear"
            ? []
            : trimmedInput
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t);
        setListEditor({
          ...listEditor,
          step: "menu",
          data: { ...listEditor.data, tags: newTags },
        });
        addMotherMessage(
          newTags.length
            ? `Tags updated: ${newTags.join(", ")}`
            : "Tags cleared."
        );
        showListEditorMenu();
        break;

      case "category":
        const newCategory = lowerInput === "clear" ? null : trimmedInput;
        setListEditor({
          ...listEditor,
          step: "menu",
          data: { ...listEditor.data, category: newCategory },
        });
        addMotherMessage(
          newCategory ? `Category updated: ${newCategory}` : "Category cleared."
        );
        showListEditorMenu();
        break;

      default:
        setListEditor({ ...listEditor, step: "menu" });
        showListEditorMenu();
    }
  };

  const handleListEditorMenuChoice = (choice) => {
    switch (choice) {
      case "1":
      case "title":
        setListEditor({ ...listEditor, step: "title" });
        addMotherMessage(
          `Current title: "${listEditor.data.title || "(none)"}"`
        );
        addSystemMessage("Enter new title:");
        break;

      case "2":
      case "add":
      case "add item":
        setListEditor({ ...listEditor, step: "add_item" });
        addSystemMessage("Enter the new item to add:");
        break;

      case "3":
      case "edit":
      case "edit item":
        if (listEditor.data.items.length === 0) {
          addSystemMessage("No items to edit. Add items first (option 2).");
          return;
        }
        setListEditor({ ...listEditor, step: "select_edit_item" });
        addMotherMessage("Current items:");
        listEditor.data.items.forEach((item, i) => {
          addSystemMessage(`  ${i + 1}. ${item}`);
        });
        addSystemMessage("Enter item number to edit:");
        break;

      case "4":
      case "delete":
      case "delete item":
        if (listEditor.data.items.length === 0) {
          addSystemMessage("No items to delete.");
          return;
        }
        setListEditor({ ...listEditor, step: "select_delete_item" });
        addMotherMessage("Current items:");
        listEditor.data.items.forEach((item, i) => {
          addSystemMessage(`  ${i + 1}. ${item}`);
        });
        addSystemMessage("Enter item number to delete:");
        break;

      case "5":
      case "reorder":
      case "move":
        if (listEditor.data.items.length < 2) {
          addSystemMessage("Need at least 2 items to reorder.");
          return;
        }
        setListEditor({ ...listEditor, step: "reorder" });
        addMotherMessage("Current items:");
        listEditor.data.items.forEach((item, i) => {
          addSystemMessage(`  ${i + 1}. ${item}`);
        });
        addSystemMessage("Enter: [from] to [to] (e.g., '3 to 1' or '3, 1'):");
        break;

      case "6":
      case "tags":
        setListEditor({ ...listEditor, step: "tags" });
        addMotherMessage(
          `Current tags: ${listEditor.data.tags.join(", ") || "(none)"}`
        );
        addSystemMessage(
          "Enter new tags (comma-separated) or 'clear' to remove all:"
        );
        break;

      case "7":
      case "category":
        setListEditor({ ...listEditor, step: "category" });
        addMotherMessage(
          `Current category: ${listEditor.data.category || "(none)"}`
        );
        addSystemMessage("Enter new category or 'clear' to remove:");
        break;

      case "8":
      case "view":
        viewCurrentList();
        break;

      default:
        addSystemMessage(
          "Invalid option. Please enter 1-8, 'save', or 'cancel'."
        );
    }
  };

  const viewCurrentList = () => {
    addMotherMessage(`═══ List Preview ═══`);
    addMotherMessage(`Title: ${listEditor.data.title || "(none)"}`);
    if (listEditor.data.items.length > 0) {
      addMotherMessage("Items:");
      listEditor.data.items.forEach((item, i) => {
        addSystemMessage(`  ${i + 1}. ${item}`);
      });
    } else {
      addSystemMessage("  (no items)");
    }
    addMotherMessage(`Tags: ${listEditor.data.tags.join(", ") || "(none)"}`);
    addMotherMessage(`Category: ${listEditor.data.category || "(none)"}`);
    addSystemMessage("─────────────────────");
    showListEditorMenu();
  };

  const saveListEdits = async () => {
    try {
      const updates = {
        content: listEditor.data.title,
        items: listEditor.data.items,
        tags: listEditor.data.tags,
        category: listEditor.data.category,
      };

      await api.updateMemory(listEditor.memory.id, updates);
      addMotherMessage(`List #${listEditor.memory.id} updated successfully!`);
      setListEditor(null);
      await loadMemories();
    } catch (err) {
      addSystemMessage(`Error saving: ${err.message}`);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // TIMELINE EDITOR FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const startTimelineEditor = (memory) => {
    setTimelineEditor({
      step: "menu",
      memory: memory,
      data: {
        title: memory.content || "",
        events: memory.events ? memory.events.map((e) => ({ ...e })) : [],
        tags: [...(memory.tags || [])],
        category: memory.category || null,
      },
    });

    addMotherMessage(
      `Editing Timeline #${memory.id}: "${memory.content || "Untitled"}"`
    );
    showTimelineEditorMenu();
  };

  const showTimelineEditorMenu = () => {
    addSystemMessage("What would you like to edit?");
    addSystemMessage("  1. Title");
    addSystemMessage("  2. Add event");
    addSystemMessage("  3. Edit event");
    addSystemMessage("  4. Delete event");
    addSystemMessage("  5. Reorder events");
    addSystemMessage("  6. Tags");
    addSystemMessage("  7. Category");
    addSystemMessage("  8. View current timeline");
    addSystemMessage("  save - Save changes");
    addSystemMessage("  cancel - Discard changes");
  };

  const handleTimelineEditorInput = async (input) => {
    const trimmedInput = input.trim();
    const lowerInput = trimmedInput.toLowerCase();

    // Allow cancel at any step
    if (lowerInput === "cancel" || lowerInput === "exit") {
      setTimelineEditor(null);
      addMotherMessage("Timeline editing cancelled. No changes saved.");
      return;
    }

    // Save changes
    if (lowerInput === "save") {
      await saveTimelineEdits();
      return;
    }

    switch (timelineEditor.step) {
      case "menu":
        handleTimelineEditorMenuChoice(lowerInput);
        break;

      case "title":
        setTimelineEditor({
          ...timelineEditor,
          step: "menu",
          data: { ...timelineEditor.data, title: trimmedInput },
        });
        addMotherMessage(`Title updated to: "${trimmedInput}"`);
        showTimelineEditorMenu();
        break;

      case "add_event":
        // Keep colons inside time strings; split only on dash separators
        let time = "";
        let description = trimmedInput;
        const dashMatch = trimmedInput.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        if (dashMatch) {
          time = normalizeTime(dashMatch[1].trim());
          description = dashMatch[2].trim();
        }
        const newEvents = [
          ...timelineEditor.data.events,
          { time, description },
        ];
        setTimelineEditor({
          ...timelineEditor,
          step: "menu",
          data: { ...timelineEditor.data, events: newEvents },
        });
        const display = time ? `${time} — ${description}` : description;
        addMotherMessage(`Event added: "${display}"`);
        showTimelineEditorMenu();
        break;

      case "select_edit_event":
        const editEventNum = parseInt(trimmedInput);
        if (
          isNaN(editEventNum) ||
          editEventNum < 1 ||
          editEventNum > timelineEditor.data.events.length
        ) {
          addSystemMessage(
            `Please enter a valid event number (1-${timelineEditor.data.events.length}):`
          );
          return;
        }
        setTimelineEditor({
          ...timelineEditor,
          step: "edit_event",
          editingEventIndex: editEventNum - 1,
        });
        const currentEvent = timelineEditor.data.events[editEventNum - 1];
        const currentDisplay = currentEvent.time
          ? `${currentEvent.time} - ${currentEvent.description}`
          : currentEvent.description;
        addMotherMessage(`Current: "${currentDisplay}"`);
        addSystemMessage(
          "Enter new event (TIME - DESCRIPTION or just DESCRIPTION):"
        );
        break;

      case "edit_event":
        // Keep colons inside time strings; split only on dash separators
        let editTime = "";
        let editDesc = trimmedInput;
        const editMatch = trimmedInput.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        if (editMatch) {
          editTime = editMatch[1].trim();
          editDesc = editMatch[2].trim();
        }
        const updatedEvents = [...timelineEditor.data.events];
        updatedEvents[timelineEditor.editingEventIndex] = {
          time: editTime,
          description: editDesc,
        };
        setTimelineEditor({
          ...timelineEditor,
          step: "menu",
          data: { ...timelineEditor.data, events: updatedEvents },
          editingEventIndex: undefined,
        });
        addMotherMessage(
          `Event ${timelineEditor.editingEventIndex + 1} updated.`
        );
        showTimelineEditorMenu();
        break;

      case "select_delete_event":
        const deleteEventNum = parseInt(trimmedInput);
        if (
          isNaN(deleteEventNum) ||
          deleteEventNum < 1 ||
          deleteEventNum > timelineEditor.data.events.length
        ) {
          addSystemMessage(
            `Please enter a valid event number (1-${timelineEditor.data.events.length}):`
          );
          return;
        }
        const eventsAfterDelete = timelineEditor.data.events.filter(
          (_, i) => i !== deleteEventNum - 1
        );
        setTimelineEditor({
          ...timelineEditor,
          step: "menu",
          data: { ...timelineEditor.data, events: eventsAfterDelete },
        });
        addMotherMessage(
          `Event ${deleteEventNum} deleted. ${eventsAfterDelete.length} events remaining.`
        );
        showTimelineEditorMenu();
        break;

      case "reorder":
        const [fromStr, toStr] = trimmedInput.split(/\s+to\s+|\s*,\s*|\s+/);
        const fromNum = parseInt(fromStr);
        const toNum = parseInt(toStr);
        if (
          isNaN(fromNum) ||
          isNaN(toNum) ||
          fromNum < 1 ||
          fromNum > timelineEditor.data.events.length ||
          toNum < 1 ||
          toNum > timelineEditor.data.events.length
        ) {
          addSystemMessage(`Invalid. Enter two numbers like: 3 to 1 or 3, 1`);
          return;
        }
        const reorderedEvents = [...timelineEditor.data.events];
        const [movedEvent] = reorderedEvents.splice(fromNum - 1, 1);
        reorderedEvents.splice(toNum - 1, 0, movedEvent);
        setTimelineEditor({
          ...timelineEditor,
          step: "menu",
          data: { ...timelineEditor.data, events: reorderedEvents },
        });
        addMotherMessage(`Moved event ${fromNum} to position ${toNum}.`);
        showTimelineEditorMenu();
        break;

      case "tags":
        const newTags =
          lowerInput === "clear"
            ? []
            : trimmedInput
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t);
        setTimelineEditor({
          ...timelineEditor,
          step: "menu",
          data: { ...timelineEditor.data, tags: newTags },
        });
        addMotherMessage(
          newTags.length
            ? `Tags updated: ${newTags.join(", ")}`
            : "Tags cleared."
        );
        showTimelineEditorMenu();
        break;

      case "category":
        const newCategory = lowerInput === "clear" ? null : trimmedInput;
        setTimelineEditor({
          ...timelineEditor,
          step: "menu",
          data: { ...timelineEditor.data, category: newCategory },
        });
        addMotherMessage(
          newCategory ? `Category updated: ${newCategory}` : "Category cleared."
        );
        showTimelineEditorMenu();
        break;

      default:
        setTimelineEditor({ ...timelineEditor, step: "menu" });
        showTimelineEditorMenu();
    }
  };

  const handleTimelineEditorMenuChoice = (choice) => {
    switch (choice) {
      case "1":
      case "title":
        setTimelineEditor({ ...timelineEditor, step: "title" });
        addMotherMessage(
          `Current title: "${timelineEditor.data.title || "(none)"}"`
        );
        addSystemMessage("Enter new title:");
        break;

      case "2":
      case "add":
      case "add event":
        setTimelineEditor({ ...timelineEditor, step: "add_event" });
        addSystemMessage(
          "Enter the new event (TIME - DESCRIPTION or just DESCRIPTION):"
        );
        break;

      case "3":
      case "edit":
      case "edit event":
        if (timelineEditor.data.events.length === 0) {
          addSystemMessage("No events to edit. Add events first (option 2).");
          return;
        }
        setTimelineEditor({ ...timelineEditor, step: "select_edit_event" });
        addMotherMessage("Current events:");
        timelineEditor.data.events.forEach((event, i) => {
          const display = event.time
            ? `${event.time} — ${event.description}`
            : event.description;
          addSystemMessage(`  ${i + 1}. ${display}`);
        });
        addSystemMessage("Enter event number to edit:");
        break;

      case "4":
      case "delete":
      case "delete event":
        if (timelineEditor.data.events.length === 0) {
          addSystemMessage("No events to delete.");
          return;
        }
        setTimelineEditor({ ...timelineEditor, step: "select_delete_event" });
        addMotherMessage("Current events:");
        timelineEditor.data.events.forEach((event, i) => {
          const display = event.time
            ? `${event.time} — ${event.description}`
            : event.description;
          addSystemMessage(`  ${i + 1}. ${display}`);
        });
        addSystemMessage("Enter event number to delete:");
        break;

      case "5":
      case "reorder":
      case "move":
        if (timelineEditor.data.events.length < 2) {
          addSystemMessage("Need at least 2 events to reorder.");
          return;
        }
        setTimelineEditor({ ...timelineEditor, step: "reorder" });
        addMotherMessage("Current events:");
        timelineEditor.data.events.forEach((event, i) => {
          const display = event.time
            ? `${event.time} — ${event.description}`
            : event.description;
          addSystemMessage(`  ${i + 1}. ${display}`);
        });
        addSystemMessage("Enter: [from] to [to] (e.g., '3 to 1' or '3, 1'):");
        break;

      case "6":
      case "tags":
        setTimelineEditor({ ...timelineEditor, step: "tags" });
        addMotherMessage(
          `Current tags: ${timelineEditor.data.tags.join(", ") || "(none)"}`
        );
        addSystemMessage(
          "Enter new tags (comma-separated) or 'clear' to remove all:"
        );
        break;

      case "7":
      case "category":
        setTimelineEditor({ ...timelineEditor, step: "category" });
        addMotherMessage(
          `Current category: ${timelineEditor.data.category || "(none)"}`
        );
        addSystemMessage("Enter new category or 'clear' to remove:");
        break;

      case "8":
      case "view":
        viewCurrentTimeline();
        break;

      default:
        addSystemMessage(
          "Invalid option. Please enter 1-8, 'save', or 'cancel'."
        );
    }
  };

  const viewCurrentTimeline = () => {
    addMotherMessage(`═══ Timeline Preview ═══`);
    addMotherMessage(`Title: ${timelineEditor.data.title || "(none)"}`);
    if (timelineEditor.data.events.length > 0) {
      addMotherMessage("Events:");
      timelineEditor.data.events.forEach((event, i) => {
        const display = event.time
          ? `${event.time} → ${event.description}`
          : event.description;
        addSystemMessage(`  ${i + 1}. ${display}`);
      });
    } else {
      addSystemMessage("  (no events)");
    }
    addMotherMessage(
      `Tags: ${timelineEditor.data.tags.join(", ") || "(none)"}`
    );
    addMotherMessage(`Category: ${timelineEditor.data.category || "(none)"}`);
    addSystemMessage("─────────────────────");
    showTimelineEditorMenu();
  };

  const saveTimelineEdits = async () => {
    try {
      const updates = {
        content: timelineEditor.data.title,
        events: timelineEditor.data.events,
        tags: timelineEditor.data.tags,
        category: timelineEditor.data.category,
      };

      await api.updateMemory(timelineEditor.memory.id, updates);
      addMotherMessage(
        `Timeline #${timelineEditor.memory.id} updated successfully!`
      );
      setTimelineEditor(null);
      await loadMemories();
    } catch (err) {
      addSystemMessage(`Error saving: ${err.message}`);
    }
  };

  const handleDelete = async (parsed) => {
    // Build confirmation message based on delete type
    let confirmMsg = "";

    if (parsed.deleteAll) {
      confirmMsg =
        "Are you sure you want to DELETE ALL memories? This cannot be undone! (yes/no)";
    } else if (parsed.filters?.tags?.length) {
      confirmMsg = `Are you sure you want to delete all memories with tags: ${parsed.filters.tags.join(
        ", "
      )}? (yes/no)`;
    } else if (parsed.filters?.category) {
      confirmMsg = `Are you sure you want to delete all memories in category: ${parsed.filters.category}? (yes/no)`;
    } else if (parsed.id) {
      confirmMsg = `Are you sure you want to delete ${parsed.target} #${parsed.id}? (yes/no)`;
    } else {
      addSystemMessage(
        "Please specify: delete memory #12, delete all, delete memories tags: work, or delete memories category: happy"
      );
      return;
    }

    // Set pending action and ask for confirmation
    setPendingAction({ type: "delete", data: parsed });
    addMotherMessage(confirmMsg);
  };

  const executeDelete = async (parsed) => {
    try {
      // Optimistically remove the item from UI for single deletes so user doesn't see stale preview
      if (
        !parsed.deleteAll &&
        !parsed.filters?.tags &&
        !parsed.filters?.category &&
        parsed.id
      ) {
        const localMem = memories.find((m) => m.id === parsed.id);
        setMemories((prev) =>
          prev.filter(
            (m) =>
              m.id !== parsed.id &&
              m.id !== localMem?.image_id &&
              m.id !== localMem?.tempId
          )
        );
      }

      // Bulk delete operations
      if (parsed.deleteAll) {
        const result = await api.bulkDeleteMemories({ deleteAll: "true" });
        const count = result.data?.deletedCount || 0;
        addMotherMessage(`All ${count} memories deleted successfully.`);
        await loadMemories();
        return;
      }

      if (parsed.filters?.tags?.length || parsed.filters?.category) {
        const filters = {};
        if (parsed.filters.tags?.length) {
          filters.tags = parsed.filters.tags.join(",");
        }
        if (parsed.filters.category) {
          filters.category = parsed.filters.category;
        }
        const result = await api.bulkDeleteMemories(filters);
        const count = result.data?.deletedCount || 0;
        addMotherMessage(`${count} memories deleted successfully.`);
        await loadMemories();
        return;
      }

      // Single delete
      if (
        parsed.target === "memory" ||
        parsed.target === "picture" ||
        parsed.target === "image"
      ) {
        // If we're deleting a memory that contains an image, attempt to delete the associated image record too
        if (parsed.target === "memory") {
          const localMem = memories.find((m) => m.id === parsed.id);
          if (localMem?.type === "image") {
            try {
              await api.deleteImage(localMem.image_id || parsed.id);
            } catch (imgErr) {
              // non-fatal — image resource may already be removed
              console.warn("Failed to delete associated image:", imgErr);
            }
          }

          await api.deleteMemory(parsed.id);
        } else {
          await api.deleteImage(parsed.id);
        }

        addMotherMessage(
          `${parsed.target} #${parsed.id} deleted successfully.`
        );
        await loadMemories();
      }
    } catch (err) {
      // Fallback to local storage for single deletes
      if (parsed.id) {
        deleteFromLocalStorage(parsed.id);
        addMotherMessage(
          `${parsed.target} #${parsed.id} deleted successfully.`
        );
        await loadMemories();
      } else {
        addSystemMessage(`Error: ${err.message}`);
      }
    }
  };

  const handleRetrieve = async (parsed) => {
    try {
      // Build API filters
      const apiFilters = {};
      if (parsed.filters.category) {
        apiFilters.category = parsed.filters.category;
      }
      if (parsed.filters.tags && parsed.filters.tags.length > 0) {
        apiFilters.tags = parsed.filters.tags.join(",");
      }
      if (parsed.filters.type) {
        apiFilters.type = parsed.filters.type;
      }
      if (parsed.filters.date) {
        apiFilters.date = parsed.filters.date;
      }
      if (parsed.filters.first) {
        apiFilters.limit = 1;
      }

      console.log("Retrieve filters:", apiFilters);

      if (parsed.filters.search) {
        const results = await api.searchMemories(
          parsed.filters.search,
          apiFilters
        );
        let memories = results.data?.memories || results.memories || [];
        // also try fetching images that match filters
        try {
          const imgs = await api.getAllImages(apiFilters);
          const images = imgs.data?.images || imgs.images || [];
          const mapped = images.map((img) => ({
            id: img.id || img.image_id || Date.now(),
            type: "image",
            image_url: img.url || img.image_url || img.path || img.src,
            description: img.description || img.caption || "",
            tags: img.tags || [],
            album: img.album || null,
            created_at:
              img.created_at || img.createdAt || new Date().toISOString(),
            has_image: true,
          }));
          memories = [...mapped, ...memories.filter((m) => m.type !== "image")];
        } catch (err) {
          // ignore
        }

        if (memories.length > 0) {
          addMotherMessage(`Found ${memories.length} memories:`);
          memories.forEach((mem) => {
            addSystemMessage(
              `  #${mem.id}: ${
                mem.content || mem.description || String(mem.id)
              }`
            );
          });
        } else {
          addMotherMessage("No memories found matching your search.");
        }
      } else {
        const results = await api.getAllMemories(apiFilters);
        let memories = results.data?.memories || results.memories || [];
        // also fetch images and merge
        try {
          const imgs = await api.getAllImages(apiFilters);
          const images = imgs.data?.images || imgs.images || [];
          const mapped = images.map((img) => ({
            id: img.id || img.image_id || Date.now(),
            type: "image",
            image_url: img.url || img.image_url || img.path || img.src,
            description: img.description || img.caption || "",
            tags: img.tags || [],
            album: img.album || null,
            created_at:
              img.created_at || img.createdAt || new Date().toISOString(),
            has_image: true,
          }));
          memories = [...mapped, ...memories.filter((m) => m.type !== "image")];
        } catch (err) {
          // ignore image fetch errors
        }

        if (memories.length > 0) {
          const filterDesc = [];
          if (parsed.filters.category)
            filterDesc.push(`category: ${parsed.filters.category}`);
          if (parsed.filters.tags?.length)
            filterDesc.push(`tags: ${parsed.filters.tags.join(", ")}`);
          const desc = filterDesc.length ? ` (${filterDesc.join(", ")})` : "";
          addMotherMessage(`Retrieved ${memories.length} memories${desc}.`);
          setMemories(memories);
        } else {
          addMotherMessage("No memories found with those filters.");
        }
      }
    } catch (err) {
      // Fallback to local storage
      const localMemories = loadFromLocalStorage();
      const filtered = filterMemories(localMemories, parsed.filters);
      if (filtered.length > 0) {
        addMotherMessage(`Retrieved ${filtered.length} memories.`);
        setMemories(filtered);
      } else {
        addMotherMessage("No memories found.");
      }
    }
  };

  const showHelp = () => {
    addSystemMessage("═══ CREATE MEMORIES ═══");
    addSystemMessage('  create memory: "Your text"');
    addSystemMessage('  create memory: #work #ideas "Your text"');
    addSystemMessage('  create memory: category: happy "Your text"');
    addSystemMessage('  create memory: #work category: happy "Your text"');
    addSystemMessage("");
    addSystemMessage("═══ CREATE TABLE (Interactive) ═══");
    addSystemMessage("  create table - Starts guided table creation");
    addSystemMessage(
      "    → Mother asks for: title, columns, rows, tags, category"
    );
    addSystemMessage("    → Type 'cancel' to abort at any step");
    addSystemMessage("");
    addSystemMessage("═══ CREATE LIST (Interactive) ═══");
    addSystemMessage("  create list - Starts guided list creation");
    addSystemMessage("    → Mother asks for: title, items, tags, category");
    addSystemMessage("    → Type 'cancel' to abort at any step");
    addSystemMessage("");
    addSystemMessage("═══ CREATE TIMELINE (Interactive) ═══");
    addSystemMessage("  create timeline - Starts guided timeline creation");
    addSystemMessage("    → Mother asks for: title, events, tags, category");
    addSystemMessage("    → Type 'cancel' to abort at any step");
    addSystemMessage(
      "    → Format for events: TIME - DESCRIPTION (e.g., '9:00 AM - Wake up')"
    );
    addSystemMessage("");
    addSystemMessage("═══ SAVE IMAGES ═══");
    addSystemMessage("  save picture - Opens file picker to upload image");
    addSystemMessage("");
    addSystemMessage("═══ RETRIEVE MEMORIES ═══");
    addSystemMessage("  show all - Retrieve all memories and images");
    addSystemMessage("  show tags: work - Memories tagged with 'work'");
    addSystemMessage(
      "  show tags: work, ideas - Memories with any of these tags"
    );
    addSystemMessage("  show #tag1 #tag2 - Hashtag syntax for tags");
    addSystemMessage("  show category: happy - All in category 'happy'");
    addSystemMessage("  show pictures - All images only");
    addSystemMessage("  show all tables - All table memories");
    addSystemMessage(
      "  Mother, show happy moments - Natural language retrieval"
    );
    addSystemMessage("");
    addSystemMessage("═══ EDIT & DELETE ═══");
    addSystemMessage('  edit memory #12: "New content" - Update memory text');
    addSystemMessage(
      "  edit memory #12 - For tables/lists: opens interactive editor"
    );
    addSystemMessage("  delete memory #12 - Delete single memory");
    addSystemMessage("  delete picture #5 - Delete single image");
    addSystemMessage("  delete image #5 - Same as delete picture");
    addSystemMessage(
      "  delete all - Delete ALL memories (asks for confirmation)"
    );
    addSystemMessage("  delete memories tags: work - Delete all tagged 'work'");
    addSystemMessage("  delete memories category: happy - Delete in category");
    addSystemMessage("");
    addSystemMessage("═══ OTHER ═══");
    addSystemMessage("  clear - Clear terminal screen");
    addSystemMessage("  help - Show this help (what you're reading)");
  };

  // Local storage fallback functions
  const saveToLocalStorage = (memory) => {
    const existing = JSON.parse(localStorage.getItem("mid_memories") || "[]");
    existing.push(memory);
    localStorage.setItem("mid_memories", JSON.stringify(existing));
    setMemories(existing);
  };

  const loadFromLocalStorage = () => {
    return JSON.parse(localStorage.getItem("mid_memories") || "[]");
  };

  const deleteFromLocalStorage = (id) => {
    const existing = JSON.parse(localStorage.getItem("mid_memories") || "[]");
    const filtered = existing.filter((m) => m.id !== id);
    localStorage.setItem("mid_memories", JSON.stringify(filtered));
    setMemories(filtered);
  };

  const filterMemories = (memories, filters) => {
    let filtered = [...memories];

    if (filters.tags) {
      filtered = filtered.filter((m) =>
        filters.tags.some((tag) => m.tags?.includes(tag))
      );
    }

    if (filters.category) {
      filtered = filtered.filter((m) => m.category === filters.category);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.content?.toLowerCase().includes(searchLower) ||
          m.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.first) {
      filtered = filtered.slice(0, 1);
    }

    if (filters.type) {
      filtered = filtered.filter((m) => m.type === filters.type);
    }

    return filtered;
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const cmd = currentInput.trim();
      if (cmd) {
        handleCommand(cmd);
      }
      // Don't add empty lines to history
    }
  };

  const handleEdit = (memory) => {
    // Set pending action and ask for confirmation
    setPendingAction({ type: "edit", data: memory });
    addMotherMessage(`Do you want to edit memory #${memory.id}? (yes/no)`);
    commandInputRef.current?.focus();
  };

  const executeEdit = (memory) => {
    setEditingMemory(memory);
    setCommand(`edit memory #${memory.id}: "${memory.content || ""}"`);
    addSystemMessage(`Edit the command above and press Enter to save.`);
    commandInputRef.current?.focus();
  };

  return (
    <div className="diary-container">
      <div className="diary-terminal">
        <div className="terminal-header">
          <div className="terminal-title">
            <span className="title-text">MiD Terminal</span>
            <span className="title-status">● Online</span>
          </div>
          <div className="terminal-user">
            <span className="user-name">{user?.username || "User"}</span>
            <button
              onClick={() => {
                logout();
                navigate("/MiD/Home");
              }}
              className="logout-btn"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <div className="terminal-body">
          <div className="terminal-history" ref={historyEndRef}>
            {history.map((entry, idx) => {
              // Skip empty messages
              if (!entry.message && entry.type === "user") return null;
              return (
                <div key={idx} className={`history-entry ${entry.type}`}>
                  <span className="history-speaker">
                    {entry.speaker}
                    <ChevronRight size={14} />
                  </span>
                  <span className="history-message">{entry.message}</span>
                </div>
              );
            })}

            {memories.length > 0 && (
              <div className="memories-section">
                <div className="section-header">
                  <span>MiD</span>
                  <ChevronRight size={14} />
                  <span>Your Memories ({memories.length})</span>
                </div>
                <div
                  className={`memories-grid ${
                    memories.some((m) => m.type === "image")
                      ? "memories-grid--photo"
                      : ""
                  }`}
                >
                  {memories.map((memory) => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      onEdit={handleEdit}
                      onDelete={(id) => {
                        handleDelete({
                          type: "delete",
                          target: "memory",
                          id,
                        });
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="history-entry system">
                <Loader2 size={14} className="spinner" />
                <span>Loading...</span>
              </div>
            )}

            {error && (
              <div className="history-entry error">
                <span className="history-speaker">MiD</span>
                <ChevronRight size={14} />
                <span className="history-message">Error: {error}</span>
              </div>
            )}

            {/* Inline command input - appears as part of history */}
            <div className="terminal-input-inline">
              <div className="input-prompt">
                <span className="prompt-text">
                  {user?.username || "User"}
                  <ChevronRight size={16} />
                </span>
                <input
                  ref={commandInputRef}
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder=""
                  className="command-input-inline"
                  autoFocus
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyDiary;
