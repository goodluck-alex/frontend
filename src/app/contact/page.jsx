import LegalPublicShell from "@/components/LegalPublicShell";
import ContactBody from "@/components/legal/ContactBody";

export const metadata = {
  title: "Contact",
  description: "Contact GTN support through email and official social channels.",
  openGraph: {
    title: "Contact GTN - Global Telecom Network",
    url: "/contact",
    images: ["/gtn-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact GTN - Global Telecom Network",
    images: ["/gtn-logo.png"],
  },
};

export default function ContactPage() {
  return (
    <LegalPublicShell title="Contact GTN — Global Telecom Network">
      <ContactBody variant="full" />
    </LegalPublicShell>
  );
}
