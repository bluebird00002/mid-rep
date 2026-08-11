export function tokenize(line) {
  const tokens = [];
  let token = "";
  let quote = null;
  const source = line.trim();

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "\\") {
      const next = source[index + 1];
      // Preserve Windows path separators. Backslash is an escape only for a
      // quote inside matching quotes, or for whitespace/quotes outside them.
      if ((quote && next === quote) || (!quote && next && /[\s"']/.test(next))) {
        token += next;
        index += 1;
      } else token += character;
    } else if (quote) {
      if (character === quote) quote = null;
      else token += character;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (/\s/.test(character)) {
      if (token) {
        tokens.push(token);
        token = "";
      }
    } else {
      token += character;
    }
  }

  if (quote) throw new Error("Unclosed quote");
  if (token) tokens.push(token);
  return tokens;
}

export function parseArguments(argv) {
  const positionals = [];
  const options = {};
  const booleanOptions = new Set(["help", "version", "yes", "local", "mono", "open"]);
  const multiWordOptions = new Set(["description"]);
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }
    const name = value.slice(2);
    if (booleanOptions.has(name)) {
      options[name] = true;
      continue;
    }
    if (multiWordOptions.has(name)) {
      const words = [];
      while (argv[index + 1] && !argv[index + 1].startsWith("--")) {
        words.push(argv[index + 1]);
        index += 1;
      }
      if (words.length === 0) throw new Error(`Option --${name} requires a value`);
      options[name] = words.join(" ");
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Option --${name} requires a value`);
    options[name] = next;
    index += 1;
  }
  return { positionals, options };
}
