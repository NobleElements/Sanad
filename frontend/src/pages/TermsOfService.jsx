import React from 'react';
import LegalPageLayout from './LegalPageLayout';

export default function TermsOfService() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated={new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}>
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using the Sanad platform ("Service"), operated by Noble Elements ("Company", "we", "us"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Sanad provides personal productivity tools including task management, financial tracking, thought logging, and self-hosted file storage capabilities.
      </p>

      <h2>3. User Accounts & Responsibilities</h2>
      <p>
        You are responsible for maintaining the security of your account and password. The Company cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.
      </p>

      <h2>4. Data and Self-Hosting</h2>
      <p>
        Sanad allows for self-hosting of user files and data. We do not assume any liability for data loss, breaches, or infrastructure failure occurring on environments hosted directly by you. You are strongly advised to back up your own data regularly.
      </p>

      <h2>5. Subscription and Payments</h2>
      <p>
        Some features of the Service are billed on a subscription basis ("Subscription(s)"). You will be billed in advance on a recurring and periodic basis (such as monthly or annually).
      </p>

      <h2>6. Termination</h2>
      <p>
        We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
      </p>

      <h2>7. Changes</h2>
      <p>
        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days notice prior to any new terms taking effect.
      </p>

      <h2>8. Governing Law</h2>
      <p>
        These Terms shall be governed and construed in accordance with the laws of Palestine, without regard to its conflict of law provisions.
      </p>

      <h2>9. Contact Us</h2>
      <p>
        If you have any questions about these Terms, please contact us at <strong>support@sanadcloud.app</strong>.
      </p>
    </LegalPageLayout>
  );
}
