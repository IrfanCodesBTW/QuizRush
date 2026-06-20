import { EventEmitter } from "node:events";
import Redis from "ioredis";

type HashValue = object;
type StreamEntry = { id: string; fields: Record<string, string> };
type PubSubHandler = (channel: string, payload: string) => void;

export interface ValkeyStore {
  mode: "valkey" | "memory";
  hset(key: string, values: HashValue): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  zadd(key: string, score: number, member: string): Promise<void>;
  zincrby(key: string, increment: number, member: string): Promise<number>;
  zrevrangeWithScores(key: string, start: number, stop: number): Promise<Array<{ member: string; score: number }>>;
  xadd(key: string, fields: Record<string, string>): Promise<string>;
  xrevrange(key: string, count: number): Promise<StreamEntry[]>;
  expire(key: string, seconds: number): Promise<void>;
  publish(channel: string, payload: string): Promise<void>;
  subscribe(pattern: string, handler: PubSubHandler): Promise<() => Promise<void>>;
}

function cleanHash(values: HashValue) {
  return Object.fromEntries(
    Object.entries(values as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

class RedisValkeyStore implements ValkeyStore {
  mode = "valkey" as const;

  constructor(private readonly redis: Redis) {}

  async hset(key: string, values: HashValue) {
    const clean = cleanHash(values);
    if (Object.keys(clean).length > 0) {
      await this.redis.hset(key, clean);
    }
  }

  async hgetall(key: string) {
    return this.redis.hgetall(key);
  }

  async hincrby(key: string, field: string, increment: number) {
    return this.redis.hincrby(key, field, increment);
  }

  async sadd(key: string, ...members: string[]) {
    return this.redis.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]) {
    return this.redis.srem(key, ...members);
  }

  async smembers(key: string) {
    return this.redis.smembers(key);
  }

  async zadd(key: string, score: number, member: string) {
    await this.redis.zadd(key, score, member);
  }

  async zincrby(key: string, increment: number, member: string) {
    const score = await this.redis.zincrby(key, increment, member);
    return Number(score);
  }

  async zrevrangeWithScores(key: string, start: number, stop: number) {
    const rows = await this.redis.zrevrange(key, start, stop, "WITHSCORES");
    const entries: Array<{ member: string; score: number }> = [];

    for (let index = 0; index < rows.length; index += 2) {
      entries.push({ member: rows[index], score: Number(rows[index + 1] ?? 0) });
    }

    return entries;
  }

  async xadd(key: string, fields: Record<string, string>) {
    const args = Object.entries(fields).flat();
    const id = await this.redis.xadd(key, "*", ...args);
    return id ?? `${Date.now()}-0`;
  }

  async xrevrange(key: string, count: number) {
    const rows = await this.redis.xrevrange(key, "+", "-", "COUNT", count);
    return rows.map(([id, pairs]) => {
      const fields: Record<string, string> = {};
      for (let index = 0; index < pairs.length; index += 2) {
        fields[pairs[index]] = pairs[index + 1] ?? "";
      }
      return { id, fields };
    });
  }

  async expire(key: string, seconds: number) {
    await this.redis.expire(key, seconds);
  }

  async publish(channel: string, payload: string) {
    await this.redis.publish(channel, payload);
  }

  async subscribe(pattern: string, handler: PubSubHandler) {
    const subscriber = this.redis.duplicate();
    await subscriber.psubscribe(pattern);
    subscriber.on("pmessage", (_pattern, channel, message) => handler(channel, message));
    return async () => {
      await subscriber.punsubscribe(pattern);
      subscriber.disconnect();
    };
  }
}

class MemoryValkeyStore implements ValkeyStore {
  mode = "memory" as const;
  private hashes = new Map<string, Map<string, string>>();
  private sets = new Map<string, Set<string>>();
  private sortedSets = new Map<string, Map<string, number>>();
  private streams = new Map<string, StreamEntry[]>();
  private expirations = new Map<string, number>();
  private emitter = new EventEmitter();
  private sequence = 0;

  private sweep(key?: string) {
    const now = Date.now();
    const keys = key ? [key] : Array.from(this.expirations.keys());
    for (const currentKey of keys) {
      const expiresAt = this.expirations.get(currentKey);
      if (expiresAt && expiresAt <= now) {
        this.hashes.delete(currentKey);
        this.sets.delete(currentKey);
        this.sortedSets.delete(currentKey);
        this.streams.delete(currentKey);
        this.expirations.delete(currentKey);
      }
    }
  }

  async hset(key: string, values: HashValue) {
    this.sweep(key);
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    for (const [field, value] of Object.entries(cleanHash(values))) {
      hash.set(field, value);
    }
    this.hashes.set(key, hash);
  }

  async hgetall(key: string) {
    this.sweep(key);
    return Object.fromEntries(this.hashes.get(key)?.entries() ?? []);
  }

  async hincrby(key: string, field: string, increment: number) {
    this.sweep(key);
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    const value = Number(hash.get(field) ?? 0) + increment;
    hash.set(field, String(value));
    this.hashes.set(key, hash);
    return value;
  }

  async sadd(key: string, ...members: string[]) {
    this.sweep(key);
    const set = this.sets.get(key) ?? new Set<string>();
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        added += 1;
      }
      set.add(member);
    }
    this.sets.set(key, set);
    return added;
  }

  async srem(key: string, ...members: string[]) {
    this.sweep(key);
    const set = this.sets.get(key) ?? new Set<string>();
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed += 1;
      }
    }
    return removed;
  }

  async smembers(key: string) {
    this.sweep(key);
    return Array.from(this.sets.get(key) ?? []);
  }

  async zadd(key: string, score: number, member: string) {
    this.sweep(key);
    const set = this.sortedSets.get(key) ?? new Map<string, number>();
    set.set(member, score);
    this.sortedSets.set(key, set);
  }

  async zincrby(key: string, increment: number, member: string) {
    this.sweep(key);
    const set = this.sortedSets.get(key) ?? new Map<string, number>();
    const score = (set.get(member) ?? 0) + increment;
    set.set(member, score);
    this.sortedSets.set(key, set);
    return score;
  }

  async zrevrangeWithScores(key: string, start: number, stop: number) {
    this.sweep(key);
    const entries = Array.from(this.sortedSets.get(key)?.entries() ?? [])
      .sort((a, b) => b[1] - a[1])
      .map(([member, score]) => ({ member, score }));

    const end = stop < 0 ? entries.length : stop + 1;
    return entries.slice(start, end);
  }

  async xadd(key: string, fields: Record<string, string>) {
    this.sweep(key);
    this.sequence += 1;
    const id = `${Date.now()}-${this.sequence}`;
    const stream = this.streams.get(key) ?? [];
    stream.push({ id, fields });
    this.streams.set(key, stream);
    return id;
  }

  async xrevrange(key: string, count: number) {
    this.sweep(key);
    return [...(this.streams.get(key) ?? [])].reverse().slice(0, count);
  }

  async expire(key: string, seconds: number) {
    this.expirations.set(key, Date.now() + seconds * 1000);
  }

  async publish(channel: string, payload: string) {
    this.emitter.emit(channel, channel, payload);
    this.emitter.emit("*", channel, payload);
  }

  async subscribe(pattern: string, handler: PubSubHandler) {
    const listener = (channel: string, payload: string) => {
      if (pattern.endsWith("*") && channel.startsWith(pattern.slice(0, -1))) {
        handler(channel, payload);
      } else if (pattern === channel) {
        handler(channel, payload);
      }
    };

    this.emitter.on("*", listener);
    return async () => {
      this.emitter.off("*", listener);
    };
  }
}

const globalForValkey = globalThis as typeof globalThis & {
  quizRushValkey?: ValkeyStore;
};

export function getValkeyStore(): ValkeyStore {
  if (globalForValkey.quizRushValkey) {
    return globalForValkey.quizRushValkey;
  }

  const url = process.env.VALKEY_URL;

  if (url) {
    const redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });

    redis.on("error", (error) => {
      console.warn("[QuizRush] Valkey connection issue, check VALKEY_URL:", error.message);
    });

    globalForValkey.quizRushValkey = new RedisValkeyStore(redis);
  } else {
    globalForValkey.quizRushValkey = new MemoryValkeyStore();
  }

  return globalForValkey.quizRushValkey;
}
