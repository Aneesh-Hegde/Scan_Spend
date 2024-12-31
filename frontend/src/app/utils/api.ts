import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:1323',
})
export default api
