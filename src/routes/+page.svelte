<script lang="ts">
  import { convertFileSrc } from "@tauri-apps/api/core";
  import { openMediaFile } from "$lib/api/media";
  import { formatFileSize } from "$lib/utils/formatters";
  import { playerStore, setCurrentItem } from "$lib/stores/player";

  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);

  async function handleOpenFile(): Promise<void> {
    isLoading = true;
    errorMessage = null;

    try {
      const media = await openMediaFile();
      if (media) setCurrentItem(media);
    } catch (error: unknown) {
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      isLoading = false;
    }
  }

  function handlePlaybackError(): void {
    errorMessage = "Ce format ou ce codec n'est pas pris en charge par la webview.";
  }
</script>

<svelte:head>
  <title>ktk-video</title>
</svelte:head>

<main>
  <h1>ktk-video</h1>

  <button onclick={handleOpenFile} disabled={isLoading}>
    {isLoading ? "Ouverture…" : "Ouvrir un média"}
  </button>

  {#if errorMessage}
    <p class="error" role="alert">{errorMessage}</p>
  {/if}

  {#if $playerStore.currentItem}
    {@const currentItem = $playerStore.currentItem}
    <p class="media-info">
      {currentItem.name} — {currentItem.kind === "video" ? "vidéo" : "audio"}
      ({formatFileSize(currentItem.size)})
    </p>

    {#if currentItem.kind === "video"}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        src={convertFileSrc(currentItem.path)}
        controls
        autoplay
        playsinline
        onerror={handlePlaybackError}
      ></video>
    {:else}
      <audio
        src={convertFileSrc(currentItem.path)}
        controls
        autoplay
        onerror={handlePlaybackError}
      ></audio>
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
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

  .error {
    color: #e11d48;
  }
</style>
