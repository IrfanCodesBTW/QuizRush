import { createHash } from "node:crypto";

const developmentSessionSecret = "quizrush-development-session-secret-change-me";

type Environment = NodeJS.ProcessEnv;

function requiredProductionValue(env: Environment, name: string) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`[QuizRush] ${name} is required in production.`);
  }
  return value;
}

function parseUrl(value: string, name: string, protocols: string[]) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`[QuizRush] ${name} must be a valid URL.`);
  }

  if (!protocols.includes(parsed.protocol)) {
    throw new Error(`[QuizRush] ${name} must use ${protocols.join(" or ")}.`);
  }
  return value;
}

export function getSessionSecret(env: Environment = process.env) {
  const configured = env.SESSION_SECRET?.trim();
  if (configured) {
    if (env.NODE_ENV === "production" && configured.length < 32) {
      throw new Error("[QuizRush] SESSION_SECRET must contain at least 32 characters in production.");
    }
    return configured;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("[QuizRush] SESSION_SECRET is required in production.");
  }
  return developmentSessionSecret;
}

export function getValkeyUrl(env: Environment = process.env) {
  const configured = env.VALKEY_URL?.trim();
  if (!configured) {
    if (env.NODE_ENV === "production") {
      throw new Error("[QuizRush] VALKEY_URL is required in production; memory mode is development-only.");
    }
    return undefined;
  }
  return parseUrl(configured, "VALKEY_URL", ["redis:", "rediss:"]);
}

export function getSocketUrl(env: Environment = process.env) {
  const configured = env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!configured) {
    if (env.NODE_ENV === "production") {
      throw new Error("[QuizRush] NEXT_PUBLIC_SOCKET_URL is required in production.");
    }
    return undefined;
  }
  return parseUrl(configured, "NEXT_PUBLIC_SOCKET_URL", ["http:", "https:", "ws:", "wss:"]);
}

export function validateProductionEnvironment(env: Environment = process.env) {
  if (env.NODE_ENV !== "production" && !env.VERCEL_ENV) {
    return;
  }
  getSessionSecret({ ...env, NODE_ENV: "production" });
  getValkeyUrl({ ...env, NODE_ENV: "production" });
  getSocketUrl({ ...env, NODE_ENV: "production" });
}

export function valkeyConfigFingerprint(env: Environment = process.env) {
  const url = getValkeyUrl(env);
  if (!url) {
    return "development-memory";
  }
  return createHash("sha256").update(url).digest("hex").slice(0, 12);
}

export function getDeploymentReadiness(env: Environment = process.env) {
  return {
    sessionSecretConfigured: Boolean(env.SESSION_SECRET?.trim()),
    valkeyConfigured: Boolean(env.VALKEY_URL?.trim()),
    socketConfigured: Boolean(env.NEXT_PUBLIC_SOCKET_URL?.trim()),
    valkeyFingerprint: valkeyConfigFingerprint(env),
  };
}
