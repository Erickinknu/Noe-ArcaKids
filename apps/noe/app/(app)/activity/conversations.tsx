import { CategoryActivityScreen } from '@/features/activity/components/category-activity-screen';

export default function ConversationsActivityScreen() {
  return (
    <CategoryActivityScreen
      title="Conversaciones"
      category="conversations"
      icon="✉️"
      description="Uso de apps de mensajería en los últimos 7 días."
      emptyTitle="Aún no hay datos de conversaciones"
      emptyDescription="La actividad de conversaciones aparecerá aquí cuando el dispositivo de tu hijo reporte esta información."
    />
  );
}