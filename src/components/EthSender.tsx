"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { ethers, type BrowserProvider, type Signer, type ContractTransactionResponse, type TransactionReceipt } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogIn, WalletCards, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function EthSender() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [gasLimit, setGasLimit] = useState<string>('50000'); // Default gas limit
  
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(newProvider);

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // MetaMask is locked or the user has disconnected all accounts
          setWalletAddress(null);
          setSigner(null);
          toast({ title: "Wallet Disconnected", description: "Please connect your wallet.", variant: "destructive" });
        } else {
          setWalletAddress(accounts[0]);
          newProvider.getSigner().then(setSigner);
        }
      };

      const handleChainChanged = async (_chainId: string) => {
        toast({ title: "Network Changed", description: "Please ensure you are on the correct network."});
        window.location.reload(); // Reload to re-initialize with new chain
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Check for already connected accounts
      newProvider.listAccounts().then(accounts => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0].address); // accounts[0] is a Signer instance
          setSigner(accounts[0]);
           newProvider.getNetwork().then(network => setChainName(network.name));
        }
      });

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    } else {
      toast({ title: "MetaMask Not Found", description: "Please install MetaMask to use this application.", variant: "destructive" });
    }
  }, [toast]);

  const connectWallet = async () => {
    if (!provider) {
      toast({ title: "Error", description: "Ethereum provider not available. Is MetaMask installed?", variant: "destructive" });
      return;
    }
    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        const currentSigner = await provider.getSigner();
        setSigner(currentSigner);
        setWalletAddress(await currentSigner.getAddress());
        const network = await provider.getNetwork();
        setChainName(network.name);
        toast({ title: "Wallet Connected", description: `Connected to ${network.name}` });
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast({ title: "Connection Error", description: "Failed to connect wallet. Please try again.", variant: "destructive" });
    }
  };

  const handleSendTransaction = async (e: FormEvent) => {
    e.preventDefault();
    if (!signer || !walletAddress) {
      toast({ title: "Wallet Not Connected", description: "Please connect your wallet first.", variant: "destructive" });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount greater than 0.", variant: "destructive" });
      return;
    }
    if (!gasLimit || parseInt(gasLimit) <= 0) {
      toast({ title: "Invalid Gas Limit", description: "Please enter a valid gas limit.", variant: "destructive" });
      return;
    }

    setTransactionStatus('pending');
    setStatusMessage("Preparing transaction...");
    setTransactionHash(null);

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      setStatusMessage("Please confirm the transaction in MetaMask...");
      const tx: ContractTransactionResponse = await contract.depositETH({
        value: ethers.parseEther(amount),
        gasLimit: BigInt(gasLimit),
      });

      setTransactionHash(tx.hash);
      setStatusMessage(`Transaction submitted! Hash: ${tx.hash}. Waiting for confirmation...`);
      toast({ title: "Transaction Submitted", description: `Hash: ${tx.hash}` });

      const receipt: TransactionReceipt | null = await tx.wait();

      if (receipt && receipt.status === 1) {
        setTransactionStatus('success');
        setStatusMessage("Transaction confirmed successfully!");
        toast({ title: "Transaction Confirmed!", description: "Your ETH has been deposited.", className: "bg-accent text-accent-foreground" });
        setAmount(''); // Reset amount after successful transaction
      } else {
        setTransactionStatus('error');
        setStatusMessage("Transaction failed. Please check the transaction details.");
        toast({ title: "Transaction Failed", description: receipt ? `Receipt status: ${receipt.status}` : "Unknown error.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error sending transaction:", error);
      setTransactionStatus('error');
      let detailedMessage = "An error occurred while sending the transaction.";
      if (error.message) {
        detailedMessage = error.message.length > 100 ? error.message.substring(0, 100) + "..." : error.message;
      }
      if (error.reason) {
        detailedMessage = error.reason;
      }
      setStatusMessage(`Error: ${detailedMessage}`);
      toast({ title: "Transaction Error", description: detailedMessage, variant: "destructive" });
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <WalletCards className="mr-2 h-6 w-6 text-primary" /> Wallet Information
          </CardTitle>
          <CardDescription>Connect your MetaMask wallet to proceed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {walletAddress ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Status: <span className="text-accent-foreground/80 font-semibold">Connected</span></p>
              <p className="text-sm font-medium">Address: <span className="text-accent-foreground/80 font-semibold break-all">{walletAddress}</span></p>
              {chainName && <p className="text-sm font-medium">Network: <span className="text-accent-foreground/80 font-semibold">{chainName}</span></p>}
              <Button variant="outline" onClick={connectWallet} className="w-full">
                Reconnect / Switch Account
              </Button>
            </div>
          ) : (
            <Button onClick={connectWallet} className="w-full">
              <LogIn className="mr-2 h-5 w-5" /> Connect Wallet
            </Button>
          )}
        </CardContent>
      </Card>

      {walletAddress && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Send className="mr-2 h-6 w-6 text-primary" /> Send ETH to Contract
            </CardTitle>
            <CardDescription>
              Deposit ETH into the contract: <code className="text-xs bg-muted p-1 rounded">{CONTRACT_ADDRESS}</code>.
              This action calls the <code className="text-xs bg-muted p-1 rounded">depositETH()</code> function.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSendTransaction}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="amount" className="text-sm font-medium">Amount (ETH)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 0.01"
                  disabled={transactionStatus === 'pending'}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="gasLimit" className="text-sm font-medium">Gas Limit</Label>
                <Input
                  id="gasLimit"
                  type="number"
                  value={gasLimit}
                  onChange={(e) => setGasLimit(e.target.value)}
                  placeholder="e.g., 50000"
                  disabled={transactionStatus === 'pending'}
                  className="mt-1"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={transactionStatus === 'pending' || !walletAddress}>
                {transactionStatus === 'pending' ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-5 w-5" />
                )}
                {transactionStatus === 'pending' ? 'Processing...' : 'Send ETH'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {statusMessage && (
        <Alert variant={transactionStatus === 'error' ? 'destructive' : transactionStatus === 'success' ? 'default' : 'default'} className={transactionStatus === 'success' ? 'bg-accent text-accent-foreground border-accent' : ''}>
          {transactionStatus === 'success' && <CheckCircle2 className="h-5 w-5" />}
          {transactionStatus === 'error' && <AlertCircle className="h-5 w-5" />}
          {transactionStatus === 'pending' && <Loader2 className="h-5 w-5 animate-spin" />}
          <AlertTitle className="ml-2">
            {transactionStatus === 'idle' && "Status"}
            {transactionStatus === 'pending' && "Transaction Pending"}
            {transactionStatus === 'success' && "Transaction Successful"}
            {transactionStatus === 'error' && "Transaction Error"}
          </AlertTitle>
          <AlertDescription className="ml-2 break-words">
            {statusMessage}
            {transactionHash && (
              <p className="mt-2 text-xs">
                Tx Hash: <a href={`https://sepolia.etherscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{transactionHash}</a>
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
