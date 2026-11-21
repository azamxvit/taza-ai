import "./env.js";
import dns from "dns";
import { MongoClient, ObjectId } from "mongodb";

// Workaround: on some systems Node's default resolver refuses the MongoDB
// Atlas SRV lookup (querySrv ECONNREFUSED). Force public resolvers.
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  /* non-fatal */
}

const DB_NAME = process.env.MONGODB_DB || "tazaai";
const isProd = process.env.NODE_ENV === "production";

let client;
let db;
let connecting;

// Resolve a connection string. Taza AI: in local dev without MONGODB_URI we
// start a throwaway in-memory MongoDB (mongodb-memory-server) so `npm run dev`
// works before Atlas is configured. Data is lost on restart — use `npm run seed`.
async function resolveUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  if (isProd) throw new Error("MONGODB_URI is not configured");
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mem = await MongoMemoryServer.create();
  global.__tazaMemoryMongo = mem;
  console.warn("[db] MONGODB_URI not set → using in-memory MongoDB (dev only, data is temporary)");
  return mem.getUri();
}

// Cached connection — connects once, reuses for all requests.
export async function getDb() {
  if (db) return db;
  if (!connecting) {
    connecting = (async () => {
      const uri = await resolveUri();
      client = new MongoClient(uri);
      await client.connect();
      const database = client.db(DB_NAME);
      await database.collection("reports").createIndex({ createdAt: -1 });
      console.log(`[db] Connected to MongoDB database "${DB_NAME}"`);
      db = database;
      return db;
    })().catch((err) => {
      connecting = null;
      throw err;
    });
  }
  return connecting;
}

export async function getCollection(name) {
  const database = await getDb();
  return database.collection(name);
}

export async function getReportsCollection() {
  return getCollection("reports");
}

export function toObjectId(id) {
  return ObjectId.createFromHexString(id);
}

// Health check used by /api/health.
export async function pingDb() {
  await getDb();
  await client.db().admin().ping();
  return true;
}
