import os
import hashlib
import re
import json
import base64
import datetime
import uuid
import logging
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from llama_index.llms.openai import OpenAI
from llama_index.llms.gemini import Gemini
from llama_index.core import Document, Settings, VectorStoreIndex, SummaryIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.tools import QueryEngineTool, ToolMetadata
from llama_index.core.query_engine.router_query_engine import RouterQueryEngine
from llama_index.core.selectors import LLMSingleSelector
from llama_index.core import StorageContext
from llama_index.core.objects import ObjectIndex
from llama_index.agent.openai import OpenAIAgent
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

gemini_llm = None
try:
    google_api_key = os.environ.get("GOOGLE_API_KEY")
    if google_api_key:
        gemini_llm = Gemini(api_key=google_api_key,model='models/gemini-1.5-flash')
        logger.info("Using Gemini LLM")
    else:
        logger.warning("Couldn't find Google API key.")
except Exception as e:
    logger.error(f"Error initializing Gemini LLM: {e}")

if not gemini_llm:
    raise ValueError("Failed to initialize Gemini LLM. Please check your Google API key.")

Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

document_store = {}
UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)

class FileUpload(BaseModel):
    file: str
    filename: str

class UploadRequest(BaseModel):
    files: List[FileUpload]

class UploadResponse(BaseModel):
    status: str
    ids: List[Dict[str, str]]
    user: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
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

class CategoriesRequest(BaseModel):
    file_list: List[str]

class CategoriesResponse(BaseModel):
    categories: Dict[str, List[str]]
    
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
   
        if 'full_text' in doc_info and 'nodes' in doc_info:
            document = Document(text=doc_info['full_text'])
            nodes = [Document.from_dict(node) for node in doc_info['nodes']]
            doc_info['index'] = VectorStoreIndex(nodes)
        
        document_store[file_id] = doc_info
        return doc_info
    
    raise HTTPException(status_code=404, detail="Document not found")

@app.post("/upload", response_model=UploadResponse)
async def upload_documents(upload_request: UploadRequest, background_tasks: BackgroundTasks):
    try:
        file_ids = []
        for file_upload in upload_request.files:
            file_content = base64.b64decode(file_upload.file)
            file_hash = hashlib.md5(file_content).hexdigest()
            
            file_path = os.path.join(UPLOADS_DIR, f"{file_hash}.pdf")
            with open(file_path, "wb") as f:
                f.write(file_content)

            background_tasks.add_task(process_document, file_path, file_hash, file_upload.filename)
            file_ids.append({file_upload.filename: file_hash})
        
        user_hash = uuid.uuid4().hex  

        return UploadResponse(status="success", ids=file_ids, user=user_hash)
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

    def process(self):
        self.full_text = pymupdf4llm.to_markdown(self.file_path)
        document = Document(text=self.full_text)
        splitter = SentenceSplitter(chunk_size=1024)
        self.nodes = splitter.get_nodes_from_documents([document])
        self.summary_index = SummaryIndex(self.nodes)
        self.vector_index = VectorStoreIndex(self.nodes)
        
        
