"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  Clock,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";

// Mock data
const fileAnalytics = {
  fileName: "security_audit_2023.pdf",
  fileSize: "2.5 MB",
  lastEdited: "2023-09-15",
  pageCount: 42,
  author: "Security Team",
  createdAt: "2023-09-01",
};

export default function Analyze() {
  const backendUrl = "https://a44a-2406-7400-c8-676b-428c-454c-386e-3fb9.ngrok-free.app";

  //get the url
  const url = usePathname();
  const id = url.split("/").pop();

  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const chatEndRef = useRef(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [keyFindings, setKeyFindings] = useState(null);
  const [isLoadingVulnerabilities, setIsLoadingVulnerabilities] = useState(false);
  const [isLoadingKeyFindings, setIsLoadingKeyFindings] = useState(false);
  const [summary, setSummary] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  useEffect(() => {
    const fetchVulnerabilities = async () => {
      setIsLoadingVulnerabilities(true);
      try {
        const response = await fetch(`${backendUrl}/vulnerabilities`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Vulnerabilities data:", data);
        setVulnerabilities(data.vulnerabilities);
      } catch (error) {
        console.error("Error fetching vulnerabilities:", error);
      } finally {
        setIsLoadingVulnerabilities(false);
      }
    };

    const fetchKeyFindings = async () => {
      setIsLoadingKeyFindings(true);
      try {
        const response = await fetch(`${backendUrl}/keyfindings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Key findings data:", data);
        setKeyFindings(data.findings);
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
          body: JSON.stringify({ id }),
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

    if (id) {
      fetchVulnerabilities();
      fetchKeyFindings();
      fetchSummary();
    }
  }, [id, backendUrl]);

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      const newUserMessage = { role: "user", content: inputMessage };
      setChatMessages([...chatMessages, newUserMessage]);
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
            history: chatMessages,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const newBotMessage = { role: "bot", content: data.response };
        setChatMessages((prevMessages) => [...prevMessages, newBotMessage]);
      } catch (error) {
        console.error("Error sending chat message:", error);
        // Optionally, you can add an error message to the chat
        setChatMessages((prevMessages) => [
          ...prevMessages,
          { role: "bot", content: "Sorry, there was an error processing your request." },
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

  return (
    <div className="min-h-screen dark:bg-[] bg-white text-black flex flex-col lg:flex-row">
      {/* Chatbot Section */}
      <div className="lg:w-1/2 p-4 flex flex-col h-screen">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Cpu className="mr-2 h-6 w-6" />
          CyberStrike AI Assistant
        </h2>
        <div className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-100 rounded-lg">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`mb-2 ${msg.role === "user" ? "text-right" : "text-left"}`}>
              <span
                className={`inline-block p-2 rounded-lg ${
                  msg.role === "user" ? "bg-black text-white" : "bg-gray-200"
                }`}
              >
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      return (
                        <code className="bg-gray-300 px-1 rounded" {...props}>
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
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
              <div
                className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="flex">
          <Input
            type="text"
            placeholder="Ask about the security audit..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-grow mr-2"
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Analysis Section */}
      <div className="lg:w-1/2 p-4 overflow-y-auto h-screen">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>File Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-4">
              <File className="w-24 h-24 text-gray-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FileInfoItem icon={<FileText />} label="File Name" value={fileAnalytics.fileName} />
              <FileInfoItem icon={<Search />} label="File Size" value={fileAnalytics.fileSize} />
              <FileInfoItem
                icon={<AlertTriangle />}
                label="Last Edited"
                value={fileAnalytics.lastEdited}
              />
              <FileInfoItem
                icon={<FileText />}
                label="Page Count"
                value={fileAnalytics.pageCount.toString()}
              />
              <FileInfoItem icon={<Cpu />} label="Author" value={fileAnalytics.author} />
              <FileInfoItem
                icon={<Calendar />}
                label="Created At"
                value={fileAnalytics.createdAt}
              />
            </div>
          </CardContent>
        </Card>

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

        {activeTab === "summary" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="mr-2 h-6 w-6" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <div className="flex justify-center items-center h-40">
                  <Loader className="h-8 w-8 animate-spin" />
                </div>
              ) : summary ? (
                <div className="prose dark:prose-invert">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              ) : (
                <p>No summary available.</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "findings" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-6 w-6" />
                Key Findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingKeyFindings ? (
                <div className="flex justify-center items-center h-40">
                  <Loader className="h-8 w-8 animate-spin" />
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
                                  <li key={j}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="ml-2">{String(value)}</span>
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

        {activeTab === "vulnerabilities" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="mr-2 h-6 w-6" />
                Vulnerabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingVulnerabilities ? (
                <div className="flex justify-center items-center h-40">
                  <Loader className="h-8 w-8 animate-spin" />
                </div>
              ) : vulnerabilities.length > 0 ? (
                vulnerabilities.map((vuln, index) => (
                  <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-stretch mb-5">
                      <div className={`w-2 mr-4 ${getCriticalityColor(vuln.criticality)}`}></div>
                      <h3 className="text-xl font-semibold flex-grow font">
                        <ReactMarkdown
                          components={{
                            code({ node, inline, className, children, ...props }) {
                              return (
                                <code className="bg-gray-200 px-1 rounded" {...props}>
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
                        indicatorClassName={getCriticalityColor(vuln.criticality)}
                      />
                    </div>
                    <p className="mb-2">
                      <strong>Reasoning:</strong>
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            return (
                              <code className="bg-gray-200 px-1 rounded" {...props}>
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
                          code({ node, inline, className, children, ...props }) {
                            return (
                              <code className="bg-gray-200 px-1 rounded" {...props}>
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
  );
}

function getCriticalityColor(score: number) {
  if (score >= 8) return "bg-red-500";
  if (score >= 5) return "bg-yellow-500";
  return "bg-green-500";
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
        <div className="text-sm text-gray-500">{label}</div>
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
        active ? "bg-black text-white" : "bg-gray-200 text-black hover:bg-gray-300"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
