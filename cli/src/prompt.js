import readline from "node:readline";

export function ask(question, { input = process.stdin, output = process.stdout } = {}) {
  const rl = readline.createInterface({ input, output });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function askYesNo(question, options) {
  const answer = (await ask(`${question} [y/N] `, options)).trim().toLowerCase();
  return answer === "y" || answer === "yes";
}

export function readSecret(prompt, { input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("A secure password prompt requires an interactive terminal");
  }

  return new Promise((resolve, reject) => {
    let secret = "";
    const mask = process.env.MID_ASCII ? "*" : "\u2022";
    const wasRaw = input.isRaw;
    output.write(prompt);
    input.setEncoding("utf8");
    input.setRawMode(true);
    input.resume();

    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(Boolean(wasRaw));
      if (!wasRaw) input.pause();
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          output.write("\n");
          cleanup();
          const error = new Error("Cancelled");
          error.code = "MID_CANCELLED";
          reject(error);
          return;
        }
        if (character === "\r" || character === "\n") {
          output.write("\n");
          cleanup();
          resolve(secret);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (secret.length > 0) {
            secret = secret.slice(0, -1);
            output.write("\b \b");
          }
          continue;
        }
        if (character >= " ") {
          secret += character;
          output.write(mask);
        }
      }
    };

    input.on("data", onData);
  });
}

export async function requestNewPassword(options) {
  const first = await readSecret("Create a master password (12+ characters): ", options);
  if (first.length < 12) throw new Error("The master password must contain at least 12 characters");
  const second = await readSecret("Confirm master password: ", options);
  if (first !== second) throw new Error("The passwords do not match");
  return first;
}
