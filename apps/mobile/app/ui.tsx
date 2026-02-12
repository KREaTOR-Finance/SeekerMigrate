import { ReactNode, useEffect, useMemo, useRef, type ComponentProps } from 'react';
import { Animated } from 'react-native';
import { Button, Card, H2, Paragraph, Separator, YStack } from 'tamagui';

import { triggerHaptic, type HapticIntent } from '../src/onboarding/feedback';
import { ONBOARDING_MOTION, useReducedMotionEnabled } from '../src/onboarding/motion';

type FlowScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function FlowScreen({ title, subtitle, children }: FlowScreenProps) {
  const reducedMotion = useReducedMotionEnabled();
  const enterOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const enterOffset = useRef(new Animated.Value(reducedMotion ? 0 : ONBOARDING_MOTION.screenTranslateY)).current;

  useEffect(() => {
    if (reducedMotion) return;

    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: ONBOARDING_MOTION.screenEnterMs,
        useNativeDriver: true,
      }),
      Animated.timing(enterOffset, {
        toValue: 0,
        duration: ONBOARDING_MOTION.screenEnterMs,
        useNativeDriver: true,
      }),
    ]).start();
  }, [enterOffset, enterOpacity, reducedMotion]);

  return (
    <Animated.View style={{ flex: 1, opacity: enterOpacity, transform: [{ translateY: enterOffset }] }}>
      <YStack flex={1} padding="$5" gap="$4" backgroundColor="$background">
        <YStack gap="$2">
          <H2 accessibilityRole="header">{title}</H2>
          {subtitle ? <Paragraph color="$gray11">{subtitle}</Paragraph> : null}
        </YStack>
        <Separator borderColor="$gray6" />
        {children}
      </YStack>
    </Animated.View>
  );
}

type StateNoticeProps = {
  title: string;
  body: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger';
  children?: ReactNode;
};

const TONE_COLORS: Record<NonNullable<StateNoticeProps['tone']>, string> = {
  neutral: '$gray8',
  positive: '$green8',
  warning: '$yellow8',
  danger: '$red8',
};

export function StateNotice({ title, body, tone = 'neutral', children }: StateNoticeProps) {
  const reducedMotion = useReducedMotionEnabled();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducedMotion || tone === 'neutral') return;

    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.01,
        duration: ONBOARDING_MOTION.emphasizeMs,
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: ONBOARDING_MOTION.emphasizeMs,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulse, reducedMotion, tone]);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Card bordered padding="$4" borderColor={TONE_COLORS[tone]}>
        <YStack gap="$2">
          <Paragraph fontWeight="700">{title}</Paragraph>
          <Paragraph color="$gray11">{body}</Paragraph>
          {children}
        </YStack>
      </Card>
    </Animated.View>
  );
}

type ActionButtonProps = ComponentProps<typeof Button> & {
  haptic?: HapticIntent;
};

export function ActionButton({ haptic = 'impact-light', onPress, pressStyle, ...props }: ActionButtonProps) {
  const reducedMotion = useReducedMotionEnabled();
  const mergedPressStyle = useMemo(
    () => ({
      ...(reducedMotion ? {} : { scale: ONBOARDING_MOTION.ctaPressScale }),
      opacity: 0.96,
      ...(pressStyle as object),
    }),
    [pressStyle, reducedMotion]
  );

  return (
    <Button
      {...props}
      pressStyle={mergedPressStyle}
      onPress={(event) => {
        void triggerHaptic(haptic);
        onPress?.(event);
      }}
    />
  );
}
