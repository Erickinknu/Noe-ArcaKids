import { CategoryActivityScreen } from '@/features/activity/components/category-activity-screen';

export default function YoutubeActivityScreen() {
  return (
    <CategoryActivityScreen
      title="YouTube - Videos vistos"
      category="youtube"
      icon="🎬"
      description="Videos que tu hijo ha visto en YouTube en los últimos 7 días."
      emptyTitle="No hay datos de YouTube"
      emptyDescription="Aún no hay registro de videos vistos en los últimos 7 días."
    />
  );
}