<script lang="ts">
  import ProgressBar from "./ProgressBar.svelte";
  import ControlBar from "./ControlBar.svelte";
  import {
    attachMediaElement,
    changePlaybackRate,
    changeVolume,
    detachMediaElement,
    playNext,
    playPrevious,
    seekBy,
    toggleMute,
    togglePlay,
  } from "$lib/player/controller";
  import {
    currentMedia,
    isConverting,
    isMuted,
    isPlaying,
    playbackError,
    playbackNotice,
    playbackRate,
    playbackSource,
    volume,
  } from "$lib/stores/player";
  import {
    activeSubtitle,
    clearSubtitle,
    detectSubtitles,
    loadEmbeddedSubtitle,
    loadSubtitleFile,
    resetSubtitles,
    subtitleCandidates,
    subtitlesNotice,
  } from "$lib/stores/subtitles";
  import { pickSubtitleFile } from "$lib/api/subtitles";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  const HIDE_DELAY_MS = 3000;

  let mediaElement = $state<HTMLMediaElement | null>(null);
  let controlsVisible = $state(true);
  let pointerOnControls = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let subtitleMenuOpen = $state(false);
  let isFullscreen = $state(false);

  function cancelHideTimer(): void {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function scheduleHide(): void {
    cancelHideTimer();
    hideTimer = setTimeout(() => {
      hideTimer = null;
      if ($isPlaying && $currentMedia?.kind === "video" && !pointerOnControls) {
        controlsVisible = false;
      }
    }, HIDE_DELAY_MS);
  }

  function revealControls(): void {
    controlsVisible = true;
    if ($isPlaying && $currentMedia?.kind === "video") scheduleHide();
  }

  function handleControlsEnter(): void {
    pointerOnControls = true;
    cancelHideTimer();
  }

  function handleControlsLeave(): void {
    pointerOnControls = false;
    if ($isPlaying && $currentMedia?.kind === "video") scheduleHide();
  }

  async function checkFullscreen(): Promise<void> {
    try {
      const win = getCurrentWindow();
      isFullscreen = await win.isFullscreen();
    } catch {
      // mode navigateur standard
    }
  }

  async function toggleFullscreen(): Promise<void> {
    try {
      const win = getCurrentWindow();
      const nextState = !(await win.isFullscreen());
      await win.setFullscreen(nextState);
      isFullscreen = nextState;
    } catch {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        isFullscreen = false;
      } else {
        await document.documentElement.requestFullscreen();
        isFullscreen = true;
      }
    }
  }

  $effect(() => {
    void checkFullscreen();
  });

  $effect(() => {
    if ($isPlaying && $currentMedia?.kind === "video") {
      scheduleHide();
    } else {
      cancelHideTimer();
      controlsVisible = true;
    }

    return cancelHideTimer;
  });

  $effect(() => {
    const listenerController = new AbortController();
    window.addEventListener("keydown", revealControls, {
      signal: listenerController.signal,
    });
    return () => listenerController.abort();
  });

  $effect(() => {
    if (mediaElement) attachMediaElement(mediaElement);
    return () => detachMediaElement();
  });

  $effect(() => {
    const media = $currentMedia;
    subtitleMenuOpen = false;
    resetSubtitles();
    if (media?.kind === "video") {
      detectSubtitles(media.path).catch(console.error);
    }
  });

  $effect(() => {
    const subtitle = $activeSubtitle;
    if (!subtitle || !mediaElement) return;
    const tracks = mediaElement.textTracks;
    const track = tracks[tracks.length - 1];
    if (track) track.mode = "showing";
  });

  async function handlePickSubtitle(): Promise<void> {
    const path = await pickSubtitleFile();
    if (path !== null) await loadSubtitleFile(path);
  }

  function handleEmbedded(): void {
    const media = $currentMedia;
    if (media) loadEmbeddedSubtitle(media.path).catch(console.error);
  }

  function fileName(path: string): string {
    return path.split(/[\\/]/).pop() ?? path;
  }
</script>

