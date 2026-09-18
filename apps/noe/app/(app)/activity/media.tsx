import { CategoryActivityScreen } from '@/features/activity/components/category-activity-screen';

export default function MediaActivityScreen() {
  return (
    <CategoryActivityScreen
      title="Fotos, video y música"
      category="media"
      icon="🖼️"
      description="Uso de apps de fotos, video y multimedia en los últimos 7 días."
      emptyTitle="Aún no hay datos multimedia"
      emptyDescription="La actividad multimedia aparecerá aquí cuando el dispositivo de tu hijo reporte esta información."
    />
  );
}