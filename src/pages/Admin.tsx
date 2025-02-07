import { useEffect, useState } from 'react';
import { useAccount, useContractRead, useContractWrite } from 'wagmi';
import { UNITY_TOKEN_ABI, UNITY_TOKEN_ADDRESS } from '../contracts/UnityToken';
import styles from '../styles/Home.module.css';

const Admin = () => {
  const { address } = useAccount();
  const [tokenBalance, setTokenBalance] = useState('0');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Fetch token balance from the contract
  const { data: balanceData } = useContractRead({
    address: UNITY_TOKEN_ADDRESS,
    abi: UNITY_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [UNITY_TOKEN_ADDRESS], // Assuming the contract holds its own tokens
  });

  // Update token balance when balanceData changes
  useEffect(() => {
    if (balanceData) {
      setTokenBalance(balanceData.toString());
    }
  }, [balanceData]);

  // Withdraw tokens from the contract
  const { write: withdrawTokens } = useContractWrite({
    address: UNITY_TOKEN_ADDRESS,
    abi: UNITY_TOKEN_ABI,
    functionName: 'withdraw', // Assuming there's a withdraw function
    args: [withdrawAmount],
    onSuccess() {
      alert('Withdrawal successful!');
      setWithdrawAmount('');
    },
    onError(error) {
      console.error('Withdrawal error:', error);
    },
  });

  return (
    <div className={`${styles.container} ${styles.adminContainer}`}>
      <h1>Admin Withdrawals</h1>
      <div className={styles.balanceInfo}>
        <p>Token Balance in Contract: {tokenBalance} Tokens</p>
      </div>
      <div className={styles.inputGroup}>
        <input
          type="text"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          placeholder="Amount to withdraw"
        />
        <button onClick={() => withdrawTokens()} disabled={!withdrawAmount}>
          Withdraw Tokens
        </button>
      </div>
    </div>
  );
};

export default Admin;