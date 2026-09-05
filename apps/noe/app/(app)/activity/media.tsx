import { CategoryActivityScreen } from '@/features/activity/components/category-activity-screen';

export default function MediaActivityScreen() {
  return (
    <CategoryActivityScreen
      title="Imágenes y videos recibidos"
      category="media"
      icon="🖼️"
      description="Uso de apps de fotos, vídeo y multimedia en los últimos 7 días."
      emptyTitle="Aún no hay datos multimedia"
      emptyDescription="La actividad multimedia aparecerá aquí cuando el dispositivo de tu hijo reporte esta información."
    />
  );
}