#!/bin/bash
cd "C:/Users/hp/.gemini/antigravity/scratch/colis_connect" || exit 1
git add -A
git commit -q -m "Accueil : retrait du trait (soulignement) sous les deux boutons du hero

Les boutons du hero sont des <a class=.btn> : sans text-decoration:none le
navigateur soulignait le libelle, ce qui se voyait comme un trait sous chaque
bouton. Ajout de text-decoration:none sur .btn (tous les boutons-libelles du
site) + bump des cache-busters style.css?v=20261013b sur les 9 pages."
echo "--- commit ---"
git log --oneline -1
echo "--- push ---"
git push origin main 2>&1 | tail -5
echo "--- etat ---"
git status --porcelain | head -5
echo "(vide = arbre propre)"
