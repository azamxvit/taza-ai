import { createElement } from "react";

// Renders a vanilla lucide IconNode (see categories.js) as an inline SVG.
export default function NodeIcon({ node, size = 18, strokeWidth = 2, className = "", ...rest }) {
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
      className,
      ...rest,
    },
    node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))
  );
}
