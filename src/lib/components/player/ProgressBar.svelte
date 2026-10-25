<script lang="ts">
  import { duration, position } from "$lib/stores/player";
  import { seekBy, seekTo } from "$lib/player/controller";

  let isScrubbing = $state(false);

  const fillRatio = $derived(
    $duration > 0 ? Math.min(Math.max($position / $duration, 0), 1) : 0,
  );

  function pointerToSeconds(event: PointerEvent): number {
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0 || $duration <= 0) return 0;

    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    return ratio * $duration;
  }

  function handlePointerDown(event: PointerEvent): void {
    if ($duration <= 0) return;

    isScrubbing = true;
    const bar = event.currentTarget as HTMLElement;
    bar.setPointerCapture(event.pointerId);
    seekTo(pointerToSeconds(event));
  }

  function handlePointerMove(event: PointerEvent): void {
    if (isScrubbing) seekTo(pointerToSeconds(event));
  }

  function handlePointerUp(event: PointerEvent): void {
    isScrubbing = false;
    const bar = event.currentTarget as HTMLElement;
    if (bar.hasPointerCapture(event.pointerId)) bar.releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const seek = (delta: number) => {
      event.preventDefault();
      event.stopPropagation();
      seekBy(delta);
    };

    if ($duration <= 0) return;

    switch (event.key) {
      case "ArrowRight":
        seek(5);
        break;
      case "ArrowLeft":
        seek(-5);
        break;
      case "PageUp":
        seek(30);
        break;
      case "PageDown":
        seek(-30);
        break;
      case "Home":
        event.preventDefault();
        event.stopPropagation();
        seekTo(0);
        break;
      case "End":
        event.preventDefault();
        event.stopPropagation();
        seekTo($duration);
        break;
    }
  }
</script>

<div
  class="bar"
  class:scrubbing={isScrubbing}
  role="slider"
  aria-label="Position de lecture"
  aria-valuemin="0"
  aria-valuemax={Math.round($duration)}
  aria-valuenow={Math.round($position)}
  aria-valuetext={`${Math.round($position)} secondes sur ${Math.round($duration)} secondes`}
  aria-disabled={$duration <= 0}
  tabindex={$duration > 0 ? 0 : -1}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerUp}
  onkeydown={handleKeyDown}
>
  <div class="fill" style:width="{fillRatio * 100}%"></div>
  <div class="knob" style:left="{fillRatio * 100}%"></div>
</div>

<style>
  .bar {
    position: relative;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--color-surface-hover);
    cursor: pointer;
    touch-action: none;
    transition: height 0.15s ease;
  }

  .bar[aria-disabled="true"] {
    cursor: default;
  }

  .bar:hover,
  .bar.scrubbing {
    height: 8px;
  }

  .fill {
    height: 100%;
    border-radius: inherit;
    background: var(--gradient-accent);
    pointer-events: none;
  }

  .knob {
    position: absolute;
    top: 50%;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgb(0 0 0 / 40%);
    transform: translate(-50%, -50%) scale(0);
    transition: transform 0.15s ease;
    pointer-events: none;
  }

  .bar:hover .knob,
  .bar.scrubbing .knob,
  .bar:focus-visible .knob {
    transform: translate(-50%, -50%) scale(1);
  }
</style>
