
import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const publicEndpoints = [
      "/products/",
      "/apartments/",
      "/health/",
      "/auth/phone/send-otp/",
      "/auth/phone/verify-otp/",
      "/auth/login/",
      "/auth/register/",
    ];

    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      config.url?.startsWith(endpoint)
    );

    if (!config.headers) {
      config.headers = new axios.AxiosHeaders();
    }

    if (!isPublicEndpoint) {
      const token = localStorage.getItem("freshmeat-access-token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        delete config.headers.Authorization;
      }
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

export async function testProductsApi() {
  const response = await api.get("/products/");
  return response.data;
}

export async function getApartments() {
  const response = await api.get("/apartments/");
  return response.data;
}
