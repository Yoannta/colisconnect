---
title: OpenClaw Gateway
emoji: 🦞
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: mit
---

# 🦞 OpenClaw Gateway — ColisConnect Agent

Agent WhatsApp autonome (DeepSeek + Kimi) pour ColisConnect.

## Architecture

- **Cerveau** : DeepSeek Chat (deepseek/deepseek-chat)
- **Fallback** : Kimi Chat (kimi/moonshot-v1-8k)
- **Mode Raisonnement V4** : DeepSeek Reasoner (commande WA)
- **Canal** : WhatsApp Business
