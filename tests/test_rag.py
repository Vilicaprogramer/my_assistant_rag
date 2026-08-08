import os
import pytest
from unittest.mock import MagicMock, patch
from langchain_core.documents import Document
from src.ingestion import get_loader, load_document, split_docs
from src.rag_graph import RAGState, retrieve_docs, generate_answer

@patch("src.ingestion.PyPDFLoader")
@patch("src.ingestion.TextLoader")
def test_get_loader(mock_text_loader, mock_pdf_loader):
    """
    Prueba que se asigne el cargador adecuado segun la extension del archivo.
    """
    pdf_loader = get_loader("test.pdf")
    txt_loader = get_loader("test.txt")
    md_loader = get_loader("test.md")
    unsupported_loader = get_loader("test.xlsx")
    
    assert pdf_loader is not None
    assert txt_loader is not None
    assert md_loader is not None
    assert unsupported_loader is None


def test_split_docs():
    """
    Prueba el fraccionamiento de documentos.
    """
    docs = [Document(page_content="A" * 1200, metadata={"source": "test.txt"})]
    chunks = split_docs(docs)
    
    assert len(chunks) > 1
    assert chunks[0].metadata["source"] == "test.txt"

@patch("src.rag_graph.get_vectorstore")
def test_retrieve_docs(mock_get_vectorstore):
    """
    Prueba el nodo de recuperacion del grafo RAG.
    """
    mock_db = MagicMock()
    mock_retriever = MagicMock()
    mock_retriever.get_relevant_documents.return_value = [
        Document(page_content="Contenido recuperado", metadata={"source": "test.txt", "page": 0})
    ]
    mock_db.as_retriever.return_value = mock_retriever
    mock_get_vectorstore.return_value = mock_db
    
    state: RAGState = {"question": "Test", "context": [], "response": "", "sources": []}
    result = retrieve_docs(state)
    
    assert "context" in result
    assert len(result["context"]) == 1
    assert result["context"][0].page_content == "Contenido recuperado"

@patch("src.rag_graph.ChatGoogleGenerativeAI")
def test_generate_answer(mock_chat_class):
    """
    Prueba el nodo de generacion del grafo RAG.
    """
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(content="Respuesta simulada")
    mock_chat_class.return_value = mock_llm
    
    state: RAGState = {
        "question": "Test?",
        "context": [Document(page_content="Contenido", metadata={"source": "test.txt", "page": 1})],
        "response": "",
        "sources": []
    }
    
    result = generate_answer(state)
    
    assert "response" in result
    assert result["response"] == "Respuesta simulada"
    assert len(result["sources"]) == 1
    assert result["sources"][0]["source"] == "test.txt"
    assert result["sources"][0]["page"] == 1
