from fastapi import FastAPI, File, UploadFile
import io, os, traceback
from PIL import Image
import numpy as np
import uvicorn

app = FastAPI()

# Moteur OCR (On le charge directement pour gagner du temps)
print("[INFO] Initialisation du moteur OCR local...")

# FIX CRITIQUE : Desactivation de OneDNN/MKLDNN qui fait crasher Windows
os.environ["FLAGS_use_mkldnn"] = "0"

try:
    from paddleocr import PaddleOCR
    # On ajoute explicitement enable_mkldnn=False
    ocr = PaddleOCR(use_textline_orientation=False, lang='ch', enable_mkldnn=False)
    print("[OK] Moteur OCR pret.")
except Exception as e:
    print(f"[ERREUR] Chargement OCR : {e}")
    ocr = None

@app.get("/")
def home():
    return {"status": "Local OCR is running"}

@app.post("/verify")
async def verify(file: UploadFile = File(...)):
    try:
        if ocr is None:
            return {"success": False, "error": "OCR Not Initialized"}

        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # [OPTMIZATION CRITIQUE] On réduit la résolution pour que ton processeur souffle
        # L'IA saura toujours lire le texte, mais le traitement CPU prendra 1 à 2 secondes au lieu de 20.
        image.thumbnail((800, 800), Image.Resampling.LANCZOS)
        
        img_array = np.array(image)

        # L'IA analyse l'image
        result = ocr.ocr(img_array)
        
        full_text = ""
        if result and len(result) > 0 and result[0] is not None:
            for line in result[0]:
                full_text += str(line[1][0]) + " "

        print(f"[LOG] Texte detecte : {full_text[:50]}...")

        full_text_lower = full_text.lower()
        # Liste massive de mots-clés de paiement
        keywords = ["成功", "success", "alipay", "wechat", "支付", "完成", "amount", "fait", "transaction", "pay", "eur", "cny", "€", "¥", "$", "transfer", "montant"]
        payment_found = any(k in full_text_lower for k in keywords)

        # Si pas de mots-clés, on valide s'il y a un chiffre qui ressemble à un prix
        import re
        amount_match = bool(re.search(r'(\d+[\.,]\d{2})', full_text))
        if amount_match:
            payment_found = True

        passport_found = any(k in full_text_lower.upper() for k in ["PASSPORT", "PASSEPORT", "P<", "<<<"])

        return {
            "success": True,
            "detected_text": full_text,
            "is_valid_receipt": payment_found,
            "is_passport": passport_found
        }
    except Exception as e:
        return {"success": False, "error": str(e), "trace": traceback.format_exc()}

if __name__ == "__main__":
    # On lance sur le port 9999 pour ne pas gêner les autres serveurs
    uvicorn.run(app, host="127.0.0.1", port=9999)
