import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function RegisterPage() {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm) {
      return alert("Passwords do not match!");
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/scan"); // Auto-login after registration
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-oxford_blue text-white_custom flex flex-col">
      <Navbar />
      <div className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-prussian_blue p-8 rounded-3xl border border-charcoal shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-400">Join the secure financial network.</p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
              <input type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full py-3 px-4 rounded-xl bg-oxford_blue border border-gray-700 text-white focus:outline-none focus:border-[#d4af37]" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full py-3 px-4 rounded-xl bg-oxford_blue border border-gray-700 text-white focus:outline-none focus:border-[#d4af37]" placeholder="name@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full py-3 px-4 rounded-xl bg-oxford_blue border border-gray-700 text-white focus:outline-none focus:border-[#d4af37]" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Confirm Password</label>
              <input type="password" required value={formData.confirm} onChange={(e) => setFormData({ ...formData, confirm: e.target.value })} className="w-full py-3 px-4 rounded-xl bg-oxford_blue border border-gray-700 text-white focus:outline-none focus:border-[#d4af37]" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading} className="w-full mt-4 py-3 rounded-xl font-bold bg-[#d4af37] text-oxford_blue hover:scale-105 transition-all shadow-lg uppercase tracking-wide">
              {loading ? "Creating Profile..." : "Register Securely"}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Already have an account? <Link to="/login" className="text-[#d4af37] hover:underline font-bold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}