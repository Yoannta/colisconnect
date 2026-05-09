import time
import json
import logging
import re
import torch
import gc
from typing import List, Dict, Any
from transformers import AutoModelForCausalLM, AutoTokenizer
from openai import OpenAI
from huggingface_hub import login
from google.colab import userdata

# ==========================================
# CONFIGURATION & MEMORY CLEANUP
# ==========================================
DEEPSEEK_API_KEY = "sk-4a946f8437a84e29b39f39661398652f"
SIMULATION_DURATION_HOURS = 2

# Nettoyage préventif de la VRAM
if torch.cuda.is_available():
    torch.cuda.empty_cache()
gc.collect()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)

# ==========================================
# CLIENTS IA (BFLOAT16 NATIVE)
# ==========================================

class DeepSeekClient:
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com") if api_key.startswith("sk-") else None

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        if not self.client: return "{}"
        try:
            res = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                max_tokens=600,
                temperature=0.8,
                frequency_penalty=0.6,
                presence_penalty=0.6
            )
            return res.choices[0].message.content
        except: return "{}"

class LocalModelClient:
    def __init__(self, model_id: str):
        if not torch.cuda.is_available():
            raise RuntimeError("ERREUR : GPU non détecté. Allez dans Exécution > Modifier le type d'exécution > T4 GPU.")
            
        logger.info(f"Chargement NATIVE bfloat16 de {model_id}...")
        try:
            login(token=userdata.get('HF_TOKEN'))
        except: pass

        self.tokenizer = AutoTokenizer.from_pretrained(model_id)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16,
            device_map="auto"
        )

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        prompt = f"<|system|>\n{system_prompt}\n<|user|>\n{user_prompt}\n<|assistant|>"
        inputs = self.tokenizer(prompt, return_tensors="pt").to("cuda")
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=250,
                temperature=0.7,
                repetition_penalty=1.15,
                do_sample=True
            )
        return self.tokenizer.decode(outputs[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)

# ==========================================
# AGENTS & GAME MASTER
# ==========================================

class Agent:
    def __init__(self, name, role, personality, client):
        self.name, self.role, self.personality, self.client = name, role, personality, client
        self.private_memory = []

    def act(self, world_context):
        mem_summary = "\n".join(self.private_memory[-5:])
        sys = f"Tu es {self.name}, {self.role}. {self.personality}. RÈGLE: Réponds UNIQUEMENT en JSON valide: {{ \"action\": \"...\", \"details\": \"...\" }}"
        usr = f"CONTEXTE PUBLIC: {world_context}\nTES SOUVENIRS PRIVÉS: {mem_summary}"
        res = self.client.generate(sys, usr)
        match = re.search(r'\{.*?\}', res, re.DOTALL)
        if match:
            try:
                act_obj = json.loads(match.group(0))
                self.private_memory.append(f"Action: {act_obj.get('action')}")
                return act_obj
            except: return {"action": "wait"}
        return {"action": "wait"}

class GameMaster:
    def __init__(self, client):
        self.client = client
        self.rules = "Commission 10%. Modération: Bloque WhatsApp/Tel. KYC: CNI requise pour publier. Status: Discussion -> Attente -> Payé."

    def resolve(self, actions, turn):
        sys = f"Tu es le Game Master de ColisConnect. RÈGLES: {self.rules}. Analyse les actions et génère un JSON: {{ \"public_broadcast\": \"...\", \"private_messages\": {{ \"NomAgent\": \"...\" }}, \"system_notes\": \"...\" }}"
        usr = f"Tour {turn}: {json.dumps(actions)}"
        res = self.client.generate(sys, usr)
        match = re.search(r'\{.*?\}', res, re.DOTALL)
        if match:
            try: return json.loads(match.group(0))
            except: pass
        return {"public_broadcast": "Le système traite les données..."}

# ==========================================
# SIMULATION ENGINE
# ==========================================

def start_sim():
    if not torch.cuda.is_available():
        print("❌ ERREUR : Aucun GPU détecté. Changez le type d'exécution en 'T4 GPU'.")
        return

    print("🚀 INITIALISATION MIROFISH V2 - BFLOAT16 NATIVE")
    ds_client = DeepSeekClient(DEEPSEEK_API_KEY)

    phi_client = LocalModelClient("microsoft/Phi-3.5-mini-instruct")
    qwen_client = LocalModelClient("Qwen/Qwen2.5-3B-Instruct")

    agents = [
        Agent("Amadou", "Voyageur Paris-Dakar", "Pragmatique, cherche clients. Doit fournir CNI.", phi_client),
        Agent("Moussa", "Client Dakar", "Pressé, méfiant. Veut envoyer un PC.", qwen_client),
        Agent("Sniper", "Fraudeur / Hacker social", "Malicieux. Tente de contourner les 10% et de donner son WhatsApp.", ds_client)
    ]

    gm = GameMaster(ds_client)
    world = "La plateforme ColisConnect vient d'ouvrir. Aucun message pour l'instant."

    end_time = time.time() + (SIMULATION_DURATION_HOURS * 3600)
    turn = 1

    while time.time() < end_time:
        print(f"\n--- 🕒 TOUR {turn} | Temps restant: {int((end_time - time.time())/60)}min ---")

        current_actions = {}
        for a in agents:
            act = a.act(world)
            current_actions[a.name] = act
            print(f"🤖 {a.name} ({a.role}): {act.get('action')} -> {act.get('details', '')}")

        print("⚙️ Résolution Game Master...")
        result = gm.resolve(current_actions, turn)

        world = result.get("public_broadcast", "...")
        print(f"📢 GM (Public): {world}")

        privates = result.get("private_messages", {})
        for agent_name, secret_msg in privates.items():
            for a in agents:
                if a.name == agent_name:
                    a.private_memory.append(f"SYSTÈME: {secret_msg}")
                    print(f"📧 MESSAGE PRIVÉ à {agent_name}: {secret_msg}")

        turn += 1
        time.sleep(8)

if __name__ == "__main__":
    start_sim()
    ====================================================
    apres plsuieur essai ca enfin marcher voici le code qui fonctionne @beautifulMention .
     ta mission maintenent je ne veut pas dans chaque conversation reeaaxpliquer tous le procerderr fait un skill expliquand de a a z comment faire de sorte a creer une simutilaition
     pour un projet . fait dans un format genre : detaille du projet , essuite , contexte de mirofish et leur techinique , creation du meme proceder avec 3 a 4 agent avec les specfication que je t'ai dite
     (pas de partage d;istorique , personnaliter propre). en gros skill qui aide a faire ca tu vois ne code rien dit moi si tu a compris 
     ===================================================