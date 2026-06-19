import React from 'react';
import LegalPageLayout from './LegalPageLayout';

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}>
      <h2>1. Information We Collect</h2>
      <p>
        At Noble Elements, we believe in strict data minimization and privacy. We do <strong>not</strong> use any third-party tracking cookies or collect usage analytics data.
      </p>
      <ul>
        <li><strong>Account Information:</strong> When you register for an account, we collect your email address and username solely for authentication purposes.</li>
      </ul>

      <h2>2. Self-Hosted Data</h2>
      <p>
        For users leveraging the self-hosted file management and storage features, your files remain strictly under your control on your designated storage environment. We do not inspect, aggregate, or sell your private files.
      </p>

      <h2>3. Use of Information</h2>
      <p>We use the collected data strictly for the following operational purposes:</p>
      <ul>
        <li>To provide and maintain our Service</li>
        <li>To notify you about critical changes to our Service</li>
        <li>To provide customer support</li>
      </ul>

      <h2>4. Data Sharing and Disclosure</h2>
      <p>
        We do not sell or share your personal data with third parties except as necessary to provide the service (e.g., payment processors like Paddle or Spaceremit) or when legally required to do so.
      </p>

      <h2>5. Security of Data</h2>
      <p>
        The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
      </p>

      <h2>6. Changes to This Privacy Policy</h2>
      <p>
        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
      </p>

      <h2>7. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, please contact us at <strong>support@sanadcloud.app</strong>.
      </p>
    </LegalPageLayout>
  );
}
