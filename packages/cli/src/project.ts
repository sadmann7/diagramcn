import { spawn } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export interface Project {
  cwd: string;
  /** Command prefix that runs a package without installing it. */
  dlx: string[];
  /** Command prefix that adds packages to the project. */
  install: string[];
  /** Root files the shadcn CLI reads to decide how to transform items. */
  configFiles: string[];
  /** Directories whose existence changes where files are written. */
  layoutDirs: string[];
}

const configFilePattern =
  /^(components\.json|package\.json|[jt]sconfig(\..+)?\.json|.+\.config\.(js|cjs|mjs|ts|mts|cts))$/;

async function exists(file: string) {
  return stat(file).then(
    () => true,
    () => false,
  );
}

async function getPackageManager(cwd: string) {
  if (await exists(path.join(cwd, "pnpm-lock.yaml"))) {
    return { dlx: ["pnpm", "dlx"], install: ["pnpm", "add"] };
  }
  if (
    (await exists(path.join(cwd, "bun.lock"))) ||
    (await exists(path.join(cwd, "bun.lockb")))
  ) {
    return { dlx: ["bunx"], install: ["bun", "add"] };
  }
  return { dlx: ["npx", "--yes"], install: ["npm", "install"] };
}

export async function loadProject(cwd: string): Promise<Project> {
  const componentsJsonPath = path.join(cwd, "components.json");
  if (!(await exists(componentsJsonPath))) {
    throw new Error(
      `No components.json in ${cwd}. Run this in a project set up with shadcn.`,
    );
  }

  const config = JSON.parse(await readFile(componentsJsonPath, "utf8")) as {
    tailwind?: { css?: string; config?: string };
  };

  const rootFiles = (await readdir(cwd)).filter((file) =>
    configFilePattern.test(file),
  );
  const extraFiles = [config.tailwind?.css, config.tailwind?.config].filter(
    (file): file is string => !!file,
  );

  const layoutDirs: string[] = [];
  for (const dir of ["src", "app", "src/app", "pages", "src/pages"]) {
    if (await exists(path.join(cwd, dir))) layoutDirs.push(dir);
  }

  return {
    cwd,
    ...(await getPackageManager(cwd)),
    configFiles: [...new Set([...rootFiles, ...extraFiles])],
    layoutDirs,
  };
}

/** Names of every package in the project's package.json. */
export async function readInstalled(cwd: string) {
  try {
    const pkg = JSON.parse(
      await readFile(path.join(cwd, "package.json"), "utf8"),
    ) as Record<string, unknown>;
    return new Set(
      ["dependencies", "devDependencies", "peerDependencies"].flatMap((key) =>
        Object.keys((pkg[key] as Record<string, string> | undefined) ?? {}),
      ),
    );
  } catch {
    return new Set<string>();
  }
}

function run(command: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const [bin, ...args] = command;
    if (!bin) throw new Error("Empty command");

    const child = spawn(bin, args, {
      cwd,
      stdio: ["ignore", "ignore", "pipe"],
      env: { ...process.env, CI: "1" },
    });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `${command.join(" ")} exited with ${code}${stderr ? `:\n${stderr.trim()}` : ""}`,
          ),
        );
      }
    });
  });
}

async function listFiles(dir: string, root = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "node_modules" ? [] : listFiles(full, root);
      }
      return [path.relative(root, full)];
    }),
  );
  return files.flat();
}

/**
 * Installs one exact version of an item into a throwaway copy of the
 * project's config and returns the files the shadcn CLI wrote, keyed by
 * project-relative path. Because the real CLI does the work, the output
 * matches what `shadcn add` writes in this project: same aliases, same
 * transforms, same paths.
 */
export async function renderVersion(project: Project, itemUrl: string) {
  const dir = await mkdtemp(path.join(tmpdir(), "diagramcn-"));

  try {
    for (const file of project.configFiles) {
      const source = path.join(project.cwd, file);
      if (!(await exists(source))) continue;
      await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
      await cp(source, path.join(dir, file));
    }
    for (const layoutDir of project.layoutDirs) {
      await mkdir(path.join(dir, layoutDir), { recursive: true });
    }

    const copied = new Set(await listFiles(dir));

    await run(
      [...project.dlx, "shadcn@latest", "add", itemUrl, "--yes", "--overwrite"],
      dir,
    );

    const files = new Map<string, string>();
    for (const file of await listFiles(dir)) {
      if (copied.has(file)) continue;
      files.set(file, await readFile(path.join(dir, file), "utf8"));
    }
    return files;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
