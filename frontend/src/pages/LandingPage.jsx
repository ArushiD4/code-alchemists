

import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-oxford_blue text-white_custom font-sans">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          <span className="block text-white">Don't Get Phished.</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] to-[#b8860b] drop-shadow-lg mt-2">
            Verify Before You Pay.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-300">
          The ultimate real-time fraud detection engine. We analyze merchant links and payment gateways to intercept malicious transactions.
        </p>
        <div className="mt-10">
          <button
            onClick={() => navigate("/scan")}
            className="px-8 py-4 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-oxford_blue font-bold text-lg rounded-full shadow-lg hover:scale-105 transition-all"
          >
            Launch Scanner
          </button>
        </div>
      </main>
    </div>
  );
}