import "dotenv/config";
import dns from "dns";
import { MongoClient, ObjectId } from "mongodb";

// Workaround: on some systems Node's default resolver refuses the MongoDB
// Atlas SRV lookup (querySrv ECONNREFUSED). Force public resolvers.
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  /* non-fatal */
}

const URI = process.env.MONGODB_URI;
// Database name (the URI above has no DB, so we name it explicitly).
const DB_NAME = process.env.MONGODB_DB || "cleancity";

if (!URI) {
  console.warn(
    "[db] MONGODB_URI is not set. Report endpoints will fail until it is configured."
  );
}

let client;
let db;

// Cached connection — connects once, reuses for all requests.
export async function getDb() {
  if (db) return db;
  if (!URI) throw new Error("MONGODB_URI is not configured");
  client = new MongoClient(URI);
  await client.connect();
  db = client.db(DB_NAME);
  // Ensure a useful index for listing (newest first).
  await db.collection("reports").createIndex({ createdAt: -1 });
  console.log(`[db] Connected to MongoDB database "${DB_NAME}"`);
  return db;
}

export async function getReportsCollection() {
  const database = await getDb();
  return database.collection("reports");
}

export function toObjectId(id) {
  return ObjectId.createFromHexString(id);
}

// Health check used by /api/health.
export async function pingDb() {
  if (!client) await getDb();
  await client.db().admin().ping();
  return true;
}
