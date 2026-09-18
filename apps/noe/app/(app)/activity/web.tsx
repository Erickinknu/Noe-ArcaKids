import { CategoryActivityScreen } from '@/features/activity/components/category-activity-screen';

export default function WebActivityScreen() {
  return (
    <CategoryActivityScreen
      title="Navegadores web usados"
      category="web"
      icon="🌐"
      description="Tiempo de uso de las apps de navegación de tu hijo."
      emptyTitle="Aún no hay datos de uso de navegadores"
      emptyDescription="El tiempo de uso de las apps de navegación aparecerá aquí cuando el dispositivo de tu hijo reporte actividad."
    />
  );
}