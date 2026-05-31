#!/bin/bash
set -e

echo "--- Customizing Paperclip Agent for Cloud Execution ---"

# Onboarding
paperclipai onboard --yes

# Configuration multi-OS : on force les chemins linux clean
cat <<EOF > $PAPERCLIP_HOME/instances/default/config.json
{
    "database": {
        "mode": "postgres",
        "connectionString": "${DATABASE_URL}"
    },
    "server": {
        "deploymentMode": "local_trusted",
        "exposure": "public",
        "host": "0.0.0.0",
        "port": 7860,
        "serveUi": true
    },
    "auth": {
        "baseUrlMode": "auto"
    },
    "llm": {
        "provider": "openai"
    },
    "storage": {
        "provider": "local_disk",
        "localDisk": {
            "baseDir": "$PAPERCLIP_HOME/instances/default/data/storage"
        }
    }
}
EOF

# Configuration LLM DeepSeek
export OPENAI_API_BASE="https://api.deepseek.com"
export OPENAI_API_KEY="${DEEPSEEK_API_KEY}"
export PAPERCLIP_AGENT_JWT_SECRET="${PAPERCLIP_AGENT_JWT_SECRET}"

# Important: On essaie de vider les "runs" fantômes qui viennent de Windows
# pour éviter que l'agent ne boucle sur des erreurs de chemins C:\
echo "Cleaning up pending jobs from other instances..."
psql "${DATABASE_URL}" -c "DELETE FROM runs WHERE status IN ('pending', 'running') AND working_directory LIKE 'C:%';" || echo "Cleanup skipped (database not ready?)"

echo "Launching Paperclip Agent..."
# Lancement
paperclipai run
