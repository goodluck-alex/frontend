"use client";

import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "@/app/legal.module.css";

export default function LegalPublicShell({ title, children }) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/">
          <Image src="/gtn-logo.png" alt="GTN logo" width={180} height={56} priority />
        </Link>
        <div className={styles.headerActions}>
          <ThemeToggle label="Dark mode" />
          <Link href="/" className={styles.toggle}>
            Home
          </Link>
        </div>
      </header>

      <section className={styles.container}>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.legalDoc}>{children}</div>
      </section>

      <footer className={styles.footer}>
        <p>
          <Link href="/about">About</Link> | <Link href="/privacy">Privacy</Link> |{" "}
          <Link href="/terms">Terms</Link> | <Link href="/contact">Contact</Link>
        </p>
        <p className={styles.footerSub}>
          <Link href="/dashboard?tab=settings">App settings</Link>
        </p>
      </footer>
    </main>
  );
}
