# ADR-002 — LLM local via Ollama, secours par API compatible OpenAI

Date : 2026-07-03 · Statut : acceptée

## Contexte
L'esprit ATLAS (portrait, raisonnement, mémoire) repose sur un LLM appelé
par LangGraph. Contraintes : coût de développement ≈ 0, démo possible hors
connexion, et changement de modèle sans réécriture.

## Décision
En développement, inférence locale via Ollama (qwen2.5:14b-instruct par
défaut, llama3.1:8b sur machine modeste), exposée en API compatible OpenAI.
En démo/production, bascule possible vers une API hébergée (Claude ou
compatible) par simple configuration — l'interface est identique, le choix
du fournisseur est une variable d'environnement, jamais du code.

## Conséquences
+ Itérations gratuites et illimitées pendant tout le développement de E6.
+ La qualité rédactionnelle du Portrait peut être "boostée" en démo live
  en pointant vers un modèle plus puissant, sans toucher au code.
− Sur Mac, Ollama tourne mieux en natif (Metal) qu'en Docker : le service
  docker existe pour la CI/Linux, l'installation native est documentée
  pour le développement quotidien.
− Les prompts d'ATLAS devront rester robustes à deux familles de modèles.
