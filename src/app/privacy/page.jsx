import LegalPublicShell from "@/components/LegalPublicShell";
import PrivacyBody from "@/components/legal/PrivacyBody";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Read how GTN collects, uses, and protects personal data across the Global Telecom Network.",
  openGraph: {
    title: "Privacy Policy - GTN",
    description:
      "Understand GTN privacy practices, data usage, sharing, and your rights as a user.",
    url: "/privacy",
    images: ["/gtn-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy - GTN",
    description:
      "Understand GTN privacy practices, data usage, sharing, and your rights as a user.",
    images: ["/gtn-logo.png"],
  },
};

export default function PrivacyPage() {
  return (
    <LegalPublicShell title="Privacy Policy">
      <PrivacyBody />
    </LegalPublicShell>
  );
}
