'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCategoryColor, getCategoryLabel } from '@/lib/utils/category';
import { formatDate } from '@/lib/utils/date';

interface TermDetail {
  id: string;
  name: string;
  category: string | null;
  description: string;
  frequency: number;
  createdAt: string;
  updatedAt: string;
}

interface SourceFile {
  id: string;
  mailFileName: string;
  mailSubject: string | null;
  mailReceivedAt: string | null;
}

export default function TermDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [term, setTerm] = useState<TermDetail | null>(null);
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/dictionary/terms/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setTerm(json.data.term);
          setSources(json.data.sources);
        } else if (json.message?.includes('찾을 수 없')) {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !term) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">요청하신 용어를 찾을 수 없습니다.</p>
        <Link href="/dictionary" className="text-indigo-600 hover:underline">
          용어사전으로 돌아가기
        </Link>
      </div>
    );
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

      {/* 용어 기본 정보 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{term.name}</h1>
          <span className={`shrink-0 text-sm px-3 py-1 rounded-full font-medium ${getCategoryColor(term.category)}`}>
            {getCategoryLabel(term.category)}
          </span>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-6">
          <div>
            <dt className="text-gray-500 text-xs mb-0.5">등장 빈도</dt>
            <dd className="font-medium text-gray-900">{term.frequency}회</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs mb-0.5">최초 추출일</dt>
            <dd className="font-medium text-gray-900">{formatDate(term.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs mb-0.5">최근 갱신일</dt>
            <dd className="font-medium text-gray-900">{formatDate(term.updatedAt)}</dd>
          </div>
        </dl>

        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">해설</h2>
          <p className="text-gray-800 leading-relaxed whitespace-pre-line">{term.description}</p>
        </div>
      </section>

      {/* 출처 메일 목록 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          출처 메일 <span className="text-gray-400 text-sm font-normal">({sources.length}건)</span>
        </h2>
        {sources.length === 0 ? (
          <p className="text-gray-400 text-sm">출처 메일 정보가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sources.map((s) => (
              <li key={s.id} className="py-3">
                <p className="text-sm font-medium text-gray-900">{s.mailSubject ?? '(제목 없음)'}</p>
                <p className="text-xs text-gray-500 mt-0.5">수신: {formatDate(s.mailReceivedAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
