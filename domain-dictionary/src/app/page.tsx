import { redirect } from 'next/navigation';

// Sprint 2에서 인증 미들웨어로 대체 예정
export default function Home() {
  redirect('/login');
}
