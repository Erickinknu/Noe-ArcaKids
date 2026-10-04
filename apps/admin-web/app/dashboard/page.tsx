export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-600">Usuarios, familias, conexiones padre-hijo, suscripciones y soporte</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg border p-4 shadow-sm"><p className="text-xs text-gray-500">Usuarios activos</p><p className="text-2xl font-semibold mt-1">—</p></div>
        <div className="bg-white rounded-lg border p-4 shadow-sm"><p className="text-xs text-gray-500">Familias</p><p className="text-2xl font-semibold mt-1">—</p></div>
        <div className="bg-white rounded-lg border p-4 shadow-sm"><p className="text-xs text-gray-500">Hijos vinculados</p><p className="text-2xl font-semibold mt-1">—</p></div>
        <div className="bg-white rounded-lg border p-4 shadow-sm"><p className="text-xs text-gray-500">Suscripciones activas</p><p className="text-2xl font-semibold mt-1">—</p></div>
      </div>
      <nav className="flex flex-wrap gap-2">
        <a className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50" href="/dashboard/users">Usuarios</a>
        <a className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50" href="/dashboard/families">Familias / Conexiones</a>
        <a className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50" href="/dashboard/subscriptions">Suscripciones</a>
        <a className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50" href="/dashboard/support">Soporte</a>
      </nav>
    </div>
  );
}