"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader, Clock, GripVertical, Trash2 } from "lucide-react";
import { Button, RainbowButton, FileUpload } from "@/components/ui";

export default function Page() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== "undefined") {
      return Math.max(window.innerWidth * 0.3, 500);
    }
    return 500;
  });
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const storedFiles = localStorage.getItem("uploadedFiles");
    if (storedFiles) {
      setUploadedFiles(JSON.parse(storedFiles));
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 150 && newWidth < document.body.clientWidth * 0.7) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleFileUpload = (uploadedFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...uploadedFiles]);
    console.log(uploadedFiles);
  };

  const handleUpload = async () => {
    if (files.length > 0 && !isLoading) {
      setIsLoading(true);
      try {
        const filesData = await Promise.all(
          files.map(async (file) => ({
            file: await convertToBase64(file),
            filename: file.name,
          }))
        );

        const response = await fetch(backendUrl + "/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files: filesData }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.ids && data.ids.length > 0) {
            const newFiles: UploadedFile[] = files.map((file, index) => ({
              id: data.ids[index],
              filename: file.name,
              timestamp: Date.now(),
            }));
            const updatedFiles = [...newFiles, ...uploadedFiles].slice(0, 10);
            setUploadedFiles(updatedFiles);
            console.log(uploadedFiles);
            // localStorage.setItem("uploadedFiles", JSON.stringify(updatedFiles));
            await localStorage.setItem("responseFromBackend", "");
            await localStorage.setItem("responseFromBackend", JSON.stringify(data));
            router.push(`/analyze2/${data.user}`);
          } else {
            console.error("Response does not contain ids");
          }
        } else {
          console.error("Upload failed");
        }
      } catch (error) {
        console.error("Error during upload:", error);
      } finally {
        setIsLoading(false);
        setFiles([]);
      }
    }
  };

  const handlePastFileClick = (id: string) => {
    router.push(`/analyze/${id}`);
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result?.toString().split(",")[1];
        if (base64String) {
          resolve(base64String);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const groupFilesByDate = (files: UploadedFile[]) => {
    const grouped = files.reduce((acc, file) => {
      const date = new Date(file.timestamp).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(file);
      return acc;
    }, {} as Record<string, UploadedFile[]>);

    return Object.entries(grouped).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    );
  };

  const clearHistory = () => {
    setUploadedFiles([]);
    localStorage.removeItem("uploadedFiles");
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-72px)] bg-white dark:bg-[#0a0a0a] text-black dark:text-white">
      <div className="flex-1  flex flex-col md:overflow-hidden">
        <div className="flex-grow overflow-y-auto ">
          <div className="min-h-screen p-4 flex flex-col justify-center items-center">
            <div className="w-full max-w-md mx-auto">
              <div className="w-full max-w-4xl mx-auto min-h-96 overflow-auto border-dashed border-4 bg-white dark:bg-[#0a0a0a] border-neutral-200 dark:border-neutral-800 rounded-lg">
                <FileUpload onChange={handleFileUpload} />
              </div>
              {/* <div className="mt-4">
                {files.map((file, index) => (
                  <p key={index} className="text-sm">{file.name}</p>
                ))}
              </div> */}
              <RainbowButton
                className={`w-full mt-8 transition-colors p-4 rounded-xl flex items-center justify-center ${
                  isLoading || files.length === 0
                    ? "border text-gray-600 cursor-not-allowed"
                    : "bg-black text-white hover:bg-gray-800"
                }`}
                onClick={handleUpload}
                disabled={files.length === 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : files.length > 0 ? (
                  `Analyze ${files.length} Security Audit${files.length > 1 ? "s" : ""}`
                ) : (
                  "Upload Files to Begin"
                )}
              </RainbowButton>
            </div>
          </div>

          <div className="md:hidden bg-gray-100 dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 bg-gray-100 dark:bg-[#0a0a0a] z-10">
              <div className="flex items-center justify-between p-4">
                <h2 className="text-xl font-bold flex items-center">
                  <GripVertical className="mr-2" size={20} />
                  Recent Files
                </h2>
                <Button
                  onClick={clearHistory}
                  variant="ghost"
                  size="icon"
                  className="hover:bg-gray-200 dark:hover:bg-gray-800"
                >
                  <Trash2 size={20} />
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto">
              {groupFilesByDate(uploadedFiles).map(([date, files]) => (
                <div key={date} className="mb-6">
                  <h3 className="text-xs font-semibold px-4 py-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {date}
                  </h3>
                  {files.map((uploadedFile) => (
                    <div
                      key={uploadedFile.id}
                      className="m-4 p-4 bg-gray-200/50 dark:bg-gray-300/5 rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => handlePastFileClick(uploadedFile.id)}
                    >
                      <p className="font-semibold truncate text-lg">{uploadedFile.filename}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(uploadedFile.timestamp).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                        {/* <p className="text-xs text-gray-500 dark:text-gray-500">
                          ID: {uploadedFile.id.slice(0, 8)}...
                        </p> */}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="hidden md:block w-1 cursor-col-resize bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />

      <div
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px` }}
        className="hidden md:flex md:flex-shrink-0 bg-gray-100 dark:bg-[#0a0a0a] border-l border-gray-200 dark:border-gray-700 flex-col"
      >
        <div className="sticky top-0 bg-gray-100 dark:bg-[#0a0a0a] z-10">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-xl font-bold flex items-center">
              <GripVertical className="mr-2" size={20} />
              Recent Files
            </h2>
            <Button
              onClick={clearHistory}
              variant="ghost"
              size="icon"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Trash2 size={20} />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groupFilesByDate(uploadedFiles).map(([date, files]) => (
            <div key={date} className="mb-6">
              <h3 className="text-xs font-semibold px-4 py-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {date}
              </h3>
              {files.map((uploadedFile) => (
                <div
                  key={uploadedFile.id}
                  className="m-4 p-4 bg-gray-200/50 dark:bg-gray-300/5 rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handlePastFileClick(uploadedFile.id)}
                >
                  <p className="font-semibold truncate text-lg">{uploadedFile.filename}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(uploadedFile.timestamp).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                    {/* <p className="text-xs text-gray-500 dark:text-gray-500">
                      ID: {uploadedFile.id.slice(0, 8)}...
                    </p> */}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface UploadedFile {
  id: string;
  filename: string;
  timestamp: number;
}
