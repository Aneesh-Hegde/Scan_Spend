"use client"
import React, { useState, useEffect } from 'react';
import Upload from './components/Upload';
import ProductList from './components/ProductList';
import { toast, ToastContainer } from 'react-toastify';  // Import ToastContainer
import 'react-toastify/dist/ReactToastify.css';  // Import Toastify CSS
import api from './utils/api'
import EditProductForm from './components/EditProductForm';
import { Product } from './types/types'
import HandleFileUpload from './utils/handleFileUpload';
import HandleFileClick from './utils/handleFileClick';
import HandleUpdate from './utils/handleUpdate';
import HandleProductSave from './utils/handleProductSave';
import fileclient from './utils/fileClient';
import { GetFileByUser, File, FileList } from './grpc_schema/file_pb'

const Page: React.FC = () => {
  const [files, setFiles] = useState<string[]>([]); // To store the list of filenames
  const [products, setProducts] = useState<Product[]>([]); // To store the products data
  const [filename, setFilename] = useState<string>(''); // To store the selected filename
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Fetch list of all filenames from the backend when component mounts
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const request = new GetFileByUser()
        const token: string | null = localStorage.getItem("token")
        request.setToken(token ? token : "")
        fileclient.getAllFiles(request, {}, (error: any, response: FileList) => {
          if (error) {
            console.log(error)
          }
          const allFile: File[] = response.getAllfilesList()
          const filenames: string[] = allFile.map(ele => ele.getFilename())
          setFiles(filenames)
          toast.success("Files extracted successfully")
        })
      } catch (error) {
        toast.error('Error fetching filenames');
      }
    };

    fetchFiles();
  }, []); // This effect runs once when the component mounts

  const handleUpdate = (updatedProduct: Product) => {
    HandleUpdate({ updatedProduct, setProducts, setEditingProduct })
  }
  const handleSave = () => {
    HandleProductSave(products, filename)
  }

  return (
    <div>
      <Upload onFileUpload={(filename) => HandleFileUpload(filename, setFiles)} /> {/* Passing file upload handler to Upload component */}

      <div>
        <h3>Available Files</h3>
        <ul>
          {files.length === 0 ? (
            <p>No files available</p>
          ) : (
            files.map((file, index) => (
              <li key={index}>
                <button onClick={() => HandleFileClick({
                  filename: file,
                  filestate: setFilename,
                  productstate: setProducts
                })}>
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
          <ProductList products={products} onUpdate={handleUpdate} saveProduct={handleSave} />

        )}
      </div>
      <ToastContainer />
    </div>
  );
};

export default Page;

