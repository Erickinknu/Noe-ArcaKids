import { Redirect } from 'expo-router';

import { ROUTES } from '@/constants';

export default function IndexScreen() {
  return <Redirect href={ROUTES.onboarding} />;
}