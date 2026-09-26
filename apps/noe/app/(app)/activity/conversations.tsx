import { CategoryActivityScreen } from '@/features/activity/components/category-activity-screen';

export default function ConversationsActivityScreen() {
  return (
    <CategoryActivityScreen
      title="Mensajería"
      category="conversations"
      icon="chat"
      description="Uso de apps de mensajería en los últimos 7 días."
      emptyTitle="Aún no hay datos de mensajería"
      emptyDescription="La actividad de mensajería aparecerá aquí cuando el dispositivo de tu hijo reporte esta información."
    />
  );
}