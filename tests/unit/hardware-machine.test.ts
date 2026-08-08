// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test } from "vitest";
import { assess, describeMachine, hardwareDevice, isSoftware, machineFrom, type Probe } from "../../tools/src/hardware/machine.ts";

const nvidia = {
  deviceString: "NVIDIA GeForce RTX 3080",
  driverVendor: "NVIDIA",
  driverVersion: "32.0.15.6094",
  vendorId: 4318,
  deviceId: 8726,
};

const basicRender = {
  deviceString: "Microsoft Basic Render Driver",
  driverVendor: "",
  driverVersion: "10.0.26100.8875",
  vendorId: 5140,
  deviceId: 140,
};

const swiftshader = {
  deviceString: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver-5.0.0)",
  driverVendor: "SwANGLE",
  driverVersion: "5.0.0",
  vendorId: 65535,
  deviceId: 65535,
};

function probeWith(overrides: Partial<Probe> = {}): Probe {
  return {
    browserName: "chromium",
    browserVersion: "151.0.7922.34",
    platform: "linux",
    release: "6.8.0",
    arch: "x64",
    display: { checked: true, present: true, how: "read from DISPLAY and WAYLAND_DISPLAY" },
    devices: [nvidia],
    featureStatus: { webgl: "enabled", gpu_compositing: "enabled", rasterization: "enabled" },
    glRenderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080, D3D11)",
    ...overrides,
  };
}

describe("isSoftware", () => {
  test("names the software rasterisers a GPU claim has to survive", () => {
    for (const text of ["SwiftShader driver-5.0.0", "llvmpipe (LLVM 15)", "Microsoft Basic Render Driver", "SwANGLE"]) {
      expect(isSoftware(text), text).toBe(true);
    }
  });

  test("does not read real hardware as software", () => {
    expect(isSoftware("NVIDIA GeForce RTX 3080")).toBe(false);
    expect(isSoftware("AMD Radeon RX 7900 XTX")).toBe(false);
  });
});

// Chromium reports the software fallback alongside the real card on this
// machine, so taking device zero would sometimes name the wrong one.
describe("hardwareDevice", () => {
  test("skips a software device to find the real one, whichever order they come in", () => {
    expect(hardwareDevice([nvidia, basicRender])?.deviceString).toBe(nvidia.deviceString);
    expect(hardwareDevice([basicRender, nvidia])?.deviceString).toBe(nvidia.deviceString);
  });

  test("finds nothing where every device is software", () => {
    expect(hardwareDevice([swiftshader, basicRender])).toBeUndefined();
    expect(hardwareDevice([])).toBeUndefined();
  });
});

describe("machineFrom", () => {
  test("carries the four fields a published number has to travel with", () => {
    const machine = machineFrom(probeWith());
    expect(machine.gpu).toBe("NVIDIA GeForce RTX 3080");
    expect(machine.driverVersion).toBe("32.0.15.6094");
    expect(machine.browser).toBe("chromium 151.0.7922.34");
    expect(machine.operatingSystem).toBe("linux 6.8.0 x64");
  });

  // The record says "none" rather than falling back to the software device,
  // because a record naming SwiftShader as the GPU is the claim this refuses.
  test("says none rather than naming a software device as the GPU", () => {
    const machine = machineFrom(probeWith({ devices: [swiftshader] }));
    expect(machine.gpu).toBe("none");
    expect(machine.driverVersion).toBe("none");
  });

  test("describes every field it carries", () => {
    expect(describeMachine(machineFrom(probeWith()))).toHaveLength(5);
  });
});

describe("assess", () => {
  test("qualifies a machine with a real GPU and every feature enabled", () => {
    const verdict = assess(probeWith());
    expect(verdict.qualifies).toBe(true);
    expect(verdict.missing).toEqual([]);
  });

  test("refuses a machine that reported no graphics device at all", () => {
    const verdict = assess(probeWith({ devices: [] }));
    expect(verdict.qualifies).toBe(false);
    expect(verdict.missing[0]).toBe("a GPU: the browser reported no graphics device at all");
  });

  test("refuses a machine whose every device is a software rasteriser, and names them", () => {
    const verdict = assess(probeWith({ devices: [swiftshader] }));
    expect(verdict.missing[0]).toContain("every device the browser reported is a software rasteriser");
    expect(verdict.missing[0]).toContain("SwiftShader");
  });

  // The device list and the renderer can disagree: a real card present in the
  // list says nothing about what the browser actually drew through.
  test("refuses a software renderer even where the device list names real hardware", () => {
    const verdict = assess(probeWith({ glRenderer: "ANGLE (Google, SwiftShader driver-5.0.0)" }));
    expect(verdict.qualifies).toBe(false);
    expect(verdict.missing.some((one) => one.includes("rendering through"))).toBe(true);
  });

  test("refuses a feature the browser reports as anything but enabled", () => {
    const verdict = assess(probeWith({ featureStatus: { webgl: "unavailable_software", gpu_compositing: "enabled", rasterization: "enabled" } }));
    expect(verdict.missing).toContain("webgl on the GPU: the browser reports it as unavailable_software");
  });

  // A feature the browser did not report is not a feature that is fine. Reading
  // an absent status as a pass is the fail-open this suite exists against.
  test("refuses a feature the browser did not report at all", () => {
    const verdict = assess(probeWith({ featureStatus: { gpu_compositing: "enabled", rasterization: "enabled" } }));
    expect(verdict.missing).toContain("a verdict on webgl: the browser did not report it");
  });

  test("refuses a machine with no display where the display can be read", () => {
    const display = { checked: true, present: false, how: "read from DISPLAY and WAYLAND_DISPLAY" };
    const verdict = assess(probeWith({ display }));
    expect(verdict.missing).toContain("a display: read from DISPLAY and WAYLAND_DISPLAY");
  });

  // Where the display cannot be established, the run says it made no claim
  // rather than counting it as present. That is the negative disclosure this
  // whole suite is built around, and it stays negative.
  test("records an unchecked display as unchecked rather than as present", () => {
    const display = { checked: false, present: false, how: "on win32 there is no environment variable that answers this" };
    const verdict = assess(probeWith({ display }));
    expect(verdict.qualifies).toBe(true);
    expect(verdict.observed.some((one) => one.startsWith("display NOT checked"))).toBe(true);
  });
});
