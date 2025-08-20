import React from 'react';
import Link from 'next/link';
import '../globals.css';

export default function TokenomicsPage() {
  return (
    <div className="container">
      <header>
        <h1>
          <img src="/logo-lastparadox.png" alt="Last Parad0x vPN" className="logo" />
          Last Parad0x vPN - RWRD Tokenomics
        </h1>
        <p>Complete Token Distribution & Economics</p>
      </header>

      <main>
        <div className="tokenomics-content">
          {/* Token Overview */}
          <section className="token-overview">
            <h2>🪙 RWRD Token Overview</h2>
            <div className="token-stats">
              <div className="stat-item">
                <span className="label">Total Supply</span>
                <span className="value">1,000,000,000 RWRD</span>
              </div>
              <div className="stat-item">
                <span className="label">Network</span>
                <span className="value">Solana (SPL Token)</span>
              </div>
              <div className="stat-item">
                <span className="label">Token Type</span>
                <span className="value">Utility & Governance</span>
              </div>
            </div>
          </section>

          {/* Distribution Chart */}
          <section className="distribution-section">
            <h2>📊 Token Distribution</h2>
            <div className="distribution-grid">
              <div className="distribution-item">
                <div className="percentage">40%</div>
                <div className="category">Community & Rewards</div>
                <div className="amount">400,000,000 RWRD</div>
                <div className="description">Staking rewards, airdrops, community incentives</div>
              </div>
              
              <div className="distribution-item">
                <div className="percentage">25%</div>
                <div className="category">Presale (NFT Holders)</div>
                <div className="amount">250,000,000 RWRD</div>
                <div className="description">Exclusive access for NFT presale pass holders</div>
              </div>
              
              <div className="distribution-item">
                <div className="percentage">15%</div>
                <div className="category">Development Team</div>
                <div className="amount">150,000,000 RWRD</div>
                <div className="description">Team allocation with 2-year vesting</div>
              </div>
              
              <div className="distribution-item">
                <div className="percentage">10%</div>
                <div className="category">Liquidity Pool</div>
                <div className="amount">100,000,000 RWRD</div>
                <div className="description">DEX liquidity and market making</div>
              </div>
              
              <div className="distribution-item">
                <div className="percentage">5%</div>
                <div className="category">Marketing & Partnerships</div>
                <div className="amount">50,000,000 RWRD</div>
                <div className="description">Growth initiatives and strategic partnerships</div>
              </div>
              
              <div className="distribution-item">
                <div className="percentage">5%</div>
                <div className="category">Reserve Fund</div>
                <div className="amount">50,000,000 RWRD</div>
                <div className="description">Emergency fund and future development</div>
              </div>
            </div>
          </section>

          {/* Utility Section */}
          <section className="utility-section">
            <h2>⚡ Token Utility</h2>
            <div className="utility-grid">
              <div className="utility-item">
                <h3>🔒 VPN Access</h3>
                <p>Pay for premium VPN services and features with RWRD tokens</p>
              </div>
              
              <div className="utility-item">
                <h3>🗳️ Governance</h3>
                <p>Vote on protocol upgrades, feature additions, and community proposals</p>
              </div>
              
              <div className="utility-item">
                <h3>💰 Staking Rewards</h3>
                <p>Stake RWRD tokens to earn passive income and additional benefits</p>
              </div>
              
              <div className="utility-item">
                <h3>🎁 Exclusive Access</h3>
                <p>Access to beta features, premium support, and special events</p>
              </div>
            </div>
          </section>

          {/* Presale Info */}
          <section className="presale-info">
            <h2>🚀 Presale Information</h2>
            <div className="presale-details">
              <div className="presale-tier">
                <h3>NFT Holder Presale</h3>
                <div className="tier-details">
                  <div className="detail-item">
                    <span className="label">Price</span>
                    <span className="value">$0.001 per RWRD</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Allocation</span>
                    <span className="value">250,000,000 RWRD</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Min Purchase</span>
                    <span className="value">10,000 RWRD</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Max Purchase</span>
                    <span className="value">1,000,000 RWRD</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Vesting Schedule */}
          <section className="vesting-section">
            <h2>⏰ Vesting Schedule</h2>
            <div className="vesting-timeline">
              <div className="timeline-item">
                <div className="timeline-date">TGE (Token Generation Event)</div>
                <div className="timeline-desc">25% of presale tokens unlocked</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-date">Month 3</div>
                <div className="timeline-desc">Additional 25% unlocked</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-date">Month 6</div>
                <div className="timeline-desc">Additional 25% unlocked</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-date">Month 12</div>
                <div className="timeline-desc">Final 25% unlocked</div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="cta-section">
            <h2>🎯 Get Your Presale Access</h2>
            <p>Mint your NFT presale pass to get exclusive access to RWRD tokens at the lowest price!</p>
            <Link href="/" className="btn btn-mint">🚀 Mint Presale Pass</Link>
          </section>
        </div>
      </main>

      <footer>
        <p className="copyright"> 2024 Last Parad0x vPN — All rights reserved</p>
        <div className="social-links">
          <a href="https://discord.gg/w4xvwUQg" target="_blank" rel="noopener noreferrer" className="social-link">Discord</a>
          <a href="https://x.com/LastParadox__" target="_blank" rel="noopener noreferrer" className="social-link">Twitter</a>
          <a href="https://github.com/Lastexitfromnowhere" target="_blank" rel="noopener noreferrer" className="social-link">GitHub</a>
          <Link href="/" className="social-link">Mint Page</Link>
        </div>
      </footer>
    </div>
  );
}
