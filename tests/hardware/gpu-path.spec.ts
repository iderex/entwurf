// Cases that cannot run without a display and a GPU, and that are worth nothing
// if they run without one. They belong here rather than in the unit suite for
// that reason and no other.
//
// What they are for today: the harness has to be shown reaching real hardware
// before anything measured on it means anything. The render engine is not built
// by this tree yet, so these hold the browser end of the path rather than the
// engine end.

import { expect, test } from "@playwright/test";

type GlFacts = { vendor: string; renderer: string; version: string } | null;

async function glFacts(page: import("@playwright/test").Page): Promise<GlFacts> {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (gl === null) return null;
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      vendor: String(gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR)),
      renderer: String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)),
      version: String(gl.getParameter(gl.VERSION)),
    };
  });
}

test("a WebGL2 context exists and is not a software rasteriser", async ({ page }) => {
  await page.goto("about:blank");
  const facts = await glFacts(page);
  expect(facts, "no WebGL2 context at all").not.toBeNull();
  const renderer = facts!.renderer.toLowerCase();
  for (const marker of ["swiftshader", "llvmpipe", "softpipe", "basic render driver"]) {
    expect(renderer, `the renderer is software: ${facts!.renderer}`).not.toContain(marker);
  }
});

test("the GPU draws, and the pixels come back", async ({ page }) => {
  await page.goto("about:blank");
  const pixel = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    const gl = canvas.getContext("webgl2");
    if (gl === null) return null;
    gl.clearColor(0.25, 0.5, 0.75, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const out = new Uint8Array(4);
    gl.readPixels(1, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
    return [...out];
  });
  // The clear colour, quantised to eight bits per channel, with the half on the
  // green channel rounded down by the hardware. A path that never reached the GPU
  // returns transparent black here.
  expect(pixel).toEqual([64, 127, 191, 255]);
});
