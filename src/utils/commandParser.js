// Command Parser for MiD CLI Interface
// Parses natural language commands into structured operations

export class CommandParser {
  static parse(command) {
    const cmd = command.trim().toLowerCase();
    const parts = cmd.split(/\s+/);

    // Create memory commands
    if (cmd.startsWith("create memory")) {
      return this.parseCreateMemory(command);
    }

    // Create table
    if (cmd.startsWith("create table")) {
      return this.parseCreateTable(command);
    }

    // Create list
    if (cmd.startsWith("create list")) {
      return this.parseCreateList(command);
    }

    // Create timeline
    if (cmd.startsWith("create timeline")) {
      return this.parseCreateTimeline(command);
    }

    // Save picture/image
    if (cmd.startsWith("save picture") || cmd.startsWith("save image")) {
      return { type: "save_picture", command: command };
    }

    // Edit commands
    if (cmd.startsWith("edit memory") || cmd.startsWith("update memory")) {
      return this.parseEditMemory(command);
    }

    // Delete commands
    if (
      cmd.startsWith("delete all") ||
      cmd.startsWith("delete memory") ||
      cmd.startsWith("delete picture") ||
      cmd.startsWith("delete memories")
    ) {
      return this.parseDelete(command);
    }

    // Search/Retrieve commands
    if (
      cmd.startsWith("mother,") ||
      cmd.startsWith("show") ||
      cmd.startsWith("bring up") ||
      cmd.startsWith("list") ||
      cmd.startsWith("search")
    ) {
      return this.parseRetrieve(command);
    }

    // Help command
    if (cmd === "help" || cmd === "?" || cmd.startsWith("help")) {
      return { type: "help" };
    }

    // Clear command
    if (cmd === "clear" || cmd === "cls") {
      return { type: "clear" };
    }

    // Check if it looks like a command (starts with command keywords)
    const commandKeywords = [
      "create",
      "save",
      "edit",
      "delete",
      "show",
      "bring",
      "list",
      "search",
      "mother",
      "update",
      "retrieve",
    ];
    const firstWord = parts[0];

    if (commandKeywords.includes(firstWord)) {
      // Looks like a command but wasn't recognized - check if it's a malformed command
      // If it starts with a command keyword but doesn't match any pattern, it's unknown
      if (
        firstWord === "create" &&
        !cmd.match(/create\s+(memory|table|list|timeline)/)
      ) {
        return { type: "unknown", command: command };
      }
      if (firstWord === "save" && !cmd.match(/save\s+(picture|image)/)) {
        return { type: "unknown", command: command };
      }
      if (firstWord === "edit" && !cmd.match(/edit\s+memory/)) {
        return { type: "unknown", command: command };
      }
      if (
        firstWord === "delete" &&
        !cmd.match(/delete\s+(memory|picture|image)/)
      ) {
        return { type: "unknown", command: command };
      }
      // Other command keywords that don't match patterns
      if (
        [
          "show",
          "bring",
          "list",
          "search",
          "mother",
          "update",
          "retrieve",
        ].includes(firstWord)
      ) {
        // These need specific patterns - if not matched above, they're unknown
        return { type: "unknown", command: command };
      }
    }

    // Any unrecognized input is treated as unknown command
    return { type: "unknown", command: command };
  }

