
"use client";

import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, ListPlus } from 'lucide-react';

export default function AddTokenPage() {
  const [tokenAddress, setTokenAddress] = useState<string>('');
  const [tokenSymbol, setTokenSymbol] = useState<string>('');
  const [assetId, setAssetId] = useState<string>(''); // Store as string for input, convert to number on submit
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!tokenAddress || !assetId) {
      setError("Token Address and Asset ID are required.");
      setIsLoading(false);
      toast({ title: "Validation Error", description: "Token Address and Asset ID are required.", variant: "destructive" });
      return;
    }

    const assetIdNumber = parseInt(assetId, 10);
    if (isNaN(assetIdNumber)) {
      setError("Asset ID must be a valid number.");
      setIsLoading(false);
      toast({ title: "Validation Error", description: "Asset ID must be a valid number.", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenAddress,
          tokenSymbol: tokenSymbol || undefined, // Send undefined if empty, API handles optional symbol
          assetId: assetIdNumber,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(`Token "${data.token.tokenSymbol || data.token.tokenAddress}" added successfully!`);
        toast({
          title: "Token Added",
          description: `Token ${data.token.tokenSymbol || data.token.tokenAddress} (Asset ID: ${data.token.assetId}) has been added.`,
          className: "bg-accent text-accent-foreground",
        });
        // Reset form
        setTokenAddress('');
        setTokenSymbol('');
        setAssetId('');
      } else {
        setError(data.error || 'Failed to add token.');
        toast({ title: "Error Adding Token", description: data.error || 'An unknown error occurred.', variant: "destructive" });
      }
    } catch (err) {
      console.error("Error submitting token:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown network error occurred.";
      setError(`Network error or invalid response: ${errorMessage}`);
      toast({ title: "Submit Error", description: `Failed to submit token. ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="container mx-auto flex flex-col items-center gap-8 w-full max-w-md">
        <Card className="w-full shadow-xl rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <ListPlus className="mr-2 h-6 w-6 text-primary" /> Add New Token
            </CardTitle>
            <CardDescription>
              Enter the details of the ERC20 token to add it to the system's token list.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="tokenAddress" className="text-sm font-medium">Token Contract Address <span className="text-destructive">*</span></Label>
                <Input
                  id="tokenAddress"
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="e.g., 0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"
                  disabled={isLoading}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tokenSymbol" className="text-sm font-medium">Token Symbol</Label>
                <Input
                  id="tokenSymbol"
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  placeholder="e.g., USDC"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="assetId" className="text-sm font-medium">Asset ID (Numeric) <span className="text-destructive">*</span></Label>
                <Input
                  id="assetId"
                  type="number"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  placeholder="e.g., 101"
                  disabled={isLoading}
                  className="mt-1"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ListPlus className="mr-2 h-5 w-5" />
                )}
                {isLoading ? 'Adding Token...' : 'Add Token'}
              </Button>
              {error && (
                <Alert variant="destructive" className="w-full">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {successMessage && (
                <Alert variant="default" className="w-full bg-accent text-accent-foreground border-accent">
                  <CheckCircle2 className="h-5 w-5" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </form>
        </Card>
         <Button variant="link" asChild className="mt-4">
            <a href="/">Back to Home</a>
        </Button>
      </div>
    </main>
  );
}
