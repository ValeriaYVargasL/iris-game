import os
import sqlite3
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Iris Game Evaluation & Persistence Engine", version="2.0.0")

DATA_DIR = os.getenv("DATA_DIR", "/app/data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "iris_looks.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS saved_looks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_id TEXT NOT NULL,
                style TEXT NOT NULL,
                hair_style TEXT,
                hair_color TEXT,
                lipstick TEXT,
                lip_finish TEXT,
                eyeshadow TEXT,
                blush TEXT,
                eyelashes TEXT,
                accessory TEXT,
                gadget TEXT,
                pose TEXT,
                expression TEXT,
                score INTEGER DEFAULT 5,
                comment TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()


init_db()


class MakeupRequest(BaseModel):
    modelId: str
    foundation: Optional[str] = None
    hairStyle: Optional[str] = None
    hairColor: Optional[str] = None
    blush: Optional[str] = None
    eyeshadow: Optional[str] = None
    lipstick: Optional[str] = None
    accessory: Optional[str] = None
    eyelashes: Optional[str] = None
    lipFinish: Optional[str] = None
    pose: Optional[str] = None
    expression: Optional[str] = None
    gadget: Optional[str] = None
    score: Optional[int] = 5


FEEDBACK_RULES = {
    "jacky": {
        "style": "Romántica y cálida",
        "default": "¡Un look precioso! Los tonos cálidos van con mi estilo.",
        "lipstick": "¡WOW! ¡ESE ES PERFECTO! 💋"
    },
    "ximena": {
        "style": "Tierna y creativa",
        "default": "¡Qué bonita combinación! Me encanta probar detalles nuevos.",
        "headband": "¡UWU! ¡ME ENCANTA! ♡"
    },
    "valeria": {
        "style": "Espontánea y auténtica",
        "default": "¡JAJAJA! Este look tiene muchísima personalidad.",
        "glasses": "¡POR FIN VEO! JAJAJA 🤓"
    },
    "lucy": {
        "style": "Delicada y elegante",
        "default": "¡Qué combinación tan delicada! Este look tiene mucha luz."
    }
}


@app.get("/health")
def health():
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM saved_looks").fetchone()[0]
    return {"status": "ok", "service": "iris-python-engine", "total_saved_looks": total}


@app.post("/evaluate")
def evaluate_and_insert_look(req: MakeupRequest):
    model_id = req.modelId.lower()
    model_info = FEEDBACK_RULES.get(model_id)
    if model_info is None:
        return {"modelId": model_id, "status": "error", "comment": "Personaje no reconocido."}

    comment = model_info["default"]
    if model_id == "jacky" and req.lipstick not in (None, "none"):
        comment = model_info["lipstick"]
    elif model_id == "ximena" and req.accessory == "headband":
        comment = model_info["headband"]
    elif model_id == "valeria" and (req.gadget == "glasses" or req.accessory == "glasses"):
        comment = model_info["glasses"]

    final_score = max(1, min(5, req.score or 5))
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO saved_looks (
                model_id, style, hair_style, hair_color, lipstick, lip_finish,
                eyeshadow, blush, eyelashes, accessory, gadget, pose, expression,
                score, comment, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                model_id, model_info["style"], req.hairStyle, req.hairColor,
                req.lipstick, req.lipFinish, req.eyeshadow, req.blush,
                req.eyelashes, req.accessory, req.gadget, req.pose,
                req.expression, final_score, comment, created_at
            )
        )
        conn.commit()
        record_id = cursor.lastrowid

    return {
        "id": record_id,
        "modelId": model_id,
        "style": model_info["style"],
        "score": final_score,
        "comment": comment,
        "createdAt": created_at,
        "status": "success"
    }


@app.get("/looks")
def list_saved_looks(limit: int = 50):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM saved_looks ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    looks = [dict(r) for r in rows]
    return {"status": "success", "total": len(looks), "looks": looks}


@app.delete("/looks/{look_id}")
def delete_saved_look(look_id: int):
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM saved_looks WHERE id = ?", (look_id,))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
    return {"status": "deleted", "id": look_id}