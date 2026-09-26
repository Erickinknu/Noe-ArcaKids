import { CategoryActivityScreen } from '@/features/activity/components/category-activity-screen';

export default function YoutubeActivityScreen() {
  return (
    <CategoryActivityScreen
      title="YouTube"
      category="youtube"
      icon="play-circle"
      description="Tiempo de uso de las apps de YouTube y YouTube Music en los últimos 7 días."
      emptyTitle="No hay datos de YouTube"
      emptyDescription="El tiempo de uso de YouTube aparecerá aquí cuando el dispositivo de tu hijo reporte actividad."
    />
  );
}