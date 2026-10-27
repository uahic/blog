---
title: 'Unlock GPU<br>RTX 3090 Benchmark'
description: 'Benchmarking Zagitta/gpu-unlock on single and dual RTX 3090s'
pubDate: '2026-10-25'
heroImage: '../../assets/gpus/unlock_gpu.jpg'
tags: ['AI', 'Hardware']
---

Here's the short version, before the numbers start: a [previous post](/blog/unlock-gpu) found a free, software-only way to remove an artificial speed cap NVIDIA puts on gaming GPUs for exactly the kind of math AI workloads lean on. This post is the proof — real benchmarks showing how much faster things actually get, whether the results are still correct, and whether the card overheats doing it. Short answer to all three: yes, genuinely faster (not a rounding error); yes, output is still bit-identical; no, it doesn't throttle.

Quick recap: [Zagitta/gpu-unlock](https://github.com/Zagitta/gpu-unlock) patches the GSP firmware on consumer Ampere GPUs to double the FP16/BF16-into-FP32 FMA issue rate NVIDIA otherwise reserves for professional cards — with reported gains of 70-80% on dense matrix workloads, exactly what LLM prefill, diffusion and FlashAttention lean on.

The benchmark code is Claude Opus 5.5 vibe-coded (life is short).

# Benchmarks

Both runs below are on a single RTX 3090 (device index 1 on this box), one time with patch and the other without. 

<div class="gb">
<style>
.gb { margin-top: 1em; }
.gb-spec { display: flex; flex-wrap: wrap; gap: 0.6em 1.4em; margin: 1.4em 0; padding: 0.9em 1.1em; background: rgba(229,233,240,0.04); border: 1px solid rgba(229,233,240,0.1); border-radius: 10px; font-size: 0.85em; }
.gb-spec div { display: flex; flex-direction: column; gap: 0.15em; }
.gb-spec .k { color: rgb(96,115,159); font-size: 0.78em; text-transform: uppercase; letter-spacing: 0.04em; }
.gb-spec .v { color: rgb(229,233,240); font-weight: 600; font-variant-numeric: tabular-nums; }
.gb-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.8em; margin: 1.5em 0; }
.gb-tile { background: rgba(229,233,240,0.04); border: 1px solid rgba(229,233,240,0.1); border-radius: 10px; padding: 1em 1.1em; }
.gb-tile .label { font-size: 0.8em; color: rgb(96,115,159); margin-bottom: 0.4em; }
.gb-tile .value { font-size: 1.5em; font-weight: 700; color: rgb(229,233,240); font-variant-numeric: tabular-nums; }
.gb-tile .delta { font-size: 0.8em; color: rgb(96,115,159); margin-top: 0.4em; }
.gb-tile .delta b { color: #2e9415; font-weight: 700; }
.gb-tile .delta b.flat { color: rgb(96,115,159); }
.gb-legend { display: flex; gap: 1.2em; font-size: 0.8em; color: rgb(96,115,159); margin: 0.2em 0 1em; }
.gb-legend span { display: inline-flex; align-items: center; gap: 0.4em; }
.gb-legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.gb-legend i.locked { background: rgb(96,115,159); }
.gb-legend i.unlocked { background: #2e9415; }
.gb-chart { margin: 1.3em 0; }
.gb-cat { margin: 1em 0; }
.gb-cat-label { font-size: 0.82em; color: rgb(229,233,240); margin-bottom: 0.4em; font-weight: 600; }
.gb-cat-body { position: relative; }
.gb-row { display: flex; align-items: center; gap: 8px; margin: 3px 0; }
.gb-tag { width: 56px; flex: none; font-size: 0.7em; color: rgb(96,115,159); }
.gb-track { flex: 1; position: relative; height: 14px; background: rgba(229,233,240,0.07); border-radius: 4px; overflow: hidden; }
.gb-fill { position: absolute; inset: 0; border-radius: 4px; }
.gb-fill.locked { background: rgb(96,115,159); }
.gb-fill.unlocked { background: #2e9415; }
.gb-val { width: 60px; flex: none; font-size: 0.74em; color: rgb(229,233,240); font-variant-numeric: tabular-nums; }
.gb-refs { position: absolute; top: 0; bottom: 0; left: 64px; right: 68px; pointer-events: none; }
.gb-refs em { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px dashed rgba(229,233,240,0.3); font-style: normal; }
.gb-refs em span { position: absolute; bottom: -17px; left: 3px; font-size: 0.62em; color: rgba(229,233,240,0.45); white-space: nowrap; }
.gb-caption { font-size: 0.78em; color: rgb(96,115,159); margin-top: 1.4em; }
.gb-svg { width: 100%; height: auto; display: block; margin-top: 0.6em; }
.gb-axis { font-size: 10px; fill: rgb(96,115,159); }
</style>

<div class="gb-spec">
  <div><span class="k">GPU</span><span class="v">RTX 3090 &middot; 82 SMs &middot; 23.6 GB</span></div>
  <div><span class="k">Compute cap.</span><span class="v">8.6</span></div>
  <div><span class="k">Power limit</span><span class="v">350 W</span></div>
  <div><span class="k">Boost clock</span><span class="v">2130 MHz</span></div>
  <div><span class="k">Driver</span><span class="v">595.84</span></div>
  <div><span class="k">CUDA / torch</span><span class="v">13.0 / 2.11.0+cu130</span></div>
  <div><span class="k">Matmul size</span><span class="v">8192&sup3;, 5 samples</span></div>
  <div><span class="k">Sustain window</span><span class="v">15 min</span></div>
</div>

## Headline numbers

<div class="gb-tiles">
  <div class="gb-tile">
    <div class="label">BF16 GEMM throughput</div>
    <div class="value">115.65 TFLOPS</div>
    <div class="delta"><b>+58.8%</b> vs 72.85 locked</div>
  </div>
  <div class="gb-tile">
    <div class="label">GPT training</div>
    <div class="value">57,520 tok/s</div>
    <div class="delta"><b>+40.3%</b> vs 40,990 locked</div>
  </div>
  <div class="gb-tile">
    <div class="label">Peak temp, sustained</div>
    <div class="value">62 &deg;C</div>
    <div class="delta"><b class="flat">+2 &deg;C</b> vs 60 &deg;C locked</div>
  </div>
  <div class="gb-tile">
    <div class="label">Avg board power, sustained</div>
    <div class="value">349.3 W</div>
    <div class="delta"><b class="flat">+0.2 W</b> vs 349.1 W &mdash; same 350 W limit</div>
  </div>
</div>

## Why it works: the rate check

Raw TFLOPS is a function of both instruction-issue rate and clock speed, and the two runs don't land on exactly the same clock. So the number that actually isolates what the patch does is throughput divided by measured SM clock — TFLOPS per GHz. For FP16/BF16/TF32 feeding an FP32 accumulator, the silicon has exactly two fixed rates: half (the consumer default) or full (unlocked). Everything else — FP16 with FP16 accumulate, plain FP32 on CUDA cores, INT8 — is untouched by the patch and should sit flat across both runs. That's the control group.

<div class="gb-chart">
<div class="gb-legend"><span><i class="locked"></i>locked</span><span><i class="unlocked"></i>unlocked</span></div>

<div class="gb-cat">
<div class="gb-cat-label">FP16 &rarr; FP32 acc</div>
<div class="gb-cat-body">
<div class="gb-refs"><em style="left:46.7%"><span>&frac12; rate</span></em><em style="left:93.3%"><span>full rate</span></em></div>
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:46.4%"></span></span><span class="gb-val">41.76</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:89.7%"></span></span><span class="gb-val">80.72</span></div>
</div>
</div>

<div class="gb-cat">
<div class="gb-cat-label">BF16 &rarr; FP32 acc</div>
<div class="gb-cat-body">
<div class="gb-refs"><em style="left:46.7%"><span>&frac12; rate</span></em><em style="left:93.3%"><span>full rate</span></em></div>
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:46.5%"></span></span><span class="gb-val">41.88</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:89.7%"></span></span><span class="gb-val">80.73</span></div>
</div>
</div>

<div class="gb-cat">
<div class="gb-cat-label">TF32 &rarr; FP32 acc</div>
<div class="gb-cat-body">
<div class="gb-refs"><em style="left:23.3%"><span>&frac12; rate</span></em><em style="left:46.7%"><span>full rate</span></em></div>
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:23.0%"></span></span><span class="gb-val">20.72</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:45.4%"></span></span><span class="gb-val">40.88</span></div>
</div>
</div>

<div class="gb-cat">
<div class="gb-cat-label">FP16 &rarr; FP16 acc (control)</div>
<div class="gb-cat-body">
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:87.9%"></span></span><span class="gb-val">79.13</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:88.4%"></span></span><span class="gb-val">79.59</span></div>
</div>
</div>

<div class="gb-cat">
<div class="gb-cat-label">FP32, CUDA cores (control)</div>
<div class="gb-cat-body">
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:18.2%"></span></span><span class="gb-val">16.35</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:18.3%"></span></span><span class="gb-val">16.45</span></div>
</div>
</div>

<div class="gb-cat">
<div class="gb-cat-label">INT8 &rarr; INT32 acc (control)</div>
<div class="gb-cat-body">
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:42.6%"></span></span><span class="gb-val">38.33</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:42.4%"></span></span><span class="gb-val">38.14</span></div>
</div>
</div>

<p class="gb-caption">TFLOPS per GHz of measured SM clock, shared 0&ndash;90 scale across all six. Dashed ticks mark the theoretical half/full rate per clock for the three affected dtypes.</p>
</div>

Locked sits right on the half-rate line for all three affected dtypes (49&ndash;50% of the full-rate ceiling); unlocked clears 96&ndash;97% of the theoretical full rate. The three controls move by at most ~1% &mdash; benchmarking noise.

| dtype | locked (TFLOPS/GHz) | unlocked (TFLOPS/GHz) | ratio |
|---|---|---|---|
| FP16 &rarr; FP32 acc | 41.76 | 80.72 | 1.93&times; |
| BF16 &rarr; FP32 acc | 41.88 | 80.73 | 1.93&times; |
| TF32 &rarr; FP32 acc | 20.72 | 40.88 | 1.97&times; |
| FP16 &rarr; FP16 acc (control) | 79.13 | 79.59 | 1.01&times; |
| FP32, CUDA cores (control) | 16.35 | 16.45 | 1.01&times; |
| INT8 &rarr; INT32 acc (control) | 38.33 | 38.14 | 0.99&times; |

## Dense matmul throughput

Raw TFLOPS this time, median of 5 samples at 8192&sup3; (shared 0&ndash;130 scale so magnitudes stay comparable across dtypes):

<div class="gb-chart">
<div class="gb-legend"><span><i class="locked"></i>locked</span><span><i class="unlocked"></i>unlocked</span></div>

<div class="gb-cat">
<div class="gb-cat-label">FP16 &rarr; FP32 acc</div>
<div class="gb-cat-body">
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:55.2%"></span></span><span class="gb-val">71.70</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:86.6%"></span></span><span class="gb-val">112.63</span></div>
</div>
</div>

<div class="gb-cat">
<div class="gb-cat-label">BF16 &rarr; FP32 acc</div>
<div class="gb-cat-body">
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:56.0%"></span></span><span class="gb-val">72.85</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:89.0%"></span></span><span class="gb-val">115.65</span></div>
</div>
</div>

<div class="gb-cat">
<div class="gb-cat-label">TF32 &rarr; FP32 acc</div>
<div class="gb-cat-body">
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:29.9%"></span></span><span class="gb-val">38.89</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:48.6%"></span></span><span class="gb-val">63.17</span></div>
</div>
</div>

<div class="gb-cat">
<div class="gb-cat-label">FP16 &rarr; FP16 acc (control)</div>
<div class="gb-cat-body">
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:92.6%"></span></span><span class="gb-val">120.42</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:91.8%"></span></span><span class="gb-val">119.38</span></div>
</div>
</div>

<div class="gb-cat">
<div class="gb-cat-label">FP32, CUDA cores (control)</div>
<div class="gb-cat-body">
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:19.4%"></span></span><span class="gb-val">25.23</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:19.2%"></span></span><span class="gb-val">24.93</span></div>
</div>
</div>

<div class="gb-cat">
<div class="gb-cat-label">INT8 &rarr; INT32 acc (control)</div>
<div class="gb-cat-body">
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:46.2%"></span></span><span class="gb-val">60.08</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:45.5%"></span></span><span class="gb-val">59.19</span></div>
</div>
</div>

<p class="gb-caption">TFLOPS, shared 0&ndash;130 scale.</p>
</div>

| dtype | locked (TFLOPS) | unlocked (TFLOPS) | &Delta; |
|---|---|---|---|
| FP16 &rarr; FP32 acc | 71.70 | 112.63 | +57.1% |
| BF16 &rarr; FP32 acc | 72.85 | 115.65 | +58.8% |
| TF32 &rarr; FP32 acc | 38.89 | 63.17 | +62.4% |
| FP16 &rarr; FP16 acc (control) | 120.42 | 119.38 | &minus;0.9% |
| FP32, CUDA cores (control) | 25.23 | 24.93 | &minus;1.2% |
| INT8 &rarr; INT32 acc (control) | 60.08 | 59.19 | &minus;1.5% |

## Attention

A FlashAttention-style kernel, BF16, causal, batch 8 &times; 16 heads &times; 4096 seq &times; 64 dim &mdash; the actual shape an LLM forward/backward pass pushes through, as opposed to a plain dense matmul:

<div class="gb-chart">
<div class="gb-legend"><span><i class="locked"></i>locked</span><span><i class="unlocked"></i>unlocked</span></div>

<div class="gb-cat">
<div class="gb-cat-label">Forward</div>
<div class="gb-cat-body">
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:66.3%"></span></span><span class="gb-val">66.28</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:97.5%"></span></span><span class="gb-val">97.46</span></div>
</div>
</div>

<div class="gb-cat">
<div class="gb-cat-label">Forward + backward</div>
<div class="gb-cat-body">
<div class="gb-row"><span class="gb-tag">locked</span><span class="gb-track"><span class="gb-fill locked" style="width:60.2%"></span></span><span class="gb-val">60.17</span></div>
<div class="gb-row"><span class="gb-tag">unlocked</span><span class="gb-track"><span class="gb-fill unlocked" style="width:84.7%"></span></span><span class="gb-val">84.69</span></div>
</div>
</div>

<p class="gb-caption">TFLOPS, shared 0&ndash;100 scale.</p>
</div>

Smaller gain than the raw GEMM numbers above (+47.0% / +40.8% vs +57&ndash;62%), which tracks: attention spends part of its time in softmax, masking and memory movement that the unlock doesn't touch, so only the FMA-bound share of the kernel speeds up.

## End-to-end training

A toy GPT &mdash; 220M params, vocab 32768, 12 layers &times; 16 heads, d_model 1024, seq 2048, batch 8:

| | locked | unlocked | &Delta; |
|---|---|---|---|
| Step time | 399.7 ms | 284.8 ms | &minus;28.7% (1.40&times; faster) |
| Throughput | 40,990 tok/s | 57,520 tok/s | +40.3% |
| Model FLOPs utilization | 51.59 TFLOPS | 72.39 TFLOPS | +40.3% |

A real training step doesn't spend all of its time in the matmuls the unlock accelerates &mdash; there's also the backward graph outside those matmuls, the optimizer step, data loading. +40% end-to-end is consistent with "most, but not all, of the step is FMA-bound," landing between the attention numbers and the raw GEMM numbers above.

## Sustained load: no throttling

Each run held BF16 GEMM at 8192&sup3; continuously for 15 minutes, sampled every ~5s, to check whether the extra heat from the higher issue rate causes the card to throttle over time.

<svg class="gb-svg" viewBox="0 0 600 150" role="img" aria-label="Sustained BF16 throughput over 15 minutes, normalized to each run's first sample">
  <line x1="34" x2="590" y1="69.0" y2="69.0" stroke-dasharray="4 3" stroke="rgba(229,233,240,.25)" />
  <text x="30" y="72" text-anchor="end" class="gb-axis">100%</text>
  <text x="30" y="108.7" text-anchor="end" class="gb-axis">99%</text>
  <text x="30" y="36.3" text-anchor="end" class="gb-axis">101%</text>
  <path d="M37.2,69.0 L55.9,71.5 L74.6,73.6 L93.2,44.2 L112.0,49.3 L130.7,53.3 L149.4,56.9 L168.1,59.4 L186.8,60.4 L205.5,64.4 L224.3,65.5 L243.0,70.5 L261.7,74.1 L280.5,76.1 L299.3,83.2 L318.1,81.6 L336.8,82.7 L355.6,87.2 L374.3,89.7 L393.0,93.3 L411.6,88.7 L430.4,88.7 L449.1,92.8 L467.8,95.8 L486.5,96.3 L505.2,93.3 L523.9,94.3 L542.6,96.8 L561.3,92.3 L580.0,92.3" fill="none" stroke="rgb(96,115,159)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M37.5,69.0 L56.1,68.4 L74.6,67.7 L93.3,71.5 L112.0,70.0 L130.5,69.3 L149.1,71.2 L167.6,71.9 L186.2,70.9 L204.9,71.2 L223.5,72.8 L242.1,71.9 L260.7,70.3 L279.3,71.9 L297.9,71.2 L316.5,68.7 L335.1,72.8 L353.7,70.6 L372.4,70.6 L391.0,69.6 L409.5,71.2 L428.1,68.7 L446.7,70.3 L465.3,69.3 L483.9,74.1 L502.6,70.0 L521.1,68.0 L539.7,70.0 L558.2,71.2 L576.8,70.3" fill="none" stroke="#2e9415" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  <text x="34" y="144" class="gb-axis">0</text>
  <text x="312" y="144" text-anchor="middle" class="gb-axis">7.5 min</text>
  <text x="590" y="144" text-anchor="end" class="gb-axis">15 min</text>
</svg>
<div class="gb-legend"><span><i class="locked"></i>locked</span><span><i class="unlocked"></i>unlocked</span></div>

| | locked | unlocked |
|---|---|---|
| First &rarr; last (15 min) | 72.51 &rarr; 71.96 TFLOPS (&minus;0.8%) | 115.48 &rarr; 115.40 TFLOPS (&minus;0.1%) |
| Avg board power | 349.1 W | 349.3 W |
| Avg SM clock | 1732 MHz | 1431 MHz |
| Peak temp | 60 &deg;C | 62 &deg;C |
| Power-capped / thermal-throttled | 100% / 0% | 100% / 0% |

Both runs sit at the 350 W power limit for essentially the entire 15 minutes (power-capped 100%, thermal-throttled 0% &mdash; the fans never even had to ramp, `fan_pct_max` reads 0 in both logs). The interesting line is the clock: unlocked averages 300 MHz *lower* than locked, under the same power budget. That's the actual trade the patch makes &mdash; doing twice the FMA work per clock hits the power ceiling sooner, so the card settles at a lower clock to stay inside it. The net is still a large win (the lower clock costs far less than the doubled issue rate gives back), but it isn't free overclocking &mdash; it's spending the same power budget on more work per cycle instead of more cycles.

## Takeaway

On the operation it actually targets &mdash; FP16/BF16/TF32 feeding an FP32 accumulator &mdash; `gpu-unlock` gets this RTX 3090 from ~50% to ~97% of its theoretical per-clock rate, a ~1.6&ndash;1.9&times; real throughput gain that shows up all the way through a toy GPT training step (+40% tokens/s). Everything unaffected by the patch (FP16-with-FP16-accumulate, FP32, INT8) stays flat within noise, output hashes are bit-identical, and under 15 minutes of sustained load neither run throttles &mdash; the card just runs its clock about 300 MHz lower when there's more work to do per cycle at the same 350 W. For a single card that didn't cost anything beyond building a kernel module, that's a good trade.
