import React, { useState } from 'react';
import {
  Shield, ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowRight,
  BarChart3, Brain, FileText, Globe, Heart,
  Users, Sparkles, CheckCircle2, AlertTriangle, X, Key, HelpCircle
} from 'lucide-react';
import drHivLogoImg from '../assets/dr_hiv_logo.png';

// Official DR-HIV Ribbon Logo Component with Provided High-Resolution Asset
export function DrHivLogo({ size = 'md', className = '', showText = true }) {
  const dimensions = {
    sm: { img: 'h-8 sm:h-9 w-auto', text: 'text-sm sm:text-base', sub: 'text-[6.5px] sm:text-[7px]' },
    md: { img: 'h-10 sm:h-12 w-auto', text: 'text-base sm:text-lg lg:text-xl', sub: 'text-[7px] sm:text-[8px]' },
    lg: { img: 'h-14 sm:h-16 w-auto', text: 'text-xl sm:text-2xl', sub: 'text-[8.5px] sm:text-[9.5px]' }
  }[size] || { img: 'h-10 sm:h-12 w-auto', text: 'text-lg lg:text-xl', sub: 'text-[7.5px] sm:text-[8px]' };

  return (
    <div className={`flex items-center space-x-2.5 sm:space-x-3 ${className}`}>
      {/* High-Resolution Teal Ribbon Logo */}
      <img
        src={drHivLogoImg}
        alt="DR-HIV Ribbon Logo"
        className={`${dimensions.img} object-contain flex-shrink-0 drop-shadow-[0_2px_8px_rgba(20,184,166,0.35)]`}
      />

      {showText && (
        <div className="flex flex-col">
          <span className={`${dimensions.text} font-black tracking-tight text-slate-900 leading-none flex items-center`}>
            DR<span className="text-teal-600">-HIV</span>
          </span>
          <span className={`${dimensions.sub} font-bold tracking-[0.2em] text-teal-700 uppercase mt-0.5 sm:mt-1 leading-tight`}>
            CLINICAL DECISION SUPPORT
          </span>
        </div>
      )}
    </div>
  );
}

