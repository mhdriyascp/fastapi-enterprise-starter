'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { PagedResponse, User } from '@/lib/types';
import { ChevronLeft, ChevronRight, Search, Clock } from 'lucide-react';

/**
 * User administration page.
 * Manages registered platform users via paginated `GET /api/v1/users` with server-side pagination
 * and client-side query filtering across display name, email, and user name.
 */
export default function UsersPage() {
  const [data, setData] = useState<PagedResponse<User> | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadUsers() {
      setIsLoading(true);
      try {
        const res = await apiFetch<PagedResponse<User>>(`/users?page=${page}&page_size=${pageSize}`);
        setData(res);
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUsers();
  }, [page, pageSize]);

  const filteredUsers = (data?.items || []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.display_name && u.display_name.toLowerCase().includes(q)) ||
      (u.first_name && u.first_name.toLowerCase().includes(q)) ||
      (u.last_name && u.last_name.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            User Administration
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage registered platform users, profile data, and identity records.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User Name</th>
              <th>Email Address</th>
              <th>Status</th>
              <th>Public ID</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={5}>
                    <div className="skeleton" style={{ height: '32px', width: '100%' }} />
                  </td>
                </tr>
              ))
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {user.first_name ? user.first_name[0].toUpperCase() : user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                  <td>
                    <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                      {user.public_id}
                    </code>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} color="var(--text-muted)" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No users found matching query.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {data && data.total_pages > 1 && (
          <div
            style={{
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing Page {data.page} of {data.total_pages} ({data.total} total users)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              >
                <ChevronLeft size={15} />
                <span>Previous</span>
              </button>
              <button
                disabled={data.page >= data.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              >
                <span>Next</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
