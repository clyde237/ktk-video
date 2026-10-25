<script lang="ts">
  import { openMediaFile, openMediaFolder } from "$lib/api/media";
  import {
    attachMediaElement,
    changePlaybackRate,
    changeVolume,
    detachMediaElement,
    loadMedia,
    seekTo,
    stop,
    toggleMute,
    togglePlay,
  } from "$lib/player/controller";
  import {
    currentMedia,
    duration,
    isConverting,
    isMuted,
    isPlaying,
    playbackError,
    playbackNotice,
    playbackRate,
    playbackSource,
    playbackStage,
    position,
    volume,
  } from "$lib/stores/player";
  import { activePlaylist, addManyToPlaylist, clearPlaylist } from "$lib/stores/playlist";
  import { formatDuration, formatFileSize } from "$lib/utils/formatters";
  import type { MediaItem } from "$lib/types/media";

  let isLoading = $state(false);
  let importError = $state<string | null>(null);
  let importNotice = $state<string | null>(null);
  let mediaElement = $state<HTMLMediaElement | null>(null);

  $effect(() => {
    if (mediaElement) attachMediaElement(mediaElement);
    return () => detachMediaElement();
  });

  async function runImport(action: () => Promise<void>): Promise<void> {
    isLoading = true;
    importError = null;
    importNotice = null;

    try {
      await action();
    } catch (error: unknown) {
      importError = error instanceof Error ? error.message : String(error);
    } finally {
      isLoading = false;
    }
  }

  function handleOpenFile(): Promise<void> {
    return runImport(async () => {
      const media = await openMediaFile();
      if (media) loadMedia(media);
    });
  }

  function handleOpenFolder(): Promise<void> {
    return runImport(async () => {
      const items = await openMediaFolder();
      if (items === null) return;

      if (items.length === 0) {
        importNotice = "Aucun média trouvé dans ce dossier.";
        return;
      }

      addManyToPlaylist(items);
      importNotice = `${items.length} média${items.length > 1 ? "s" : ""} ajouté${items.length > 1 ? "s" : ""} à la playlist.`;
    });
  }

  function handlePlayItem(item: MediaItem): void {
    loadMedia(item);
  }

  function handleSeekInput(event: Event): void {
    seekTo(Number((event.currentTarget as HTMLInputElement).value));
  }

  function handleVolumeInput(event: Event): void {
    changeVolume(Number((event.currentTarget as HTMLInputElement).value));
  }

  function handleSpeedChange(event: Event): void {
    changePlaybackRate(Number((event.currentTarget as HTMLSelectElement).value));
  }
</script>

<svelte:head>
  <title>ktk-video</title>
</svelte:head>

<main>
  <h1>ktk-video</h1>

  <div class="actions">
    <button onclick={handleOpenFile} disabled={isLoading || $isConverting}>Ouvrir un média</button>
    <button onclick={handleOpenFolder} disabled={isLoading || $isConverting}>Importer un dossier</button>
  </div>

  {#if importNotice}
    <p class="notice" role="status">{importNotice}</p>
  {/if}

  {#if importError}
    <p class="error" role="alert">{importError}</p>
  {/if}

  {#if $currentMedia}
    {@const currentItem = $currentMedia}
    <p class="media-info">
      {currentItem.name} — {currentItem.kind === "video" ? "vidéo" : "audio"}
      ({formatFileSize(currentItem.size)})
      {#if $playbackStage === 1} — version remuxée{:else if $playbackStage === 2} — version convertie{/if}
    </p>

    {#if currentItem.kind === "video"}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        bind:this={mediaElement}
        src={$playbackSource}
        controls
        autoplay
        playsinline
      ></video>
    {:else}
      <audio
        bind:this={mediaElement}
        src={$playbackSource}
        controls
        autoplay
      ></audio>
    {/if}

    <div class="controls">
      <button onclick={togglePlay} disabled={$isConverting}>
        {#if $isPlaying}Pause{:else}Lecture{/if}
      </button>
      <button onclick={stop} disabled={$isConverting}>Stop</button>
      <span>{formatDuration($position)} / {formatDuration($duration)}</span>
      <input
        aria-label="Position de lecture"
        type="range"
        min="0"
        max={Math.max($duration, 0)}
        step="0.1"
        value={Math.min($position, $duration)}
        oninput={handleSeekInput}
        disabled={!$duration || $isConverting}
      />
      <label>
        Volume
        <input
          aria-label="Volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={$volume}
          oninput={handleVolumeInput}
        />
      </label>
      <button onclick={toggleMute}>{#if $isMuted}Rétablir{:else}Muet{/if}</button>
      <label>
        Vitesse
        <select value={$playbackRate} onchange={handleSpeedChange}>
          <option value="0.25">0,25×</option>
          <option value="0.5">0,5×</option>
          <option value="1">1×</option>
          <option value="1.5">1,5×</option>
          <option value="2">2×</option>
        </select>
      </label>
    </div>

    {#if $isConverting}
      <p class="notice" role="status">Préparation du média…</p>
    {/if}
    {#if $playbackNotice}
      <p class="notice" role="status">{$playbackNotice}</p>
    {/if}
    {#if $playbackError}
      <p class="error" role="alert">{$playbackError}</p>
    {/if}
  {/if}

  {#if $activePlaylist && $activePlaylist.items.length > 0}
    <section class="playlist">
      <header>
        <h2>Playlist — {$activePlaylist.items.length}</h2>
        <button class="ghost" onclick={clearPlaylist}>Vider</button>
      </header>
      <ul>
        {#each $activePlaylist.items as item (item.id)}
          <li>
            <button class="item" onclick={() => handlePlayItem(item)} disabled={$isConverting}>
              <span class="name">{item.name}</span>
              <span class="meta">
                {item.kind === "video" ? "vidéo" : "audio"} · {formatFileSize(item.size)}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }

  button {
    padding: 0.6rem 1.2rem;
    font-size: 1rem;
    cursor: pointer;
  }

  button:disabled {
    cursor: wait;
  }

  video {
    width: 100%;
    margin-top: 1rem;
    background: black;
    border-radius: 8px;
  }

  audio {
    width: 100%;
    margin-top: 1rem;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .controls label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.9rem;
  }

  .media-info {
    overflow-wrap: anywhere;
  }

  .playlist {
    margin-top: 2rem;
    text-align: left;
  }

  .playlist header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .playlist ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .item {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 6px;
    background: none;
    text-align: left;
  }

  .item:hover {
    background: #f0f0f0;
  }

  .ghost {
    padding: 0;
    border: none;
    background: none;
    color: #666;
    text-decoration: underline;
  }

  .meta {
    margin-left: 1rem;
    white-space: nowrap;
  }

  .notice {
    color: #2563eb;
  }

  .error {
    color: #e11d48;
  }
</style>
