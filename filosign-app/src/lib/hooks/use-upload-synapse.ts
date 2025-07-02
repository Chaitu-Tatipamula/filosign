import { useState } from 'react';
import { Synapse, RPC_URLS, TOKENS, CONTRACT_ADDRESSES } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

// Upload workflow phases
export type SynapseUploadPhase = 
  | 'idle'
  | 'connecting'
  | 'depositing'
  | 'approving'
  | 'uploading'
  | 'storing-metadata'
  | 'complete'
  | 'error';

// Hook return state
export interface SynapseUploadState {
  phase: SynapseUploadPhase;
  progress: number;
  result: {
    retrievalId: string;
    commp: string;
    metadata: any;
  } | null;
  error: string | null;
}

// Upload options
export interface SynapseUploadOptions {
  recipientAddress: string;
  recipientName: string;
  metadata?: {
    filename?: string;
    description?: string;
  };
  onProgress?: (progress: number) => void;
  onPhaseChange?: (phase: SynapseUploadPhase) => void;
  onComplete?: (result: { retrievalId: string; commp: string; metadata: any }) => void;
  onError?: (error: string) => void;
}

export function useUploadSynapse() {
  const [state, setState] = useState<SynapseUploadState>({
    phase: 'idle',
    progress: 0,
    result: null,
    error: null
  });

  const updateState = (updates: Partial<SynapseUploadState>) => {
    setState(current => ({ ...current, ...updates }));
  };

  const upload = async (file: File, options: SynapseUploadOptions) => {
    updateState({
      phase: 'idle',
      progress: 0,
      result: null,
      error: null
    });

    try {
      updateState({ phase: 'connecting' });
      options.onPhaseChange?.('connecting');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const synapse = await Synapse.create({ provider, rpcURL: RPC_URLS.calibration.websocket });

      updateState({ phase: 'depositing', progress: 10 });
      options.onPhaseChange?.('depositing');
      
      const amount = ethers.parseUnits('1', 18);
      const depositTx = await synapse.payments.deposit(amount, TOKENS.USDFC);
      await depositTx.wait();

      updateState({ phase: 'approving', progress: 30 });
      options.onPhaseChange?.('approving');
      
      const pandoraAddress = CONTRACT_ADDRESSES.PANDORA_SERVICE[synapse.getNetwork()];
      const approveTx = await synapse.payments.approveService(
        pandoraAddress,
        ethers.parseUnits('0.1', 18),
        ethers.parseUnits('1', 18)
      );
      await approveTx.wait();

      updateState({ phase: 'uploading', progress: 50 });
      options.onPhaseChange?.('uploading');
      
      const storage = await synapse.createStorage();
      const fileData = new Uint8Array(await file.arrayBuffer());
      const uploadResult = await storage.upload(fileData);
      
      updateState({ phase: 'storing-metadata', progress: 80 });
      options.onPhaseChange?.('storing-metadata');

      const metadata = {
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: Date.now(),
        senderAddress: await provider.getSigner(),
        recipientAddress: options.recipientAddress,
        recipientName: options.recipientName,
        description: options.metadata?.description || '',
        commp: uploadResult.commp,
        status: 'pending_signature'
      };


      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(metadata)));
      const retrievalId = `FS-${metadata.commp.substring(0, 8).toUpperCase()}-${metadataHash.substring(0, 8).toUpperCase()}`;

      const result = {
        retrievalId,
        commp: metadata.commp,
        metadata
      };

      try {
        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...metadata,
            retrievalId,
          }),
        });
        if (!response.ok) {
          throw new Error('Failed to save document metadata');
        }
        updateState({ 
          phase: 'complete',
          progress: 100,
          result
        });
        options.onPhaseChange?.('complete');
        options.onComplete?.(result);
      } catch (e: any) {
        const errorMessage = e?.message || 'Upload failed (database)';
        updateState({
          phase: 'error',
          progress: 0,
          error: errorMessage
        });
        options.onPhaseChange?.('error');
        options.onError?.(errorMessage);
        return;
      }
      
    } catch (e: any) {
      const errorMessage = e?.message || 'Upload failed';
      updateState({
        phase: 'error',
        progress: 0,
        error: errorMessage
      });
      options.onPhaseChange?.('error');
      options.onError?.(errorMessage);
      console.error('Full upload error:', e);
    }
  };

  return { 
    upload, 
    phase: state.phase,
    progress: state.progress,
    result: state.result,
    error: state.error
  };
} 