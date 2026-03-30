import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import {
  apiConfig,
  apiRunDiscovery,
  apiContacts,
  apiSystemStatus,
  apiGraphRefresh,
  apiGraphSetupStart,
  apiGraphSetupStatus,
  apiPolicyCreate,
  apiSystemStatusVerify,
} from '../api';
import { useToast } from '../App';

// ── Status badge helpers ─────────────────────────────────────────────────────
function StatusBadge({ ok, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
      background: ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
      color: ok ? 'var(--signal-emerald)' : 'var(--signal-rose)',
      border: `1px solid ${ok ? 'var(--signal-emerald)' : 'var(--signal-rose)'}`,
    }}>
      <span style={{ fontSize: 10 }}>{ok ? '●' : '✕'}</span>
      {label}
    </span>
  );
}

function PriorityTag({ priority }) {
  const color = priority === 'critical' ? 'var(--signal-rose)' : priority === 'warning' ? 'var(--signal-amber)' : 'var(--text-secondary)';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      color, background: `${color}18`, padding: '2px 6px', borderRadius: 4,
    }}>
      {priority}
    </span>
  );
}

function SectionHeader({ title, icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', borderBottom: '1px solid var(--border)',
      background: 'var(--surface-raised)',
    }}>
      {icon}
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>{title}</span>
    </div>
  );
}

