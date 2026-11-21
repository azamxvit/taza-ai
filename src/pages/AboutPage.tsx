import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, CheckCircle2, Code, Database, FileText, FlaskConical, Lock, Satellite, ShieldCheck, Sparkles, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/layout";

const STEPS = [
  { icon: Camera, key: "1" },
  { icon: Sparkles, key: "2" },
  { icon: FileText, key: "3" },
  { icon: CheckCircle2, key: "4" },
] as const;

const FEATURES = [
  { icon: Wind, key: "air", to: "/air" },
  { icon: Satellite, key: "fires", to: "/" },
] as const;

const SOURCES = ["osm", "meteo", "firms", "gemini"] as const;

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

      <section aria-labelledby="how">
        <h2 id="how" className="mb-3 text-lg">{t("about.how")}</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, key }) => (
            <li key={key}>
              <Card className={`h-full gap-2 ${CARD}`}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3 className="text-base">
                  {key}. {t(`about.step${key}Title`)}
                </h3>
                <p className="text-sm text-muted-foreground">{t(`about.step${key}`)}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="more">
        <h2 id="more" className="mb-3 text-lg">{t("about.more")}</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, key, to }) => (
            <li key={key}>
              <Card className={`relative h-full flex-row items-start gap-3 transition hover:border-primary/60 ${CARD}`}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-aqua/15 text-aqua">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-1">
                  <h3 className="text-base">
                    <Link to={to} className="after:absolute after:inset-0">
                      {t(`about.feature.${key}.title`)}
                    </Link>
                  </h3>
                  <p className="text-sm text-muted-foreground">{t(`about.feature.${key}.text`)}</p>
                </span>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={t("about.principles")} className="grid gap-3 md:grid-cols-3">
        <Card className={`flex-row items-start gap-3 ${CARD}`}>
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t("about.ethics")}</p>
        </Card>
        <Card className={`flex-row items-start gap-3 ${CARD}`}>
          <Lock size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t("about.privacy")}</p>
        </Card>
        <Card className={`flex-row items-start gap-3 ${CARD}`}>
          <FlaskConical size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t("about.demo")}</p>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card className={`gap-2 ${CARD}`}>
          <h2 className="flex items-center gap-2 text-base">
            <Database size={18} aria-hidden="true" /> {t("about.dataSources")}
          </h2>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
            {SOURCES.map((key) => (
              <li key={key}>{t(`about.source.${key}`)}</li>
            ))}
          </ul>
        </Card>
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
        </Card>
      </section>
    </>
  );
}
