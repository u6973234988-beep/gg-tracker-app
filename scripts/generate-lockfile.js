import { execSync } from "child_process"
import { existsSync } from "fs"

console.log("[v0] Generating fresh package-lock.json...")

if (!existsSync("/vercel/share/v0-project/package.json")) {
  console.error("[v0] package.json not found!")
  process.exit(1)
}

try {
  execSync("npm install --package-lock-only --legacy-peer-deps", {
    cwd: "/vercel/share/v0-project",
    stdio: "inherit",
  })
  console.log("[v0] package-lock.json generated successfully.")
} catch (err) {
  console.error("[v0] Failed to generate lock file:", err.message)
  process.exit(1)
}
