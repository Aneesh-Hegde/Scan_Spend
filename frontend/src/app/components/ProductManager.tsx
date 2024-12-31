"use client"
import React, { useState } from 'react';
import api from '../utils/api'
interface UploadProps {
  onFileUpload: (filename: string) => void;
}

const Upload: React.FC<UploadProps> = ({ onFileUpload }) => {
  const [uploadMessage, setUploadMessage] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload', {
        body: formData,
      });

      const data = response.data;
      setUploadMessage(data.message);
      if (data.status === 'success') {
        onFileUpload(data.filename);
      }
    } catch (error) {
      setUploadMessage('Error uploading file.');
    }
  };

  return (
    <div>
      <h3>Upload File</h3>
      <input type="file" onChange={handleFileUpload} />
      {uploadMessage && <p>{uploadMessage}</p>}
    </div>
  );
};

export default Upload;

