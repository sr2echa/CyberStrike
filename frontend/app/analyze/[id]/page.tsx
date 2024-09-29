"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data
const fileAnalytics = {
  fileName: "security_audit_2023.pdf",
  fileSize: "2.5 MB",
  lastEdited: "2023-09-15",
  pageCount: 42,
  author: "Security Team",
  createdAt: "2023-09-01",
};

const summary =
  "The security audit reveals several critical vulnerabilities that require immediate attention. Key areas of concern include insufficient penetration testing, inadequate cybersecurity resources, and a lack of comprehensive employee training. The organization also faces risks from third-party service providers and outdated firewall rules. Implementing the suggested mitigations will significantly improve the overall security posture.";

const keyFindings = {
  "Threat Landscape": {
    "Emerging Threats": {
      description: "New and evolving cyber threats pose significant risks",
      examples: ["AI-powered attacks", "Quantum computing threats"],
      impact: "Potential for unprecedented data breaches and system compromises",
    },
    "Attack Vectors": {
      common_methods: ["Sophisticated phishing campaigns", "Supply chain attacks"],
      trends: "Increasing use of AI in social engineering and automated attacks",
    },
  },
  Vulnerabilities: {
    "Critical Issues": {
      top_vulnerabilities: ["Unpatched systems", "Weak access controls"],
      mitigation_strategies: "Implement robust patch management and zero-trust architecture",
    },
  },
  "Incident Response": {
    "Recent Incidents": {
      description: "Analysis shows a 20% increase in attempted breaches",
      response_effectiveness: "Current response time averages 4 hours, needs improvement",
    },
  },
  "Emerging Technologies": {
    Impact: {
      description: "Cloud migration introduces new security challenges",
      associated_risks: ["Data sovereignty issues", "Misconfigured cloud services"],
    },
  },
  "Compliance and Regulatory Issues": {
    Challenges: {
      description: "Keeping up with rapidly evolving global privacy laws",
      regulatory_updates: "GDPR fines increased, new US state privacy laws enacted",
    },
  },
};

const vulnerabilities = [
  {
    vulnerability: "Unpatched software with known exploits",
    criticality_score: 9,
    reasoning: "Easily exploitable and can lead to full system compromise",
    mitigation: "Implement regular patching schedule and vulnerability scanning",
  },
  {
    vulnerability: "Weak password policies",
    criticality_score: 8,
    reasoning: "Increases risk of unauthorized access and account takeovers",
    mitigation: "Enforce strong password requirements and multi-factor authentication",
  },
  {
    vulnerability: "Insufficient network segmentation",
    criticality_score: 7,
    reasoning: "Allows lateral movement once initial access is gained",
    mitigation: "Implement proper network segmentation and access controls",
  },
  {
    vulnerability: "Lack of employee security awareness training",
    criticality_score: 8,
    reasoning: "Employees are often the weakest link in security",
    mitigation: "Conduct regular security awareness training and phishing simulations",
  },
  {
    vulnerability: "Insecure third-party integrations",
    criticality_score: 7,
    reasoning: "Can provide backdoor access to systems and data",
    mitigation: "Regularly audit and secure third-party integrations and APIs",
  },
];

export default function analyze() {
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const chatEndRef = useRef(null);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      setChatMessages([...chatMessages, { text: inputMessage, sender: "user" }]);
      setInputMessage("");
      setIsLoading(true);
      // Simulate AI response
      setTimeout(() => {
        setChatMessages((prev) => [...prev, { text: inputMessage, sender: "ai" }]);
        setIsLoading(false);
      }, 1500);
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
    <div className="min-h-screen bg-white text-black flex flex-col lg:flex-row">
      {/* Chatbot Section */}
      <div className="lg:w-1/2 p-4 flex flex-col h-screen">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Cpu className="mr-2 h-6 w-6" />
          CyberStrike AI Assistant
        </h2>
        <div className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-100 rounded-lg">
          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className={`mb-2 ${msg.sender === "user" ? "text-right" : "text-left"}`}
            >
              <span
                className={`inline-block p-2 rounded-lg ${
                  msg.sender === "user" ? "bg-black text-white" : "bg-gray-200"
                }`}
              >
                {msg.text}
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
          <Button onClick={handleSendMessage}>
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
            <CardContent>{summary}</CardContent>
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
              {Object.entries(keyFindings).map(([category, data], index) => (
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
              ))}
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
              {vulnerabilities.map((vuln, index) => (
                <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2 flex items-center">
                    <span
                      className={`inline-block w-4 h-4 rounded-full mr-2 ${getCriticalityColor(
                        vuln.criticality_score
                      )}`}
                    ></span>
                    {vuln.vulnerability}
                  </h3>
                  <p className="mb-2">
                    <strong>Criticality Score:</strong> {vuln.criticality_score}
                  </p>
                  <p className="mb-2">
                    <strong>Reasoning:</strong> {vuln.reasoning}
                  </p>
                  <p>
                    <strong>Mitigation:</strong> {vuln.mitigation}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
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

function getCriticalityColor(score: number) {
  if (score >= 8) return "bg-red-500";
  if (score >= 5) return "bg-yellow-500";
  return "bg-green-500";
}
