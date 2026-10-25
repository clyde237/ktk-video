<script lang="ts">
  import {
    changePlaybackRate,
    changeVolume,
    playNext,
    playPrevious,
    toggleMute,
  } from "$lib/player/controller";
  import {
    currentMedia,
    isConverting,
    isMuted,
    playbackRate,
    playbackStage,
    volume,
  } from "$lib/stores/player";
  import { activePlaylist } from "$lib/stores/playlist";

  let rateMenuOpen = $state(false);

  const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

  function handleVolumeInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    changeVolume(Number(input.value));
  }

  function selectRate(rate: number): void {
    changePlaybackRate(rate);
    rateMenuOpen = false;
  }

  function formatRate(rate: number): string {
    return rate === 1 ? "1×" : `${rate.toLocaleString("fr-FR")}×`;
  }

  const hasNext = $derived(() => {
    const current = $currentMedia;
    const playlist = $activePlaylist;
    if (!current || !playlist) return false;
    const index = playlist.items.findIndex((item) => item.id === current.id);
    return index >= 0 && index < playlist.items.length - 1;
  });

  const hasPrev = $derived(() => {
    const current = $currentMedia;
    const playlist = $activePlaylist;
    if (!current || !playlist) return false;
    const index = playlist.items.findIndex((item) => item.id === current.id);
    return index > 0;
  });
</script>

<div class="control-bar-row">
  <!-- Titre du média et badge (bas gauche) -->
  <div class="media-info">
    <span class="media-title" title={$currentMedia?.name ?? ""}>
      {$currentMedia?.name ?? ""}
    </span>
    {#if $playbackStage === 1}
      <span class="badge" title="Fichier remuxé pour compatibilité">remuxé</span>
    {:else if $playbackStage === 2}
      <span class="badge" title="Fichier transcodé pour compatibilité">converti</span>
    {/if}
  </div>

  <!-- Contrôles droits (piste précédente/suivante, volume, réglages/vitesse) -->
  <div class="media-actions">
    {#if $activePlaylist.items.length > 1}
      <button
        class="action-btn"
        onclick={playPrevious}
        disabled={!hasPrev() || $isConverting}
        aria-label="Média précédent"
        title="Média précédent (P)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor" />
        </svg>
      </button>

      <button
        class="action-btn"
        onclick={playNext}
        disabled={!hasNext() || $isConverting}
        aria-label="Média suivant"
        title="Média suivant (N)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 6h2v12h-2zm-10 12l8.5-6L6 6z" fill="currentColor" />
        </svg>
      </button>
    {/if}

    <!-- Groupe Volume -->
    <div class="volume-container">
      <button
        class="action-btn volume-btn"
        onclick={toggleMute}
        aria-label={$isMuted ? "Rétablir le son (M)" : "Couper le son (M)"}
        title={$isMuted ? "Rétablir le son (M)" : "Couper le son (M)"}
      >
        {#if $isMuted || $volume === 0}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor" />
          </svg>
        {:else if $volume < 0.5}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="currentColor" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor" />
          </svg>
        {/if}
      </button>

      <div class="slider-wrapper">
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={$isMuted ? 0 : $volume}
          oninput={handleVolumeInput}
          aria-label="Volume"
        />
      </div>
    </div>

    <!-- Réglages / Vitesse de lecture -->
    <div class="settings-container">
      <button
        class="action-btn settings-btn"
        class:active={rateMenuOpen || $playbackRate !== 1}
        onclick={() => (rateMenuOpen = !rateMenuOpen)}
        aria-label="Paramètres de lecture"
        title="Vitesse de lecture"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor" />
        </svg>
        {#if $playbackRate !== 1}
          <span class="rate-indicator">{formatRate($playbackRate)}</span>
        {/if}
      </button>

      {#if rateMenuOpen}
        <div class="settings-popover">
          <div class="popover-header">Vitesse de lecture</div>
          <div class="rate-list">
            {#each RATES as rate (rate)}
              <button
                class="rate-option"
                class:selected={$playbackRate === rate}
                onclick={() => selectRate(rate)}
              >
                <span>{formatRate(rate)}</span>
                {#if $playbackRate === rate}
                  <svg class="check-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor" />
                  </svg>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .control-bar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
    margin-bottom: 0.25rem;
    user-select: none;
  }

  .media-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
  }

  .media-title {
    color: #ffffff;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badge {
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    backdrop-filter: blur(4px);
    flex-shrink: 0;
  }

  .media-actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  .action-btn {
    position: relative;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  }

  .action-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  .action-btn:active:not(:disabled) {
    transform: scale(0.92);
  }

  .action-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .action-btn svg {
    width: 18px;
    height: 18px;
  }

  /* ─── Groupe Volume ─── */
  .volume-container {
    display: flex;
    align-items: center;
    position: relative;
    border-radius: var(--radius-full);
    transition: background 0.2s ease;
  }

  .volume-container:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .slider-wrapper {
    display: flex;
    align-items: center;
    width: 0;
    overflow: hidden;
    opacity: 0;
    transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
  }

  .volume-container:hover .slider-wrapper,
  .volume-container:focus-within .slider-wrapper {
    width: 72px;
    opacity: 1;
    padding-right: 0.4rem;
  }

  .slider-wrapper input[type="range"] {
    width: 100%;
    height: 3px;
    margin: 0;
    accent-color: #ffffff;
    cursor: pointer;
  }

  /* ─── Paramètres / Vitesse ─── */
  .settings-container {
    position: relative;
  }

  .settings-btn.active {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.15);
  }

  .rate-indicator {
    position: absolute;
    top: -4px;
    right: -4px;
    padding: 1px 3px;
    border-radius: 4px;
    background: var(--color-accent);
    color: #ffffff;
    font-size: 0.65rem;
    font-weight: 700;
  }

  .settings-popover {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    width: 150px;
    padding: 0.4rem;
    border-radius: 10px;
    background: rgba(18, 20, 28, 0.94);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .popover-header {
    padding: 0.35rem 0.5rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 0.2rem;
  }

  .rate-list {
    display: grid;
    grid-template-columns: 1fr;
    max-height: 200px;
    overflow-y: auto;
  }

  .rate-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.35rem 0.55rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.12s ease;
  }

  .rate-option:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .rate-option.selected {
    color: #ffffff;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.08);
  }

  .check-icon {
    width: 14px;
    height: 14px;
    color: var(--color-accent);
  }
</style>
