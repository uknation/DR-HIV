import React, { useState, useEffect } from 'react';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck,
  Sparkles, Brain, FileText, CheckCircle2, AlertTriangle, X,
  Key, HelpCircle, Menu
} from 'lucide-react';
import purpleRibbonImg from '../assets/purple_ribbon.png';
import lavenderDnaImg from '../assets/lavender_dna.png';

// Brand Logo Component with Glossy Purple Awareness Ribbon
export function DrHivLogo({ size = 'md', className = '', showText = true }) {
  const dimensions = {
    sm: { img: 'h-7 w-auto', text: 'text-base', sub: 'text-[7px]' },
    md: { img: 'h-8 sm:h-9 w-auto', text: 'text-lg sm:text-xl', sub: 'text-[7.5px] sm:text-[8px]' },
    lg: { img: 'h-11 sm:h-12 w-auto', text: 'text-2xl', sub: 'text-[9px]' }
  }[size] || { img: 'h-8 sm:h-9 w-auto', text: 'text-lg sm:text-xl', sub: 'text-[7.5px] sm:text-[8px]' };

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      <img
        src={purpleRibbonImg}
        alt="DR-HIV Purple Awareness Ribbon"
        className={`${dimensions.img} object-contain flex-shrink-0 drop-shadow-[0_2px_8px_rgba(85,23,94,0.2)]`}
      />
      {showText && (
        <div className="flex flex-col text-left leading-none">
          <span className={`${dimensions.text} font-black tracking-tight text-[#17233B]`}>
            DR-HIV
          </span>
          <span className={`${dimensions.sub} font-bold tracking-[0.16em] text-[#55175E] uppercase mt-1`}>
            POWERED BY LOCK-IN
          </span>
        </div>
      )}
    </div>
  );
}

