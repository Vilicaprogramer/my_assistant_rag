import os
from flask import Flask, request, jsonify, render_template, send_from_directory
from dotenv import load_dotenv
from src.ingestion import ingest_all
from src.rag_graph import query_rag

load_dotenv()

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

app.secret_key = os.getenv("FLASK_SECRET_KEY", "rag_assistant_secret_key_123")

# Ingesta automática al arrancar (evitando ejecución doble en debug reloader)
from src.ingestion import check_and_auto_ingest
if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    check_and_auto_ingest("docs", "vector_db")

@app.route("/")
def index():
    """
    Ruta raíz: Renderiza la vista principal del chat.
    """
    return render_template("index.html")

@app.route("/docs/<path:filename>")
def serve_pdf(filename):
    """
    Ruta GET /docs/<filename>: Sirve los archivos PDF o documentos 
    almacenados en el directorio 'docs'.
    """
    return send_from_directory("docs", filename)

@app.route("/api/ingest", methods=["POST"])
def api_ingest():
    """
    Endpoint POST /api/ingest: Ejecuta el procesamiento de la carpeta /docs.
    """
    try:
        num_chunks = ingest_all(docs_dir="docs", persist_dir="vector_db")
        return jsonify({
            "status": "success",
            "message": f"Ingesta completada. Se generaron {num_chunks} fragmentos de texto."
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error al procesar documentos: {str(e)}"
        }), 500

@app.route("/api/chat", methods=["POST"])
def api_chat():
    """
    Endpoint POST /api/chat: Procesa la consulta del usuario mediante RAG.
    """
    data = request.get_json() or {}
    message = data.get("message")
    session_id = data.get("session_id", "default_session")
    
    if not message:
        return jsonify({
            "status": "error",
            "message": "Falta el parametro 'message' en la consulta."
        }), 400
        
    try:
        result = query_rag(message)
        response_text = result.get("response", "")
        sources = result.get("sources", [])
        
        # Filtro de no saber sin fuentes/citas
        if "lo siento, no puedo responder a esa pregunta basándome en la documentación provista" in response_text.lower().replace(".", "").strip():
            sources = []
            
        return jsonify({
            "status": "success",
            "session_id": session_id,
            "response": response_text,
            "sources": sources
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error al procesar la pregunta: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)