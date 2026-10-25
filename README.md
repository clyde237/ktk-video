<div align="center">

# 🎬 ktk-video

**Un lecteur vidéo et audio léger, moderne et sans distraction.**

Construit avec Tauri, SvelteKit et TypeScript.

</div>

---

## 📖 À propos

**ktk-video** est un lecteur multimédia de bureau pensé pour la simplicité : on ouvre un fichier (ou un dossier entier), on appuie sur play, et c'est tout. Les contrôles s'effacent quand vous regardez, et reviennent dès que vous en avez besoin.

L'interface s'inspire des principes de design des applications GNOME — en particulier [Showtime](https://apps.gnome.org/fr/Showtime/) — pour offrir une expérience **épurée, discrète et moderne**, sans compromis sur les fonctionnalités.

## ✨ Fonctionnalités

### Lecture
- 🎥 **Lecture vidéo et audio** avec prise en charge de la majorité des formats courants (MP4, MKV, WebM, AVI, MOV, MP3, FLAC, OGG, WAV, M4A…)
- ▶️ Contrôles classiques : lecture/pause, avance/retour rapide, barre de progression, réglage du volume et muet
- ⏩ Vitesse de lecture réglable (0,25× → 2×)
- 🔊 Choix de la piste audio quand le fichier en contient plusieurs
- 📜 Sous-titres embarqués et fichiers `.srt` externes
- 🖥️ Mode plein écran, miniature vidéo et capture d'écran
- ⌨️ Raccourcis clavier pour toutes les actions courantes

### Playlists et bibliothèque
- 🗂️ **Import de fichiers** audio ou vidéo individuels
- 📁 **Import de dossiers** complets — vidéos, audios, ou les deux
- 📃 **Création et gestion de playlists** : réorganiser, supprimer, enregistrer et recharger
- 🔁 Modes de lecture : aléatoire, répéter un élément, répéter la playlist

### Interface
- 🎨 Design épuré et moderne, contrôles qui s'estompent pendant la lecture
- 🌗 Thème clair / sombre suivant le système
- 🔍 Miniatures et informations sur les médias (durée, format, taille)

## 🛠️ Stack technique

| Technologie | Rôle |
|---|---|
| [Tauri 2](https://tauri.app/) | Applications de bureau multi-plateformes, backend Rust |
| [SvelteKit 2](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) | Interface utilisateur |
| [TypeScript](https://www.typescriptlang.org/) | Typage statique côté frontend |
| [Vite 8](https://vite.dev/) | Build et serveur de développement |

## 🚀 Démarrage

### Prérequis

- [Node.js](https://nodejs.org/) ≥ 18
- [Rust](https://www.rust-lang.org/) (toolchain stable)
- Dépendances système de Tauri : voir la [documentation officielle](https://tauri.app/start/prerequisites/)

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/clyde237/ktk-video.git
cd ktk-video

# Installer les dépendances
npm install

# Lancer l'application en mode développement
npm run tauri dev
```

### Autres commandes

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement web uniquement |
| `npm run tauri dev` | Application de bureau en mode dev |
| `npm run tauri build` | Compiler l'application pour la production |
| `npm run check` | Vérification TypeScript et Svelte |

## 📁 Structure du projet

```
ktk-video/
├── src/              # Interface SvelteKit (pages, composants, stores)
├── src-tauri/        # Backend Rust Tauri (commandes, fenêtre, config)
├── static/           # Assets statiques
├── svelte.config.js  # Configuration SvelteKit
└── vite.config.js    # Configuration Vite
```

## 🤝 Contribuer

Les contributions sont les bienvenues ! Forkez le projet, créez une branche, et ouvrez une pull request.

## 📄 Licence

Distribué sous la licence [MIT](LICENSE).