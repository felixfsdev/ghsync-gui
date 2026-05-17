import { spawn } from "child_process";
import * as fs from "fs";

/**
 *
 * @param args
 * @param cwd
 * @returns stdout
 */
export async function runGitCommand(
  args: string[],
  cwd: string,
): Promise<string> {
  try {
    if (!fs.existsSync(cwd)) {
      fs.mkdirSync(cwd, { recursive: true });
    }
  } catch (error: any) {
    throw new Error(`Failed to create workspace directory: ${error.message}`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd });

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
