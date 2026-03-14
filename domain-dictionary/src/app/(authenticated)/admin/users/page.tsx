'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast/toast-context';
import { Spinner } from '@/components/ui/Spinner';
import { validateUsername, validatePassword } from '@/lib/validators/auth';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  isActive: number;
  createdAt: string;
}

interface FormState {
  username: string;
  password: string;
  passwordConfirm: string;
  role: 'admin' | 'user';
}

const EMPTY_FORM: FormState = { username: '', password: '', passwordConfirm: '', role: 'user' };

export default function AdminUsersPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCurrentUser() {
    try {
      const res = await fetch('/api/auth/me');
      const json = await res.json();
      if (json.success) setCurrentUserId(json.data.userId);
    } catch { /* 무시 */ }
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.status === 403) { setForbidden(true); return; }
      const json = await res.json();
      if (json.success) setUsers(json.data.items);
    } catch {
      addToast('error', '사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function validateForm(): boolean {
    const errors: Partial<FormState> = {};
    const usernameError = validateUsername(form.username);
    if (usernameError) errors.username = usernameError;
    const passwordError = validatePassword(form.password);
    if (passwordError) errors.password = passwordError;
    if (form.password !== form.passwordConfirm) errors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password, role: form.role }),
      });
      const json = await res.json();
      if (json.success) {
        addToast('success', `사용자 '${form.username}'이 등록되었습니다.`);
        setForm(EMPTY_FORM);
        setFormErrors({});
        setShowForm(false);
        await fetchUsers();
      } else {
        addToast('error', json.message ?? '등록에 실패했습니다.');
      }
    } catch {
      addToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        addToast('success', '사용자가 삭제되었습니다.');
        await fetchUsers();
      } else {
        addToast('error', json.message ?? '삭제에 실패했습니다.');
      }
    } catch {
      addToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
        ))}
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
    <div className="max-w-4xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
        <button
          onClick={() => { setShowForm(!showForm); setForm(EMPTY_FORM); setFormErrors({}); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? '취소' : '사용자 등록'}
        </button>
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">신규 사용자 등록</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {formErrors.username && <p className="text-xs text-red-500 mt-1">{formErrors.username}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as 'admin' | 'user' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="user">사용자</option>
                <option value="admin">관리자</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {formErrors.password && <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
              <input
                type="password"
                value={form.passwordConfirm}
                onChange={(e) => setForm((p) => ({ ...p, passwordConfirm: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {formErrors.passwordConfirm && <p className="text-xs text-red-500 mt-1">{formErrors.passwordConfirm}</p>}
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {submitting && <Spinner size="sm" />}
            {submitting ? '등록 중...' : '등록'}
          </button>
        </form>
      )}

      {/* 사용자 목록 */}
      {users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">등록된 사용자가 없습니다.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">아이디</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">역할</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">등록일</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {user.role === 'admin' ? '관리자' : '사용자'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {user.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.id === currentUserId ? (
                      <span className="text-xs text-gray-400">본인</span>
                    ) : confirmDeleteId === user.id ? (
                      <span className="flex items-center justify-end gap-2">
                        <span className="text-xs text-gray-600">삭제하시겠습니까?</span>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={!!deletingId}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingId === user.id ? <Spinner size="sm" /> : '확인'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          취소
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(user.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
