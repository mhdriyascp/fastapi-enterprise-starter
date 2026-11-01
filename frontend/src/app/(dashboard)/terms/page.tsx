import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Use — DJIO ONE Enterprise Suite' };

export default function TermsPage() {
  return (
    <div className="static-page-wrap">
      <div className="static-page-header">
        <div className="badge badge-neutral" style={{ marginBottom: '0.75rem' }}>Legal</div>
        <h1>Terms of Use</h1>
        <p className="static-page-meta">Effective date: 1 November 2025 &bull; Last updated: 1 November 2025</p>
      </div>

      <div className="static-page-body">
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the DJIO ONE Enterprise Suite (&ldquo;Platform&rdquo;), you agree to be
            bound by these Terms of Use. If you do not agree, you may not use the Platform.
          </p>
        </section>

        <section>
          <h2>2. Licence Grant</h2>
          <p>
            Subject to your compliance with these Terms, DJIO Technologies grants you a limited,
            non-exclusive, non-transferable licence to access and use the Platform solely for your
            internal business operations.
          </p>
        </section>

        <section>
          <h2>3. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Reverse-engineer, decompile, or disassemble any component of the Platform</li>
            <li>Attempt to gain unauthorised access to other accounts or systems</li>
            <li>Use the Platform to store or transmit unlawful content</li>
            <li>Resell or sublicense access to third parties without written consent</li>
            <li>Use automated scripts to scrape or extract data at scale</li>
          </ul>
        </section>

        <section>
          <h2>4. Intellectual Property</h2>
          <p>
            The Platform, including its source code, design, trademarks, and documentation, is owned
            by DJIO Technologies and protected by intellectual property laws. Your data remains your
            property.
          </p>
        </section>

        <section>
          <h2>5. Service Availability</h2>
          <p>
            We target 99.9% uptime but do not guarantee uninterrupted service. Planned maintenance
            windows will be communicated in advance. We are not liable for losses arising from
            scheduled or emergency downtime.
          </p>
        </section>

        <section>
          <h2>6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, DJIO Technologies shall not be liable for any
            indirect, incidental, special, or consequential damages arising from your use of the Platform.
          </p>
        </section>

        <section>
          <h2>7. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction in which DJIO Technologies is
            incorporated. Disputes shall be resolved through binding arbitration.
          </p>
        </section>

        <section>
          <h2>8. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Continued use of the Platform
            after changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2>9. Contact</h2>
          <p>Legal enquiries: <strong>legal@djio.one</strong></p>
        </section>
      </div>
    </div>
  );
}
