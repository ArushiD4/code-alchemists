import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API Auth
    setTimeout(() => {
      setLoading(false);
      navigate("/scan"); // Or wherever your main dashboard is
    }, 1000);
  };

  const handleDemoLogin = () => {
    navigate("/scan");
  };

  return (
    <div className="min-h-screen bg-oxford_blue text-white_custom flex flex-col">
      <Navbar />
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-prussian_blue p-8 rounded-3xl border border-charcoal shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Secure access to your FinShield dashboard.</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                className="w-full py-3 px-4 rounded-xl bg-oxford_blue border border-gray-700 text-white focus:outline-none focus:border-[#d4af37]"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full py-3 px-4 rounded-xl bg-oxford_blue border border-gray-700 text-white focus:outline-none focus:border-[#d4af37]"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={loading} className="w-full mt-2 py-3 rounded-xl font-bold bg-[#d4af37] text-oxford_blue hover:scale-105 transition-all shadow-lg">
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <hr className="w-full border-gray-700" />
            <span className="px-3 text-gray-500 text-sm">OR</span>
            <hr className="w-full border-gray-700" />
          </div>

          <button onClick={handleDemoLogin} className="w-full mt-6 py-3 rounded-xl font-bold border-2 border-charcoal text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-all">
            Login as Demo User (Judges)
          </button>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Don't have an account? <Link to="/register" className="text-[#d4af37] hover:underline font-bold">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}