{#if $currentMedia?.kind === "video"}
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- 🎬 LECTEUR VIDÉO : DESIGN ÉPURÉ INSPIRÉ DES MODÈLES 1 & 2    -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <section
    class="video-stage"
    role="group"
    aria-label="Lecteur vidéo"
    class:hide-ui={!controlsVisible}
    onpointermove={revealControls}
  >
    <video bind:this={mediaElement} src={$playbackSource} autoplay playsinline>
      <track
        kind="captions"
        src={$activeSubtitle?.url}
        label={$activeSubtitle?.label ?? "Sous-titres"}
        default={$activeSubtitle !== null}
      />
    </video>

    <!-- Calque transparent pour play/pause au clic direct -->
    <button
      class="click-layer"
      onclick={togglePlay}
      aria-label={$isPlaying ? "Mettre en pause" : "Lire"}
    ></button>

    <!-- ─── BARRE SUPÉRIEURE (Plein écran à gauche, Sous-titres à droite) ─── -->
    <div class="top-bar">
      <!-- Plein écran (haut gauche - comme Modèle 1 & 2) -->
      <button
        class="glass-icon-btn"
        onclick={toggleFullscreen}
        aria-label={isFullscreen ? "Quitter le plein écran (F)" : "Plein écran (F)"}
        title={isFullscreen ? "Quitter le plein écran (F)" : "Plein écran (F)"}
      >
        {#if isFullscreen}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" fill="currentColor" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor" />
          </svg>
        {/if}
      </button>

      <!-- Sous-titres (haut droite) -->
      <div class="subtitles-container">
        <button
          class="cc-badge-btn"
          class:active={$activeSubtitle !== null}
          onclick={() => (subtitleMenuOpen = !subtitleMenuOpen)}
          aria-label="Gestion des sous-titres"
          title="Sous-titres"
        >
          CC
        </button>

        {#if subtitleMenuOpen}
          <div class="subtitles-popover">
            <div class="popover-title">Sous-titres</div>
            <button
              class="sub-item"
              class:selected={$activeSubtitle === null}
              onclick={() => {
                clearSubtitle();
                subtitleMenuOpen = false;
              }}
            >
              <span>Désactivés</span>
              {#if $activeSubtitle === null}
                <svg class="check-icon" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/></svg>
              {/if}
            </button>

            {#each $subtitleCandidates as path (path)}
              <button
                class="sub-item"
                class:selected={$activeSubtitle?.source === path}
                onclick={() => {
                  loadSubtitleFile(path);
                  subtitleMenuOpen = false;
                }}
              >
                <span class="sub-name">{fileName(path)}</span>
                {#if $activeSubtitle?.source === path}
                  <svg class="check-icon" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/></svg>
                {/if}
              </button>
            {/each}

            <div class="popover-divider"></div>

            <button
              class="sub-item action"
              onclick={() => {
                handleEmbedded();
                subtitleMenuOpen = false;
              }}
            >
              <svg viewBox="0 0 24 24" class="item-icon"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/></svg>
              <span>Piste embarquée (extraction)</span>
            </button>

            <button
              class="sub-item action"
              onclick={() => {
                handlePickSubtitle();
                subtitleMenuOpen = false;
              }}
            >
              <svg viewBox="0 0 24 24" class="item-icon"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>
              <span>Ouvrir un fichier .srt…</span>
            </button>
          </div>
        {/if}
      </div>
    </div>

    <!-- ─── CONTRÔLES CENTRAUX FLOTTANTS (Rewind 10s · Play/Pause · Forward 10s) ─── -->
    <div class="center-controls">
      <button
        class="center-btn skip"
        onclick={() => seekBy(-10)}
        disabled={$isConverting}
        aria-label="Reculer de 10 secondes"
        title="Reculer de 10s (←)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.5 3a9 9 0 1 0 9 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M12.5 3 9 6.5l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <text x="12" y="16" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" font-family="system-ui">10</text>
        </svg>
      </button>

      <button
        class="center-btn hero"
        onclick={togglePlay}
        disabled={$isConverting}
        aria-label={$isPlaying ? "Mettre en pause (Espace)" : "Lire (Espace)"}
        title={$isPlaying ? "Mettre en pause (Espace)" : "Lire (Espace)"}
      >
        {#if $isPlaying}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" rx="1.5" fill="currentColor" />
            <rect x="14" y="4" width="4" height="16" rx="1.5" fill="currentColor" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polygon points="7,4 20,12 7,20" fill="currentColor" />
          </svg>
        {/if}
      </button>

      <button
        class="center-btn skip"
        onclick={() => seekBy(10)}
        disabled={$isConverting}
        aria-label="Avancer de 10 secondes"
        title="Avancer de 10s (→)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11.5 3a9 9 0 1 1-9 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M11.5 3 15 6.5 11.5 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <text x="12" y="16" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" font-family="system-ui">10</text>
        </svg>
      </button>
    </div>

    <!-- ─── NOTIFICATIONS & ÉTATS (Au centre, non intrusifs) ─── -->
    {#if $playbackNotice}
      <div class="notification-chip notice" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <span>{$playbackNotice}</span>
      </div>
    {/if}
    {#if $playbackError}
      <div class="notification-chip error" role="alert">
        <span>{$playbackError}</span>
      </div>
    {/if}
    {#if $subtitlesNotice}
      <div class="notification-chip sub" role="status">
        <span>{$subtitlesNotice}</span>
      </div>
    {/if}

    <!-- ─── OVERLAY INFÉRIEUR (Titre, Actions, Scrubber et Temps) ─── -->
    <div
      class="bottom-overlay"
      role="group"
      aria-label="Contrôles de lecture"
      onpointerenter={handleControlsEnter}
      onpointerleave={handleControlsLeave}
    >
      <ControlBar />
      <ProgressBar />
    </div>
  </section>

{:else}
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- 🎵 LECTEUR AUDIO : DESIGN FROSTED GLASS INSPIRÉ DU MODÈLE 4 -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <section class="audio-stage" role="group" aria-label="Lecteur audio">
    <audio bind:this={mediaElement} src={$playbackSource} autoplay></audio>

    <!-- Carte centrale Frosted Glass -->
    <div class="audio-card">
      <!-- Visuel d'illustration / Vinyle animé -->
      <div class="audio-visual" class:playing={$isPlaying}>
        <div class="vinyl-disc">
          <div class="vinyl-grooves"></div>
          <div class="vinyl-center">
            <svg viewBox="0 0 24 24" class="music-icon">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Métadonnées audio -->
      <div class="audio-meta">
        <h2 class="audio-title">{$currentMedia?.name ?? "Fichier audio"}</h2>
        <span class="audio-badge">Audio • {$currentMedia?.extension?.toUpperCase() ?? "AUDIO"}</span>
      </div>

      <!-- Timeline & Barre de progression -->
      <div class="audio-progress">
        <ProgressBar />
      </div>

      <!-- Barre de contrôle audio (Pilule flottante) -->
      <div class="audio-pill-bar">
        <!-- Piste précédente -->
        <button
          class="audio-btn"
          onclick={playPrevious}
          disabled={$isConverting}
          aria-label="Piste précédente"
        >
          <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor"/></svg>
        </button>

        <!-- Reculer 10s -->
        <button
          class="audio-btn"
          onclick={() => seekBy(-10)}
          disabled={$isConverting}
          aria-label="Reculer de 10 secondes"
        >
          <svg viewBox="0 0 24 24">
            <path d="M12.5 3a9 9 0 1 0 9 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M12.5 3 9 6.5l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <text x="12" y="16" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor">10</text>
          </svg>
        </button>

        <!-- Play / Pause Principal -->
        <button
          class="audio-btn play-hero"
          onclick={togglePlay}
          disabled={$isConverting}
          aria-label={$isPlaying ? "Pause" : "Lecture"}
        >
          {#if $isPlaying}
            <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1.5" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1.5" fill="currentColor"/></svg>
          {:else}
            <svg viewBox="0 0 24 24"><polygon points="7,4 20,12 7,20" fill="currentColor"/></svg>
          {/if}
        </button>

        <!-- Avancer 10s -->
        <button
          class="audio-btn"
          onclick={() => seekBy(10)}
          disabled={$isConverting}
          aria-label="Avancer de 10 secondes"
        >
          <svg viewBox="0 0 24 24">
            <path d="M11.5 3a9 9 0 1 1-9 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M11.5 3 15 6.5 11.5 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <text x="12" y="16" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor">10</text>
          </svg>
        </button>

        <!-- Piste suivante -->
        <button
          class="audio-btn"
          onclick={playNext}
          disabled={$isConverting}
          aria-label="Piste suivante"
        >
          <svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zm-10 12l8.5-6L6 6z" fill="currentColor"/></svg>
        </button>

        <div class="audio-divider"></div>

        <!-- Volume Audio -->
        <div class="audio-volume">
          <button class="audio-btn" onclick={toggleMute} aria-label="Mute">
            {#if $isMuted || $volume === 0}
              <svg viewBox="0 0 24 24"><path d="M4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/></svg>
            {:else}
              <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="currentColor"/></svg>
            {/if}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={$isMuted ? 0 : $volume}
            oninput={(e) => changeVolume(Number((e.currentTarget as HTMLInputElement).value))}
            aria-label="Volume audio"
          />
        </div>
      </div>
    </div>
  </section>
{/if}

<style>
  /* ═══════════════════════════════════════════════════════════════ */
  /* STYLES DU LECTEUR VIDÉO (Modèles 1 & 2)                          */
  /* ═══════════════════════════════════════════════════════════════ */
  .video-stage {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 16px;
    background: #000000;
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.45);
    user-select: none;
  }

  .video-stage video {
    display: block;
    width: 100%;
    max-height: min(72vh, 760px);
    aspect-ratio: 16 / 9;
    object-fit: contain;
    background: #000000;
  }

  .video-stage video::cue {
    color: #ffffff;
    background: rgba(0, 0, 0, 0.55);
    font-size: 1.05rem;
    line-height: 1.35;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
  }

  /* Curseur invisible lors du masquage automatique */
  .video-stage.hide-ui {
    cursor: none;
  }

  /* Calque plein écran pour play/pause au clic */
  .click-layer {
    position: absolute;
    inset: 0;
    z-index: 2;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .video-stage.hide-ui .click-layer {
    cursor: none;
  }

  .click-layer:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  /* ─── Barre Supérieure ─── */
  .top-bar {
    position: absolute;
    top: 0;
    inset-inline: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, transparent 100%);
    opacity: 1;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .video-stage.hide-ui .top-bar {
    opacity: 0;
    pointer-events: none;
  }

  .glass-icon-btn {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(8px);
    color: #ffffff;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.1s ease;
  }

  .glass-icon-btn:hover {
    background: rgba(0, 0, 0, 0.65);
    transform: scale(1.05);
  }

  .glass-icon-btn svg {
    width: 20px;
    height: 20px;
  }

  /* CC Button & Popover */
  .subtitles-container {
    position: relative;
  }

  .cc-badge-btn {
    padding: 0.3rem 0.6rem;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .cc-badge-btn:hover {
    background: rgba(0, 0, 0, 0.7);
    border-color: rgba(255, 255, 255, 0.45);
  }

  .cc-badge-btn.active {
    background: var(--color-accent);
    border-color: transparent;
  }

  .subtitles-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 230px;
    max-height: 280px;
    overflow-y: auto;
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

  .popover-title {
    padding: 0.35rem 0.5rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 0.2rem;
  }

  .sub-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.85rem;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s ease;
  }

  .sub-item:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .sub-item.selected {
    font-weight: 600;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.08);
  }

  .sub-item.action {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.8rem;
    justify-content: flex-start;
  }

  .item-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .check-icon {
    width: 14px;
    height: 14px;
    color: var(--color-accent);
    flex-shrink: 0;
  }

  .sub-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .popover-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 0.25rem 0;
  }

  /* ─── Contrôles Centraux Flottants ─── */
  .center-controls {
    position: absolute;
    inset: 0;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2.5rem;
    pointer-events: none;
    opacity: 1;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .video-stage.hide-ui .center-controls {
    opacity: 0;
    pointer-events: none;
  }

  .center-btn {
    pointer-events: auto;
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
    border-radius: 50%;
    color: #ffffff;
    cursor: pointer;
    backdrop-filter: blur(12px);
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease, opacity 0.15s ease;
  }

  .center-btn:active:not(:disabled) {
    transform: scale(0.92);
  }

  .center-btn:disabled {
    opacity: 0.4;
    cursor: wait;
  }

  .center-btn.skip {
    width: 44px;
    height: 44px;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .center-btn.skip:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.7);
    transform: scale(1.1);
  }

  .center-btn.skip svg {
    width: 24px;
    height: 24px;
  }

  .center-btn.hero {
    width: 64px;
    height: 64px;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .center-btn.hero:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(1.12);
  }

  .center-btn.hero svg {
    width: 28px;
    height: 28px;
  }

  /* ─── Notifications (Chips) ─── */
  .notification-chip {
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 6;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 1rem;
    border-radius: var(--radius-full);
    background: rgba(10, 12, 18, 0.88);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #ffffff;
    font-size: 0.85rem;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }

  .notification-chip.error {
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.3);
  }

  .spinner {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-top-color: #ffffff;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ─── Overlay Inférieur ─── */
  .bottom-overlay {
    position: absolute;
    bottom: 0;
    inset-inline: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 3rem 1.25rem 0.85rem;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%);
    opacity: 1;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .video-stage.hide-ui .bottom-overlay {
    opacity: 0;
    pointer-events: none;
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* STYLES DU LECTEUR AUDIO (Inspiration Modèle 4 Frosted Glass)    */
  /* ═══════════════════════════════════════════════════════════════ */
  .audio-stage {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 1.5rem 0;
    user-select: none;
  }

  .audio-card {
    width: 100%;
    max-width: 680px;
    padding: 2.2rem 2rem 1.8rem;
    border-radius: 24px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  /* Visuel Vinyle */
  .audio-visual {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: radial-gradient(circle, #2d3139 0%, #15181e 70%, #0d0e12 100%);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6), 0 0 0 4px rgba(255, 255, 255, 0.08);
    display: grid;
    place-items: center;
    transition: transform 0.5s ease;
  }

  .audio-visual.playing {
    animation: vinyl-rotate 8s linear infinite;
  }

  @keyframes vinyl-rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .vinyl-center {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--gradient-accent);
    display: grid;
    place-items: center;
    color: #ffffff;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.4);
  }

  .music-icon {
    width: 22px;
    height: 22px;
  }

  /* Métadonnées */
  .audio-meta {
    text-align: center;
  }

  .audio-title {
    margin: 0 0 0.4rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.01em;
  }

  .audio-badge {
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  .audio-progress {
    width: 100%;
  }

  /* Pilule de contrôle Audio */
  .audio-pill-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-full);
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .audio-btn {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  }

  .audio-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  .audio-btn:active:not(:disabled) {
    transform: scale(0.92);
  }

  .audio-btn svg {
    width: 18px;
    height: 18px;
  }

  .audio-btn.play-hero {
    width: 48px;
    height: 48px;
    background: #ffffff;
    color: #0f1117;
    box-shadow: 0 4px 16px rgba(255, 255, 255, 0.25);
  }

  .audio-btn.play-hero:hover:not(:disabled) {
    background: #ffffff;
    filter: brightness(1.1);
    transform: scale(1.08);
  }

  .audio-btn.play-hero svg {
    width: 22px;
    height: 22px;
  }

  .audio-divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.12);
    margin: 0 0.2rem;
  }

  .audio-volume {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .audio-volume input[type="range"] {
    width: 65px;
    height: 3px;
    accent-color: #ffffff;
  }

  @media (prefers-reduced-motion: reduce) {
    .video-stage,
    .top-bar,
    .bottom-overlay,
    .center-controls,
    .audio-visual.playing {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
