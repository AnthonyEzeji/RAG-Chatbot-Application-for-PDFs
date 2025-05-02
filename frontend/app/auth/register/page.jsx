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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const register = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5050/auth/register", formData);

      if (res.status === 201) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        router.push("/");
      } else {
        alert("Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Error registering:", error);
      alert("Something went wrong.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-6 w-96">
        <h2 className="text-2xl font-bold text-center mb-4">Register</h2>
        <form onSubmit={register} className="flex flex-col space-y-4">
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            className="border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            className="border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white font-bold py-2 rounded hover:bg-blue-600 transition duration-200"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default Page;
