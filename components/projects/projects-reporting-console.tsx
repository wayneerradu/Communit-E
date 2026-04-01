"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import type { Project } from "@/types/domain";

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-");
}

export function ProjectsReportingConsole({ projects }: { projects: Project[] }) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  function exportPdf() {
    if (!selectedProject) return;
    const reportName = `${sanitizeFileName(selectedProject.projectRef ?? selectedProject.id)}-Report`;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const cardWidth = pageWidth - margin * 2;
    const bottomLimit = pageHeight - margin;
    let y = margin;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(214, 224, 225);
    doc.roundedRect(margin, y, cardWidth, pageHeight - margin * 2, 4, 4, "FD");
    y += 10;

    doc.setTextColor(16, 53, 58);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(selectedProject.title, margin + 8, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const descriptionLines = doc.splitTextToSize(selectedProject.description || "-", cardWidth - 16);
    doc.text(descriptionLines, margin + 8, y);
    y += descriptionLines.length * 5 + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Tasks", margin + 8, y);
    y += 6;

    if (selectedProject.tasks.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("No tasks captured for this project yet.", margin + 8, y);
    } else {
      selectedProject.tasks.forEach((task) => {
        const taskLines = doc.splitTextToSize(task.title, cardWidth - 24);
        const blockHeight = Math.max(8, taskLines.length * 5 + 4);

        if (y + blockHeight > bottomLimit) {
          doc.addPage();
          y = margin;
        }

        doc.setFillColor(251, 253, 253);
        doc.setDrawColor(225, 232, 233);
        doc.roundedRect(margin + 8, y - 4, cardWidth - 16, blockHeight, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(taskLines, margin + 12, y + 1);
        y += blockHeight + 3;
      });
    }

    doc.save(`${reportName}.pdf`);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Project Reporting</h1>
          <p>Select a project, review the stacked report view, then export to PDF.</p>
        </div>
      </header>

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Report Builder</h2>
              <p>Project report file name follows the unique project ID format.</p>
            </div>
            <button className="button-primary" type="button" disabled={!selectedProject} onClick={exportPdf}>
              Export PDF
            </button>
          </div>
          <div className="form-grid">
            <label className="field field-wide">
              <span>Select Project</span>
              <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </article>
      </section>

      {selectedProject ? (
        <section className="dashboard-feature-grid">
          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>{selectedProject.title}</h2>
                <p>{selectedProject.description}</p>
              </div>
              <span className={`status-chip status-chip-${selectedProject.status}`}>{selectedProject.status}</span>
            </div>
            <div className="meta-row">
              <span className="tag">Project Ref: {selectedProject.projectRef ?? selectedProject.id}</span>
              <span className="tag">Selected Admin: {selectedProject.assignedAdminName ?? "Not assigned"}</span>
              <span className="tag">Priority: {selectedProject.priority ?? "medium"}</span>
            </div>
            <div className="meta-row">
              <span className="tag">Start: {selectedProject.timelineStart ?? "Not set"}</span>
              <span className="tag">End Target: {selectedProject.timelineEnd ?? "Not set"}</span>
              <span className="tag">Updated: {selectedProject.updatedAt ? new Date(selectedProject.updatedAt).toLocaleString("en-ZA") : "Not set"}</span>
            </div>
          </article>

          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Tasks</h2>
                <p>Stacked task report for the selected project.</p>
              </div>
              <span className="status-chip status-chip-default">{selectedProject.tasks.length} task(s)</span>
            </div>
            <div className="dashboard-stack">
              {selectedProject.tasks.length > 0 ? (
                selectedProject.tasks.map((task) => (
                  <article key={task.id} className="dashboard-approval-card">
                    <div className="panel-head">
                      <div>
                        <h3>{task.title}</h3>
                        <p>{task.taskRef ?? task.id}</p>
                      </div>
                      <span className={`status-chip status-chip-${task.status === "blocked" ? "danger" : task.status === "done" ? "success" : "default"}`}>{task.status}</span>
                    </div>
                    <div className="meta-row">
                      <span className="tag">Owner: {task.assignee ?? "Not assigned"}</span>
                      <span className="tag">Due: {task.dueDate ?? "Not set"}</span>
                      <span className="tag">Updated: {task.updatedAt ? new Date(task.updatedAt).toLocaleString("en-ZA") : "Not set"}</span>
                    </div>
                  </article>
                ))
              ) : (
                <article className="dashboard-today-card">
                  <strong>No tasks captured for this project yet.</strong>
                </article>
              )}
            </div>
          </article>
        </section>
      ) : null}
    </>
  );
}
