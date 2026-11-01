import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy — DJIO ONE Enterprise Suite' };

export default function PrivacyPage() {
  return (
    <div className="static-page-wrap">
      <div className="static-page-header">
        <div className="badge badge-neutral" style={{ marginBottom: '0.75rem' }}>Legal</div>
        <h1>Privacy Policy</h1>
        <p className="static-page-meta">Effective date: 1 November 2025 &bull; Last updated: 1 November 2025</p>
      </div>

      <div className="static-page-body">
        <section>
          <h2>1. Introduction</h2>
          <p>
            DJIO Technologies (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the DJIO ONE Enterprise Suite, a cloud-hosted
            CRM and ERP platform. This Privacy Policy describes how we collect, use, disclose, and safeguard
            your information when you use our platform.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <p>We collect information that you provide directly, including:</p>
          <ul>
            <li>Account registration details (name, email, organisation name)</li>
            <li>Platform usage data, audit logs, and session telemetry</li>
            <li>Communication data when you contact our support team</li>
            <li>Configuration and customisation preferences</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, and maintain the platform</li>
            <li>Authenticate users and enforce role-based access controls</li>
            <li>Generate audit trails and compliance reports</li>
            <li>Improve and develop new features</li>
            <li>Respond to support enquiries and technical issues</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Retention</h2>
          <p>
            We retain your data for as long as your enterprise account remains active, or as required by
            applicable law. Soft-deleted records are retained for 90 days before permanent removal.
            You may request data deletion by contacting our data protection team.
          </p>
        </section>

        <section>
          <h2>5. Data Security</h2>
          <p>
            We implement industry-standard security measures including TLS encryption in transit,
            AES-256 encryption at rest, role-based access control (RBAC), multi-factor authentication,
            and regular security audits.
          </p>
        </section>

        <section>
          <h2>6. Third-Party Services</h2>
          <p>
            We do not sell your personal data to third parties. We may share data with service providers
            acting on our behalf (hosting, monitoring) who are bound by confidentiality agreements.
          </p>
        </section>

        <section>
          <h2>7. Your Rights</h2>
          <p>Under applicable data protection law you have the right to access, correct, or delete your
          personal data. Requests can be directed to our support team.</p>
        </section>

        <section>
          <h2>8. Contact Us</h2>
          <p>For privacy-related enquiries: <strong>privacy@djio.one</strong></p>
        </section>
      </div>
    </div>
  );
}
