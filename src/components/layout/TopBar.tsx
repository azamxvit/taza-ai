import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { LangSwitcher } from "./LangSwitcher";
import { NAV_ITEMS } from "./navItems";

export function TopBar() {
  const { t } = useTranslation();
  return (
    <header
      data-surface="glass"
      className="fixed inset-x-3 top-3 z-[1100] flex items-center gap-3 rounded-2xl py-2 pr-2 pl-3 md:inset-x-4"
    >
      <Link to="/" aria-label={t("app.name")} className="shrink-0">
        <Logo />
      </Link>

      <nav aria-label={t("nav.main")} className="ml-4 hidden md:block">
        <ul className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
            <li key={key}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                    isActive ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`
                }
              >
                <Icon size={16} aria-hidden="true" />
                {t(`nav.${key}`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Button asChild size="lg" className="hidden h-9 rounded-xl px-4 font-bold md:inline-flex">
          <Link to="/?new=1">
            <Camera aria-hidden="true" />
            {t("nav.report")}
          </Link>
        </Button>
        <LangSwitcher />
      </div>
    </header>
  );
}
