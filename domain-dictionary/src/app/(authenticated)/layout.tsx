import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GNB } from '@/components/layout/GNB';
import { ToastProvider } from '@/lib/toast/toast-context';
import { ToastContainer } from '@/components/ui/Toast';
import { sessionOptions, type SessionData } from '@/lib/auth/session';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.userId) {
    redirect('/login');
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <GNB username={session.username} role={session.role} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
      <ToastContainer />
    </ToastProvider>
  );
}
