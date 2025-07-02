'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search, FileText, Shield, Check, AlertCircle } from 'lucide-react';
import { WalletConnection } from '@/components/wallet-connection';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useRetrieveSynapse } from '@/lib/hooks/use-retrieve-synapse';

type SynapseDocument = {
  file: File;
  metadata: any;
  retrievalId: string;
};

export default function ReceiveDocument() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);
  const [retrievalId, setRetrievalId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [document, setDocument] = useState<SynapseDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const {
    retrieveDocument,
    signDocument,
    phase,
    progress,
    document: synapseDocument,
    error: synapseError
  } = useRetrieveSynapse();

  const handleWalletConnected = (walletAddress: string, publicKey: string) => {
    setUserPublicKey(publicKey);
  };

  const handleWalletDisconnected = () => {
    setUserPublicKey(null);
  };

  const handleLogout = () => {
    disconnect();
    setUserPublicKey(null);
    router.push('/');
  };

  // Client-side mounting guard
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRetrieveDocument = async () => {
    if (!retrievalId.trim()) {
      setError('Please enter a Retrieval ID');
      return;
    }
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await retrieveDocument({
        retrievalId: retrievalId.trim(),
        userAddress: address,
        onComplete: (doc) => {
          setDocument(doc);
          setIsLoading(false);
        },
        onError: (err) => {
          setError(err);
          setIsLoading(false);
        }
      });
    } catch (error) {
      setError('Network error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSignDocument = async () => {
    if (!document || !address) return;
    setIsSigning(true);
    try {
      await signDocument({
        retrievalId: document.retrievalId,
        userAddress: address,
        onComplete: () => {
          setSigned(true);
          setIsSigning(false);
        },
        onError: (err) => {
          setError(err);
          setIsSigning(false);
        }
      });
    } catch (error) {
      setError('Signing failed. Please try again.');
      setIsSigning(false);
    }
  };

  // Show wallet connection if not connected
  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">FiloSign</h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Please connect your wallet to receive and sign documents
            </p>
            <WalletConnection
              onWalletConnected={handleWalletConnected}
              onWalletDisconnected={handleWalletDisconnected}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">FiloSign</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <div className="text-sm">
              <div className="font-medium">Connected User</div>
              <div className="text-muted-foreground">
                {address.substring(0, 6)}...{address.substring(38)}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {!document ? (
          // Retrieval ID Input
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2 text-foreground">Sign Received Document</h2>
              <p className="text-muted-foreground">
                Enter the Retrieval ID you received to access and sign the document
              </p>
            </div>

            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Retrieval ID</span>
                </CardTitle>
                <CardDescription className="form-description">
                  Make sure you are using the same wallet address that the sender specified
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="retrieval-id" className="form-label">Enter Retrieval ID</Label>
                    <Input
                      id="retrieval-id"
                      value={retrievalId}
                      onChange={(e) => setRetrievalId(e.target.value)}
                      placeholder="FS-XXXXXXXX"
                      className="font-mono"
                    />
                  </div>

                  {/* Wallet Verification Info */}
                  <div className="alert-info">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 alert-info-icon mt-0.5" />
                      <div>
                        <p className="alert-title">Wallet Verification</p>
                        <p className="alert-description">
                          Connected wallet: <span className="font-mono">{address}</span>
                        </p>
                        <p className="alert-description mt-1">
                          This must match the recipient address specified by the sender.
                        </p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="alert-error">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 alert-error-icon mt-0.5" />
                        <div>
                          <p className="alert-title">Error</p>
                          <p className="alert-description">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleRetrieveDocument}
                    disabled={!retrievalId.trim() || isLoading}
                    className="w-full"
                    variant="success"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Retrieving Document...
                      </>
                    ) : (
                      <>
                        <Search className="h-5 w-5 mr-2" />
                        Retrieve Document
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Document Preview and Signing
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2 text-foreground">Document Retrieved</h2>
              <p className="text-muted-foreground">
                Review the document below and sign when ready
              </p>
            </div>

            {/* Document Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>{document.metadata.title}</span>
                </CardTitle>
                <CardDescription>
                  From: {document.metadata.senderName} ({document.metadata.senderAddress.address})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Sent:</span> {new Date(document.metadata.createdAt).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      document.metadata.status === 'signed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {document.metadata.status === 'signed' ? 'Signed' : 'Pending Signature'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PDF Preview Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Document Preview</CardTitle>
                <CardDescription>
                  PDF preview (simplified for MVP)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">{document.metadata.filename}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    PDF preview would be displayed here using PDF.js
                  </p>
                  <p className="text-xs text-gray-400 mt-4">
                    For MVP: Simplified preview implementation
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sign Document */}
            {document.metadata.status !== 'signed' && !signed ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="alert-info">
                      <p className="alert-description">
                        <strong>Important:</strong> Signing with MetaMask is the same as signing a document.
                        This action can only be performed by the owner of your private key.
                      </p>
                    </div>
                    
                    <Button
                      onClick={handleSignDocument}
                      disabled={isSigning}
                      className="w-full"
                      variant="success"
                      size="lg"
                    >
                      {isSigning ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Signing with MetaMask...
                        </>
                      ) : (
                        <>
                          <Shield className="h-5 w-5 mr-2" />
                          Sign Document
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Signed State
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold">Document Signed Successfully!</h3>
                    <p className="text-muted-foreground">
                      Your signature has been recorded on the blockchain.
                    </p>
                    {document.metadata.signedAt && (
                      <p className="text-sm text-gray-600">
                        Signed on: {new Date(document.metadata.signedAt).toLocaleString()}
                      </p>
                    )}
                    <Button onClick={() => router.push('/')} variant="outline">
                      Return to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
