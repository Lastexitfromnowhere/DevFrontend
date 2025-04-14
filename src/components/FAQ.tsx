import React from "react";
import { HelpCircle, ShieldCheck, Globe, RefreshCcw, Wallet, Server } from "lucide-react";

const Question = ({ icon: Icon, question, answer }: { icon: any, question: string, answer: React.ReactNode }) => (
  <div className="bg-slate-800 rounded-2xl p-6 shadow-xl mb-6 border border-slate-700">
    <h2 className="text-xl text-emerald-400 font-semibold flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5 text-emerald-300" />
      {question}
    </h2>
    <p className="text-slate-300 leading-relaxed">{answer}</p>
  </div>
);

export default function FAQ() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center text-emerald-300 mb-8">
        Frequently Asked Questions
      </h1>

      <Question
        icon={HelpCircle}
        question="What is Wind VPN?"
        answer="Wind VPN is a decentralized VPN platform that allows users to connect securely to the internet or become node hosts to earn rewards."
      />

      <Question
        icon={ShieldCheck}
        question="Is Wind VPN safe and private?"
        answer="Absolutely. We never store logs, track activity, or collect personal data. Your wallet is your only identity."
      />

      <Question
        icon={Wallet}
        question="How are rewards distributed?"
        answer="Rewards are based on your uptime and node activity. You can claim daily bonuses and monitor your rewards through the dashboard."
      />

      <Question
        icon={Server}
        question="Can I host a VPN node?"
        answer="Yes! If you have a stable internet connection and meet the requirements, you can run a node from the desktop app and earn credits or tokens."
      />

      <Question
        icon={Globe}
        question="Which regions are supported?"
        answer="The network is global. As more users host nodes, new regions will become available. You can connect to the nearest or most performant one."
      />

      <Question
        icon={RefreshCcw}
        question="Can the system be updated?"
        answer="Yes, we're in active development. The dashboard, reward mechanics, and protocols may evolve to improve performance and fairness."
      />
    </div>
  );
}
