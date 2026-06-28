# Voxta — Jeu de rythme web

Voxta est un jeu de rythme jouable dans le navigateur, inspiré d'osu!mania et de Friday Night Funkin'. Les joueurs appuient sur les touches **D F J K** au rythme de la musique, importent leurs propres maps, et s'affrontent dans un classement mondial.

---

## Fonctionnalités

- **Inscription / Connexion** sécurisées (JWT + bcrypt)
- **Bibliothèque de maps** avec meilleur score et nombre de parties
- **Moteur de jeu** 4 touches — notes tombantes, hold notes, jugements Perfect / Good / Miss
- **Import de maps** au format JSON (compatible Friday Night Funkin')
- **Création de maps** via CodenameEngine (éditeur externe intégré)
- **Classement global** et par map
- **Panel admin** : approbation des maps, désactivation des comptes
- **Ban en temps réel** via WebSocket (Socket.IO) : le joueur est déconnecté instantanément si son compte est désactivé

---

## Stack technique

### Frontend

| Outil                   | Rôle                     | Pourquoi ce choix                                                                                             |
| ----------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **React 19**            | Interface utilisateur    | Architecture en composants réutilisables, idéal pour une SPA sans rechargement de page (critique pour un jeu) |
| **Vite**                | Bundler / serveur de dev | Démarrage instantané, Hot Module Replacement, proxy `/api` intégré                                            |
| **React Router DOM v7** | Routing                  | Navigation entre pages sans rechargement, routes protégées                                                    |
| **axios**               | Requêtes HTTP            | Syntaxe plus claire que `fetch`, gestion d'erreurs centralisée                                                |
| **pixi.js v7**          | Moteur graphique         | Rendu WebGL 60 fps pour les notes tombantes — impossible avec du CSS simple                                   |
| **tone.js v15**         | Audio                    | Horloge de transport précise à la milliseconde, synchronise la musique et les notes                           |

### Backend

| Outil                  | Rôle                      | Pourquoi ce choix                                                                               |
| ---------------------- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| **Node.js + Express**  | Serveur HTTP / API REST   | Léger, rapide à mettre en place, même langage que le frontend (JavaScript)                      |
| **Socket.IO**          | WebSocket                 | Communication temps réel pour notifier les bans sans que l'utilisateur ait besoin de rafraîchir |
| **jsonwebtoken (JWT)** | Authentification          | Token sans état côté serveur, envoyé dans chaque requête via le header `Authorization`          |
| **bcrypt**             | Hachage des mots de passe | Hash sécurisé avec sel automatique — les mots de passe ne sont jamais stockés en clair          |
| **pg**                 | Client PostgreSQL         | Requêtes SQL paramétrées (évite les injections SQL), pooling de connexions                      |
| **winston**            | Logs                      | Logging structuré pour le débogage en production                                                |
| **dotenv**             | Variables d'environnement | Séparation config / code, secrets hors du dépôt Git                                             |

### Base de données

| Outil             | Rôle                          | Pourquoi ce choix                                                                                        |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| **PostgreSQL 17** | Base de données relationnelle | Gère les JOINs complexes (users → maps → scores), support natif du JSON (`JSONB`) pour stocker les notes |

### Infrastructure

| Outil                       | Rôle             | Pourquoi ce choix                                                                                         |
| --------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| **Docker + docker-compose** | Conteneurisation | Lance toute la stack (DB + backend + frontend) en une seule commande, évite le "ça marche sur ma machine" |
| **pgAdmin**                 | Interface BDD    | Exploration visuelle de la base de données pendant le développement                                       |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   NAVIGATEUR                         │
│                                                     │
│  React SPA  (/login /register /dashboard            │
│             /maps /play/:id /admin)                 │
│                                                     │
│  axios  ──── /api/* ──────────────────────────┐     │
│  Socket.IO ─ /socket.io ──────────────────┐   │     │
└───────────────────────────────────────────┼───┼─────┘
                                            │   │
                         ┌──────────────────┘   │
                         │  Vite proxy (dev)     │
                         │  / Nginx (prod)       │
                         └──────────────────────┘
                                    │
                     ┌──────────────▼──────────────┐
                     │      EXPRESS (Node.js)        │
                     │                              │
                     │  POST /api/auth/register     │
                     │  POST /api/auth/login        │
                     │  GET  /api/maps              │
                     │  POST /api/maps/import       │
                     │  POST /api/maps/launch-engine│
                     │  POST /api/scores            │
                     │  GET  /api/scores/leaderboard│
                     │  GET/PATCH /api/admin/*      │
                     │                              │
                     │  [auth middleware → JWT]     │
                     │  [Socket.IO → ban temps réel]│
                     └──────────────┬───────────────┘
                                    │
                     ┌──────────────▼───────────────┐
                     │       POSTGRESQL              │
                     │                              │
                     │  users  │  maps  │  scores   │
                     └──────────────────────────────┘
```

---

## Base de données

### Table `users`

| Colonne      | Type                | Description                   |
| ------------ | ------------------- | ----------------------------- |
| `id`         | SERIAL PK           | Identifiant unique            |
| `username`   | VARCHAR(50) UNIQUE  | Pseudo                        |
| `email`      | VARCHAR(255) UNIQUE | Email                         |
| `password`   | VARCHAR(255)        | Mot de passe haché (bcrypt)   |
| `role`       | VARCHAR(20)         | `USER` / `ADMIN` / `DISABLED` |
| `created_at` | TIMESTAMPTZ         | Date d'inscription            |

### Table `maps`

| Colonne      | Type         | Description                             |
| ------------ | ------------ | --------------------------------------- |
| `id`         | SERIAL PK    | Identifiant unique                      |
| `title`      | VARCHAR(120) | Titre de la map                         |
| `bpm`        | INTEGER      | Tempo                                   |
| `author_id`  | FK → users   | Créateur                                |
| `notes`      | JSONB        | Tableau de notes `[{lane, time, sLen}]` |
| `audio_src`  | TEXT         | Chemin ou base64 de l'audio             |
| `key_count`  | INTEGER      | Nombre de touches (toujours 4)          |
| `note_count` | INTEGER      | Nombre de notes                         |
| `status`     | VARCHAR      | `PENDING` / `APPROVED` / `REJECTED`     |

### Table `scores`

| Colonne     | Type        | Description        |
| ----------- | ----------- | ------------------ |
| `id`        | SERIAL PK   | Identifiant unique |
| `user_id`   | FK → users  | Joueur             |
| `map_id`    | FK → maps   | Map jouée          |
| `score`     | INTEGER     | Score total        |
| `perfects`  | INTEGER     | Nombre de Perfect  |
| `goods`     | INTEGER     | Nombre de Good     |
| `misses`    | INTEGER     | Nombre de Miss     |
| `played_at` | TIMESTAMPTZ | Date de la partie  |

---

## Installation et lancement

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (pour `engine-launcher.js` uniquement)

### Lancer le projet

```bash
# Cloner le dépôt
git clone <url-du-repo>
cd voxta

# Copier et configurer les variables d'environnement
cp .env.example .env
# (éditer .env si besoin)

# Lancer toute la stack
docker compose up --build
```

| Service     | URL                   |
| ----------- | --------------------- |
| Frontend    | http://localhost:5173 |
| Backend API | http://localhost:5001 |
| pgAdmin     | http://localhost:5050 |

### Développement local (sans Docker)

```bash
# Backend
cd backend
npm install
node scripts/setup-db.js   # initialise la BDD
npm start                  # port 5001

# Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev                # port 5173
```

---

## Éditeur de maps (CodenameEngine)

Voxta intègre un bouton **"Créer un fichier"** sur la page d'import qui lance **CodenameEngine**, un éditeur de maps externe.

### Pourquoi un lanceur séparé ?

Le backend tourne dans Docker (Linux). Or `CodenameEngine.exe` est un exécutable Windows qui ne peut pas s'exécuter dans un container Linux. La solution mise en place est un petit serveur intermédiaire `engine-launcher.js` qui tourne sur la machine hôte Windows et reçoit les requêtes du container via `host.docker.internal`.

```
Navigateur → Backend Docker → POST host.docker.internal:9876/launch → engine-launcher.js → CodenameEngine.exe
```

### Lancer le lanceur

```bash
# À la racine du projet, sur la machine Windows hôte
node engine-launcher.js
```

Le serveur écoute sur le port **9876**. Il doit rester actif tant que vous souhaitez utiliser le bouton "Créer un fichier" depuis l'interface.

---

## Routes API

### Authentification — `/api/auth`

| Méthode | Route                | Auth | Description                 |
| ------- | -------------------- | ---- | --------------------------- |
| POST    | `/api/auth/register` | ❌   | Créer un compte             |
| POST    | `/api/auth/login`    | ❌   | Se connecter, reçoit un JWT |

### Maps — `/api/maps`

| Méthode | Route                     | Auth | Description                                  |
| ------- | ------------------------- | ---- | -------------------------------------------- |
| GET     | `/api/maps`               | ❌   | Lister les maps approuvées                   |
| GET     | `/api/maps/:id`           | ❌   | Détail d'une map                             |
| POST    | `/api/maps`               | ✅   | Créer une map manuellement                   |
| POST    | `/api/maps/import`        | ✅   | Importer une map JSON (format FNF)           |
| POST    | `/api/maps/launch-engine` | ✅   | Lancer CodenameEngine via engine-launcher.js |

### Scores — `/api/scores`

| Méthode | Route                     | Auth | Description                   |
| ------- | ------------------------- | ---- | ----------------------------- |
| POST    | `/api/scores`             | ✅   | Enregistrer un score          |
| GET     | `/api/scores/leaderboard` | ❌   | Classement global (top 10)    |
| GET     | `/api/scores/me`          | ✅   | Mes scores (meilleur par map) |
| GET     | `/api/scores/me/map/:id`  | ✅   | Mon historique sur une map    |
| GET     | `/api/scores/map/:id`     | ❌   | Classement d'une map          |

### Administration — `/api/admin` (ADMIN seulement)

| Méthode | Route                          | Auth     | Description                    |
| ------- | ------------------------------ | -------- | ------------------------------ |
| GET     | `/api/admin/maps`              | 🔒 ADMIN | Toutes les maps (tous statuts) |
| PATCH   | `/api/admin/maps/:id/status`   | 🔒 ADMIN | Approuver / refuser une map    |
| GET     | `/api/admin/users`             | 🔒 ADMIN | Tous les utilisateurs          |
| PATCH   | `/api/admin/users/:id/disable` | 🔒 ADMIN | Désactiver un utilisateur      |

---

## Format de map JSON (import)

Voxta accepte le format de charts de **Friday Night Funkin'** :

```json
{
  "strumLines": [
    {
      "visible": true,
      "keyCount": 4,
      "notes": [
        { "id": 0, "time": 1200, "sLen": 0 },
        { "id": 2, "time": 1800, "sLen": 300 }
      ]
    }
  ]
}
```

- `id` : colonne (0 à 3 = touches D, F, J, K)
- `time` : temps en millisecondes depuis le début
- `sLen` : durée de la hold note en millisecondes (0 = note simple)

---

## Structure du projet

```
voxta/
├── .env                    # Variables d'environnement (non versionné)
├── docker-compose.yml      # Orchestration des conteneurs
├── engine-launcher.js      # Lanceur local pour CodenameEngine.exe (hôte Windows)
├── Codename.Engine-Windows/
│   └── CodenameEngine.exe  # Éditeur de maps externe
├── backend/
│   ├── server.js           # Point d'entrée, Express + Socket.IO
│   ├── db.js               # Pool de connexions PostgreSQL
│   ├── config/env.js       # Chargement du .env
│   ├── middlewares/
│   │   └── auth.js         # Vérification JWT
│   ├── routes/
│   │   ├── auth.js         # Inscription / connexion
│   │   ├── maps.js         # CRUD maps + import + launch-engine
│   │   ├── scores.js       # Scores + classements
│   │   └── admin.js        # Administration
│   ├── services/
│   │   └── chartImporter.js # Parsing et validation du format FNF
│   ├── database/
│   │   └── init.sql        # Schéma PostgreSQL
│   └── tests/              # Tests mocha/supertest
└── frontend/
    ├── vite.config.js      # Config Vite + proxy API
    ├── src/
    │   ├── App.jsx         # Router principal
    │   ├── main.jsx        # Point d'entrée React
    │   ├── index.css       # Styles globaux (thème osu! pink)
    │   ├── components/
    │   │   ├── ProtectedRoute.jsx  # Redirige si non connecté
    │   │   └── BanListener.jsx     # WebSocket ban temps réel
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── Dashboard.jsx       # Scores perso + classements
    │       ├── Maps.jsx            # Bibliothèque de maps
    │       ├── Game.jsx            # Moteur de jeu (pixi.js + tone.js)
    │       ├── ImportMap.jsx       # Import de chart JSON + bouton CodenameEngine
    │       └── Admin.jsx           # Panel d'administration
    └── public/
        └── song.mp3                # Musique par défaut
```

---

## Problèmes rencontrés et solutions

### Synchronisation audio / notes

La difficulté principale du moteur de jeu était de faire coïncider les notes avec la musique. `setTimeout` n'est pas assez précis pour ça. Solution : utiliser l'horloge de transport de **tone.js** (`Tone.Transport.seconds`) comme référence unique pour la position dans la musique et le calcul de position des notes.

### Authentification Socket.IO

Le middleware d'authentification Express ne s'applique pas automatiquement aux WebSockets. Il a fallu écrire un middleware Socket.IO séparé qui vérifie le token JWT passé dans `socket.handshake.auth.token`.

### Import de maps multi-format

Les charts JSON peuvent venir de différents éditeurs avec des structures légèrement différentes (clé `sLen` vs `slen`, temps en ms vs en secondes…). Le service `chartImporter.js` normalise tout ça avant d'insérer en base.

### Réseau Docker

En local, le backend se connecte à `localhost:5433`. Dans Docker, la BDD s'appelle `postgres` (nom du service) sur le port `5432`. La variable `DB_HOST` dans le `docker-compose.yml` écrase celle du `.env` pour régler ça.

### Lancement de CodenameEngine depuis Docker

Le backend tourne dans un container Linux — impossible d'y exécuter un `.exe` Windows directement. Solution : `engine-launcher.js`, un serveur Node.js léger qui tourne sur la machine hôte Windows (port 9876) et reçoit les requêtes du container via `host.docker.internal`. Le backend essaie successivement `host.docker.internal:9876` puis `172.17.0.1:9876` comme fallback.

---

## Sécurité

- Les mots de passe sont hachés avec **bcrypt** (facteur de coût 10) — jamais stockés en clair
- Les tokens JWT expirent après **24 heures**
- Les requêtes SQL utilisent des **paramètres préparés** (`$1, $2`) — protection contre les injections SQL
- Le **`.env` est dans `.gitignore`** — les secrets ne sont pas publiés sur Git
- Les routes admin vérifient le rôle `ADMIN` côté serveur (double vérification)

---

## Licence

MIT — voir [LICENSE](LICENSE)
