// Launches a browser with the GPU enabled and reads what it says about the
// machine. This is the impure half: everything it returns is decided elsewhere,
// in tools/src/hardware/machine.ts, which the suite can reach.
//
// The launch flags matter and are not decoration. A browser launched with
// Chromium's defaults under automation disables the GPU and falls back to
// SwiftShader, which reports itself as a graphics device and would let a run that
// measured software rasterisation pass as one that measured a GPU.

import { chromium } from "@playwright/test";
import { arch, platform, release } from "node:os";
import type { GpuDevice, Probe } from "./machine.ts";

export const gpuLaunchArgs = ["--use-angle=default", "--enable-gpu"];

function displayFacts(): Probe["display"] {
  if (platform() !== "linux") {
    return {
      checked: false,
      present: false,
      how: `on ${platform()} there is no environment variable that answers this, so this run makes no claim about a display`,
    };
  }
  const present = (process.env.DISPLAY ?? "") !== "" || (process.env.WAYLAND_DISPLAY ?? "") !== "";
  return { checked: true, present, how: "read from DISPLAY and WAYLAND_DISPLAY" };
}

export type ProbeFailure = { kind: "could-not-launch"; detail: string };

export async function probeMachine(): Promise<Probe | ProbeFailure> {
  let browser;
  try {
    browser = await chromium.launch({ args: gpuLaunchArgs });
  } catch (cause) {
    return { kind: "could-not-launch", detail: cause instanceof Error ? cause.message : String(cause) };
  }
  try {
    const session = await browser.newBrowserCDPSession();
    const info = (await session.send("SystemInfo.getInfo")) as {
      gpu?: { devices?: GpuDevice[]; featureStatus?: Record<string, string>; auxAttributes?: { glRenderer?: string } };
    };
    return {
      browserName: "chromium",
      browserVersion: browser.version(),
      platform: platform(),
      release: release(),
      arch: arch(),
      display: displayFacts(),
      devices: info.gpu?.devices ?? [],
      featureStatus: info.gpu?.featureStatus ?? {},
      glRenderer: info.gpu?.auxAttributes?.glRenderer ?? "not reported",
    };
  } finally {
    await browser.close();
  }
}
