import HeroClient from "./HeroClient";

export const metadata = {
  title: "GTN",
  description: "Welcome to GTN — sign in or create an account. Global communication without borders.",
  openGraph: {
    title: "GTN — Global Telecom Network",
    description: "Login, sign up, and download the GTN app.",
    url: "/",
    images: ["/gtn-logo.png"],
  },
};

export default function Home() {
  return <HeroClient />;
}
