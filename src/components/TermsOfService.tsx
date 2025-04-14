import React from "react";
import { ScrollText, ShieldAlert, Users, Clock, RefreshCcw, Mail } from "lucide-react";

const Section = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
  <div className="bg-slate-800 rounded-2xl p-6 shadow-xl mb-6 border border-slate-700">
    <h2 className="text-xl text-sky-400 font-semibold flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5 text-sky-300" />
      {title}
    </h2>
    <p className="text-slate-300 leading-relaxed">{children}</p>
  </div>
);

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center text-teal-300 mb-8">
        Terms of Service
      </h1>

      <Section icon={ShieldAlert} title="1. Acceptable Use">
        You agree not to use the VPN for any unlawful, harmful, or fraudulent activities. Abuse may result in suspension or ban from the platform.
      </Section>

      <Section icon={Users} title="2. Account Responsibility">
        You are solely responsible for securing access to your wallet and account. We are not liable for any unauthorized usage.
      </Section>

      <Section icon={Clock} title="3. Service Availability">
        We aim to provide high uptime, but the service is offered "as is". There may be interruptions due to maintenance or unforeseen issues.
      </Section>

      <Section icon={ScrollText} title="4. Rewards System">
        Rewards are based on uptime and node activity. We reserve the right to adjust reward mechanics, frequency, or distribution models at any time.
      </Section>

      <Section icon={RefreshCcw} title="5. Changes to Terms">
        We may revise these terms as needed. Continued use of the service after changes means you accept the updated terms.
      </Section>

      <Section icon={Mail} title="6. Contact">
        For questions or support, contact us at <a href="mailto:support@windvpn.app" className="text-sky-300 hover:underline">support@windvpn.app</a>.
      </Section>
    </div>
  );
}
