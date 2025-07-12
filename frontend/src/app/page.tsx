"use client"
import React, { useState, useEffect } from 'react';
import Upload from './components/Upload';
import ProductList from './components/ProductList';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from './utils/api'
import { Product } from './types/types'
import HandleFileUpload from './utils/handleFileUpload';
import HandleFileClick from './utils/handleFileClick';
import HandleUpdate from './utils/handleUpdate';
import HandleProductSave from './utils/handleProductSave';
import fileclient from './utils/fileClient';
import { GetFileByUser, File, FileList } from './grpc_schema/file_pb'
import { GetBalanceRequest, GetBalanceResponse, Balance, UpdateBalanceRequest, UpdateBalanceResponse, AddBalanceSourceRequest, AddBalanceSourceResponse } from './grpc_schema/balance_pb'
import { BalanceServiceClient } from './grpc_schema/BalanceServiceClientPb';
import { Metadata } from 'grpc-web';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { default as FileLists } from './components/Filelist';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Upload as UploadIcon,
  FileText,
  Plus,
  DollarSign,
  TrendingUp,
  Calendar,
  ShoppingCart,
  Receipt,
  CreditCard,
  Wallet,
  Store,
  RefreshCw,
  ImageIcon,
  Loader2
} from "lucide-react"
import BulkDateChange from './components/BulkDateChange';
import { useShepherdTour } from './utils/useShepherdTour';
import { HelpCircle } from 'lucide-react';

// Types for balance sources (matching protobuf Balance message)
interface BalanceSource {
  balance_id: number;
  balance_source: string;
  balance_amount: string;
  balance: number;
}

// Enhanced Product type with purchase source
interface EnhancedProduct extends Product {
  purchase_source?: string;
  purchase_source_id?: number;
}

interface FileData {
  filename: string;
  imageUrl: string;
}

// Define some static categories for now, or fetch from an API
const categories = [
  { id: 1, name: "Groceries" },
  { id: 2, name: "Transportation" },
  { id: 3, name: "Utilities" },
  { id: 4, name: "Entertainment" },
  { id: 5, name: "Dining Out" },
  { id: 6, name: "Shopping" },
  { id: 7, name: "Healthcare" },
  { id: 8, name: "Education" },
  { id: 9, name: "Rent/Mortgage" },
  { id: 10, name: "Other" },
];


const balanceclient = new BalanceServiceClient("http://localhost:8080")

