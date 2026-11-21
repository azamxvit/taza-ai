import { useTranslation } from "react-i18next";

/** Required credit for Open-Meteo data (CC BY 4.0) and the CAMS model behind it. */
export function AirAttribution() {
  const { t } = useTranslation();
  return (
    <p className="text-xs text-faint">
      {t("air.attribution.data")}{" "}
      <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a>
      {" "}({t("air.attribution.model")}{" "}
      <a href="https://atmosphere.copernicus.eu/" target="_blank" rel="noopener noreferrer">Copernicus CAMS</a>),{" "}
      {t("air.attribution.license")}{" "}
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.{" "}
      {t("air.attribution.note")}
    </p>
  );
}
