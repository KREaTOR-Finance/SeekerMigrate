// Expo Router + Solana web3 polyfills (Expo SDK 49+ compatible pattern)
import { getRandomValues as expoCryptoGetRandomValues } from 'expo-crypto';
import { Buffer } from 'buffer';
import 'react-native-get-random-values';

global.Buffer = Buffer;

class Crypto {
  getRandomValues = expoCryptoGetRandomValues;
}

const webCrypto = typeof crypto !== 'undefined' ? crypto : new Crypto();

(() => {
  if (typeof crypto === 'undefined') {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      enumerable: true,
      get: () => webCrypto,
    });
  }
})();

// Reanimated must be loaded before routing
import 'react-native-reanimated';

import 'expo-router/entry';
