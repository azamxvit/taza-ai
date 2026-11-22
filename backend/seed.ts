// CLI for demo data in a real database (Atlas):
//   npm run seed            add 12 demo reports (skips if they already exist)
//   npm run seed -- --reset remove old demo reports and add fresh ones
//   npm run seed -- --remove remove demo reports only
// With the in-memory dev database the server seeds itself on start, so this is not needed locally.
import "./env.ts";
import { removeDemo, seedDemo } from "./seed/index.ts";

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set: the in-memory dev DB is seeded automatically by `npm run dev`.");
  process.exit(1);
}

const args = process.argv.slice(2);
try {
  if (args.includes("--remove")) {
    console.log(`Removed ${await removeDemo()} demo reports.`);
  } else {
    const added = await seedDemo({ reset: args.includes("--reset") });
    console.log(added ? `Added ${added} demo reports.` : "Demo reports already exist (use --reset to recreate).");
  }
  process.exit(0);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
