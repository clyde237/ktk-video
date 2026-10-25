<script lang="ts">
  import { duration, position } from "$lib/stores/player";
  import { seekBy, seekTo } from "$lib/player/controller";
  import { formatDuration } from "$lib/utils/formatters";

  let isScrubbing = $state(false);
  let showRemaining = $state(false);
  let hoverTime = $state<number | null>(null);
  let hoverPercent = $state<number>(0);

  const fillRatio = $derived(
    $duration > 0 ? Math.min(Math.max($position / $duration, 0), 1) : 0,
  );

  const displayDuration = $derived(
    showRemaining && $duration > 0
      ? `-${formatDuration(Math.max(0, $duration - $position))}`
      : formatDuration($duration)
  );

  function pointerToSeconds(event: PointerEvent, bar: HTMLElement): number {
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
    const targetSeconds = pointerToSeconds(event, bar);
    seekTo(targetSeconds);
  }

  function handlePointerMove(event: PointerEvent): void {
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    if (rect.width > 0 && $duration > 0) {
      const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      hoverPercent = ratio * 100;
      hoverTime = ratio * $duration;
    }

    if (isScrubbing) {
      seekTo(pointerToSeconds(event, bar));
    }
  }

  function handlePointerLeave(): void {
    if (!isScrubbing) {
      hoverTime = null;
    }
  }

  function handlePointerUp(event: PointerEvent): void {
    isScrubbing = false;
    hoverTime = null;
    const bar = event.currentTarget as HTMLElement;
    if (bar.hasPointerCapture(event.pointerId)) {
      bar.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if ($duration <= 0) return;

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        seekBy(5);
        break;
      case "ArrowLeft":
        event.preventDefault();
        seekBy(-5);
        break;
      case "PageUp":
        event.preventDefault();
        seekBy(30);
        break;
      case "PageDown":
        event.preventDefault();
        seekBy(-30);
        break;
      case "Home":
        event.preventDefault();
        seekTo(0);
        break;
      case "End":
        event.preventDefault();
        seekTo($duration);
        break;
    }
  }
</script>

<div class="progress-container">
  <!-- Barre interactive avec prévisualisation temporelle -->
  <div
    class="bar-wrapper"
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
    onpointerleave={handlePointerLeave}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
    onkeydown={handleKeyDown}
  >
    {#if hoverTime !== null && $duration > 0}
      <div class="hover-preview" style:left="{hoverPercent}%">
        {formatDuration(hoverTime)}
      </div>
    {/if}

    <div class="track">
      <div class="fill" style:width="{fillRatio * 100}%"></div>
    </div>
    <div class="knob" style:left="{fillRatio * 100}%"></div>
  </div>

  <!-- Horodatages gauche (temps courant) et droite (durée/restant) -->
  <div class="time-row">
    <span class="time current">{formatDuration($position)}</span>
    <button
      class="time total"
      onclick={() => (showRemaining = !showRemaining)}
      title="Cliquer pour basculer temps restant / temps total"
      aria-label="Bascule temps restant ou temps total"
    >
      {displayDuration}
    </button>
  </div>
</div>

<style>
  .progress-container {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    width: 100%;
    user-select: none;
  }

  .bar-wrapper {
    position: relative;
    width: 100%;
    height: 18px;
    display: flex;
    align-items: center;
    cursor: pointer;
    touch-action: none;
  }

  .bar-wrapper[aria-disabled="true"] {
    cursor: default;
    opacity: 0.5;
  }

  .track {
    position: relative;
    width: 100%;
    height: 4px;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.22);
    overflow: hidden;
    transition: height 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .bar-wrapper:hover .track,
  .bar-wrapper.scrubbing .track {
    height: 6px;
  }

  .fill {
    height: 100%;
    border-radius: inherit;
    background: #ffffff;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    pointer-events: none;
  }

  .knob {
    position: absolute;
    top: 50%;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%) scale(0);
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none;
  }

  .bar-wrapper:hover .knob,
  .bar-wrapper.scrubbing .knob,
  .bar-wrapper:focus-visible .knob {
    transform: translate(-50%, -50%) scale(1);
  }

  .hover-preview {
    position: absolute;
    bottom: calc(100% + 6px);
    transform: translateX(-50%);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background: rgba(15, 17, 23, 0.9);
    color: #ffffff;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    pointer-events: none;
    z-index: 10;
  }

  .time-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2px;
  }

  .time {
    color: rgba(255, 255, 255, 0.75);
    font-size: 0.8rem;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  button.time {
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: color 0.15s ease;
  }

  button.time:hover {
    color: #ffffff;
  }
</style>
