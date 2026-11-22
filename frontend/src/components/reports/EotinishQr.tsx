import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { Smartphone } from "lucide-react";

/**
 * Desktop only: a QR code with the eOtinish link, so the resident can continue on
 * the phone and sign in with eGov Mobile. The code is drawn in the browser, so the
 * link is not sent to any QR service. It only opens the portal: the appeal is still
 * submitted and signed by the person themself.
 */
export function EotinishQr({ url }: { url: string }) {
  const { t } = useTranslation();
  return (
    <aside aria-labelledby="eotinish-qr" className="hidden items-center gap-4 rounded-xl border bg-background p-3 md:flex">
      {/* White quiet zone around the code keeps it scannable on the dark theme */}
      <div className="shrink-0 rounded-lg bg-white p-2">
        <QRCodeSVG value={url} size={96} level="M" bgColor="#ffffff" fgColor="#0e1512" title={t("appeal.qr.alt")} />
      </div>
      <div className="flex flex-col gap-1">
        <h4 id="eotinish-qr" className="flex items-center gap-1.5 text-sm font-bold">
          <Smartphone size={15} aria-hidden="true" className="text-primary" />
          {t("appeal.qr.title")}
        </h4>
        <p className="text-xs text-muted-foreground">{t("appeal.qr.text")}</p>
      </div>
    </aside>
  );
}
