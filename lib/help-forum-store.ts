import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { HelpForumComment, HelpForumThread, HelpForumThreadStatus, HelpForumThreadType, Role, SessionUser } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const helpForumFile = path.join(dataDir, "help-forum.json");

type HelpForumStore = {
  threads: HelpForumThread[];
};

type CreateThreadInput = {
  module: string;
  page: string;
  title: string;
  type: HelpForumThreadType;
  body: string;
  tags?: string[];
};

type CreateCommentInput = {
  body: string;
};

type UpdateCommentInput = {
  body: string;
};

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

function stripBom(content: string) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

function normalizeString(value?: string) {
  return (value ?? "").trim();
}

function normalizeTags(tags?: string[]) {
  return (tags ?? []).map((tag) => tag.trim()).filter(Boolean);
}

function normalizeComment(comment: HelpForumComment): HelpForumComment {
  return {
    ...comment,
    authorName: normalizeString(comment.authorName),
    authorEmail: normalizeString(comment.authorEmail).toLowerCase(),
    body: normalizeString(comment.body)
  };
}

function normalizeThread(thread: HelpForumThread): HelpForumThread {
  return {
    ...thread,
    module: normalizeString(thread.module),
    page: normalizeString(thread.page),
    title: normalizeString(thread.title),
    createdByName: normalizeString(thread.createdByName),
    createdByEmail: normalizeString(thread.createdByEmail).toLowerCase(),
    tags: normalizeTags(thread.tags),
    comments: (thread.comments ?? []).map(normalizeComment)
  };
}

function sortThreads(threads: HelpForumThread[]) {
  return [...threads].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

async function readHelpForumStore(): Promise<HelpForumStore> {
  await ensureDataDir();
  try {
    const content = await readFile(helpForumFile, "utf8");
    const normalized = stripBom(content).trim();
    if (!normalized) {
      return { threads: [] };
    }
    const parsed = JSON.parse(normalized) as HelpForumStore;
    return {
      threads: sortThreads((parsed.threads ?? []).map(normalizeThread))
    };
  } catch {
    return { threads: [] };
  }
}

async function writeHelpForumStore(store: HelpForumStore) {
  await ensureDataDir();
  await writeFile(helpForumFile, `${JSON.stringify({ threads: sortThreads(store.threads) }, null, 2)}\n`, "utf8");
}

export async function listHelpForumThreads() {
  const store = await readHelpForumStore();
  return store.threads;
}

export async function findHelpForumThread(threadId: string) {
  const threads = await listHelpForumThreads();
  return threads.find((thread) => thread.id === threadId) ?? null;
}

export async function createHelpForumThread(input: CreateThreadInput, actor: SessionUser) {
  const moduleName = normalizeString(input.module);
  const page = normalizeString(input.page);
  const title = normalizeString(input.title);
  const body = normalizeString(input.body);

  if (!moduleName || !page || !title || !body) {
    throw new Error("Module, page, title, and first comment are required.");
  }

  const now = new Date().toISOString();
  const threadId = randomUUID();
  const firstComment: HelpForumComment = {
    id: randomUUID(),
    authorName: actor.name,
    authorEmail: actor.email.toLowerCase(),
    authorRole: actor.role,
    body,
    createdAt: now
  };

  const thread: HelpForumThread = {
    id: threadId,
    module: moduleName,
    page,
    title,
    type: input.type,
    status: "open",
    createdByName: actor.name,
    createdByEmail: actor.email.toLowerCase(),
    createdAt: now,
    updatedAt: now,
    comments: [firstComment],
    tags: normalizeTags(input.tags)
  };

  const store = await readHelpForumStore();
  await writeHelpForumStore({ threads: [thread, ...store.threads] });
  return thread;
}

export async function addHelpForumComment(threadId: string, input: CreateCommentInput, actor: SessionUser) {
  const body = normalizeString(input.body);
  if (!body) {
    throw new Error("Comment text is required.");
  }

  const store = await readHelpForumStore();
  const now = new Date().toISOString();
  let updatedThread: HelpForumThread | null = null;

  const threads = store.threads.map((thread) => {
    if (thread.id !== threadId) {
      return thread;
    }

    const comment: HelpForumComment = {
      id: randomUUID(),
      authorName: actor.name,
      authorEmail: actor.email.toLowerCase(),
      authorRole: actor.role,
      body,
      createdAt: now
    };

    updatedThread = {
      ...thread,
      comments: [...thread.comments, comment],
      updatedAt: now
    };

    return updatedThread;
  });

  if (!updatedThread) {
    throw new Error("Thread not found.");
  }

  await writeHelpForumStore({ threads });
  return updatedThread;
}

export async function updateHelpForumThreadStatus(threadId: string, status: HelpForumThreadStatus) {
  const store = await readHelpForumStore();
  const now = new Date().toISOString();
  let updatedThread: HelpForumThread | null = null;

  const threads = store.threads.map((thread) => {
    if (thread.id !== threadId) {
      return thread;
    }

    updatedThread = {
      ...thread,
      status,
      updatedAt: now
    };
    return updatedThread;
  });

  if (!updatedThread) {
    throw new Error("Thread not found.");
  }

  await writeHelpForumStore({ threads });
  return updatedThread;
}

export async function deleteHelpForumThread(threadId: string) {
  const store = await readHelpForumStore();
  const before = store.threads.length;
  const threads = store.threads.filter((thread) => thread.id !== threadId);
  if (threads.length === before) {
    throw new Error("Thread not found.");
  }
  await writeHelpForumStore({ threads });
  return true;
}

export async function deleteHelpForumComment(threadId: string, commentId: string) {
  const store = await readHelpForumStore();
  const now = new Date().toISOString();
  let updatedThread: HelpForumThread | null = null;

  const threads = store.threads.map((thread) => {
    if (thread.id !== threadId) {
      return thread;
    }

    const nextComments = thread.comments.filter((comment) => comment.id !== commentId);
    if (nextComments.length === thread.comments.length) {
      throw new Error("Comment not found.");
    }

    updatedThread = {
      ...thread,
      comments: nextComments,
      updatedAt: now
    };
    return updatedThread;
  });

  if (!updatedThread) {
    throw new Error("Thread not found.");
  }

  await writeHelpForumStore({ threads });
  return updatedThread;
}

export async function updateHelpForumComment(threadId: string, commentId: string, input: UpdateCommentInput, actor: SessionUser) {
  const body = normalizeString(input.body);
  if (!body) {
    throw new Error("Comment text is required.");
  }

  const store = await readHelpForumStore();
  const now = new Date().toISOString();
  let updatedThread: HelpForumThread | null = null;

  const threads = store.threads.map((thread) => {
    if (thread.id !== threadId) {
      return thread;
    }

    const nextComments = thread.comments.map((comment) => {
      if (comment.id !== commentId) {
        return comment;
      }

      const canEdit = actor.role === "SUPER_ADMIN" || comment.authorEmail.toLowerCase() === actor.email.toLowerCase();
      if (!canEdit) {
        throw new Error("Only the author or a super admin can edit this comment.");
      }

      return {
        ...comment,
        body,
        editedAt: now
      };
    });

    updatedThread = {
      ...thread,
      comments: nextComments,
      updatedAt: now
    };
    return updatedThread;
  });

  if (!updatedThread) {
    throw new Error("Thread not found.");
  }

  await writeHelpForumStore({ threads });
  return updatedThread;
}

export function getSuperAdminTargetEmails() {
  const list = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(list));
}

export function canAccessHelpForum(role: Role) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
