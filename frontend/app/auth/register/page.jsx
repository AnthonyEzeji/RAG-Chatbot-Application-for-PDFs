"use client";
import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const Page = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(""); // Clear error when user starts typing
  };

  const register = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError("All fields are required");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post("http://localhost:5050/auth/register", formData);

      if (res.status === 201) {
        // Registration successful but no token returned, redirect to login
        alert("Registration successful! Please login with your credentials.");
        router.push("/auth/login");
      }
    } catch (error) {
      console.error("Registration error:", error);
      
      if (error.response) {
        // Server responded with error status
        switch (error.response.status) {
          case 409:
            setError("An account with this email already exists. Please try logging in instead.");
            break;
          case 400:
            setError(error.response.data?.message || "Invalid input. Please check your details.");
            break;
          case 500:
            setError("Server error. Please try again later.");
            break;
          default:
            setError("Registration failed. Please try again.");
        }
      } else if (error.request) {
        // Network error
        setError("Unable to connect to server. Please check your internet connection.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-6 w-96">
        <h2 className="text-2xl font-bold text-center mb-4">Register</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={register} className="flex flex-col space-y-4">
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            disabled={isLoading}
            className="border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            required
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            disabled={isLoading}
            className="border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            className="border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password (min 6 characters)"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            className="border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white font-bold py-2 rounded hover:bg-blue-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Registering..." : "Register"}
          </button>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-gray-600">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/auth/login")}
              className="text-blue-500 hover:underline"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Page;
