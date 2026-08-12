const colorEnabled = process.stdout.isTTY && !process.env.NO_COLOR;
const asciiOnly = Boolean(process.env.MID_ASCII);
const code = (number, text) => colorEnabled ? `\u001b[${number}m${text}\u001b[0m` : text;

export const ui = {
  // ANSI 256-color orange stays consistent across CMD, PowerShell, and Unix terminals.
  orange: (text) => code("38;5;208", text),
  green: (text) => code(32, text),
  yellow: (text) => code(33, text),
  magenta: (text) => code(35, text),
  red: (text) => code(31, text),
  dim: (text) => code(2, text),
  bold: (text) => code(1, text),
};

function visibleLength(text) {
  return String(text).replace(/\u001b\[[0-9;]*m/g, "").length;
}

function wrap(text, width) {
  const result = [];
  for (const sourceLine of String(text).split("\n")) {
    const words = sourceLine.split(/\s+/);
    let line = "";
    for (const word of words) {
      if (!word) continue;
      if (!line) line = word;
      else if (line.length + word.length + 1 <= width) line += ` ${word}`;
      else {
        result.push(line);
        line = word;
      }
    }
    result.push(line);
  }
  return result.length ? result : [""];
}

export function panel(title, lines, { width = 72, accent = ui.orange } = {}) {
  const safeWidth = Math.max(36, Math.min(100, width));
  const chars = asciiOnly
    ? { tl: "+", tr: "+", bl: "+", br: "+", h: "-", v: "|" }
    : { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" };
  const label = title ? ` ${title} ` : "";
  const topFill = Math.max(0, safeWidth - visibleLength(label) - 2);
  const output = [`${accent(chars.tl)}${accent(label)}${accent(chars.h.repeat(topFill))}${accent(chars.tr)}`];
  for (const raw of lines.flatMap((line) => wrap(line, safeWidth - 4))) {
    const padding = Math.max(0, safeWidth - visibleLength(raw) - 3);
    output.push(`${accent(chars.v)} ${raw}${" ".repeat(padding)}${accent(chars.v)}`);
  }
  output.push(`${accent(chars.bl)}${accent(chars.h.repeat(safeWidth - 2))}${accent(chars.br)}`);
  return output.join("\n");
}

export function banner() {
  if (asciiOnly) return `${ui.orange("[ MiD ]")}\n${ui.dim("My Individual Diary")}`;
  return [
    ui.orange("███╗   ███╗██╗██████╗ "),
    ui.orange("████╗ ████║██║██╔══██╗"),
    ui.orange("██╔████╔██║██║██║  ██║"),
    ui.orange("██║╚██╔╝██║██║██║  ██║"),
    ui.orange("██║ ╚═╝ ██║██║██████╔╝"),
    ui.dim("My Individual Diary"),
  ].join("\n");
}

export function formatEntry(entry, { full = false, width = 72 } = {}) {
  const id = entry.id.slice(0, 8);
  const dateValue = entry.createdAt || entry.created_at;
  const date = dateValue ? new Date(dateValue).toLocaleString() : "unknown date";
  const metadata = [entry.category ? `@${entry.category}` : null, ...(entry.tags || []).map((tag) => `#${tag}`)]
    .filter(Boolean)
    .join(" ");
  const value = entry.content || entry.description || "";
  const content = full || value.length <= 240 ? value : `${value.slice(0, 237)}...`;
  const lines = [content || ui.dim("(empty memory)"), `${ui.dim(date)}${metadata ? `  ${ui.yellow(metadata)}` : ""}`];
  return panel(`MEM ${ui.bold(id)}`, lines, { width });
}

export function formatImageCard(image, { width = 72 } = {}) {
  const id = image.id.slice(0, 8);
  const date = image.created_at ? new Date(image.created_at).toLocaleString() : "unknown date";
  const tags = (image.tags || []).map((tag) => `#${tag}`).join(" ");
  return panel(`IMG ${ui.bold(id)}`, [
    image.description || ui.dim("(no caption)"),
    `${ui.dim(date)}${tags ? `  ${ui.yellow(tags)}` : ""}`,
  ], { width, accent: ui.orange });
}

export function aboutText() {
  return `${banner()}\n\n${panel("ABOUT MiD", [
    "MiD means My Individual Diary. It is your personal place for keeping thoughts, moments, ideas, achievements, and pictures from the command line.",
    "Your library follows your account. Sign in on another computer and your memories and images are there waiting for you.",
    "Use simple commands such as add, show, search, and image add. Type help whenever you want examples.",
    "Say hello mother after signing in to talk with Mother, your personal AI companion. Mother can help you reflect and can find or save memories when you ask.",
    "MiD signs you out when you exit and never saves your account password or session token on the computer.",
    "Created for people who want a calm, focused home for the moments they do not want to forget.",
  ])}`;
}

export function helpText() {
  return `${banner()}

Getting started:
  register [username]              Create your personal MiD account
  login [username]                 Sign in for this MiD session
  logout                           Sign out without closing MiD
  status                           See which account is currently signed in

Memories:
  add "memory"                     Save a new memory
  list                             Show your newest memories
  show <id>                        Open one memory using its short ID
  show --tags me                   Show memories tagged "me"
  show #me                         A shorter way to filter by a tag
  search "words"                   Find text in your library
  edit <id> "new text"             Update a memory
  delete <id>                      Delete after asking for confirmation

Images:
  image add <path>                 Upload a picture to your library
  image list                       List your uploaded pictures
  image show <id>                  Display a picture inside the terminal
  image open <id>                  Open the clear original in the system viewer
  image setup                      Set up sharp inline image support
  image show <id> --open           Open it in the computer's image viewer too
  image delete <id>                Delete after confirmation
  Sharp inline photos require WezTerm, Kitty, Ghostty, iTerm2, or a compatible
  terminal. CMD and Windows Terminal use a character preview plus image open.
  Windows install: winget install wez.wezterm

Account and system:
  passwd                           Change your MiD account password
  forgot password [username]      Renew a forgotten password using recovery answers
  stats                            Count your memories, images, and tags
  about                            Read a friendly introduction to MiD
  help                             Show this guide
  clear                            Clean the terminal screen
  exit                             Sign out and close MiD
  me admin                         Request admin mode (authorized staff only)

Mother AI:
  hello mother                    Start a private Mother conversation
  /exit                            Return from Mother to normal MiD commands
  clear | /clear                   Clear the screen and current Mother chat
  goodbye mother                  End the current Mother conversation
  Say "call me your son/daughter/child" to change Mother's form of address.
  Mother can chat, answer general questions, search the live web, search your
  memories, save a memory when clearly asked, and summarize your library.
  She cannot access another user's library. Say "don't check my memories"
  whenever you want an answer based only on general knowledge or the web.

Options (add these after a command):
  --category <name>                Organize or filter memories by a section
                                    Example: add "Meeting" --category work
  --tags <a,b,c>                   Add or match several labels
                                    Example: show --tags family,holiday
  --tag <name>                     Match one label; same idea as --tags
  --limit <number>                 Show only this many results
                                    Example: list --limit 10
  --width <number>                 Choose terminal card/image width (12-120)
  --mono                           Draw an image without terminal colors
  --open                           Also open an image in the normal viewer
  --yes                            Confirm a delete/admin action automatically
  --help                           Show help without opening MiD
  --version                        Show the installed MiD version

Advanced and recovery:
  connect <https://server/api>     Use a different trusted MiD server
  sync                             Upload old local memories to your account
  --local                          Work with a legacy offline vault
  --vault <path>                   Select that legacy vault's file location
  doctor                           Explain how this device handles sessions

Tips:
  IDs may be shortened to the first unique characters shown by list.
  If an online command is taking too long, press Ctrl+C to cancel only that
  command and return safely to the MiD prompt.`;
}
