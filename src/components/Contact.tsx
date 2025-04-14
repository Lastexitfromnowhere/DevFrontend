import React from "react";
import { Mail, MessageCircle, Github, Twitter } from "lucide-react";

const ContactCard = ({ icon: Icon, title, description, link, linkText }: { 
  icon: any, 
  title: string, 
  description: string, 
  link: string,
  linkText: string 
}) => (
  <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
    <div className="flex items-center gap-3 mb-3">
      <Icon className="w-6 h-6 text-indigo-400" />
      <h2 className="text-xl text-indigo-300 font-semibold">{title}</h2>
    </div>
    <p className="text-slate-300 mb-4 leading-relaxed">{description}</p>
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
    >
      {linkText} →
    </a>
  </div>
);

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center text-indigo-300 mb-8">
        Contact Us
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ContactCard
          icon={MessageCircle}
          title="Discord Community"
          description="Join our Discord server for live support, updates, and to connect with other node operators."
          link="https://discord.gg/windvpn"
          linkText="Join Discord"
        />

        <ContactCard
          icon={Mail}
          title="Email Support"
          description="Have a specific question? Send us an email and we'll get back to you within 24 hours."
          link="mailto:support@windvpn.app"
          linkText="Email Us"
        />

        <ContactCard
          icon={Github}
          title="GitHub"
          description="Check out our open-source code, report issues, or contribute to the project."
          link="https://github.com/your-repo"
          linkText="View Repository"
        />

        <ContactCard
          icon={Twitter}
          title="Twitter"
          description="Follow us for the latest updates, announcements, and tech insights."
          link="https://twitter.com/windvpn"
          linkText="Follow Us"
        />
      </div>

      <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-700">
        <h2 className="text-2xl font-semibold text-indigo-300 mb-4">
          Want to Become a Node Operator?
        </h2>
        <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
          Interested in running a node and earning rewards? Check out our detailed guide on getting started.
        </p>
        <a
          href="/run-node"
          className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Learn About Running a Node →
        </a>
      </div>
    </div>
  );
}
