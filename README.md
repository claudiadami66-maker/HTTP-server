# Serveur HTTP Node.js Natif

Serveur HTTP implémenté avec le module `http` natif de Node.js, sans aucune dépendance externe.

## Lancement

```bash
npm start          # Production
npm run dev        # Développement (rechargement automatique)
```

## Routes disponibles

| Méthode | Route        | Description                  |
|---------|-------------|------------------------------|
| GET     | /            | Page d'accueil               |
| GET     | /about.html  | Page à propos                |
| GET     | /api/status  | État du serveur              |
| GET     | /api/data    | Liste de données JSON        |
| POST    | /api/echo    | Écho du body JSON reçu       |

## Tests avec curl

```bash
curl http://localhost:3000/api/status

curl http://localhost:3000/api/data

curl -X POST http://localhost:3000/api/echo \
     -H "Content-Type: application/json" \
     -d '{"message": "hello"}'
```