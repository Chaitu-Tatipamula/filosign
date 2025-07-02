import { useState } from 'react';
import { Synapse, RPC_URLS, TOKENS, CONTRACT_ADDRESSES } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

export type SynapseRetrievePhase = 
  | 'idle'
  | 'connecting'
  | 'retrieving'
  | 'signing'
  | 'complete'
  | 'error';

export interface SynapseRetrieveState {
  phase: SynapseRetrievePhase;
  progress: number;
  document: {
    file: File;
    metadata: any;
    retrievalId: string;
  } | null;
  error: string | null;
}

export interface SynapseRetrieveOptions {
  retrievalId: string;
  userAddress: string;
  onProgress?: (progress: number) => void;
  onPhaseChange?: (phase: SynapseRetrievePhase) => void;
  onComplete?: (document: { file: File; metadata: any; retrievalId: string; }) => void;
  onError?: (error: string) => void;
}

export interface SynapseSignOptions {
  retrievalId: string;
  userAddress: string;
  onProgress?: (progress: number) => void;
  onPhaseChange?: (phase: SynapseRetrievePhase) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function useRetrieveSynapse() {
  const [state, setState] = useState<SynapseRetrieveState>({
    phase: 'idle',
    progress: 0,
    document: null,
    error: null
  });

  const updateState = (updates: Partial<SynapseRetrieveState>) => {
    setState(current => ({ ...current, ...updates }));
  };

  const retrieveDocument = async (options: SynapseRetrieveOptions) => {
    updateState({
      phase: 'idle',
      progress: 0,
      document: null,
      error: null
    });

    try {
      updateState({ phase: 'connecting' });
      options.onPhaseChange?.('connecting');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const synapse = await Synapse.create({ provider, rpcURL: RPC_URLS.calibration.websocket });

      updateState({ phase: 'retrieving', progress: 50 });
      options.onPhaseChange?.('retrieving');

      const res = await fetch(`/api/documents/${options.retrievalId}`);
      if (!res.ok) throw new Error('Document not found');
      const metadata = await res.json();
      const commp = metadata.commp;

      // Check recipient address
      if (
        !metadata.recipientAddress ||
        metadata.recipientAddress.toLowerCase() !== options.userAddress.toLowerCase()
      ) {
        throw new Error('Access denied: This document is not intended for your wallet address.');
      }

      const storage = await synapse.createStorage();
      const fileData = await storage.download(commp);

      const file = new File([fileData], metadata.filename, { type: `${metadata.mimeType}` });

      const document = {
        file,
        metadata,
        retrievalId: options.retrievalId,
      };

      updateState({ 
        phase: 'complete',
        progress: 100,
        document
      });
      
      options.onPhaseChange?.('complete');
      options.onComplete?.(document);
      
    } catch (e: any) {
      const errorMessage = e?.message || 'Retrieval failed';
      updateState({
        phase: 'error',
        progress: 0,
        error: errorMessage
      });
      options.onPhaseChange?.('error');
      options.onError?.(errorMessage);
      console.error('Full retrieval error:', e);
    }
  };

  const signDocument = async (options: SynapseSignOptions) => {
    try {
      updateState({ phase: 'signing', progress: 50 });
      options.onPhaseChange?.('signing');

      const message = `I am signing document with retrievalId: ${options.retrievalId}`;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      const response = await fetch(`/api/documents/${options.retrievalId}/sign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerAddress: options.userAddress,
          signature,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update document as signed');
      }

      updateState({ phase: 'complete', progress: 100 });
      options.onPhaseChange?.('complete');
      options.onComplete?.();
    } catch (e: any) {
      const errorMessage = e?.message || 'Signing failed';
      updateState({
        phase: 'error',
        progress: 0,
        error: errorMessage
      });
      options.onPhaseChange?.('error');
      options.onError?.(errorMessage);
      console.error('Full signing error:', e);
    }
  };

  return { 
    retrieveDocument,
    signDocument,
    phase: state.phase,
    progress: state.progress,
    document: state.document,
    error: state.error
  };
} 