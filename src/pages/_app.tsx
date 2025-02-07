import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  trustWallet,
  coinbaseWallet,
  walletConnectWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import type { AppProps } from 'next/app';
import { WagmiProvider } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Link from 'next/link'; // Import Link from Next.js
// import Admin from './Admin'; // Remove or uncomment if needed
import { useRouter } from 'next/router'; // Import useRouter from Next.js
import styles from '../styles/Home.module.css';

const projectId = 'YOUR_WALLETCONNECT_PROJECT_ID'; // Get from https://cloud.walletconnect.com

// Create wagmi config using RainbowKit's getDefaultConfig
const config = getDefaultConfig({
  appName: 'Unity Token App',
  projectId,
  chains: [mainnet],
  ssr: true,
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        injectedWallet,
        metaMaskWallet,
        coinbaseWallet,
      ]
    },
    {
      groupName: 'Other Wallets',
      wallets: [
        trustWallet,
        walletConnectWallet,
      ]
    }
  ]
});

// Create React Query client
const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter(); // Get the router instance

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div>
            <nav className={styles.navbar}>
              <Link href="/" passHref>
                <span className={styles.navLink}>Home</span>
              </Link>
              {/* <Link href="/admin" passHref>
                <span className={styles.navLink}>Admin</span>
              </Link> */}
            </nav>
            <Component {...pageProps} />
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
