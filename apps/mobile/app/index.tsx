import { Redirect } from 'expo-router';

// Entry point: always start at the disclaimer gate.
export default function Index() {
  return <Redirect href="/disclosure" />;
}
