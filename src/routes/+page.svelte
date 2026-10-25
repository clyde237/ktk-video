<script lang="ts">
  import logo from "$lib/assets/logo-kv.png";
  import PlayerStage from "$lib/components/player/PlayerStage.svelte";
  import { openMediaFile, openMediaFolder } from "$lib/api/media";
  import { loadMedia } from "$lib/player/controller";
  import { installKeyboardShortcuts } from "$lib/player/shortcuts";
  import { activePlaylist, addManyToPlaylist, clearPlaylist } from "$lib/stores/playlist";
  import { currentMedia, isConverting, playbackStage } from "$lib/stores/player";
  import { formatFileSize } from "$lib/utils/formatters";
  import type { MediaItem } from "$lib/types/media";

  let isLoading = $state(false);
  let importNotice = $state<string | null>(null);
  let importError = $state<string | null>(null);

  $effect(() => installKeyboardShortcuts());

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

      <PlayerStage />

      <p class="kbd-hint">
        <kbd>Espace</kbd>/<kbd>K</kbd> lecture · <kbd>←</kbd><kbd>→</kbd> ±10 s ·
        <kbd>↑</kbd><kbd>↓</kbd> volume · <kbd>M</kbd> muet · <kbd>S</kbd> stop ·
        <kbd>N</kbd>/<kbd>P</kbd> suivant/précédent · <kbd>0</kbd>–<kbd>9</kbd> saut ·
        <kbd>F</kbd> plein écran · <kbd>Échap</kbd> quitter
      </p>
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

  .media-title {
    margin-top: 1.5rem;
    color: var(--color-text-muted);
    font-size: 0.95rem;
    overflow-wrap: anywhere;
  }

  .kbd-hint {
    margin: 0.75rem 0 0;
    color: var(--color-text-muted);
    font-size: 0.8rem;
    line-height: 2;
  }

  .kbd-hint kbd {
    display: inline-block;
    min-width: 1.4em;
    padding: 0.1em 0.35em;
    border: 1px solid var(--color-border);
    border-bottom-width: 2px;
    border-radius: 5px;
    background: var(--color-surface);
    font-family: inherit;
    font-size: 0.95em;
    text-align: center;
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
    color: var(--color-danger);
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
