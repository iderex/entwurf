// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// What a hardware-bound run has to say about the machine it ran on, and the
// decision about whether that machine qualifies at all.
//
// Both are pure. The probe that launches a browser and reads these fields out of
// it is a separate file, so a machine with no GPU can be put in front of this
// decision on a machine that has one.

export type GpuDevice = {
  deviceString: string;
  driverVendor: string;
  driverVersion: string;
  vendorId: number;
  deviceId: number;
};

// What the probe read out of the browser, before anything has been decided
// about it.
export type Probe = {
  browserName: string;
  browserVersion: string;
  platform: string;
  release: string;
  arch: string;
  // Absent where the display cannot be established on this platform, which is
  // not the same as absent because there is no display.
  display: { checked: boolean; present: boolean; how: string };
  devices: GpuDevice[];
  featureStatus: Record<string, string>;
  glRenderer: string;
};

export type Machine = {
  gpu: string;
  driverVersion: string;
  browser: string;
  operatingSystem: string;
  glRenderer: string;
};

// A renderer string carrying one of these is a software rasteriser wearing the
// GPU interface. A number produced against one is a number about a CPU.
const softwareRenderers = ["swiftshader", "llvmpipe", "softpipe", "microsoft basic render driver", "swangle"];

export function isSoftware(text: string): boolean {
  const lowered = text.toLowerCase();
  return softwareRenderers.some((marker) => lowered.includes(marker));
}

// The first device that is not a software rasteriser. Chromium reports the
// software fallback alongside the real card on some machines, so taking device
// zero would sometimes name the wrong one.
export function hardwareDevice(devices: readonly GpuDevice[]): GpuDevice | undefined {
  return devices.find((device) => !isSoftware(device.deviceString) && !isSoftware(device.driverVendor));
}

export function machineFrom(probe: Probe): Machine {
  const device = hardwareDevice(probe.devices);
  return {
    gpu: device?.deviceString ?? "none",
    driverVersion: device?.driverVersion ?? "none",
    browser: `${probe.browserName} ${probe.browserVersion}`,
    operatingSystem: `${probe.platform} ${probe.release} ${probe.arch}`,
    glRenderer: probe.glRenderer,
  };
}

export type Verdict = { qualifies: boolean; missing: string[]; observed: string[] };

// The whole point of the separate suite. A machine that cannot do the work is
// refused by name rather than skipped, because a green run that measured nothing
// is worse than a red one.
export function assess(probe: Probe): Verdict {
  const missing: string[] = [];
  const observed: string[] = [];

  const device = hardwareDevice(probe.devices);
  if (device === undefined) {
    missing.push(
      probe.devices.length === 0
        ? "a GPU: the browser reported no graphics device at all"
        : `a GPU: every device the browser reported is a software rasteriser (${probe.devices.map((d) => d.deviceString).join("; ")})`,
    );
  } else {
    observed.push(`GPU ${device.deviceString}, driver ${device.driverVersion}`);
  }

  if (isSoftware(probe.glRenderer)) {
    missing.push(`a GPU: the browser is rendering through ${probe.glRenderer}`);
  } else {
    observed.push(`renderer ${probe.glRenderer}`);
  }

  for (const feature of ["webgl", "gpu_compositing", "rasterization"]) {
    const status = probe.featureStatus[feature];
    if (status === undefined) {
      missing.push(`a verdict on ${feature}: the browser did not report it`);
    } else if (!status.startsWith("enabled")) {
      missing.push(`${feature} on the GPU: the browser reports it as ${status}`);
    } else {
      observed.push(`${feature} ${status}`);
    }
  }

  if (!probe.display.checked) {
    observed.push(`display NOT checked: ${probe.display.how}`);
  } else if (!probe.display.present) {
    missing.push(`a display: ${probe.display.how}`);
  } else {
    observed.push(`display present: ${probe.display.how}`);
  }

  return { qualifies: missing.length === 0, missing, observed };
}

export function describeMachine(machine: Machine): string[] {
  return [
    `machine GPU: ${machine.gpu}`,
    `machine GPU driver: ${machine.driverVersion}`,
    `machine browser: ${machine.browser}`,
    `machine operating system: ${machine.operatingSystem}`,
    `machine renderer: ${machine.glRenderer}`,
  ];
}