class QueryEngineBuilder:
    def __init__(self, summary_index: SummaryIndex, vector_index: VectorStoreIndex): #, kg_index: KnowledgeGraphIndex
        self.summary_index = summary_index
        self.vector_index = vector_index
        self.query_engine = None

    def build_query_engine(self):
        summary_query_engine = self.summary_index.as_query_engine(
            response_mode="tree_summarize",
            use_async=True,
        )
        vector_query_engine = self.vector_index.as_query_engine()

        summary_tool = QueryEngineTool.from_defaults(
            query_engine=summary_query_engine,
            description="Useful for summarization questions related to the Document"
        )

        vector_tool = QueryEngineTool.from_defaults(
            query_engine=vector_query_engine,
            description="Useful for retrieving specific context from the Document."
        )

        # kg_tool = QueryEngineTool.from_defaults(
        #     query_engine=kg_query_engine,
        #     description="Useful for understanding relationships and connections within the Document."
        # )

        self.query_engine = RouterQueryEngine(
            selector=LLMSingleSelector.from_defaults(),
            query_engine_tools=[summary_tool, vector_tool], #, kg_tool
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
        
        query_engine_builder = QueryEngineBuilder(processor.summary_index, processor.vector_index) #, processor.kg_index
        query_engine_builder.build_query_engine()
        
        doc_info = {
            "query_engine": query_engine_builder.query_engine,
            "full_text": processor.full_text,
            "nodes": [node.to_dict() for node in processor.nodes],  # Convert nodes to dict
            "filename": original_filename,
            "size": file_size,
            "upload_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "last_modified": last_modified,
            "created_at": created_at,
            "page_count": page_count,
            "author": author
        }
        
        document_store[file_hash] = doc_info
        info_to_save = {k: v for k, v in doc_info.items() if k not in ['query_engine']}
        info_path = os.path.join(UPLOADS_DIR, f"{file_hash}_info.json")
        with open(info_path, "w") as f:
            json.dump(info_to_save, f, default=str)

    except Exception as e:
        logger.error(f"Error processing document: {e}")
        
def get_available_documents():
    documents = {}
    for filename in os.listdir(UPLOADS_DIR):
        if filename.endswith("_info.json"):
            file_id = filename[:-10]  # Remove "_info.json"
            with open(os.path.join(UPLOADS_DIR, filename), 'r') as f:
                doc_info = json.load(f)
            documents[file_id] = doc_info
    return documents

import openai
def summarize_for_tool(summary_content):
    """
    Generates a compact summary of the provided content using LLM's API.

    Parameters:
        api_key (str): Your LLM API key.
        summary_content (str): The content to summarize.

    Returns:
        str: A concise summary of the content, limited to 100 words.
    """
    prompt = f"Please summarize the following content in no more than 100 words for easy tool selection:\n\n{summary_content}"

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant for summarizing content."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150, 
            temperature=0.1
        )

        summary = response['choices'][0]['message']['content'].strip()
        return summary

    except Exception as e:
        return f"An error occurred: {str(e)}"
    
        
