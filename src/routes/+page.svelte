<script lang="ts">
  import logo from "$lib/assets/logo-kv.png";
  import ControlBar from "$lib/components/player/ControlBar.svelte";
  import ProgressBar from "$lib/components/player/ProgressBar.svelte";
  import { openMediaFile, openMediaFolder } from "$lib/api/media";
  import { attachMediaElement, detachMediaElement, loadMedia } from "$lib/player/controller";
  import { activePlaylist, addManyToPlaylist, clearPlaylist } from "$lib/stores/playlist";
  import {
    currentMedia,
    isConverting,
    playbackError,
    playbackNotice,
    playbackSource,
    playbackStage,
  } from "$lib/stores/player";
  import { formatFileSize } from "$lib/utils/formatters";
  import type { MediaItem } from "$lib/types/media";

  let isLoading = $state(false);
  let importNotice = $state<string | null>(null);
  let importError = $state<string | null>(null);
  let mediaElement = $state<HTMLMediaElement | null>(null);

  $effect(() => {
    if (mediaElement) attachMediaElement(mediaElement);
    return () => detachMediaElement();
  });

  async function runImport(action: () => Promise<void>): Promise<void> {
    isLoading = true;
    importNotice = null;
    importError = null;

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
</script>

<svelte:head>
  <title>ktk-video</title>
  <meta
    name="description"
    content="Lecteur vidéo et audio ktk-video"
  />
</svelte:head>

<main>
  <header class="app-header">
    <img class="logo" src={logo} alt="Logo ktk-video" />
    <h1>ktk-video</h1>
  </header>

  <div class="actions">
    <button onclick={handleOpenFile} disabled={isLoading || $isConverting}>
      Ouvrir un média
    </button>
    <button onclick={handleOpenFolder} disabled={isLoading || $isConverting}>
      Importer un dossier
    </button>
  </div>

  {#if importNotice}
    <p class="notice" role="status">{importNotice}</p>
  {/if}
  {#if importError}
    <p class="error" role="alert">{importError}</p>
  {/if}

  {#if $currentMedia}
    <section class="player" aria-label="Lecteur multimédia">
      <p class="media-title">
        {$currentMedia.name} — {$currentMedia.kind === "video" ? "vidéo" : "audio"}
        ({formatFileSize($currentMedia.size)})
        {#if $playbackStage === 1}(remuxé){:else if $playbackStage === 2}(converti){/if}
      </p>

      {#if $currentMedia.kind === "video"}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video bind:this={mediaElement} src={$playbackSource} autoplay playsinline></video>
      {:else}
        <audio bind:this={mediaElement} src={$playbackSource} autoplay></audio>
      {/if}

      <div class="player-controls">
        <ProgressBar />
        <ControlBar />
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
    </section>
  {:else}
    <p class="empty">Sélectionne un fichier ou un dossier pour commencer.</p>
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
            <button
              class="item"
              class:active={item.id === $currentMedia?.id}
              onclick={() => handlePlayItem(item)}
              disabled={$isConverting}
            >
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
    max-width: 920px;
    margin: 0 auto;
    padding: 1.5rem 2rem 3rem;
    text-align: center;
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .logo {
    width: 42px;
    height: 42px;
    object-fit: contain;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.6rem;
  }

  button {
    padding: 0.55rem 1.15rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background: var(--color-surface);
    font-size: 0.95rem;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  button:hover:not(:disabled) {
    background: var(--color-surface-hover);
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .player video {
    width: 100%;
    max-height: min(65vh, 720px);
    margin-top: 1rem;
    border-radius: var(--radius-sm);
    background: #000;
    object-fit: contain;
  }

  .player audio {
    width: 100%;
    margin-top: 1rem;
  }

  .player-controls {
    display: grid;
    gap: 0.4rem;
    margin-top: 0.9rem;
    padding: 0 0.4rem;
  }

  .media-title {
    margin-top: 1.5rem;
    color: var(--color-text-muted);
    font-size: 0.95rem;
    overflow-wrap: anywhere;
  }

  .empty {
    margin-top: 3rem;
    color: var(--color-text-muted);
  }

  .playlist {
    margin-top: 2.25rem;
    text-align: left;
  }

  .playlist header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .playlist h2 {
    font-size: 1.05rem;
    font-weight: 600;
  }

  .ghost {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-text-muted);
    text-decoration: underline;
  }

  .playlist ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .item {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    padding: 0.55rem 0.85rem;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    text-align: left;
  }

  .item:hover:not(:disabled) {
    background: var(--color-surface);
  }

  .item.active {
    border-color: var(--color-border);
    background: var(--color-surface);
  }

  .item.active .name {
    font-weight: 600;
  }

  .name {
    font-size: 0.95rem;
    overflow-wrap: anywhere;
  }

  .meta {
    margin-left: 1rem;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .notice {
    color: var(--color-accent);
  }

  .error {
    color: #f87171;
  }

  @media (max-width: 540px) {
    main {
      padding: 1rem 1rem 2rem;
    }

    .item {
      gap: 0.75rem;
    }
  }
</style>
