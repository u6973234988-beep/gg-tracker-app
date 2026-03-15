import { AuthProtectedLayout } from '@/components/layout/auth-protected-layout';

export const revalidate = 0;

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProtectedLayout>{children}</AuthProtectedLayout>;
}
