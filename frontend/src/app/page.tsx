"use client"
import React, { useState, useEffect } from 'react';
import Upload from './components/Upload';
import ProductList from './components/ProductList';
import { toast, ToastContainer } from 'react-toastify';  // Import ToastContainer
import 'react-toastify/dist/ReactToastify.css';  // Import Toastify CSS
import api from './utils/api'

interface Product {
  product_name: string;
  quantity: string;
  amount: string;
  category: string;
}

const Page: React.FC = () => {
  const [files, setFiles] = useState<string[]>([]); // To store the list of filenames
  const [products, setProducts] = useState<Product[]>([]); // To store the products data
  const [filename, setFilename] = useState<string>(''); // To store the selected filename

  // Fetch list of all filenames from the backend when component mounts
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await api.get('http://localhost:1323/');
        const data = response.data;
        setFiles(data.files); // Assuming the response has a "files" array
      } catch (error) {
        toast.error('Error fetching filenames');
      }
    };

    fetchFiles();
  }, []); // This effect runs once when the component mounts

  // Update the file list when a new file is uploaded
  const handleFileUpload = async () => {
    try {
      // Triggering the file list refresh after upload
      const response = await api.get('http://localhost:1323/');
      const data = response.data;
      setFiles(data.files); // Updating the files list with the latest data from the backend
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Error updating file list');
    }
  };

  // Fetch product data when a filename is clicked
  const handleFileClick = async (filename: string) => {
    setFilename(filename);
    try {
      const response = await api.post(`/get-text/${filename}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.data

      if (data && data.product) {
        setProducts(data.product); // Assuming the response has a "product" field
        toast.success('Products extracted successfully');
      } else {
        toast.error('Failed to extract products');
      }
    } catch (error) {
      toast.error('Error fetching product data');
    }
  };

  return (
    <div>
      <Upload onFileUpload={handleFileUpload} /> {/* Passing file upload handler to Upload component */}

      <div>
        <h3>Available Files</h3>
        <ul>
          {files.length === 0 ? (
            <p>No files available</p>
          ) : (
            files.map((file, index) => (
              <li key={index}>
                <button onClick={() => handleFileClick(file)}>
                  {file}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div>
        <h3>Uploaded Products</h3>
        {products.length === 0 ? (
          <p>No products to display</p>
        ) : (
          <ProductList products={products} onEdit={(product) => console.log('Edit', product)} />
        )}
      </div>

      {/* ToastContainer is added here */}
      <ToastContainer />
    </div>
  );
};

export default Page;

