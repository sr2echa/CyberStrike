"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, } from "next/navigation";
import {
  FileText,
  AlertTriangle,
  Search,
  Send,
  Zap,
  Shield,
  File,
  Cpu,
  Lock,
  Calendar,
  Trash2,
  Loader2,
  ArrowBigRight,
  ArrowRight,
  ArrowLeft,
  PieChart,
  ArrowBigUp,
  MousePointer2,
  MousePointer2Icon,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { PieChartDonutWithText } from "@/components/ui";

// Add these type definitions at the top of the file
type Vulnerability = {
  description: string;
  criticality: number;
  reasoning: string;
  mitigation: string;
};

type KeyFindings = {
  [category: string]: {
    [subCategory: string]: {
      [key: string]: string | string[];
    };
  };
};

type FileInfo = {
  file_name: string;
  file_size: string;
  last_edited: string;
  page_count: number;
  author: string;
  created_at: string;
};

// At the top of your file, add this interface
interface ChatMessage {
  role: string;
  content: string;
}

// Mock data
// const fileAnalytics = {
//   fileName: "security_audit_2023.pdf",
//   fileSize: "2.5 MB",
//   lastEdited: "2023-09-15",
//   pageCount: 42,
//   author: "Security Team",
//   createdAt: "2023-09-01",
// };

export default function Analyze() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  //get the url
  const url = usePathname();
  const id = url.split("/").pop();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [keyFindings, setKeyFindings] = useState<KeyFindings | null>(null);
  const [isLoadingVulnerabilities, setIsLoadingVulnerabilities] = useState(false);
  const [isLoadingKeyFindings, setIsLoadingKeyFindings] = useState(false);
  const [summary, setSummary] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isLoadingFileInfo, setIsLoadingFileInfo] = useState(true);
  const [showVisualisations,setShowVisualisations] = useState(true);
  const [files, setFiles] = useState<{fileName: string, fileId: string}[]>([]);
  const [allFilesLoading, setAllFilesLoading] = useState(true);
  const [activeFile, setActiveFile] = useState<string | null>("");
  const [graphData, setGraphData] = useState<any>(null);
  const [allFileIds,setAllFileIds] = useState<String[]>([]);
  const [chartData,setChartData] = useState<any>([
    { browser: "Compliance Audit", fill: "hsl(var(--chart-1))", visitors: 1 },
    { browser: "Vulnerability Assessment", fill: "hsl(var(--chart-2))", visitors: 3 },
    { browser: "Penetration Testing", fill: "hsl(var(--chart-3))", visitors: 0 },
    { browser: "API Security Audit", fill: "hsl(var(--chart-4))", visitors: 0 },
    { browser: "Incident Response Audit", fill: "hsl(var(--chart-5))", visitors: 0 },
    { browser: "Security Policy Review", fill: "hsl(var(--chart-6))", visitors: 0 },
    { browser: "Network Security Audit", fill: "hsl(var(--chart-7))", visitors: 0 },
  ]);

  async function storeVulnerabilities(activeFile: string, vulnerabilities: Vulnerability[]) {
    const vulnerabilitiesJson = JSON.stringify(vulnerabilities);
    localStorage.setItem(activeFile+"Vulnerabilities", vulnerabilitiesJson);
  }

  async function storeSummary(activeFile: string, vulnerabilities: Vulnerability[]) {
    const vulnerabilitiesJson = JSON.stringify(vulnerabilities);
    localStorage.setItem(activeFile+"Summary", vulnerabilitiesJson);
  }

  // Fetch Graph Data
  useEffect(()=>{
    const fetchGraphData = async () => {
      try {
        const response = await fetch(`${backendUrl}/categories`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ "file_list" : allFileIds }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Graph data:", data);
        setChartData( [
          { browser: "Compliance Audit", fill: "hsl(var(--chart-1))", count: data.categories["Compliance Audit"].length },
          { browser: "Vulnerability Assessment", fill: "hsl(var(--chart-2))", count: data.categories["Vulnerability Assessment"].length },
          { browser: "Penetration Testing", fill: "hsl(var(--chart-3))", count: data.categories["Penetration Testing"].length },
          { browser: "API Security Audit", fill: "hsl(var(--chart-4))", count: data.categories["API Security Audit"].length },
          { browser: "Incident Response Audit", fill: "hsl(var(--chart-5))", count: data.categories["Incident Response Audit"].length },
          { browser: "Security Policy Review", fill: "hsl(var(--chart-6))", count: data.categories["Security Policy Review"].length },
          { browser: "Network Security Audit", fill: "hsl(var(--chart-7))", count: data.categories["Network Security Audit"].length },
        ]);
        setGraphData(data);
      } catch (error) {
        console.error("Error fetching graph data:", error);
      }
    };

    if(allFileIds.length>0){
      fetchGraphData()
    }
  },[allFileIds,files])

  useEffect(() => {

    // fetching Vulnerabilities
    const fetchVulnerabilities = async () => {
      setIsLoadingVulnerabilities(true);
      if(activeFile){
        const vul=await localStorage.getItem(activeFile)
        if(vul){
          const vulnerabilitiesJson=await JSON.parse(vul)
          setVulnerabilities(vulnerabilitiesJson)
        }else{
          try {
            const response = await fetch(`${backendUrl}/vulnerabilities`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ id:activeFile }),
            });
    
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            console.log("Vulnerabilities data:", data);
            await setVulnerabilities(data.vulnerabilities as Vulnerability[]);
            storeVulnerabilities(activeFile, data.vulnerabilities);
          } catch (error) {
            console.error("Error fetching vulnerabilities:", error);
          } finally {
            setIsLoadingVulnerabilities(false);
          }
        }        
      }

    };
    
    //fetch KeyFindings
    const fetchKeyFindings = async () => {
      setIsLoadingKeyFindings(true);
      try {
        const response = await fetch(`${backendUrl}/keyfindings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: activeFile }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Key findings data:", data);
        setKeyFindings(data.findings as KeyFindings);
      } catch (error) {
        console.error("Error fetching key findings:", error);
      } finally {
        setIsLoadingKeyFindings(false);
      }
    };

    const fetchSummary = async () => {
      setIsLoadingSummary(true);
      try {
        const response = await fetch(`${backendUrl}/summarize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: activeFile }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Summary data:", data);
        setSummary(data.summary);
      } catch (error) {
        console.error("Error fetching summary:", error);
      } finally {
        setIsLoadingSummary(false);
      }
    };

    const fetchFileInfo = async () => {
      setIsLoadingFileInfo(true);
      try {
        const response = await fetch(`${backendUrl}/fileinfo/${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id:activeFile }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("File info data:", data);
        setFileInfo(data as FileInfo);
      } catch (error) {
        console.error("Error fetching file info:", error);
      } finally {
        setIsLoadingFileInfo(false);
      }
    };

    if (id) {
      Promise.all([fetchFileInfo(), fetchVulnerabilities(), fetchKeyFindings(), fetchSummary()]);
    }

    // Load chat messages from localStorage
    const storedMessages = localStorage.getItem(`chatMessages_${id}`);
    if (storedMessages) {
      setChatMessages(JSON.parse(storedMessages));
    }
  }, [id, backendUrl,activeFile]);

  useEffect(()=>{
    const allFiles=localStorage.getItem("responseFromBackend")
    if(allFiles){
      const fileIds=JSON.parse(allFiles)
      const filesArray=fileIds.ids.map((fileId: {
        fileName: string;
        fileId: string;
      })=>({fileName:Object.keys(fileId), fileId:Object.values(fileId)}))
      setFiles(filesArray)
      setAllFilesLoading(false)
      const allIdsArray=fileIds.ids.map((fileId: {  
        fileId: string;
      })=>(Object.values(fileId)[0]))
      setAllFileIds(allIdsArray)
    }
  },[])

  useEffect(() => {
    // Save chat messages to localStorage whenever they change
    if (id && chatMessages.length > 0) {
      localStorage.setItem(`chatMessages_${id}`, JSON.stringify(chatMessages));
    }
  }, [chatMessages, id]);

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      const newUserMessage = { role: "user", content: inputMessage };
      const updatedMessages = [...chatMessages, newUserMessage];
      setChatMessages(updatedMessages);
      setInputMessage("");
      setIsLoading(true);

      try {
        const response = await fetch(`${backendUrl}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: id,
            query: inputMessage,
            history: updatedMessages,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const newBotMessage = { role: "assistant", content: data.response };
        setChatMessages((prevMessages) => [...prevMessages, newBotMessage]);
      } catch (error) {
        console.error("Error sending chat message:", error);
        setChatMessages((prevMessages) => [
          ...prevMessages,
          { role: "assistant", content: "Sorry, there was an error processing your request." },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleClearChat = () => {
    setChatMessages([]);
    if (id) {
      localStorage.removeItem(`chatMessages_${id}`);
    }
  };

  const SummaryRenderer = () => (
    <ReactMarkdown
      components={{
        h2: ({ children }) => <h2 className="text-2xl font-bold mt-6 mb-4">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xl font-semibold mt-4 mb-2">{children}</h3>,
        p: ({ children }) => <p className="mb-4">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
        li: ({ children }) => <li className="mb-2">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        code: ({ children }) => (
          <code className="bg-gray-200 dark:bg-gray-700/80 px-2 py-1 text-sm rounded font-mono">
            {children}
          </code>
        ),
      }}
    >
      {summary}
    </ReactMarkdown>
  );

  return (
    // <div className="flex h-[calc(100vh-72px)]">
    //   {/* Chatbot Section */}
    //   <div className="w-1/2 p-4 flex flex-col overflow-hidden ml-3">
    //     <div className="flex-grow overflow-y-auto mb-6 px-6 py-4 bg-gray-100 dark:bg-zinc-400/5 rounded-lg relative">
    //       {chatMessages.length === 0 && (
    //         <>
    //           <div className="absolute inset-0 flex items-center justify-center opacity-10">
    //             <Image
    //               src="/whiteFischerLogo.png"
    //               alt="Fischer Logo light"
    //               width={200}
    //               height={200}
    //               className="hidden dark:block"
    //             />
    //             <Image
    //               src="/blackFischerLogo.png"
    //               alt="Fischer Logo dark"
    //               width={200}
    //               height={200}
    //               className="dark:hidden"
    //             />
    //           </div>
    //           <div className="flex items-center justify-center">
    //             <p className="text-lg font-semibold text-gray-400/50 dark:text-gray-600/40 font-mono">
    //               Chat with the audit report
    //             </p>
    //           </div>
    //         </>
    //       )}
    <div className="flex h-[calc(100vh-72px)]">
      <div className="w-1/2 p-4 flex flex-col overflow-hidden ml-3">
        <div className="flex-grow overflow-y-auto mb-6 px-6 py-4 bg-gray-100 dark:bg-zinc-400/5 rounded-lg relative">
          {chatMessages.length === 0 && (
            <>
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <Image
                  src="/whiteFischerLogo.png"
                  alt="Fischer Logo light"
                  width={200}
                  height={200}
                  className="hidden dark:block"
                />
                <Image
                  src="/blackFischerLogo.png"
                  alt="Fischer Logo dark"
                  width={200}
                  height={200}
                  className="dark:hidden"
                />
              </div>
              <div className="flex items-center justify-center">
                <p className="text-lg font-semibold text-gray-400/50 dark:text-gray-600/40 font-mono">
                  Chat with the audit report
                </p>
              </div>
            </>
          )}
          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className={`mb-2 ${msg.role === "user" ? "text-right mt-10" : "text-left"}`}
            >
              <span
                className={`inline-block px-4 py-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-black text-white dark:bg-white dark:text-gray-900"
                    : "bg-gray-200 dark:bg-gray-800/50 dark:text-gray-300"
                }`}
                style={{ marginBottom: `${(chatMessages.length - index) * 4}px` }}
              >
                <ReactMarkdown
                  components={{
                    code({ children, ...props }) {
                      return (
                        <code className="bg-gray-300 dark:bg-gray-600 px-1 rounded" {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </span>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce"></div>
              <div
                className="w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="flex mb-2">
          <Input
            type="text"
            placeholder="Ask about the security audit..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-grow mr-3 h-11"
          />
          <Button onClick={handleSendMessage} disabled={isLoading} className="h-11 mr-2">
            <Send className="h-5 w-5" />
          </Button>
          <Button onClick={handleClearChat} variant="outline" className="h-11">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>                                                                                                                                                                                                                                                     

      <div className="flex flex-1 overflow-auto flex-col w-[100%]">
        <div className="mb-4 flex justify-center gap-4 pt-8 px-4 space-x-2">
          <TabButton active={!showVisualisations} onClick={() => setShowVisualisations(false)}>
            <ArrowLeft />
          </TabButton>
          <TabButton active={!showVisualisations} onClick={() => setShowVisualisations(false)}>
            File Analytics
          </TabButton>
          <TabButton active={showVisualisations} onClick={() => setShowVisualisations(true)}>
            Visualisations 
          </TabButton>
          <TabButton active={showVisualisations} onClick={() => setShowVisualisations(true)}>
            <ArrowRight />
          </TabButton>
        </div>
        {showVisualisations ? 
        <div className="px-4">
            <div className="flex flex-col items-center gap-8 justify-center p-8">
              <div className="h-">
                <PieChartDonutWithText totalNoOfFiles={files.length} chartData={chartData} />  
              </div>
              <div className="mb-4 flex space-x-2">
                <TabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")}>
                  Summary
                </TabButton>
                <TabButton active={activeTab === "findings"} onClick={() => setActiveTab("findings")}>
                  Key Findings
                </TabButton>
                <TabButton
                  active={activeTab === "vulnerabilities"}
                  onClick={() => setActiveTab("vulnerabilities")}
                >
                  Vulnerabilities
                </TabButton>
              </div>
            </div>   
        </div>  
        :
        <div>
          <div className="p-4  overflow-y-auto">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>All files</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {allFilesLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : files.length > 0 ? (
                  files.map((file, index) => (
                    <FileListCard key={index} file={file} onClick={setActiveFile} activeFile={activeFile} />
                  ))
                ) : (
                  <p>No files found.</p>
                )}
              </CardContent>
            </Card>

            {activeFile && <div className="mb-4 flex space-x-2">
              <TabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")}>
                Summary
              </TabButton>
              <TabButton active={activeTab === "findings"} onClick={() => setActiveTab("findings")}>
                Key Findings
              </TabButton>
              <TabButton
                active={activeTab === "vulnerabilities"}
                onClick={() => setActiveTab("vulnerabilities")}
              >
                Vulnerabilities
              </TabButton>
            </div>}

            {activeFile && activeTab === "summary" && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="mr-2 h-6 w-6" />
                    Executive Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingSummary ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : summary ? (
                    <div className="prose dark:prose-invert max-w-none">
                      <SummaryRenderer />
                    </div>
                  ) : (
                    <p>No summary available.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeFile && activeTab === "findings" && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-6 w-6" />
                    Key Findings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingKeyFindings ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : keyFindings ? (
                    Object.entries(keyFindings).map(([category, data], index) => (
                      <div key={index} className="mb-6">
                        <h3 className="text-xl font-semibold mb-2">{category}</h3>
                        {Object.entries(data).map(([subCategory, subData], subIndex) => (
                          <div key={subIndex} className="mb-4 ml-4">
                            <h4 className="text-lg font-medium mb-2">{subCategory}</h4>
                            {Object.entries(subData).map(([key, value], i) => (
                              <div key={i} className="mb-2">
                                <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
                                {Array.isArray(value) ? (
                                  <ul className="list-disc list-inside ml-2">
                                    {value.map((item, j) => (
                                      <li key={j} className="text-gray-700 dark:text-gray-300">
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                                    {String(value)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <p>No key findings available.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeFile && activeTab === "vulnerabilities" && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="mr-2 h-6 w-6" />
                    Vulnerabilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingVulnerabilities ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : vulnerabilities.length > 0 ? (
                    vulnerabilities.map((vuln, index) => (
                      <div
                        key={index}
                        className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex items-stretch mb-5">
                          <div className={`w-2 mr-4 ${getCriticalityColor(vuln.criticality)}`}></div>
                          <h3 className="text-xl font-semibold flex-grow font">
                            <ReactMarkdown
                              components={{
                                code({ children, ...props }) {
                                  return (
                                    <code
                                      className="bg-gray-200 dark:bg-gray-700 px-1 rounded"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {vuln.description}
                            </ReactMarkdown>
                          </h3>
                        </div>
                        <div className="mb-2 flex items-center">
                          <strong className="mr-2">Criticality Score:</strong> {vuln.criticality}
                          <Progress
                            value={vuln.criticality * 10}
                            className="w-24 ml-2"
                            // indicatorClassName={getCriticalityColor(vuln.criticality)}
                          />
                        </div>
                        <p className="mb-2">
                          <strong>Reasoning:</strong>
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => (
                                <p className="text-gray-700 dark:text-gray-300">{children}</p>
                              ),
                              code({children, ...props }) {
                                return (
                                  <code
                                    className="bg-gray-200 dark:bg-gray-700 px-1 rounded"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {vuln.reasoning}
                          </ReactMarkdown>
                        </p>
                        <p>
                          <strong>Mitigation:</strong>
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => (
                                <p className="text-gray-700 dark:text-gray-300">{children}</p>
                              ),
                              code({ children, ...props }) {
                                return (
                                  <code
                                    className="bg-gray-200 dark:bg-gray-700 px-1 rounded"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {vuln.mitigation}
                          </ReactMarkdown>
                        </p>
                      </div>
                    ))
                  ) : (
                    <p>No vulnerabilities found.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      }
      {!activeFile && !showVisualisations && 
        <div className="flex justify-center items-center gap-4 h-full text-center  font-mono text-gray-400/60">
          <div>
            <MousePointerClick />
          </div>
          Select a file above to fetch results!
        </div>}
      </div>
    </div>
  );
}

function getCriticalityColor(score: number) {
  if (score >= 8) return "bg-red-500";
  if (score >= 5) return "bg-yellow-500";
  return "bg-green-500";
}

function FileCard({label,value}:{
  label: string;
  value: string;
}){
  return(
    <div>
      File Card
    </div>
  )
}

function FileInfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center">
      {icon}
      <div className="ml-2">
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`px-4 py-2 rounded-lg transition-colors ${
        active
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "bg-transparent text-black hover:bg-gray-300  dark:text-white dark:hover:bg-gray-600/50"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FileListCard({file,activeFile,onClick}:{file: {fileName: string, fileId: string},activeFile:string | null,onClick:any}){
  return(
    <div onClick={()=>{
      // console.log("clicked",file.fileId[0])
      if(activeFile==file.fileId){
        onClick("")
      }else{
        onClick(file.fileId[0])
      }
      }} className={`cursor-pointer truncate border rounded p-3 items-center  gap-4 flex ${activeFile == file.fileId && "border-white border-2"}`}>
      <div>
        <File />
      </div>
      <div>
        {file.fileName}
      </div>
    </div>
  )
}
