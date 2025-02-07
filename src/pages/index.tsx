import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';
import { 
  useAccount, 
  useWriteContract, 
  useWatchContractEvent, 
  useChainId,
  useBalance,
  useEstimateGas,
  useToken
} from 'wagmi';
import { UNITY_TOKEN_ABI, UNITY_TOKEN_ADDRESS } from '../contracts/UnityToken';
import { useDebounce } from 'use-debounce';

const GAS_RESERVE_MULTIPLIER = 110n; // 10% buffer as BigInt (110/100)
const GAS_RESERVE_DIVISOR = 100n;
const MIN_PURCHASE_ETH = 0.05; // Minimum purchase amount in ETH

const Home: NextPage = () => {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [maxPurchaseAmount, setMaxPurchaseAmount] = useState('0');
  const [error, setError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [canPurchase, setCanPurchase] = useState(false);
  const [additionalEthRequired, setAdditionalEthRequired] = useState(0);

  // Debounce the maxPurchaseAmount to prevent frequent updates
  const [debouncedMaxPurchaseAmount] = useDebounce(maxPurchaseAmount, 500);

  // Get ETH balance
  const { data: ethBalance } = useBalance({
    address,
  });

  // Get UNT token info
  const { data: untToken } = useToken({
    address: UNITY_TOKEN_ADDRESS,
  });

  const { 
    writeContract,
    isPending: isLoading,
    isError: isWriteError,
    error: writeError 
  } = useWriteContract();

  // Estimate gas for the transaction using debounced value
  const { data: estimatedGas } = useEstimateGas({
    address: UNITY_TOKEN_ADDRESS,
    abi: UNITY_TOKEN_ABI,
    functionName: 'buyTokens',
    args: [[], []],
    value: parseEther(debouncedMaxPurchaseAmount || '0'),
    enabled: !!debouncedMaxPurchaseAmount && debouncedMaxPurchaseAmount !== '0',
  });

  // Calculate maximum purchase amount considering gas fees
  useEffect(() => {
    const calculateMaxPurchase = async () => {
      if (!ethBalance || !address) return;
      
      setIsCalculating(true);
      try {
        // Convert gas estimate to ETH with BigInt calculations
        const estimatedGasCost = estimatedGas 
          ? formatEther((estimatedGas * GAS_RESERVE_MULTIPLIER / GAS_RESERVE_DIVISOR).toString()) 
          : '0.01'; // Default gas estimate if not available

        // Calculate max ETH available for purchase
        const maxEth = Number(ethBalance.formatted) - Number(estimatedGasCost);
        
        // Ensure we have a positive amount
        const finalAmount = maxEth > 0 ? maxEth.toFixed(18) : '0';
        setMaxPurchaseAmount(finalAmount);
        
        // Set canPurchase based on the final amount
        setCanPurchase(Number(finalAmount) > MIN_PURCHASE_ETH);

        // Calculate additional ETH required
        const totalRequired = Number(estimatedGasCost) + MIN_PURCHASE_ETH;
        const currentBalance = Number(ethBalance.formatted);
        const additionalRequired = totalRequired - currentBalance;
        setAdditionalEthRequired(additionalRequired > 0 ? additionalRequired : 0);

        // Debugging logs
        console.log('Max Purchase Amount:', finalAmount);
        console.log('Can Purchase:', canPurchase);
        console.log('Estimated Gas Cost:', estimatedGasCost);
        console.log('Current ETH Balance:', ethBalance.formatted);
        console.log('Additional ETH Required:', additionalEthRequired);
      } catch (e) {
        setError('Error calculating maximum purchase amount');
        console.error('Calculation error:', e);
      }
      setIsCalculating(false);
    };

    calculateMaxPurchase();
  }, [ethBalance, address, estimatedGas]);

  // Watch for successful token purchase events
  useWatchContractEvent({
    address: UNITY_TOKEN_ADDRESS,
    abi: UNITY_TOKEN_ABI,
    eventName: 'TokensPurchased',
    onLogs() {
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 5000);
    },
  });

  const handleBuyTokens = async () => {
    setError('');
    setIsSuccess(false);
    
    if (!canPurchase) {
      setError('Insufficient funds for purchase');
      return;
    }
    
    if (chainId !== 1) {
      setError('Please connect to Ethereum Mainnet');
      return;
    }

    try {
      await writeContract({
        address: UNITY_TOKEN_ADDRESS,
        abi: UNITY_TOKEN_ABI,
        functionName: 'buyTokens',
        args: [[], []],
        value: parseEther(maxPurchaseAmount),
      });
    } catch (e) {
      setError('Transaction failed');
      console.error('Transaction error:', e);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Unity Token (UNT) - Purchase Interface</title>
        <meta content="Unity Token purchase interface" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Unity Token (UNT)</h1>

        <div className={styles.connect}>
          <ConnectButton />
        </div>

        {isConnected && (
          <div className={styles.purchaseContainer}>
            <h2>Maximum Purchase Amount</h2>
            
            <div className={styles.balanceInfo}>
              <p>Your ETH Balance: {ethBalance?.formatted || '0'} ETH</p>
              <p>Maximum Purchase: {maxPurchaseAmount} ETH</p>
              {estimatedGas && (
                <p>Estimated Gas: {formatEther(
                  (estimatedGas * GAS_RESERVE_MULTIPLIER / GAS_RESERVE_DIVISOR).toString()
                )} ETH</p>
              )}
              {additionalEthRequired > 0 && (
                <p style={{ color: 'red' }}>
                  Additional ETH Required: {additionalEthRequired.toFixed(6)} ETH
                </p>
              )}
            </div>

            <div className={styles.inputGroup}>
              <button
                onClick={handleBuyTokens}
                disabled={isLoading || isCalculating || maxPurchaseAmount === '0'}
                className={styles.buyButton}
              >
                {isLoading ? 'Purchasing...' : isCalculating ? 'Calculating...' : 'Buy Maximum Tokens'}
              </button>
            </div>
            
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}
            
            {isWriteError && (
              <div className={styles.error}>
                {writeError?.message || 'Transaction failed'}
              </div>
            )}

            {isSuccess && (
              <div className={styles.success}>
                Purchase successful! Check your wallet for UNT tokens.
              </div>
            )}
          </div>
        )}

        <div className={styles.tokenInfo}>
          <h2>Token Information</h2>
          <p>Symbol: {untToken?.symbol || 'UNT'}</p>
          <p>Name: {untToken?.name || 'Unity Token'}</p>
          <p>Price: 1 ETH = 1 UNT</p>
          <p>Network: Ethereum Mainnet</p>
        </div>
      </main>
    </div>
  );
};

export default Home;
