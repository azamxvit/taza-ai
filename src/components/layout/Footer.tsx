import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer>
      <small>© {new Date().getFullYear()} Taza AI</small>
      <small>
        <a href="https://github.com/Robibiruk/clean-city" target="_blank" rel="noreferrer">
          {t("footer.basedOn", { name: "CleanCity" })}
        </a>
      </small>
      <small>{t("footer.osm")}</small>
    </footer>
  );
}
