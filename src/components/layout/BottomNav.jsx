import { NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import { NAV_ITEMS } from "./navItems";

// Mobile-only bottom navigation with a big round "Report" button in the middle.
export default function BottomNav() {
  const { t } = useTranslation();
  const left = NAV_ITEMS.slice(0, 2);
  const right = NAV_ITEMS.slice(2);

  const item = ({ to, key, icon: Icon, end }) => (
    <NavLink
      key={key}
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold transition ${
          isActive ? "text-eco" : "text-muted"
        }`
      }
    >
      <Icon size={22} aria-hidden="true" />
      {t(key === "about" ? "nav.aboutShort" : `nav.${key}`)}
    </NavLink>
  );

  return (
    <nav
      aria-label={t("nav.main")}
      className="md:hidden glass fixed bottom-0 inset-x-0 z-[1100] rounded-t-3xl px-2 pt-1.5"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-end">
        {left.map(item)}
        <div className="flex-1 flex justify-center">
          <Link
            to="/?new=1"
            aria-label={t("nav.report")}
            className="-mt-8 w-[66px] h-[66px] rounded-full bg-eco text-night flex flex-col items-center justify-center shadow-[0_8px_24px_-4px_rgba(61,220,151,.55)] ring-4 ring-night active:scale-95 transition"
          >
            <Camera size={26} aria-hidden="true" />
          </Link>
        </div>
        {right.map(item)}
      </div>
    </nav>
  );
}
