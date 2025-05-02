"use client"
import Image from "next/image";
import { useEffect, useState } from "react";
import {useRouter} from 'next/navigation'
import io from "socket.io-client";
import Chat from "./components/Chat";
import Socket from "./components/Socket"
import { ClipLoader } from "react-spinners"
export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState(null);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [uploadUrl, setUploadUrl] = useState("");

const router = useRouter()
  useEffect(() => {
    const fetchFiles = async () => {
      try {
          const resposne = await fetch('http://localhost:5050/files',{
            method: "GET",
            headers:{"Authorization":`Bearer ${localStorage.getItem('token')}`}
        })
        if(resposne.status === 200){
          const data = await resposne.json()
          setFiles(data)
          console.log(data)
        }
        
      } catch (error) {
          console.error("Error fetching data:", error);
      }
  };

  fetchFiles(); // Call the async function inside useEffect

    return () => {
      
    }
  }, []);
  useEffect(() => {
   
    const fetchData = async ()=>{
      try {
        if(selectedFileId!==null){
          const response = await fetch(`http://localhost:5050/files/${selectedFileId}`,
          {
            method:"GET",
            headers:{"Authorization":`Bearer ${localStorage.getItem('token')}`}
          })
          const data = await response.json()
          console.log("this bladjjc",data)
        }
      } catch (error) {
        console.log(error)
      }
      
    }
  
    fetchData()
  }, [selectedFileId]);
  useEffect(() => {
    console.log("Current selectedFileId:", selectedFileId);
}, [selectedFileId]);
  
  const handleUploadFileChange = (e) => {
    if (e.target.files) setFile(e.target.files[0]);
  };
const handleSelectedFile = (e)=>{
  setSelectedFileId(e.currentTarget.id)
  console.log(e.currentTarget.id)
}
const handleUpload = async () => {
  if (!file) return;
  setUploading(true); // ✅ Show loading state

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("http://localhost:5050/files/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` },
      body: formData,
  });

  const data = await response.json();
  setUploading(false); // ✅ Hide loading state once uploaded
  if (response.status === 200){
    router.refresh()
  } 
};
  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 bg-gray-900 text-white">
            
    {/* ✅ Upload Section */}
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-800 rounded-lg shadow-lg w-full max-w-lg">
        <h2 className="text-lg font-semibold text-gray-300">Upload PDF</h2> 
        <input
            type="file"
            onChange={handleUploadFileChange}
            className="block w-full text-sm text-gray-300 border border-gray-600 rounded-lg cursor-pointer bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <button 
            onClick={handleUpload} 
            className="px-5 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition focus:ring-2 focus:ring-blue-500 flex items-center"
        >
            {uploading && <ClipLoader color="white" size={20} className="mr-2" />} 
            Upload 🚀
        </button>

        {uploadUrl && (
            <p className="text-sm text-green-400">
                File uploaded: <a href={uploadUrl} className="underline text-blue-400">{uploadUrl}</a>
            </p>
        )}
    </div>

    {/* ✅ Scrollable File List */}
    <div className="w-full max-w-lg p-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Uploaded Files</h2>
        <div className="h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-800 rounded-lg p-2">
            <ul className="space-y-3">
                {files?.map((file, fileIdx) => {
                  if (file._id === selectedFileId){
                    return(  <li 
                      key={fileIdx} 
                      id={file._id.toString()} 
                      onClick={handleSelectedFile} 
                      className="p-2 bg-blue-600 hover:bg-blue-300  hover:text-black cursor-pointer transition rounded-lg"
                  >
                      {file.fileName}
                  </li>)
                  }else{
                    return(  <li 
                      key={fileIdx} 
                      id={file._id.toString()} 
                      onClick={handleSelectedFile} 
                      className="p-2 bg-gray-700 hover:bg-blue-300 hover:text-black cursor-pointer transition rounded-lg"
                  >
                      {file.fileName}
                  </li>)
                  }
                })}
            </ul>
        </div>
    </div>

    {/* ✅ Chat Section */}
    <Chat key={selectedFileId} selectedFileId={selectedFileId} />
</div>

  );
}
