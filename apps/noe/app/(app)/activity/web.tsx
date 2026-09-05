import { CategoryActivityScreen } from '@/features/activity/components/category-activity-screen';

export default function WebActivityScreen() {
  return (
    <CategoryActivityScreen
      title="Páginas web visitadas"
      category="web"
      icon="🌐"
      description="Sitios web que ha visitado tu hijo recientemente."
      emptyTitle="Aún no hay datos de páginas web"
      emptyDescription="El historial de navegación aparecerá aquí cuando el dispositivo de tu hijo reporte esta información."
    />
  );
}