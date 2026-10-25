<script lang="ts">
  import ControlBar from "./ControlBar.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import { attachMediaElement, detachMediaElement, togglePlay } from "$lib/player/controller";
  import {
    currentMedia,
    isPlaying,
    playbackError,
    playbackNotice,
    playbackSource,
  } from "$lib/stores/player";

  const HIDE_DELAY_MS = 3000;

  let mediaElement = $state<HTMLMediaElement | null>(null);
  let controlsVisible = $state(true);
  let pointerOnControls = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function cancelHideTimer(): void {
    if (hideTimer === null) return;
    clearTimeout(hideTimer);
    hideTimer = null;
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
</script>

<section
  class="stage"
  role="group"
  aria-label="Zone de lecture"
  class:audio={$currentMedia?.kind === "audio"}
  class:hide-ui={!controlsVisible && $currentMedia?.kind === "video"}
  onpointermove={revealControls}
>
  {#if $currentMedia?.kind === "video"}
    <!-- Les sous-titres sont prévus à la Phase 4. -->
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={mediaElement} src={$playbackSource} autoplay playsinline></video>
  {:else}
    <audio bind:this={mediaElement} src={$playbackSource} autoplay></audio>
  {/if}

  {#if $currentMedia?.kind === "video"}
    <button
      class="click-layer"
      onclick={togglePlay}
      aria-label={$isPlaying ? "Mettre en pause" : "Lire"}
    ></button>
  {/if}

  {#if $playbackNotice}
    <div class="chip notice" role="status">
      <span class="spinner" aria-hidden="true"></span>
      {$playbackNotice}
    </div>
  {/if}
  {#if $playbackError}
    <div class="chip error" role="alert">{$playbackError}</div>
  {/if}

  <div
    class="overlay"
    role="group"
    aria-label="Contrôles de lecture"
    onpointerenter={handleControlsEnter}
    onpointerleave={handleControlsLeave}
  >
    <ProgressBar />
    <ControlBar />
  </div>
</section>

<style>
  .stage {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-sm);
    background: #000;
  }

  .stage video {
    display: block;
    width: 100%;
    max-height: min(65vh, 720px);
    aspect-ratio: 16 / 9;
    object-fit: contain;
  }

  .stage.hide-ui {
    cursor: none;
  }

  .click-layer {
    position: absolute;
    inset: 0;
    z-index: 1;
    padding: 0;
    border: 0;
    border-radius: inherit;
    background: transparent;
    cursor: pointer;
  }

  .stage.hide-ui .click-layer {
    cursor: none;
  }

  .click-layer:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .overlay {
    position: absolute;
    z-index: 2;
    inset-inline: 0;
    bottom: 0;
    display: grid;
    gap: 0.4rem;
    padding: 1.75rem 1rem 0.75rem;
    background: linear-gradient(to top, rgb(0 0 0 / 75%), transparent);
    opacity: 1;
    transition: opacity 0.3s ease;
  }

  .stage.hide-ui .overlay {
    opacity: 0;
    pointer-events: none;
  }

  .stage.audio {
    overflow: visible;
    background: transparent;
  }

  .stage.audio .overlay {
    position: static;
    padding: 0.75rem 0 0;
    background: none;
  }

  .chip {
    position: absolute;
    z-index: 3;
    top: 1rem;
    left: 50%;
    display: flex;
    max-width: calc(100% - 2rem);
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.9rem;
    transform: translateX(-50%);
    border-radius: var(--radius-full);
    background: rgb(0 0 0 / 75%);
    color: #fff;
    font-size: 0.9rem;
    overflow-wrap: anywhere;
    backdrop-filter: blur(4px);
  }

  .stage.audio .chip {
    position: static;
    width: fit-content;
    margin: 0.75rem auto 0;
    transform: none;
  }

  .chip.error {
    color: #fca5a5;
  }

  .spinner {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
    border: 2px solid rgb(255 255 255 / 25%);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .overlay,
    .spinner {
      transition: none;
      animation: none;
    }
  }
</style>
