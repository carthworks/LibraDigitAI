"""
GLM-OCR Processor for LibraDigit AI
Wraps the Ollama REST API to call the glm-ocr model.

Prerequisites:
  - Ollama installed and running on http://localhost:11434
  - Model pulled: `ollama pull glm-ocr`
"""

import base64
import os
from typing import Any, Dict

import requests

OLLAMA_BASE_URL = "http://localhost:11434"
GLM_OCR_MODEL = "glm-ocr"
REQUEST_TIMEOUT = 120  # seconds – OCR on large images can be slow


def _encode_image(image_path: str) -> str:
    """Base64-encode an image file for the Ollama multimodal API."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def check_ollama_status() -> Dict[str, bool]:
    """
    Ping Ollama and check whether the glm-ocr model is available.
    Returns: { 'available': bool, 'model_pulled': bool }
    """
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        resp.raise_for_status()
        tags = resp.json()
        models = [m.get("name", "") for m in tags.get("models", [])]
        model_pulled = any(GLM_OCR_MODEL in m for m in models)
        return {"available": True, "model_pulled": model_pulled}
    except requests.exceptions.ConnectionError:
        return {"available": False, "model_pulled": False}
    except Exception as e:
        print(f"⚠️ GLM-OCR status check error: {e}")
        return {"available": False, "model_pulled": False}


def _call_glm_ocr(image_path: str, prompt: str) -> str:
    """
    Send an image + prompt to the Ollama glm-ocr model.
    Returns the raw text response content.
    """
    image_b64 = _encode_image(image_path)

    payload = {
        "model": GLM_OCR_MODEL,
        "prompt": prompt,
        "images": [image_b64],
        "stream": False,
    }

    resp = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json=payload,
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("response", "").strip()


class GlmOcrProcessor:
    """
    OCR processor backed by GLM-OCR via Ollama.
    Provides the same interface used in server.py for the Tesseract path.
    """

    def recognize_text(self, image_path: str) -> str:
        """Standard text recognition."""
        return _call_glm_ocr(image_path, "Text Recognition:")

    def recognize_table(self, image_path: str) -> str:
        """Table-aware recognition — returns markdown table when possible."""
        return _call_glm_ocr(image_path, "Table Recognition:")

    def recognize_figure(self, image_path: str) -> str:
        """Figure / diagram description and any embedded text."""
        return _call_glm_ocr(image_path, "Figure Recognition:")

    def process_image(self, image_path: str) -> Dict[str, Any]:
        """
        Full processing pipeline for a single image.
        Returns a dict compatible with the existing OCR result shape.
        """
        try:
            print(f"🤖 GLM-OCR: processing {os.path.basename(image_path)} ...")
            text = self.recognize_text(image_path)
            print("✅ GLM-OCR: text recognition done")
            return {
                "success": True,
                "main_text": text,
                "text_length": len(text),
                "engine": "glm-ocr",
            }
        except requests.exceptions.ConnectionError:
            msg = (
                "Cannot connect to Ollama. "
                "Make sure Ollama is running (ollama serve) and glm-ocr is pulled."
            )
            print(f"❌ GLM-OCR: {msg}")
            return {"success": False, "error": msg, "main_text": ""}
        except requests.exceptions.HTTPError as e:
            msg = f"Ollama API error: {e}"
            print(f"❌ GLM-OCR: {msg}")
            return {"success": False, "error": msg, "main_text": ""}
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e), "main_text": ""}