  static parseCreateMemory(command) {
    const result = {
      type: "create_memory",
      content: "",
      category: null,
      tags: [],
    };

    console.log("DEBUG parseCreateMemory - input command:", command);

    // Step 1: Extract content from quotes (highest priority)
    const contentMatch = command.match(/["']([^"']+)["']/);
    if (contentMatch) {
      result.content = contentMatch[1];
      console.log("✅ DEBUG - content from quotes:", result.content);
    } else {
      // Step 2: Fallback - content after "create memory :"
      const colonMatch = command.match(/create memory\s*:\s*(.+)/i);
      if (colonMatch) {
        let content = colonMatch[1].trim();
        // Remove tags and category portions from the content
        content = content.replace(/\s*(?:with\s+)?tags:\s*[^"]+/i, "").trim();
        content = content.replace(/\s*(?:in\s+)?category:\s*\w+/i, "").trim();
        result.content = content;
        console.log(
          "✅ DEBUG - content from colonMatch fallback:",
          result.content
        );
      }
    }

    // Step 2: Extract category - support both "in category: X" and "category: X"
    const categoryMatch = command.match(/(?:in\s+)?category:\s*(\w+)/i);
    if (categoryMatch) {
      result.category = categoryMatch[1];
      console.log("✅ DEBUG - category found:", result.category);
    }

    // Step 3: Extract tags
    // Pattern 1: "tags: tag1, tag2, tag3" - words separated by commas
    let tagsMatch = command.match(
      /(?:with\s+)?tags:\s*([^"category]+?)(?=\s*(?:in\s+)?category:|["']|$)/i
    );

    if (tagsMatch && tagsMatch[1]) {
      const tagsStr = tagsMatch[1].trim();
      console.log("✅ DEBUG - tags raw match:", tagsStr);
      result.tags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t && t.length > 0);
      console.log("✅ DEBUG - tags extracted (pattern 1):", result.tags);
    }

    // Pattern 2: hashtag syntax #tag1 #tag2
    if (result.tags.length === 0) {
      const hashTags = command.match(/#(\w+)/g);
      if (hashTags) {
        result.tags = hashTags.map((t) => t.replace("#", ""));
        console.log("✅ DEBUG - hashtags extracted (pattern 2):", result.tags);
      }
    }

    // If still no tags, log it
    if (result.tags.length === 0) {
      console.log("ℹ️ DEBUG - no tags found");
    }

    console.log("✅ DEBUG parseCreateMemory - final result:", {
      type: result.type,
      content: result.content?.substring(0, 50),
      category: result.category,
      tagsCount: result.tags.length,
      tags: result.tags,
    });
    return result;
  }

  static parseCreateTable(command) {
    const lines = command.split("\n");
    const result = {
      type: "create_table",
      columns: [],
      rows: [],
    };

    let inRows = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("columns:")) {
        const cols = trimmed.replace("columns:", "").trim();
        result.columns = cols.split(",").map((c) => c.trim());
      } else if (trimmed.startsWith("rows:") || trimmed.startsWith("-")) {
        inRows = true;
        if (trimmed.startsWith("-")) {
          const row = trimmed.replace("-", "").trim();
          result.rows.push(row.split(",").map((c) => c.trim()));
        }
      } else if (inRows && trimmed) {
        if (trimmed.startsWith("-")) {
          const row = trimmed.replace("-", "").trim();
          result.rows.push(row.split(",").map((c) => c.trim()));
        }
      }
    }

    return result;
  }

  static parseCreateList(command) {
    const lines = command.split("\n");
    const result = {
      type: "create_list",
      items: [],
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
        result.items.push(trimmed.replace(/^[-•]\s*/, "").trim());
      }
    }

    return result;
  }

  static parseCreateTimeline(command) {
    const lines = command.split("\n");
    const result = {
      type: "create_timeline",
      events: [],
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("-")) {
        const event = trimmed.replace("-", "").trim();
        const timeMatch = event.match(/^(\d{1,2}:\d{2})\s+(.+)/);
        if (timeMatch) {
          result.events.push({
            time: timeMatch[1],
            description: timeMatch[2],
          });
        } else {
          result.events.push({
            time: "",
            description: event,
          });
        }
      }
    }

    return result;
  }

