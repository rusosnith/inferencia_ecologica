import define1 from "./576f8943dbfbd395@114.js";

function _1(md){return(
md`# Flow-o-Matic

Edit the textarea below to update the [Sankey diagram](/@d3/sankey-diagram)!`
)}

function _inputOrder(html)
{
  const form = html`<form><label><input name=i type=checkbox > Preserve input order</label>`;
  form.i.onclick = () => (form.value = form.i.checked, form.dispatchEvent(new CustomEvent("input")));
  form.value = form.i.checked;
  return form;
}


function _align(html,URLSearchParams){return(
Object.assign(html`<select>
  <option value=left>Left-aligned
  <option value=right>Right-aligned
  <option value=center>Centered
  <option value=justify selected>Justified
</select>`, {
  value: new URLSearchParams(html`<a href>`.search).get("align") || "justify"
})
)}

function _chart(d3,data,width,height,color_config,unique_nodes)
{
  // Calcular el total para porcentajes
  const total = d3.sum(data.links, (d) => d.value);

  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, width, height]) // Espacio extra para título y fuente
    .style("background", "#fff")
    .style("width", "100%")
    .style("height", "auto");

  const { nodes, links } = d3
    .sankey()
    .nodeId((d) => d.id || d.name)
    .nodeWidth(20)
    .nodePadding(10)
    .extent([
      [1, 40], // Margen superior para título
      [width - 1, height - 40] // Margen inferior para fuente
    ])({
    nodes: data.nodes.map((d) => ({ ...d })),
    links: data.links.map((d) => ({ ...d }))
  });

  // Título
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .style("fill", "#333")
    .text(
      "Traspaso de votos Sept (provinciales) a Oct. (nacionales) en PBA: Inferencia ecológica"
    ); // Cambia por tu título

  // Escala de colores por nodo
  const color = (nodeId) => {
    return (
      color_config.get(nodeId) ||
      d3.schemeCategory10[unique_nodes.indexOf(nodeId) % 10]
    );
  };

  // Defs para los gradientes de links
  const defs = svg.append("defs");
  links.forEach((link, i) => {
    const gradient = defs
      .append("linearGradient")
      .attr("id", `gradient-${i}`)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", link.source.x1)
      .attr("x2", link.target.x0);
    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", color(link.source.id || link.source.name));
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", color(link.target.id || link.target.name));
  });

  // Nodos
  svg
    .append("g")
    .selectAll("rect")
    .data(nodes)
    .join("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("fill", (d) => color(d.id || d.name))
    .append("title")
    .text(
      (d) =>
        `${d.name}\n${((d.value / total) * 100).toFixed(
          1
        )}% (${d.value.toLocaleString()})`
    );

  // Links con gradientes
  svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke-opacity", 0.5)
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", (d, i) => `url(#gradient-${i})`)
    .attr("stroke-width", (d) => Math.max(1, d.width))
    .append("title")
    .text(
      (d) =>
        `${d.source.name} → ${d.target.name}\n${(
          (d.value / total) *
          100
        ).toFixed(1)}% (${d.value.toLocaleString()})`
    );

  // Labels con porcentajes
  svg
    .append("g")
    .style("font", "10px sans-serif")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
    .attr("y", (d) => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
    .text((d) => d.name)
    .append("tspan")
    .attr("fill-opacity", 0.7)
    .text((d) => ` ${((d.value / total) * 100).toFixed(1)}%`);

  // Fuente
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#666")
    .text(
      "Fuente: Datos oficiales procesados por @matidotlol - visualización de @rusosnith"
    ); // Cambia por tu fuente

  return svg.node();
}


async function _5(html,DOM,rasterize,chart,serialize){return(
html`
${DOM.download(await rasterize(chart), "flow-o-matic", "Download as PNG")}
${DOM.download(await serialize(chart), "flow-o-matic", "Download as SVG")}
`
)}

function _dataType(html){return(
Object.assign(html`Formato de los datos: <select>
  <option value=cvs selected="selected">CSV
  <option value=tsv>TSV
</select>`)
)}

function* _source(html)
{
  const textarea = html`<textarea spellcheck="false">EN_BLANCO_2025,EN_BLANCO_Oct2025,53700
EN_BLANCO_2025,LLA_Oct2025,200003
EN_BLANCO_2025,NO_VOTANTES_Oct2025,114078
EN_BLANCO_2025,OTROS_Oct2025,84658
EN_BLANCO_2025,FP_Oct2025,77686
LLA_JxC_2025,EN_BLANCO_Oct2025,92599
LLA_JxC_2025,LLA_Oct2025,1907517
LLA_JxC_2025,NO_VOTANTES_Oct2025,16996
LLA_JxC_2025,OTROS_Oct2025,321279
LLA_JxC_2025,FP_Oct2025,10214
NO_VOTANTES_2025,EN_BLANCO_Oct2025,31527
NO_VOTANTES_2025,LLA_Oct2025,409341
NO_VOTANTES_2025,NO_VOTANTES_Oct2025,3544598
NO_VOTANTES_2025,OTROS_Oct2025,352857
NO_VOTANTES_2025,FP_Oct2025,241372
OTROS_2025,EN_BLANCO_Oct2025,85148
OTROS_2025,LLA_Oct2025,647713
OTROS_2025,NO_VOTANTES_Oct2025,195621
OTROS_2025,OTROS_Oct2025,249856
OTROS_2025,FP_Oct2025,165171
UxP_2025,EN_BLANCO_Oct2025,33759
UxP_2025,LLA_Oct2025,261061
UxP_2025,NO_VOTANTES_Oct2025,103811
UxP_2025,OTROS_Oct2025,279460
UxP_2025,FP_Oct2025,2592113`;
  textarea.style.display = "block";
  textarea.style.boxSizing = "border-box";
  textarea.style.width = "calc(100% + 28px)";
  textarea.style.font = "var(--mono_fonts)";
  textarea.style.minHeight = "60px";
  textarea.style.border = "none";
  textarea.style.padding = "4px 10px";
  textarea.style.margin = "0 -14px";
  textarea.style.background = "rgb(247,247,249)";
  textarea.style.tabSize = 2;
  textarea.oninput = () => {
    textarea.style.height = "initial";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };
  yield textarea;
  textarea.oninput();
}


function _8(md){return(
md`Each line in the textarea above represents a link in the chart. The source and target of the link are determined by the two names. (The contents of the textarea are interpreted as [CSV](https://en.wikipedia.org/wiki/Comma-separated_values), so put quotes around names if you want them to contain commas.) The thickness of the link is determined by the following value. You can also specify a fill color after the number.`
)}

function _9(md){return(
md`---

## Appendix`
)}

function _unique_nodes(data){return(
data.nodes.map((d) => d.id || d.name).sort()
)}

function _color_config(){return(
new Map([
  // Reemplaza con los nombres reales de tus nodos y colores deseados
  // Usa unique_nodes para ver qué nodos tienes disponibles
  ["EN_BLANCO_Oct2025", "silver"],
  ["EN_BLANCO_2025", "silver"],
  ["FP_Oct2025", "#0096FF"],
  ["JxC_2023", "orange"],
  ["LLA_Oct2025", "purple"],
  ["LLA_JxC_2025", "purple"],
  ["NO_VOTANTES_2025", "Salmon"],
  ["NO_VOTANTES_Oct2025", "Salmon"],
  ["OTROS_Oct2025", "gray"],
  ["OTROS_2025", "gray"],
  ["UxP_2025", "#0096FF"],
  ["EN_BLANCO_2023", "silver"],
  ["EN_BLANCO_2025", "silver"],
  ["FP_2025", "#0096FF"],
  ["JxC_2023", "orange"],
  ["LLA_2023", "purple"],
  ["LLA_JxC_2025", "purple"],
  ["NO_VOTANTES_2023", "Salmon"],
  ["NO_VOTANTES_2025", "Salmon"],
  ["OTROS_2023", "gray"],
  ["OTROS_2025", "gray"],
  ["UxP_2023", "#0096FF"]

  // Agrega más según tus nodos...
])
)}

function _nodes_list(links,d3)
{
  const uniqueNodes = Array.from(
    new Set(links.flatMap((d) => [d.source, d.target]))
  ).sort();

  return uniqueNodes.map((node) => ({
    id: node,
    name: node,
    color: d3.schemeCategory10[uniqueNodes.indexOf(node) % 10] // colores por defecto
  }));
}


function _13(links){return(
links.length
)}

function _colorea(nodes_list){return(
(nodeId) => {
  const node = nodes_list.find((n) => n.id === nodeId);
  return node ? node.color : "#999";
}
)}

function _links(source,d3)
{
  const clean = source.trim();
  const delimiter = clean.includes("\t")
    ? "\t"
    : clean.includes(",")
    ? ","
    : " ";
  const parsed = d3.dsvFormat(delimiter).parseRows(clean, ([s, t, v]) => {
    if (!s || !t) return null;
    return { source: s.trim(), target: t.trim(), value: +v || 0 };
  });
  return parsed.filter((d) => d.source && d.target);
}


function _data(links)
{
  
  const nodeByName = new Map;
  for (const link of links) {
    if (!nodeByName.has(link.source)) nodeByName.set(link.source, {name: link.source});
    if (!nodeByName.has(link.target)) nodeByName.set(link.target, {name: link.target});
  }
  return {nodes: Array.from(nodeByName.values()), links};
}


function _sankey(d3,align,inputOrder,padding,width,height){return(
d3.sankey()
    .nodeId(d => d.name)
    .nodeAlign(d3[`sankey${align[0].toUpperCase()}${align.slice(1)}`])
    .nodeSort(inputOrder ? null : undefined)
    .nodeWidth(15)
    .nodePadding(padding)
    .extent([[0, 5], [width, height - 45]])
)}

function _width(){return(
900
)}

function _height(html)
{
  const form = html`<form class="observablehq--inspect">height = <input name=i type=number min=0 value=720 step=1  style="padding:2px;margin:-2px 0;width:120px;"></form>`;
  (form.oninput = () => form.value = (form.i.valueAsNumber))();
  return form;
}


function _padding(html)
{
  const form = html`<form class="observablehq--inspect">padding = <input name=i type=number min=0 value=10 step=1  style="padding:2px;margin:-2px 0;width:120px;"></form>`;
  (form.oninput = () => form.value = form.i.valueAsNumber)();
  return form;
}


function _color(html)
{
  const form = html`<form class="observablehq--inspect">color = <input name=i type=color value="#dddddd" style="padding:2px;margin:-2px 0;"></form>`;
  (form.oninput = () => form.value = form.i.value)();
  return form;
}


function _d3(require){return(
require("d3@5", "d3-sankey@0.12")
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("viewof inputOrder")).define("viewof inputOrder", ["html"], _inputOrder);
  main.variable(observer("inputOrder")).define("inputOrder", ["Generators", "viewof inputOrder"], (G, _) => G.input(_));
  main.variable(observer("viewof align")).define("viewof align", ["html","URLSearchParams"], _align);
  main.variable(observer("align")).define("align", ["Generators", "viewof align"], (G, _) => G.input(_));
  main.variable(observer("chart")).define("chart", ["d3","data","width","height","color_config","unique_nodes"], _chart);
  main.variable(observer()).define(["html","DOM","rasterize","chart","serialize"], _5);
  main.variable(observer("viewof dataType")).define("viewof dataType", ["html"], _dataType);
  main.variable(observer("dataType")).define("dataType", ["Generators", "viewof dataType"], (G, _) => G.input(_));
  main.variable(observer("viewof source")).define("viewof source", ["html"], _source);
  main.variable(observer("source")).define("source", ["Generators", "viewof source"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _8);
  main.variable(observer()).define(["md"], _9);
  main.variable(observer("unique_nodes")).define("unique_nodes", ["data"], _unique_nodes);
  main.variable(observer("color_config")).define("color_config", _color_config);
  main.variable(observer("nodes_list")).define("nodes_list", ["links","d3"], _nodes_list);
  main.variable(observer()).define(["links"], _13);
  main.variable(observer("colorea")).define("colorea", ["nodes_list"], _colorea);
  main.variable(observer("links")).define("links", ["source","d3"], _links);
  main.variable(observer("data")).define("data", ["links"], _data);
  main.variable(observer("sankey")).define("sankey", ["d3","align","inputOrder","padding","width","height"], _sankey);
  main.variable(observer("width")).define("width", _width);
  main.variable(observer("viewof height")).define("viewof height", ["html"], _height);
  main.variable(observer("height")).define("height", ["Generators", "viewof height"], (G, _) => G.input(_));
  main.variable(observer("viewof padding")).define("viewof padding", ["html"], _padding);
  main.variable(observer("padding")).define("padding", ["Generators", "viewof padding"], (G, _) => G.input(_));
  main.variable(observer("viewof color")).define("viewof color", ["html"], _color);
  main.variable(observer("color")).define("color", ["Generators", "viewof color"], (G, _) => G.input(_));
  const child1 = runtime.module(define1);
  main.import("rasterize", child1);
  main.import("serialize", child1);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  return main;
}
