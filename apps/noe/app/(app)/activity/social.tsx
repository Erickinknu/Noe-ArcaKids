import { CategoryActivityScreen } from '@/features/activity/components/category-activity-screen';

export default function SocialActivityScreen() {
  return (
    <CategoryActivityScreen
      title="Redes sociales"
      category="social"
      icon="💬"
      description="Uso de redes sociales de tu hijo en los últimos 7 días."
      emptyTitle="Aún no hay datos de redes sociales"
      emptyDescription="El uso de redes sociales aparecerá aquí cuando el dispositivo de tu hijo reporte esta información."
    />
  );
}