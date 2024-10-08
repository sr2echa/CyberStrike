import os
import hashlib
import re
import json
import base64
import datetime
import logging
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from llama_index.llms.gemini import Gemini
from llama_index.core import Document, Settings, VectorStoreIndex, SummaryIndex
from llama_index.core.node_parser import SentenceSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from llama_index.core.tools import QueryEngineTool
from llama_index.core.query_engine.router_query_engine import RouterQueryEngine
from llama_index.core.selectors import LLMSingleSelector
from llama_index.core.indices.knowledge_graph.base import KnowledgeGraphIndex
from llama_index.core import StorageContext
import fitz
import pymupdf4llm

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True
)

# Initialize LLM
gemini_llm = None
try:
    google_api_key = os.environ.get("GOOGLE_API_KEY")
    if google_api_key:
        gemini_llm = Gemini(api_key=google_api_key)
        Settings.llm = gemini_llm
        logger.info("Using Gemini LLM")
    else:
        logger.warning("Couldn't find Google API key.")
except Exception as e:
    logger.error(f"Error initializing LLM: {e}")

if not gemini_llm:
    raise ValueError("Failed to initialize Gemini LLM. Please check your Google API key.")

Settings.embed_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

# In-memory storage for document embeddings and metadata
document_store = {}
UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)

class UploadRequest(BaseModel):
    file: str  # base64 encoded file
    filename: str  # Original filename

class UploadResponse(BaseModel):
    status: str
    id: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    id: str
    query: str
    history: List[ChatMessage] = []

class FileInfoResponse(BaseModel):
    file_name: str
    file_size: str
    last_edited: str
    page_count: int
    author: str
    created_at: str

class KeyFindingsResponse(BaseModel):
    findings: Dict[str, Any]

class VulnerabilitiesResponse(BaseModel):
    vulnerabilities: List[Dict[str, Any]]

class IdRequest(BaseModel):
    id: str
    
class SummarizeRequest(BaseModel):
    id: str

class SummarizeResponse(BaseModel):
    summary: str

def clean_llm_response(response: str) -> str:
    """Remove Markdown code block syntax and any additional text from the LLM response."""
    cleaned = re.sub(r'^```json\s*', '', response.strip())
    cleaned = re.sub(r'\s*```$', '', cleaned)
    cleaned = re.sub(r'^[^{]*', '', cleaned)
    cleaned = re.sub(r'[^}]*$', '', cleaned)
    return cleaned

def get_document_info(file_id: str) -> Dict[str, Any]:
    if file_id in document_store:
        return document_store[file_id]
    
    info_path = os.path.join(UPLOADS_DIR, f"{file_id}_info.json")
    if os.path.exists(info_path):
        with open(info_path, 'r') as f:
            doc_info = json.load(f)
   
        if 'full_text' in doc_info:
            document = Document(text=doc_info['full_text'])
            splitter = SentenceSplitter(chunk_size=1024)
            nodes = splitter.get_nodes_from_documents([document])
            doc_info['index'] = VectorStoreIndex(nodes)
        
        document_store[file_id] = doc_info
        return doc_info
    
    raise HTTPException(status_code=404, detail="Document not found")

@app.post("/upload", response_model=UploadResponse)
async def upload_document(upload_request: UploadRequest, background_tasks: BackgroundTasks):
    try:
        file_content = base64.b64decode(upload_request.file)
        file_hash = hashlib.md5(file_content).hexdigest()
        
        file_path = os.path.join(UPLOADS_DIR, f"{file_hash}.pdf")
        with open(file_path, "wb") as f:
            f.write(file_content)

        background_tasks.add_task(process_document, file_path, file_hash, upload_request.filename)
        
        return UploadResponse(status="success", id=file_hash)
    except Exception as e:
        logger.error(f"Error processing upload: {e}")
        raise HTTPException(status_code=500, detail="Error processing upload")

class DocumentProcessor:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.full_text = None
        self.nodes = None
        self.summary_index = None
        self.vector_index = None
        self.kg_index = None

    def process(self):
        self.full_text = pymupdf4llm.to_markdown(self.file_path)
        document = Document(text=self.full_text)
        splitter = SentenceSplitter(chunk_size=1024)
        self.nodes = splitter.get_nodes_from_documents([document])
        self.summary_index = SummaryIndex(self.nodes)
        self.vector_index = VectorStoreIndex(self.nodes)
        
        # Create KnowledgeGraphIndex
        storage_context = StorageContext.from_defaults()
        self.kg_index = KnowledgeGraphIndex(
            nodes=self.nodes,
            storage_context=storage_context,
            max_triplets_per_chunk=10,
            include_embeddings=False,
            show_progress=True,
        )
        self.kg_index._build_index_from_nodes(self.nodes)
        
