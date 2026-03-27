import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { apiDashboard } from '../api';
import ScoreBar from '../components/ScoreBar';
import { PriorityBadge } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { relativeTime, formatFullDate, scoreColor } from '../utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error } = useApi(apiDashboard, [], { immediate: true });

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const {
    contactsNeedingAttention = [],
    pendingFollowUps = [],
    discoveryQueueSize = 0,
    recentInteractions = [],
    weeklyStats = {},
  } = data;

  const today = formatFullDate(new Date().toISOString());

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">{today}</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/contacts')}>
              All Contacts
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/contacts?new=1')}>
              + New Contact
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <StatCard
          label="Needs Attention"
          value={contactsNeedingAttention.length}
          sub="contacts below score 40"
          colorClass={contactsNeedingAttention.length > 0 ? 'rose' : 'emerald'}
          onClick={() => {}}
        />
        <StatCard
          label="Discovery Queue"
          value={discoveryQueueSize}
          sub="pending review"
          colorClass={discoveryQueueSize > 0 ? 'accent' : 'emerald'}
          onClick={() => navigate('/discovery')}
        />
        <StatCard
          label="Follow-ups Due"
          value={pendingFollowUps.length}
          sub="pending follow-ups"
          colorClass={pendingFollowUps.length > 0 ? 'amber' : 'emerald'}
          onClick={() => navigate('/followups')}
        />
        <StatCard
          label="Contacts"
          value={weeklyStats.totalContacts || 0}
          sub={`${weeklyStats.contacts_created || 0} new this week`}
          colorClass=""
          onClick={() => navigate('/contacts')}
        />
      </div>

      {/* Contacts Needing Attention */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Needs Attention</h2>
          <span className="section-link" onClick={() => navigate('/contacts?filter=attention')}>View all →</span>
        </div>
        {contactsNeedingAttention.length === 0 ? (
          <EmptyState
            title="All clear!"
            description="No contacts are urgently needing attention right now."
            icon={
              <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="var(--signal-emerald)" strokeWidth="1.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
          />
        ) : (
          <div>
            {contactsNeedingAttention.map(c => (
              <AttentionCard key={c.id} contact={c} onOpen={() => navigate(`/contacts/${c.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Two column: Recent Activity + Score Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Recent Activity */}
        <div>
          <div className="section-header" style={{ marginBottom: 'var(--space-3)' }}>
            <h2 className="section-title">Recent Activity</h2>
            <span className="section-link">Last 7 days →</span>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 'var(--space-3) var(--space-5)' }}>
              {recentInteractions.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="empty-state-desc">No recent activity</div>
                </div>
              ) : (
                recentInteractions.slice(0, 8).map((item, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-dot" style={{ background: activityColor(item.type) }} />
                    <span className="activity-date">{relativeTime(item.date)}</span>
                    <div className="activity-content">
                      <span className="activity-name">{item.name}</span>
                      <span className="activity-desc"> — {item.description}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Score Distribution */}
        <div>
          <div className="section-header" style={{ marginBottom: 'var(--space-3)' }}>
            <h2 className="section-title">Score Distribution</h2>
          </div>
          <div className="card">
            <div className="card-body">
              <ScoreDistribution data={data.scoreDistribution} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, colorClass = '', onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value ${colorClass}`}>{loading ? '—' : value ?? 0}</div>
      <div className="stat-card-sub">{sub}</div>
    </div>
  );
}

function AttentionCard({ contact, onOpen }) {
  const [loading, setLoading] = React.useState(false);

  const handleFollowUp = async () => {
    setLoading(true);
    try {
      const { apiCreateFollowUp } = await import('../api');
      await apiCreateFollowUp({
        contact_id: contact.id,
        reason: 'Check in — needs attention',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'high',
      });
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attention-card">
      <div className="attention-card-header">
        <div>
          <div className="attention-card-name">{contact.name}</div>
          <div className="attention-card-company">{contact.company}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {contact.relationship_score != null && (
            <ScoreBar score={contact.relationship_score} showLabel size="sm" />
          )}
        </div>
      </div>
      {contact.nudge && (
        <div className="attention-card-nudge">{contact.nudge}</div>
      )}
      <div className="attention-card-actions">
        <button className="btn btn-secondary btn-sm" onClick={onOpen}>Open</button>
        <button className="btn btn-primary btn-sm" onClick={handleFollowUp} disabled={loading}>
          {loading ? '…' : 'Follow Up'}
        </button>
      </div>
    </div>
  );
}

function ScoreDistribution({ data }) {
  const segs = [
    { label: 'Cold (0–30)', color: 'var(--signal-rose)', range: '0-30' },
    { label: 'Warm (31–50)', color: 'var(--signal-amber)', range: '31-50' },
    { label: 'Active (51–70)', color: 'var(--signal-sky)', range: '51-70' },
    { label: 'Strong (71–100)', color: 'var(--signal-emerald)', range: '71-100' },
  ];

  const counts = data || [0, 0, 0, 0];
  const total = counts.reduce((a, b) => a + b, 1);

  return (
    <div>
      <div className="score-distribution">
        {segs.map((seg, i) => {
          const pct = Math.round((counts[i] / total) * 100);
          return (
            <div key={i} className="score-seg">
              <div
                className="score-seg-bar"
                style={{ background: seg.color, opacity: pct > 0 ? 1 : 0.2, height: Math.max(8, pct / 4) }}
              />
              <div className="score-seg-count">{counts[i]}</div>
              <div className="score-seg-label">{seg.range}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        {segs.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color }} />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{seg.label}: {counts[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function activityColor(type) {
  const map = { email: 'var(--signal-sky)', meeting: 'var(--accent)', call: 'var(--signal-violet)', note: 'var(--text-tertiary)', draft: 'var(--signal-amber)' };
  return map[type?.toLowerCase()] || 'var(--accent)';
}

function DashboardSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div className="skeleton skeleton-text lg" style={{ width: 120, marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: 220 }} />
      </div>
      <div className="stat-cards">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-card">
            <div className="skeleton skeleton-text" style={{ width: 80 }} />
            <div className="skeleton skeleton-text lg" style={{ width: 48, marginTop: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className="empty-state">
      <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="var(--signal-rose)" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <div className="empty-state-title">Could not load dashboard</div>
      <div className="empty-state-desc">{error}</div>
    </div>
  );
}
