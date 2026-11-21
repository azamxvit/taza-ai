import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, Code, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/layout";

const STEPS = [
  { icon: Camera, key: "1" },
  { icon: Sparkles, key: "2" },
  { icon: FileText, key: "3" },
] as const;

const CARD = "rounded-[18px] border p-5 ring-0";

export function AboutPage() {
  const { t } = useTranslation();
  return (
    <>
      <header className="rounded-[24px] border bg-gradient-to-br from-primary/15 via-card to-aqua/10 p-6 md:p-10">
        <LogoMark size={48} />
        <h1 className="mt-4">{t("about.title")}</h1>
        <p className="mt-3 max-w-3xl text-lg">{t("about.lead")}</p>
        <Button asChild size="lg" className="mt-6 h-11 rounded-xl px-5 font-bold">
          <Link to="/">{t("about.cta")}</Link>
        </Button>
      </header>

      <section aria-label={t("about.title")}>
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, key }) => (
            <li key={key}>
              <Card className={`h-full gap-2 ${CARD}`}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h2 className="text-base">
                  {key}. {t(`about.step${key}Title`)}
                </h2>
                <p className="text-sm text-muted-foreground">{t(`about.step${key}`)}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <Card className={`flex-row items-start gap-3 ${CARD}`}>
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t("about.ethics")}</p>
        </Card>
      </section>

      <section>
        <Card className={`gap-2 ${CARD}`}>
          <h2 className="flex items-center gap-2 text-base">
            <Code size={18} aria-hidden="true" /> {t("about.openSource")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("about.basedOn", { name: "CleanCity", author: "Robibiruk" })}{" "}
            <a href="https://github.com/Robibiruk/clean-city" target="_blank" rel="noreferrer">
              github.com/Robibiruk/clean-city
            </a>
          </p>
          <h3 className="mt-2 text-sm">{t("about.dataSources")}</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            <li>OpenStreetMap, Esri</li>
          </ul>
        </Card>
      </section>
    </>
  );
}
