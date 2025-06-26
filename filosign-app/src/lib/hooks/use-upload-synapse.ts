import { useState } from 'react';
import { Synapse, RPC_URLS, TOKENS, CONTRACT_ADDRESSES } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

export function useUploadSynapse() {
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setStatus('Connecting wallet...');
    setError(null);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const synapse = await Synapse.create({ provider, rpcURL: RPC_URLS.calibration.websocket });

      setStatus('Depositing USDFC...');
      const amount = ethers.parseUnits('1', 18);
      const depositTx = await synapse.payments.deposit(amount, TOKENS.USDFC);
      await depositTx.wait();

      setStatus('Approving service...');
      const pandoraAddress = CONTRACT_ADDRESSES.PANDORA_SERVICE[synapse.getNetwork()];
      const approveTx = await synapse.payments.approveService(
        pandoraAddress,
        ethers.parseUnits('0.1', 18),
        ethers.parseUnits('1', 18)
      );
      await approveTx.wait();

      setStatus('Uploading...');
      setProgress(0);
      const storage = await synapse.createStorage();
      const fileData = new Uint8Array(await file.arrayBuffer());
      const uploadResult = await storage.upload(fileData);
      setProgress(100);

      setResult(uploadResult);
      setStatus('Upload complete!');
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
      setStatus('Error');
      console.error('Full upload error:', e);
    }
  };

  return { upload, status, progress, result, error };
} 