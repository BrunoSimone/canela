import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLdScript } from "./json-ld";

describe("JSON-LD content boundary", () => {
  it("keeps CMS content inside the JSON script while preserving its text", () => {
    const data = { name: '</script><script>alert("x")</script>', description: '<img src=x onerror=alert(1)> & < 2' };
    const html = renderToStaticMarkup(<JsonLdScript data={data} />);
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).not.toContain("<img");
    const json = html.slice(html.indexOf(">") + 1, html.lastIndexOf("</script>"));
    expect(JSON.parse(json)).toEqual(data);
  });
});
