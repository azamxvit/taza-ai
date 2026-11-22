import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

/** Mandatory note next to every AI output: "Оценка ИИ, может ошибаться". */
export function AiNotice() {
  const { t } = useTranslation();
  return (
    <small className="flex items-center gap-1.5">
      <Sparkles size={12} aria-hidden="true" className="shrink-0 text-aqua" />
      {t("app.aiDisclaimer")}
    </small>
  );
}
