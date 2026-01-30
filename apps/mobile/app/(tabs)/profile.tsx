import { useState } from 'react';
import { Button, Card, H2, Input, Paragraph, Select, XStack, YStack } from 'tamagui';
import { postJson } from '../../src/config/api';

type NameLookupResponse = {
  name: string;
  onChainName: string;
  owner: string | null;
  available: boolean;
};

export default function Profile() {
  const [name, setName] = useState('');
  const [cluster, setCluster] = useState<'mainnet-beta' | 'devnet' | 'testnet'>('mainnet-beta');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<NameLookupResponse | null>(null);

  async function lookup() {
    setStatus('');
    setResult(null);
    try {
      if (!name.trim()) throw new Error('Enter a name');
      setStatus('Resolving name owner...');
      // cluster is placeholder for now; backend is mainnet-only currently.
      const data = await postJson<NameLookupResponse>('/api/name/lookup', { name });
      setResult(data);
      setStatus(data.available ? 'Name is available (no owner)' : 'Owner resolved');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Lookup failed');
    }
  }

  return (
    <YStack flex={1} padding="$5" gap="$4">
      <H2>Profile badge</H2>
      <Paragraph opacity={0.85}>
        Lookup is name → owner → scan wallet for SeekerMigrate Profile Badge NFT (collection/creator). Scanning is next.
      </Paragraph>

      <Card padded elevate>
        <YStack gap="$3">
          <Paragraph fontWeight="700">Look up by name</Paragraph>
          <XStack gap="$3" flexWrap="wrap" alignItems="center">
            <Input flex={1} minWidth={220} value={name} onChangeText={setName} placeholder="yourname.skr" />
            <Select value={cluster} onValueChange={(v) => setCluster(v as any)}>
              <Select.Trigger width={160}>
                <Select.Value placeholder="Cluster" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item index={0} value="mainnet-beta">
                  <Select.ItemText>mainnet-beta</Select.ItemText>
                </Select.Item>
                <Select.Item index={1} value="devnet">
                  <Select.ItemText>devnet</Select.ItemText>
                </Select.Item>
                <Select.Item index={2} value="testnet">
                  <Select.ItemText>testnet</Select.ItemText>
                </Select.Item>
              </Select.Content>
            </Select>
          </XStack>
          <Button theme="active" onPress={lookup}>
            Resolve + find profile
          </Button>
          {status ? <Paragraph opacity={0.8}>{status}</Paragraph> : null}
          {result ? (
            <YStack gap="$2">
              <Paragraph opacity={0.8}>Display: {result.name}</Paragraph>
              <Paragraph opacity={0.8}>On-chain: {result.onChainName}</Paragraph>
              <Paragraph opacity={0.8}>Owner: {result.owner ?? '—'}</Paragraph>
            </YStack>
          ) : null}
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">Profile metadata</Paragraph>
          <Paragraph opacity={0.8}>Business-card metadata JSON (IPFS/Arweave) UI will be added next.</Paragraph>
        </YStack>
      </Card>
    </YStack>
  );
}
