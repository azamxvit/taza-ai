// Loads environment variables: server/.env first (secrets live here), then a
// root .env as a fallback. Imported first by every server entry point.
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, ".env"), quiet: true });
dotenv.config({ path: path.join(here, "..", ".env"), quiet: true });
