# Acces au jeu sur le reseau local

## 1. Lancer le backend

Dans un terminal, depuis `C:\CODA\VOXTA\backend` :

```powershell
cd C:\CODA\VOXTA\backend
npm.cmd start
```

Le backend ecoute sur `0.0.0.0:5001`, donc il peut recevoir les requetes du
reseau local.

## 2. Lancer le frontend

Dans un deuxieme terminal :

```powershell
cd C:\CODA\VOXTA\frontend
npm.cmd run dev -- --host 0.0.0.0
```

## 3. Trouver l'adresse de ton PC

Dans PowerShell :

```powershell
ipconfig
```

Cherche l'adresse IPv4 de ta carte Wi-Fi ou Ethernet. Elle ressemble souvent a :

```text
192.168.1.42
```

## 4. Adresse a donner aux autres

Les autres personnes sur le meme reseau ouvrent :

```text
http://TON_IP:5173
```

Exemple :

```text
http://192.168.1.42:5173
```

Si Vite affiche un autre port, par exemple `5174`, utilise celui qu'il affiche :

```text
http://TON_IP:5174
```

## 5. Si ca ne marche pas

Autorise Node.js dans le pare-feu Windows pour les reseaux prives.

Tu peux tester le backend depuis un autre appareil avec :

```text
http://TON_IP:5001/api/ping
```

Si cette page ne repond pas, le probleme vient du backend ou du pare-feu.
Si elle repond mais que le jeu ne charge pas, le probleme vient plutot du
frontend ou du proxy Vite.

## Note securite

PostgreSQL et pgAdmin restent limites a ton PC dans `docker-compose.yml` :

- PostgreSQL : `127.0.0.1:5433`
- pgAdmin : `127.0.0.1:5050`

Les autres personnes du reseau peuvent acceder au jeu, mais pas directement a
ta base ni a pgAdmin.
