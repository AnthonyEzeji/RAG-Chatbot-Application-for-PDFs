"use client"
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import io from "socket.io-client";
import Chat from "./components/Chat";
import Socket from "./components/Socket";
import { ClipLoader } from "react-spinners";

export default function Home() {
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState(null);
    const [files, setFiles] = useState([]);
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [uploadError, setUploadError] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState("");
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const router = useRouter();

    // Check authentication on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/auth/login');
            return;
        }
        setIsAuthenticated(true);
    }, [router]);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchFiles = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                
                if (!token) {
                    router.push('/auth/login');
                    return;
                }

                const response = await fetch('http://localhost:5050/files', {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    router.push('/auth/login');
                    return;
                }

                if (response.ok) {
                    const data = await response.json();
                    setFiles(data);
                } else {
                    console.error("Failed to fetch files:", response.statusText);
                    setFiles([]);
                }
            } catch (error) {
                console.error("Error fetching files:", error);
                setFiles([]);
            } finally {
                setLoading(false);
            }
        };

        fetchFiles();
    }, [isAuthenticated, router]);

    const handleUploadFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Validate file type
            if (selectedFile.type !== 'application/pdf') {
                setUploadError("Please select a PDF file");
                return;
            }
            // Validate file size (10MB limit)
            if (selectedFile.size > 10 * 1024 * 1024) {
                setUploadError("File size must be less than 10MB");
                return;
            }
            setFile(selectedFile);
            setUploadError("");
        }
    };

    const handleSelectedFile = (e) => {
        setSelectedFileId(e.currentTarget.id);
        console.log("Selected file ID:", e.currentTarget.id);
    };

    const handleUpload = async () => {
        if (!file) {
            setUploadError("Please select a file first");
            return;
        }

        setUploading(true);
        setUploadError("");
        setUploadSuccess("");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const token = localStorage.getItem('token');
            const response = await fetch("http://localhost:5050/files/upload", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setUploadSuccess(`File "${data.fileName}" uploaded successfully! (${data.pageCount} pages processed)`);
                setFile(null);
                // Reset file input
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) fileInput.value = '';
                
                // Refresh file list
                const filesResponse = await fetch('http://localhost:5050/files', {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (filesResponse.ok) {
                    const filesData = await filesResponse.json();
                    setFiles(filesData);
                }
            } else {
                setUploadError(data.message || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            setUploadError("Network error occurred during upload");
        } finally {
            setUploading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <ClipLoader color="white" size={50} />
            </div>
        );
    }

    return (
        <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 bg-gray-900 text-white">
            
            {/* Upload Section */}
            <div className="flex flex-col items-center gap-4 p-6 bg-gray-800 rounded-lg shadow-lg w-full max-w-lg">
                <h2 className="text-lg font-semibold text-gray-300">Upload PDF</h2> 
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleUploadFileChange}
                    className="block w-full text-sm text-gray-300 border border-gray-600 rounded-lg cursor-pointer bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {uploadError && (
                    <p className="text-sm text-red-400">{uploadError}</p>
                )}
                
                {uploadSuccess && (
                    <p className="text-sm text-green-400">{uploadSuccess}</p>
                )}
                
                <button 
                    onClick={handleUpload} 
                    disabled={!file || uploading}
                    className="px-5 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition focus:ring-2 focus:ring-blue-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading && <ClipLoader color="white" size={20} className="mr-2" />} 
                    {uploading ? "Uploading..." : "Upload 🚀"}
                </button>
            </div>

            {/* File List */}
            <div className="w-full max-w-lg p-6 bg-gray-800 rounded-lg shadow-lg">
                <h2 className="text-lg font-semibold mb-4">Uploaded Files</h2>
                
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <ClipLoader color="white" size={30} />
                    </div>
                ) : (
                    <div className="h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-800 rounded-lg p-2">
                        {files.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">No files uploaded yet</p>
                        ) : (
                            <ul className="space-y-3">
                                {files.map((file, fileIdx) => (
                                    <li 
                                        key={file._id} 
                                        id={file._id.toString()} 
                                        onClick={handleSelectedFile} 
                                        className={`p-2 cursor-pointer transition rounded-lg ${
                                            file._id === selectedFileId 
                                                ? "bg-blue-600 hover:bg-blue-500" 
                                                : "bg-gray-700 hover:bg-blue-300 hover:text-black"
                                        }`}
                                    >
                                        <div className="font-medium">{file.fileName}</div>
                                        <div className="text-xs text-gray-400">
                                            {(file.fileSize / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {/* Chat Component */}
            <Chat key={selectedFileId} selectedFileId={selectedFileId} />
        </div>
    );
}
