import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function ActivityScreen() {
  const { t: tr } = useTranslation();
  return (
    <PlaceholderScreen
      title={tr('noe.activity.title')}
      description={tr('noe.activity.description')}
    />
  );
}