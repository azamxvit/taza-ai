import "./env.ts";
import dns from "node:dns";
import { MongoClient, ObjectId, type Collection, type Db, type Document } from "mongodb";
import type { ReportDoc } from "./types.ts";

// Workaround: on some systems Node's default resolver refuses the MongoDB
// Atlas SRV lookup (querySrv ECONNREFUSED). Force public resolvers.
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  /* non-fatal */
}

const DB_NAME = process.env.MONGODB_DB || "tazaai";
const isProd = process.env.NODE_ENV === "production";

let client: MongoClient | undefined;
let db: Db | undefined;
let connecting: Promise<Db> | null = null;

// Taza AI: in local dev without MONGODB_URI we start a throwaway in-memory
// MongoDB (mongodb-memory-server) so `npm run dev` works before Atlas is set up.
async function resolveUri(): Promise<string> {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  if (isProd) throw new Error("MONGODB_URI is not configured");
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mem = await MongoMemoryServer.create();
  console.warn("[db] MONGODB_URI not set → using in-memory MongoDB (dev only, data is temporary)");
  return mem.getUri();
}

/** Cached connection — connects once, reused by all requests. */
export async function getDb(): Promise<Db> {
  if (db) return db;
  connecting ??= (async () => {
    const uri = await resolveUri();
    client = new MongoClient(uri);
    await client.connect();
    const database = client.db(DB_NAME);
    await database.collection("reports").createIndex({ createdAt: -1 });
    console.log(`[db] Connected to MongoDB database "${DB_NAME}"`);
    db = database;
    return database;
  })().catch((err: unknown) => {
    connecting = null;
    throw err;
  });
  return connecting;
}

export async function getCollection<T extends Document>(name: string): Promise<Collection<T>> {
  return (await getDb()).collection<T>(name);
}

export function getReportsCollection(): Promise<Collection<ReportDoc>> {
  return getCollection<ReportDoc>("reports");
}

export function toObjectId(id: string): ObjectId {
  return ObjectId.createFromHexString(id);
}

/** Health check used by /api/health. */
export async function pingDb(): Promise<boolean> {
  await getDb();
  await client!.db().admin().ping();
  return true;
}
