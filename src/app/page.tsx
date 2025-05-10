
import EthSender from '@/components/EthSender';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="container mx-auto flex flex-col items-center gap-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-primary tracking-tight sm:text-5xl">
            EthSignSend
          </h1>
          <p className="mt-3 text-lg text-foreground/80 sm:mt-4">
            Securely connect your wallet, sign, and send ETH/ERC20 tokens to our smart contract.
          </p>
        </header>
        
        <EthSender />

        <div className="mt-8">
          <Link href="/admin/add-token" passHref>
            <Button variant="outline">Add New Token (Admin)</Button>
          </Link>
        </div>

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EthSignSend. All rights reserved.</p>
          <p className="mt-1">
            This is a demonstration application. Always verify contract addresses and transaction details.
          </p>
        </footer>
      </div>
    </main>
  );
}