// Landing Page Main Component (Completely Non-Scrolling, Single-Screen Viewport)
export default function LandingPage({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  handleLogin,
  onOpenPreset
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setForgotSent(true);
    setTimeout(() => {
      setActiveModal(null);
      setForgotSent(false);
    }, 3500);
  };

  return (
    <div className="h-screen h-[100dvh] max-h-screen w-full bg-[#f8fafc] text-slate-900 flex flex-col justify-between overflow-hidden font-sans select-none relative selection:bg-teal-100 selection:text-teal-900">
      
      {/* Background Organic Curved Backdrop & Glow Shapes */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Sweeping Soft Cyan / Mint Fluid Organic Shape */}
        <svg
          className="absolute -top-24 -left-20 w-[140%] h-[120%] text-[#e6fbf8] opacity-70"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M 0 0 L 1440 0 L 1440 400 C 1200 480 1050 320 850 360 C 650 400 600 780 350 820 C 150 850 0 700 0 650 Z"
            fill="currentColor"
          />
        </svg>

        {/* Secondary Delicate Flowing Wave */}
        <svg
          className="absolute top-0 right-0 w-[80%] h-[100%] text-[#d5f7f2]/50 opacity-60"
          viewBox="0 0 1000 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M 400 0 C 650 150 750 350 700 600 C 650 850 850 900 1000 900 L 1000 0 Z"
            fill="currentColor"
          />
        </svg>

        {/* Ambient Soft Glow Circles */}
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-teal-200/20 rounded-full blur-[110px]" />
        <div className="absolute -bottom-20 right-1/4 w-[500px] h-[500px] bg-cyan-200/25 rounded-full blur-[120px]" />
      </div>

      {/* Floating Watermark Script Graphic behind/near login card */}
      <div className="absolute right-6 xl:right-10 top-1/2 -translate-y-12 pointer-events-none z-0 hidden lg:flex flex-col items-center opacity-30 select-none scale-90 xl:scale-100">
        <div className="w-28 h-28 rounded-full bg-teal-200/30 blur-2xl absolute -top-6 -right-4" />
        <span className="font-['Caveat',_cursive] text-3xl xl:text-4xl text-teal-700 tracking-wide rotate-[-12deg] leading-tight text-center">
          For a<br />Healthier<br />Tomorrow
        </span>
        <svg width="100" height="10" viewBox="0 0 120 12" fill="none" className="mt-1 opacity-60">
          <path d="M 2 8 C 35 2, 75 10, 118 4" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & NAVIGATION BAR (Compact Non-Scrolling) */}
      {/* ========================================================================= */}
      <header className="relative z-20 w-full px-4 sm:px-8 lg:px-14 py-2 sm:py-3.5 flex items-center justify-between flex-shrink-0 border-b border-teal-500/10 backdrop-blur-sm">
        {/* Left: Brand Logo */}
        <div className="flex items-center">
          <DrHivLogo size="md" />
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 lg:space-x-9 text-xs lg:text-sm font-semibold text-slate-700">
          <button
            onClick={() => setActiveModal('features')}
            className="hover:text-teal-600 transition focus:outline-none"
          >
            Features
          </button>
          <button
            onClick={() => setActiveModal('insights')}
            className="hover:text-teal-600 transition focus:outline-none"
          >
            AI Insights
          </button>
          <button
            onClick={() => setActiveModal('guidelines')}
            className="hover:text-teal-600 transition focus:outline-none"
          >
            Guidelines
          </button>
          <button
            onClick={() => setActiveModal('security')}
            className="hover:text-teal-600 transition focus:outline-none"
          >
            Security
          </button>
        </nav>

        {/* Right: Pill Badge & 2-Line Tagline */}
        <div className="flex items-center space-x-3 sm:space-x-5">
          <button
            onClick={() => setActiveModal('security')}
            className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-teal-400 bg-white/90 text-teal-800 text-[11px] sm:text-xs font-semibold flex items-center space-x-1.5 sm:space-x-2 shadow-sm hover:bg-teal-50 hover:border-teal-500 transition"
          >
            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal-600 flex-shrink-0" />
            <span className="whitespace-nowrap">Trusted by Clinicians</span>
          </button>

          <div className="hidden xl:flex flex-col text-right leading-tight">
            <span className="text-[8.5px] font-extrabold tracking-wider text-slate-600 uppercase">BETTER DATA.</span>
            <span className="text-[8.5px] font-extrabold tracking-wider text-teal-700 uppercase">HEALTHIER OUTCOMES.</span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN HERO SECTION + LOGIN CARD (Fits exactly inside viewport) */}
      {/* ========================================================================= */}
      <main className="relative z-10 flex-1 min-h-0 px-4 sm:px-8 lg:px-14 py-2 sm:py-3 lg:py-4 flex items-center justify-center max-w-7xl w-full mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 xl:gap-12 w-full h-full max-h-full items-center">
          
          {/* LEFT: HERO TITLE, DESCRIPTION, 4 FEATURE PILLS & BOTTOM BADGES (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-center h-full max-h-full py-1 space-y-2 sm:space-y-3 lg:space-y-4">
            
            {/* Pill Pre-heading */}
            <div className="flex items-center space-x-2 text-teal-700 font-bold text-[10px] sm:text-xs tracking-widest uppercase">
              <span className="w-5 sm:w-6 h-0.5 bg-teal-600 rounded-full inline-block" />
              <span>AI-POWERED CLINICIAN PORTAL</span>
            </div>

            {/* Main Hero Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] xl:text-[3.1rem] font-black text-slate-900 tracking-tight leading-[1.1]">
              Smarter HIV Care,<br />
              <span className="text-teal-600">Together.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-600 text-xs sm:text-sm lg:text-[14px] font-normal max-w-lg leading-relaxed">
              Evidence-based insights and AI-powered recommendations to support better treatment decisions for every patient.
            </p>

            {/* 4 Feature Circular Icon Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-xl py-0.5 sm:py-1">
              
              {/* Feature 1: AI Predictions */}
              <div className="flex flex-col items-center text-center p-1 sm:p-1.5">
                <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-teal-50 border border-teal-200/90 flex items-center justify-center text-teal-600 mb-1.5 shadow-sm hover:scale-105 hover:border-teal-400 transition flex-shrink-0">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 stroke-[1.75]" />
                </div>
                <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight mb-0.5">AI Predictions</h3>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 leading-tight">Mutation analysis<br />& resistance scoring</p>
              </div>

              {/* Feature 2: Guideline Aligned */}
              <div className="flex flex-col items-center text-center p-1 sm:p-1.5">
                <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-teal-50 border border-teal-200/90 flex items-center justify-center text-teal-600 mb-1.5 shadow-sm hover:scale-105 hover:border-teal-400 transition flex-shrink-0">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 stroke-[1.75]" />
                </div>
                <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight mb-0.5">Guideline Aligned</h3>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 leading-tight">WHO • Stanford<br />Rega • ANRS</p>
              </div>

              {/* Feature 3: Secure & Private */}
              <div className="flex flex-col items-center text-center p-1 sm:p-1.5">
                <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-teal-50 border border-teal-200/90 flex items-center justify-center text-teal-600 mb-1.5 shadow-sm hover:scale-105 hover:border-teal-400 transition flex-shrink-0">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 stroke-[1.75]" />
                </div>
                <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight mb-0.5">Secure & Private</h3>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 leading-tight">PHI Protected<br />GDPR Ready</p>
              </div>

              {/* Feature 4: Clinical Reports */}
              <div className="flex flex-col items-center text-center p-1 sm:p-1.5">
                <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-teal-50 border border-teal-200/90 flex items-center justify-center text-teal-600 mb-1.5 shadow-sm hover:scale-105 hover:border-teal-400 transition flex-shrink-0">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 stroke-[1.75]" />
                </div>
                <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight mb-0.5">Clinical Reports</h3>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 leading-tight">PDF summaries<br />& audit logs</p>
              </div>

            </div>

            {/* Bottom 3 Badges Row */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 lg:gap-8 pt-1.5 sm:pt-2 border-t border-slate-200/60 text-xs">
              
              {/* Badge 1 */}
              <div className="flex items-center space-x-2">
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-[10.5px] sm:text-xs leading-tight">Global Standards</span>
                  <span className="text-[9px] sm:text-[10px] text-slate-500">WHO | Stanford | Rega</span>
                </div>
              </div>

              {/* Badge 2 */}
              <div className="flex items-center space-x-2">
                <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-[10.5px] sm:text-xs leading-tight">Better Treatment</span>
                  <span className="text-[9px] sm:text-[10px] text-slate-500">For a Healthier Tomorrow</span>
                </div>
              </div>

              {/* Badge 3 */}
              <div className="flex items-center space-x-2">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-[10.5px] sm:text-xs leading-tight">Trusted by Clinicians</span>
                  <span className="text-[9px] sm:text-[10px] text-slate-500">Evidence • Safety • Impact</span>
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT: EXACT WHITE CLINICIAN LOGIN CARD (5 Cols, perfectly sized) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end items-center h-full max-h-full">
            <div className="w-full max-w-sm sm:max-w-md bg-white text-slate-900 rounded-2xl sm:rounded-[1.75rem] shadow-[0_15px_40px_-15px_rgba(15,118,110,0.15),0_8px_20px_-8px_rgba(0,0,0,0.06)] border border-slate-100 p-4 sm:p-6 lg:p-7 relative z-20">
              
              {/* Card Header: DR-HIV Ribbon & Emblem */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-1 flex items-center justify-center">
                  <img
                    src={drHivLogoImg}
                    alt="DR-HIV Ribbon"
                    className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_2px_8px_rgba(20,184,166,0.3)]"
                  />
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900">DR</span>
                  <span className="text-lg sm:text-xl font-black tracking-tight text-teal-600">-HIV</span>
                </div>
                <span className="text-[7.5px] sm:text-[8px] font-bold tracking-[0.2em] text-teal-700 uppercase mt-0.5">
                  CLINICAL DECISION SUPPORT
                </span>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 sm:mt-2">
                  Welcome Back
                </h2>
                <p className="text-[10.5px] sm:text-xs font-medium text-slate-500 mt-0.5 mb-2.5 sm:mb-4">
                  Sign in to your clinician account
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-2 sm:space-y-3">
                
                {/* Doctor ID / Email Input */}
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Doctor ID / Email"
                      required
                      className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Password Input with Eye Toggle */}
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="w-full pl-9 pr-9 py-2 sm:py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox & Forgot Password */}
                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                  <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-600">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveModal('forgot_pw')}
                    className="font-semibold text-teal-600 hover:text-teal-700 transition"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Error Banner */}
                {loginError && (
                  <div className="p-2 sm:p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-semibold flex items-center space-x-2">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-rose-600" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Sign In Button */}
                <button
                  type="submit"
                  className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-teal-400 via-teal-500 to-[#0d9488] hover:from-teal-500 hover:to-[#0f766e] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-teal-500/25 transition transform active:scale-[0.99] flex items-center justify-center space-x-2"
                >
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Sign In</span>
                </button>

              </form>

              {/* OR Divider */}
              <div className="relative my-2 sm:my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[9px] sm:text-[10px] uppercase font-bold">
                  <span className="bg-white px-2.5 text-slate-400">OR</span>
                </div>
              </div>

              {/* Authorized Clinical Users Only Box */}
              <div className="bg-[#e8f7f9] border border-[#cbebf0] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 lg:p-3 flex items-center space-x-2.5 sm:space-x-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-teal-600/15 border border-teal-600/30 flex items-center justify-center text-teal-700 flex-shrink-0">
                  <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                    Authorized Clinical Users Only
                  </h4>
                  <p className="text-[9.5px] sm:text-[10px] text-slate-500 leading-tight mt-0.5">
                    This system contains patient diagnostic resources. All activities are audited.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. FOOTER (Compact Non-Scrolling) */}
      {/* ========================================================================= */}
      <footer className="relative z-20 w-full px-4 sm:px-8 lg:px-14 py-2 sm:py-2.5 flex flex-row items-center justify-between text-[10px] sm:text-[11px] text-slate-400 flex-shrink-0 border-t border-slate-200/50">
        <div>
          © 2026 DR-HIV. For Clinical Use Only.
        </div>
        <div className="flex items-center space-x-3 sm:space-x-4 font-medium">
          <button onClick={() => setActiveModal('privacy')} className="hover:text-teal-700 transition">Privacy</button>
          <span>|</span>
          <button onClick={() => setActiveModal('terms')} className="hover:text-teal-700 transition">Terms</button>
          <span>|</span>
          <button onClick={() => setActiveModal('support')} className="hover:text-teal-700 transition">Support</button>
          <span>|</span>
          <button onClick={() => setActiveModal('contact')} className="hover:text-teal-700 transition">Contact</button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE MODALS (Features, AI Insights, Guidelines, Security, Forgot PW) */}
      {/* ========================================================================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 text-slate-900 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Content Switcher */}
            {activeModal === 'features' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-teal-600">
                  <Sparkles className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-slate-900">DR-HIV Core Features</h3>
                </div>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-bold text-teal-700 mb-1">50 Fine-Tuned XGBoost ML Models</p>
                    <p>Covers 25 antiretroviral agents across all 5 therapeutic drug classes with log-fold resistance regression and binary classification.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-bold text-teal-700 mb-1">Deep Learning Sequence-Aware Transformer</p>
                    <p>ESM-2 LoRA protein transformer, 1D-CNN (k=3,5,7), and Dirichlet Evidential deep learning for epistemic uncertainty quantification.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-bold text-teal-700 mb-1">Dual-Engine ART Regimen Scoring</p>
                    <p>WHO 2026 and DHHS aligned regimen ranking engine factoring in drug-drug interactions, dual-NRTI backbone rules, and pregnancy safety.</p>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'insights' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-teal-600">
                  <Brain className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-slate-900">AI Insights & Explainability</h3>
                </div>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <p>Our hybrid clinical intelligence model computes per-residue continuous 1D Grad-CAM heatmaps to visualize the exact amino acid positions driving resistance.</p>
                  <p>The Surveillance Epistatic Mutation-Pair (SEMP) cross-attention module evaluates synergistic, antagonistic, and compensatory mutation interactions (e.g. M184V + TDF hypersensitization and G140S + Q148H catalytic rescue).</p>
                </div>
              </div>
            )}

            {activeModal === 'guidelines' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-teal-600">
                  <FileText className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-slate-900">Clinical Guidelines Alignment</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <p>DR-HIV integrates consensus rules from top international HIV advisory authorities:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-500">
                    <li><b className="text-slate-800">WHO 2026 Consolidated Guidelines:</b> First-line, second-line, and third-line preferred ART regimens.</li>
                    <li><b className="text-slate-800">Stanford HIVdb Algorithm:</b> 5-level penalty scoring for RT, PR, and IN mutations.</li>
                    <li><b className="text-slate-800">DHHS Guidelines:</b> Dual-NRTI backbone requirements and renal/hepatic safety criteria.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeModal === 'security' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-teal-600">
                  <ShieldCheck className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-slate-900">Security & Zero-PII Compliance</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <p>DR-HIV operates under a <b>Strict Zero-PII Policy</b> (HIPAA & GDPR Ready):</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-500">
                    <li>Zero names, government IDs, addresses, or emails of patients are stored.</li>
                    <li>Cryptographic token generation: <code className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded font-mono">PatientTestId = HIV-2026-XXXXX</code>.</li>
                    <li>End-to-end clinical audit logging with SHA-256 integrity verification.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeModal === 'forgot_pw' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-teal-600">
                  <Key className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-slate-900">Reset Clinician Access</h3>
                </div>
                {forgotSent ? (
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-teal-600" />
                    <span>Password reset instructions have been dispatched to your clinic registry email.</span>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Enter your authorized clinician email. Default test credentials: <code className="text-teal-700 font-bold">doctor@hivclinic.org</code> (Password: <code className="text-teal-700 font-bold">clinicalpass123</code>).
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Doctor ID / Email</label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="doctor@hivclinic.org"
                        required
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-teal-600/20"
                    >
                      Send Reset Instructions
                    </button>
                  </form>
                )}
              </div>
            )}

            {(activeModal === 'privacy' || activeModal === 'terms' || activeModal === 'support' || activeModal === 'contact') && (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-teal-600">
                  <HelpCircle className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-slate-900 uppercase">{activeModal} Information</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  DR-HIV is a clinical decision-support platform engineered for the Smart India Hackathon (SIH) 2026. All algorithms and patient workflows are designed for infectious disease clinics and healthcare research units.
                </p>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  <b>Clinical Support Desk:</b> <span className="text-teal-700 font-semibold">support@hivclinic.org</span> | 24/7 Clinical Hotline
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
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
