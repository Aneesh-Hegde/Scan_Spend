import api from '../utils/api'
import { Product } from '../types/types';
import { toast } from 'react-toastify';

interface FileClick {
  filename: string,
  filestate: (data: string) => void
  productstate: (data: Product[]) => void
}

const HandleFileClick = async ({ filename, "filestate": setFilename, "productstate": setProducts }: FileClick) => {
  setFilename(filename);
  try {
    const response = await api.post(`/get-text/${filename}`, {
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
export default HandleFileClick
