"use client";
import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const Page = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const login = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5050/auth/login", {
        email,
        password,
      });

      if (res.status === 200) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        router.push("/");
      } else {
        alert("Invalid credentials");
      }
    } catch (error) {
      console.error("Login failed", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-6 w-96">
        <h2 className="text-2xl font-bold text-center mb-4">Login</h2>
        <form onSubmit={login} className="flex flex-col space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={handleEmailChange}
            className="border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={handlePasswordChange}
            className="border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white font-bold py-2 rounded hover:bg-blue-600 transition duration-200"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Page;
