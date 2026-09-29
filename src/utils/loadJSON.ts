import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Universal JSON file loader for Node.js / Serverless environments.
 * Uses path resolution with multiple fallback strategies to guarantee
 * file availability across local development, containerized builds,
 * and Vercel serverless functions (/var/task).
 */
export function loadJSON<T = any>(filePathOrRelative: string): T {
  // 1. Try resolving relative to current module directory if in ESM
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const candidatePath = path.resolve(__dirname, filePathOrRelative);
      if (fs.existsSync(candidatePath)) {
        const content = fs.readFileSync(candidatePath, "utf-8");
        return JSON.parse(content) as T;
      }
    }
  } catch (e) {
    // fallback to process.cwd
  }

  // 2. Try resolving relative to process.cwd()
  try {
    const candidatePath = path.resolve(process.cwd(), filePathOrRelative);
    if (fs.existsSync(candidatePath)) {
      const content = fs.readFileSync(candidatePath, "utf-8");
      return JSON.parse(content) as T;
    }
  } catch (e) {
    // fallback
  }

  // 3. Try standard relative path
  try {
    const content = fs.readFileSync(filePathOrRelative, "utf-8");
    return JSON.parse(content) as T;
  } catch (err: any) {
    throw new Error(`[loadJSON] Failed to read JSON file at '${filePathOrRelative}': ${err.message}`);
  }
}

export default loadJSON;
