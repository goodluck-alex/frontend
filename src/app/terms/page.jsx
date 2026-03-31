import LegalPublicShell from "@/components/LegalPublicShell";
import TermsBody from "@/components/legal/TermsBody";

export const metadata = {
  title: "Terms of Service",
  description:
    "Read GTN terms of service for platform usage rules, account security, and policy updates.",
  openGraph: {
    title: "Terms of Service - GTN",
    description:
      "Review GTN terms, service usage rules, account obligations, and modification policies.",
    url: "/terms",
    images: ["/gtn-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service - GTN",
    description:
      "Review GTN terms, service usage rules, account obligations, and modification policies.",
    images: ["/gtn-logo.png"],
  },
};

export default function TermsPage() {
  return (
    <LegalPublicShell title="Terms of Service">
      <TermsBody />
    </LegalPublicShell>
  );
}
