import { spawn } from "child_process";
import * as fs from "fs";

export async function runGitCommand(
  args: string[],
  cwd: string,
): Promise<{ success: boolean; message: string }> {
  // Ensure the absolute path exists before doing anything else
  try {
    if (!fs.existsSync(cwd)) {
      // recursive: true safely handles missing parent folders along the path
      fs.mkdirSync(cwd, { recursive: true });
    }
  } catch (fsError: any) {
    return {
      success: false,
      message: `Failed to create workspace directory: ${fsError.message}`,
    };
  }

  return new Promise((resolve) => {
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
      resolve({ success: false, message: error.message });
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, message: stdoutData.trim() });
      } else {
        resolve({
          success: false,
          message: stderrData.trim() || `Exit code ${code}`,
        });
      }
    });
  });
}
