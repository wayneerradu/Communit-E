import { formatCurrency, titleCase } from "@/lib/utils";
import type {
  DashboardCard,
  Fault,
  InfrastructureAsset,
  MeetingMinute,
  ParkingLotIdea,
  PRComm,
  Project,
  Resident,
  SocialCalendarItem,
  VaultAsset
} from "@/types/domain";

export function StatCards({ cards }: { cards: DashboardCard[] }) {
  return (
    <section className="stat-grid">
      {cards.map((card) => (
        <article key={card.label} className={`stat-card stat-card-${card.tone ?? "default"}`}>
          <p>{card.label}</p>
          <strong>{card.value}</strong>
          <span>{card.detail}</span>
        </article>
      ))}
    </section>
  );
}

export function FaultList({ items }: { items: Fault[] }) {
  return (
    <div className="panel-list">
      {items.map((fault) => (
        <article key={fault.id} className="panel-card">
          <div className="panel-head">
            <h3>{fault.title}</h3>
            <span className={`status-chip status-chip-${fault.priority}`}>{titleCase(fault.priority)}</span>
          </div>
          <p>{fault.description}</p>
          <div className="meta-row">
            <span>{titleCase(fault.status)}</span>
            <span>{titleCase(fault.category)}</span>
            <span>{fault.locationText}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ResidentList({ items }: { items: Resident[] }) {
  return (
    <div className="panel-list">
      {items.map((resident) => (
        <article key={resident.id} className="panel-card">
          <div className="panel-head">
            <h3>{resident.name}</h3>
            <span className={`status-chip status-chip-${resident.status}`}>{titleCase(resident.status)}</span>
          </div>
          <p>{resident.addressLine1 ?? "No address captured yet"}</p>
          <div className="meta-row">
            <span>{resident.standNo}</span>
            <span>{resident.ward ?? "Ward not set"}</span>
            <span>{resident.email ?? "No email"}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function MinutesList({ items }: { items: MeetingMinute[] }) {
  return (
    <div className="panel-list">
      {items.map((minute) => (
        <article key={minute.id} className="panel-card">
          <div className="panel-head">
            <h3>{minute.title}</h3>
            <span className="status-chip status-chip-default">{new Date(minute.meetingAt).toLocaleDateString("en-ZA")}</span>
          </div>
          <p>{minute.notes}</p>
          <div className="tag-row">
            {minute.attendees.map((attendee) => (
              <span key={attendee} className="tag">
                {attendee}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function AssetMapList({ items }: { items: InfrastructureAsset[] }) {
  return (
    <div className="panel-list">
      {items.map((asset) => (
        <article key={asset.id} className="panel-card">
          <div className="panel-head">
            <h3>{asset.assetName}</h3>
            <span className="status-chip status-chip-default">{titleCase(asset.assetType)}</span>
          </div>
          <p>{asset.condition}</p>
          <div className="meta-row">
            <span>{asset.street}</span>
            <span>
              {asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}
            </span>
            <span>{asset.photos.length} photo(s)</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ProjectList({ items }: { items: Project[] }) {
  return (
    <div className="panel-list">
      {items.map((project) => (
        <article key={project.id} className="panel-card">
          <div className="panel-head">
            <h3>{project.title}</h3>
            <span className={`status-chip status-chip-${project.status}`}>{titleCase(project.status)}</span>
          </div>
          <p>{project.description}</p>
          <div className="meta-row">
            <span>{project.budget ? formatCurrency(project.budget) : "Budget pending"}</span>
            <span>{project.timelineStart ?? "TBC"} to {project.timelineEnd ?? "TBC"}</span>
            <span>{project.tasks.length} task(s)</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ParkingLotList({ items }: { items: ParkingLotIdea[] }) {
  return (
    <div className="panel-list">
      {items.map((idea) => (
        <article key={idea.id} className="panel-card">
          <div className="panel-head">
            <h3>{idea.title}</h3>
            <span className={`status-chip status-chip-${idea.status}`}>{titleCase(idea.status)}</span>
          </div>
          <p>{idea.justification}</p>
          <div className="meta-row">
            <span>{idea.votes.length} votes</span>
            <span>{idea.threshold} threshold</span>
            <span>{titleCase(idea.priority)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function PRCommList({ items }: { items: PRComm[] }) {
  return (
    <div className="panel-list">
      {items.map((item) => (
        <article key={item.id} className="panel-card">
          <div className="panel-head">
            <h3>{item.headline}</h3>
            <span className={`status-chip status-chip-${item.status}`}>{titleCase(item.status)}</span>
          </div>
          <p>{item.body}</p>
          <div className="meta-row">
            <span>{titleCase(item.channel)}</span>
            <span>{item.appCount}/3 approvals</span>
            <span>{item.approvers.join(", ") || "No approvals yet"}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function SocialCalendarList({ items }: { items: SocialCalendarItem[] }) {
  return (
    <div className="panel-list">
      {items.map((item) => (
        <article key={item.id} className="panel-card">
          <div className="panel-head">
            <h3>{item.holidayName}</h3>
            <span className="status-chip status-chip-default">{new Date(item.date).toLocaleDateString("en-ZA")}</span>
          </div>
          <p>{item.postPlan}</p>
          <div className="meta-row">
            <span>{item.category}</span>
            <span>{item.mediaRef ?? "No media linked"}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function VaultList({ items }: { items: VaultAsset[] }) {
  return (
    <div className="panel-list">
      {items.map((item) => (
        <article key={item.id} className="panel-card">
          <div className="panel-head">
            <h3>{item.assetName}</h3>
            <span className="status-chip status-chip-default">{titleCase(item.visibility)}</span>
          </div>
          <p>{item.description}</p>
          <div className="meta-row">
            <span>{item.category}</span>
            <span>{item.filePath}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