function ActionButton({
  label,
  loadingLabel,
  loading,
  onClick,
  className = 'btn btn-secondary btn-sm',
  dataAutomationId,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
      data-automation-id={dataAutomationId}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

function SetupChecklistItem({ label, value, tone = 'bad', dataAutomationId }) {
  const toneMap = {
    ok: {
      color: 'var(--signal-emerald)',
      background: 'rgba(16,185,129,0.08)',
      border: 'rgba(16,185,129,0.18)',
    },
    warn: {
      color: 'var(--signal-amber)',
      background: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.18)',
    },
    bad: {
      color: 'var(--signal-rose)',
      background: 'rgba(239,68,68,0.08)',
      border: 'rgba(239,68,68,0.18)',
    },
  };
  const ui = toneMap[tone] || toneMap.bad;

  return (
    <div
      data-automation-id={dataAutomationId}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 8,
        border: `1px solid ${ui.border}`,
        background: ui.background,
        fontSize: 12,
      }}
    >
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{label}</span>
      <span style={{ color: ui.color, fontWeight: 700, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function MailboxSignal({ ok, warning = false, label }) {
  const color = ok ? 'var(--signal-emerald)' : warning ? 'var(--signal-amber)' : 'var(--signal-rose)';
  const icon = ok ? '●' : warning ? '⚠' : '✕';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color }}>
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function formatTimestamp(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMailboxOverall(mailboxDetail = {}, tokenInfo = {}) {
  if (!mailboxDetail.configured) {
    return { label: '✕ Graph not configured', color: 'var(--signal-rose)' };
  }
  if (mailboxDetail.authenticated && mailboxDetail.tokenHealthy) {
    return { label: '✓ Mailbox ready', color: 'var(--signal-emerald)' };
  }
  if (tokenInfo.tokenLoaded && !mailboxDetail.tokenHealthy) {
    return { label: '✕ Token expired', color: 'var(--signal-rose)' };
  }
  if (!mailboxDetail.authenticated) {
    return { label: '✕ Authentication required', color: 'var(--signal-rose)' };
  }
  return { label: '⚠ Mailbox needs attention', color: 'var(--signal-amber)' };
}

function getNextSetupStep({ mailboxDetail = {}, policyDetail = {} }) {
  if (!mailboxDetail.configured) {
    return 'Add Microsoft Graph configuration';
  }
  if (mailboxDetail.blockerCode === 'token_expired' || (mailboxDetail.authenticated && !mailboxDetail.tokenHealthy) || (!mailboxDetail.authenticated && mailboxDetail.tokenHealthy === false)) {
    if (mailboxDetail.blockerCode === 'token_expired') {
      return 'Refresh expired Graph token';
    }
  }
  if (!mailboxDetail.authenticated && mailboxDetail.blockerCode !== 'token_expired') {
    return 'Start Graph authentication flow';
  }
  if (!mailboxDetail.tokenHealthy) {
    return 'Refresh expired Graph token';
  }
  if (!policyDetail.fileExists) {
    return 'Create outreach policy file';
  }
  if (!mailboxDetail.sendAsVerified) {
    return 'Verify shared mailbox send-as permissions';
  }
  return 'All setup steps complete';
}

function getSetupOverallState(completeCount) {
  if (completeCount >= 5) {
    return { icon: '🟢', color: 'var(--signal-emerald)' };
  }
  if (completeCount >= 3) {
    return { icon: '🟠', color: 'var(--signal-amber)' };
  }
  return { icon: '🔴', color: 'var(--signal-rose)' };
}

function getModalStatusText(status = {}) {
  if (status.hasValidToken) {
    return 'Token received! You can verify now.';
  }
  if (status.pending) {
    return 'Waiting for auth...';
  }
  if (status.lastError) {
    return `Setup stalled: ${status.lastError}`;
  }
  if (status.hasToken) {
    return 'A token file exists, but it is not healthy yet.';
  }
  return 'Waiting for auth...';
}

function GraphSetupModal({
  open,
  verificationUrl,
  userCode,
  message,
  status,
  checkingStatus,
  actionLoading,
  onOpenUrl,
  onCopyCode,
  onCompleted,
  onCheckStatus,
  onClose,
}) {
  if (!open) return null;

  return (
    <div
      data-automation-id="graph-setup-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: 'min(640px, 100%)',
          background: 'var(--surface-primary)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(15,23,42,0.45)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Complete Graph Authentication</div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            Use Microsoft device login to reconnect the mailbox. After browser sign-in completes, verify here.
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 12,
              background: 'var(--surface-raised)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                Verification URL
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {verificationUrl || 'https://microsoft.com/devicelogin'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                User code
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--accent)', wordBreak: 'break-word' }}>
                {userCode || '—'}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {message || 'Open the URL, enter the code, complete login, then verify Graph in this page.'}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                Setup status
              </div>
              <div style={{ fontSize: 13, color: status?.hasValidToken ? 'var(--signal-emerald)' : status?.pending ? 'var(--signal-amber)' : 'var(--text-secondary)', fontWeight: 600 }}>
                {getModalStatusText(status)}
              </div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                Token file
              </div>
              <div style={{ fontSize: 13, color: status?.hasToken ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                {status?.hasToken ? 'Present' : 'Not received yet'}
              </div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                Healthy token
              </div>
              <div style={{ fontSize: 13, color: status?.hasValidToken ? 'var(--signal-emerald)' : 'var(--signal-amber)', fontWeight: 600 }}>
                {status?.hasValidToken ? 'Received' : 'Waiting'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <ActionButton
              label="Open verification URL"
              loadingLabel="Open verification URL"
              loading={false}
              onClick={onOpenUrl}
              className="btn btn-primary btn-sm"
              dataAutomationId="graph-setup-open-url"
            />
            <ActionButton
              label="Copy code"
              loadingLabel="Copying..."
              loading={false}
              onClick={onCopyCode}
              className="btn btn-secondary btn-sm"
              dataAutomationId="graph-setup-copy-code"
              disabled={!userCode}
            />
            <ActionButton
              label="I've completed auth"
              loadingLabel="Verifying..."
              loading={actionLoading === 'verify'}
              onClick={onCompleted}
              className="btn btn-secondary btn-sm"
              dataAutomationId="graph-setup-complete"
            />
            <ActionButton
              label="Check status"
              loadingLabel="Checking..."
              loading={checkingStatus}
              onClick={onCheckStatus}
              className="btn btn-secondary btn-sm"
              dataAutomationId="graph-setup-check-status"
            />
            <ActionButton
              label="Close"
              loadingLabel="Close"
              loading={false}
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              dataAutomationId="graph-setup-close"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings component ──────────────────────────────────────────────────
export default function Settings() {
  const { addToast } = useToast();
  const [autoAdd, setAutoAdd] = useState(false);
  const [emailDraftsEnabled, setEmailDraftsEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  const [graphSetupModal, setGraphSetupModal] = useState({
    open: false,
    verificationUrl: 'https://microsoft.com/devicelogin',
    userCode: '',
    message: '',
  });
  const [graphSetupStatus, setGraphSetupStatus] = useState({
    pending: false,
    hasToken: false,
    hasValidToken: false,
    lastError: null,
  });
  const [checkingSetupStatus, setCheckingSetupStatus] = useState(false);
  const lastSetupValidRef = useRef(false);

  const { data: configData, loading: configLoading } = useApi(apiConfig, [], { immediate: true });
  const { data: systemData, loading: systemLoading } = useApi(apiSystemStatus, [refreshKey], { immediate: true });

  useEffect(() => {
    if (configData?.discovery?.autoAddMode != null) {
      setAutoAdd(!!configData.discovery.autoAddMode.thresholdReached);
    }
    if (configData?.emailDrafts?.enabled != null) {
      setEmailDraftsEnabled(!!configData.emailDrafts.enabled);
    }
  }, [configData]);

  const bumpRefresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  const checkSetupStatus = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setCheckingSetupStatus(true);
    }

    try {
      const status = await apiGraphSetupStatus();
      setGraphSetupStatus(status);
      if (status?.hasValidToken && !lastSetupValidRef.current) {
        addToast({ type: 'success', message: 'Token received — click “I\'ve completed auth” to verify Graph.' });
      }
      lastSetupValidRef.current = !!status?.hasValidToken;
      return status;
    } catch (error) {
      if (!silent) {
        addToast({ type: 'error', message: error.message });
      }
      return null;
    } finally {
      if (!silent) {
        setCheckingSetupStatus(false);
      }
    }
  }, [addToast]);

  useEffect(() => {
    if (!graphSetupModal.open) {
      return undefined;
    }

    checkSetupStatus({ silent: true });
    const intervalId = window.setInterval(() => {
      checkSetupStatus({ silent: true });
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [graphSetupModal.open, checkSetupStatus]);

  const handleRefreshToken = useCallback(async () => {
    setActionLoading('refresh');
    try {
      const result = await apiGraphRefresh();
      if (result?.success === false) {
        throw new Error(result.message || 'Token refresh failed');
      }
      addToast({ type: 'success', message: result?.message || 'Token refreshed' });
      await checkSetupStatus({ silent: true });
      bumpRefresh();
    } catch (error) {
      addToast({ type: 'error', message: error.message });
    } finally {
      setActionLoading(null);
    }
  }, [addToast, bumpRefresh, checkSetupStatus]);

  const handleStartAuth = useCallback(async () => {
    setActionLoading('auth');
    try {
      const result = await apiGraphSetupStart();
      if (result?.success === false) {
        throw new Error(result.message || 'Failed to start Graph auth');
      }

      lastSetupValidRef.current = false;
      setGraphSetupModal({
        open: true,
        verificationUrl: result?.verificationUrl || 'https://microsoft.com/devicelogin',
        userCode: result?.userCode || '',
        message: result?.message || 'Open the URL, enter the code, complete login, then verify Graph.',
      });
      setGraphSetupStatus({ pending: true, hasToken: false, hasValidToken: false, lastError: null });
      addToast({ type: 'info', message: result?.message || 'Graph auth flow started' });
      await checkSetupStatus({ silent: true });
    } catch (error) {
      addToast({ type: 'error', message: error.message });
    } finally {
      setActionLoading(null);
    }
  }, [addToast, checkSetupStatus]);

  const handleCreatePolicy = useCallback(async () => {
    setActionLoading('policy');
    try {
      const result = await apiPolicyCreate();
      if (result?.success === false) {
        throw new Error(result.message || 'Policy creation failed');
      }
      addToast({ type: 'success', message: result?.message || 'Policy ready' });
      bumpRefresh();
    } catch (error) {
      addToast({ type: 'error', message: error.message });
    } finally {
      setActionLoading(null);
    }
  }, [addToast, bumpRefresh]);

  const handleVerifySystem = useCallback(async ({ closeModalIfAuthenticated = false } = {}) => {
    setActionLoading('verify');
    try {
      const result = await apiSystemStatusVerify();
      const authenticated = !!(result?.graph?.authenticated || result?.mailboxDetail?.authenticated);
      if (authenticated) {
        setGraphSetupStatus((current) => ({ ...current, pending: false, hasValidToken: true }));
        lastSetupValidRef.current = true;
      }

      bumpRefresh();

      if (closeModalIfAuthenticated) {
        if (authenticated) {
          setGraphSetupModal((current) => ({ ...current, open: false }));
          addToast({ type: 'success', message: 'Graph authentication verified' });
        } else {
          addToast({ type: 'info', message: 'Auth not detected yet — keep the modal open and check status again.' });
        }
      } else {
        addToast({ type: 'success', message: 'System status verified' });
      }

      return result;
    } catch (error) {
      addToast({ type: 'error', message: error.message });
      return null;
    } finally {
      setActionLoading(null);
    }
  }, [addToast, bumpRefresh]);

  const handleCopyUserCode = useCallback(async () => {
    if (!graphSetupModal.userCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(graphSetupModal.userCode);
      addToast({ type: 'success', message: 'User code copied' });
    } catch (error) {
      addToast({ type: 'error', message: error.message || 'Copy failed' });
    }
  }, [addToast, graphSetupModal.userCode]);

  const handleOpenVerificationUrl = useCallback(() => {
    window.open(graphSetupModal.verificationUrl || 'https://microsoft.com/devicelogin', '_blank', 'noopener,noreferrer');
  }, [graphSetupModal.verificationUrl]);

  if ((configLoading && !configData) || (systemLoading && !systemData)) {
    return <Skeleton />;
  }

  const graphConfig = configData?.graph || {};
  const discovery = configData?.discovery || {};

  const {
    overall = {},
    graph: graphDiag = {},
    mailbox = {},
    mailboxDetail = {},
    policy = {},
    tokenInfo = {},
    systemBlockers = [],
    systemWarnings = [],
    wsStats = {},
    nextFixes = [],
    sendingIdentity,
  } = systemData || {};

  const sendReady = overall.sendReady;
  const policyDetail = policy.detail || {};
  const tokenAgeLabel = tokenInfo.tokenAgeMinutes == null
    ? '—'
    : tokenInfo.tokenAgeMinutes >= 0
      ? `expired ${tokenInfo.tokenAgeMinutes} min ago`
      : `expires in ${Math.abs(tokenInfo.tokenAgeMinutes)} min`;
  const tokenHealthLabel = mailboxDetail.tokenHealthy
    ? 'Healthy'
    : graphDiag.tokenExpired
      ? 'Expired'
      : tokenInfo.tokenLoaded
        ? 'Unhealthy'
        : 'Missing';
  const mailboxBlockerLabel = {
    not_configured: 'Not configured',
    not_authenticated: 'Not authenticated',
    token_expired: 'Token expired',
    ready: 'Ready',
  }[mailboxDetail.blockerCode] || mailboxDetail.blockerCode || 'Unknown';
  const mailboxOverall = getMailboxOverall(mailboxDetail, tokenInfo);

  const checklistItems = useMemo(() => ([
    {
      index: 1,
      label: '① Graph configured',
      complete: !!mailboxDetail.configured,
      tone: mailboxDetail.configured ? 'ok' : 'bad',
      value: mailboxDetail.configured ? '✓ Configured' : '✕ Missing',
    },
    {
      index: 2,
      label: '② Graph authenticated',
      complete: !!mailboxDetail.authenticated,
      tone: mailboxDetail.authenticated ? 'ok' : 'bad',
      value: mailboxDetail.authenticated ? '✓ Authenticated' : '✕ Not authenticated',
    },
    {
      index: 3,
      label: '③ Token healthy',
      complete: !!mailboxDetail.tokenHealthy,
      tone: mailboxDetail.tokenHealthy ? 'ok' : 'bad',
      value: mailboxDetail.tokenHealthy ? '✓ Healthy' : '✕ Expired / unhealthy',
    },
    {
      index: 4,
      label: '④ Outreach policy present',
      complete: !!policy.fileExists,
      tone: policy.fileExists ? 'ok' : 'bad',
      value: policy.fileExists ? '✓ Present' : '✕ Missing',
    },
    {
      index: 5,
      label: '⑤ Shared mailbox verified',
      complete: !!mailboxDetail.sendAsVerified,
      tone: mailboxDetail.sendAsVerified ? 'ok' : 'warn',
      value: mailboxDetail.sendAsVerified ? '✓ Verified' : '⚠ Not verified yet',
    },
  ]), [mailboxDetail, policy.fileExists]);

  const completeCount = checklistItems.filter((item) => item.complete).length;
  const checklistOverall = getSetupOverallState(completeCount);
  const nextSetupStep = getNextSetupStep({ mailboxDetail, policyDetail });

  return (
    <>
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">System configuration and diagnostics</p>
          </div>
        </div>

        {/* ─── OUTBOUND SYSTEM DIAGNOSTICS ─── */}
        <div style={{ marginBottom: 24 }}>
          <SectionHeader
            title="Outbound System"
            icon={<OutboundIcon />}
          />
          <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>

            {/* Overall status banner */}
            <div style={{
              padding: '14px 16px',
              background: sendReady
                ? 'rgba(16,185,129,0.08)'
                : 'rgba(239,68,68,0.08)',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sendReady ? 0 : 10 }}>
                <span style={{ fontSize: 18 }}>{sendReady ? '✓' : '✕'}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: sendReady ? 'var(--signal-emerald)' : 'var(--signal-rose)' }}>
                    {sendReady ? 'Outbound Ready' : 'Outbound Blocked'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {overall.sendReadyBecause || 'Checking system state…'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge ok={mailbox.ready} label={`Mailbox ${mailbox.ready ? 'Ready' : 'Blocked'}`} />
                <StatusBadge ok={policy.ready} label={`Policy ${policy.ready ? 'Defined' : 'Missing'}`} />
                <StatusBadge ok={graphDiag.authenticated} label={`Graph ${graphDiag.authenticated ? 'Connected' : 'Disconnected'}`} />
                {wsStats.approvedNotSent > 0 && (
                  <StatusBadge ok={false} label={`${wsStats.approvedNotSent} approved, blocked`} />
                )}
                {wsStats.readyToSend > 0 && (
                  <StatusBadge ok={true} label={`${wsStats.readyToSend} ready to send`} />
                )}
              </div>
            </div>

            {/* Setup checklist */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
                Setup Checklist
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {checklistItems.map((item) => (
                  <SetupChecklistItem
                    key={item.index}
                    label={item.label}
                    value={item.value}
                    tone={item.tone}
                    dataAutomationId={`setup-checklist-item-${item.index}`}
                  />
                ))}
              </div>
              <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
                <div
                  data-automation-id="setup-checklist-overall"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: checklistOverall.color,
                  }}
                >
                  <span>{checklistOverall.icon}</span>
                  <span>Overall: {completeCount} of 5 complete</span>
                </div>
                <div
                  data-automation-id="setup-checklist-next-step"
                  style={{ fontSize: 12, color: 'var(--text-secondary)' }}
                >
                  Next step: {nextSetupStep}
                </div>
              </div>
            </div>

            {/* Setup actions */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
                Setup Actions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <ActionButton
                  label="Refresh Token"
                  loadingLabel="Refreshing..."
                  loading={actionLoading === 'refresh'}
                  onClick={handleRefreshToken}
                  className="btn btn-primary btn-sm"
                  dataAutomationId="action-refresh-token"
                />
                <ActionButton
                  label="Start Auth Flow"
                  loadingLabel="Starting..."
                  loading={actionLoading === 'auth'}
                  onClick={handleStartAuth}
                  className="btn btn-secondary btn-sm"
                  dataAutomationId="action-start-auth-flow"
                />
                <ActionButton
                  label="Create Policy"
                  loadingLabel="Creating..."
                  loading={actionLoading === 'policy'}
                  onClick={handleCreatePolicy}
                  className="btn btn-secondary btn-sm"
                  dataAutomationId="action-create-policy"
                />
                <ActionButton
                  label="Verify System"
                  loadingLabel="Verifying..."
                  loading={actionLoading === 'verify'}
                  onClick={() => handleVerifySystem()}
                  className="btn btn-secondary btn-sm"
                  dataAutomationId="action-verify-system"
                />
              </div>
            </div>

            {/* Policy card */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
                Outreach Policy
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: 16,
                border: '1px solid var(--border)',
                borderRadius: 12,
                background: 'var(--surface-raised)',
                padding: 16,
              }}>
                <div style={{ minWidth: 260, flex: '1 1 320px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: policy.fileExists ? 'var(--signal-emerald)' : 'var(--signal-rose)' }}>
                    {policy.fileExists ? 'Policy file found' : 'Policy file missing'}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {policy.fileExists
                      ? (policyDetail.filePath || 'Policy path unavailable')
                      : 'Create the starter policy before outbound deployment is allowed.'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  {!policy.fileExists && (
                    <ActionButton
                      label="Create Policy"
                      loadingLabel="Creating..."
                      loading={actionLoading === 'policy'}
                      onClick={handleCreatePolicy}
                      className="btn btn-primary btn-sm"
                      dataAutomationId="policy-create-button"
                    />
                  )}
                  <ActionButton
                    label="Verify Policy"
                    loadingLabel="Verifying..."
                    loading={actionLoading === 'verify'}
                    onClick={() => handleVerifySystem()}
                    className="btn btn-secondary btn-sm"
                    dataAutomationId="policy-verify-button"
                  />
                </div>
              </div>
            </div>

            {/* Detail grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

              {/* Mailbox detail */}
              <div style={{ padding: '14px 16px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Mailbox</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Graph config</span>
                    <span style={{ color: mailboxDetail.configured ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                      {mailboxDetail.configured ? 'Present' : 'Missing'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Live auth</span>
                    <span style={{ color: mailboxDetail.authenticated ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                      {mailboxDetail.authenticated ? 'Authenticated' : 'Not authenticated'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Token health</span>
                    <span style={{ color: mailboxDetail.tokenHealthy ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                      {tokenHealthLabel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Blocker code</span>
                    <span style={{ color: mailboxDetail.blockerCode === 'ready' ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                      {mailboxBlockerLabel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Reason</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 220, textAlign: 'right' }}>
                      {mailboxDetail.reason || mailbox.reason || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Next fix</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 220, textAlign: 'right' }}>
                      {mailboxDetail.nextFix || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Shared mailbox</span>
                    <span style={{ color: mailboxDetail.sharedMailboxConfigured ? 'var(--signal-emerald)' : 'var(--signal-amber)', fontWeight: 600 }}>
                      {mailboxDetail.sharedMailboxConfigured ? 'Configured' : 'Not configured yet'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Send-as verified</span>
                    <span style={{ color: mailboxDetail.sendAsVerified ? 'var(--signal-emerald)' : 'var(--signal-amber)', fontWeight: 600 }}>
                      {mailboxDetail.sendAsVerified ? 'Verified' : 'Not verified yet'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Token loaded</span>
                    <span style={{ color: tokenInfo.tokenLoaded ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                      {tokenInfo.tokenLoaded ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Token expires</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {formatTimestamp(tokenInfo.expiresAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Token age</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tokenAgeLabel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Sending identity</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>{sendingIdentity || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Policy detail */}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Outreach Policy</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Policy file</span>
                    <span style={{ color: policy.fileExists ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                      {policy.fileExists ? 'Found' : 'Not found'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>File missing</span>
                    <span style={{ color: policy.fileMissing ? 'var(--signal-rose)' : 'var(--signal-emerald)', fontWeight: 600 }}>
                      {policy.fileMissing ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Policy status</span>
                    <span style={{ color: policy.ready ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                      {policy.ready ? 'Defined' : 'Not defined'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Policy reason</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 220, textAlign: 'right' }}>{policy.reason || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Policy path</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 220, textAlign: 'right', wordBreak: 'break-all' }}>
                      {policyDetail.filePath || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Approval model</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Two-gate (content + deploy)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* System blockers */}
            {systemBlockers.length > 0 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'rgba(239,68,68,0.04)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--signal-rose)', marginBottom: 6 }}>
                  System Blockers
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {systemBlockers.map(b => (
                    <div key={b} style={{ fontSize: 12, color: 'var(--signal-rose)' }}>
                      ✕ {b === 'mailbox'
                        ? (mailboxDetail.reason || 'Mailbox blocked')
                        : b === 'policy'
                          ? (policy.reason || 'Outreach policy not defined')
                          : b}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System warnings */}
            {systemWarnings.length > 0 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'rgba(245,158,11,0.06)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--signal-amber)', marginBottom: 6 }}>
                  Warnings
                </div>
                {systemWarnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--signal-amber)' }}>⚠ {w}</div>
                ))}
              </div>
            )}

            {/* Next fixes */}
            {nextFixes.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                  Next Fixes Required
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nextFixes.map((fix, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <PriorityTag priority={fix.priority} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fix.action}</div>
                        {fix.reason && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{fix.reason}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All clear state */}
            {sendReady && nextFixes.length === 0 && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--signal-emerald)', fontSize: 16 }}>✓</span>
                <span style={{ fontSize: 13, color: 'var(--signal-emerald)', fontWeight: 600 }}>Outbound is fully operational.</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── MAILBOX & AUTH ─── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-title">Mailbox &amp; Auth</div>
          </div>
          <div className="settings-section-body">
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 12,
              background: 'var(--surface-raised)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Overall</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: mailboxOverall.color }}>
                  {mailboxOverall.label}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                <MailboxSignal ok={!!mailboxDetail.configured} label="Graph configured" />
                <MailboxSignal ok={!!mailboxDetail.authenticated} label="Authenticated" />
                <MailboxSignal ok={!!tokenInfo.tokenLoaded} label="Token loaded" />
                <MailboxSignal ok={!!mailboxDetail.tokenHealthy} label={mailboxDetail.tokenHealthy ? 'Token healthy' : 'Token expired'} />
                <MailboxSignal ok={!!mailboxDetail.sharedMailboxConfigured} warning={!mailboxDetail.sharedMailboxConfigured} label={mailboxDetail.sharedMailboxConfigured ? 'Shared mailbox configured' : 'Shared mailbox (unverified)'} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <ActionButton
                  label="Refresh Token"
                  loadingLabel="Refreshing..."
                  loading={actionLoading === 'refresh'}
                  onClick={handleRefreshToken}
                  className="btn btn-primary btn-sm"
                  dataAutomationId="mailbox-auth-refresh-token"
                />
                <ActionButton
                  label="Start Auth"
                  loadingLabel="Starting..."
                  loading={actionLoading === 'auth'}
                  onClick={handleStartAuth}
                  className="btn btn-secondary btn-sm"
                  dataAutomationId="mailbox-auth-start-auth"
                />
                <ActionButton
                  label="Verify Now"
                  loadingLabel="Verifying..."
                  loading={actionLoading === 'verify'}
                  onClick={() => handleVerifySystem()}
                  className="btn btn-secondary btn-sm"
                  dataAutomationId="mailbox-auth-verify-now"
                />
              </div>

              <div style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div>
                  Token expires: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{formatTimestamp(tokenInfo.expiresAt)}</span>
                  <span style={{ marginLeft: 8, color: tokenInfo.tokenLoaded && !mailboxDetail.tokenHealthy ? 'var(--signal-rose)' : 'var(--text-tertiary)' }}>
                    ({tokenAgeLabel})
                  </span>
                </div>
                <div>
                  Sending identity: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{sendingIdentity || 'studio@verdantia.it'}</span>
                </div>
                <div style={{ color: 'var(--text-tertiary)' }}>
                  {mailboxDetail.reason || graphDiag.message || 'Mailbox status unavailable'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── CONTACT DISCOVERY ─── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-title">Contact Discovery</div>
          </div>
          <div className="settings-section-body">
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Auto-add mode</div>
                <div className="settings-row-desc">
                  {autoAdd ? 'Enabled — contacts are automatically added after approval threshold' : 'Manual — you approve each contact'}
                </div>
              </div>
              <Toggle
                id="autoadd-toggle"
                checked={autoAdd}
                onChange={setAutoAdd}
              />
            </div>

            {discovery?.autoAddMode && (
              <div className="settings-row">
                <div className="settings-row-label">Decisions made</div>
                <span className="font-mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {discovery.autoAddMode.decisions || 0} / 50
                </span>
              </div>
            )}

            <div className="settings-row">
              <div className="settings-row-label">Run discovery</div>
              <button className="btn btn-secondary btn-sm" onClick={handleSync} disabled={syncing}>
                {syncing ? 'Running…' : '↻ Run Now'}
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-row-label">Discovery sources</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className="badge badge-emerald">Outlook Email</span>
                <span className="badge badge-emerald">Calendar</span>
                <span className="badge badge-default">LinkedIn (coming soon)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RELATIONSHIP INTELLIGENCE ─── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-title">Relationship Intelligence</div>
          </div>
          <div className="settings-section-body">
            <div className="settings-row">
              <div>
                <div className="settings-row-label">LLM Provider</div>
                <div className="settings-row-desc">Used for summaries and relationship analysis</div>
              </div>
              <span className="badge badge-accent">{graphConfig?.llmProvider || 'OpenAI'}</span>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Embeddings</div>
                <div className="settings-row-desc">Used for semantic contact search</div>
              </div>
              <span className="badge badge-default">{graphConfig?.embeddingsProvider || 'Local (Ollama)'}</span>
            </div>
          </div>
        </div>

        {/* ─── EMAIL DRAFTS ─── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-title">Email Drafts</div>
          </div>
          <div className="settings-section-body">
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Enable email drafts</div>
                <div className="settings-row-desc">
                  AI generates draft emails for your review before sending.
                  All drafts require explicit approval.
                </div>
              </div>
              <Toggle
                id="drafts-toggle"
                checked={emailDraftsEnabled}
                onChange={setEmailDraftsEnabled}
              />
            </div>
            <div className="settings-row">
              <div className="settings-row-label">Draft tone</div>
              <select className="form-input form-select" style={{ width: 'auto' }}>
                <option>Professional</option>
                <option>Warm</option>
                <option>Casual</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── DATA ─── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-title">Data</div>
          </div>
          <div className="settings-section-body">
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Export contacts</div>
                <div className="settings-row-desc">Download all your contacts as CSV or JSON</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>Export CSV</button>
                <button className="btn btn-secondary btn-sm" onClick={handleExportJSON}>Export JSON</button>
              </div>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-row-label" style={{ color: 'var(--signal-rose)' }}>Danger zone</div>
                <div className="settings-row-desc">Permanently delete all data. This cannot be undone.</div>
              </div>
              <button className="btn btn-danger btn-sm" disabled title="Awaiting DELETE /api/wipe endpoint">Delete all data</button>
            </div>
          </div>
        </div>
      </div>

      <GraphSetupModal
        open={graphSetupModal.open}
        verificationUrl={graphSetupModal.verificationUrl}
        userCode={graphSetupModal.userCode}
        message={graphSetupModal.message}
        status={graphSetupStatus}
        checkingStatus={checkingSetupStatus}
        actionLoading={actionLoading}
        onOpenUrl={handleOpenVerificationUrl}
        onCopyCode={handleCopyUserCode}
        onCompleted={() => handleVerifySystem({ closeModalIfAuthenticated: true })}
        onCheckStatus={() => checkSetupStatus()}
        onClose={() => setGraphSetupModal((current) => ({ ...current, open: false }))}
      />
    </>
  );

  // ── Inline handlers ───────────────────────────────────────────────────────
  async function handleSync() {
    setSyncing(true);
    try {
      const result = await apiRunDiscovery();
      addToast({ type: 'info', message: result?.text || 'Discovery run started' });
    } catch (e) {
      addToast({ type: 'error', message: e.message });
    } finally {
      setSyncing(false);
    }
  }

  async function handleExportCSV() {
    try {
      const data = await apiContacts({ limit: 10000 });
      const contacts = data?.items || [];
      if (contacts.length === 0) { addToast({ type: 'info', message: 'No contacts to export' }); return; }
      const headers = ['name', 'email', 'company', 'role', 'phone', 'priority', 'relationship_score'];
      const rows = contacts.map(c => [c.name, c.email, c.company, c.role, c.phone, c.priority, c.relationship_score]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'contacts.csv'; a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: `Exported ${contacts.length} contacts` });
    } catch (e) {
      addToast({ type: 'error', message: e.message });
    }
  }

  async function handleExportJSON() {
    try {
      const data = await apiContacts({ limit: 10000 });
      const contacts = data?.items || [];
      if (contacts.length === 0) { addToast({ type: 'info', message: 'No contacts to export' }); return; }
      const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'contacts.json'; a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: `Exported ${contacts.length} contacts` });
    } catch (e) {
      addToast({ type: 'error', message: e.message });
    }
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, id }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="toggle-track" />
      <div className="toggle-thumb" />
    </label>
  );
}

function OutboundIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
      <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function Skeleton() {
  return (
    <div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="settings-section" style={{ marginBottom: 16 }}>
          <div className="skeleton skeleton-text md" style={{ width: 140, padding: '12px 20px' }} />
          <div style={{ padding: 20 }}>
            {[1, 2, 3].map(j => (
              <div key={j} className="skeleton skeleton-text" style={{ width: '100%', height: 40, marginBottom: 8 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
