import React from 'react';
import LegalPageLayout from './LegalPageLayout';

export default function RefundPolicy() {
  return (
    <LegalPageLayout title="Refund Policy" lastUpdated={new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}>
      <h2>1. General Refund Rules</h2>
      <p>
        At Noble Elements, we strive to ensure you are fully satisfied with Sanad. If you are not entirely satisfied with your purchase, we're here to help.
      </p>

      <h2>2. Monthly Subscriptions</h2>
      <p>
        For monthly subscription plans, you can cancel at any time. Once canceled, you will retain access to premium features until the end of your current billing cycle. We do not provide prorated refunds for partial months of service used.
      </p>

      <h2>3. Annual and Lifetime Tiers</h2>
      <p>
        If you have purchased an Annual or Lifetime tier, you are eligible for a full refund within <strong>14 days</strong> of your original purchase date, provided you have not excessively used the storage resources. After 14 days, all purchases are final and non-refundable.
      </p>

      <h2>4. How to Request a Refund</h2>
      <p>
        To request a refund, please contact us at <strong>support@sanadcloud.app</strong> with your account details and order number. Our team will review your request and process eligible refunds to the original method of payment within 5-10 business days.
      </p>

      <h2>5. Exceptions</h2>
      <p>
        Refunds will not be provided for accounts that have been terminated or suspended due to a violation of our Terms of Service.
      </p>
    </LegalPageLayout>
  );
}
