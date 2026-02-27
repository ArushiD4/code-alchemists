import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ParamedicPage from './pages/ParamedicPage';
import DispatchLogin from './pages/DispatchLogin';

function DriverPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-extrabold text-blue-500 mb-4 tracking-tight drop-shadow-md">Driver View</h1>
      <p className="text-slate-300 text-lg">Navigating to destination.</p>
    </div>
  );
}

function Header() {
  const location = useLocation();
  // Hide header on dispatch login screen
  if (location.pathname === '/') return null;

  return (
    <header className="bg-slate-950 border-b border-slate-800 shadow-sm z-10 px-4 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.4)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 2v20" /><path d="M2 12h20" /></svg>
        </div>
        <span className="font-bold text-lg tracking-wide text-slate-100">Rescue<span className="text-red-500">App</span></span>
      </div>
      <nav className="flex gap-2 sm:gap-4">
        <Link
          to="/paramedic"
          className="text-sm font-semibold text-slate-300 hover:text-red-400 bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-red-500"
        >
          Paramedic
        </Link>
        <Link
          to="/driver"
          className="text-sm font-semibold text-slate-300 hover:text-blue-400 bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-blue-500"
        >
          Driver
        </Link>
      </nav>
    </header>
  );
}


function App() {
  return (
    <Router>
      <div className="min-h-[100dvh] bg-slate-900 text-slate-50 flex flex-col font-sans selection:bg-red-500/30 overflow-hidden">

        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#1e293b' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
          }}
        />

        <Header />

        <main className="flex-1 flex flex-col overflow-y-auto relative container mx-auto max-w-lg">
          <Routes>
            <Route path="/" element={<DispatchLogin />} />
            <Route path="/paramedic" element={<ParamedicPage />} />
            <Route path="/driver" element={<DriverPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
