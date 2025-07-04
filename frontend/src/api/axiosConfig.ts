import axios from 'axios';

// Configure axios defaults for authentication
axios.defaults.withCredentials = true;

// Add response interceptor to handle auth errors
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // User is not authenticated
      // The auth context will handle this, but we can also redirect here if needed
      console.log('[Axios] 401 Unauthorized - User needs to authenticate');
    }
    return Promise.reject(error);
  }
);

export default axios;