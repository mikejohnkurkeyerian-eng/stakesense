import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container mx-auto px-6 py-24 max-w-xl text-center">
      <div className="text-6xl font-bold text-slate-300 mb-2">404</div>
      <h1 className="text-2xl font-semibold mb-3">Not found</h1>
      <p className="text-slate-600 mb-6">
        The page you are looking for doesn&apos;t exist. The validator may have
        been deactivated, or the link is wrong.
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          href="/"
          className="px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
        >
          Home
        </Link>
        <Link
          href="/validators"
          className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
        >
          Browse validators
        </Link>
      </div>
    </main>
  );
}
