"use client"
import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface UploadProps {
  onFileUpload: (filename: string) => void;
}

const Upload: React.FC<UploadProps> = ({ onFileUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      toast.error('No file selected');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await fetch('http://localhost:1323/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'success') {
        onFileUpload(data.filename);
      } else {
        toast.error('File upload failed');
      }
    } catch (error) {
      toast.error('Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleFileUpload} disabled={loading}>
        {loading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
};

export default Upload;