const Page: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [products, setProducts] = useState<EnhancedProduct[]>([]);
  const [filename, setFilename] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<EnhancedProduct | null>(null)
  const [balanceSources, setBalanceSources] = useState<BalanceSource[]>([]);
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);
  const [newBalanceSource, setNewBalanceSource] = useState("");
  const [newBalanceAmount, setNewBalanceAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Manual product form states
  const [productName, setProductName] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [purchaseSource, setPurchaseSource] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [selectedFileBalanceSource, setSelectedFileBalanceSource] = useState<string>("");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isBulkDateOpen, setIsBulkDateOpen] = useState(false);
  const [isUpdatingDates, setIsUpdatingDates] = useState(false);
  const [selectedFilenameHighlight, setSelectedFilenameHighlight] = useState<string | null>(null);
  const { startTour, restartTour } = useShepherdTour();
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [selectedManualImage, setSelectedManualImage] = useState<File | null>(null);
  const [manualImagePreview, setManualImagePreview] = useState<string | null>(null);
  const router = useRouter()

  // Calculate totals for dashboard
  const totalExpenses = products.reduce((sum, product) => sum + (product.amount * product.quantity), 0);
  const totalItems = products.reduce((sum, product) => sum + product.quantity, 0);
  const avgExpense = products.length > 0 ? totalExpenses / products.length : 0;

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await api.get("/get-refresh-token", { withCredentials: true })
        const refresh_token: string = response.data.refresh_token
        await getAllFiles(refresh_token);
        await getAllBalances(refresh_token);
      } catch (error) {
        console.log(error)
        toast.error('Error fetching initial data. Please log in.');
        router.push('/login')
      }
    }
    fetchInitialData();
    setDate(new Date().toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    const hasVisited = localStorage.getItem('expense-tracker-visited');
    if (!hasVisited) {
      setIsFirstVisit(true);
      localStorage.setItem('expense-tracker-visited', 'true');
      setTimeout(() => {
        startTour();
      }, 1000);
    }
  }, [startTour]);

  const handleBulkDateChange = async (newDate: string) => {
    setIsUpdatingDates(true);
    try {
      // Update all products with the new date
      const updatedProducts = products.map(product => ({
        ...product,
        Date: newDate
      }));

      setProducts(updatedProducts);
      toast.success(`Updated date for ${products.length} expense${products.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error("Error updating dates:", error);
      toast.error("Failed to update dates");
    } finally {
      setIsUpdatingDates(false);
      setIsBulkDateOpen(false);
    }
  };

  // Fetch balance sources using gRPC
  const fetchBalanceSources = async () => {
    setLoadingBalances(true);
    try {
      const response = await api.get("/get-refresh-token", { withCredentials: true })
      const refresh_token: string = response.data.refresh_token
      await getAllBalances(refresh_token);
    } catch (error) {
      console.error("Error fetching balance sources:", error);
      toast.error("Failed to fetch payment sources");
      router.push('/login')
    } finally {
      setLoadingBalances(false);
    }
  };

  const getAllBalances = async (refresh_token: string) => {
    const request = new GetBalanceRequest()
    let token: string | null = localStorage.getItem("token")

    try {
      const requestmetadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refresh_token }
      const call = balanceclient.getBalances(request, requestmetadata, (error: any, response: GetBalanceResponse) => {
        if (error) {
          console.log(error)
          if (error.code === 16) {
            router.push('/login')
          }
          toast.error('Error fetching balance sources');
          return;
        }

        const allBalances: Balance[] = response.getBalanceList()
        const balanceSources: BalanceSource[] = allBalances.map(balance => ({
          balance_id: balance.getBalanceId(),
          balance_source: balance.getBalanceSource(),
          balance_amount: balance.getBalanceAmount(),
          balance: balance.getBalance()
        }))

        setBalanceSources(balanceSources)
        toast.success("Balance sources loaded successfully")
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
      toast.error('Error fetching balance sources');
    }
  }

  const addBalanceSource = async (source: string, initialAmount: number) => {
    const request = new AddBalanceSourceRequest();
    request.setBalanceSource(source);
    request.setInitialAmount(initialAmount);
    let token: string | null = localStorage.getItem("token");

    try {
      const response = await api.get("/get-refresh-token", { withCredentials: true });
      const refresh_token: string = response.data.refresh_token;
      const requestmetadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refresh_token };

      const call = balanceclient.addBalanceSource(request, requestmetadata, (error: any, response: AddBalanceSourceResponse) => {
        if (error) {
          console.error("Error adding balance source:", error);
          if (error.code === 16) {
            router.push('/login');
          }
          toast.error('Error adding payment source');
          throw error;
        }

        const newBalance: Balance = response.getBalance()!;
        const newBalanceSource: BalanceSource = {
          balance_id: newBalance.getBalanceId(),
          balance_source: newBalance.getBalanceSource(),
          balance_amount: newBalance.getBalanceAmount(),
          balance: newBalance.getBalance()
        };

        setBalanceSources(prev => [...prev, newBalanceSource]);
        toast.success(`Payment source ${source} added successfully`);
      });

      call.on("metadata", (metadata) => {
        if (metadata["token"]) {
          token = metadata["token"];
          localStorage.setItem("token", token);
          Cookies.set("token", token);
        }
      });
    } catch (error) {
      console.error("Error adding balance source:", error);
      toast.error('Error adding payment source');
      throw error;
    }
  };

  const handleAddBalanceSubmit = async () => {
    setFormError(null);
    if (!newBalanceSource.trim()) {
      setFormError("Payment source name is required");
      return;
    }
    const initialAmount = parseFloat(newBalanceAmount);
    if (isNaN(initialAmount) || initialAmount < 0) {
      setFormError("Please enter a valid non-negative amount");
      return;
    }

    try {
      await addBalanceSource(newBalanceSource.trim(), initialAmount);
      setIsAddBalanceOpen(false);
      setNewBalanceSource("");
      setNewBalanceAmount("");
    } catch (err) {
      setFormError("Failed to add payment source. Please try again.");
    }
  };

  const getAllFiles = async (refresh_token: string) => {
    const request = new GetFileByUser()
    let token: string | null = localStorage.getItem("token")
    try {
      const requestmetadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refresh_token }
      const call = fileclient.getAllFiles(request, requestmetadata, (error: any, response: FileList) => {
        if (error) {
          console.log(error)
          if (error.code === 16) {
            router.push('/login')
          }
          toast.error('Error fetching filenames');
          return;
        }
        const allFile: File[] = response.getAllfilesList()

        // Updated to extract both filename and image URL
        const filesWithUrls: FileData[] = allFile.map(file => ({
          filename: file.getFilename(),
          imageUrl: file.getImageUrl()
        }))

        setFiles(filesWithUrls)
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

  const handleUpdate = (updatedProduct: EnhancedProduct) => {
    HandleUpdate({ updatedProduct, setProducts, setEditingProduct })
  }

  const handleSave = async () => {
    if (products.length === 0) {
      toast.warning("No expenses to save");
      return;
    }

    if (!filename) {
      toast.error("Please select or enter a file name");
      return;
    }

    if (!selectedFileBalanceSource) {
      toast.error("Please select a payment source for these expenses");
      return;
    }

    const selectedSourceId = parseInt(selectedFileBalanceSource);
    const selectedSource = balanceSources.find(source => source.balance_id === selectedSourceId);

    if (!selectedSource) {
      toast.error("Selected payment source not found");
      return;
    }

    // Calculate total expense amount
    const totalExpenseAmount = products.reduce((sum, product) => sum + (product.amount * product.quantity), 0);

    // Check if sufficient balance is available
    if (selectedSource.balance < totalExpenseAmount) {
      toast.error(`Insufficient balance in ${selectedSource.balance_source}. Available: $${selectedSource.balance.toFixed(2)}, Required: $${totalExpenseAmount.toFixed(2)}`);
      return;
    }

    try {
      // Save products first
      await HandleProductSave(products, filename, setProducts);

      // Update balance after successful save
      await updateBalanceAfterPurchase(selectedSourceId, totalExpenseAmount);

      toast.success(`Expenses saved successfully. $${totalExpenseAmount.toFixed(2)} deducted from ${selectedSource.balance_source}`);

      // Reset the selected source after successful save
      setSelectedFileBalanceSource("");
      setProducts([]); // Clear products after saving

      return true;
    } catch (error) {
      console.error("Error saving expenses:", error);
      toast.error("Failed to save expenses");
      return false;
    }
  };

  // Update balance after purchase using gRPC
  const updateBalanceAfterPurchase = async (sourceId: number, expenseAmount: number) => {
    try {
      const response = await api.get("/get-refresh-token", { withCredentials: true })
      const refresh_token: string = response.data.refresh_token

      const selectedSource = balanceSources.find(source => source.balance_id === sourceId);
      if (!selectedSource) {
        toast.error("Selected payment source not found");
        return;
      }

      const newBalance = selectedSource.balance - expenseAmount;

      if (newBalance < 0) {
        toast.error("Insufficient balance for this transaction");
        return;
      }

      await updateBalance(refresh_token, sourceId, newBalance);
    } catch (error) {
      console.error("Error updating balance:", error);
      toast.warning("Expense saved but balance update failed");
    }
  };

  const updateBalance = async (refresh_token: string, balanceId: number, newAmount: number) => {
    const request = new UpdateBalanceRequest()
    request.setBalanceId(balanceId)
    request.setAmount(newAmount)

    let token: string | null = localStorage.getItem("token")

    try {
      const requestmetadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refresh_token }
      const call = balanceclient.updateBalance(request, requestmetadata, (error: any, response: UpdateBalanceResponse) => {
        if (error) {
          console.log(error)
          if (error.code === 16) {
            router.push('/login')
          }
          toast.error('Error updating balance');
          return;
        }

        const updatedBalance: Balance | undefined = response.getBalance()
        let updatedBalanceSource: BalanceSource | undefined;
        if (updatedBalance) {
          updatedBalanceSource = {
            balance_id: updatedBalance.getBalanceId(),
            balance_source: updatedBalance.getBalanceSource(),
            balance_amount: updatedBalance.getBalanceAmount(),
            balance: updatedBalance.getBalance()
          }
        }

        // Update local state
        setBalanceSources(prev => prev.map(source =>
          source.balance_id === balanceId ? updatedBalanceSource! : source
        ));

        toast.success(`Balance updated for ${updatedBalanceSource?.balance_source}`);
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
      toast.error('Error updating balance');
    }
  }
  const handleManualImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setSelectedManualImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setManualImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeManualImage = () => {
    setSelectedManualImage(null);
    setManualImagePreview(null);
    // Reset file input
    const fileInput = document.getElementById('manual-image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("No authentication token found");
      setLoading(false);
      router.push('/login');
      return;
    }

    if (!productName || !quantity || !price || !category || !date || !purchaseSource) {
      toast.error("All fields are required");
      setLoading(false);
      return;
    }

    const quantityValue = parseInt(quantity);
    if (isNaN(quantityValue) || quantityValue <= 0) {
      toast.error("Quantity must be a valid positive integer");
      setLoading(false);
      return;
    }

    const amountValue = parseFloat(price);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error("Price must be a valid positive number");
      setLoading(false);
      return;
    }

    const selectedCategory = categories.find(cat => cat.id.toString() === category);
    if (!selectedCategory) {
      toast.error("Please select a valid category");
      setLoading(false);
      return;
    }

    const totalCost = amountValue * quantityValue;
    const selectedSourceId = parseInt(purchaseSource);
    const selectedSource = balanceSources.find(source => source.balance_id === selectedSourceId);

    if (selectedSource && selectedSource.balance < totalCost) {
      toast.error(`Insufficient balance in ${selectedSource.balance_source}. Available: $${selectedSource.balance.toFixed(2)}, Required: $${totalCost.toFixed(2)}`);
      setLoading(false);
      return;
    }

    const formatDateForDatabase = (dateString: string): string => {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return "";
        }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear());
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
      let finalFilename = "manual-entry";

      // If image is selected, upload it first
      if (selectedManualImage) {
        const formData = new FormData();
        formData.append('file', selectedManualImage);

        try {
          const uploadResponse = await api.post('/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${token}`
            },
            withCredentials: true
          });

          if (uploadResponse.data && uploadResponse.data.filename) {
            finalFilename = uploadResponse.data.filename;
            toast.success("Image uploaded successfully");

            // Refresh files list to include the new image
            await refreshFiles();
          }
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          toast.warning("Failed to upload image, but expense will be saved without image");
          // Continue with manual-entry filename
        }
      }

      const newProduct: EnhancedProduct = {
        ID: Date.now().toString(),
        product_name: productName,
        quantity: quantityValue,
        amount: amountValue,
        Name: finalFilename,
        category: selectedCategory.name,
        Date: formattedDate,
        purchase_source: selectedSource?.balance_source,
        purchase_source_id: selectedSourceId,
      };

      // Save the product
      await HandleProductSave([newProduct], finalFilename, (savedProducts) => {
        setProducts(prev => [...prev, ...savedProducts]);
      });

      // Update balance after successful save
      await updateBalanceAfterPurchase(selectedSourceId, totalCost);

      toast.success("Expense added successfully");

      // Reset form
      setProductName("");
      setQuantity("");
      setPrice("");
      setCategory("");
      setPurchaseSource("");
      setDate(new Date().toISOString().split("T")[0]);

      // Reset image states
      setSelectedManualImage(null);
      setManualImagePreview(null);
      const fileInput = document.getElementById('manual-image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

    } catch (error) {
      console.error("Error in manual submit:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setProductName("");
    setQuantity("");
    setPrice("");
    setCategory("");
    setPurchaseSource("");
    setDate(new Date().toISOString().split("T")[0]);

    // Reset image states
    setSelectedManualImage(null);
    setManualImagePreview(null);
    const fileInput = document.getElementById('manual-image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const renderBalanceSourceSelector = () => {
    if (products.length === 0) return null;

    const totalExpenseAmount = products.reduce((sum: number, product: EnhancedProduct) => sum + (product.amount * product.quantity), 0);

    return (
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-600" />
            <Label className="text-sm font-medium text-blue-900">
              Select Payment Source for this Transaction
            </Label>
          </div>

          <Select value={selectedFileBalanceSource} onValueChange={setSelectedFileBalanceSource}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose payment source for all expenses" />
            </SelectTrigger>
            <SelectContent>
              {balanceSources.map((source: BalanceSource) => (
                <SelectItem
                  key={source.balance_id}
                  value={source.balance_id.toString()}
                  disabled={source.balance < totalExpenseAmount}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={source.balance < totalExpenseAmount ? "text-gray-400" : ""}>
                      {source.balance_source}
                    </span>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge variant="outline" className={source.balance < totalExpenseAmount ? "text-red-600 border-red-200" : ""}>
                        ${source.balance.toFixed(2)}
                      </Badge>
                      {source.balance < totalExpenseAmount && (
                        <span className="text-xs text-red-600">(Insufficient)</span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex justify-between items-center text-sm">
            <span className="text-blue-700">Total Amount:</span>
            <span className="text-lg font-bold text-blue-900">${totalExpenseAmount.toFixed(2)}</span>
          </div>

          {selectedFileBalanceSource && (
            <div className="text-xs text-blue-600">
              ✓ {balanceSources.find((s: BalanceSource) => s.balance_id.toString() === selectedFileBalanceSource)?.balance_source} selected
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleFileClickWithReset = (clickedfile: FileData) => {
    setSelectedFileBalanceSource("");
    setSelectedImageUrl(clickedfile.imageUrl);
    setSelectedFilenameHighlight(clickedfile.filename);
    HandleFileClick({
      filename: clickedfile.filename,
      filestate: setFilename,
      productstate: setProducts,
    });
  };

  const refreshFiles = async (): Promise<void> => {
    try {
      const response = await api.get("/get-refresh-token", { withCredentials: true });
      const refresh_token: string = response.data.refresh_token;
      await getAllFiles(refresh_token);
    } catch (error) {
      console.log(error);
      toast.error('Error fetching filenames');
      router.push('/login');
      throw error;
    }
  };

  const ImageModalComponent = () => (
    <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Bill Image</DialogTitle>
          <DialogDescription>
            {filename && `Image for: ${filename}`}
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-0">
          {selectedImageUrl ? (
            <div className="relative">
              <img
                src={selectedImageUrl}
                alt="Bill"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  console.error("Image failed to load:", selectedImageUrl);
                  e.currentTarget.style.display = 'none';
                  toast.error("Image failed to load. It might be corrupted or missing.");
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
              <div className="text-center">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No image available for this file.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Expense Tracker
              </h1>
              <p className="text-gray-600 text-sm">Track and manage your expenses with payment sources</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={restartTour}
              className="flex items-center gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </Button>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-tour="dashboard-cards">
            <Card className="bg-white border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">${totalExpenses.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Average Expense</p>
                    <p className="text-2xl font-bold text-gray-900">${avgExpense.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Payment Sources</p>
                    <p className="text-2xl font-bold text-gray-900">{balanceSources.length}</p>
                  </div>
                  <Store className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Balance Sources Overview */}
          <Card className="bg-white border shadow-sm mb-6" data-tour="payment-sources">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">Payment Sources</CardTitle>
                    <CardDescription>Available balance in your accounts</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddBalanceOpen(true)}
                    data-tour="add-payment-btn"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Payment Source
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchBalanceSources}
                    disabled={loadingBalances}
                  >
                    {loadingBalances ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {balanceSources.length === 0 && !loadingBalances ? (
                <div className="text-center text-gray-500 py-4">
                  <Wallet className="h-8 w-8 mx-auto mb-2" />
                  <p>No payment sources added yet.</p>
                  <p className="text-sm">Click "Add Payment Source" to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {balanceSources.map((source) => (
                    <div key={source.balance_id} className="p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{source.balance_source}</p>
                        <Badge variant={source.balance > 100 ? "default" : "destructive"}>
                          ${source.balance.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Balance Dialog */}
        <Dialog open={isAddBalanceOpen} onOpenChange={setIsAddBalanceOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Payment Source</DialogTitle>
              <DialogDescription>Create a new payment source for transactions.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="balance-source">Source Name</Label>
                <Input
                  id="balance-source"
                  value={newBalanceSource}
                  onChange={(e) => setNewBalanceSource(e.target.value)}
                  placeholder="e.g., Card, Savings Account"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance-amount">Initial Balance ($)</Label>
                <Input
                  id="balance-amount"
                  type="number"
                  value={newBalanceAmount}
                  onChange={(e) => setNewBalanceAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              {formError && (
                <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddBalanceOpen(false);
                  setNewBalanceSource("");
                  setNewBalanceAmount("");
                  setFormError(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddBalanceSubmit}>
                Add Source
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Main Content Tabs */}
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white border" data-tour="main-tabs">
            <TabsTrigger
              value="upload"
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <UploadIcon className="h-4 w-4" />
              Import Expenses
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              data-tour="manual-tab"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card className="bg-white border shadow-sm" data-tour="file-upload">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <UploadIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg">Import Files</CardTitle>
                        <CardDescription>Upload CSV or Excel files</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Upload onFileUpload={(filename) => HandleFileUpload(filename, refreshFiles)} />
                  </CardContent>
                </Card>

                <Card className="bg-white border shadow-sm" data-tour="file-list">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-600" />
                        <div>
                          <CardTitle className="text-lg">Your Files</CardTitle>
                          <CardDescription>
                            {files && files.length > 0 ? `${files.length} files available` : "No files uploaded"}
                          </CardDescription>
                        </div>
                      </div>
                      {selectedImageUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsImageModalOpen(true)}
                          className="ml-2"
                        >
                          <ImageIcon className="h-4 w-4 mr-1" />
                          View Image
                        </Button>
                      )}
                    </div>
                    {selectedImageUrl && (
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="w-16 h-16 border rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setIsImageModalOpen(true)}
                        >
                          <img
                            src={selectedImageUrl}
                            alt="Bill preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error("Preview image failed to load:", selectedImageUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          <p>Click to view full image</p>
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <FileLists
                      files={files}
                      onFileClick={handleFileClickWithReset}
                      selectedFilename={selectedFilenameHighlight}
                    />
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white border shadow-sm h-fit" data-tour="expense-list">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-green-600" />
                      <div>
                        <CardTitle className="text-lg">Expenses</CardTitle>
                        <CardDescription>
                          {filename ? (
                            <div className="flex items-center gap-2 mt-1">
                              <span>From:</span>
                              <Badge variant="secondary" className="text-xs">
                                {filename}
                              </Badge>
                            </div>
                          ) : (
                            "Select a file to view expenses"
                          )}
                        </CardDescription>
                      </div>
                    </div>

                    {/* Bulk Date Change Button */}
                    {products.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsBulkDateOpen(true)}
                          className="flex items-center gap-2"
                        >
                          <Calendar className="h-4 w-4" />
                          Change All Dates
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {products.length === 0 && filename ? (
                    <div className="text-center text-gray-500 py-8">
                      <Receipt className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-lg font-medium">No expenses found for "{filename}".</p>
                      <p className="text-sm">This file might be empty or in an unsupported format.</p>
                    </div>
                  ) : products.length === 0 && !filename ? (
                    <div className="text-center text-gray-500 py-8">
                      <Receipt className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-lg font-medium">No expenses loaded.</p>
                      <p className="text-sm">Select a file from "Your Files" to view expenses here.</p>
                    </div>
                  ) : (
                    <>
                      {renderBalanceSourceSelector()}
                      <ProductList products={products} onUpdate={handleUpdate} onSave={handleSave} />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <BulkDateChange
            isOpen={isBulkDateOpen}
            onClose={() => setIsBulkDateOpen(false)}
            onDateChange={handleBulkDateChange}
            productsCount={products.length}
            loading={isUpdatingDates}
            currentDate={products[0]?.Date}
          />
          <TabsContent value="manual">
            <Card className="bg-white border shadow-sm max-w-4xl mx-auto" data-tour="manual-form">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">Add New Expense</CardTitle>
                    <CardDescription>Enter expense details with payment source</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="productName" className="text-sm font-medium text-gray-700">
                        Expense Description
                      </Label>
                      <Input
                        id="productName"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g., Office supplies, Lunch, Gas"
                        className="h-10"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                        Quantity
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="1"
                        min="1"
                        className="h-10"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                        Price per Item ($)
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="h-10"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                        Category
                      </Label>
                      <Select value={category} onValueChange={setCategory} required>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purchaseSource" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        Payment Source
                      </Label>
                      <Select value={purchaseSource} onValueChange={setPurchaseSource} required>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select payment source" />
                        </SelectTrigger>
                        <SelectContent>
                          {balanceSources.map((source) => (
                            <SelectItem
                              key={source.balance_id}
                              value={source.balance_id.toString()}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{source.balance_source}</span>
                                <Badge variant="outline" className="ml-2">
                                  ${source.balance.toFixed(2)}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Image Upload Section */}
                  <div className="space-y-2">
                    <Label htmlFor="manual-image-upload" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Receipt Image (Optional)
                    </Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="manual-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleManualImageUpload}
                        className="h-10"
                      />
                      {manualImagePreview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeManualImage}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    {/* Image Preview */}
                    {manualImagePreview && (
                      <div className="mt-3">
                        <div className="border rounded-lg p-2 bg-gray-50">
                          <p className="text-xs text-gray-600 mb-2">Image Preview:</p>
                          <img
                            src={manualImagePreview}
                            alt="Receipt preview"
                            className="max-w-full h-32 object-contain rounded border"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cost Preview */}
                  {quantity && price && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-900">Total Cost:</span>
                        <span className="text-lg font-bold text-blue-900">
                          ${(parseFloat(price || "0") * parseInt(quantity || "0")).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  <Separator className="my-6" />

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add Expense
                        </div>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      className="px-6"
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Image Modal Component */}
      <ImageModalComponent />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name</Label>
                <Input
                  id="edit-name"
                  value={editingProduct.product_name}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    product_name: e.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={editingProduct.quantity}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    quantity: parseInt(e.target.value) || 0
                  })}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price ($)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editingProduct.amount}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    amount: parseFloat(e.target.value) || 0
                  })}
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  value={editingProduct.category}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    category: e.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="text"
                  value={editingProduct.Date}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    Date: e.target.value
                  })}
                  placeholder="dd/mm/yyyy"
                />
              </div>

              {/* Total Cost Display */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">Total Cost:</span>
                  <span className="text-lg font-bold text-blue-900">
                    {(editingProduct.amount * editingProduct.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingProduct(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingProduct) {
                  handleUpdate(editingProduct);
                }
              }}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
};

export default Page;
