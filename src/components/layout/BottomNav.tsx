import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import { NAV_ITEMS, type NavItem } from "./navItems";

/** Mobile-only bottom navigation with a big round "Report" button in the middle. */
export function BottomNav() {
  const { t } = useTranslation();

  const item = ({ to, key, icon: Icon, end }: NavItem) => (
    <li key={key} className="flex-1">
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold transition ${
            isActive ? "text-primary" : "text-muted-foreground"
          }`
        }
      >
        <Icon size={22} aria-hidden="true" />
        {t(key === "about" ? "nav.aboutShort" : `nav.${key}`)}
      </NavLink>
    </li>
  );

  return (
    <nav
      aria-label={t("nav.main")}
      data-surface="glass"
      className="fixed inset-x-0 bottom-0 z-[1100] rounded-t-3xl px-2 pt-1.5 md:hidden"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
    >
      <ul className="flex items-end">
        {NAV_ITEMS.slice(0, 2).map(item)}
        <li className="flex flex-1 justify-center">
          <Link
            to="/?new=1"
            aria-label={t("nav.report")}
            className="-mt-8 flex size-[66px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-4px_rgba(61,220,151,.55)] ring-4 ring-background transition active:scale-95"
          >
            <Camera size={26} aria-hidden="true" />
          </Link>
        </li>
        {NAV_ITEMS.slice(2).map(item)}
      </ul>
    </nav>
  );
}
