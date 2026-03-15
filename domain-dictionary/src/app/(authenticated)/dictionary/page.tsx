'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { getCategoryColor, getCategoryLabel, VALID_CATEGORIES } from '@/lib/utils/category';

interface TermItem {
  id: string;
  name: string;
  category: string | null;
  description: string;
  frequency: number;
  updatedAt: string;
  snippet: string | null;
}

// FTS5 snippet의 [[...]] 마커를 <strong>으로 변환
function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\[\[.*?\]\])/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('[[') && part.endsWith(']]') ? (
          <strong key={i} className="font-semibold text-indigo-700">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

interface TrendItem {
  id: string;
  name: string;
  category: string | null;
  frequency: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function DictionaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') ?? '1', 10));

  const [results, setResults] = useState<TermItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [trending, setTrending] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 트렌드 초기 로딩
  useEffect(() => {
    fetch('/api/dictionary/trending')
      .then((r) => r.json())
      .then((json) => { if (json.success) setTrending(json.data.items); })
      .finally(() => setTrendLoading(false));
  }, []);

  const search = useCallback(async (q: string, cat: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat) params.set('category', cat);
      params.set('page', String(p));

      const res = await fetch(`/api/dictionary/search?${params}`);
      const json = await res.json();
      if (json.success) {
        setResults(json.data.items);
        setPagination(json.data.pagination);
      }

      // URL 동기화
      const urlParams = new URLSearchParams();
      if (q) urlParams.set('q', q);
      if (cat) urlParams.set('category', cat);
      if (p > 1) urlParams.set('page', String(p));
      router.replace(`/dictionary?${urlParams.toString()}`, { scroll: false });
    } finally {
      setLoading(false);
    }
  }, [router]);

  // 검색어/카테고리 변경 시 디바운스 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      search(query, category, 1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category]);

  function handlePageChange(p: number) {
    setPage(p);
    search(query, category, p);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">용어사전</h1>

      {/* 검색 입력 */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="용어를 검색하세요"
          autoFocus
          className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner size="sm" className="text-indigo-500" />
          </span>
        )}
      </div>

      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${category === '' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          전체
        </button>
        {VALID_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${category === cat ? 'bg-indigo-600 text-white' : `${getCategoryColor(cat)} hover:opacity-80`}`}
          >
            {getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* 검색 결과 */}
      {query ? (
        <>
          {results.length === 0 && !loading ? (
            <p className="text-center text-gray-400 py-16">검색 결과가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {results.map((term) => (
                <Link
                  key={term.id}
                  href={`/dictionary/${term.id}`}
                  className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{term.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(term.category)}`}>
                          {getCategoryLabel(term.category)}
                        </span>
                      </div>
                      {term.snippet ? (
                        <p className="text-sm text-gray-600 leading-relaxed">
                          <HighlightedText text={term.snippet} />
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 leading-relaxed">{term.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-gray-400">빈도 {term.frequency}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">전체 {pagination.total}건</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
                >
                  이전
                </button>
                <span className="text-xs text-gray-600">{page} / {pagination.totalPages}</span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* 검색어 없음: 트렌드 표시 */
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">빈도 트렌드 TOP 10</h2>
          {trendLoading ? (
            <div className="flex gap-2 flex-wrap">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-7 w-20 bg-gray-100 rounded-full animate-pulse" />
              ))}
            </div>
          ) : trending.length === 0 ? (
            <p className="text-gray-400 text-sm">아직 등록된 용어가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {trending.map((t) => (
                <Link
                  key={t.id}
                  href={`/dictionary/${t.id}`}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium hover:opacity-80 transition-opacity ${getCategoryColor(t.category)}`}
                >
                  {t.name}
                  <span className="text-xs opacity-70">({t.frequency})</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function DictionaryPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner size="md" /></div>}>
      <DictionaryContent />
    </Suspense>
  );
}