class QueryEngineBuilder:
    def __init__(self, summary_index: SummaryIndex, vector_index: VectorStoreIndex, kg_index: KnowledgeGraphIndex):
        self.summary_index = summary_index
        self.vector_index = vector_index
        self.kg_index = kg_index
        self.query_engine = None

    def build_query_engine(self):
        summary_query_engine = self.summary_index.as_query_engine(
            response_mode="tree_summarize",
            use_async=True,
        )
        vector_query_engine = self.vector_index.as_query_engine()
        kg_query_engine = self.kg_index.as_query_engine(
            include_text=True,
            retriever_mode="keyword",
            response_mode="tree_summarize",
            embedding_mode="hybrid",
            similarity_top_k=3,
            explore_global_knowledge=True,
        )

        summary_tool = QueryEngineTool.from_defaults(
            query_engine=summary_query_engine,
            description="Useful for summarization questions related to the Document"
        )

        vector_tool = QueryEngineTool.from_defaults(
            query_engine=vector_query_engine,
            description="Useful for retrieving specific context from the Document."
        )

        kg_tool = QueryEngineTool.from_defaults(
            query_engine=kg_query_engine,
            description="Useful for understanding relationships and connections within the Document."
        )

        self.query_engine = RouterQueryEngine(
            selector=LLMSingleSelector.from_defaults(),
            query_engine_tools=[summary_tool, vector_tool, kg_tool],
            verbose=True
        )


document_store = {}

