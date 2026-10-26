import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';
import type { VideoFilters } from '../../creator/api/creator.api';
import { getOriginalDownloadTicket } from '../../creator/api/creator.api';
import {
  fetchAdminMetrics,
  fetchAdminVideos,
  adminRetryVideo,
  type AdminMetrics,
  type AdminVideo,
} from '../api/admin.api';

const bytes = (n: number | null): string =>
  n === null
    ? 'Unavailable'
    : n >= 1073741824
      ? `${(n / 1073741824).toFixed(2)} GB`
      : `${(n / 1048576).toFixed(1)} MB`;
const integer = (n: number) => Intl.NumberFormat('en-US').format(n);
const seconds = (n: number): string => `${n.toFixed(1)} sec`;

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [filters, setFilters] = useState<VideoFilters>({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const refresh = useCallback(async () => {
    try {
      const [m, v] = await Promise.all([
        fetchAdminMetrics(),
        fetchAdminVideos(filters, page),
      ]);
      setMetrics(m);
      setVideos(v.data);
      setTotal(v.pagination.total);
      setTotalPages(v.pagination.totalPages);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to fetch dashboard',
      );
    }
  }, [filters, page]);
  useEffect(() => {
    let cancelled = false;

    const loadDashboard = () => {
      void Promise.all([fetchAdminMetrics(), fetchAdminVideos(filters, page)])
        .then(([m, v]) => {
          if (cancelled) return;

          setMetrics(m);
          setVideos(v.data);
          setTotal(v.pagination.total);
          setTotalPages(v.pagination.totalPages);
          setError('');
        })
        .catch((err: unknown) => {
          if (cancelled) return;

          setError(
            err instanceof Error ? err.message : 'Unable to fetch dashboard',
          );
        });
    };

    loadDashboard();

    const timer = setInterval(() => {
      if (!document.hidden) {
        loadDashboard();
      }
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [filters, page]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((previous) => ({ ...previous, search }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);
  const retry = async (video: AdminVideo) => {
    setRetrying(video.id);
    try {
      await adminRetryVideo(video.id);
      toast.success('Job requeued');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setRetrying(null);
    }
  };
  const download = async (id: string) => {
    try {
      const url = await getOriginalDownloadTicket(id);
      const a = document.createElement('a');
      a.href = url;
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error('Original download failed');
    }
  };
  const card = (name: string, value: string | number) => (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-sm text-slate-400">{name}</div>
      <div className="text-2xl font-bold text-white mt-2">{value}</div>
    </div>
  );
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <main className="max-w-7xl mx-auto px-8 lg:px-16 py-10 space-y-8">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-black">
              ADMIN <span className="text-red-500">DASHBOARD</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Platform analytics, queue activity and video operations
            </p>
          </div>
          <button
            className="bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-700"
            onClick={() => void refresh()}
          >
            Refresh
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="bg-red-950 border border-red-700 p-3 rounded-lg text-red-200"
          >
            {error}
          </p>
        )}
        {metrics ? (
          <>
            <section
              aria-label="Platform metrics"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
            >
              {card('Total videos', integer(metrics.totalVideos))}
              {card('READY videos', integer(metrics.counts.READY))}
              {card('PENDING uploads', integer(metrics.counts.PENDING))}
              {card('Active processing', integer(metrics.counts.PROCESSING))}
              {card('Failed jobs', integer(metrics.counts.FAILED))}
              {card('All storage (MinIO)', bytes(metrics.storedBytes))}
              {card('Originals only', bytes(metrics.originalBytes))}
              {card(
                'Avg processing time',
                seconds(metrics.averageProcessingSeconds),
              )}
              {card('Video views', integer(metrics.totalViews))}
              {card('Original downloads', integer(metrics.totalDownloads))}
            </section>
            <section className="border border-slate-800 bg-slate-900 rounded-xl p-5">
              <h2 className="font-bold mb-3">RabbitMQ queue depth</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(metrics.queues).map(([name, count]) => (
                  <div
                    key={name}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-3"
                  >
                    <p className="text-xs text-slate-500 break-all">{name}</p>
                    <p className="text-lg font-semibold">
                      {count === null ? 'Unavailable' : integer(count)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Queue depth shows waiting messages. Active jobs are counted from
                PostgreSQL PROCESSING records.
              </p>
            </section>
          </>
        ) : (
          <p className="text-slate-400">Loading metrics…</p>
        )}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-bold">
            Video library{' '}
            <span className="text-slate-500 text-sm">({total} matching)</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <input
              aria-label="Admin search videos"
              placeholder="Search titles"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="col-span-2 bg-slate-950 border border-slate-700 rounded p-2 text-sm"
            />
            <select
              aria-label="Admin status filter"
              value={filters.status || ''}
              onChange={(e) => {
                setFilters((p) => ({ ...p, status: e.target.value }));
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-700 rounded p-2 text-sm"
            >
              <option value="">All statuses</option>
              {['READY', 'PENDING', 'PROCESSING', 'FAILED'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Admin resolution filter"
              value={filters.resolution || ''}
              onChange={(e) => {
                setFilters((p) => ({ ...p, resolution: e.target.value }));
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-700 rounded p-2 text-sm"
            >
              <option value="">All resolutions</option>
              <option value="1080">1080p+</option>
              <option value="720">720–1079p</option>
              <option value="480">480–719p</option>
              <option value="under480">Below 480p</option>
            </select>
            <label className="text-xs text-slate-400">
              Uploaded from
              <input
                type="date"
                className="block w-full mt-1 bg-slate-950 border border-slate-700 rounded p-2"
                value={filters.from || ''}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, from: e.target.value }));
                  setPage(1);
                }}
              />
            </label>
            <label className="text-xs text-slate-400">
              Uploaded to
              <input
                type="date"
                className="block w-full mt-1 bg-slate-950 border border-slate-700 rounded p-2"
                value={filters.to || ''}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, to: e.target.value }));
                  setPage(1);
                }}
              />
            </label>
            <label className="text-xs text-slate-400">
              Minimum duration (sec)
              <input
                type="number"
                min="0"
                className="block w-full mt-1 bg-slate-950 border border-slate-700 rounded p-2"
                value={filters.minDuration || ''}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, minDuration: e.target.value }));
                  setPage(1);
                }}
              />
            </label>
            <label className="text-xs text-slate-400">
              Maximum duration (sec)
              <input
                type="number"
                min="0"
                className="block w-full mt-1 bg-slate-950 border border-slate-700 rounded p-2"
                value={filters.maxDuration || ''}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, maxDuration: e.target.value }));
                  setPage(1);
                }}
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2">Video</th>
                  <th>Creator</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Stats</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((v) => (
                  <tr key={v.id} className="border-b border-slate-800/70">
                    <td className="p-2">
                      <div className="font-medium text-slate-100">
                        {v.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td
                      className="text-slate-400 max-w-36 truncate"
                      title={v.creator.email}
                    >
                      {v.creator.name || v.creator.email}
                    </td>
                    <td className="text-slate-300">{v.status}</td>
                    <td className="text-slate-400">
                      {v.width && v.height ? `${v.width}×${v.height}` : '—'}
                      <div className="text-xs">
                        {v.durationSeconds
                          ? `${Math.round(v.durationSeconds)}s`
                          : ''}
                      </div>
                    </td>
                    <td className="text-slate-400">
                      {v.viewCount} views
                      <br />
                      {v.downloadCount} downloads
                    </td>
                    <td className="space-x-2 py-2">
                      <button
                        onClick={() => void download(v.id)}
                        className="text-xs text-sky-400 hover:underline"
                      >
                        Download
                      </button>
                      {v.status === 'FAILED' && (
                        <button
                          disabled={retrying === v.id}
                          onClick={() => void retry(v)}
                          className="text-xs text-amber-400 hover:underline disabled:opacity-40"
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!videos.length && (
            <p className="text-slate-400">No videos match the filters.</p>
          )}
          <div className="flex items-center justify-end gap-3 text-sm text-slate-400">
            <button
              className="px-3 py-1 rounded bg-slate-800 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            Page {page} of {Math.max(1, totalPages)}
            <button
              className="px-3 py-1 rounded bg-slate-800 disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};
