import { NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import Logo from "./Logo";
import LangSwitcher from "./LangSwitcher";
import { NAV_ITEMS } from "./navItems";

export default function TopBar() {
  const { t } = useTranslation();
  return (
    <header className="glass fixed top-3 inset-x-3 z-[1100] rounded-2xl pl-3 pr-2 py-2 flex items-center gap-3 md:inset-x-4">
      <Link to="/" aria-label={t("app.name")} className="shrink-0">
        <Logo />
      </Link>

      <nav aria-label={t("nav.main")} className="hidden md:flex items-center gap-1 ml-4">
        {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={key}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition ${
                isActive ? "bg-raised text-eco" : "text-muted hover:text-ink hover:bg-raised/60"
              }`
            }
          >
            <Icon size={16} aria-hidden="true" />
            {t(`nav.${key}`)}
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/?new=1"
          className="hidden md:flex items-center gap-2 bg-eco hover:bg-eco-strong text-night font-bold text-sm px-4 py-2 rounded-xl transition"
        >
          <Camera size={16} aria-hidden="true" />
          {t("nav.report")}
        </Link>
        <LangSwitcher />
      </div>
    </header>
  );
}
