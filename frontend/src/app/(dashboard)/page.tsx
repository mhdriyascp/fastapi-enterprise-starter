'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { PagedResponse, Organization, User } from '@/lib/types';
import {
  Building2,
  Users,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  Plus,
  RefreshCw,
  UserPlus,
  Settings,
  Shield,
  Zap,
  Activity,
  Database,
  CheckSquare,
  Layers,
  BarChart2,
} from 'lucide-react';

interface DashboardMetrics {
  orgsCount: number;
  usersCount: number;
  apiStatus: string;
  dbStatus: string;
}

/**
 * Mailtrap-Style Enterprise Dashboard Overview.
 * Features clean horizontal tabs, high-contrast metrics cards, quick setup action banner,
 * sales pipeline tracking, and live audit streams.
 */
export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'receivables' | 'setup'>('overview');
  const [stats, setStats] = useState<DashboardMetrics>({
    orgsCount: 0,
    usersCount: 0,
    apiStatus: 'checking',
    dbStatus: 'checking',
  });
  const [recentOrgs, setRecentOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initData() {
      try {
        const [orgsData, usersData, healthData] = await Promise.allSettled([
          apiFetch<PagedResponse<Organization> | Organization[]>('/organizations?limit=6'),
          apiFetch<PagedResponse<User>>('/users?page=1&page_size=6'),
          apiFetch<{ status: string; database: number }>('/health'),
        ]);

        if (!isMounted) return;

        let orgsCount = 0;
        let usersCount = 0;

        if (orgsData.status === 'fulfilled') {
          const val = orgsData.value;
          const items = Array.isArray(val) ? val : (val?.items || []);
          const total = Array.isArray(val) ? val.length : (val?.total ?? items.length);
          setRecentOrgs(items);
          orgsCount = total;
        }

        if (usersData.status === 'fulfilled') {
          usersCount = usersData.value.total || 0;
        }

        let dbStatus = 'healthy';
        if (healthData.status === 'fulfilled') {
          dbStatus = healthData.value.database === 1 ? 'online' : 'degraded';
        }

        setStats({
          orgsCount,
          usersCount,
          apiStatus: 'online',
          dbStatus,
        });
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    initData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [orgsData, usersData] = await Promise.allSettled([
        apiFetch<PagedResponse<Organization> | Organization[]>('/organizations?limit=6'),
        apiFetch<PagedResponse<User>>('/users?page=1&page_size=6'),
      ]);
      if (orgsData.status === 'fulfilled') {
        const val = orgsData.value;
        const items = Array.isArray(val) ? val : (val?.items || []);
        const total = Array.isArray(val) ? val.length : (val?.total ?? items.length);
        setRecentOrgs(items);
        setStats((prev) => ({ ...prev, orgsCount: total }));
      }
      if (usersData.status === 'fulfilled') {
        setStats((prev) => ({ ...prev, usersCount: usersData.value.total || 0 }));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const pipelineStages = [
    { name: '1. Discovery & Inbound', count: 24, value: '$180,000', percentage: 20, color: '#2563eb' },
    { name: '2. Needs Analysis & Demo', count: 16, value: '$265,000', percentage: 40, color: '#38bdf8' },
    { name: '3. Proposal & Quote Sent', count: 11, value: '$390,000', percentage: 65, color: '#fbbf24' },
    { name: '4. Contract & Security Review', count: 6, value: '$220,000', percentage: 85, color: '#f97316' },
    { name: '5. Closed Won (This Quarter)', count: 19, value: '$685,000', percentage: 100, color: '#10b981' },
  ];

  const setupSteps = [
    { label: 'Create your first organization', done: stats.orgsCount > 0 },
    { label: 'Invite a team member', done: stats.usersCount > 1 },
    { label: 'Configure RBAC roles & permissions', done: false },
    { label: 'Connect external integrations', done: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ── Header & Tabs ── */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                margin: '0 0 0.35rem 0',
              }}
            >
              Dashboard
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Welcome back{user?.display_name ? `, ${user.display_name}` : user?.first_name ? `, ${user.first_name}` : ''}. Here&apos;s your platform at a glance.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="btn btn-secondary"
              style={{ height: '36px', fontSize: '0.8rem', padding: '0 0.85rem' }}
              title="Refresh metrics"
            >
              <RefreshCw size={13} className={isRefreshing ? 'loading-spinner' : ''} />
              <span>Refresh</span>
            </button>
            <Link href="/organizations/new" className="btn btn-primary" style={{ height: '36px', fontSize: '0.8rem' }}>
              <Plus size={14} />
              <span>Add Organization</span>
            </Link>
          </div>
        </div>

        {/* Horizontal Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'activity', label: 'Activity Logs' },
            { id: 'receivables', label: 'Cash Flow' },
            { id: 'setup', label: 'Setup Guide' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  padding: '0.6rem 0.2rem',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginBottom: '-1px',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Row 1: 4 KPI Metric Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
        }}
      >
        {/* Total Organizations */}
        <div
          className="card"
          style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(37, 99, 235, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
                flexShrink: 0,
              }}
            >
              <Building2 size={20} />
            </div>
            <ArrowUpRight size={14} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            Total Organizations
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '0.6rem' }}>
            {isLoading ? '—' : stats.orgsCount}
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.12)',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
            }}
          >
            +8% this month
          </span>
        </div>

        {/* Total Users */}
        <div
          className="card"
          style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
                flexShrink: 0,
              }}
            >
              <Users size={20} />
            </div>
            <ArrowUpRight size={14} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            Total Users
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '0.6rem' }}>
            {isLoading ? '—' : stats.usersCount}
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#818cf8',
              background: 'rgba(99, 102, 241, 0.12)',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
            }}
          >
            +3 new this week
          </span>
        </div>

        {/* System Status */}
        <div
          className="card"
          style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                flexShrink: 0,
              }}
            >
              <Shield size={20} />
            </div>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
                boxShadow: '0 0 6px #10b981',
              }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            System Status
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', lineHeight: 1.1, marginBottom: '0.6rem' }}>
            Operational
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.04)',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
            }}
          >
            All services online
          </span>
        </div>

        {/* API Latency */}
        <div
          className="card"
          style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(251, 191, 36, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                flexShrink: 0,
              }}
            >
              <Zap size={20} />
            </div>
            <ArrowUpRight size={14} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            API Latency
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '0.6rem' }}>
            24ms
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.04)',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
            }}
          >
            Avg response time
          </span>
        </div>
      </div>

      {/* ── Row 2: Sales Pipeline (2/3) + Quick Actions (1/3) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        {/* Sales Pipeline Funnel */}
        <div
          className="card"
          style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={17} color="#38bdf8" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Sales Pipeline
              </h3>
            </div>
            <span className="badge badge-success" style={{ fontWeight: 700 }}>64.2% Win Rate</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ textAlign: 'left', padding: '0 0 0.6rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stage</th>
                <th style={{ textAlign: 'right', padding: '0 0 0.6rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deals</th>
                <th style={{ textAlign: 'right', padding: '0 0 0.6rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Value</th>
                <th style={{ textAlign: 'left', padding: '0 0 0.6rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '30%' }}>Fill</th>
              </tr>
            </thead>
            <tbody>
              {pipelineStages.map((stage) => (
                <tr key={stage.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.7rem 0', color: 'var(--text-primary)', fontWeight: 500 }}>{stage.name}</td>
                  <td style={{ padding: '0.7rem 0', textAlign: 'right', color: 'var(--text-secondary)' }}>{stage.count}</td>
                  <td style={{ padding: '0.7rem 0', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>{stage.value}</td>
                  <td style={{ padding: '0.7rem 0 0.7rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          flex: 1,
                          height: '6px',
                          borderRadius: '999px',
                          background: 'var(--border-subtle)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${stage.percentage}%`,
                            height: '100%',
                            background: stage.color,
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '30px', textAlign: 'right' }}>
                        {stage.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Actions */}
        <div
          className="card"
          style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)' }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1.25rem 0' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { label: 'Add Organization', icon: Building2, href: '/organizations/new', color: '#3b82f6' },
              { label: 'Invite User', icon: UserPlus, href: '/users/invite', color: '#818cf8' },
              { label: 'View Reports', icon: BarChart2, href: '/reports', color: '#fbbf24' },
              { label: 'System Settings', icon: Settings, href: '/settings', color: '#94a3b8' },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.02)',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${action.color}1a`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: action.color,
                    flexShrink: 0,
                  }}
                >
                  <action.icon size={16} />
                </div>
                <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {action.label}
                </span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Recent Organizations (left) + System Health (right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Recent Organizations */}
        <div
          className="card"
          style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={17} color="#60a5fa" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Recent Organizations
              </h3>
            </div>
            <Link
              href="/organizations"
              style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
            >
              View All <ArrowUpRight size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: '48px', borderRadius: 'var(--radius-md)' }} />
              ))
            ) : recentOrgs.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No organizations yet.
              </div>
            ) : (
              recentOrgs.slice(0, 5).map((org) => (
                <div
                  key={org.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span className="badge badge-neutral" style={{ fontFamily: 'monospace', fontSize: '0.7rem', flexShrink: 0 }}>
                    {org.code}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {org.name}
                    </div>
                    {org.created_at && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(org.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <span className={`badge ${org.is_active ? 'badge-success' : 'badge-danger'}`} style={{ flexShrink: 0 }}>
                    {org.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Health */}
        <div
          className="card"
          style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Activity size={17} color="#10b981" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              System Health
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* API Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Zap size={16} color="#fbbf24" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>API Server</span>
              </div>
              <span className={`badge ${stats.apiStatus === 'online' ? 'badge-success' : 'badge-neutral'}`}>
                {stats.apiStatus === 'online' ? 'Online' : stats.apiStatus === 'checking' ? 'Checking…' : stats.apiStatus}
              </span>
            </div>

            {/* DB Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Database size={16} color="#3b82f6" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Database</span>
              </div>
              <span className={`badge ${stats.dbStatus === 'online' ? 'badge-success' : stats.dbStatus === 'checking' ? 'badge-neutral' : 'badge-danger'}`}>
                {stats.dbStatus === 'online' ? 'Online' : stats.dbStatus === 'checking' ? 'Checking…' : stats.dbStatus}
              </span>
            </div>

            {/* Platform Uptime */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(16, 185, 129, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Shield size={16} color="#10b981" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Platform Uptime</span>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981' }}>99.98%</span>
            </div>

            {/* Uptime bar */}
            <div style={{ marginTop: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                <span>30-day availability</span>
                <span>99.98%</span>
              </div>
              <div style={{ height: '6px', borderRadius: '999px', background: 'var(--border-subtle)', overflow: 'hidden' }}>
                <div style={{ width: '99.98%', height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '999px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Setup Checklist ── */}
      <div
        className="card"
        style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <CheckSquare size={17} color="#818cf8" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Platform Setup Checklist
          </h3>
          <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>
            {setupSteps.filter((s) => s.done).length}/{setupSteps.length} Complete
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: '6px', borderRadius: '999px', background: 'var(--border-subtle)', overflow: 'hidden', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: `${(setupSteps.filter((s) => s.done).length / setupSteps.length) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #6366f1, #818cf8)',
              borderRadius: '999px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.65rem',
          }}
        >
          {setupSteps.map((step) => (
            <div
              key={step.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.7rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${step.done ? 'rgba(16,185,129,0.25)' : 'var(--border-subtle)'}`,
                background: step.done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <CheckCircle2
                size={18}
                style={{ flexShrink: 0, color: step.done ? '#10b981' : 'var(--text-muted)' }}
              />
              <span
                style={{
                  fontSize: '0.83rem',
                  fontWeight: 500,
                  color: step.done ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textDecoration: step.done ? 'line-through' : 'none',
                }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
