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

  // Manual product form states
  const [productName, setProductName] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
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
      const requestmetadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refresh_token }
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
const handleSave = async () => {
    if (products.length === 0) {
      toast.warning("No products to save");
      return;
    }
    
    if (!filename) {
      toast.error("Please select or enter a file name");
      return;
    }
    
    try {
      await HandleProductSave(products, filename, setProducts);
      toast.success("Products saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving products:", error);
      toast.error("Failed to save products");
      return false;
    }
  };
 const handleManualSubmit =  async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("No authentication token found");
      setLoading(false);
      router.push('/login');
      return;
    }

    // Validate form inputs
    if (!productName || !quantity || !price || !category || !date ) {
      toast.error("All fields are required");
      setLoading(false);
      return;
    }

    // Validate quantity
    const quantityValue = parseInt(quantity);
    if (isNaN(quantityValue) || quantityValue <= 0) {
      toast.error("Quantity must be a valid positive integer");
      setLoading(false);
      return;
    }

    // Validate price
    const amountValue = parseFloat(price);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error("Price must be a valid positive number");
      setLoading(false);
      return;
    }

    // Validate category
    const categoryValue = parseInt(category);
    if (isNaN(categoryValue) || categoryValue <= 0) {
      toast.error("Category must be a valid positive integer");
      setLoading(false);
      return;
    }
const formatDateForDatabase = (dateString: string): string => {
  try {
    // Create a Date object from the input
    const date = new Date(dateString);

    // Ensure it's a valid date
    if (isNaN(date.getTime())) {
      return ""; // Invalid date
    }

    // Extract components
    const day = String(date.getDate()).padStart(2, '0'); // Day of the month
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = String(date.getFullYear()); // Last two digits of the year

    // Format as DD/MM/YY
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Date formatting error:", error);
    return "";
  }
};
const formattedDate = formatDateForDatabase(date);
if (!formattedDate) {
  toast.error("Invalid date format");
  setLoading(false);
  return;
}
    try {
      // Create new product object
      const newProduct: Product = {
        ID: "1", // Will be assigned by backend
        product_name: productName,
        quantity: quantityValue,
        amount: amountValue,
        Name: "manual-entry",
        category: categoryValue.toString(),
        Date: formattedDate,
      };

      // IMPORTANT: Direct save approach instead of updating state first
      const updatedProducts = [...products, newProduct];
      
      // Save directly with the updated products array
      await HandleProductSave(updatedProducts, "manual-entry", setProducts);
      
        toast.success("Product saved successfully");
        
        // Reset form fields on success
        setProductName("");
        setQuantity("");
        setPrice("");
        setCategory("");
        setFileName("");
        setDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      console.error("Error in manual submit:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Reset form handler
  const handleReset = () => {
    setProductName("");
    setQuantity("");
    setPrice("");
    setCategory("");
    setFileName("");
    setDate(new Date().toISOString().split("T")[0]);
  };;

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
      {/* Manual Product Adding Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Add Product Manually</h2>
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Product Name:
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Product Name"
                required
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Quantity:
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Quantity"
                required
                min="1"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Price:
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price"
                step="0.01"
                min="0"
                required
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Category:
              <input
                type="number"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category ID"
                required
                min="1"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date:
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-2 text-white rounded-md ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {loading ? "Saving..." : "Save Product"}
          </button>
        </form>
      </div>
      <ToastContainer />
    </div>
  )
};

export default Page;

