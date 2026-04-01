import type { SessionUser } from "@/types/domain";

function formatStatus(status?: SessionUser["status"]) {
  switch (status) {
    case "busy":
      return "Busy";
    case "dnd":
      return "DND";
    case "vacation":
      return "On Vacation";
    case "offline":
      return "Offline";
    default:
      return "Active";
  }
}

export function UserBadge({
  name,
  currentUser,
  compact = false
}: {
  name?: string;
  currentUser?: SessionUser | null;
  compact?: boolean;
}) {
  const safeName = name?.trim() || "Unassigned";
  const matchedUser = currentUser && safeName === currentUser.name ? currentUser : null;
  const initials = safeName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className={`user-badge${compact ? " user-badge-compact" : ""}`}>
      <div className="user-badge-avatar-shell">
        {matchedUser?.avatarImage ? (
          <img src={matchedUser.avatarImage} alt={`${safeName} avatar`} className="user-badge-avatar-image" />
        ) : (
          <div className="user-badge-avatar-placeholder">{initials || "NA"}</div>
        )}
      </div>
      <div className="user-badge-copy">
        <strong>{safeName}</strong>
        {matchedUser ? <span>{formatStatus(matchedUser.status)}</span> : null}
      </div>
    </div>
  );
}
