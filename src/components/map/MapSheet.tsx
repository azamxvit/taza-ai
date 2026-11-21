import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks";

interface MapSheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible title (visually hidden — the content renders its own heading). */
  title: string;
  children: ReactNode;
}

/**
 * Non-modal shadcn Drawer (vaul): a draggable bottom sheet on mobile and a
 * floating panel on the right on desktop. The map stays interactive.
 */
export function MapSheet({ open, onClose, title, children }: MapSheetProps) {
  const { t } = useTranslation();
  const desktop = useMediaQuery(DESKTOP_QUERY);

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      direction={desktop ? "right" : "bottom"}
      modal={false}
    >
      <DrawerContent
        overlay={false}
        onInteractOutside={(e) => e.preventDefault()}
        className="z-[1200] border bg-card shadow-[0_-12px_40px_-10px_rgba(0,0,0,.7)]
          data-[vaul-drawer-direction=bottom]:max-h-[82dvh] data-[vaul-drawer-direction=bottom]:rounded-t-[24px]
          data-[vaul-drawer-direction=right]:top-[84px]! data-[vaul-drawer-direction=right]:right-4! data-[vaul-drawer-direction=right]:bottom-4!
          data-[vaul-drawer-direction=right]:w-[420px]! data-[vaul-drawer-direction=right]:max-w-none! data-[vaul-drawer-direction=right]:rounded-[20px]"
      >
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        <DrawerDescription className="sr-only">{title}</DrawerDescription>
        <DrawerClose asChild>
          <Button
            variant="secondary"
            size="icon-lg"
            aria-label={t("report.close")}
            className="absolute top-3 right-3 z-10 rounded-full"
          >
            <X />
          </Button>
        </DrawerClose>
        <div
          className="overflow-y-auto overscroll-contain px-5 pt-3 md:pt-5"
          style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
