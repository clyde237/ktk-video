<script lang="ts">
  import {
    activePlaylist,
    activePlaylistId,
    clearPlaylist,
    createPlaylist,
    deletePlaylist,
    moveItem,
    moveItemBefore,
    playlistPersistenceError,
    playlistStoreReady,
    playlists,
    removeFromPlaylist,
    renamePlaylist,
    setActivePlaylist,
  } from "$lib/stores/playlist";
  import { currentMedia, loadMedia } from "$lib/stores/player";
  import { formatFileSize } from "$lib/utils/formatters";
  import type { MediaItem } from "$lib/types/media";

  type EditorMode = null | "create" | "rename";
  let editorMode = $state<EditorMode>(null);
  let draftName = $state("");
  let nameInput = $state<HTMLInputElement | null>(null);
  let draggedId = $state<string | null>(null);

  $effect(() => {
    if (editorMode !== null) nameInput?.focus();
  });

  function openEditor(mode: Exclude<EditorMode, null>): void {
    editorMode = mode;
    draftName = mode === "rename" ? $activePlaylist.name : "";
  }

  function submitEditor(): void {
    if (editorMode === "create") createPlaylist(draftName);
    else if (editorMode === "rename") renamePlaylist($activePlaylist.id, draftName);
    editorMode = null;
  }

  function handleSelectChange(event: Event): void {
    const target = event.currentTarget;
    if (target instanceof HTMLSelectElement) setActivePlaylist(target.value);
  }

  function handlePlayItem(item: MediaItem): void {
    loadMedia(item);
  }

  function handleDragStart(event: DragEvent, id: string): void {
    if (!event.dataTransfer) return;
    draggedId = id;
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(event: DragEvent, id: string): void {
    if (draggedId === null || draggedId === id) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  }

  function handleDrop(event: DragEvent, id: string): void {
    event.preventDefault();
    if (draggedId !== null && draggedId !== id) moveItemBefore(draggedId, id);
    draggedId = null;
  }
</script>

<section class="panel" aria-label="Playlists" aria-busy={!$playlistStoreReady}>
  <header>
    <select
      value={$activePlaylistId}
      onchange={handleSelectChange}
      aria-label="Playlist active"
      disabled={!$playlistStoreReady}
    >
      {#each $playlists as playlist (playlist.id)}
        <option value={playlist.id}>{playlist.name} ({playlist.items.length})</option>
      {/each}
    </select>

    <div class="actions">
      <button class="ghost" onclick={() => openEditor("create")} disabled={!$playlistStoreReady}>
        Nouvelle
      </button>
      <button class="ghost" onclick={() => openEditor("rename")} disabled={!$playlistStoreReady}>
        Renommer
      </button>
      <button
        class="ghost"
        onclick={() => deletePlaylist($activePlaylist.id)}
        disabled={!$playlistStoreReady}
      >
        Supprimer
      </button>
      <button
        class="ghost"
        onclick={clearPlaylist}
        disabled={!$playlistStoreReady || $activePlaylist.items.length === 0}
      >
        Vider
      </button>
    </div>
  </header>

  {#if !$playlistStoreReady}
    <p class="empty" role="status">Chargement des playlists…</p>
  {/if}

  {#if $playlistPersistenceError}
    <p class="error" role="alert">{$playlistPersistenceError}</p>
  {/if}

  {#if editorMode !== null}
    <form
      class="name-editor"
      onsubmit={(event) => {
        event.preventDefault();
        submitEditor();
      }}
    >
      <input
        bind:this={nameInput}
        bind:value={draftName}
        type="text"
        maxlength="60"
        required
        placeholder={editorMode === "create" ? "Nom de la nouvelle playlist" : "Nouveau nom"}
        aria-label="Nom de la playlist"
        onkeydown={(event) => {
          if (event.key === "Escape") editorMode = null;
        }}
      />
      <button type="submit">OK</button>
      <button type="button" class="ghost" onclick={() => (editorMode = null)}>Annuler</button>
    </form>
  {/if}

  {#if $activePlaylist.items.length === 0}
    <p class="empty">Cette playlist est vide — importe des fichiers ou un dossier.</p>
  {:else}
    <ul>
      {#each $activePlaylist.items as item, index (item.id)}
        <li
          draggable="true"
          class:dragging={item.id === draggedId}
          ondragstart={(event) => handleDragStart(event, item.id)}
          ondragover={(event) => handleDragOver(event, item.id)}
          ondrop={(event) => handleDrop(event, item.id)}
          ondragend={() => (draggedId = null)}
        >
          <button
            class="item"
            class:active={item.id === $currentMedia?.id}
            onclick={() => handlePlayItem(item)}
          >
            <span class="name">{item.name}</span>
            <span class="meta">
              {index + 1}. {item.kind === "video" ? "vidéo" : "audio"} · {formatFileSize(item.size)}
            </span>
          </button>

          <span class="reorder">
            <button
              class="icon-btn"
              aria-label={`Monter ${item.name}`}
              disabled={!$playlistStoreReady || index === 0}
              onclick={() => moveItem(item.id, -1)}
            >▲</button>
            <button
              class="icon-btn"
              aria-label={`Descendre ${item.name}`}
              disabled={!$playlistStoreReady || index === $activePlaylist.items.length - 1}
              onclick={() => moveItem(item.id, 1)}
            >▼</button>
          </span>

          <button
            class="icon-btn remove"
            aria-label={`Retirer ${item.name} de la playlist`}
            disabled={!$playlistStoreReady}
            onclick={() => removeFromPlaylist(item.id)}
          >✕</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .panel {
    margin-top: 2.25rem;
    text-align: left;
  }

  .panel header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  select {
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.95rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }

  button {
    padding: 0.4rem 0.85rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background: var(--color-surface);
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  button:hover:not(:disabled) {
    background: var(--color-surface-hover);
  }

  button:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .ghost {
    padding: 0.4rem 0.2rem;
    border: 0;
    background: none;
    color: var(--color-text-muted);
    text-decoration: underline;
  }

  .ghost:hover:not(:disabled) {
    background: none;
    color: var(--color-text);
  }

  .name-editor {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.6rem;
  }

  .name-editor input {
    flex: 1;
    max-width: 320px;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    font: inherit;
  }

  .empty {
    margin-top: 1rem;
    color: var(--color-text-muted);
    font-size: 0.92rem;
  }

  .error {
    color: var(--color-danger);
  }

  .panel ul {
    margin: 0.75rem 0 0;
    padding: 0;
    list-style: none;
  }

  .panel li {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    border-radius: var(--radius-sm);
  }

  .panel li.dragging {
    opacity: 0.45;
  }

  .item {
    display: flex;
    flex: 1;
    justify-content: space-between;
    padding: 0.55rem 0.85rem;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: none;
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
    overflow-wrap: anywhere;
  }

  .meta {
    margin-left: 1rem;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .reorder {
    display: inline-flex;
    flex-direction: column;
    gap: 0.05rem;
  }

  .icon-btn {
    padding: 0.15rem 0.45rem;
    border: 0;
    background: none;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    line-height: 1.1;
  }

  .icon-btn:hover:not(:disabled) {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .remove:hover:not(:disabled) {
    background: none;
    color: var(--color-danger);
  }
</style>
