---
title: 'Unlock GPU<br>on NixOS'
description: 'Installing Zagitta/gpu-unlock on NixOS'
pubDate: '2026-10-25'
heroImage: '../../assets/gpus/unlock_gpu_nix.jpg'
tags: ['AI', 'Hardware']
---

# Why unlock a gaming GPU's math units

My [dual RTX 3090 setup](/blog/local-ai-dual-rtx3090) solved the VRAM problem via NVLink, pooling both cards into 48GB. It didn't touch compute throughput, though. 

NVIDIA ships the same Ampere silicon (GA102/103/104/106) in both consumer and professional cards, but the consumer driver artificially halves the instruction-issue rate for FP16/BF16-into-FP32 fused multiply-add — exactly the operation that dominates LLM prefill, diffusion models and FlashAttention. [Zagitta/gpu-unlock](https://github.com/Zagitta/gpu-unlock) is an open-source Linux kernel module that patches the GPU's firmware before the NVIDIA driver loads it, removing that artificial limit. Reported gains on dense matrix workloads are in the 70-80% range, at zero hardware cost, opt-in via a kernel command-line flag, with outputs verified bit-identical to the unpatched card in testing. The only runtime cost is about a second added to suspend/resume.

This post documents getting it built and running on NixOS, manually first and then as a permanent part of my system config. The actual benchmark numbers — single RTX 3090 and dual — are in a [separate post](/blog/gpu-unlock-benchmark).

# Building it on NixOS (with flakes)

gpu-unlock ships a Makefile that assumes a traditional FHS distro: `make install` probes for Arch, Debian or Fedora and refuses to run anywhere else ("Unsupported distribution: nixos"), and its `install-*` targets write straight into `/usr` and `/etc` — both of which NixOS treats as immutable/declarative and simply ignores. None of that matters for the actual build targets though; those are normal Make rules and can be driven by hand.

## 1. Building the firmware

```sh
git clone https://github.com/Zagitta/gpu-unlock
cd gpu-unlock
nix-shell -p gnumake python3 zstd --run 'make inputs && make firmware'
```

`nix-shell -p gnumake python3 zstd` spins up a throwaway shell with exactly the three tools the Makefile needs — GNU Make, Python, and the `zstd` CLI — without installing anything into the system profile or modifying the NixOS config.

- `make inputs` downloads the two NVIDIA files the patches are built against (~340MB combined) into `~/.cache/gpu-unlock/inputs` and checks them against SHA-256 hashes pinned in the Makefile. The pinning matters: the patch offsets are only valid for those exact driver/firmware blobs, so a silent version mismatch would produce a module that builds fine and then does nothing — or worse.
- `make firmware` applies the binary patches and writes five resulting firmware files to `~/.cache/gpu-unlock/assets`. These patched firmware images are what the kernel module loads in place of NVIDIA's stock ones.
- The README asks for Python 3.14; nixpkgs' current stable `python3` works fine anyway, because the scripts only use Python to shell out to the system `zstd` binary for the `.zst`-compressed firmware images, not for anything version-specific.
- `make test` (optional) runs the patch logic against simulated hardware definitions — a sanity check that touches neither real hardware nor the running kernel.

## 2. Building the kernel module

On a normal distro, `/lib/modules/$(uname -r)/build` is a symlink to matching kernel headers, which out-of-tree module Makefiles consume via `KDIR`. NixOS has no such path — everything lives in per-derivation store paths — so I have to fetch the headers (the `.dev` output) of the exact kernel package my running NixOS generation was built with, not just whatever `linuxPackages` currently resolves to in nixpkgs.

```sh
KDEV=$(nix build --no-link --print-out-paths /etc/nixos#nixosConfigurations.$(hostname).config.boot.kernelPackages.kernel.dev)
nix develop /etc/nixos#nixosConfigurations.$(hostname).config.boot.kernelPackages.kernel \
  -c make -C kernel/gpu_unlock KDIR=$KDEV/lib/modules/$(uname -r)/build
```

This assumes `/etc/nixos` is itself a flake and exposes a `nixosConfigurations` output named after the machine's hostname — the standard layout for a flake-based config, which is what lets `$(hostname)` resolve correctly without hardcoding a machine name.

- The first line walks into the evaluated NixOS module system — the same `config` referenced inside any NixOS module — down to `boot.kernelPackages.kernel.dev`, i.e. the headers/build-infrastructure output for the kernel this system actually boots (the NixOS equivalent of `linux-headers`/`kernel-devel`). `nix build --no-link --print-out-paths` builds (or pulls from the binary cache) that output and prints its `/nix/store` path instead of creating a `./result` symlink, so it can be captured straight into `$KDEV`.
- The second line uses `nix develop` on `boot.kernelPackages.kernel` itself (not `.dev`) to drop into the exact build environment that kernel was compiled in — same compiler, same build inputs. That matters because a compiler mismatch between the running kernel and an out-of-tree module is a common cause of modules that build but fail to load. Inside that environment it runs `make -C kernel/gpu_unlock`, pointing `KDIR` at the headers path resolved in the first line — the standard variable out-of-tree kernel module Makefiles expect.

The result is `kernel/gpu_unlock/gpu_unlock.ko` — a loadable kernel module I can load by hand with `insmod`.

# Making it permanent

Loading the module by hand doesn't survive a reboot, let alone a kernel update — it has to be rebuilt against whatever headers match the new kernel every time. So I turned the two steps above into a proper NixOS module instead, part of `nixos-rebuild` from now on. The relevant part of my config:

```
nixos-config/
├── flake.nix          # inputs (now incl. gpu-unlock) + nixosConfigurations.nixos
├── flake.lock
├── configuration.nix  # imports every file below
└── modules/
    ├── nvidia.nix
    ├── boot.nix
    ├── gpu-unlock.nix  # new
    └── ...
```

First, gpu-unlock becomes a flake input. It isn't a flake itself, so `flake = false` just makes Nix fetch the repo as a plain source tree:

```nix
gpu-unlock = {
  url = "github:Zagitta/gpu-unlock";
  flake = false;
};
```

Then two derivations in a new `modules/gpu-unlock.nix` (with `kernel = config.boot.kernelPackages.kernel;` and `nvVersion = "610.43.03";` defined once at the top, and `inputs.gpu-unlock` referring to the flake input above). The firmware one needs network access — `make inputs` downloads ~340MB from NVIDIA — which a normal sandboxed Nix build refuses outright. The fix is a *fixed-output derivation*: Nix allows network access whenever the output is going to be verified by a pinned hash anyway, sandbox or not.

```nix
gpu-unlock-firmware = pkgs.stdenv.mkDerivation {
  pname = "gpu-unlock-firmware";
  version = nvVersion;
  src = inputs.gpu-unlock;

  nativeBuildInputs = [pkgs.gnumake pkgs.python3 pkgs.zstd pkgs.cacert];

  outputHashMode = "recursive";
  outputHashAlgo = "sha256";
  outputHash = "sha256-hCRL7bghgOzvASR0aejR7+1kQ8jHBrKmCvNkKtk+ym0=";

  SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";

  buildPhase = ''
    export HOME=$TMPDIR
    make inputs
    make firmware
  '';

  installPhase = ''
    install -Dm444 -t $out/lib/firmware/gpu-unlock/${nvVersion} \
      "$HOME"/.cache/gpu-unlock/assets/booter_load_ga102.bin \
      "$HOME"/.cache/gpu-unlock/assets/gsp_ga10x.bin \
      "$HOME"/.cache/gpu-unlock/assets/gsp_boot_ga102.bin \
      "$HOME"/.cache/gpu-unlock/assets/gsp_boot_desc_ga102.bin \
      "$HOME"/.cache/gpu-unlock/assets/v67-ga102-${nvVersion}.bin
  '';
};
```

I didn't need to know the real output hash upfront: with `outputHash = lib.fakeHash;` the first build attempt fails on purpose and Nix prints the actual hash in the error, which gets pasted back in. Without `SSL_CERT_FILE` pointing at `pkgs.cacert`, the download fails too — the sandboxed build has no `/etc/ssl` of its own, so there's nothing for Python's HTTPS requests to verify NVIDIA's certificate against.

The kernel module derivation replaces the manual `nix develop` step from earlier with `kernel.moduleBuildDependencies`, nixpkgs' own attribute for "whatever toolchain this specific kernel was built with" — exactly what's needed to avoid the compiler-mismatch module-load failures that come from building against the wrong gcc:

```nix
gpu-unlock-module = pkgs.stdenv.mkDerivation {
  pname = "gpu_unlock";
  version = "1.0.0";
  src = inputs.gpu-unlock;

  nativeBuildInputs = kernel.moduleBuildDependencies;

  buildPhase = ''
    make -C kernel/gpu_unlock KDIR=${kernel.dev}/lib/modules/${kernel.modDirVersion}/build
  '';

  installPhase = ''
    install -Dm444 kernel/gpu_unlock/gpu_unlock.ko \
      $out/lib/modules/${kernel.modDirVersion}/extra/gpu_unlock.ko
  '';
};
```

And wiring both into the actual boot configuration:

```nix
hardware.firmware = [gpu-unlock-firmware];
boot.extraModulePackages = [gpu-unlock-module];
boot.kernelModules = ["gpu_unlock"];
boot.initrd.kernelModules = ["gpu_unlock"];
boot.kernelParams = ["gpu_unlock.targets=all"];
```

`gpu_unlock` has to load and do its work before the NVIDIA driver binds to the cards. On Arch/Fedora/Debian, the project's own packaging hooks it into mkinitcpio/dracut/initramfs-tools to guarantee that ordering; NixOS has no equivalent hook point, so `boot.initrd.kernelModules` is the closest thing — it gets the module into the initramfs, loaded as early as the kernel allows. `gpu_unlock.targets=all` is the required kernel command-line opt-in; without it, the module loads but does nothing (and `all` can be swapped for a comma-separated list of PCI addresses from `lspci -d 10de: -D`, handy for an A/B test between the two 3090s).

One thing worth double-checking before trusting any of this: the firmware patches are generated from NVIDIA driver release 610.43.03, while my actually-installed driver resolves to 580.119.02 — nixpkgs doesn't even offer 610.43.03 as an option. Turns out it doesn't matter. gpu-unlock patches the GSP firmware blob the GPU's own onboard processor runs, not the host driver, and that blob is identical across driver releases — the project is explicitly built so it "does not require manual patching each time nvidia releases a new driver version." 610.43.03 is just wherever they happened to pull a reference copy of it from.

`sudo nixos-rebuild switch --flake .#nixos`, reboot, and:

```
$ dmesg | grep -i gpu_unlock
```

Both RTX 3090s report as unlocked. Numbers are in the [benchmark post](/blog/gpu-unlock-benchmark).