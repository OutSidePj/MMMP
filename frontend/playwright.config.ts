import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:4178", trace: "on-first-retry" },
  webServer: [
    {
      command: "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000",
      cwd: "../backend",
      url: "http://127.0.0.1:8000/api/health",
      env: { MOCK_INFERENCE: "true", MOCK_DELAY_SECONDS: "0.5" },
      reuseExistingServer: true,
    },
    {
      command: "npm run dev -- --port 4178",
      url: "http://127.0.0.1:4178",
      reuseExistingServer: false,
    },
  ],
});
