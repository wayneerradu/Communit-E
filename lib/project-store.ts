import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { projects as seedProjects } from "@/lib/demo-data";
import type { Project } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const projectsFile = path.join(dataDir, "projects.json");

function ensureProjectsStoreFile<T>(filePath: string, seedData: T) {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${JSON.stringify(seedData, null, 2)}\n`, "utf8");
  }
}

function readJsonFile<T>(filePath: string, seedData: T): T {
  ensureProjectsStoreFile(filePath, seedData);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJsonFile<T>(filePath: string, value: T) {
  ensureProjectsStoreFile(filePath, value);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readProjectsStore() {
  return readJsonFile<Project[]>(projectsFile, seedProjects);
}

export function writeProjectsStore(projects: Project[]) {
  writeJsonFile(projectsFile, projects);
}
