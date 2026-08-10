export function tokenize(line) {
  const tokens = [];
  let token = "";
  let quote = null;
  let escaped = false;

  for (const character of line.trim()) {
    if (escaped) {
      token += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
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

  if (escaped) token += "\\";
  if (quote) throw new Error("Unclosed quote");
  if (token) tokens.push(token);
  return tokens;
}

export function parseArguments(argv) {
  const positionals = [];
  const options = {};
  const booleanOptions = new Set(["help", "version", "yes", "local", "mono", "open"]);
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
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Option --${name} requires a value`);
    options[name] = next;
    index += 1;
  }
  return { positionals, options };
}