def process_nodes():
    available_documents = get_available_documents()    
    if not available_documents:
        return {"response": "No documents are currently available in the system. Please upload some documents first."}

    docs_list = {}
    vector_index = {}
    summary_index = {}
    summary_to_identify = {}
    agents = {}
    query_engines = {}
    all_nodes = []
       
    titles = [doc_info["filename"] for doc_info in available_documents.values()]
      
    for doc_name in titles:
        file_id = next(id for id, info in available_documents.items() if info["filename"] == doc_name)
        doc_info = get_document_info(file_id)
         
        if 'full_text' not in doc_info or 'nodes' not in doc_info:
            logger.warning(f"Full text or nodes not found for document {doc_name}. Skipping...")
            continue
            
        document = Document(text=doc_info['full_text'])
        nodes = [Document.from_dict(node) for node in doc_info['nodes']]
            
        doc_name = doc_name[:-4]  # Remove .pdf extension
        docs_list[doc_name] = DocumentProcessor(os.path.join(UPLOADS_DIR, f"{file_id}.pdf"))
        docs_list[doc_name].full_text = doc_info['full_text']
        docs_list[doc_name].nodes = nodes
        all_nodes.extend(nodes)
            
        vector_index[doc_name] = VectorStoreIndex(nodes)
        summary_index[doc_name] = SummaryIndex(nodes)
        node_ids = [node_id for value in summary_index[doc_name].ref_doc_info.values() for node_id in value.node_ids[:4]]
        summary_to_identify[doc_name] = summarize_for_tool(summary_index[doc_name].docstore.get_nodes(node_ids))
            
        vector_query_engine = vector_index[doc_name].as_query_engine(llm=gemini_llm)
        summary_query_engine = summary_index[doc_name].as_query_engine(llm=gemini_llm)
        query_engine_tools = [
                QueryEngineTool(
                    query_engine=vector_query_engine,
                    metadata=ToolMetadata(
                        name="vector_tool",
                        description=(
                            "Useful for questions related to specific aspects of"
                            f" {doc_name} (e.g the vulnerabilities, key findings)."
                        ),
                    ),
                ),
                QueryEngineTool(
                    query_engine=summary_query_engine,
                    metadata=ToolMetadata(
                        name="summary_tool",
                        description=(
                            "Useful for any requests that require a holistic summary"
                            f" of EVERYTHING about {doc_name}. For questions about"
                            " more specific sections, please use the vector_tool."
                        ),
                    ),
                ),
            ]   
        function_llm = OpenAI(model="gpt-4o-mini")
        agent = OpenAIAgent.from_tools(
                query_engine_tools,
                llm=function_llm,
                verbose=True,
                system_prompt=f"""\
        You are a specialized agent designed to answer queries about {doc_name}.
        Choose this document based on {summary_to_identify[doc_name]}
        You must ALWAYS use at least one of the tools provided when answering a question; do NOT rely on prior knowledge.\
        """,
            )
        agents[doc_name] = agent
        query_engines[doc_name] = vector_index[doc_name].as_query_engine(
                similarity_top_k=3
            )
        
    all_tools = []
    n=0
    for docs in titles:
        docs = docs[:-4]
        n +=1
        summary = (
                f"This content contains cybersecurity audits about {docs}. Use"
                f" this tool if you want to answer any questions about {summary_to_identify[docs]}.\n"
            )
        doc_tool = QueryEngineTool(
                query_engine=agents[docs],
                metadata=ToolMetadata(
                    name=f"tool_{re.sub(r'[^a-zA-Z0-9_-]', '_', docs)}",
                    description=summary,
                ),
            )
        all_tools.append(doc_tool)
        
    obj_index = ObjectIndex.from_objects(
            all_tools,
            index_cls=VectorStoreIndex,
        )
    top_agent = OpenAIAgent.from_tools(
            tool_retriever=obj_index.as_retriever(similarity_top_k=n),
            system_prompt=""" 
                You are Fischer, a knowledgeable and friendly AI assistant from the CyberStrike AI Audit Management Suite. 
                Your primary role is to assist users in navigating cybersecurity audit processes, providing insights, and 
                enhancing the overall quality of audit reports. Emphasize your expertise in risk assessments, compliance, 
                vulnerability analysis, and remediation recommendations. Be personable, approachable, and solution-oriented.

                Please always use the tools provided to answer a question. Do not rely on prior knowledge.
        """,
            verbose=True,
        )  
    top_agent_cat = OpenAIAgent.from_tools(
        tool_retriever=obj_index.as_retriever(similarity_top_k=4),
        system_prompt=""" 
            You are an agent designed to answer queries about a set of given cyber security audits of different types.
            Please always use the tools provided to answer a question. Do not rely on prior knowledge.
    """,
        verbose=True,
    )
    return top_agent, all_nodes, top_agent_cat

@app.post("/chat")
async def chat(chat_request: ChatRequest):
    try:
        
        top_agent,all_nodes,_=process_nodes()
        base_index = VectorStoreIndex(all_nodes)
        base_query_engine = base_index.as_query_engine(similarity_top_k=4)
        
        conversation = "\n".join([f"{msg.role}: {msg.content}" for msg in chat_request.history])
        
        response = top_agent.chat(f"""
        Given the following conversation history and the user's query, provide a response based on the content of the documents:

        Conversation history:
        {conversation}

        User query: {chat_request.query}

        Respond to the user's query using information from the documents:
        """)
        logger.info(f"LLM Response: {response}")
        res = clean_llm_response(str(response))
        return {"response": str(response)}
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chat request: {str(e)}")
    
