<script lang="ts">
  import {
    changePlaybackRate,
    changeVolume,
    stop,
    toggleMute,
    togglePlay,
  } from "$lib/player/controller";
  import {
    duration,
    isConverting,
    isMuted,
    isPlaying,
    playbackRate,
    position,
    volume,
  } from "$lib/stores/player";
  import { formatDuration } from "$lib/utils/formatters";

  function handleVolumeInput(event: Event): void {
    changeVolume(Number((event.currentTarget as HTMLInputElement).value));
  }

  function handleRateChange(event: Event): void {
    changePlaybackRate(Number((event.currentTarget as HTMLSelectElement).value));
  }
</script>

<div class="controls">
  <button
    class="icon main"
    onclick={togglePlay}
    disabled={$isConverting}
    aria-label={$isPlaying ? "Mettre en pause" : "Lire"}
  >
    {#if $isPlaying}
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.5-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5z" />
      </svg>
    {/if}
  </button>

  <button
    class="icon"
    onclick={stop}
    disabled={$isConverting}
    aria-label="Arrêter et rembobiner"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
    </svg>
  </button>

  <span class="time">{formatDuration($position)} / {formatDuration($duration)}</span>

  <div class="volume">
    <button
      class="icon"
      onclick={toggleMute}
      aria-label={$isMuted ? "Rétablir le son" : "Couper le son"}
    >
      {#if $isMuted}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9.5v5h4l5 4.5V5l-5 4.5H4z" />
          <path
            d="m16.5 9.5 5 5m0-5-5 5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9.5v5h4l5 4.5V5l-5 4.5H4z" />
          <path
            d="M15.5 9a4.5 4.5 0 0 1 0 6m2.5-8.5a8 8 0 0 1 0 11"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      {/if}
    </button>

    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={$volume}
      oninput={handleVolumeInput}
      aria-label="Volume"
    />
  </div>

  <select
    value={$playbackRate}
    onchange={handleRateChange}
    aria-label="Vitesse de lecture"
  >
    <option value="0.25">0,25×</option>
    <option value="0.5">0,5×</option>
    <option value="1">1×</option>
    <option value="1.5">1,5×</option>
    <option value="2">2×</option>
  </select>
</div>

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.9rem;
  }

  .icon {
    display: grid;
    width: 40px;
    height: 40px;
    padding: 0;
    place-items: center;
    border: 0;
    border-radius: var(--radius-full);
    background: transparent;
    cursor: pointer;
  }

  .icon:hover:not(:disabled) {
    background: var(--color-surface-hover);
  }

  .icon:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  .icon svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  .main {
    background: var(--gradient-accent);
    color: #fff;
  }

  .main:hover:not(:disabled) {
    background: var(--gradient-accent);
    filter: brightness(1.15);
  }

  .time {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .volume {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .volume input {
    width: 90px;
    accent-color: var(--color-accent);
  }

  select {
    padding: 0.35rem 0.45rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.9rem;
  }
</style>
