import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getSessionSecret,
  getSocketUrl,
  getValkeyUrl,
  validateProductionEnvironment,
  valkeyConfigFingerprint,
} from "@/server/config/env";

const strongSecret = "same-production-secret-for-every-node-123456789";
const workerPath = path.resolve("tests/fixtures/session-process.ts");

function runWorker(action: "sign" | "verify", secret: string, token?: string) {
  return execFileSync(process.execPath, ["--import", "tsx", workerPath, action, ...(token ? [token] : [])], {
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "production",
      SESSION_SECRET: secret,
    },
  }).trim();
}

describe("production environment validation", () => {
  it("rejects missing or weak production session secrets", () => {
    expect(() => getSessionSecret({ NODE_ENV: "production" })).toThrow("SESSION_SECRET is required");
    expect(() => getSessionSecret({ NODE_ENV: "production", SESSION_SECRET: "too-short" })).toThrow(
      "at least 32 characters",
    );
  });

  it("rejects missing shared Valkey and Socket.IO configuration", () => {
    expect(() => getValkeyUrl({ NODE_ENV: "production" })).toThrow("VALKEY_URL is required");
    expect(() => getSocketUrl({ NODE_ENV: "production" })).toThrow("NEXT_PUBLIC_SOCKET_URL is required");
    expect(() =>
      validateProductionEnvironment({ NODE_ENV: "production", SESSION_SECRET: strongSecret }),
    ).toThrow("VALKEY_URL is required");
  });

  it("accepts complete production configuration and creates stable fingerprints", () => {
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      SESSION_SECRET: strongSecret,
      VALKEY_URL: "rediss://user:password@valkey.example.com:6379",
      NEXT_PUBLIC_SOCKET_URL: "https://realtime.quizrush.example",
    };
    expect(() => validateProductionEnvironment(env)).not.toThrow();
    expect(valkeyConfigFingerprint(env)).toBe(valkeyConfigFingerprint({ ...env }));
  });
});

describe("cross-process sessions", () => {
  it("verifies a token on a separate node when the secret matches", () => {
    const token = runWorker("sign", strongSecret);
    const verified = JSON.parse(runWorker("verify", strongSecret, token));
    expect(verified).toMatchObject({ playerId: "cross-node-player", username: "LoadBalancerTest" });
  });

  it("rejects a token on a separate node when the secret differs", () => {
    const token = runWorker("sign", strongSecret);
    expect(JSON.parse(runWorker("verify", `${strongSecret}-different`, token))).toBeNull();
  });
});
