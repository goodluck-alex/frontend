import LegalPublicShell from "@/components/LegalPublicShell";
import AboutBody from "@/components/legal/AboutBody";

export const metadata = {
  title: "About",
  description:
    "Learn about GTN mission, core communication features, and global telecom coverage.",
  openGraph: {
    title: "About GTN - Global Telecom Network",
    description:
      "Discover GTN's mission, communication capabilities, and long-term global telecom vision.",
    url: "/about",
    images: ["/gtn-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "About GTN - Global Telecom Network",
    description:
      "Discover GTN's mission, communication capabilities, and long-term global telecom vision.",
    images: ["/gtn-logo.png"],
  },
};

export default function AboutPage() {
  return (
    <LegalPublicShell title="About GTN - Global Telecom Network">
      <AboutBody />
    </LegalPublicShell>
  );
}
