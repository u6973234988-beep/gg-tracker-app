import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0a0f]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">Pagina non trovata</p>
        <Link
          href="/"
          className="inline-block bg-[#7F00FF] hover:bg-[#6b00d9] text-white px-6 py-3 rounded-lg transition-colors"
        >
          Torna alla home
        </Link>
      </div>
    </div>
  );
}
