import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="max-w-6xl mx-auto px-4 mt-12 text-xs text-faint flex flex-wrap gap-x-4 gap-y-1">
      <span>© {new Date().getFullYear()} Taza AI</span>
      <a className="hover:text-muted underline" href="https://github.com/Robibiruk/clean-city" target="_blank" rel="noreferrer">
        {t("footer.basedOn", { name: "CleanCity" })}
      </a>
      <span>{t("footer.osm")}</span>
    </footer>
  );
}
