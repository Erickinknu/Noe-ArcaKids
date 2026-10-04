export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-xl font-semibold">NOE Admin</h1>
        <p className="text-sm text-gray-600 mt-1">Inicia sesión para continuar</p>
        <a href="/dashboard" className="mt-4 inline-flex items-center justify-center w-full h-10 rounded-md bg-blue-600 text-white text-sm">
          Ir al dashboard
        </a>
      </div>
    </main>
  );
}