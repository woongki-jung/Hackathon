'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/lib/toast/toast-context';
import { Spinner } from '@/components/ui/Spinner';

interface ServiceStatus {
  scheduler: { status: 'running' | 'stopped'; checkInterval: number | null };
  mail: {
    imapConfigured: boolean;
    passwordConfigured: boolean;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    lastRunMailCount: number | null;
  };
  analysis: { apiKeyConfigured: boolean; model: string | null };
}

interface AnalysisItem {
  id: string;
  fileName: string;
  mailSubject: string | null;
  mailReceivedAt: string | null;
  status: string;
  summary: string | null;
  actionItems: string | null;
  extractedTermCount: number | null;
  analyzedAt: string | null;
}

interface HistoryItem {
  id: string;
  mailSubject: string | null;
  mailReceivedAt: string | null;
  status: string;
  extractedTermCount: number | null;
  analyzedAt: string | null;
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  completed: { label: '완료', cls: 'bg-green-100 text-green-700' },
  failed: { label: '실패', cls: 'bg-red-100 text-red-600' },
  processing: { label: '처리 중', cls: 'bg-blue-100 text-blue-600' },
  pending: { label: '대기 중', cls: 'bg-yellow-100 text-yellow-600' },
};

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).replace(/\. /g, '-').replace('.', '').trim();
}

function StatusBadge({ status }: { status: string }) {
  const b = STATUS_BADGE[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${b.cls}`}>{b.label}</span>;
}

export default function DashboardPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [latest, setLatest] = useState<AnalysisItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    loadAll(1);
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me');
      const json = await res.json();
      if (json.success) setIsAdmin(json.data.role === 'admin');
    } catch { /* 무시 */ }
  }

  async function loadAll(p: number) {
    setLoading(true);
    try {
      const [statusRes, latestRes, historyRes] = await Promise.all([
        fetch('/api/mail/status'),
        fetch('/api/analysis/latest'),
        fetch(`/api/analysis/history?page=${p}`),
      ]);
      const [sJson, lJson, hJson] = await Promise.all([
        statusRes.json(), latestRes.json(), historyRes.json(),
      ]);
      if (sJson.success) setStatus(sJson.data);
      if (lJson.success) setLatest(lJson.data);
      if (hJson.success) {
        setHistory(hJson.data.items);
        setPagination(hJson.data.pagination);
      }
      setPage(p);
    } catch {
      addToast('error', '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleManualCheck() {
    if (!confirm('메일 확인을 수동으로 실행하시겠습니까?')) return;
    setTriggering(true);
    try {
      const res = await fetch('/api/mail/check', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        addToast('success', '메일 확인이 시작되었습니다.');
      } else {
        addToast('error', json.message ?? '실행에 실패했습니다.');
      }
    } catch {
      addToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setTriggering(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-5 bg-gray-200 rounded animate-pulse w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const isImapReady = status?.mail.imapConfigured && status?.mail.passwordConfigured;
  const isApiReady = status?.analysis.apiKeyConfigured;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        {isAdmin && (
          <button
            onClick={handleManualCheck}
            disabled={triggering}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {triggering && <Spinner size="sm" />}
            {triggering ? '실행 중...' : '메일 확인 실행'}
          </button>
        )}
      </div>

      {/* 미설정 경고 배너 */}
      {(!isImapReady || !isApiReady) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <strong>설정 필요:</strong>{' '}
          {!isImapReady && 'IMAP 메일 서버 설정이 완료되지 않았습니다. '}
          {!isApiReady && 'Gemini API 키가 설정되지 않았습니다. '}
          {isAdmin ? (
            <a href="/settings" className="underline font-medium hover:text-yellow-900">환경설정으로 이동</a>
          ) : (
            '관리자에게 문의하세요.'
          )}
        </div>
      )}

      {/* 서비스 상태 카드 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">서비스 상태</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatusCard
            label="스케줄러"
            value={status?.scheduler.status === 'running' ? '실행 중' : '중지됨'}
            badge={status?.scheduler.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
          />
          <StatusCard
            label="메일 서버"
            value={isImapReady ? '설정됨' : '미설정'}
            badge={isImapReady ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-600'}
          />
          <StatusCard
            label="AI API 키"
            value={isApiReady ? '설정됨' : '미설정'}
            badge={isApiReady ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-600'}
          />
          <StatusCard
            label="마지막 실행"
            value={status?.mail.lastRunAt ? formatDate(status.mail.lastRunAt) : '없음'}
            badge="bg-gray-100 text-gray-600"
          />
        </div>
        {status?.mail.lastRunAt && (
          <p className="mt-3 text-xs text-gray-500">
            마지막 실행 결과: {status.mail.lastRunStatus} / 메일 {status.mail.lastRunMailCount ?? 0}건
          </p>
        )}
      </section>

      {/* 최신 분석 결과 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">최신 분석 결과</h2>
        {latest ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">{latest.mailSubject ?? '(제목 없음)'}</p>
                <p className="text-xs text-gray-500 mt-0.5">수신: {formatDate(latest.mailReceivedAt)} · 분석 완료: {formatDate(latest.analyzedAt)}</p>
              </div>
              <StatusBadge status={latest.status} />
            </div>
            {latest.summary && (
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{latest.summary}</p>
            )}
            {latest.actionItems && (() => {
              try {
                const items: string[] = JSON.parse(latest.actionItems!);
                return (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">후속 작업</p>
                    <ul className="space-y-1">
                      {items.map((item, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-indigo-400">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              } catch { return null; }
            })()}
            <p className="text-xs text-gray-500">추출 용어 {latest.extractedTermCount ?? 0}개</p>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">아직 분석된 메일이 없습니다.</p>
        )}
      </section>

      {/* 분석 이력 */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">분석 이력</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">분석 이력이 없습니다.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">메일 제목</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">수신일</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">용어 수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{item.mailSubject ?? '(제목 없음)'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell whitespace-nowrap">{formatDate(item.mailReceivedAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{item.extractedTermCount ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">전체 {pagination.total}건</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadAll(page - 1)}
                    disabled={page <= 1}
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
                  >
                    이전
                  </button>
                  <span className="text-xs text-gray-600">{page} / {pagination.totalPages}</span>
                  <button
                    onClick={() => loadAll(page + 1)}
                    disabled={page >= pagination.totalPages}
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function StatusCard({ label, value, badge }: { label: string; value: string; badge: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>{value}</span>
    </div>
  );
}
