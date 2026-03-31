import Image from "next/image";
import legalStyles from "@/app/legal.module.css";

const TWITTER_URL = "https://twitter.com/GTN_691";
const LINKEDIN_URL = "https://www.linkedin.com/company/gtn-global-telecom-network/";

/** @param {{ className?: string, variant?: "full" | "compact" }} props */
export default function ContactBody({ className = "", variant = "full" }) {
  if (variant === "compact") {
    return (
      <div className={className}>
        <p className="gtn-settings-legal-lead">GTN Global Telecom — reach us directly or follow updates.</p>
        <a href="mailto:support@gtnnetwork.com" className="gtn-settings-action-btn gtn-settings-link-btn">
          Email support@gtnnetwork.com
        </a>
        <a
          href={TWITTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="gtn-settings-action-btn gtn-settings-link-btn"
        >
          Twitter @GTN_691
        </a>
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="gtn-settings-action-btn gtn-settings-link-btn"
        >
          LinkedIn — GTN Global Telecom Network
        </a>
      </div>
    );
  }

  return (
    <div className={className}>
      <p>
        We provide native GTN support to ensure seamless communication and assistance. All support channels are fully
        integrated into the GTN ecosystem.
      </p>

      <h2>GTN Chat Support</h2>
      <p>
        Chat directly with our support team inside the GTN app for fast assistance with your account, calls, messages,
        or technical issues.
      </p>
      <p>Available 24/7 for all users.</p>

      <h2>GTN Voice Support</h2>
      <p>Call our support team using your GTN number. Accessible via the GTN app.</p>

      <h2>Email Support</h2>
      <p>
        <strong>Customer Support:</strong> support@gtnnetwork.com
      </p>
      <p>
        <strong>Business & Partnerships:</strong> business@gtnnetwork.com
      </p>

      <h2>Social</h2>
      <div className={legalStyles.legalContactSocial}>
        <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
          <Image src="/icons/x.svg" alt="" width={28} height={28} />
        </a>
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          <Image src="/icons/linkedin.svg" alt="" width={28} height={28} />
        </a>
      </div>

      <h2>Support Availability</h2>
      <p>GTN Chat Support: 24/7</p>
      <p>Email Support: Monday - Sunday</p>
      <p>Business Support: Business days</p>
    </div>
  );
}
