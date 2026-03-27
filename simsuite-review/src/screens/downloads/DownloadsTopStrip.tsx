import { RefreshCw, ShieldAlert } from "lucide-react";
import type { UserView } from "../../lib/types";

interface DownloadsTopStripProps {
  statusMessage: string | null;
  errorMessage: string | null;
  totalItems: number;
  readyCount: number;
  waitingCount: number;
  blockedCount: number;
  lastCheckLabel: string;
  isRefreshing: boolean;
  isLoading: boolean;
  reviewActionLabel: string;
  /** Controls pill density: "power" keeps all chips; "beginner"/"standard" get compact + hover drawer */
  userView: UserView;
  onRefresh: () => void;
  onOpenReview: () => void;
}

export function DownloadsTopStrip({
  statusMessage,
  errorMessage,
  totalItems,
  readyCount,
  waitingCount,
  blockedCount,
  lastCheckLabel,
  isRefreshing,
  isLoading,
  reviewActionLabel,
  userView,
  onRefresh,
  onOpenReview,
}: DownloadsTopStripProps) {
  /* Creator: show full 4-chip status — they want system transparency */
  const showFullPills = userView === "power";

  return (
    <div className="slim-strip downloads-top-strip">
      <div className="slim-strip-group">
        {statusMessage ? (
          <span className="health-chip is-warn">{statusMessage}</span>
        ) : errorMessage ? (
          <span className="health-chip is-danger">{errorMessage}</span>
        ) : showFullPills ? (
          /* Creator: all four status pills always visible */
          <>
            <span className="health-chip is-good">
              <span className="health-chip-dot" />
              {totalItems.toLocaleString()} items
            </span>
            <span className="health-chip">{readyCount.toLocaleString()} ready</span>
            <span className={`health-chip${waitingCount > 0 ? " is-warn" : ""}`}>
              {waitingCount.toLocaleString()} waiting
            </span>
            <span className={`health-chip${blockedCount > 0 ? " is-danger" : ""}`}>
              {blockedCount.toLocaleString()} blocked
            </span>
          </>
        ) : (
          /* Casual / Seasoned: compact summary pill — full breakdown on hover/focus */
          <div
            className="status-summary-trigger"
            tabIndex={0}
            aria-label={`${totalItems} total items: ${readyCount} ready, ${waitingCount} waiting, ${blockedCount} blocked. Click or tab to expand.`}
            role="button"
          >
            <span className="health-chip is-good">
              <span className="health-chip-dot" />
              {totalItems.toLocaleString()} items
            </span>
            {/* Tooltip drawer — shown on hover or focus-within (keyboard accessible) */}
            <div className="status-summary-tooltip" aria-hidden="true">
              <span className="health-chip">{readyCount.toLocaleString()} ready</span>
              <span className={`health-chip${waitingCount > 0 ? " is-warn" : ""}`}>
                {waitingCount.toLocaleString()} waiting
              </span>
              <span className={`health-chip${blockedCount > 0 ? " is-danger" : ""}`}>
                {blockedCount.toLocaleString()} blocked
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="slim-strip-group">
        <span className="ghost-chip">{lastCheckLabel}</span>
        <button
          type="button"
          className="secondary-action"
          onClick={onRefresh}
          disabled={isRefreshing || isLoading}
        >
          <RefreshCw size={14} strokeWidth={2} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
        <button
          type="button"
          className="secondary-action"
          onClick={onOpenReview}
        >
          <ShieldAlert size={14} strokeWidth={2} />
          {reviewActionLabel}
        </button>
      </div>
    </div>
  );
}
