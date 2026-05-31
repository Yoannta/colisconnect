---
title: ColisConnect OCR Server
emoji: 📦
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# ColisConnect OCR Server

Ce serveur tourne sous PaddleOCR pour verifier les reçus Alipay/WeChat et les passeports localement.

## Endpoints

- `POST /verify-receipt` : Analyse les images pour KYC et Paiement.
