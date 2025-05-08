"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { ethers, type BrowserProvider, type Signer, type ContractTransactionResponse, type TransactionReceipt } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, ERC20_ABI } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogIn, WalletCards, Send, Loader2, CheckCircle2, AlertCircle, Coins } from 'lucide-react';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function EthSender() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  const [transactionType, setTransactionType] = useState<'eth' | 'erc20'>('eth');
  const [tokenContractAddress, setTokenContractAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [gasLimit, setGasLimit] = useState<string>('200000'); // Default gas limit, increased for potential ERC20 approve + transfer
  
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
        window.location.reload(); 
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      newProvider.listAccounts().then(async (accountsSigners) => {
        if (accountsSigners.length > 0) {
          const currentSigner = accountsSigners[0];
          setWalletAddress(currentSigner.address); 
          setSigner(currentSigner);
          const network = await newProvider.getNetwork();
          setChainName(network.name);
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
      await provider.send("eth_requestAccounts", []);
      const currentSigner = await provider.getSigner();
      setSigner(currentSigner);
      const address = await currentSigner.getAddress();
      setWalletAddress(address);
      const network = await provider.getNetwork();
      setChainName(network.name);
      toast({ title: "Wallet Connected", description: `Connected to ${network.name} with address ${address}` });
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
    setTransactionHash(null);

    if (transactionType === 'eth') {
      setStatusMessage("Preparing ETH transaction...");
      try {
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        setStatusMessage("Please confirm the ETH transaction in MetaMask...");
        const tx: ContractTransactionResponse = await contract.depositETH({
          value: ethers.parseEther(amount),
          gasLimit: BigInt(gasLimit),
        });

        setTransactionHash(tx.hash);
        setStatusMessage(`ETH transaction submitted! Hash: ${tx.hash}. Waiting for confirmation...`);
        toast({ title: "ETH Transaction Submitted", description: `Hash: ${tx.hash}` });

        const receipt: TransactionReceipt | null = await tx.wait();

        if (receipt && receipt.status === 1) {
          setTransactionStatus('success');
          setStatusMessage("ETH transaction confirmed successfully!");
          toast({ title: "ETH Transaction Confirmed!", description: "Your ETH has been deposited.", className: "bg-accent text-accent-foreground" });
          setAmount('');
        } else {
          setTransactionStatus('error');
          setStatusMessage("ETH transaction failed. Please check the transaction details.");
          toast({ title: "ETH Transaction Failed", description: receipt ? `Receipt status: ${receipt.status}` : "Unknown error.", variant: "destructive" });
        }
      } catch (error: any) {
        console.error("Error sending ETH transaction:", error);
        setTransactionStatus('error');
        let detailedMessage = "An error occurred while sending the ETH transaction.";
        if (error.message) detailedMessage = error.message.length > 100 ? error.message.substring(0, 100) + "..." : error.message;
        if (error.reason) detailedMessage = error.reason;
        setStatusMessage(`Error: ${detailedMessage}`);
        toast({ title: "ETH Transaction Error", description: detailedMessage, variant: "destructive" });
      }
    } else { // ERC20 Transaction
      if (!ethers.isAddress(tokenContractAddress)) {
        toast({ title: "Invalid Token Address", description: "Please enter a valid ERC20 token contract address.", variant: "destructive" });
        setTransactionStatus('idle');
        return;
      }
      setStatusMessage("Preparing ERC20 transaction...");
      try {
        const erc20Contract = new ethers.Contract(tokenContractAddress, ERC20_ABI, signer);
        const bridgeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        let decimals: bigint;
        try {
            decimals = await erc20Contract.decimals();
        } catch (decError) {
            console.error("Error fetching token decimals:", decError);
            setStatusMessage("Error: Could not fetch token decimals. Ensure the address is a valid ERC20 token.");
            setTransactionStatus('error');
            toast({ title: "Token Error", description: "Could not fetch token decimals. Check address and network.", variant: "destructive" });
            return;
        }
        const amountToSend = ethers.parseUnits(amount, Number(decimals));

        // 1. Approve
        setStatusMessage(`Approving ${amount} tokens for the bridge contract... Please confirm in MetaMask.`);
        const approveTx: ContractTransactionResponse = await erc20Contract.approve(CONTRACT_ADDRESS, amountToSend);
        setTransactionHash(approveTx.hash);
        toast({ title: "Token Approval Submitted", description: `Hash: ${approveTx.hash}` });
        
        const approvalReceipt: TransactionReceipt | null = await approveTx.wait();
        if (!approvalReceipt || approvalReceipt.status !== 1) {
          setStatusMessage("Token approval failed. Please check the transaction details.");
          setTransactionStatus('error');
          toast({ title: "Token Approval Failed", description: approvalReceipt ? `Receipt status: ${approvalReceipt.status}` : "Approval rejected or failed.", variant: "destructive" });
          return;
        }

        // 2. Deposit ERC20
        setStatusMessage(`Approval successful! Depositing ${amount} tokens... Please confirm in MetaMask.`);
        const depositTx: ContractTransactionResponse = await bridgeContract.depositERC20(tokenContractAddress, amountToSend, {
            gasLimit: BigInt(gasLimit) 
        });
        setTransactionHash(depositTx.hash);
        setStatusMessage(`ERC20 deposit transaction submitted! Hash: ${depositTx.hash}. Waiting for confirmation...`);
        toast({ title: "ERC20 Deposit Submitted", description: `Hash: ${depositTx.hash}` });

        const depositReceipt: TransactionReceipt | null = await depositTx.wait();
        if (depositReceipt && depositReceipt.status === 1) {
          setTransactionStatus('success');
          setStatusMessage("ERC20 token deposited successfully!");
          toast({ title: "ERC20 Transaction Confirmed!", description: "Your ERC20 tokens have been deposited.", className: "bg-accent text-accent-foreground" });
          setAmount('');
        } else {
          setTransactionStatus('error');
          setStatusMessage("ERC20 token deposit failed. Please check the transaction details.");
          toast({ title: "ERC20 Deposit Failed", description: depositReceipt ? `Receipt status: ${depositReceipt.status}` : "Deposit rejected or failed.", variant: "destructive" });
        }

      } catch (error: any) {
        console.error("Error sending ERC20 transaction:", error);
        setTransactionStatus('error');
        let detailedMessage = "An error occurred during the ERC20 transaction.";
        if (error.message) detailedMessage = error.message.length > 100 ? error.message.substring(0, 100) + "..." : error.message;
        if (error.reason) detailedMessage = error.reason;
        if (error.code === 'INSUFFICIENT_FUNDS') detailedMessage = "Insufficient funds for gas.";
        else if (error.message?.includes("insufficient allowance")) detailedMessage = "Insufficient token allowance.";
        else if (error.message?.includes("transfer amount exceeds balance")) detailedMessage = "Transfer amount exceeds your token balance.";
        
        setStatusMessage(`Error: ${detailedMessage}`);
        toast({ title: "ERC20 Transaction Error", description: detailedMessage, variant: "destructive" });
      }
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <Card className="shadow-xl rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <WalletCards className="mr-2 h-6 w-6 text-primary" /> Wallet Information
          </CardTitle>
          <CardDescription>Connect your MetaMask wallet to proceed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {walletAddress ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Status: <span className="text-accent font-semibold">Connected</span></p>
              <p className="text-sm font-medium">Address: <span className="text-foreground/80 font-semibold break-all">{walletAddress}</span></p>
              {chainName && <p className="text-sm font-medium">Network: <span className="text-foreground/80 font-semibold">{chainName}</span></p>}
              <Button variant="outline" onClick={connectWallet} className="w-full mt-2">
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
        <Card className="shadow-xl rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              {transactionType === 'eth' ? <Send className="mr-2 h-6 w-6 text-primary" /> : <Coins className="mr-2 h-6 w-6 text-primary" />}
              {transactionType === 'eth' ? 'Send ETH to Contract' : 'Send ERC20 Token to Contract'}
            </CardTitle>
            <CardDescription>
              {transactionType === 'eth' ? (
                <>
                  Deposit ETH into the contract: <code className="text-xs bg-muted p-1 rounded">{CONTRACT_ADDRESS}</code>.
                  This action calls the <code className="text-xs bg-muted p-1 rounded">depositETH()</code> function.
                </>
              ) : (
                <>
                  Deposit ERC20 tokens into the contract: <code className="text-xs bg-muted p-1 rounded">{CONTRACT_ADDRESS}</code>.
                  This requires token approval then calls <code className="text-xs bg-muted p-1 rounded">depositERC20()</code>.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSendTransaction}>
            <CardContent className="space-y-4">
              <RadioGroup 
                value={transactionType} 
                onValueChange={(value: 'eth' | 'erc20') => {
                  setTransactionType(value);
                  setStatusMessage(null); // Clear status on type change
                  setTransactionStatus('idle');
                }} 
                className="flex space-x-4 mb-4"
                disabled={transactionStatus === 'pending'}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="eth" id="send-eth" disabled={transactionStatus === 'pending'}/>
                  <Label htmlFor="send-eth">Send ETH</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="erc20" id="send-erc20" disabled={transactionStatus === 'pending'}/>
                  <Label htmlFor="send-erc20">Send ERC20 Token</Label>
                </div>
              </RadioGroup>

              {transactionType === 'erc20' && (
                <div>
                  <Label htmlFor="tokenAddress" className="text-sm font-medium">Token Contract Address</Label>
                  <Input
                    id="tokenAddress"
                    type="text"
                    value={tokenContractAddress}
                    onChange={(e) => setTokenContractAddress(e.target.value)}
                    placeholder="e.g., 0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"
                    disabled={transactionStatus === 'pending'}
                    className="mt-1"
                    required={transactionType === 'erc20'}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="amount" className="text-sm font-medium">Amount ({transactionType === 'eth' ? 'ETH' : 'Token'})</Label>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={transactionType === 'eth' ? "e.g., 0.01" : "e.g., 100"}
                  disabled={transactionStatus === 'pending'}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="gasLimit" className="text-sm font-medium">Gas Limit</Label>
                <Input
                  id="gasLimit"
                  type="number"
                  value={gasLimit}
                  onChange={(e) => setGasLimit(e.target.value)}
                  placeholder="e.g., 200000"
                  disabled={transactionStatus === 'pending'}
                  className="mt-1"
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={transactionStatus === 'pending' || !walletAddress}>
                {transactionStatus === 'pending' ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  transactionType === 'eth' ? <Send className="mr-2 h-5 w-5" /> : <Coins className="mr-2 h-5 w-5" />
                )}
                {transactionStatus === 'pending' ? 'Processing...' : (transactionType === 'eth' ? 'Send ETH' : 'Send Token')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {statusMessage && (
        <Alert 
          variant={transactionStatus === 'error' ? 'destructive' : transactionStatus === 'success' ? 'default' : 'default'} 
          className={transactionStatus === 'success' ? 'bg-accent text-accent-foreground border-accent rounded-lg' : 'rounded-lg'}
        >
          {transactionStatus === 'success' && <CheckCircle2 className="h-5 w-5" />}
          {transactionStatus === 'error' && <AlertCircle className="h-5 w-5" />}
          {transactionStatus === 'pending' && <Loader2 className="h-5 w-5 animate-spin" />}
          <AlertTitle className="ml-2 font-semibold">
            {transactionStatus === 'idle' && "Status"}
            {transactionStatus === 'pending' && "Transaction Pending"}
            {transactionStatus === 'success' && "Transaction Successful"}
            {transactionStatus === 'error' && "Transaction Error"}
          </AlertTitle>
          <AlertDescription className="ml-2 break-words text-sm">
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
