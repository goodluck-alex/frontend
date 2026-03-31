 "use client";

 import Link from "next/link";
 import { useMemo, useEffect, useState } from "react";
 import { useSearchParams } from "next/navigation";
 import { useAuthedUser } from "@/lib/useAuthedUser";
 import { getPaymentMethods } from "@/services/paymentApi";
 import PayShell from "@/components/PayShell";

 function Card({ title, children }) {
   return (
     <div className="plans-card" style={{ marginBottom: 12 }}>
       <div className="plans-section-title">{title}</div>
       {children}
     </div>
   );
 }

 export default function PayNowMobileClient() {
   const sp = useSearchParams();
   const planId = sp.get("planId") || "";
   const { user, loading, isAuthed } = useAuthedUser();
   const [methods, setMethods] = useState([]);

   useEffect(() => {
     if (!isAuthed) return;
     let cancelled = false;
     (async () => {
       try {
         const out = await getPaymentMethods({ country: user?.countryIso || "", currency: "" });
         const list = Array.isArray(out?.methods) ? out.methods : [];
         if (!cancelled) setMethods(list);
       } catch {
         if (!cancelled) setMethods([]);
       }
     })();
     return () => {
       cancelled = true;
     };
   }, [isAuthed, user?.countryIso]);

   const providers = useMemo(() => {
     const row = methods.find((m) => m.method === "mobile_money");
     return Array.isArray(row?.providers) ? row.providers : [];
   }, [methods]);

   if (loading)
     return (
       <PayShell title="Mobile Money">
         <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>
       </PayShell>
     );

   if (!isAuthed) {
     return (
       <PayShell title="Mobile Money">
         <div className="phone-panel phone-panel-scroll plans-screen">
           <Card title="Mobile Money">
             <div className="plans-muted">Sign in to continue.</div>
             <div style={{ marginTop: 10 }}>
               <Link className="plans-upgrade-btn" href={`/login?next=${encodeURIComponent(`/pay-now/mobile?planId=${planId}`)}`}>
                 Go to Login
               </Link>
             </div>
           </Card>
         </div>
       </PayShell>
     );
   }

   return (
     <PayShell title="Mobile Money">
       <div className="phone-panel phone-panel-scroll plans-screen">
         <Card title="Mobile Money">
           <div className="plans-pay-choice-grid">
             {providers.map((p) => (
               <Link
                 key={String(p.id)}
                 className="plans-pay-choice"
                 href={`/pay-now/mobile/${encodeURIComponent(String(p.id).toLowerCase())}?planId=${encodeURIComponent(planId)}`}
               >
                 {String(p.id).toUpperCase()}
               </Link>
             ))}
           </div>
           {providers.length === 0 ? <div className="plans-muted">No mobile money providers enabled.</div> : null}
         </Card>
       </div>
     </PayShell>
   );
 }

