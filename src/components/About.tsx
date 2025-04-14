import React from "react";
import { Users, Rocket, Globe, Shield, TerminalSquare, Coins } from "lucide-react";

const Block = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
  <div className="bg-slate-800 rounded-2xl p-6 shadow-xl mb-6 border border-slate-700">
    <h2 className="text-xl text-purple-400 font-semibold flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5 text-purple-300" />
      {title}
    </h2>
    <p className="text-slate-300 leading-relaxed">{children}</p>
  </div>
);

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center text-purple-300 mb-8">
        About Wind VPN
      </h1>

      <Block icon={Rocket} title="Our Mission">
        To make online privacy accessible to everyone through a decentralized and community-powered VPN network, without sacrificing performance or trust.
      </Block>

      <Block icon={Globe} title="Decentralized & Scalable">
        Wind VPN is not controlled by a single entity. Anyone can contribute to the network by running a node and earning rewards for sharing bandwidth.
      </Block>

      <Block icon={Shield} title="Privacy First">
        We believe privacy is a human right. That's why we never log user activity, track IPs, or collect identifiable data. You stay in full control.
      </Block>

      <Block icon={TerminalSquare} title="Open Technology">
        Powered by WireGuard and built with open-source principles, Wind VPN prioritizes transparency and performance. No closed-source blackboxes.
      </Block>

      <Block icon={Coins} title="Reward System">
        Node hosts earn $RWRD tokens for sharing reliable uptime. Clients can claim daily rewards and accumulate credit for future benefits.
      </Block>

      <Block icon={Users} title="Built by a Community">
        Wind VPN is built by passionate developers, privacy advocates, and early adopters. We're expanding—join us on Discord and help shape the future!
      </Block>

      <h2 className="text-2xl font-bold text-center text-purple-300 mt-12 mb-6">
        Meet the Team
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {[
          {
            name: "AdminX",
            role: "Core Architect",
            avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=AdminX"
          },
          {
            name: "GhostNode",
            role: "Security & Infrastructure",
            avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=GhostNode"
          },
          {
            name: "VibeChain",
            role: "Community Ops",
            avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=VibeChain"
          }
        ].map((member, idx) => (
          <div key={idx} className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg text-center">
            <img
              src={member.avatar}
              alt={member.name}
              className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-purple-400"
            />
            <h3 className="text-lg font-semibold text-purple-200">{member.name}</h3>
            <p className="text-sm text-slate-400">{member.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
