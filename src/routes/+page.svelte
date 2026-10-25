<script lang="ts">
  import { convertFileSrc } from "@tauri-apps/api/core";
  import { openMediaFile, openMediaFolder, remuxMedia, transcodeMedia } from "$lib/api/media";
  import { formatFileSize } from "$lib/utils/formatters";
  import { playerStore, setCurrentItem } from "$lib/stores/player";
  import { activePlaylist, addManyToPlaylist, clearPlaylist } from "$lib/stores/playlist";
  import type { MediaItem } from "$lib/types/media";

  let isLoading = $state(false);
  let isConverting = $state(false);
  let errorMessage = $state<string | null>(null);
  let notice = $state<string | null>(null);
  let fallbackPath = $state<string | null>(null);
  let playbackStage = $state(0);
  let playbackGeneration = 0;

  function selectMedia(item: MediaItem): void {
    playbackGeneration += 1;
    fallbackPath = null;
    playbackStage = 0;
    isConverting = false;
    errorMessage = null;
    notice = null;
    setCurrentItem(item);
  }

  async function runImport(action: () => Promise<void>): Promise<void> {
    isLoading = true;
    errorMessage = null;
    notice = null;

    try {
      await action();
    } catch (error: unknown) {
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      isLoading = false;
    }
  }

  function handleOpenFile(): Promise<void> {
    return runImport(async () => {
      const media = await openMediaFile();
      if (media) selectMedia(media);
    });
  }

  function handleOpenFolder(): Promise<void> {
    return runImport(async () => {
      const items = await openMediaFolder();
      if (items === null) return;

      if (items.length === 0) {
        notice = "Aucun média trouvé dans ce dossier.";
        return;
      }

      addManyToPlaylist(items);
      notice = `${items.length} média${items.length > 1 ? "s" : ""} ajouté${items.length > 1 ? "s" : ""} à la playlist.`;
    });
  }

  function handlePlayItem(item: MediaItem): void {
    selectMedia(item);
  }

  async function handlePlaybackError(): Promise<void> {
    const item = $playerStore.currentItem;
    if (!item || isConverting || playbackStage >= 2) return;

    const generation = playbackGeneration;
    isConverting = true;
    errorMessage = null;

    try {
      if (item.kind === "audio") {
        notice = "Format audio incompatible : transcodage en cours (le premier lancement peut télécharger FFmpeg)…";
        const convertedPath = await transcodeMedia(item.path);
        if (generation !== playbackGeneration) return;
        fallbackPath = convertedPath;
        playbackStage = 2;
        notice = "Audio converti pour la lecture.";
        return;
      }

      if (playbackStage === 0) {
        playbackStage = 1;
        notice = "Format vidéo incompatible : remuxage en cours (le premier lancement peut télécharger FFmpeg)…";
        try {
          const remuxedPath = await remuxMedia(item.path);
          if (generation !== playbackGeneration) return;
          fallbackPath = remuxedPath;
          notice = "Vidéo remuxée. Si la lecture échoue, un transcodage sera tenté.";
          return;
        } catch (remuxError: unknown) {
          if (generation !== playbackGeneration) return;
          notice = "Le remuxage a échoué ; transcodage en cours, cela peut prendre plusieurs minutes…";
          try {
            const transcodedPath = await transcodeMedia(item.path);
            if (generation !== playbackGeneration) return;
            fallbackPath = transcodedPath;
            playbackStage = 2;
            notice = "Vidéo transcodée pour la lecture.";
          } catch (transcodeError: unknown) {
            const remuxMessage = remuxError instanceof Error ? remuxError.message : String(remuxError);
            const transcodeMessage =
              transcodeError instanceof Error ? transcodeError.message : String(transcodeError);
            throw new Error(
              `Le remuxage a échoué (${remuxMessage}) et le transcodage aussi (${transcodeMessage}).`,
            );
          }
        }
        return;
      }

      notice = "La vidéo remuxée reste incompatible : transcodage en cours, cela peut prendre plusieurs minutes…";
      const transcodedPath = await transcodeMedia(item.path);
      if (generation !== playbackGeneration) return;
      fallbackPath = transcodedPath;
      playbackStage = 2;
      notice = "Vidéo transcodée pour la lecture.";
    } catch (error: unknown) {
      if (generation === playbackGeneration) {
        errorMessage = error instanceof Error ? error.message : String(error);
        notice = null;
      }
    } finally {
      if (generation === playbackGeneration) isConverting = false;
    }
  }
</script>

<svelte:head>
  <title>ktk-video</title>
</svelte:head>

<main>
  <h1>ktk-video</h1>

  <div class="actions">
    <button onclick={handleOpenFile} disabled={isLoading || isConverting}>Ouvrir un média</button>
    <button onclick={handleOpenFolder} disabled={isLoading || isConverting}>Importer un dossier</button>
  </div>

  {#if notice}
    <p class="notice" role="status">{notice}</p>
  {/if}

  {#if errorMessage}
    <p class="error" role="alert">{errorMessage}</p>
  {/if}

  {#if $playerStore.currentItem}
    {@const currentItem = $playerStore.currentItem}
    {@const playbackPath = fallbackPath ?? currentItem.path}
    <p class="media-info">
      {currentItem.name} — {currentItem.kind === "video" ? "vidéo" : "audio"}
      ({formatFileSize(currentItem.size)})
      {#if playbackStage === 1} — version remuxée{:else if playbackStage === 2} — version convertie{/if}
    </p>

    {#if currentItem.kind === "video"}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        src={convertFileSrc(playbackPath)}
        controls
        autoplay
        playsinline
        onerror={handlePlaybackError}
      ></video>
    {:else}
      <audio
        src={convertFileSrc(playbackPath)}
        controls
        autoplay
        onerror={handlePlaybackError}
      ></audio>
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
            <button class="item" onclick={() => handlePlayItem(item)} disabled={isConverting}>
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
