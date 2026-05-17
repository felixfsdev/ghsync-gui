import { spawn } from "child_process";
import * as fs from "fs";

/**
 *
 * @param args
 * @param cwd
 * @param pat optional, only required for commands that require authentication
 * @returns stdout
 */
export async function runGitCommand(
  args: string[],
  cwd: string,
  pat?: string,
): Promise<string> {
  // Create cwd if it doesn't exist
  try {
    if (!fs.existsSync(cwd)) {
      fs.mkdirSync(cwd, { recursive: true });
    }
  } catch (error: any) {
    throw new Error(`Failed to create workspace directory: ${error.message}`);
  }

  return new Promise((resolve, reject) => {
    let child;
    if (pat === undefined) {
      child = spawn("git", args, { cwd });
    } else {
      const basicAuth = Buffer.from(`x-access-token:${pat}`).toString("base64");

      child = spawn(
        "git",
        ["-c", `http.extraHeader=Authorization: Basic ${basicAuth}`, ...args],
        { cwd },
      );
    }

    let stdoutData = "";
    let stderrData = "";

    child.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdoutData.trim());
      } else {
        reject(
          new Error(
            stderrData.trim() || `Git command failed with exit code ${code}`,
          ),
        );
      }
    });
  });
}
