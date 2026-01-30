import { Card, H2, Paragraph, XStack, YStack, Button } from 'tamagui';

const cards = [
  {
    title: 'Placeholder dApp One',
    meta: 'New on Seeker · Category placeholder',
  },
  {
    title: 'Placeholder dApp Two',
    meta: 'Recently migrated (iOS) · Category placeholder',
  },
  {
    title: 'Placeholder dApp Three',
    meta: 'Upcoming release · Recently migrated (Android)',
  },
];

export default function Featured() {
  return (
    <YStack flex={1} padding="$5" gap="$4">
      <H2>Featured dApps</H2>
      <Paragraph opacity={0.85}>
        Value-add discovery for developers: new on Seeker, migrations, upcoming releases, trending.
      </Paragraph>

      {cards.map((c) => (
        <Card key={c.title} padded elevate>
          <YStack gap="$2">
            <Paragraph fontWeight="700">{c.title}</Paragraph>
            <Paragraph opacity={0.8}>{c.meta}</Paragraph>
            <XStack gap="$2" flexWrap="wrap">
              <Button theme="active" disabled>
                Open
              </Button>
              <Button chromeless disabled>
                Learn more
              </Button>
            </XStack>
          </YStack>
        </Card>
      ))}
    </YStack>
  );
}