async def process_document(file_path: str, file_hash: str, original_filename: str):
    try:
        file_stat = os.stat(file_path)
        file_size = file_stat.st_size
        last_modified = datetime.datetime.fromtimestamp(file_stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        created_at = datetime.datetime.fromtimestamp(file_stat.st_ctime).strftime("%Y-%m-%d %H:%M:%S")
        
        doc = fitz.open(file_path)
        page_count = len(doc)
        
        # Extract author information
        metadata = doc.metadata
        author = metadata.get('author', 'Unknown')
        
        doc.close()

        processor = DocumentProcessor(file_path)
        processor.process()
        
        query_engine_builder = QueryEngineBuilder(processor.summary_index, processor.vector_index, processor.kg_index)
        query_engine_builder.build_query_engine()
        
        doc_info = {
            "query_engine": query_engine_builder.query_engine,
            "full_text": processor.full_text,
            "filename": original_filename,
            "size": file_size,
            "upload_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "last_modified": last_modified,
            "created_at": created_at,
            "page_count": page_count,
            "author": author  
        }
        
        document_store[file_hash] = doc_info
        info_to_save = {k: v for k, v in doc_info.items() if k not in ['query_engine', 'full_text']}
        info_path = os.path.join(UPLOADS_DIR, f"{file_hash}_info.json")
        with open(info_path, "w") as f:
            json.dump(info_to_save, f, default=str)

    except Exception as e:
        logger.error(f"Error processing document: {e}")

# Modify the chat endpoint
@app.post("/chat")
async def chat(chat_request: ChatRequest):
    try:
        doc_info = get_document_info(chat_request.id)
        query_engine = doc_info["query_engine"]
        
        conversation = "\n".join([f"{msg.role}: {msg.content}" for msg in chat_request.history])
        
        prompt = f"""
        [SYSTEM MESSAGE]
        You are now adopting the persona of Fischer, a knowledgeable and friendly AI assistant
        from the CyberStrike AI Audit Management Suite. Your primary role is to assist users in
        navigating cybersecurity audit processes, providing insights, and enhancing the overall 
        quality of audit reports. Emphasize your expertise in risk assessments, compliance, 
        vulnerability analysis, and remediation recommendations. Be personable, approachable, 
        and solution-oriented.

        Given the following conversation history and the user's query, provide a response based on the document content:

        Conversation history:
        {conversation}

        User query: {chat_request.query}

        Respond to the user's query using information from the document:
        """
        
        response = query_engine.query(prompt)
        
        # Handle different response types
        if hasattr(response, 'response'):
            response_text = str(response.response)
        elif hasattr(response, 'text'):
            response_text = str(response.text)
        else:
            response_text = str(response)
        
        return {"response": response_text}
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chat request: {str(e)}")

@app.post("/fileinfo/{file_id}", response_model=FileInfoResponse)
async def get_file_info(file_id: str):
    doc_info = get_document_info(file_id)
    if not doc_info:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Convert file size to MB
    file_size_mb = f"{doc_info['size'] / (1024 * 1024):.1f} MB"
    
    # Extract date from last_modified
    last_edited = doc_info["last_modified"].split()[0]
    
    return FileInfoResponse(
        file_name=doc_info["filename"],
        file_size=file_size_mb,
        last_edited=last_edited,
        page_count=doc_info["page_count"],
        author="Security Team",  # You may need to add this field to your document processing
        created_at=doc_info["created_at"].split()[0]  # Extract date only
    )




@app.post("/keyfindings", response_model=KeyFindingsResponse)
async def get_key_findings(id_request: IdRequest):
    file_id = id_request.id
    try:
        doc_info = get_document_info(file_id)
        full_text = doc_info["full_text"]
        
        prompt = """
        Analyze the following cybersecurity report and provide key findings in JSON format. The response must adhere to a clear hierarchical structure, focusing on the following categories:

        Threat Landscape: Overview of emerging threats and attack vectors, along with their impact.
        Vulnerabilities: List of top vulnerabilities identified (without severity ratings).
        Incident Response: Summary of recent incidents and evaluation of response strategies.
        Emerging Technologies: How new technologies are affecting cybersecurity and associated risks.
        Compliance and Regulatory Issues: Current compliance challenges and recent regulatory updates.

        Format the output as a JSON object containing ONE EACH of:
        {
        "Threat Landscape": {
            "Emerging Threats": {
                "description": "Overview of new and evolving cyber threats",
                "examples": ["Threat 1", "Threat 2"],
                "impact": "Potential impact on systems and data"
            },
            "Attack Vectors": {
                "common_methods": ["Method 1", "Method 2"],
                "trends": "Recent trends in how attacks are executed"
            }
        },
        "Vulnerabilities": {
            "Critical Issues": {
                "top_vulnerabilities": ["Vulnerability 1", "Vulnerability 2"]
            }
        },
        "Incident Response": {
            "Recent Incidents": {
                "description": "Analysis of recent incidents and attack patterns",
                "response_effectiveness": "Evaluation of response strategies"
            }
        },
        "Emerging Technologies": {
            "Impact": {
                "description": "How new technologies are affecting cybersecurity",
                "associated_risks": ["Risk 1", "Risk 2"]
            }
        },
        "Compliance and Regulatory Issues": {
            "Challenges": {
                "description": "Current compliance challenges faced",
                "regulatory_updates": "Recent regulatory updates"
            }
        }
        }
        Provide a comprehensive analysis that a cybersecurity professional would find informative and actionable.
        IMPORTANT: Ensure that your response contains only the JSON object and no additional text.
        """
        
        response = gemini_llm.complete(prompt + "\n\nDocument content:\n" + full_text)
        
        if not response.text.strip():
            raise ValueError("Empty response from LLM")
        
        cleaned_response = clean_llm_response(response.text)
        
        json_match = re.search(r'(\{[\s\S]*\})', cleaned_response)
        if json_match:
            json_str = json_match.group(1)
            findings = json.loads(json_str)
        else:
            raise ValueError("No valid JSON found in the response")

        findings_path = os.path.join(UPLOADS_DIR, f"{file_id}_findings.json")
        with open(findings_path, "w") as f:
            json.dump(findings, f, indent=2)
        
        return KeyFindingsResponse(findings=findings)
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing LLM response: {str(e)}")
        logger.error(f"Cleaned response: {cleaned_response}")
        raise HTTPException(status_code=500, detail="Error parsing key findings: Invalid JSON")
    except ValueError as e:
        logger.error(f"Error with LLM response: {str(e)}")
        raise HTTPException(status_code=500, detail="Error with LLM response: Empty or invalid")
    except Exception as e:
        logger.error(f"Error extracting key findings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error extracting key findings: {str(e)}")

@app.post("/vulnerabilities", response_model=VulnerabilitiesResponse)
async def get_vulnerabilities(id_request: IdRequest):
    file_id = id_request.id
    try:
        doc_info = get_document_info(file_id)
        full_text = doc_info["full_text"]
        
        prompt = """
        Analyze the following document and extract a list of vulnerabilities. 
        For each vulnerability:
        1. Provide a brief description
        2. Assign a criticality score from 1-10 (10 being most critical)
        3. Explain the reasoning behind the criticality score
        4. Suggest a brief mitigation strategy

        IMPORTANT: Your response must be in valid JSON format. Use the following structure:
        [
            {
                "description": "Vulnerability description here",
                "criticality": 8,
                "reasoning": "Reasoning for criticality score here",
                "mitigation": "Mitigation strategy here"
            },
            ...
        ]
        Sort the list by criticality score in descending order.
        Ensure that your response contains only the JSON array and no additional text.
        """
        
        response = gemini_llm.complete(prompt + "\n\nDocument content:\n" + full_text)
        
        if not response.text.strip():
            raise ValueError("Empty response from LLM")
        
        cleaned_response = clean_llm_response(response.text)
        
        json_match = re.search(r'(\[[\s\S]*\])', cleaned_response)
        if json_match:
            json_str = json_match.group(1)
            vulnerabilities = json.loads(json_str)
        else:
            json_objects = re.findall(r'(\{[\s\S]*?\})', cleaned_response)
            if json_objects:
                json_str = '[' + ','.join(json_objects) + ']'
                vulnerabilities = json.loads(json_str)
            else:
                raise ValueError("No valid JSON found in the response")
        
        sorted_vulnerabilities = sorted(vulnerabilities, key=lambda x: x['criticality'], reverse=True)
        
        vulnerabilities_path = os.path.join(UPLOADS_DIR, f"{file_id}_vulnerabilities.json")
        with open(vulnerabilities_path, "w") as f:
            json.dump(sorted_vulnerabilities, f, indent=2)
        
        return VulnerabilitiesResponse(vulnerabilities=sorted_vulnerabilities)
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing LLM response: {str(e)}")
        logger.error(f"Cleaned response: {cleaned_response}")
        raise HTTPException(status_code=500, detail="Error parsing vulnerabilities: Invalid JSON")
    except ValueError as e:
        logger.error(f"Error with LLM response: {str(e)}")
        raise HTTPException(status_code=500, detail="Error with LLM response: Empty or invalid")
    except Exception as e:
        logger.error(f"Error extracting vulnerabilities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error extracting vulnerabilities: {str(e)}")


@app.post("/summarize", response_model=SummarizeResponse)
async def summarize_document(summarize_request: SummarizeRequest):
    try:
        doc_info = get_document_info(summarize_request.id)
        full_text = doc_info["full_text"]
        
        summarization_prompt = f"""
        Please provide a comprehensive summary of the following document. 
        The summary should:
        1. Capture the main topics and key points discussed in the document
        2. Highlight any significant findings or conclusions
        3. Mention any important recommendations or action items
        4. Be concise yet informative, aiming for about 500 words

        Document to summarize:
        {full_text}

        Summary:
        """

        response = gemini_llm.complete(summarization_prompt)
        return SummarizeResponse(summary=response.text)
    except Exception as e:
        logger.error(f"Error summarizing document: {e}")
        raise HTTPException(status_code=500, detail=f"Error summarizing document: {str(e)}")

@app.get("/", response_class=HTMLResponse)
async def root():
    html_content = """
    <html>
        <head>
            <title>CyberStrike Backend</title>
            <style>
                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
                    height: 100vh;
                    margin: 0;
                    background-color: #010101;
                    color: white;
                    font-family: Arial, sans-serif;
                }
                h1 {
                    font-size: 3em;
                    margin: 0;
                }
                p {
                    font-size: 2em;
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <h1>Cyber Strike</h1>
            <p>Welcome to the CyberStrike backend!</p>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.get("/health")
async def health_check():
    try:
        response = gemini_llm.complete("Say 'Gemini is working!'")
        if "Gemini is working" in response.text:
            return {"status": "healthy", "llm": "Gemini"}
        else:
            return {"status": "unhealthy", "llm": "Gemini", "reason": "Unexpected response"}
    except Exception as e:
        return {"status": "unhealthy", "llm": "Gemini", "reason": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)