# Roadmap — ktk-video
> ktk-video est un lecteur multimédia de bureau léger et moderne, construit avec Tauri 2, SvelteKit 2 et TypeScript, offrant lecture vidéo/audio, gestion de playlists et une interface épurée inspirée des principes GNOME.
> Règle de publication : les pushes seront effectués uniquement lorsqu'une phase est terminée.

## Phase 1 : Socle & Configuration
- [x] Initialiser la structure du projet avec les dossiers src/ (SvelteKit) et src-tauri/ (Rust)
- [ ] Installer et vérifier les dépendances Node.js, TypeScript et SvelteKit via npm install
- [ ] Configurer l'outil Rust stable et les dépendances système requises pour Tauri 2
- [ ] Mettre en place la configuration Vite et SvelteKit pour le développement rapide itératif

## Phase 2 : Backend & Moteur Métier
- [ ] Implémenter des commandes Tauri pour charger et ouvrir un fichier média individuel
- [ ] Développer la fonctionnalité de chargement de dossier et d'énumération des fichiers audio/video
- [ ] Intégrer une bibliothèque de décodage média côté Rust (ex: rodio/cpal pour l'audio, ffmpeg pour la vidéo)
- [ ] Exposer les commandes de contrôle de lecture (play, pause, stop) via l'API Tauri

## Phase 3 : Interface Utilisateur
- [ ] Créer les composants Svelte pour les contrôles de lecture (barre de progression, boutons play/pause, volume, vitesse de lecture)
- [ ] Implémenter la gestion des raccourcis clavier pour toutes les actions courantes du lecteur
- [ ] Développer le basculement thème clair/sombre en fonction des préférences du système d'exploitation
- [ ] Construire la fenêtre de lecteur principale avec disparition automatique des contrôles pendant la lecture

## Phase 4 : Fonctionnalités Avancées & Tests
- [ ] Implémenter la gestion de playlists : création, édition, réordonnancement, persistance et chargement
- [ ] Ajouter les import de fichiers et de dossiers complets vers la bibliothèque du lecteur
- [ ] Intégrer le support des sous-titres embarqués et fichiers .srt externes avec affichage synchronisé
- [ ] Écrire des tests unitaires et d'intégration pour les chemins de lecture et de contrôle, finaliser la pipeline npm run tauri build
