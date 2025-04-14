import React from "react";
import Link from "next/link";
import { Mail, MessageCircle, Github, Twitter } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface ContactCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
  linkText: string;
}

const ContactCard = ({ icon: Icon, title, description, link, linkText }: ContactCardProps) => (
  <Card className="h-full" variant="hover">
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl text-blue-300 font-semibold">{title}</h2>
      </div>
      <p className="text-gray-300 mb-4 leading-relaxed flex-grow">{description}</p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
      >
        {linkText} →
      </a>
    </div>
  </Card>
);

const contactCards: ContactCardProps[] = [
  {
    icon: MessageCircle,
    title: "Discord Community",
    description: "Join our Discord server for live support, updates, and to connect with other node operators.",
    link: "https://discord.gg/windvpn",
    linkText: "Join Discord"
  },
  {
    icon: Mail,
    title: "Email Support",
    description: "Have a specific question? Send us an email and we'll get back to you within 24 hours.",
    link: "mailto:support@windvpn.app",
    linkText: "Email Us"
  },
  {
    icon: Github,
    title: "GitHub",
    description: "Check out our open-source code, report issues, or contribute to the project.",
    link: "https://github.com/your-repo",
    linkText: "View Repository"
  },
  {
    icon: Twitter,
    title: "Twitter",
    description: "Follow us for the latest updates, announcements, and tech insights.",
    link: "https://twitter.com/windvpn",
    linkText: "Follow Us"
  }
];

export default function Contact() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center text-blue-400 mb-8">
        Contact Us
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {contactCards.map((card, index) => (
          <ContactCard key={index} {...card} />
        ))}
      </div>

      <Card className="text-center" variant="hover">
        <h2 className="text-2xl font-semibold text-blue-300 mb-4">
          Want to Become a Node Operator?
        </h2>
        <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
          Interested in running a node and earning rewards? Check out our detailed guide on getting started.
        </p>
        <Link
          href="/run-node"
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Learn About Running a Node →
        </Link>
      </Card>
    </div>
  );
}
