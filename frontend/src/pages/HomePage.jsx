// pulse: minor maintenance update

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input) return alert("Please enter a URL");

    setLoading(true);
    // Simulating a backend call for the sandbox
    setTimeout(() => {
      setLoading(false);
      navigate("/results", {
        state: {
          url: input,
          riskScore: 92,
          fraudFlags: ["Domain registered recently", "Missing strict SSL"],
          safeToProceed: false,
        },
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-oxford_blue text-white_custom">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <h1 className="text-4xl font-bold mb-8 text-white">
          Verify Merchant Link
        </h1>
        <form onSubmit={handleSubmit} className="w-full max-w-2xl flex flex-col gap-6">
          <input
            type="text"
            placeholder="Paste checkout URL here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full py-6 px-4 rounded-xl text-oxford_blue text-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-3/4 mx-auto py-4 rounded-full font-bold bg-[#d4af37] text-oxford_blue text-lg hover:scale-105 transition-all"
          >
            {loading ? "Analyzing Risk..." : "Scan For Fraud"}
          </button>
        </form>
      </div>
    </div>
  );
}