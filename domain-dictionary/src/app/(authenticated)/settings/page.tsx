'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast/toast-context';
import { Spinner } from '@/components/ui/Spinner';

interface ConfigData {
  mail: {
    imapHost: string | null;
    imapPort: number | null;
    imapUsername: string | null;
    useSsl: boolean;
    checkInterval: number | null;
    passwordConfigured: boolean;
  };
  analysis: {
    model: string | null;
    apiKeyConfigured: boolean;
  };
}

interface FormState {
  imapHost: string;
  imapPort: string;
  imapUsername: string;
  useSsl: boolean;
  checkIntervalMin: string; // 분 단위 (화면 표시)
  analysisModel: string;
}

export default function SettingsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [form, setForm] = useState<FormState>({
    imapHost: '',
    imapPort: '',
    imapUsername: '',
    useSsl: true,
    checkIntervalMin: '',
    analysisModel: '',
  });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/config');
      if (res.status === 403) { setForbidden(true); return; }
      const json = await res.json();
      if (json.success) {
        const data: ConfigData = json.data;
        setConfig(data);
        setForm({
          imapHost: data.mail.imapHost ?? '',
          imapPort: data.mail.imapPort?.toString() ?? '',
          imapUsername: data.mail.imapUsername ?? '',
          useSsl: data.mail.useSsl,
          checkIntervalMin: data.mail.checkInterval ? String(Math.round(data.mail.checkInterval / 60000)) : '',
          analysisModel: data.analysis.model ?? '',
        });
      }
    } catch {
      addToast('error', '설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }

  function handleCancel() {
    if (!config) return;
    setForm({
      imapHost: config.mail.imapHost ?? '',
      imapPort: config.mail.imapPort?.toString() ?? '',
      imapUsername: config.mail.imapUsername ?? '',
      useSsl: config.mail.useSsl,
      checkIntervalMin: config.mail.checkInterval ? String(Math.round(config.mail.checkInterval / 60000)) : '',
      analysisModel: config.analysis.model ?? '',
    });
    setIsDirty(false);
  }

  async function handleSave() {
    // 클라이언트 유효성 검사
    if (form.imapPort && (isNaN(Number(form.imapPort)) || Number(form.imapPort) < 1 || Number(form.imapPort) > 65535)) {
      addToast('error', 'IMAP 포트는 1~65535 사이의 정수여야 합니다.');
      return;
    }
    if (form.checkIntervalMin && (isNaN(Number(form.checkIntervalMin)) || Number(form.checkIntervalMin) < 1)) {
      addToast('error', '메일 확인 주기는 1분 이상이어야 합니다.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mail: {
            imapHost: form.imapHost || undefined,
            imapPort: form.imapPort ? Number(form.imapPort) : undefined,
            imapUsername: form.imapUsername || undefined,
            useSsl: form.useSsl,
            checkInterval: form.checkIntervalMin ? Number(form.checkIntervalMin) * 60000 : undefined,
          },
          analysis: {
            model: form.analysisModel || undefined,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        addToast('success', '설정이 저장되었습니다.');
        setIsDirty(false);
        await fetchConfig();
      } else {
        addToast('error', json.message ?? '저장에 실패했습니다.');
      }
    } catch {
      addToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestMail() {
    setTesting(true);
    try {
      const res = await fetch('/api/config/test-mail', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data?.connected) {
        addToast('success', `메일 서버 연결 성공 (미확인 메일: ${json.data.unseenCount}개)`);
      } else {
        addToast('error', `연결 실패: ${json.data?.error ?? json.message ?? '알 수 없는 오류'}`);
      }
    } catch {
      addToast('error', '연결 테스트 중 오류가 발생했습니다.');
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
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

      {/* 메일 서버 섹션 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-800">메일 서버 설정</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">IMAP 호스트</label>
          <input
            type="text"
            value={form.imapHost}
            onChange={(e) => handleChange('imapHost', e.target.value)}
            placeholder="imap.gmail.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">포트</label>
          <input
            type="number"
            value={form.imapPort}
            onChange={(e) => handleChange('imapPort', e.target.value)}
            placeholder="993"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
          <input
            type="text"
            value={form.imapUsername}
            onChange={(e) => handleChange('imapUsername', e.target.value)}
            placeholder="user@example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">SSL/TLS 사용</label>
          <button
            type="button"
            onClick={() => handleChange('useSsl', !form.useSsl)}
            className={`relative w-10 h-6 rounded-full transition-colors ${form.useSsl ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.useSsl ? 'translate-x-4' : ''}`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 상태</label>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              config?.mail.passwordConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {config?.mail.passwordConfigured ? '환경변수 설정됨' : '미설정 (MAIL_PASSWORD 환경변수 필요)'}
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">메일 확인 주기 (분)</label>
          <input
            type="number"
            value={form.checkIntervalMin}
            onChange={(e) => handleChange('checkIntervalMin', e.target.value)}
            placeholder="60"
            min={1}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={handleTestMail}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {testing && <Spinner size="sm" />}
          {testing ? '테스트 중...' : '연결 테스트'}
        </button>
      </section>

      {/* AI 분석 섹션 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-800">AI 분석 (Gemini API)</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">모델명</label>
          <input
            type="text"
            value={form.analysisModel}
            onChange={(e) => handleChange('analysisModel', e.target.value)}
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
          onClick={handleCancel}
          disabled={saving || !isDirty}
          className="px-6 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          취소
        </button>
      </div>
    </div>
  );
}
