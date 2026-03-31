export default function TermsBody({ className = "" }) {
  return (
    <div className={className}>
      <p>
        Welcome to GTN. By using our services, you agree to the following terms and conditions. Please read them
        carefully.
      </p>

      <h2>Use of Services</h2>
      <ul>
        <li>GTN services are intended for personal, non-commercial use unless otherwise agreed.</li>
        <li>Users must provide accurate information when registering a GTN number.</li>
        <li>You may not misuse GTN services or attempt to disrupt the platform.</li>
      </ul>

      <h2>Account Security</h2>
      <ul>
        <li>Keep your GTN credentials secure and do not share them with others.</li>
        <li>GTN is not responsible for unauthorized access caused by user negligence.</li>
      </ul>

      <h2>Content</h2>
      <p>
        All communications on GTN must comply with local laws and regulations. GTN may remove content that violates our
        policies.
      </p>

      <h2>Modifications</h2>
      <p>GTN reserves the right to update these terms at any time. Users will be notified of significant changes.</p>

      <h2>Contact</h2>
      <p>
        For questions about these Terms, please contact{" "}
        <a href="mailto:support@gtnnetwork.com">support@gtnnetwork.com</a>.
      </p>
    </div>
  );
}
