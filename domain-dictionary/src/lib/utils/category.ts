// 용어 카테고리 유틸리티

export type TermCategory = 'emr' | 'business' | 'abbreviation' | 'general';

export const CATEGORY_LABELS: Record<string, string> = {
  emr: 'EMR',
  business: '비즈니스',
  abbreviation: '약어',
  general: '일반',
};

export const CATEGORY_COLORS: Record<string, string> = {
  emr: 'bg-blue-100 text-blue-700',
  business: 'bg-green-100 text-green-700',
  abbreviation: 'bg-orange-100 text-orange-700',
  general: 'bg-gray-100 text-gray-600',
};

export function getCategoryLabel(category: string | null): string {
  return CATEGORY_LABELS[category ?? ''] ?? '일반';
}

export function getCategoryColor(category: string | null): string {
  return CATEGORY_COLORS[category ?? ''] ?? CATEGORY_COLORS.general;
}

export const VALID_CATEGORIES: TermCategory[] = ['emr', 'business', 'abbreviation', 'general'];
