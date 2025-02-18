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
import { Metadata } from 'grpc-web';
import Cookies from 'js-cookie';

const Page: React.FC = () => {
  const [files, setFiles] = useState<string[]>([]); // To store the list of filenames
  const [products, setProducts] = useState<Product[]>([]); // To store the products data
  const [filename, setFilename] = useState<string>(''); // To store the selected filename
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Fetch list of all filenames from the backend when component mounts
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        //get the refresh_token of the user 
        const response = await api.get("/get-refresh-token", { withCredentials: true, })
        const refresh_token: string = response.data.refresh_token

        getAllFiles(refresh_token);

      } catch (error) {
        console.log(error)
        toast.error('Error fetching filenames');
      }

    }
    fetchFiles();
  }, []);

  const getAllFiles = async (refresh_token: string) => {
    //grpc call to get all files of the users
    const request = new GetFileByUser()
    let token: string | null = localStorage.getItem("token")
    request.setToken(token ? token : "")
    try {
      let requestmetadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refresh_token }
      const call = fileclient.getAllFiles(request, requestmetadata, (error: any, response: FileList) => {
        if (error) {
          console.log(error)
        }
        const allFile: File[] = response.getAllfilesList()
        const filenames: string[] = allFile.map(ele => ele.getFilename())
        setFiles(filenames)
        toast.success("Files extracted successfully")
      })
      call.on("metadata", (metadata) => {
        console.log(metadata)
        if (metadata["token"]) {
          token = metadata["token"]
          localStorage.setItem("token", token)
          Cookies.set("token",token)
          request.setToken(token)
          requestmetadata = { 'authentication': `Bearer ${token}`, "refresh_token": refresh_token }
          fileclient.getAllFiles(request, requestmetadata, (error: any, response: FileList) => {
            if (error) {
              console.log(error)
            }
            const allFile: File[] = response.getAllfilesList()
            const filenames: string[] = allFile.map(ele => ele.getFilename())
            setFiles(filenames)
            toast.success("Files extracted successfully")
          })
        }

      })
    } catch (error) {
      console.log(error)
      toast.error('Error fetching filenames');
    }
  }

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

