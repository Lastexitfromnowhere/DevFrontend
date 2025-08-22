import React from "react";
import Link from "next/link";
import { Github, Twitter } from "lucide-react";
interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
}
const FooterLink = ({ href, children }: FooterLinkProps) => (
  <Link
    href={href}
    className="text-gray-400 hover:text-blue-400 transition-colors"
  >
    {children}
  </Link>
);
const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {}
          <div>
            <h3 className="text-blue-400 font-semibold mb-4">Wind VPN</h3>
            <ul className="space-y-2">
              <li>
                <FooterLink href="/about">About Us</FooterLink>
              </li>
              <li>
                <FooterLink href="/contact">Contact</FooterLink>
              </li>
            </ul>
          </div>
          {}
          <div>
            <h3 className="text-blue-400 font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <FooterLink href="/faq">FAQ</FooterLink>
              </li>
              <li>
                <FooterLink href="/run-node">Run a Node</FooterLink>
              </li>
            </ul>
          </div>
          {}
          <div>
            <h3 className="text-blue-400 font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <FooterLink href="/terms">Terms of Service</FooterLink>
              </li>
              <li>
                <FooterLink href="/privacy-policy">Privacy Policy</FooterLink>
              </li>
            </ul>
          </div>
          {}
          <div>
            <h3 className="text-blue-400 font-semibold mb-4">Connect</h3>
            <div className="flex space-x-4">
              <a
                href="https:
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                <Github className="w-6 h-6" />
              </a>
              <a
                href="https:
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                <Twitter className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Wind VPN. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
