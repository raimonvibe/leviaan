import "dotenv/config";
import { createApp } from "./app.js";
import { initSchema } from "./db.js";

const port = Number(process.env.PORT) || 3000;

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL is required in production");
  }
  await initSchema();
  createApp().listen(port, () => {
    console.log(`Leviaan Campus API listening on ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
