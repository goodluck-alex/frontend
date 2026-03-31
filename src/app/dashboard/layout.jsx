export default function DashboardLayout({ children }) {
  // Phone UI is rendered by `app/dashboard/page.jsx` (MobileShell),
  // so we keep this layout minimal to avoid re-adding sidebar/topbar.
  return children;
}

