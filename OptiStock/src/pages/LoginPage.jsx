import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { showLockoutAlert } from "../utils/swalHelper";
import {
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  AlertCircle,
  X,
  PackageSearch,
  CheckCircle2,
  TrendingUp,
  Activity,
  Receipt
} from "lucide-react";

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const navigate = useNavigate();

  const [stats, setStats] = useState({ total_active_items: 0, low_stock_count: 0, total_inventory_value: 0 });
  const [posStats, setPosStats] = useState({ order_count: 0, total_sales: '0.00', total_items: 0 });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('locked')) {
      api.getDashboardStats().then(setStats).catch(() => {});
      api.getPosSalesToday().then(setPosStats).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lockedSeconds = params.get('locked');
    if (lockedSeconds) {
      const seconds = parseInt(lockedSeconds, 10);
      if (seconds > 0) {
        showLockoutAlert(seconds);
      }
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // States para sa Protocol Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Toast Notification State & Refs
  const [toast, setToast] = useState({ show: false, message: "", type: "error", isClosing: false });
  const toastTimeout = useRef(null);
  const toastExitTimeout = useRef(null);

  // Toast Handlers
  const showToast = (message, type = "error") => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    if (toastExitTimeout.current) clearTimeout(toastExitTimeout.current);
    
    setToast({ show: false, message: "", type, isClosing: false });
    
    setTimeout(() => {
      setToast({ show: true, message, type, isClosing: false });
      toastTimeout.current = setTimeout(() => {
        setToast(prev => ({ ...prev, isClosing: true }));
        toastExitTimeout.current = setTimeout(() => {
          setToast({ show: false, message: "", type: "error", isClosing: false });
        }, 300);
      }, 4700);
    }, 50);
  };

  const manuallyCloseToast = () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    if (toastExitTimeout.current) clearTimeout(toastExitTimeout.current);

    setToast(prev => ({ ...prev, isClosing: true }));
    toastExitTimeout.current = setTimeout(() => {
      setToast({ show: false, message: "", type: "error", isClosing: false });
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanEmail = email.trim();

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      showToast("Please enter a valid email address.", "error");
      setIsLoading(false);
      return;
    }
    if (password.length < 1) {
      showToast("Please enter your password.", "error");
      setIsLoading(false);
      return;
    }

    try {
      const user = await api.login({ email: cleanEmail, password });
      localStorage.setItem('user', JSON.stringify(user));
      showToast("Authentication successful! Redirecting...", "success");
      setTimeout(() => navigate('/inventory-hub'), 1000);
    } catch (err) {
      setIsLoading(false);
      if (err.status === 429) {
        showLockoutAlert(err.remaining_seconds || 0);
        return;
      }
      if (err.remaining_attempts !== undefined && err.remaining_attempts <= 1) {
        showToast(`${err.message} ${err.remaining_attempts} attempt${err.remaining_attempts !== 1 ? 's' : ''} remaining.`, "error");
        return;
      }
      showToast(err.message, "error");
    }
  };

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 300);
  };

  // Custom Bouncy Easing function variable for cleaner code
  const bouncyEase = "ease-[cubic-bezier(0.34,1.56,0.64,1)]";

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans flex flex-col lg:flex-row relative overflow-hidden">
      
      {/* Global Background Grid (Left Side/Light Area) */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#1A1A1A05_1px,transparent_1px),linear-gradient(to_bottom,#1A1A1A05_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Light Side Soft Pastel Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FAD2CB] rounded-full blur-[100px] opacity-30 pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[40%] w-[30%] h-[30%] bg-[#C3ECE3] rounded-full blur-[100px] opacity-30 pointer-events-none z-0"></div>

      {/* --- MOBILE ONLY: Top Header --- */}
      <div className="block lg:hidden w-full relative overflow-hidden pt-12 pb-16 px-6 rounded-b-[2.5rem] z-10 shadow-sm bg-[#EFE9DF]">
        <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(#1A1A1A_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <Link to="/" className="flex items-center gap-2 mb-4 cursor-pointer">
            <PackageSearch size={28} className="text-[#1A1A1A]" />
            <span className="text-[#1A1A1A] font-black text-2xl tracking-tight">OptiStock</span>
          </Link>
          <p className="text-[#57534E] text-xs font-bold uppercase tracking-widest">
            Predict the Future of Your Inventory
          </p>
        </div>
      </div>

      {/* --- LEFT SIDE: Original Form Section --- */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 lg:p-8 relative z-10 -mt-10 lg:mt-0 lg:min-h-screen">
        
        <div className="max-w-md w-full relative z-10 bg-white/90 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none p-8 lg:p-0 rounded-3xl lg:rounded-none shadow-xl lg:shadow-none border border-white/60 lg:border-none">
          
          <Link to="/" className="hidden lg:flex items-center gap-2 mb-8 cursor-pointer transition-transform hover:scale-[1.02] w-fit">
            <PackageSearch size={32} className="text-[#1A1A1A]" />
            <span className="text-[#1A1A1A] font-black text-2xl tracking-tight">OptiStock</span>
          </Link>

          <div className="mb-8 mt-2 lg:mt-0 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A]/5 px-3 py-1 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]">
              System Access
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-[#1A1A1A] mb-2 tracking-tight">
              Welcome back
            </h1>
            <p className="text-[#57534E] font-medium text-sm lg:text-base">
              Secure access for your inventory operations.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-[#1A1A1A] mb-2">
                Role Email
              </label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors z-10 ${emailFocused ? 'text-[#1A1A1A]' : 'text-[#A8A29E]'}`} />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className="w-full pl-12 pr-4 py-4 bg-white focus:bg-white border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent transition-all font-medium text-[#1A1A1A] shadow-sm group-hover:border-[#D6D3D1]"
                  placeholder="admin@optistock.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-[#1A1A1A] mb-2">
                Password
              </label>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors z-10 ${passwordFocused ? 'text-[#1A1A1A]' : 'text-[#A8A29E]'}`} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className="w-full pl-12 pr-12 py-4 bg-white focus:bg-white border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent transition-all font-medium text-[#1A1A1A] shadow-sm group-hover:border-[#D6D3D1]"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#A8A29E] hover:text-[#1A1A1A] transition-colors cursor-pointer z-10"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="mt-8"></div>

            <button
              type="submit"
              disabled={isLoading}
              className="relative overflow-hidden group/btn w-full bg-[#1A1A1A] text-[#FFFFFF] py-4 rounded-xl font-black uppercase tracking-widest shadow-md transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4 cursor-pointer"
            >
              <span className="absolute bottom-0 left-0 w-full h-0 transition-all duration-300 ease-out bg-[#57534E] group-hover/btn:h-full z-0"></span>
              <span className="relative z-10 flex items-center justify-center gap-2 transition-colors duration-300">
                {isLoading ? "Authenticating..." : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#A8A29E]">
            <Shield className="w-4 h-4" />
            <span>End-to-End Encrypted</span>
          </div>
        </div>

        {/* --- DYNAMIC FOOTER --- */}
        <div className="mt-8 pt-6 border-t border-[#E7E5E4] lg:border-none lg:pt-0 lg:mt-0 lg:absolute lg:bottom-4 lg:left-8 flex justify-center lg:justify-start gap-4 text-[10px] font-black uppercase tracking-widest text-[#A8A29E] opacity-85 z-10 hover:opacity-100 transition-opacity">
          <button type="button" onClick={() => setIsModalOpen(true)} className="hover:text-[#1A1A1A] transition-all cursor-pointer uppercase flex items-center gap-1">
            <Lock size={12} /> System Data Protocol
          </button>
        </div>
      </div>

      {/* --- RIGHT SIDE: Background Tech UI + Floating Accents + Illustration --- */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#EFE9DF] items-end justify-center px-16">
        
        {/* Faded Matrix Grid Overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.06] bg-[linear-gradient(to_right,#1A1A1A_1px,transparent_1px),linear-gradient(to_bottom,#1A1A1A_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_90%)]"></div>

        {/* Central Warm Glow to keep it from looking dead */}
        <div className="absolute top-[20%] w-[600px] h-[600px] bg-[#FCD59E] rounded-full blur-[140px] opacity-[0.25] z-0 pointer-events-none"></div>

        {/* --- EXPANDED Floating Geometric Accents (Shape-Driven) --- */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Top Left Cluster */}
          <div className="absolute top-[15%] left-[15%] w-12 h-12 bg-[#FCD59E] rounded-full shadow-sm animate-float-fast"></div>
          <div className="absolute top-[28%] left-[22%] w-5 h-5 bg-[#7BB8A7] rounded-full opacity-60 animate-float-slow" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-[10%] left-[30%] w-20 h-20 border-[5px] border-[#C3ECE3] rounded-full animate-float-medium"></div>

          {/* Top Center / Right Cluster */}
          <div className="absolute top-[12%] right-[22%] w-24 h-10 bg-[#FAD2CB] rounded-full shadow-sm rotate-12 animate-float-slow"></div>
          <div className="absolute top-[25%] right-[12%] w-16 h-16 bg-[#D96B5E] rounded-tr-[32px] rounded-bl-[32px] shadow-sm -rotate-12 animate-float-fast" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute top-[20%] right-[38%] w-8 h-8 border-[4px] border-[#57534E] rounded-md rotate-45 animate-float-medium" style={{ animationDelay: '1.5s' }}></div>

          {/* Mid Section Fillers */}
          <div className="absolute top-[42%] left-[10%] w-16 h-16 bg-[#C3ECE3] rounded-tl-full rounded-tr-full shadow-sm -rotate-45 animate-float-slow"></div>
          <div className="absolute top-[48%] right-[8%] w-10 h-10 bg-[#FCD59E] rounded-full shadow-sm animate-float-fast" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-[45%] left-[35%] w-3 h-3 bg-[#57534E] opacity-40 rounded-full animate-float-medium"></div>

          {/* Sparkle/Star */}
          <div className="absolute top-[32%] left-[50%] transform -translate-x-1/2">
             <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-[#D96B5E] opacity-[0.25] animate-pulse-slow">
                <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" fill="currentColor"/>
             </svg>
          </div>
        </div>

        {/* HUD Elements */}
        <div className="absolute top-10 right-10 text-[#1A1A1A]/15 text-2xl font-light pointer-events-none">+</div>
        <div className="absolute bottom-10 left-10 text-[#1A1A1A]/15 text-2xl font-light pointer-events-none">+</div>
        
        <div className="absolute bottom-16 right-12 text-right pointer-events-none">
          <div className="h-px w-16 bg-[#1A1A1A]/10 mb-2 ml-auto"></div>
          <div className="h-px w-8 bg-[#1A1A1A]/10 ml-auto mb-2"></div>
          <div className="h-px w-4 bg-[#1A1A1A]/10 ml-auto"></div>
        </div>

        {/* Clean Branding Footer */}
        <div className="absolute top-8 left-16 right-16 flex items-center justify-between text-[10px] font-bold tracking-widest text-[#78716C] uppercase opacity-80 z-40">
          <span>© 2026 OptiStock Corp.</span>
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-[#7BB8A7] rounded-full"></div> 
            System Secure
          </span>
        </div>
        
        {/* --- INTERACTIVE Characters Illustration with Proper Bouncy Transitions --- */}
        <div className="relative z-10 w-full flex-grow flex items-end justify-center pb-0">
          
          <div className="relative w-[450px] h-[400px] flex items-end">
            
            {/* Shape 1: Tall Rectangle (Pastel Blue/Green) */}
            <div className="group absolute left-[50px] bottom-0 w-[175px] h-[350px] z-0 cursor-pointer">
              
              {/* Tooltip / Thought Bubble */}
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 translate-y-4 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-500 pointer-events-none z-50 flex flex-col items-center ${bouncyEase}`}>
                <div className="bg-white px-4 py-2.5 rounded-2xl shadow-xl border border-[#E7E5E4] flex items-center gap-2 whitespace-nowrap">
                  <PackageSearch size={16} className="text-[#7BB8A7]" />
                  <div>
                    <p className="text-[9px] uppercase font-black text-[#A8A29E] tracking-wider leading-none">Active SKUs</p>
                    <p className="text-sm font-black text-[#1A1A1A] leading-tight">{stats.total_active_items.toLocaleString()} Items</p>
                  </div>
                </div>
                <div className="w-3 h-3 bg-white border-b border-r border-[#E7E5E4] transform rotate-45 -mt-1.5"></div>
              </div>

              {/* The Actual Shape */}
              <div className={`w-full h-full bg-[#C3ECE3] rounded-t-[10px] shadow-xl border-b-0 relative origin-bottom transition-all duration-500 group-hover:scale-y-[1.05] group-hover:scale-x-[0.98] ${bouncyEase}`}>
                <div className="absolute top-12 right-10 flex gap-4">
                  <div className="w-4 h-4 bg-[#FFFFFF] rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#1A1A1A] rounded-full"></div>
                  </div>
                  <div className="w-4 h-4 bg-[#FFFFFF] rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#1A1A1A] rounded-full"></div>
                  </div>
                </div>
                <div className="absolute top-[55px] right-[60px] w-1.5 h-6 bg-[#1A1A1A]"></div>
              </div>
            </div>

            {/* Shape 3: Short Yellow Shape */}
            <div className="group absolute left-[260px] bottom-0 w-[150px] h-[190px] z-10 cursor-pointer">
              
              {/* Tooltip / Thought Bubble */}
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 translate-y-4 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-500 pointer-events-none z-50 flex flex-col items-center ${bouncyEase}`}>
                <div className="bg-white px-4 py-2.5 rounded-2xl shadow-xl border border-[#E7E5E4] flex items-center gap-2 whitespace-nowrap">
                  <Activity size={16} className="text-[#FCD59E]" />
                  <div>
                    <p className="text-[9px] uppercase font-black text-[#A8A29E] tracking-wider leading-none">Live Sync</p>
                    <p className="text-sm font-black text-[#1A1A1A] leading-tight">Just now</p>
                  </div>
                </div>
                <div className="w-3 h-3 bg-white border-b border-r border-[#E7E5E4] transform rotate-45 -mt-1.5"></div>
              </div>

              {/* The Actual Shape */}
              <div className={`w-full h-full bg-[#FCD59E] rounded-t-[75px] shadow-xl border-b-0 relative origin-bottom transition-all duration-500 group-hover:scale-y-[1.05] group-hover:scale-x-[0.98] ${bouncyEase}`}>
                <div className="absolute top-10 left-10 w-2.5 h-2.5 bg-[#1A1A1A] rounded-full"></div>
                <div className="absolute top-16 -right-5 w-16 h-2 bg-[#1A1A1A] rounded-full"></div>
              </div>
            </div>

            {/* Shape 2: Medium Rectangle (Black) */}
            <div className="group absolute left-[175px] bottom-0 w-[125px] h-[240px] z-20 cursor-pointer">
              
              {/* Tooltip / Thought Bubble */}
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 translate-y-4 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-500 pointer-events-none z-50 flex flex-col items-center ${bouncyEase}`}>
                <div className="bg-white px-4 py-2.5 rounded-2xl shadow-xl border border-[#D96B5E]/30 flex items-center gap-2 whitespace-nowrap">
                  <AlertCircle size={16} className="text-[#D96B5E]" strokeWidth={2.5} />
                  <div>
                    <p className="text-[9px] uppercase font-black text-[#D96B5E] tracking-wider leading-none">Warning</p>
                    <p className="text-sm font-black text-[#1A1A1A] leading-tight">{stats.low_stock_count} Low Stock{stats.low_stock_count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="w-3 h-3 bg-white border-b border-r border-[#E7E5E4] transform rotate-45 -mt-1.5"></div>
              </div>

              {/* The Actual Shape */}
              <div className={`w-full h-full bg-[#1A1A1A] rounded-t-[10px] shadow-xl border-b-0 relative origin-bottom transition-all duration-500 group-hover:scale-y-[1.05] group-hover:scale-x-[0.98] ${bouncyEase}`}>
                <div className="absolute top-8 right-6 flex gap-3">
                  <div className="w-5 h-5 bg-[#FFFFFF] rounded-full flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-[#1A1A1A] rounded-full"></div>
                  </div>
                  <div className="w-5 h-5 bg-[#FFFFFF] rounded-full flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-[#1A1A1A] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shape 4: POS Doodle (Cash Register / Receipt) */}
            <div className="group absolute left-[295px] bottom-[130px] w-[100px] h-[80px] z-20 cursor-pointer">
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 translate-y-4 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-500 pointer-events-none z-50 flex flex-col items-center ${bouncyEase}`}>
                <div className="bg-white px-4 py-2.5 rounded-2xl shadow-xl border border-[#E7E5E4] flex items-center gap-2 whitespace-nowrap">
                  <Receipt size={16} className="text-[#7BB8A7]" />
                  <div>
                    <p className="text-[9px] uppercase font-black text-[#A8A29E] tracking-wider leading-none">Today's POS Sales</p>
                    <p className="text-sm font-black text-[#1A1A1A] leading-tight">₱{parseFloat(posStats.total_sales).toLocaleString()} ({posStats.order_count} order{posStats.order_count !== 1 ? 's' : ''})</p>
                  </div>
                </div>
                <div className="w-3 h-3 bg-white border-b border-r border-[#E7E5E4] transform rotate-45 -mt-1.5"></div>
              </div>
              <div className="w-full h-full bg-[#FFFFFF] rounded-xl shadow-lg border-2 border-[#1A1A1A] relative overflow-hidden">
                <div className="absolute top-2.5 left-3 w-[35px] h-[3px] bg-[#1A1A1A]"></div>
                <div className="absolute top-[30px] left-3 w-[25px] h-[2px] bg-[#A8A29E]"></div>
                <div className="absolute top-[42px] left-3 w-[30px] h-[2px] bg-[#A8A29E]"></div>
                <div className="absolute top-[54px] left-3 w-[20px] h-[2px] bg-[#A8A29E]"></div>
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#D96B5E] rounded-full border-2 border-[#1A1A1A] flex items-center justify-center text-[8px] font-black text-white">$</div>
                <div className="absolute -left-1.5 bottom-3 w-3 h-3 bg-[#7BB8A7] rounded-full border-2 border-[#1A1A1A]"></div>
                <div className="absolute right-2 bottom-2 w-8 h-[1px] bg-[#1A1A1A] rotate-[-25deg]"></div>
              </div>
            </div>

            {/* Shape 5: Large Pink/Orange Semi-Circle */}
            <div className="group absolute left-[0px] bottom-0 w-[275px] h-[140px] z-30 cursor-pointer">
              
              {/* Tooltip / Thought Bubble */}
              <div className={`absolute bottom-full left-[60%] -translate-x-1/2 mb-4 opacity-0 translate-y-4 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-500 pointer-events-none z-50 flex flex-col items-center ${bouncyEase}`}>
                <div className="bg-white px-4 py-2.5 rounded-2xl shadow-xl border border-[#E7E5E4] flex items-center gap-2 whitespace-nowrap">
                  <TrendingUp size={16} className="text-[#1A1A1A]" />
                  <div>
                    <p className="text-[9px] uppercase font-black text-[#A8A29E] tracking-wider leading-none">Total Value</p>
                    <p className="text-sm font-black text-[#1A1A1A] leading-tight">₱{stats.total_inventory_value >= 1000000 ? `${(stats.total_inventory_value / 1000000).toFixed(2)}M` : stats.total_inventory_value >= 1000 ? `${(stats.total_inventory_value / 1000).toFixed(1)}K` : stats.total_inventory_value.toLocaleString()}</p>
                  </div>
                </div>
                <div className="w-3 h-3 bg-white border-b border-r border-[#E7E5E4] transform rotate-45 -mt-1.5"></div>
              </div>

              {/* The Actual Shape */}
              <div className={`w-full h-full bg-[#FAD2CB] rounded-t-[140px] shadow-xl border-b-0 relative origin-bottom transition-all duration-500 group-hover:scale-y-[1.05] group-hover:scale-x-[0.98] ${bouncyEase}`}>
                <div className="absolute top-[65px] left-[100px] flex gap-8">
                  <div className="w-4 h-4 bg-[#1A1A1A] rounded-full"></div>
                  <div className="w-4 h-4 bg-[#1A1A1A] rounded-full"></div>
                </div>
                <div className="absolute top-[80px] left-[115px] w-5 h-2.5 border-b-[4px] border-[#1A1A1A] rounded-b-full"></div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* --- PROTOCOL MODAL --- */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#1A1A1A]/40 backdrop-blur-sm ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
          <div className={`bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>
            
            <div className="p-5 sm:p-6 border-b border-[#E7E5E4] flex justify-between items-center bg-[#FAF7F2] shrink-0">
              <h2 className="text-xl sm:text-2xl font-black text-[#1A1A1A] tracking-tight flex items-center gap-2">
                <Shield size={24} className="text-[#1A1A1A]" /> System Data Protocol
              </h2>
              <button onClick={handleCloseModal} className="text-[#57534E] hover:text-[#1A1A1A] hover:bg-[#FAF7F2] transition-all bg-transparent p-2 rounded-full shadow-none hover:shadow-sm cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 text-sm text-[#57534E] space-y-8 custom-scroll overscroll-contain">
              <section>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-3 border-l-4 border-[#FAD2CB] pl-3">Data Confidentiality Policy</h3>
                <p className="mb-3">At <strong>OptiStock</strong>, all sales data, inventory records, and bookkeeping ledgers are considered highly confidential company property.</p>
                
                <h4 className="font-semibold text-[#1A1A1A] mt-4 mb-2">1. User Accountability</h4>
                <ul className="list-disc pl-5 space-y-1 mb-3">
                  <li>Every transaction processed via POS is logged under your specific employee ID.</li>
                  <li>Do not share your login credentials with co-workers.</li>
                </ul>
                
                <h4 className="font-semibold text-[#1A1A1A] mt-4 mb-2">2. System Integrity</h4>
                <ul className="list-disc pl-5 space-y-1 mb-3">
                  <li>Manipulating the Automated Stock Ledger is strictly prohibited.</li>
                  <li>Restocking inputs must exactly match the physical received goods.</li>
                </ul>
              </section>
            </div>

            <div className="p-4 sm:p-6 border-t border-[#E7E5E4] flex justify-end shrink-0 bg-[#FAF7F2]">
              <button
                onClick={handleCloseModal}
                className="px-6 py-3 bg-[#1A1A1A] text-[#FFFFFF] font-black uppercase text-xs tracking-widest rounded-xl shadow-md hover:bg-[#57534E] transition-colors cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TOAST NOTIFICATION --- */}
      {toast.show && (
        <div 
          className={`fixed bottom-6 right-6 z-[110] bg-[#1A1A1A] text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden min-w-[320px] max-w-md origin-right ${
            toast.isClosing ? "animate-toast-out" : "animate-toast-in"
          }`}
        >
          <div className="flex items-start justify-between px-5 py-4 gap-4">
            <div className="flex items-start gap-3">
              {toast.type === "error" ? (
                <AlertCircle size={20} className="text-[#D96B5E] shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 size={20} className="text-[#7BB8A7] shrink-0 mt-0.5" />
              )}
              <div className="flex flex-col">
                {toast.type === "error" && (
                  <span className="text-[10px] uppercase tracking-widest text-[#D96B5E] font-black mb-0.5">Authentication Failed</span>
                )}
                {toast.type === "success" && (
                  <span className="text-[10px] uppercase tracking-widest text-[#7BB8A7] font-black mb-0.5">Access Granted</span>
                )}
                <span className="text-sm font-bold tracking-wide leading-snug">{toast.message}</span>
              </div>
            </div>
            <button 
              onClick={manuallyCloseToast} 
              className="text-[#A8A29E] hover:text-[#FFFFFF] transition-colors cursor-pointer p-1 rounded-full hover:bg-white/10 shrink-0 mt-0.5"
            >
              <X size={16} />
            </button>
          </div>
          <div className="h-1 bg-[#333333] w-full">
            <div className={`h-full animate-progress-bar ${toast.type === "error" ? "bg-[#D96B5E]" : "bg-[#7BB8A7]"}`}></div>
          </div>
        </div>
      )}

      {/* Global CSS keyframes and utilities */}
      <style>{`
        /* Floating Accents Animation */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .animate-float-slow { animation: float 6s ease-in-out infinite; }
        .animate-float-medium { animation: float 5s ease-in-out infinite 1s; }
        .animate-float-fast { animation: float 4s ease-in-out infinite 0.5s; }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.05); }
        }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }

        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalZoomIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes modalFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes modalZoomOut { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.95) translateY(10px); } }
        
        .animate-backdrop-in { animation: modalFadeIn 0.3s ease-out forwards; }
        .animate-modal-in { animation: modalZoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-backdrop-out { animation: modalFadeOut 0.3s ease-in forwards; }
        .animate-modal-out { animation: modalZoomOut 0.3s ease-in forwards; }
        
        .custom-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; transition: scrollbar-color 0.3s ease; }
        .custom-scroll:hover { scrollbar-color: rgba(156, 163, 175, 0.5) transparent; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 20px; transition: background-color 0.3s ease; }
        .custom-scroll:hover::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.6); }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background-color: rgba(107, 114, 128, 0.9); }

        /* Toast animations */
        @keyframes toastIn {
          0% { opacity: 0; transform: translateX(80px) scale(0.6); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          0% { opacity: 1; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(60px) scale(0.3); }
        }
        @keyframes progressBarShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-toast-in { animation: toastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-toast-out { animation: toastOut 0.35s cubic-bezier(0.55, 0, 1, 0.4) forwards; }
        .animate-progress-bar { animation: progressBarShrink 5s linear forwards; }
      `}</style>
    </div>
  );
}

export default LoginPage;