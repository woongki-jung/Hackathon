'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCategoryColor, getCategoryLabel } from '@/lib/utils/category';
import { formatDate } from '@/lib/utils/date';

interface AnalysisDetail {
  id: string;
  fileName: string;
  mailSubject: string | null;
  mailReceivedAt: string | null;
  status: string;
  summary: string | null;
  actionItems: string | null;
  extractedTermCount: number | null;
  analyzedAt: string | null;
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
}

interface ExtractedTerm {
  id: string;
  name: string;
  category: string | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  completed: { label: '완료', cls: 'bg-green-100 text-green-700' },
  failed: { label: '실패', cls: 'bg-red-100 text-red-600' },
  processing: { label: '처리 중', cls: 'bg-blue-100 text-blue-600' },
  pending: { label: '대기 중', cls: 'bg-yellow-100 text-yellow-600' },
};

export default function WorkDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<AnalysisDetail | null>(null);
  const [extractedTerms, setExtractedTerms] = useState<ExtractedTerm[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/analysis/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setItem(json.data.item);
          setExtractedTerms(json.data.extractedTerms);
        } else if (json.message?.includes('찾을 수 없')) {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCheck(index: number) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-4 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">요청하신 분석 항목을 찾을 수 없습니다.</p>
        <Link href="/dashboard" className="text-indigo-600 hover:underline">
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  const badge = STATUS_BADGE[item.status] ?? { label: item.status, cls: 'bg-gray-100 text-gray-600' };

  let actionItemList: string[] = [];
  if (item.actionItems) {
    try {
      actionItemList = JSON.parse(item.actionItems);
    } catch { /* 파싱 실패 시 빈 배열 */ }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        ← 뒤로가기
      </button>

      {/* 메일 기본 정보 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h1 className="text-xl font-bold text-gray-900">{item.mailSubject ?? '(제목 없음)'}</h1>
          <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-gray-500 text-xs mb-0.5">메일 수신일</dt>
            <dd className="font-medium text-gray-900">{formatDate(item.mailReceivedAt)}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs mb-0.5">분석 완료일</dt>
            <dd className="font-medium text-gray-900">{formatDate(item.analyzedAt)}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs mb-0.5">추출 용어 수</dt>
            <dd className="font-medium text-gray-900">{extractedTerms.length}개</dd>
          </div>
        </dl>

        {item.errorMessage && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <strong>오류:</strong> {item.errorMessage}
          </div>
        )}
      </section>

      {/* AI 요약 */}
      {item.summary && (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">AI 요약</h2>
          <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">{item.summary}</p>
        </section>
      )}

      {/* 후속 작업 (액션 아이템) */}
      {actionItemList.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">후속 작업</h2>
          <p className="text-xs text-gray-400 mb-3">항목을 클릭하면 완료로 표시됩니다.</p>
          <ul className="space-y-2">
            {actionItemList.map((action, i) => (
              <li
                key={i}
                onClick={() => toggleCheck(i)}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <span
                  className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    checkedItems.has(i)
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-300 group-hover:border-indigo-400'
                  }`}
                >
                  {checkedItems.has(i) && (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 8">
                      <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm text-gray-700 ${checkedItems.has(i) ? 'line-through text-gray-400' : ''}`}>
                  {action}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 추출 용어 목록 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          추출된 용어{' '}
          <span className="text-gray-400 text-sm font-normal">({extractedTerms.length}개)</span>
        </h2>
        {extractedTerms.length === 0 ? (
          <p className="text-gray-400 text-sm">추출된 용어가 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {extractedTerms.map((term) => (
              <Link
                key={term.id}
                href={`/dictionary/${term.id}`}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium hover:opacity-80 transition-opacity ${getCategoryColor(term.category)}`}
              >
                {term.name}
                <span className="text-xs opacity-60">({getCategoryLabel(term.category)})</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
