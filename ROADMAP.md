# Roadmap — ktk-video
> ktk-video est un lecteur multimédia de bureau léger et moderne, construit avec Tauri 2, SvelteKit 2 et TypeScript, offrant lecture vidéo/audio, gestion de playlists et une interface épurée inspirée des principes GNOME.

## Phase 1 : Socle & Configuration
- [x] Initialiser la structure du projet avec les dossiers src/ (SvelteKit) et src-tauri/ (Rust)
- [x] Installer et vérifier les dépendances Node.js, TypeScript et SvelteKit via npm install
- [x] Configurer l'outil Rust stable et les dépendances système requises pour Tauri 2
- [x] Mettre en place la configuration Vite et SvelteKit pour le développement rapide itératif

## Phase 2 : Backend & Moteur Métier
- [x] Implémenter des commandes Tauri pour charger et ouvrir un fichier média individuel
- [x] Développer la fonctionnalité de chargement de dossier et d'énumération des fichiers audio/video
- [x] Intégrer une bibliothèque de décodage média côté Rust (ex: rodio/cpal pour l'audio, ffmpeg pour la vidéo)
- [x] Exposer les commandes de contrôle de lecture (play, pause, stop) via l'API Tauri

## Phase 3 : Interface Utilisateur
- [x] Créer les composants Svelte pour les contrôles de lecture (barre de progression, boutons play/pause, volume, vitesse de lecture)
- [x] Implémenter la gestion des raccourcis clavier pour toutes les actions courantes du lecteur
- [x] Développer le basculement thème clair/sombre en fonction des préférences du système d'exploitation
- [x] Construire la fenêtre de lecteur principale avec disparition automatique des contrôles pendant la lecture

## Phase 4 : Fonctionnalités Avancées & Tests
- [ ] Implémenter la gestion de playlists : création, édition, réordonnancement, persistance et chargement
- [ ] Ajouter les import de fichiers et de dossiers complets vers la bibliothèque du lecteur
- [ ] Intégrer le support des sous-titres embarqués et fichiers .srt externes avec affichage synchronisé
- [ ] Écrire des tests unitaires et d'intégration pour les chemins de lecture et de contrôle, finaliser la pipeline npm run tauri build multi-os (linux, windows) - (deb, appimage, exe, msi)