export default function LandingPage({
  loginEmail = '',
  setLoginEmail = () => {},
  loginPassword = '',
  setLoginPassword = () => {},
  loginError = '',
  handleLogin = () => {}
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize Remember Me state and prefill if saved
  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem('drhiv_remember_me');
      const savedEmail = localStorage.getItem('drhiv_saved_email');
      if (savedRemember !== null) {
        setRememberMe(savedRemember === 'true');
      }
      if (savedEmail && !loginEmail) {
        setLoginEmail(savedEmail);
      }
    } catch (e) {
      // Storage access gracefully handled
    }
  }, []);

  const onSubmitForm = async (e) => {
    e.preventDefault();
    try {
      if (rememberMe) {
        localStorage.setItem('drhiv_remember_me', 'true');
        localStorage.setItem('drhiv_saved_email', loginEmail);
      } else {
        localStorage.setItem('drhiv_remember_me', 'false');
        localStorage.removeItem('drhiv_saved_email');
      }
    } catch (e) {}

    setIsSubmitting(true);
    try {
      await handleLogin(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setForgotSent(true);
    setTimeout(() => {
      setActiveModal(null);
      setForgotSent(false);
    }, 3500);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-white text-[#17233B] flex flex-col justify-between overflow-x-hidden font-sans selection:bg-[#EDE3FA] selection:text-[#55175E]">
      
      {/* ========================================================================= */}
      {/* 1. NAVBAR MATCHING REFERENCE DESIGN                                      */}
      {/* ========================================================================= */}
      <header className="relative z-30 w-full bg-white border-b border-[#E5EAF0] px-6 sm:px-10 lg:px-16 py-3.5 flex items-center justify-between flex-shrink-0">
        {/* Left Section: Brand Logo & Tagline */}
        <div className="flex items-center">
          <DrHivLogo size="md" />
        </div>

        {/* Center Section: Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 lg:space-x-10 text-[13px] lg:text-sm font-semibold text-[#17233B]">
          <button
            onClick={() => setActiveModal('features')}
            className="hover:text-[#55175E] transition-colors duration-150 focus:outline-none"
          >
            Features
          </button>
          <button
            onClick={() => setActiveModal('insights')}
            className="hover:text-[#55175E] transition-colors duration-150 focus:outline-none"
          >
            AI Insights
          </button>
          <button
            onClick={() => setActiveModal('guidelines')}
            className="hover:text-[#55175E] transition-colors duration-150 focus:outline-none"
          >
            Guidelines
          </button>
          <button
            onClick={() => setActiveModal('security')}
            className="hover:text-[#55175E] transition-colors duration-150 focus:outline-none"
          >
            Security
          </button>
        </nav>

        {/* Right Section: Two-Line Uppercase Tagline */}
        <div className="hidden md:flex flex-col text-right leading-tight select-none">
          <span className="text-[9px] font-extrabold tracking-wider text-[#17233B] uppercase">
            BETTER DATA.
          </span>
          <span className="text-[9px] font-extrabold tracking-wider text-[#17233B] uppercase">
            HEALTHIER OUTCOMES.
          </span>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-1.5 rounded-lg text-[#17233B] hover:text-[#55175E] hover:bg-[#F8FAFC] transition focus:outline-none"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[60px] z-20 bg-white border-b border-[#E5EAF0] shadow-lg p-5 flex flex-col space-y-3.5 animate-fadeIn">
          <button
            onClick={() => { setActiveModal('features'); setMobileMenuOpen(false); }}
            className="text-left text-sm font-semibold text-[#17233B] hover:text-[#55175E] py-1"
          >
            Features
          </button>
          <button
            onClick={() => { setActiveModal('insights'); setMobileMenuOpen(false); }}
            className="text-left text-sm font-semibold text-[#17233B] hover:text-[#55175E] py-1"
          >
            AI Insights
          </button>
          <button
            onClick={() => { setActiveModal('guidelines'); setMobileMenuOpen(false); }}
            className="text-left text-sm font-semibold text-[#17233B] hover:text-[#55175E] py-1"
          >
            Guidelines
          </button>
          <button
            onClick={() => { setActiveModal('security'); setMobileMenuOpen(false); }}
            className="text-left text-sm font-semibold text-[#17233B] hover:text-[#55175E] py-1"
          >
            Security
          </button>
          <div className="pt-2 border-t border-[#E5EAF0] text-xs font-bold text-[#17233B] tracking-wider uppercase">
            BETTER DATA. HEALTHIER OUTCOMES.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN HERO SECTION + CENTER DNA HELIX + SIGN-IN CARD                    */}
      {/* ========================================================================= */}
      <main className="relative flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-6 sm:py-8 lg:py-10 flex items-center justify-center">
        
        {/* Background Translucent Lavender DNA Helix Visual Asset */}
        <div className="absolute left-[40%] md:left-[46%] lg:left-[49%] xl:left-[50%] top-1/2 -translate-x-1/2 -translate-y-1/2 h-[95%] sm:h-[110%] lg:h-[125%] max-h-[780px] pointer-events-none select-none z-0 hidden md:flex items-center justify-center">
          <img
            src={lavenderDnaImg}
            alt="Translucent Lavender DNA Helix with Medical Accents"
            className="h-full w-auto object-contain max-w-none opacity-95"
            loading="eager"
          />
        </div>

        {/* Hero Grid: Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-center relative z-10">
          
          {/* --------------------------------------------------------------------- */}
          {/* LEFT COLUMN: HERO CONTENT                                             */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left py-2 sm:py-4">
            
            {/* Eyebrow Label */}
            <div className="text-xs sm:text-[13px] font-bold tracking-[0.16em] text-[#55175E] uppercase mb-3 sm:mb-4">
              CLINICIAN ACCESS
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.12]">
              <span className="text-[#17233B] block">Better decisions.</span>
              <span className="text-[#55175E] block mt-1 sm:mt-1.5">
                More informed HIV<br className="hidden sm:inline" /> care.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="mt-5 sm:mt-6 text-[#64748B] text-sm sm:text-base leading-relaxed max-w-md font-normal">
              Evidence-informed resistance insights and treatment support for qualified healthcare professionals.
            </p>

          </div>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: CLINICIAN SIGN-IN CARD                                  */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end items-center">
            <div className="w-full max-w-[410px] bg-white border border-[#E5EAF0] rounded-2xl p-6 sm:p-7 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.04)] relative z-10">
              
              {/* Card Header */}
              <div className="flex flex-col items-center text-center">
                {/* Purple Awareness Ribbon */}
                <img
                  src={purpleRibbonImg}
                  alt="DR-HIV Ribbon"
                  className="h-10 sm:h-11 w-auto object-contain mb-1 drop-shadow-[0_2px_8px_rgba(85,23,94,0.18)]"
                />

                <h2 className="text-xl sm:text-[22px] font-extrabold tracking-tight text-[#17233B] leading-none">
                  DR-HIV
                </h2>
                <span className="text-[8px] sm:text-[8.5px] font-bold tracking-[0.18em] text-[#55175E] uppercase mt-1">
                  CLINICAL DECISION SUPPORT
                </span>

                <h3 className="text-xl sm:text-[22px] font-bold text-[#17233B] tracking-tight mt-3.5">
                  Sign in to your account
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5 mb-4 sm:mb-5">
                  Use your authorized clinical credentials.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={onSubmitForm} className="space-y-3.5">
                
                {/* Work email field */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#17233B] mb-1.5">
                    Work email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="email"
                      autoComplete="email"
                      required
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#F8FAFC] border border-[#E5EAF0] rounded-lg text-[#17233B] placeholder-[#94A3B8] focus:outline-none focus:border-[#55175E] focus:ring-1 focus:ring-[#55175E] focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#17233B] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="password"
                      autoComplete="current-password"
                      required
                      className="w-full pl-9 pr-9 py-2.5 text-xs sm:text-sm bg-[#F8FAFC] border border-[#E5EAF0] rounded-lg text-[#17233B] placeholder-[#94A3B8] focus:outline-none focus:border-[#55175E] focus:ring-1 focus:ring-[#55175E] focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#64748B] transition focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox & Forgot Password Link */}
                <div className="flex items-center justify-between text-xs pt-0.5 select-none">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#55175E] accent-[#55175E] focus:ring-[#55175E] cursor-pointer"
                    />
                    <span className="text-[#64748B] text-xs font-normal">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveModal('forgot_pw')}
                    className="text-xs font-medium text-[#55175E] hover:text-[#421047] hover:underline transition focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Error Banner */}
                {loginError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-600" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2.5 px-4 bg-[#55175E] hover:bg-[#421047] active:bg-[#320b36] text-white font-semibold text-xs sm:text-sm rounded-lg transition duration-150 flex items-center justify-center space-x-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#55175E] focus:ring-offset-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>{isSubmitting ? 'Signing in...' : 'Sign in'}</span>
                </button>

              </form>

              {/* Authorized Clinicians Only Info Notice Panel */}
              <div className="mt-4 p-3 sm:p-3.5 bg-[#FAF7FD] border border-[#D8C6EE] rounded-xl flex items-start space-x-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-[#EDE3FA] border border-[#D8C6EE] flex items-center justify-center text-[#55175E] flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-[#55175E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.3" stroke="currentColor" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#17233B] leading-tight">
                    Authorized clinicians only
                  </h4>
                  <p className="text-[10px] text-[#64748B] leading-tight mt-0.5">
                    Access to clinical resources is restricted. Activity is logged for accountability.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. FOOTER MATCHING REFERENCE DESIGN                                      */}
      {/* ========================================================================= */}
      <footer className="w-full bg-white border-t border-[#E5EAF0] px-6 sm:px-10 lg:px-16 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] relative z-20 space-y-2 sm:space-y-0 flex-shrink-0">
        <div>
          © 2026 DR-HIV · Clinical use only
        </div>
        <div className="flex items-center space-x-3 text-xs text-[#64748B]">
          <button
            onClick={() => setActiveModal('privacy')}
            className="hover:text-[#55175E] transition focus:outline-none"
          >
            Privacy
          </button>
          <span>·</span>
          <button
            onClick={() => setActiveModal('terms')}
            className="hover:text-[#55175E] transition focus:outline-none"
          >
            Terms
          </button>
          <span>·</span>
          <button
            onClick={() => setActiveModal('support')}
            className="hover:text-[#55175E] transition focus:outline-none"
          >
            Support
          </button>
          <span>·</span>
          <button
            onClick={() => setActiveModal('contact')}
            className="hover:text-[#55175E] transition focus:outline-none"
          >
            Contact
          </button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 4. MODALS (Features, AI Insights, Guidelines, Security, Forgot PW, etc.)   */}
      {/* ========================================================================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-[#E5EAF0] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 text-[#17233B] shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#94A3B8] hover:text-[#17233B] hover:bg-[#F8FAFC] transition focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal: Features */}
            {activeModal === 'features' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-[#55175E]">
                  <Sparkles className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-[#17233B]">DR-HIV Clinical Decision Support Features</h3>
                </div>
                <div className="space-y-2.5 text-xs text-[#64748B]">
                  <div className="p-3.5 rounded-xl bg-[#FAF7FD] border border-[#E5D7F5]">
                    <p className="font-bold text-[#55175E] mb-1">50 Fine-Tuned XGBoost ML Models</p>
                    <p>Covers 25 antiretroviral agents across all 5 therapeutic drug classes with log-fold resistance regression and binary classification.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAF7FD] border border-[#E5D7F5]">
                    <p className="font-bold text-[#55175E] mb-1">Deep Learning Sequence-Aware Transformer</p>
                    <p>ESM-2 LoRA protein transformer, 1D-CNN (k=3,5,7), and Dirichlet Evidential deep learning for epistemic uncertainty quantification.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAF7FD] border border-[#E5D7F5]">
                    <p className="font-bold text-[#55175E] mb-1">Dual-Engine ART Regimen Scoring</p>
                    <p>WHO 2026 and DHHS aligned regimen ranking engine factoring in drug-drug interactions, dual-NRTI backbone rules, and pregnancy safety.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: AI Insights */}
            {activeModal === 'insights' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-[#55175E]">
                  <Brain className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-[#17233B]">AI Insights & Explainability</h3>
                </div>
                <div className="space-y-3 text-xs text-[#64748B] leading-relaxed">
                  <p>Our hybrid clinical intelligence model computes per-residue continuous 1D Grad-CAM heatmaps to visualize the exact amino acid positions driving resistance.</p>
                  <p>The Surveillance Epistatic Mutation-Pair (SEMP) cross-attention module evaluates synergistic, antagonistic, and compensatory mutation interactions (e.g. M184V + TDF hypersensitization and G140S + Q148H catalytic rescue).</p>
                </div>
              </div>
            )}

            {/* Modal: Guidelines */}
            {activeModal === 'guidelines' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-[#55175E]">
                  <FileText className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-[#17233B]">Clinical Guidelines Alignment</h3>
                </div>
                <div className="space-y-2 text-xs text-[#64748B]">
                  <p>DR-HIV integrates consensus rules from top international HIV advisory authorities:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-[#64748B]">
                    <li><b className="text-[#17233B]">WHO 2026 Consolidated Guidelines:</b> First-line, second-line, and third-line preferred ART regimens.</li>
                    <li><b className="text-[#17233B]">Stanford HIVdb Algorithm:</b> 5-level penalty scoring for RT, PR, and IN mutations.</li>
                    <li><b className="text-[#17233B]">DHHS Guidelines:</b> Dual-NRTI backbone requirements and renal/hepatic safety criteria.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Modal: Security */}
            {activeModal === 'security' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-[#55175E]">
                  <ShieldCheck className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-[#17233B]">Security & Zero-PII Compliance</h3>
                </div>
                <div className="space-y-2 text-xs text-[#64748B]">
                  <p>DR-HIV operates under a <b>Strict Zero-PII Policy</b> (HIPAA & GDPR Ready):</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-[#64748B]">
                    <li>Zero patient names, government IDs, addresses, or emails are stored in database records.</li>
                    <li>Cryptographic pseudonymization tokens: <code className="text-[#55175E] bg-[#FAF7FD] px-1 py-0.5 rounded font-mono border border-[#E5D7F5]">PatientTestId = HIV-2026-XXXXX</code>.</li>
                    <li>End-to-end clinical audit logging with SHA-256 integrity verification.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Modal: Forgot Password */}
            {activeModal === 'forgot_pw' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-[#55175E]">
                  <Key className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-[#17233B]">Reset Clinician Access</h3>
                </div>
                {forgotSent ? (
                  <div className="p-4 rounded-xl bg-[#FAF7FD] border border-[#E5D7F5] text-[#55175E] text-xs font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#55175E]" />
                    <span>Password reset instructions have been dispatched to your verified clinical email.</span>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-3.5">
                    <p className="text-xs text-[#64748B]">
                      Enter your authorized clinician email. Default test credentials: <code className="text-[#55175E] font-semibold bg-[#FAF7FD] px-1 py-0.5 rounded border border-[#E5D7F5]">doctor@hivclinic.org</code> (Password: <code className="text-[#55175E] font-semibold bg-[#FAF7FD] px-1 py-0.5 rounded border border-[#E5D7F5]">clinicalpass123</code>).
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-[#17233B] mb-1">Work Email</label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="doctor@hivclinic.org"
                        required
                        className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5EAF0] rounded-lg text-[#17233B] placeholder-[#94A3B8] focus:outline-none focus:border-[#55175E] focus:ring-1 focus:ring-[#55175E]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#55175E] hover:bg-[#421047] text-white font-semibold text-xs rounded-lg transition shadow-sm"
                    >
                      Send Reset Instructions
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Modal: Legal & Contact */}
            {(activeModal === 'privacy' || activeModal === 'terms' || activeModal === 'support' || activeModal === 'contact') && (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-[#55175E]">
                  <HelpCircle className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-[#17233B] uppercase">{activeModal} Information</h3>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  DR-HIV is an enterprise clinical decision-support platform engineered for infectious disease specialists and antiretroviral therapy (ART) treatment committees. All algorithms and patient workflows adhere strictly to WHO and DHHS guidelines.
                </p>
                <div className="p-3.5 rounded-xl bg-[#FAF7FD] border border-[#E5D7F5] text-xs text-[#64748B]">
                  <b>Clinical Support Desk:</b> <span className="text-[#55175E] font-semibold">support@dr-hiv.org</span> | 24/7 Clinical Hotline
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#E5EAF0] flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#E5EAF0] text-[#17233B] text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
