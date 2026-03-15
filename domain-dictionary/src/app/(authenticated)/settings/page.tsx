'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast/toast-context';
import { Spinner } from '@/components/ui/Spinner';

interface ConfigData {
  analysis: {
    model: string | null;
    apiKeyConfigured: boolean;
  };
}

interface Webhook {
  id: string;
  code: string;
  description: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [analysisModel, setAnalysisModel] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // 웹훅 관리 상태
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    setWebhooksLoading(true);
    try {
      const res = await fetch('/api/webhooks');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setWebhooks(json.data);
      }
    } catch { /* 무시 */ }
    finally { setWebhooksLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/config');
        if (res.status === 403) { setForbidden(true); return; }
        const json = await res.json();
        if (json.success) {
          setConfig(json.data);
          setAnalysisModel(json.data.analysis.model ?? '');
        }
      } catch {
        addToast('error', '설정을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
      await fetchWebhooks();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: { model: analysisModel || undefined } }),
      });
      const json = await res.json();
      if (json.success) {
        addToast('success', '설정이 저장되었습니다.');
        setIsDirty(false);
      } else {
        addToast('error', json.message ?? '저장에 실패했습니다.');
      }
    } catch {
      addToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateWebhook() {
    if (!newCode.trim() || !newDesc.trim()) {
      addToast('error', '코드와 설명을 모두 입력해주세요.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newCode.trim(), description: newDesc.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        addToast('success', '웹훅이 등록되었습니다.');
        setNewCode('');
        setNewDesc('');
        await fetchWebhooks();
      } else {
        addToast('error', json.message ?? '등록에 실패했습니다.');
      }
    } catch {
      addToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteWebhook(id: string) {
    if (!confirm('이 웹훅을 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        addToast('success', '웹훅이 삭제되었습니다.');
        await fetchWebhooks();
      } else {
        addToast('error', json.message ?? '삭제에 실패했습니다.');
      }
    } catch {
      addToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  }

  const webhookBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/` : '/api/webhook/';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">관리자만 접근할 수 있습니다.</p>
        <Link href="/dashboard" className="text-indigo-600 hover:underline">
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">환경설정</h1>

      {/* 웹훅 관리 섹션 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">웹훅 수신기 관리</h2>
          <p className="text-sm text-gray-500 mt-1">
            외부 서비스에서 분석 요청을 보낼 웹훅 엔드포인트를 등록합니다.
            엔드포인트: <code className="bg-gray-100 px-1 rounded text-xs">POST {webhookBaseUrl}{'<code>'}</code>
          </p>
        </div>

        {/* 등록 폼 */}
        <div className="flex gap-2 items-start">
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="코드 (예: mail-support)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="설명 (예: 고객지원 메일 분석)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleCreateWebhook}
            disabled={creating}
            className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
          >
            {creating && <Spinner size="sm" />}
            {creating ? '등록 중...' : '등록'}
          </button>
        </div>

        {/* 웹훅 목록 */}
        {webhooksLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : webhooks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">등록된 웹훅이 없습니다.</p>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {webhooks.map((wh) => (
              <div key={wh.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{wh.description}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    <code className="bg-gray-100 px-1 rounded">{webhookBaseUrl}{wh.code}</code>
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteWebhook(wh.id)}
                  disabled={deletingId === wh.id}
                  className="ml-3 text-xs text-red-500 hover:text-red-700 disabled:opacity-40 shrink-0"
                >
                  {deletingId === wh.id ? '삭제 중...' : '삭제'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI 분석 섹션 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-800">AI 분석 (Gemini API)</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">모델명</label>
          <input
            type="text"
            value={analysisModel}
            onChange={(e) => { setAnalysisModel(e.target.value); setIsDirty(true); }}
            placeholder="gemini-1.5-pro"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API 키 상태</label>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              config?.analysis.apiKeyConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {config?.analysis.apiKeyConfigured ? '환경변수 설정됨' : '미설정 (GEMINI_API_KEY 환경변수 필요)'}
          </span>
        </div>
      </section>

      {/* 저장/취소 버튼 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving && <Spinner size="sm" />}
          {saving ? '저장 중...' : '저장'}
        </button>
        <button
          onClick={() => { setAnalysisModel(config?.analysis.model ?? ''); setIsDirty(false); }}
          disabled={saving || !isDirty}
          className="px-6 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          취소
        </button>
      </div>
    </div>
  );
}
