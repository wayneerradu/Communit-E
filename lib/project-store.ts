import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { queueDbJsonStoreWrite, readDbJsonStore } from "@/lib/db-json-store";
import { projects as seedProjects } from "@/lib/demo-data";
import type { Project } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const projectsFile = path.join(dataDir, "projects.json");
const projectsDbKey = "projects";
let projectsCache: Project[] | null = null;
let projectsHydrationStarted = false;

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
  if (!projectsHydrationStarted) {
    projectsHydrationStarted = true;
    void readDbJsonStore<Project[]>(projectsDbKey).then((items) => {
      if (items) {
        projectsCache = items;
      }
    });
  }
  if (projectsCache) {
    return projectsCache;
  }
  return readJsonFile<Project[]>(projectsFile, seedProjects);
}

export function writeProjectsStore(projects: Project[]) {
  projectsCache = projects;
  writeJsonFile(projectsFile, projects);
  queueDbJsonStoreWrite(projectsDbKey, projects);
}
