"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiGoogleplay } from "react-icons/si";
import { FaApple } from "react-icons/fa";
import { IoSettingsOutline } from "react-icons/io5";
import GtnAuthForm from "@/components/GtnAuthForm";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "./page.module.css";

const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_STORE_URL || "#";
const IOS_URL = process.env.NEXT_PUBLIC_IOS_STORE_URL || "#";
const X_URL = process.env.NEXT_PUBLIC_X_URL || "https://x.com/";
const LINKEDIN_URL = process.env.NEXT_PUBLIC_LINKEDIN_URL || "https://www.linkedin.com/";
const ANDROID_APK_URL = "/downloads/app-release.apk";

function AuthFallback() {
  return (
    <div className="auth-embedded" style={{ minHeight: "200px" }}>
      <div className="auth-card" style={{ textAlign: "center", color: "#94a3b8", width: "100%" }}>
        Loading…
      </div>
    </div>
  );
}

export default function HeroClient() {
  return (
    <main className={styles.heroPage}>
      <div className={styles.heroTop}>
        <ThemeToggle className={styles.themeToggleHero} label="Dark mode" />
      </div>

      <div className={styles.heroCenter}>
        <Link href="/" className={styles.logoWrap} aria-label="GTN home">
          <Image src="/gtn-logo.png" alt="GTN" width={200} height={62} priority />
        </Link>

        <h1 className={styles.welcome}>Welcome to GTN</h1>
        <p className={styles.tagline}>Global communication without borders</p>

        <div className={styles.authBlock}>
          <Suspense fallback={<AuthFallback />}>
            <GtnAuthForm variant="embedded" />
          </Suspense>
        </div>

        <div className={styles.downloadSection}>
          <p className={styles.downloadLabel}>Download App</p>
          <div className={styles.storeRow}>
            <a
              href={ANDROID_APK_URL}
              className={styles.storeBtn}
              download
            >
              <span className={styles.storeIcon} aria-hidden>
                <SiGoogleplay size={22} />
              </span>
              Android
            </a>
            <a
              href={IOS_URL}
              className={styles.storeBtn}
              {...(IOS_URL !== "#" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <span className={styles.storeIcon} aria-hidden>
                <FaApple size={22} />
              </span>
              iOS
            </a>
          </div>
        </div>

        <div className={styles.heroLinksRow}>
          <Link href="/login" className={styles.heroSecondaryLink}>
            Open sign in full screen
          </Link>

        </div>

        <div className={styles.heroSocialRow} aria-label="Social links">
          <a
            href={X_URL}
            className={styles.heroSocialIcon}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter / X"
            title="Twitter / X"
          >
            <Image src="/icons/x.svg" alt="" width={20} height={20} aria-hidden />
          </a>
          <a
            href={LINKEDIN_URL}
            className={styles.heroSocialIcon}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            title="LinkedIn"
          >
            <Image src="/icons/linkedin.svg" alt="" width={22} height={22} aria-hidden />
          </a>
        </div>
      </div>
    </main>
  );
}
