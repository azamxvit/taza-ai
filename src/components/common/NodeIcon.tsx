import { createElement, type SVGProps } from "react";
import type { IconNode } from "lucide";

interface NodeIconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  node: IconNode;
  size?: number;
}

/** Renders a vanilla lucide IconNode (see lib/categories) as an inline SVG. */
export function NodeIcon({ node, size = 18, strokeWidth = 2, ...rest }: NodeIconProps) {
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
      ...rest,
    },
    node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))
  );
}
