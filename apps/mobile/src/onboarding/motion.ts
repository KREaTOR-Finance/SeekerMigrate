import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

export const ONBOARDING_MOTION = {
  screenEnterMs: 240,
  screenTranslateY: 10,
  emphasizeMs: 180,
  ctaPressScale: 0.985,
  minRoutingFeedbackMs: 120,
} as const;

export function useReducedMotionEnabled() {
  const [reducedMotionEnabled, setReducedMotionEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReducedMotionEnabled(value);
      })
      .catch(() => {
        if (mounted) setReducedMotionEnabled(false);
      });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotionEnabled);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reducedMotionEnabled;
}

export async function enforceMinFeedbackWindow(startedAt: number, minMs = ONBOARDING_MOTION.minRoutingFeedbackMs) {
  const elapsed = Date.now() - startedAt;
  if (elapsed >= minMs) return;
  await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
}
