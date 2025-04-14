import React from "react";
import { Play, Download, ShieldCheck, TimerReset, Coins, GitFork } from "lucide-react";

const Step = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
  <div className="bg-slate-800 rounded-2xl p-6 shadow-xl mb-6 border border-slate-700">
    <h2 className="text-xl text-cyan-400 font-semibold flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5 text-cyan-300" />
      {title}
    </h2>
    <p className="text-slate-300 leading-relaxed">{children}</p>
  </div>
);

export default function RunNode() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center text-cyan-300 mb-8">
        Start Running a Node
      </h1>

      <Step icon={Download} title="1. Download the App">
        Download the Wind Node App for Windows (Mac & Linux coming soon). The app lets you launch your WireGuard node in one click.
        <br /><br />
        <a
          href="#"
          className="inline-block mt-2 text-cyan-400 hover:underline"
        >
          👉 Download for Windows (.exe)
        </a>
      </Step>

      <Step icon={Play} title="2. Connect Your Wallet">
        Open the app and connect your Solana wallet. This is how we track uptime, rewards, and node ownership. No private keys are stored.
      </Step>

      <Step icon={ShieldCheck} title="3. Launch the Node">
        With one click, your node will join the decentralized DHT network. It will be discoverable by clients who want to connect securely.
      </Step>

      <Step icon={TimerReset} title="4. Keep It Online">
        The longer your node stays online, the more $RWRD tokens you earn. Uptime = rewards. You'll see your stats live in the dashboard.
      </Step>

      <Step icon={Coins} title="5. Claim Your Rewards">
        Every 24h, you can claim your daily rewards from the dashboard. Withdrawals will be available after 4 epochs of accumulation.
      </Step>

      <Step icon={GitFork} title="6. Want to Build With Us?">
        The project is open source. Feel free to contribute, fork, or suggest features on GitHub. Let's decentralize the web together.
        <br /><br />
        <a
          href="https://github.com/your-repo"
          className="inline-block mt-2 text-cyan-400 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          🌐 Visit the GitHub Repository
        </a>
      </Step>
    </div>
  );
}
