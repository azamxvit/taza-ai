import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Images, Layers, LocateFixed, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BASE_LAYER_IDS, type BaseLayerId } from "./layers";

interface MapControlsProps {
  layer: BaseLayerId;
  onLayerChange: (id: BaseLayerId) => void;
  photos: boolean;
  onTogglePhotos: () => void;
  onLocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  shifted: boolean;
}

const controlClass = "size-11 rounded-2xl [&_svg]:size-5!";

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Right-hand map toolbar: base layer, photo markers, geolocation, zoom. */
export function MapControls(props: MapControlsProps) {
  const { t } = useTranslation();
  const { layer, onLayerChange, photos, onTogglePhotos, onLocate, onZoomIn, onZoomOut, shifted } = props;

  return (
    <aside
      aria-label={t("map.layer")}
      className={`fixed top-[128px] right-3 z-[1000] flex flex-col gap-2 transition-[right] ${
        shifted ? "md:right-[452px]" : "md:right-4"
      }`}
    >
      <DropdownMenu>
        <Control label={t("map.layer")}>
          <DropdownMenuTrigger asChild>
            <Button data-surface="glass" variant="ghost" aria-label={t("map.layer")} className={controlClass}>
              <Layers />
            </Button>
          </DropdownMenuTrigger>
        </Control>
        <DropdownMenuContent side="left" align="start" className="z-[1300] min-w-36">
          <DropdownMenuLabel>{t("map.layer")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={layer} onValueChange={(v) => onLayerChange(v as BaseLayerId)}>
            {BASE_LAYER_IDS.map((id) => (
              <DropdownMenuRadioItem key={id} value={id}>
                {t(`map.layers.${id}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Control label={t("map.photos")}>
        <Button
          data-surface={photos ? undefined : "glass"}
          variant={photos ? "default" : "ghost"}
          aria-label={t("map.photos")}
          aria-pressed={photos}
          onClick={onTogglePhotos}
          className={controlClass}
        >
          <Images />
        </Button>
      </Control>

      <Control label={t("map.locate")}>
        <Button data-surface="glass" variant="ghost" aria-label={t("map.locate")} onClick={onLocate} className={controlClass}>
          <LocateFixed />
        </Button>
      </Control>

      <div className="mt-2 hidden flex-col gap-2 md:flex">
        <Button data-surface="glass" variant="ghost" aria-label="+" onClick={onZoomIn} className={controlClass}>
          <Plus />
        </Button>
        <Button data-surface="glass" variant="ghost" aria-label="−" onClick={onZoomOut} className={controlClass}>
          <Minus />
        </Button>
      </div>
    </aside>
  );
}