  static parseEditMemory(command) {
    // Accept alphanumeric IDs (Firestore doc ids) as well as numeric
    const idMatch = command.match(/#([A-Za-z0-9_-]+)/);
    const result = {
      type: "edit_memory",
      // Keep id as string so it matches Firestore doc IDs
      id: idMatch ? idMatch[1] : null,
      updates: {},
    };

    if (command.includes("add:")) {
      const addMatch = command.match(/add:\s*["']([^"']+)["']/);
      if (addMatch) {
        result.updates.add = addMatch[1];
      }
    } else {
      const contentMatch = command.match(/["']([^"']+)["']|:\s*(.+)$/);
      if (contentMatch) {
        result.updates.content = contentMatch[1] || contentMatch[2];
      }
    }

    return result;
  }

  static parseDelete(command) {
    const cmd = command.toLowerCase();
    // Accept alphanumeric IDs as well
    const idMatch = command.match(/#([A-Za-z0-9_-]+)/);
    const typeMatch = command.match(/(memory|picture|image)/);

    const result = {
      type: "delete",
      target: typeMatch ? typeMatch[1] : "memory",
      id: idMatch ? idMatch[1] : null,
      deleteAll: false,
      filters: {},
    };

    // Check for "delete all" or "delete all memories"
    if (cmd.includes("delete all")) {
      result.deleteAll = true;
    }

    // Check for tag-based deletion: "delete memories tags: work" or "delete memories #work"
    const tagsMatch = command.match(
      /(?:tagged|tags|tag)\s*:\s*["']?([^"'.]+)["']?/i
    );
    if (tagsMatch) {
      result.filters.tags = tagsMatch[1]
        .split(",")
        .map((t) => t.trim().replace(/["']/g, ""))
        .filter((t) => t);
    } else {
      const hashTags = command.match(/#(\w+)/g);
      if (hashTags && !idMatch) {
        result.filters.tags = hashTags.map((t) => t.replace("#", ""));
      }
    }

    // Check for category-based deletion: "delete memories category: happy"
    const categoryMatch = command.match(
      /(?:in\s+)?category\s*:\s*["']?(\w+)["']?/i
    );
    if (categoryMatch) {
      result.filters.category = categoryMatch[1];
    }

    return result;
  }

  static parseRetrieve(command) {
    const result = {
      type: "retrieve",
      filters: {},
    };

    // Extract tags - support "tagged: tag1, tag2" or "tags: tag1" or "tag: tagname"
    // Allow spaces around colon
    const tagsMatch = command.match(
      /(?:tagged|tags|tag)\s*:\s*["']?([^"'.]+)["']?/i
    );
    if (tagsMatch) {
      result.filters.tags = tagsMatch[1]
        .split(",")
        .map((t) => t.trim().replace(/["']/g, ""))
        .filter((t) => t);
    } else {
      // Check for hashtag syntax: #tag1 #tag2
      const hashTags = command.match(/#(\w+)/g);
      if (hashTags) {
        result.filters.tags = hashTags.map((t) => t.replace("#", ""));
      }
    }

    // Extract category - support "category: happy" or "in category: happy"
    // Allow spaces around colon
    const categoryMatch = command.match(
      /(?:in\s+)?category\s*:\s*["']?(\w+)["']?/i
    );
    if (categoryMatch) {
      result.filters.category = categoryMatch[1];
    } else {
      // Also support mood-based categories like "show happy moments"
      const moodMatch = command.match(
        /(happy|sad|angry|excited|calm|anxious|work|personal|ideas)\s+(?:moments|memories)/i
      );
      if (moodMatch) {
        result.filters.category = moodMatch[1];
      }
    }

    // Extract date
    const dateMatch = command.match(/from:\s*([^.]+)/i);
    if (dateMatch) {
      result.filters.date = dateMatch[1].trim();
    }

    // Extract search term
    const searchMatch = command.match(
      /containing:\s*([^.]+)|search:\s*["']([^"']+)["']/i
    );
    if (searchMatch) {
      result.filters.search = searchMatch[1] || searchMatch[2];
    }

    // Check for specific requests
    if (command.includes("first memory")) {
      result.filters.first = true;
    }
    if (command.includes("all tables")) {
      result.filters.type = "table";
    }
    if (command.includes("pictures") || command.includes("images")) {
      result.filters.type = "image";
    }

    return result;
  }
}

export default CommandParser;
