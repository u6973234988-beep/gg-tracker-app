import { redirect } from 'next/navigation';

/**
 * Pagina root che reindirizza al dashboard
 */
export default function Home() {
  redirect('/dashboard');
}
