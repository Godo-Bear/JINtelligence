/* AI diagrams: the AI tutor can draw a diagram (shapes, arrows, graphs, flowcharts, labelled pictures) as an SVG when the
   student asks for one. The SVG comes from the AI, so it is cleaned here before it's shown: only drawing elements are kept,
   and scripts, event handlers, outside links and embedded pages are all removed. Used from app.js. */
const DIAGRAM_RULES = `DIAGRAMS: If the student asks for a diagram, picture, drawing, graph, chart, flowchart, map, timeline or sketch (or one would clearly make your answer much easier to understand), put ONE complete SVG in the "diagram" field of the JSON; otherwise leave "diagram" as "". SVG rules: start with <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">; first draw a white background <rect>; use simple shapes, lines and arrows (make arrowheads with <marker> or small <polygon>s), and <text> labels at font-size 14 or larger that don't overlap anything; keep it clear, correct and uncluttered, with a short title at the top; use dark strokes (#1b1b1b) and a few soft colours; no scripts, no images, no external links, no <foreignObject>, no animation. Keep it under about 6000 characters. In "reply", say briefly what the diagram shows and how to read it. Every fact, number and label in a diagram must be correct.`;

const SVG_OK_TAGS = new Set(["svg", "g", "defs", "title", "desc", "rect", "circle", "ellipse", "line", "polyline", "polygon", "path", "text", "tspan", "marker", "lineargradient", "radialgradient", "stop", "clippath", "pattern", "symbol"]);

// Returns safe SVG markup, or "" if it isn't a usable SVG.
function sanitizeSVG(source) {
  const src = String(source || "").trim();
  if (!src || src.length > 30000 || !/<svg[\s>]/i.test(src)) return "";
  let doc;
  try { doc = new DOMParser().parseFromString(src, "image/svg+xml"); } catch (e) { return ""; }
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) return "";
  const clean = (el) => {
    [...el.children].forEach((child) => {
      if (!SVG_OK_TAGS.has(child.nodeName.toLowerCase())) { child.remove(); return; }
      clean(child);
    });
    [...el.attributes].forEach((a) => {
      const name = a.name.toLowerCase(), val = a.value;
      if (name.startsWith("on") || name === "style" && /url\s*\(|expression|javascript:/i.test(val)) { el.removeAttribute(a.name); return; }
      if ((name === "href" || name === "xlink:href") && !/^#/.test(val.trim())) el.removeAttribute(a.name);
      else if (/javascript:|data:text\/html/i.test(val)) el.removeAttribute(a.name);
      else if (/url\s*\(/i.test(val) && !/url\(\s*['"]?#/i.test(val)) el.removeAttribute(a.name); // only url(#id) (gradients, markers)
    });
  };
  clean(root);
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!root.getAttribute("viewBox")) root.setAttribute("viewBox", "0 0 600 400");
  root.removeAttribute("width"); root.removeAttribute("height");
  root.setAttribute("role", "img");
  return new XMLSerializer().serializeToString(root);
}
// Does this question ask for a picture? (Those answers aren't saved and shared as plain-text answers.)
const asksForDiagram = (text) => /\b(diagram|draw|drawing|sketch|picture|illustrat\w*|graph|chart|flow ?chart|timeline|map|label(l?ed)?)\b/i.test(String(text || ""));
