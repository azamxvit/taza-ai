import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Camera, Sparkles, FileText, Code, ShieldCheck } from "lucide-react";
import { LogoMark } from "./layout/Logo";

const STEPS = [
  { icon: Camera, key: "1" },
  { icon: Sparkles, key: "2" },
  { icon: FileText, key: "3" },
];

export default function AboutPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-4xl mx-auto px-4">
      <section className="rounded-[24px] bg-gradient-to-br from-eco/15 via-surface to-aqua/10 border border-line p-6 md:p-10">
        <LogoMark size={48} />
        <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-ink">{t("about.title")}</h1>
        <p className="mt-3 text-muted text-lg leading-relaxed max-w-2xl">{t("about.lead")}</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-eco text-night font-bold">
          {t("about.cta")}
        </Link>
      </section>

      <section className="grid md:grid-cols-3 gap-3 mt-4">
        {STEPS.map(({ icon: Icon, key }) => (
          <div key={key} className="rounded-[18px] bg-surface border border-line p-5">
            <div className="w-10 h-10 rounded-xl bg-eco/15 text-eco flex items-center justify-center">
              <Icon size={20} aria-hidden="true" />
            </div>
            <h2 className="mt-3 font-bold text-ink">
              {key}. {t(`about.step${key}Title`)}
            </h2>
            <p className="mt-1 text-sm text-muted">{t(`about.step${key}`)}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-[18px] bg-surface border border-line p-5 flex gap-3">
        <ShieldCheck size={20} className="text-eco shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-muted">{t("about.ethics")}</p>
      </section>

      <section className="mt-4 rounded-[18px] bg-surface border border-line p-5">
        <h2 className="font-bold text-ink flex items-center gap-2">
          <Code size={18} aria-hidden="true" /> {t("about.openSource")}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {t("about.basedOn", { name: "CleanCity", author: "Robibiruk" })}{" "}
          <a className="text-eco underline" href="https://github.com/Robibiruk/clean-city" target="_blank" rel="noreferrer">
            github.com/Robibiruk/clean-city
          </a>
        </p>
        <h3 className="mt-4 font-bold text-ink text-sm">{t("about.dataSources")}</h3>
        <ul className="mt-1 text-sm text-muted list-disc pl-5">
          <li>OpenStreetMap, CARTO, Esri</li>
        </ul>
      </section>
    </div>
  );
}
