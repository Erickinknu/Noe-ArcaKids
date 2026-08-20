import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';

import { ROUTES } from '@/constants';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';

export default function IndexScreen() {
  const [checking, setChecking] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    onboardingService
      .isCompleted()
      .then((result) => {
        setCompleted(result);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return null;
  }

  return <Redirect href={completed ? ROUTES.app : ROUTES.onboarding} />;
}