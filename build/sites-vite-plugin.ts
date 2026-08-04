import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

// Packages Sites metadata and migrations after Vite finishes compiling.
export function sites(): Plugin {
  let root = process.cwd();

  return {
    name: "sites",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      const outputDirectory = resolve(root, "dist", ".openai");
      const workerConfig = resolve(root, "dist", "server", "wrangler.json");
      const hostingConfig = resolve(root, ".openai", "hosting.json");
      const drizzleSource = resolve(root, "drizzle");

      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });

      if (await exists(hostingConfig)) {
        await cp(hostingConfig, resolve(outputDirectory, "hosting.json"));
      }
      if (await exists(drizzleSource)) {
        await cp(drizzleSource, resolve(outputDirectory, "drizzle"), {
          recursive: true,
        });
      }

      // Sites resolves current Workers defaults during deployment. Omitting
      // this generated key avoids sending a redundant nodejs_compat flag on
      // dates where the runtime already enables it by default.
      if (await exists(workerConfig)) {
        const parsed = JSON.parse(await readFile(workerConfig, "utf8")) as Record<
          string,
          unknown
        >;
        delete parsed.compatibility_flags;
        await writeFile(workerConfig, JSON.stringify(parsed));
      }
    },
  };
}
