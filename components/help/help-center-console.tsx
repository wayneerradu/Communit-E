"use client";

import { useEffect, useMemo, useState } from "react";
import { GlobalSearch } from "@/components/shared/global-search";
import type { GlobalSearchItem, HelpArticle, HelpForumThread, HelpForumThreadStatus, HelpForumThreadType, SessionUser } from "@/types/domain";

function parseInstructionLines(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function matchesQuery(article: HelpArticle, query: string) {
  if (!query) return true;
  const haystack = [
    article.topic,
    article.module,
    article.page,
    article.category,
    article.instructions,
    ...(article.keywords ?? [])
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function HelpCenterConsole({
  articles,
  currentUser,
  initialCategory,
  initialQuery
}: {
  articles: HelpArticle[];
  currentUser: SessionUser | null;
  initialCategory?: string;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState((initialQuery ?? "").trim().toLowerCase());
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [forumSearch, setForumSearch] = useState("");
  const [threads, setThreads] = useState<HelpForumThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [forumMessage, setForumMessage] = useState<string | null>(null);
  const [isForumBusy, setIsForumBusy] = useState(false);
  const [isForumLoading, setIsForumLoading] = useState(true);
  const moduleOptions = useMemo(() => Array.from(new Set(articles.map((item) => item.module))).sort((left, right) => left.localeCompare(right)), [articles]);
  const [newThreadModule, setNewThreadModule] = useState(moduleOptions[0] ?? "General");
  const pageOptions = useMemo(
    () =>
      Array.from(
        new Set(
          articles
            .filter((item) => item.module === newThreadModule)
            .map((item) => item.page)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [articles, newThreadModule]
  );
  const [newThreadPage, setNewThreadPage] = useState(pageOptions[0] ?? "General");
  const [newThreadType, setNewThreadType] = useState<HelpForumThreadType>("question");
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadBody, setNewThreadBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const hasForumAccess = Boolean(currentUser && (currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN"));

  const filteredArticles = useMemo(
    () => articles.filter((article) => matchesQuery(article, query)),
    [articles, query]
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, HelpArticle[]>();
    filteredArticles.forEach((article) => {
      const key = article.module;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(article);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredArticles]);

  const sopSearchItems = useMemo<GlobalSearchItem[]>(
    () =>
      articles.map((article) => ({
        id: article.id,
        title: article.topic,
        subtitle: `${article.module} • ${article.page}`,
        kind: "settings",
        keywords: [article.module, article.page, article.category, article.instructions, ...(article.keywords ?? [])]
      })),
    [articles]
  );

  const filteredThreads = useMemo(() => {
    const search = forumSearch.trim().toLowerCase();
    if (!search) {
      return threads;
    }
    return threads.filter((thread) =>
      [thread.title, thread.module, thread.page, thread.type, thread.status, thread.createdByName, ...(thread.tags ?? []), ...thread.comments.map((item) => item.body)]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [forumSearch, threads]);

  const selectedThread = useMemo(() => filteredThreads.find((item) => item.id === selectedThreadId) ?? filteredThreads[0] ?? null, [filteredThreads, selectedThreadId]);
  const forumSearchItems = useMemo<GlobalSearchItem[]>(
    () =>
      threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        subtitle: `${thread.module} • ${thread.page} • ${thread.status}`,
        kind: "communication",
        keywords: [
          thread.module,
          thread.page,
          thread.type,
          thread.status,
          thread.createdByName,
          ...(thread.tags ?? []),
          ...thread.comments.map((comment) => comment.body)
        ]
      })),
    [threads]
  );

  async function loadThreads() {
    if (!hasForumAccess) {
      setIsForumLoading(false);
      return;
    }
    setIsForumLoading(true);
    setForumMessage(null);
    try {
      const response = await fetch("/api/help/forum", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to load help forum.");
      }
      const items = (payload.items ?? []) as HelpForumThread[];
      setThreads(items);
      if (items.length > 0 && !items.some((item) => item.id === selectedThreadId)) {
        setSelectedThreadId(items[0].id);
      }
    } catch (error) {
      setForumMessage(error instanceof Error ? error.message : "Unable to load help forum.");
    } finally {
      setIsForumLoading(false);
    }
  }

  useEffect(() => {
    void loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasForumAccess]);

  useEffect(() => {
    if (moduleOptions.length > 0 && !moduleOptions.includes(newThreadModule)) {
      setNewThreadModule(moduleOptions[0]);
    }
  }, [moduleOptions, newThreadModule]);

  useEffect(() => {
    if (pageOptions.length > 0 && !pageOptions.includes(newThreadPage)) {
      setNewThreadPage(pageOptions[0]);
    }
  }, [newThreadPage, pageOptions]);

  async function handleCreateThread() {
    if (!hasForumAccess || !newThreadTitle.trim() || !newThreadBody.trim()) {
      return;
    }

    setIsForumBusy(true);
    setForumMessage(null);
    try {
      const response = await fetch("/api/help/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: newThreadModule,
          page: newThreadPage,
          title: newThreadTitle,
          type: newThreadType,
          body: newThreadBody
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to create forum thread.");
      }
      setNewThreadTitle("");
      setNewThreadBody("");
      setForumMessage("Thread posted to Help Forum.");
      await loadThreads();
      setSelectedThreadId(payload.item.id);
    } catch (error) {
      setForumMessage(error instanceof Error ? error.message : "Unable to create forum thread.");
    } finally {
      setIsForumBusy(false);
    }
  }

  async function handleReply() {
    if (!hasForumAccess || !selectedThread || !replyBody.trim()) {
      return;
    }

    setIsForumBusy(true);
    setForumMessage(null);
    try {
      const response = await fetch(`/api/help/forum/${selectedThread.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to post reply.");
      }
      setReplyBody("");
      setForumMessage("Reply posted.");
      await loadThreads();
      setSelectedThreadId(selectedThread.id);
    } catch (error) {
      setForumMessage(error instanceof Error ? error.message : "Unable to post reply.");
    } finally {
      setIsForumBusy(false);
    }
  }

  async function handleStatusUpdate(status: HelpForumThreadStatus) {
    if (!isSuperAdmin || !selectedThread) {
      return;
    }

    setIsForumBusy(true);
    setForumMessage(null);
    try {
      const response = await fetch(`/api/help/forum/${selectedThread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to update status.");
      }
      setForumMessage("Thread status updated.");
      await loadThreads();
      setSelectedThreadId(selectedThread.id);
    } catch (error) {
      setForumMessage(error instanceof Error ? error.message : "Unable to update status.");
    } finally {
      setIsForumBusy(false);
    }
  }

  async function handleDeleteThread() {
    if (!isSuperAdmin || !selectedThread) {
      return;
    }

    setIsForumBusy(true);
    setForumMessage(null);
    try {
      const response = await fetch(`/api/help/forum/${selectedThread.id}`, {
        method: "DELETE"
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to delete thread.");
      }
      setForumMessage("Thread deleted by moderator.");
      setSelectedThreadId("");
      await loadThreads();
    } catch (error) {
      setForumMessage(error instanceof Error ? error.message : "Unable to delete thread.");
    } finally {
      setIsForumBusy(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!isSuperAdmin || !selectedThread) {
      return;
    }

    setIsForumBusy(true);
    setForumMessage(null);
    try {
      const response = await fetch(`/api/help/forum/${selectedThread.id}/comments/${commentId}`, {
        method: "DELETE"
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to delete comment.");
      }
      setForumMessage("Comment removed by moderator.");
      await loadThreads();
      setSelectedThreadId(selectedThread.id);
    } catch (error) {
      setForumMessage(error instanceof Error ? error.message : "Unable to delete comment.");
    } finally {
      setIsForumBusy(false);
    }
  }

  function getStatusTone(status: HelpForumThreadStatus) {
    if (status === "implemented") return "success";
    if (status === "closed") return "default";
    if (status === "answered") return "warning";
    return "danger";
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Help Center</h1>
          <p>Search and expand SOPs by module and page.</p>
        </div>
      </header>

      <section className="surface-panel">
        <div className="section-header">
          <div>
            <h2>{initialCategory ? `${initialCategory} SOPs` : "All SOPs"}</h2>
            <p>{query ? `${filteredArticles.length} result(s) found.` : "Expand a module to view menu/page SOPs."}</p>
          </div>
          <div className="dashboard-actions">
            <GlobalSearch
              items={sopSearchItems}
              placeholder="Search SOPs by module, page, workflow, or keyword..."
              onQueryChange={(value) => setQuery(value.toLowerCase())}
              onItemSelect={(item) => setQuery(`${item.title} ${item.subtitle}`.toLowerCase())}
            />
          </div>
        </div>

        <div className="dashboard-stack">
          {grouped.map(([module, moduleArticles]) => (
            <details key={module} className="help-module" open={activeModule === module}>
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  setActiveModule((current) => (current === module ? null : module));
                  setActivePageId(null);
                }}
              >
                <span>{module}</span>
                <span className="tag">{moduleArticles.length} page(s)</span>
              </summary>
              <div className="help-module-body">
                {moduleArticles
                  .sort((a, b) => a.page.localeCompare(b.page))
                  .map((article) => (
                    <details key={article.id} className="help-page" open={activePageId === article.id}>
                      <summary
                        onClick={(event) => {
                          event.preventDefault();
                          setActivePageId((current) => (current === article.id ? null : article.id));
                        }}
                      >
                        <span>{article.page}</span>
                        <span className="tag">{article.topic}</span>
                      </summary>
                      <article className="panel-card">
                        <div className="meta-row">
                          <span className="tag">Category: {article.category}</span>
                          {(article.keywords ?? []).slice(0, 4).map((keyword) => (
                            <span key={keyword} className="tag">
                              {keyword}
                            </span>
                          ))}
                        </div>
                        <div className="help-instructions">
                          {parseInstructionLines(article.instructions).map((line, index) => (
                            <p key={`${article.id}-line-${index}`}>{line}</p>
                          ))}
                        </div>
                      </article>
                    </details>
                  ))}
              </div>
            </details>
          ))}

          {grouped.length === 0 ? (
            <article className="panel-card">
              <div className="panel-head">
                <h3>No matching SOP found</h3>
              </div>
              <p>Try words like fault queue, residents map, project reporting, approvals, overdue, or escalation.</p>
            </article>
          ) : null}
        </div>
      </section>

      <section className="surface-panel">
        <div className="section-header">
          <div>
            <h2>Help Forum</h2>
            <p>Admins can post questions or change requests. Super admins can moderate, answer, and mark implementation status.</p>
          </div>
          <div className="dashboard-actions">
            <GlobalSearch
              items={forumSearchItems}
              placeholder="Search forum by title, module, status, or comment..."
              onQueryChange={(value) => setForumSearch(value)}
              onItemSelect={(item) => {
                setForumSearch(`${item.title} ${item.subtitle}`);
                setSelectedThreadId(item.id);
              }}
            />
            <button className="button-secondary" type="button" onClick={() => void loadThreads()} disabled={!hasForumAccess || isForumLoading}>
              Refresh
            </button>
          </div>
        </div>

        {!hasForumAccess ? (
          <article className="panel-card">
            <div className="panel-head">
              <h3>Forum access unavailable</h3>
            </div>
            <p>You need to be logged in as an admin or super admin to use the Help Forum.</p>
          </article>
        ) : null}

        {hasForumAccess ? (
          <div className="help-forum-layout">
            <article className="panel-card help-forum-create">
              <div className="panel-head">
                <h3>Post A Question Or Change</h3>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Module</span>
                  <select className="native-select" value={newThreadModule} onChange={(event) => setNewThreadModule(event.target.value)}>
                    {moduleOptions.map((module) => (
                      <option key={module} value={module}>
                        {module}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Page</span>
                  <select className="native-select" value={newThreadPage} onChange={(event) => setNewThreadPage(event.target.value)}>
                    {pageOptions.map((page) => (
                      <option key={page} value={page}>
                        {page}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Thread Type</span>
                  <select className="native-select" value={newThreadType} onChange={(event) => setNewThreadType(event.target.value as HelpForumThreadType)}>
                    <option value="question">Question</option>
                    <option value="change-request">Change Request</option>
                  </select>
                </label>
                <label className="field">
                  <span>Title</span>
                  <input value={newThreadTitle} onChange={(event) => setNewThreadTitle(event.target.value)} placeholder="What do you need help with?" />
                </label>
              </div>
              <label className="field">
                <span>Details</span>
                <textarea value={newThreadBody} onChange={(event) => setNewThreadBody(event.target.value)} rows={4} placeholder="Describe the issue, what you expected, and what should be changed." />
              </label>
              <div className="dashboard-actions">
                <button className="button-primary" type="button" onClick={() => void handleCreateThread()} disabled={isForumBusy || !newThreadTitle.trim() || !newThreadBody.trim()}>
                  Post To Forum
                </button>
              </div>
            </article>

            <article className="panel-card help-forum-threads">
              <div className="panel-head">
                <h3>Thread List</h3>
              </div>
              <p>{isForumLoading ? "Loading forum threads..." : `${filteredThreads.length} thread(s) found`}</p>
              <div className="dashboard-stack help-forum-thread-list">
                {filteredThreads.map((thread) => (
                  <button key={thread.id} type="button" className={`help-forum-thread-item${selectedThread?.id === thread.id ? " active" : ""}`} onClick={() => setSelectedThreadId(thread.id)}>
                    <strong>{thread.title}</strong>
                    <span>{thread.module} / {thread.page}</span>
                    <div className="meta-row">
                      <span className={`status-chip status-chip-${getStatusTone(thread.status)}`}>{thread.status}</span>
                      <span className="tag">{thread.type === "question" ? "Question" : "Change request"}</span>
                      <span className="tag">{thread.comments.length} comment(s)</span>
                    </div>
                  </button>
                ))}
                {!isForumLoading && filteredThreads.length === 0 ? <p>No forum threads match this search yet.</p> : null}
              </div>
            </article>

            <article className="panel-card help-forum-detail">
              <div className="panel-head">
                <h3>{selectedThread ? selectedThread.title : "Select a forum thread"}</h3>
                {selectedThread ? (
                  <div className="dashboard-actions-row">
                    <span className={`status-chip status-chip-${getStatusTone(selectedThread.status)}`}>{selectedThread.status}</span>
                    <span className="tag">{selectedThread.module} / {selectedThread.page}</span>
                  </div>
                ) : null}
              </div>

              {selectedThread ? (
                <>
                  <p>Opened by {selectedThread.createdByName} ({selectedThread.createdByEmail})</p>
                  <div className="dashboard-stack help-forum-comments">
                    {selectedThread.comments.map((comment) => (
                      <article key={comment.id} className="help-forum-comment">
                        <div className="meta-row">
                          <span className="tag">{comment.authorName}</span>
                          <span className="tag">{comment.authorRole}</span>
                          <span className="tag">{new Date(comment.createdAt).toLocaleString()}</span>
                          {comment.editedAt ? <span className="tag">Edited</span> : null}
                          {isSuperAdmin ? (
                            <button className="button-secondary help-forum-delete-button" type="button" onClick={() => void handleDeleteComment(comment.id)} disabled={isForumBusy}>
                              Delete
                            </button>
                          ) : null}
                        </div>
                        <p>{comment.body}</p>
                      </article>
                    ))}
                  </div>

                  <label className="field">
                    <span>Reply</span>
                    <textarea value={replyBody} onChange={(event) => setReplyBody(event.target.value)} rows={3} placeholder="Post a reply, guidance, or implementation update." />
                  </label>
                  <div className="dashboard-actions">
                    <button className="button-primary" type="button" onClick={() => void handleReply()} disabled={isForumBusy || !replyBody.trim()}>
                      Post Reply
                    </button>
                    {isSuperAdmin ? (
                      <select className="native-select" value={selectedThread.status} onChange={(event) => void handleStatusUpdate(event.target.value as HelpForumThreadStatus)} disabled={isForumBusy}>
                        <option value="open">Open</option>
                        <option value="answered">Answered</option>
                        <option value="implemented">Implemented</option>
                        <option value="closed">Closed</option>
                      </select>
                    ) : null}
                    {isSuperAdmin ? (
                      <button className="button-secondary help-forum-delete-button" type="button" onClick={() => void handleDeleteThread()} disabled={isForumBusy}>
                        Delete Thread
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <p>Select a thread from the list to view comments and moderate or reply.</p>
              )}
            </article>
          </div>
        ) : null}

        {forumMessage ? <p className="form-hint">{forumMessage}</p> : null}
      </section>
    </>
  );
}
