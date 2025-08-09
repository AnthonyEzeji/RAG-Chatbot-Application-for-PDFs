"use client"
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Upload, FileText, MessageSquare, User, LogOut, Plus, FileIcon, Trash2 } from 'lucide-react';
import Chat from "./components/Chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

export default function Home() {
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState(null);
    const [files, setFiles] = useState([]);
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [uploadError, setUploadError] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState("");
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [authChecking, setAuthChecking] = useState(true);
    const [deleting, setDeleting] = useState(null); // fileId being deleted

    const router = useRouter();

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = () => {
            try {
                const token = localStorage.getItem('token');
                const userData = localStorage.getItem('user');
                
                if (!token || !userData) {
                    setAuthChecking(false);
                    router.push('/auth/login');
                    return;
                }
                
                setUser(JSON.parse(userData));
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Auth check error:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/auth/login');
            } finally {
                setAuthChecking(false);
            }
        };

        checkAuth();
    }, []); // Remove router dependency to prevent infinite re-renders

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
    }, [isAuthenticated]); // Remove router dependency to prevent infinite re-renders

    const handleUploadFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'application/pdf') {
                setUploadError("Please select a PDF file");
                return;
            }
            if (selectedFile.size > 10 * 1024 * 1024) {
                setUploadError("File size must be less than 10MB");
                return;
            }
            setFile(selectedFile);
            setUploadError("");
        }
    };

    const handleSelectedFile = (fileId) => {
        setSelectedFileId(fileId);
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
                document.querySelector('input[type="file"]').value = '';
                
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/auth/login');
    };

    const handleDeleteFile = async (fileId, fileName) => {
        if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
            return;
        }

        setDeleting(fileId);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5050/files/${fileId}`, {
                method: "DELETE",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();

            if (response.ok) {
                // Remove file from local state
                setFiles(prevFiles => prevFiles.filter(file => file._id !== fileId));
                
                // Clear selection if deleted file was selected
                if (selectedFileId === fileId) {
                    setSelectedFileId(null);
                }
                
                setUploadSuccess(`File "${data.fileName}" deleted successfully!`);
                
                // Clear success message after 3 seconds
                setTimeout(() => setUploadSuccess(""), 3000);
            } else {
                setUploadError(data.message || "Failed to delete file");
                setTimeout(() => setUploadError(""), 5000);
            }
        } catch (error) {
            console.error("Delete error:", error);
            setUploadError("Network error occurred during deletion");
            setTimeout(() => setUploadError(""), 5000);
        } finally {
            setDeleting(null);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (authChecking || !isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <MessageSquare className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-bold">RAG Assistant</h1>
                            </div>
                        </div>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>
                                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <div className="flex flex-col space-y-1 p-2">
                                    <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                                </div>
                                <Separator />
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
                    {/* Left Column - File Management */}
                    <div className="w-full lg:col-span-2 space-y-4 sm:space-y-6">
                        {/* Upload Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Upload className="h-5 w-5" />
                                    <span>Upload Document</span>
                                </CardTitle>
                                <CardDescription>
                                    Upload a PDF document to chat with its content
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleUploadFileChange}
                                        className="cursor-pointer"
                                    />
                                </div>
                                
                                {uploadError && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{uploadError}</AlertDescription>
                                    </Alert>
                                )}
                                
                                {uploadSuccess && (
                                    <Alert>
                                        <AlertDescription className="text-green-700">{uploadSuccess}</AlertDescription>
                                    </Alert>
                                )}
                                
                                <Button 
                                    onClick={handleUpload} 
                                    disabled={!file || uploading}
                                    className="w-full"
                                >
                                    {uploading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Upload Document
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Files List */}
                        <Card className="w-full overflow-hidden">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <FileText className="h-5 w-5" />
                                    <span>Your Documents</span>
                                </CardTitle>
                                <CardDescription>
                                    Select a document to start chatting
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 w-full max-w-full">
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-80 w-full">
                                        <div className="pr-4 max-w-full">
                                            {files.length === 0 ? (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    <FileIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">No documents uploaded yet</p>
                                                </div>
                                            ) : (
                                                                                                    <div className="space-y-1.5">
                                                    {files.map((file) => (
                                                    <Card 
                                                        key={file._id}
                                                        className={`w-full max-w-full transition-all hover:shadow-md ${
                                                            file._id === selectedFileId 
                                                                ? "ring-2 ring-primary bg-primary/5" 
                                                                : "hover:bg-muted/50"
                                                        }`}
                                                    >
                                                        <CardContent className="p-2 sm:p-3 w-full overflow-hidden">
                                                            <div className="flex items-center gap-2 w-full">
                                                                <div 
                                                                    className="flex-1 min-w-0 cursor-pointer"
                                                                    onClick={() => handleSelectedFile(file._id)}
                                                                >
                                                                    <p className="font-medium text-sm truncate mb-1" title={file.fileName}>{file.fileName}</p>
                                                                    <div className="flex items-center space-x-1 flex-wrap">
                                                                        <Badge variant="secondary" className="text-xs h-4 px-1.5">
                                                                            {formatFileSize(file.fileSize)}
                                                                        </Badge>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {new Date(file.uploadedAt).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-shrink-0 w-8 flex justify-center">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteFile(file._id, file.fileName);
                                                                        }}
                                                                        disabled={deleting === file._id}
                                                                        className="h-6 w-6 p-0 border border-red-400 bg-red-100 text-red-700 hover:bg-red-600 hover:text-white flex-shrink-0"
                                                                        title="Delete document"
                                                                    >
                                                                        {deleting === file._id ? (
                                                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                                                        ) : (
                                                                            <Trash2 className="h-3 w-3" />
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Chat */}
                    <div className="w-full lg:col-span-3">
                        <Chat selectedFileId={selectedFileId} />
                    </div>
                </div>
            </div>
        </div>
    );
}
