// Loads environment variables: backend/.env first (secrets live here), then a
// root .env as a fallback. Imported first by every backend entry point.
import dotenv from "dotenv";
import path from "node:path";

const here = import.meta.dirname;
dotenv.config({ path: path.join(here, ".env"), quiet: true });
dotenv.config({ path: path.join(here, "..", ".env"), quiet: true });
