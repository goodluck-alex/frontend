export default function PrivacyBody({ className = "" }) {
  return (
    <div className={className}>
      <p>
        At GTN, your privacy is a top priority. We are committed to protecting your personal information and ensuring you
        feel safe using our services.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li>Account information including GTN number, username, and contact info.</li>
        <li>Usage data such as calls, messages, and app interactions.</li>
        <li>Device information and app performance data.</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>Provide and improve GTN services.</li>
        <li>Ensure secure communication and prevent fraud.</li>
        <li>Enable referrals, rewards, and community features.</li>
        <li>Comply with legal and regulatory requirements.</li>
      </ul>

      <h2>Data Sharing</h2>
      <p>GTN does not sell your personal data. Information may be shared with:</p>
      <ul>
        <li>Trusted service providers for call, messaging, and billing services.</li>
        <li>Law enforcement or legal entities when required by law.</li>
      </ul>

      <h2>Your Rights</h2>
      <p>
        You can manage your data, request corrections, or account deletion by contacting us at{" "}
        <a href="mailto:support@gtnnetwork.com">support@gtnnetwork.com</a>.
      </p>
    </div>
  );
}