@app.post('/graph')
async def get_vulnerabilities_graph():
    top_agent, _, _ = process_nodes()
    prompt = """
    Analyze the following documents to infer a list of vulnerabilities based on cybersecurity guidelines such as OWASP and NIST.

    Return the results ONLY IN THIS JSON format using the following structure:

    {
        "vulnerabilities": {
            "vulnerability_name1": ["filename1", "filename2"],
            "vulnerability_name2": ["filename2", "filename3"],
            "vulnerability_name3": ["filename1"],
            ...
        }
    }

    Important notes:
    1. Each key in the "vulnerabilities" object should be a string representing the vulnerability name (e.g., "SQL_Injection", "Cross_Site_Scripting").
    2. Each value should be an array of strings, where each string is a filename (e.g., "document1").
    3. The same filename can appear in multiple vulnerability arrays, indicating that a file may contain multiple types of vulnerabilities.
    4. If a vulnerability is identified but not found in any document, use an empty array [].
    5. Use standard vulnerability names as defined in cybersecurity guidelines like OWASP Top Ten, NIST Cybersecurity Framework, CWE, and CVE.

    Ensure that the JSON structure is strictly followed, with vulnerability names as keys and arrays of filenames as values.
    """
    
    response = top_agent.chat(prompt)
    
    try:
        response_str = str(response)
        logger.info(f"LLM Response: {response_str}")
        
        # Try to extract JSON from the response
        json_match = re.search(r'\{[\s\S]*\}', response_str)
        if json_match:
            json_str = json_match.group(0)
            json_data = json.loads(json_str)
        else:
            # If no JSON found, parse the text response
            vulnerabilities = {}
            current_vuln = None
            for line in response_str.split('\n'):
                if ':' in line and not line.strip().startswith('-'):
                    current_vuln = line.split(':')[0].strip()
                    vulnerabilities[current_vuln] = []
                elif line.strip().startswith('-') and current_vuln:
                    doc = line.strip('- ').strip()
                    if doc:
                        vulnerabilities[current_vuln].append(doc)
            
            json_data = {"vulnerabilities": vulnerabilities}
        
        return json_data
    except Exception as e:
        logger.error(f"Error parsing LLM response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error parsing graph response: {str(e)}")

@app.post('/categories')
async def get_categories(categories_request: CategoriesRequest):
    _,_,top_agent_cat=process_nodes()
    file_list = ', '.join(categories_request.file_list)
    prompt = f"""
        Classify the following file names into one of these categories:
        1. Compliance Audit
        2. Vulnerability Assessment
        3. Penetration Testing
        4. API Security Audit
        5. Incident Response Audit
        6. Security Policy Review
        7. Network Security Audit

        File Names: "{file_list}"

        Provide the entire list in this format COMPULSORILY, one file can ONLY belong to one category of audits, every file must be put into one category at least:

        Compliance Audit:["file_name_1","file_name_2"]
        Vulnerability Assessment:["file_name_3","file_name_4"]
        Penetration Testing:["file_name_5","file_name_6",file_name_7]
        API Security Audit:["file_name_8","file_name_9"]
        Incident Response Audit:["file_name_10","file_name_11"]
        Security Policy Review:["file_name_12","file_name_13","file_name_14"]
        Network Security Audit:["file_name_15","file_name_16"] 

        """
        
    response = top_agent_cat.chat(prompt)
    pattern = r'(\d+\.\s*[\w\s]+):\s*(\[.*?\])'
    matches = re.findall(pattern, str(response))


    categories = {
        "Compliance_Audit": [],
        "Vulnerability_Assessment": [],
        "Penetration_Testing": [],
        "API_Security_Audit": [],
        "Incident_Response_Audit": [],
        "Security_Policy_Review": [],
        "Network_Security_Audit": []
    }

    for match in matches:
        category = match[0].split('.')[1].strip()
        files = json.loads(match[1])
        categories[category] = files

    return CategoriesResponse(categories=categories)

@app.post("/fileinfo/{file_id}", response_model=FileInfoResponse)
async def get_file_info(file_id: str):
    doc_info = get_document_info(file_id)
    if not doc_info:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_size_mb = f"{doc_info['size'] / (1024 * 1024):.1f} MB"
    last_edited = doc_info["last_modified"].split()[0]
    
    return FileInfoResponse(
        file_name=doc_info["filename"],
        file_size=file_size_mb,
        last_edited=last_edited,
        page_count=doc_info["page_count"],
        author="Security Team",  
        created_at=doc_info["created_at"].split()[0]  
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