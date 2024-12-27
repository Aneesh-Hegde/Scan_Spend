
import React, { useEffect, useState } from 'react'

const Upload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string>('')
  const [filesNames, setFilesName] = useState<string[]>([])
  useEffect(() => {
    const getFileNames = async () => {
      const res = await fetch("http://localhost:1323/")
      const fileNames = await res.json()
      setFilesName(fileNames.files || [])

    }
    getFileNames()
  }, [uploadMessage])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0])
      setUploadMessage('') // Reset message when a file is selected
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage('Please select a file before uploading.')
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch('http://localhost:1323/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setUploadMessage(`File uploaded successfully: ${data.filename}`)
      } else {
        setUploadMessage(`Error: ${data.message}`)
      }
    } catch (error) {
      setUploadMessage(`Upload failed: ${error}`)
    }
  }

  return (
    <div>
      <h2>Upload the file</h2>
      <input type='file' onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      {uploadMessage && <p>{uploadMessage}</p>} {/* Display message */}
      {filesNames.length > 0 ? (
        <ul>
          {filesNames.map((file, index) => (
            <li key={index}>{file}</li>
          ))}
        </ul>
      ) : (
        <p>No files uploaded yet.</p>
      )}
    </div>
  )
}

export default Upload

