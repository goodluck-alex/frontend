import { redirect } from "next/navigation";

export const metadata = {
  title: "Privacy Redirect",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PrivancyRedirectPage() {
  redirect("/privacy");
}
