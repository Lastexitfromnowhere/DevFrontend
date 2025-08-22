import React from "react";
import { Play, Download, ShieldCheck, TimerReset, Coins, GitFork } from "lucide-react";
import { Card } from "@/components/ui/Card";
interface StepProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}
const Step = ({ icon: Icon, title, children }: StepProps) => (
  <Card className="mb-6" variant="hover">
    <div className="space-y-2">
      <h2 className="text-xl font-semibold flex items-center gap-2 text-blue-400">
        <Icon className="w-5 h-5 text-blue-300" />
        {title}
      </h2>
      <div className="text-gray-300 leading-relaxed space-y-4">{children}</div>
    </div>
  </Card>
);
const steps: StepProps[] = [
  {
    icon: Download,
    title: "1. Download the App",
    children: (
      <>
        Download the Wind Node App for Windows <span className="text-xs text-gray-400">(Mac & Linux coming soon)</span>. The app lets you launch your WireGuard node in one click.
        <br /><br />
        <a href="#" className="inline-block text-blue-400 hover:underline">
          👉 Download for Windows (.exe)
        </a>
      </>
    )
  },
  {
    icon: Play,
    title: "2. Connect Your Wallet",
    children: "Open the app and connect your Solana wallet. This is how we track uptime, rewards, and node ownership. No private keys are stored."
  },
  {
    icon: ShieldCheck,
    title: "3. Launch the Node",
    children: "With one click, your node will join the decentralized DHT network. It will be discoverable by clients who want to connect securely."
  },
  {
    icon: TimerReset,
    title: "4. Keep It Online",
    children: "The longer your node stays online, the more $RWRD tokens you earn. Uptime = rewards. You'll see your stats live in the dashboard."
  },
  {
    icon: Coins,
    title: "5. Claim Your Rewards",
    children: "Every 24h, you can claim your daily rewards from the dashboard. Withdrawals will be available after 4 epochs of accumulation."
  },
  {
    icon: GitFork,
    title: "6. Want to Build With Us?",
    children: (
      <>
        The project is open source. Feel free to contribute, fork, or suggest features on GitHub. Let's decentralize the web together.
        <br /><br />
        <a
          href="https:
          className="inline-block text-blue-400 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          🌐 Visit the GitHub Repository
        </a>
      </>
    )
  }
];
export default function RunNode() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center text-blue-400 mb-8">
        Start Running a Node
      </h1>
      {steps.map((step, index) => (
        <Step key={index} {...step} />
      ))}
    </div>
  );
}
