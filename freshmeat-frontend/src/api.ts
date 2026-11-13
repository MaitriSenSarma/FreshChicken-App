
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is not configured.");
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

const publicRequests = [
  { path: "/products/", methods: ["get"] },
  { path: "/apartments/", methods: ["get"] },
  { path: "/health/", methods: ["get"] },
  { path: "/banners/", methods: ["get"] },
  { path: "/coupons/", methods: ["get"] },
  { path: "/coupons/validate/", methods: ["post"] },
  { path: "/reviews/", methods: ["get"] },

  { path: "/auth/phone/send-otp/", methods: ["post"] },
  { path: "/auth/phone/verify-otp/", methods: ["post"] },
  { path: "/auth/login/", methods: ["post"] },
  { path: "/auth/register/", methods: ["post"] },
];

api.interceptors.request.use(
  (config) => {
    const method = (config.method || "get").toLowerCase();
    const url = config.url || "";

    const isPublicRequest = publicRequests.some(
      (endpoint) =>
        url.startsWith(endpoint.path) &&
        endpoint.methods.includes(method)
    );

    if (!config.headers) {
      config.headers = new axios.AxiosHeaders();
    }

    if (isPublicRequest) {
      delete config.headers.Authorization;
    } else {
      const token = localStorage.getItem("freshmeat-access-token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        delete config.headers.Authorization;
      }
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
