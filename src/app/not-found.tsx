import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F11]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#F8F8FF] mb-4">404</h1>
        <p className="text-[#80808A] mb-8 text-lg">Pagina non trovata</p>
        <Link
          href="/"
          className="inline-block bg-[#46265F] hover:bg-[#6A3D8F] text-[#F8F8FF] px-6 py-3 rounded-lg transition-colors shadow-[0_0_20px_rgba(106,61,143,0.3)]"
        >
          Torna alla home
        </Link>
      </div>
    </div>
  );
}
