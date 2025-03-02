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
import { useRouter } from 'next/navigation';
import { default as FileLists } from './components/Filelist';

const Page: React.FC = () => {
  const [files, setFiles] = useState<string[]>([]); // To store the list of filenames
  const [products, setProducts] = useState<Product[]>([]); // To store the products data
  const [filename, setFilename] = useState<string>(''); // To store the selected filename
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const router = useRouter()
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
        router.push('/login')
      }

    }
    fetchFiles();
  }, []);

  const getAllFiles = async (refresh_token: string) => {
    //grpc call to get all files of the users
    const request = new GetFileByUser()
    let token: string | null = localStorage.getItem("token")
    console.log(token)
    try {
      let requestmetadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refresh_token }
      const call = fileclient.getAllFiles(request, requestmetadata, (error: any, response: FileList) => {
        if (error) {
          console.log(error)
          if (error.code === 16) {
            router.push('/login')
          }
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
          Cookies.set("token", token)
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
    HandleProductSave(products, filename,setProducts)
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Upload Files & Manage Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Upload onFileUpload={(filename) => HandleFileUpload(filename, setFiles)} />
          <FileLists files={files} onFileClick={(clickedfile) => HandleFileClick({ filename: clickedfile, filestate: setFilename, productstate: setProducts })} />
        </div>
        <div>
          <ProductList products={products} onUpdate={handleUpdate} onSave={handleSave} />
        </div>
      </div>
      <ToastContainer />
    </div>
  )
};

export default Page;

