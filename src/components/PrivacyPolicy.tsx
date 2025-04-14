import React from "react";
import { ShieldCheck, Lock, Globe, User, Settings, Info } from "lucide-react";

const Section = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
  <div className="bg-slate-800 rounded-2xl p-6 shadow-xl mb-6 border border-slate-700">
    <h2 className="text-xl text-teal-400 font-semibold flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5 text-teal-300" />
      {title}
    </h2>
    <p className="text-slate-300 leading-relaxed">{children}</p>
  </div>
);

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center text-sky-300 mb-8">
        Privacy Policy
      </h1>

      <Section icon={ShieldCheck} title="1. No Logging Policy">
        We do not log your activity while connected to our VPN. Your data, DNS queries, and connection logs are never stored.
      </Section>

      <Section icon={User} title="2. Wallet Data">
        When you connect with your Solana wallet, we store your public address only. We never collect your private keys or sensitive wallet info.
      </Section>

      <Section icon={Lock} title="3. Data Protection">
        Your data is stored securely with encryption and strict access control. We take all reasonable steps to prevent unauthorized access.
      </Section>

      <Section icon={Globe} title="4. Third-Party Services">
        We may use services like Discord for account linking and notifications. Your data is never sold or shared without consent.
      </Section>

      <Section icon={Settings} title="5. Cookies and Analytics">
        We use minimal cookies and only for session or reward tracking. We do not track you across websites and do not use invasive analytics.
      </Section>

      <Section icon={Info} title="6. Policy Updates">
        We may update this policy occasionally. When we do, we'll inform you via the dashboard or Discord.
      </Section>

      <div className="text-center mt-10 text-slate-400">
        For any questions, contact us at <a href="mailto:support@windvpn.app" className="text-teal-300 hover:underline">support@windvpn.app</a>.
      </div>
    </div>
  );
}
