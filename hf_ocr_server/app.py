from fastapi import FastAPI, File, UploadFile, HTTPException
from paddleocr import PaddleOCR
import io
import os
from PIL import Image
import numpy as np

app = FastAPI()

# Initialisation de PaddleOCR (Version CPU)
# lang='ch' permet de lire le chinois sur les reçus Alipay/WeChat
ocr = PaddleOCR(use_angle_cls=True, lang='ch') 

@app.get("/")
def home():
    return {"status": "ColisConnect local OCR server is online"}

@app.post("/verify-receipt")
async def verify_receipt(file: UploadFile = File(...)):
    try:
        # Lire l'image uploadée
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        img_array = np.array(image)

        # Lancer la détection de texte
        result = ocr.ocr(img_array, cls=True)
        
        full_text = ""
        # On extrait tout le texte
        if result and result[0]:
            for line in result[0]:
                full_text += line[1][0] + " "

        # On cherche des indices de reçu de paiement
        is_wechat = "微信支付" in full_text or "WeChat Pay" in full_text
        is_alipay = "支付宝" in full_text or "Alipay" in full_text
        payment_success = any(kw in full_text for kw in ["成功", "Success", "完成", "Transferred", "Amount"])

        # On cherche des indices de Passeport (Zone MRZ, Mots clés)
        is_passport = any(kw in full_text.upper() for kw in ["PASSPORT", "PASSEPORT", "P<", "<<<"])

        return {
            "success": True,
            "detected_text": full_text,
            "is_valid_receipt": payment_success and (is_wechat or is_alipay),
            "is_passport": is_passport,
            "provider": "WeChat" if is_wechat else ("Alipay" if is_alipay else "Unknown")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
