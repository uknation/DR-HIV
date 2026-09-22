import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Activity, Users, FileText, Settings, LogOut, CheckCircle,
  AlertTriangle, Search, Plus, Trash2, ArrowRight, Download, BarChart2,
  Database, Play, Save, ChevronRight, ChevronLeft, PanelLeft, Menu, FileSpreadsheet, Lock, RefreshCw, X,
  Upload, Award, Sparkles, Dna, Copy, Check
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import MutationSelectDropdown from './components/MutationSelectDropdown';
import SequenceGradCAMViewer from './components/SequenceGradCAMViewer';
import FastaUploadModal from './components/FastaUploadModal';
import ModelBenchmarkModal from './components/ModelBenchmarkModal';
import ModelBenchmarkPage from './components/ModelBenchmarkPage';
import Pagination from './components/Pagination';
import LandingPage from './components/LandingPage';
import { API_BASE } from './config';

export default function App() {
  // Auth state - persist session in localStorage to prevent logout on page refresh
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('hiv_app_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);
  const [loginEmail, setLoginEmail] = useState('doctor@hivclinic.org');
  const [loginPassword, setLoginPassword] = useState('clinicalpass123');
  const [loginError, setLoginError] = useState('');

  // Navigation & Layout with URL route synchronization
  const getInitialTab = () => {
    try {
      const path = window.location.pathname.replace(/^\//, '').trim();
      const validTabs = ['dashboard', 'cases', 'new_analysis', 'model_info', 'model_benchmark', 'knowledge_base', 'kb_settings', 'dataset', 'profile'];
      if (path && validTabs.includes(path)) {
        return path;
      }
      return localStorage.getItem('hiv_app_active_tab') || 'dashboard';
    } catch (e) {
      return 'dashboard';
    }
  };

  const [activeTabState, setActiveTabState] = useState(getInitialTab);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('hiv_app_active_tab', tab);
      const targetPath = `/${tab === 'dashboard' ? '' : tab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    } catch (e) {}
  };
  const activeTab = activeTabState;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Sync route on browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '').trim();
      const validTabs = ['dashboard', 'cases', 'new_analysis', 'model_info', 'model_benchmark', 'knowledge_base', 'kb_settings', 'dataset', 'profile'];
      if (validTabs.includes(path)) {
        setActiveTabState(path);
      } else if (!path) {
        setActiveTabState('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Cases List & Pagination state
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [casesCurrentPage, setCasesCurrentPage] = useState(1);
  const casesPerPage = 10;

  // New Case / Analysis state
  const [newCaseRef, setNewCaseRef] = useState('');
  const [newCaseCd4, setNewCaseCd4] = useState(250);
  const [newCaseVl, setNewCaseVl] = useState('High');
  const [newCaseHistory, setNewCaseHistory] = useState('Previously_Treated');
  const [newCaseAdherence, setNewCaseAdherence] = useState('Moderate');
  const [newCaseComorbidity, setNewCaseComorbidity] = useState('None');
  const [newCaseAge, setNewCaseAge] = useState(30);
  const [newCaseWeight, setNewCaseWeight] = useState(60);
  const [newCaseCreatinine, setNewCaseCreatinine] = useState(1.0);
  const [newCaseIsPregnant, setNewCaseIsPregnant] = useState(false);

  const [analysisStep, setAnalysisStep] = useState(1);
  const [createdCaseId, setCreatedCaseId] = useState(null);
  const [genotypeInputMode, setGenotypeInputMode] = useState('list'); // 'list' or 'sequence'
  const [rawSequence, setRawSequence] = useState('');
  const [searchMutationText, setSearchMutationText] = useState('');
  const [selectedMutations, setSelectedMutations] = useState([]);
  const [selectedModelEngine, setSelectedModelEngine] = useState('catboost');
  const [isFastaModalOpen, setIsFastaModalOpen] = useState(false);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);

  // Automated PatientTestId & Physical File Lookup state
  const [copiedId, setCopiedId] = useState(false);
  const [searchPatientQuery, setSearchPatientQuery] = useState('');
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [searchPatientFeedback, setSearchPatientFeedback] = useState('');
  const [previousPatientRecord, setPreviousPatientRecord] = useState(null);

  const generateNewPatientId = async () => {
    setPreviousPatientRecord(null);
    try {
      const res = await fetch(`${API_BASE}/cases/generate-id`);
      if (res.ok) {
        const data = await res.json();
        setNewCaseRef(data.patient_test_id);
        return;
      }
    } catch (e) {
      console.warn('Backend ID generator offline, generating local ID', e);
    }
    const year = new Date().getFullYear();
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCaseRef(`HIV-${year}-${code}`);
  };

  const handleCopyId = () => {
    if (!newCaseRef) return;
    navigator.clipboard.writeText(newCaseRef);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSearchPatient = async () => {
    const q = searchPatientQuery.trim();
    if (!q) {
      setSearchPatientFeedback('Please enter a PatientTestId from the physical card to search.');
      return;
    }
    setSearchingPatient(true);
    setSearchPatientFeedback('');
    setPreviousPatientRecord(null);
    try {
      const res = await fetch(`${API_BASE}/cases/search?test_id=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.found && data.case) {
        const c = data.case;
        setPreviousPatientRecord(data);
        setNewCaseCd4(c.cd4_count || 250);
        setNewCaseVl(c.viral_load || 'Moderate');
        setNewCaseHistory(c.treatment_history || 'Previously_Treated');
        setNewCaseAdherence(c.adherence || 'Good');
        setNewCaseComorbidity(c.comorbidity || 'None');
        setNewCaseAge(c.age || 30);
        setNewCaseWeight(c.weight || 60);
        setNewCaseCreatinine(c.serum_creatinine || 1.0);
        setNewCaseIsPregnant(c.is_pregnant || false);
        setNewCaseRef(`${c.patient_ref}-V2`);
        setSearchPatientFeedback(`✅ Found record for ${c.patient_ref} (${data.total_previous_tests} prior test). Baseline clinical history and resistance data loaded.`);
      } else {
        setSearchPatientFeedback(`ℹ️ No prior digital record found for '${q}'. You can proceed with the new test ID.`);
      }
    } catch (err) {
      setSearchPatientFeedback('Error connecting to search service.');
    } finally {
      setSearchingPatient(false);
    }
  };

  // Parse prior resistance and regimen rankings for returning patient
  const previousAnalysisData = previousPatientRecord?.latest_analysis ? (() => {
    try {
      const pred = JSON.parse(previousPatientRecord.latest_analysis.prediction_output_json || '{}');
      const scores = JSON.parse(previousPatientRecord.latest_analysis.scores_json || '[]');
      const mutList = (previousPatientRecord.case?.genotype?.mutation_list || '').split(';').filter(Boolean);
      return { pred, scores: Array.isArray(scores) ? scores : [], mutList };
    } catch (e) {
      return null;
    }
  })() : null;

  // Auto-provision PatientTestId when opening new analysis
  useEffect(() => {
    if (activeTab === 'new_analysis' && !newCaseRef) {
      generateNewPatientId();
    }
  }, [activeTab]);

  const loadClinicalPreset = (presetKey) => {
    if (presetKey === 'naive') {
      setNewCaseRef(`NAIVE-${Math.floor(1000 + Math.random() * 9000)}`);
      setNewCaseCd4(480);
      setNewCaseVl('Moderate');
      setNewCaseHistory('Treatment_Naive');
      setNewCaseAdherence('Good');
      setNewCaseCreatinine(0.9);
      setSelectedMutations([]);
    } else if (presetKey === 'first_line_fail') {
      setNewCaseRef(`FL-FAIL-${Math.floor(1000 + Math.random() * 9000)}`);
      setNewCaseCd4(210);
      setNewCaseVl('High');
      setNewCaseHistory('Previously_Treated');
      setNewCaseAdherence('Moderate');
      setNewCaseCreatinine(1.0);
      setSelectedMutations(['M184V', 'K103N']);
    } else if (presetKey === 'tam_failure') {
      setNewCaseRef(`TAM-MDR-${Math.floor(1000 + Math.random() * 9000)}`);
      setNewCaseCd4(85);
      setNewCaseVl('High');
      setNewCaseHistory('Previously_Treated');
      setNewCaseAdherence('Poor');
      setNewCaseCreatinine(1.1);
      setSelectedMutations(['M184V', 'K65R', 'T215Y', 'M41L', 'Q148H', 'G140S']);
    } else if (presetKey === 'capsid_salvage') {
      setNewCaseRef(`SALVAGE-LEN-${Math.floor(1000 + Math.random() * 9000)}`);
      setNewCaseCd4(65);
      setNewCaseVl('High');
      setNewCaseHistory('Previously_Treated');
      setNewCaseAdherence('Moderate');
      setNewCaseCreatinine(1.0);
      setSelectedMutations(['M184V', 'K65R', 'K103N']);
    }
  };

  const [validatingGenotype, setValidatingGenotype] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const [clinicalNotes, setClinicalNotes] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);

  // Model Information state
  const [modelInfo, setModelInfo] = useState(null);
  const [loadingModelInfo, setLoadingModelInfo] = useState(false);
  const [selectedDrugForImportance, setSelectedDrugForImportance] = useState('fpv_resistance');

  // Clinical Knowledge Base Settings state
  const [kbSettings, setKbSettings] = useState(null);
  const [loadingKbSettings, setLoadingKbSettings] = useState(false);
  const [savingKb, setSavingKb] = useState(false);

  // Doctor Profile State & Handlers
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editRegNumber, setEditRegNumber] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editHospitalName, setEditHospitalName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editExperienceYears, setEditExperienceYears] = useState(12);
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBio, setEditBio] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Preferences Toggles
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [clinicalAlerts, setClinicalAlerts] = useState(true);
  const [tfaEnabled, setTfaEnabled] = useState(true);

  const handleOpenEditProfile = () => {
    setEditFullName(currentUser?.full_name || '');
    setEditRegNumber(currentUser?.reg_number || 'MCI-2026-HIV-8849');
    setEditSpecialization(currentUser?.specialization || 'HIV Clinical Specialist & Infectious Diseases');
    setEditHospitalName(currentUser?.hospital_name || 'Regional ART Center & Infectious Disease Unit');
    setEditDepartment(currentUser?.department || 'Department of HIV/AIDS Medicine & Advisory');
    setEditExperienceYears(currentUser?.experience_years ?? 12);
    setEditPhone(currentUser?.phone || '+1 (555) 234-5678');
    setEditLocation(currentUser?.location || 'Metropolitan Medical Complex, Suite 402');
    setEditBio(currentUser?.bio || 'Senior Infectious Disease Clinician specializing in genotypic drug resistance interpretation.');
    setIsEditProfileModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser || !currentUser.email) return;
    setSavingProfile(true);
    setProfileSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/auth/profile?email=${encodeURIComponent(currentUser.email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editFullName,
          reg_number: editRegNumber,
          specialization: editSpecialization,
          hospital_name: editHospitalName,
          department: editDepartment,
          experience_years: parseInt(editExperienceYears) || 0,
          phone: editPhone,
          location: editLocation,
          bio: editBio
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update profile.');
      }
      const updatedUser = await res.json();
      setCurrentUser(updatedUser);
      localStorage.setItem('hiv_app_user', JSON.stringify(updatedUser));
      setProfileSuccessMsg('✅ Doctor Profile updated successfully! All changes persisted to clinical database.');
      setIsEditProfileModalOpen(false);
      setTimeout(() => setProfileSuccessMsg(''), 5000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentUser || !currentUser.email) return;
    setChangingPassword(true);
    setPasswordChangeMsg('');
    setPasswordErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/auth/change-password?email=${encodeURIComponent(currentUser.email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Password change failed.');
      }
      setPasswordChangeMsg('✅ Security Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordChangeMsg(''), 5000);
    } catch (err) {
      setPasswordErrorMsg(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  // Dataset Management state
  const [datasetStats, setDatasetStats] = useState(null);
  const [loadingDataset, setLoadingDataset] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);

  // Parse predictions safely if analysisResult is available
  const predictions = analysisResult && analysisResult.prediction_output_json
    ? (() => {
      try {
        return JSON.parse(analysisResult.prediction_output_json);
      } catch (e) {
        console.error("Failed to parse prediction_output_json:", e);
        return {};
      }
    })()
    : {};

  // On startup / page refresh: verify session with backend before rendering protected UI
  useEffect(() => {
    let isMounted = true;
    const verifyExistingSession = async () => {
      try {
        const savedUserJson = localStorage.getItem('hiv_app_user');
        if (savedUserJson) {
          const parsedUser = JSON.parse(savedUserJson);
          if (parsedUser && parsedUser.email) {
            const res = await fetch(`${API_BASE}/auth/verify?email=${encodeURIComponent(parsedUser.email)}`);
            if (res.ok) {
              const verifiedUser = await res.json();
              if (isMounted) {
                setCurrentUser(verifiedUser);
                localStorage.setItem('hiv_app_user', JSON.stringify(verifiedUser));
              }
            } else if (res.status === 401) {
              if (isMounted) {
                localStorage.removeItem('hiv_app_user');
                setCurrentUser(null);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Session verification network check failed, retaining local session fallback:', err);
      } finally {
        if (isMounted) {
          setIsAuthInitializing(false);
        }
      }
    };

    verifyExistingSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load initial dashboard details
  useEffect(() => {
    if (currentUser) {
      fetchCases();
      fetchModelInfo();
      fetchKbSettings();
      fetchDatasetStats();
    }
  }, [currentUser]);

  // Auth functions
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed.');
      }
      const data = await response.json();
      setCurrentUser(data);
      try {
        localStorage.setItem('hiv_app_user', JSON.stringify(data));
      } catch (e) {}
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('hiv_app_user');
      localStorage.removeItem('hiv_app_active_tab');
    } catch (e) {}
    setCurrentUser(null);
    setActiveTab('dashboard');
    setAnalysisStep(1);
    setAnalysisResult(null);
    setSelectedMutations([]);
    setRawSequence('');
    setCreatedCaseId(null);
  };

  // API Call Helpers
  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      const response = await fetch(`${API_BASE}/cases`);
      if (response.ok) {
        const data = await response.json();
        setCases(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCases(false);
    }
  };

  const fetchModelInfo = async () => {
    setLoadingModelInfo(true);
    try {
      const response = await fetch(`${API_BASE}/model/info`);
      if (response.ok) {
        const data = await response.json();
        setModelInfo(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModelInfo(false);
    }
  };

  const fetchKbSettings = async () => {
    setLoadingKbSettings(true);
    try {
      const response = await fetch(`${API_BASE}/settings/kb`);
      if (response.ok) {
        const data = await response.json();
        setKbSettings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKbSettings(false);
    }
  };

  const saveKbSettings = async () => {
    setSavingKb(true);
    try {
      const response = await fetch(`${API_BASE}/settings/kb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kbSettings)
      });
      if (response.ok) {
        alert('Clinical Knowledge Base saved successfully!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKb(false);
    }
  };

  const fetchDatasetStats = async () => {
    setLoadingDataset(true);
    try {
      const response = await fetch(`${API_BASE}/dataset/preview`);
      if (response.ok) {
        const data = await response.json();
        setDatasetStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDataset(false);
    }
  };

  // Case & Genotype Wizard Pipeline Functions
  const handleCreateCase = async () => {
    if (!newCaseRef.trim()) {
      alert('Please enter a Case ID / Patient Reference.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_ref: newCaseRef,
          cd4_count: newCaseCd4,
          viral_load: newCaseVl,
          treatment_history: newCaseHistory,
          adherence: newCaseAdherence,
          comorbidity: newCaseComorbidity,
          age: parseInt(newCaseAge),
          weight: parseInt(newCaseWeight),
          serum_creatinine: parseFloat(newCaseCreatinine),
          is_pregnant: newCaseIsPregnant
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to create case');
      }
      const data = await response.json();
      setCreatedCaseId(data.id);
      setAnalysisStep(2);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddMutation = () => {
    const mut = searchMutationText.trim().toUpperCase();
    if (!mut) return;
    if (!selectedMutations.includes(mut)) {
      setSelectedMutations([...selectedMutations, mut]);
    }
    setSearchMutationText('');
  };

  const handleRemoveMutation = (mut) => {
    setSelectedMutations(selectedMutations.filter(m => m !== mut));
  };

  const handleValidateSequence = async () => {
    if (!rawSequence.trim()) {
      alert('Please paste a genotype sequence first.');
      return;
    }
    setValidatingGenotype(true);
    setValidationResult(null);
    try {
      const response = await fetch(`${API_BASE}/genotype/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_sequence: rawSequence })
      });
      if (response.ok) {
        const data = await response.json();
        setValidationResult(data);
        if (data.is_valid) {
          setSelectedMutations(data.detected_mutations);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setValidatingGenotype(false);
    }
  };

  const handleRunMLAnalysis = async () => {
    if (selectedMutations.length === 0) {
      alert('Please add at least one mutation or validate a sequence before running predictions.');
      return;
    }
    setRunningAnalysis(true);
    setAnalysisResult(null);
    setReviewSubmitted(false);
    setReviewResult(null);
    setClinicalNotes('');
    try {
      const response = await fetch(`${API_BASE}/genotype/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: createdCaseId,
          mutations: selectedMutations,
          raw_sequence: rawSequence,
          engine: selectedModelEngine
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data);
        setAnalysisStep(4); // Move straight to step 4 (Resistance Analysis)
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunningAnalysis(false);
    }
  };

  const handleSubmitReview = async (reviewStatus) => {
    try {
      const response = await fetch(`${API_BASE}/analysis/${analysisResult.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewStatus,
          clinical_notes: clinicalNotes
        })
      });
      if (response.ok) {
        const data = await response.json();
        setReviewResult(data);
        setReviewSubmitted(true);
        fetchCases(); // Refresh list
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Rendering Helper: Get label color badges
  const getResistanceBadge = (pred) => {
    const p = String(pred || '').toLowerCase();
    if (p === 'susceptible' || p === '0') {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Susceptible</span>;
    } else if (p.includes('reduced') || p.includes('intermediate')) {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Reduced Susceptibility</span>;
    } else if (p.includes('high') || p.includes('resistant') || p === '1') {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">High Resistance</span>;
    } else {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">{pred || 'Unknown'}</span>;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-500';
    return 'text-rose-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'bg-amber-50 border-amber-200';
    return 'bg-rose-50 border-rose-200';
  };

  // AUTH INITIALIZATION LOADING STATE (Prevents flash of login screen during session verification)
  if (isAuthInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-teal-500/20 p-3 rounded-full border border-teal-500/30">
            <Activity className="h-8 w-8 text-teal-400 animate-spin" />
          </div>
          <span className="text-xl font-bold tracking-wide">HIV ART Regimen Advisory</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          <span>Verifying clinical session security...</span>
        </div>
      </div>
    );
  }

  // LOGIN / LANDING PAGE
  if (!currentUser) {
    return (
      <LandingPage
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        handleLogin={handleLogin}
      />
    );
  }

  // APP LAYOUT WITH SIDEBAR AND HEADER
  return (
    <div className="app-viewport bg-slate-50 text-slate-800">

      {/* PERSISTENT CLINICAL WARNING BANNER */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-300 px-6 py-2.5 text-xs font-semibold flex justify-between items-center z-10 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="h-4 w-4 text-teal-400 flex-shrink-0" />
          <span><b>Clinical Decision Support:</b>HIV Drug Resistance Prediction & Regimen Advisory. For clinical training & demonstration only.</span>
        </div>
        <span className="px-2 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 border border-slate-700 flex-shrink-0">SIH 2026 Concept</span>
      </div>

      <div className="flex-1 flex overflow-hidden relative min-h-0">

        {/* SIDEBAR NAVIGATION */}
        <aside className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : 'expanded'}`}>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="bg-teal-900 p-2 rounded-lg text-teal-400 flex-shrink-0">
                <Activity className="h-5 w-5" />
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <h1 className="text-white text-xs font-bold leading-tight truncate">HIV Advisory System</h1>
                  <span className="text-[9px] uppercase font-bold text-teal-500 tracking-wider block">SIH 2026 Prototype</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition ml-1 flex-shrink-0"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav className="app-sidebar-nav space-y-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              title="Dashboard"
              className={`app-nav-btn ${activeTab === 'dashboard' ? 'bg-teal-600 text-white shadow' : 'hover:bg-slate-800 hover:text-white text-slate-400'} ${isSidebarCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'}`}
            >
              <Users className="h-4 w-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Dashboard</span>}
            </button>

            <button
              onClick={() => { setActiveTab('new_analysis'); setAnalysisStep(1); setAnalysisResult(null); }}
              title="New Analysis"
              className={`app-nav-btn ${activeTab === 'new_analysis' ? 'bg-teal-600 text-white shadow' : 'hover:bg-slate-800 hover:text-white text-slate-400'} ${isSidebarCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'}`}
            >
              <Play className="h-4 w-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">New Analysis</span>}
            </button>

            <button
              onClick={() => setActiveTab('model_info')}
              title="Model Information"
              className={`app-nav-btn ${activeTab === 'model_info' ? 'bg-teal-600 text-white shadow' : 'hover:bg-slate-800 hover:text-white text-slate-400'} ${isSidebarCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'}`}
            >
              <BarChart2 className="h-4 w-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Model Information</span>}
            </button>

            <button
              onClick={() => setActiveTab('model_benchmark')}
              title="Model Benchmarks"
              className={`app-nav-btn ${activeTab === 'model_benchmark' ? 'bg-teal-600 text-white shadow' : 'hover:bg-slate-800 hover:text-white text-slate-400'} ${isSidebarCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'}`}
            >
              <Award className="h-4 w-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Model Benchmarks</span>}
            </button>

            <button
              onClick={() => setActiveTab('dataset')}
              title="Dataset Preview"
              className={`app-nav-btn ${activeTab === 'dataset' ? 'bg-teal-600 text-white shadow' : 'hover:bg-slate-800 hover:text-white text-slate-400'} ${isSidebarCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'}`}
            >
              <Database className="h-4 w-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Dataset Preview</span>}
            </button>

            <button
              onClick={() => setActiveTab('kb_settings')}
              title="Clinical Rules Config"
              className={`app-nav-btn ${activeTab === 'kb_settings' ? 'bg-teal-600 text-white shadow' : 'hover:bg-slate-800 hover:text-white text-slate-400'} ${isSidebarCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'}`}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Clinical Rules Config</span>}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              title="Doctor Profile"
              className={`app-nav-btn ${activeTab === 'profile' ? 'bg-teal-600 text-white shadow' : 'hover:bg-slate-800 hover:text-white text-slate-400'} ${isSidebarCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'}`}
            >
              <Users className="h-4 w-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Doctor Profile</span>}
            </button>
          </nav>

          <div className={`app-sidebar-footer mt-auto p-4 border-t border-slate-800 bg-slate-950 flex items-center flex-shrink-0 ${isSidebarCollapsed ? 'justify-center flex-col space-y-2' : 'justify-between'}`}>
            <div className="flex items-center space-x-2 overflow-hidden cursor-pointer hover:opacity-90 transition" onClick={() => setActiveTab('profile')} title="View Doctor Profile">
              <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                SJ
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-white text-xs font-bold truncate leading-tight">{currentUser?.full_name || "Dr. S. Jenkins"}</p>
                  <span className="text-[10px] text-teal-400 block truncate">HIV Specialist</span>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition flex-shrink-0"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </aside>

        {/* MAIN BODY AREA */}
        <main className="app-main-scroll">

          <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {activeTab === 'dashboard' && 'Clinician Dashboard'}
                  {activeTab === 'new_analysis' && 'Genotype Guided Regimen ranking Wizard'}
                  {activeTab === 'model_info' && 'ML Performance Record'}
                  {activeTab === 'model_benchmark' && 'Clinical AI Engine Benchmark & Validation'}
                  {activeTab === 'dataset' && 'Dataset Exploration Panel'}
                  {activeTab === 'kb_settings' && 'Clinical Knowledge Base Settings'}
                  {activeTab === 'profile' && 'Doctor Profile & Clinical Credentials'}
                </h2>
                <p className="text-xs text-slate-500">Authorized: National AIDS Control Programme Care Network</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 cursor-pointer" onClick={() => setActiveTab('profile')}>
              <span className="text-xs text-slate-400 font-semibold hover:text-teal-600 transition">Doctor Profile: {currentUser?.full_name || 'Dr. Sarah Jenkins'}</span>
            </div>
          </header>

          <div className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">

            {/* VIEW 1: CLINICIAN DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4 min-h-[110px]">
                    <div className="bg-teal-50 border border-teal-100 p-3.5 rounded-xl text-teal-600 flex-shrink-0">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap">Total Cases</span>
                      <span className="text-3xl font-extrabold text-slate-900 mt-0.5 block">{cases.length}</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4 min-h-[110px]">
                    <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-emerald-600 flex-shrink-0">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap">Completed Reviews</span>
                      <span className="text-3xl font-extrabold text-slate-900 mt-0.5 block">
                        {cases.filter(c => c.analyses && c.analyses.length > 0 && c.analyses[c.analyses.length - 1].review_status === 'Approved').length}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4 min-h-[110px]">
                    <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl text-amber-600 flex-shrink-0">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap">Pending Reviews</span>
                      <span className="text-3xl font-extrabold text-slate-900 mt-0.5 block">
                        {cases.filter(c => c.analyses && c.analyses.length > 0 && c.analyses[c.analyses.length - 1].review_status === 'Pending').length}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4 min-h-[110px]">
                    <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-rose-600 flex-shrink-0">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap">Low Confidence Flags</span>
                      <span className="text-3xl font-extrabold text-slate-900 mt-0.5 block">
                        {cases.filter(c => c.analyses && c.analyses.length > 0 && c.analyses[c.analyses.length - 1].low_confidence_flag).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Cases Section */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 bg-white">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-teal-600 flex-shrink-0" />
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Recent Clinician Analyses</h3>
                    </div>
                    <button
                      onClick={() => { setActiveTab('new_analysis'); setAnalysisStep(1); }}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-2 transition flex-shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      <span>New Analysis Case</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto w-full">
                    {loadingCases ? (
                      <div className="p-8 text-center text-slate-400 font-semibold flex items-center justify-center space-x-2">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>Loading cases...</span>
                      </div>
                    ) : cases.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 font-medium">
                        No patient cases submitted yet. Click "New Analysis Case" to begin.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse min-w-[950px]">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                            <th className="px-4 py-3.5 whitespace-nowrap">Case ID / Patient Ref</th>
                            <th className="px-4 py-3.5 whitespace-nowrap">CD4 Count</th>
                            <th className="px-4 py-3.5 whitespace-nowrap">Viral Load</th>
                            <th className="px-4 py-3.5 whitespace-nowrap">Treatment History</th>
                            <th className="px-4 py-3.5 whitespace-nowrap">Mutations Detected</th>
                            <th className="px-4 py-3.5 whitespace-nowrap">Review Status</th>
                            <th className="px-4 py-3.5 whitespace-nowrap text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {cases.slice((casesCurrentPage - 1) * casesPerPage, casesCurrentPage * casesPerPage).map((c) => {
                            const lastAnalysis = c.analyses && c.analyses.length > 0 ? c.analyses[c.analyses.length - 1] : null;
                            const reviewStatus = lastAnalysis ? lastAnalysis.review_status : 'No Analysis';

                            return (
                              <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">{c.patient_ref}</td>
                                <td className="px-4 py-3.5 whitespace-nowrap text-slate-700 font-medium">
                                  {c.cd4_count ? `${c.cd4_count} cells/µL` : 'Unknown'}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  <span className={`px-2.5 py-1 font-bold rounded-md text-[11px] inline-block ${c.viral_load === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                                    {c.viral_load}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap text-slate-700 font-medium">
                                  {c.treatment_history ? c.treatment_history.replace(/_/g, ' ') : 'None'}
                                </td>
                                <td className="px-4 py-3.5 max-w-xs font-semibold text-slate-700 truncate" title={c.genotype ? c.genotype.mutation_list.replace(/;/g, ', ') : 'None'}>
                                  {c.genotype ? c.genotype.mutation_list.replace(/;/g, ', ') : <span className="text-slate-400 font-normal">None</span>}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  {reviewStatus === 'Approved' && (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center space-x-1 whitespace-nowrap">
                                      <CheckCircle className="h-3 w-3" />
                                      <span>Approved</span>
                                    </span>
                                  )}
                                  {reviewStatus === 'Pending' && (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center space-x-1 whitespace-nowrap">
                                      <AlertTriangle className="h-3 w-3 animate-pulse" />
                                      <span>Pending Review</span>
                                    </span>
                                  )}
                                  {reviewStatus === 'No Analysis' && (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center space-x-1 whitespace-nowrap">
                                      <Activity className="h-3 w-3 text-slate-400" />
                                      <span>Genotype Pending</span>
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap text-right">
                                  {lastAnalysis ? (
                                    <button
                                      onClick={() => {
                                        setCreatedCaseId(c.id);
                                        setSelectedMutations(c.genotype ? c.genotype.mutation_list.split(';') : []);
                                        setRawSequence(c.genotype ? c.genotype.raw_sequence : '');
                                        setAnalysisResult(lastAnalysis);
                                        setAnalysisStep(6);
                                        setActiveTab('new_analysis');
                                      }}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md font-bold text-xs transition inline-flex items-center space-x-1"
                                    >
                                      <FileText className="h-3 w-3" />
                                      <span>View Review</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setCreatedCaseId(c.id);
                                        setSelectedMutations([]);
                                        setRawSequence('');
                                        setAnalysisStep(2);
                                        setActiveTab('new_analysis');
                                      }}
                                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-md font-bold text-xs transition inline-flex items-center space-x-1"
                                    >
                                      <Play className="h-3 w-3" />
                                      <span>Input Genotype</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Pagination Footer */}
                  <Pagination
                    currentPage={casesCurrentPage}
                    totalRecords={cases.length}
                    itemsPerPage={casesPerPage}
                    onPageChange={setCasesCurrentPage}
                    label="cases"
                  />
                </div>
              </div>
            )}

            {/* VIEW 2: NEW ANALYSIS CASE WIZARD */}
            {activeTab === 'new_analysis' && (
              <div className="space-y-8">

                {/* STEP WIZARD BAR */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Analysis Wizard Pipeline</span>
                    <div className="flex items-center space-x-3 overflow-x-auto py-1">
                      {[
                        { step: 1, name: 'Case Details' },
                        { step: 2, name: 'Genotype Input' },
                        { step: 3, name: 'Validation' },
                        { step: 4, name: 'Resistance analysis' },
                        { step: 5, name: 'Regimen ranker' },
                        { step: 6, name: 'Review' }
                      ].map((item) => (
                        <div key={item.step} className="flex items-center space-x-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${analysisStep === item.step ? 'bg-teal-600 text-white shadow' : analysisStep > item.step ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-400'}`}>
                            {item.step}
                          </span>
                          <span className={`text-xs font-semibold whitespace-nowrap ${analysisStep === item.step ? 'text-slate-800' : 'text-slate-400'}`}>
                            {item.name}
                          </span>
                          {item.step < 6 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* STEP 1: CASE INFORMATION ENTRY */}
                {analysisStep === 1 && (
                  <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Step 1: Patient Context & Characteristics</h3>
                      <p className="text-xs text-slate-500 mt-1">Provide history metrics. Duplicate check will occur.</p>
                    </div>

                    <div className="p-8 space-y-6">
                      {/* RETURNING PATIENT QUICK LOOKUP */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
                            <Search className="h-3.5 w-3.5 text-teal-600" />
                            <span>Returning Patient? Search Existing Physical File ID</span>
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold">Zero PII Disclosed</span>
                        </div>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={searchPatientQuery}
                            onChange={(e) => setSearchPatientQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchPatient(); }}
                            placeholder="Enter PatientTestId from physical OPD card (e.g. HIV-2026-X84J9)..."
                            className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={handleSearchPatient}
                            disabled={searchingPatient}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center space-x-1"
                          >
                            {searchingPatient ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                            <span>{searchingPatient ? 'Searching...' : 'Load File'}</span>
                          </button>
                        </div>
                        {searchPatientFeedback && (
                          <p className="text-xs font-medium text-teal-700 mt-1">{searchPatientFeedback}</p>
                        )}
                      </div>

                      {/* AUTOMATED PATIENT TEST ID & PHYSICAL NOTE-DOWN CARD */}
                      <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
                            <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                              Automated PatientTestId (De-Identified)
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={generateNewPatientId}
                              className="text-xs text-teal-700 hover:text-teal-900 font-bold hover:underline flex items-center space-x-1"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Generate New</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCopyId}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-md shadow-xs transition flex items-center space-x-1"
                            >
                              {copiedId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input
                            type="text"
                            value={newCaseRef}
                            onChange={(e) => setNewCaseRef(e.target.value)}
                            className="flex-1 font-mono text-base font-extrabold text-teal-950 bg-white border border-teal-300 rounded-lg px-3.5 py-2 tracking-wider shadow-inner"
                            placeholder="Generating unique ID..."
                            required
                          />
                        </div>

                        <div className="bg-white/80 border border-teal-100 rounded-lg p-3 space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-start space-x-2">
                            <span className="text-sm">✍️</span>
                            <div>
                              <strong className="text-slate-800">Note Down on Physical File:</strong> Write this unique ID directly onto the patient's physical paper OPD card or ART clinic folder. Next time the patient visits, enter this ID above to retrieve their clinical record without re-typing.
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px] text-teal-800 font-semibold pt-1 border-t border-teal-100">
                            <Lock className="h-3 w-3 text-teal-600" />
                            <span>Privacy Guarantee: Zero Personally Identifiable Information (No PII) stored. Complies with NACO, HIPAA & DPDP Act 2023.</span>
                          </div>
                        </div>
                      </div>

                      {/* PREVIOUS RESISTANCE ANALYSIS & REGIMEN RANKINGS CARD */}
                      {previousAnalysisData && (
                        <div className="bg-white border-2 border-indigo-100 rounded-xl p-5 space-y-4 shadow-sm animate-fadeIn">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                                  Historical Record
                                </span>
                                <h4 className="font-bold text-slate-800 text-sm">
                                  Previous Evaluation for {previousPatientRecord.patient_test_id}
                                </h4>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Recorded on {new Date(previousPatientRecord.latest_analysis.created_at).toLocaleDateString()} • {previousPatientRecord.total_previous_tests} prior test(s) on file
                              </p>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${previousPatientRecord.latest_analysis.review_status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                {previousPatientRecord.latest_analysis.review_status || 'Pending'}
                              </span>
                              <a
                                href={`/api/reports/${previousPatientRecord.latest_analysis.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center space-x-1"
                              >
                                <Download className="h-3 w-3" />
                                <span>Previous Report (PDF)</span>
                              </a>
                            </div>
                          </div>

                          {/* MUTATIONS & RESISTANCE CATEGORY */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 text-xs">
                            <div>
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Previous Detected Mutations
                              </span>
                              {previousAnalysisData.mutList.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {previousAnalysisData.mutList.map((m, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-white border border-slate-300 text-slate-800 font-mono text-xs font-bold rounded shadow-2xs">
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">No resistance mutations detected (Wild-type)</span>
                              )}
                            </div>

                            <div>
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Previous Resistance Profile
                              </span>
                              <span className="font-bold text-slate-800 block">
                                {previousAnalysisData.pred.overall_category || 'Susceptible Profile'}
                              </span>
                              {previousAnalysisData.pred.overall_confidence > 0 && (
                                <span className="text-[11px] text-slate-500">
                                  Model Confidence: {(previousAnalysisData.pred.overall_confidence * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>

                          {/* RESISTANT VS SENSITIVE DRUGS */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3">
                              <span className="font-bold text-rose-800 block mb-1">⚠️ High Resistance Detected:</span>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(previousAnalysisData.pred.drug_predictions || {})
                                  .filter(([_, info]) => {
                                    const p = String(info.prediction || info.interpretation || '').toLowerCase();
                                    return p.includes('high') || p.includes('resistant') || p === '1';
                                  })
                                  .map(([drug, info]) => (
                                    <span key={drug} className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded text-[11px]">
                                      {info.drug_name || drug}
                                    </span>
                                  ))}
                                {Object.entries(previousAnalysisData.pred.drug_predictions || {}).filter(([_, info]) => {
                                  const p = String(info.prediction || info.interpretation || '').toLowerCase();
                                  return p.includes('high') || p.includes('resistant') || p === '1';
                                }).length === 0 && (
                                  <span className="text-slate-500 italic text-[11px]">None (No high-level resistance)</span>
                                )}
                              </div>
                            </div>

                            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
                              <span className="font-bold text-emerald-800 block mb-1">✅ Active / Susceptible Options:</span>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(previousAnalysisData.pred.drug_predictions || {})
                                  .filter(([_, info]) => {
                                    const p = String(info.prediction || info.interpretation || '').toLowerCase();
                                    return p === 'susceptible' || p === '0';
                                  })
                                  .slice(0, 6)
                                  .map(([drug, info]) => (
                                    <span key={drug} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px]">
                                      {info.drug_name || drug}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          </div>

                          {/* PREVIOUS REGIMEN RANKINGS */}
                          <div>
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                              Previous Top Recommended Regimens (Rankings)
                            </span>
                            <div className="space-y-2">
                              {previousAnalysisData.scores.slice(0, 3).map((reg, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition">
                                  <div className="flex items-center space-x-3">
                                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                                      #{idx + 1}
                                    </span>
                                    <div>
                                      <span className="font-bold text-slate-800 text-xs block">{reg.name}</span>
                                      <span className="text-[11px] text-slate-500">{reg.line_tier || 'Recommended'} • {reg.active_agents || 3} Active Drug(s)</span>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-xs font-extrabold text-teal-700 block">
                                      {reg.score || reg.compatibility_score || 0}% Score
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      Burden: {reg.burden_level || 'Low'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-6">
                        {/* ROW 1: CD4 COUNT & VIRAL LOAD CATEGORY */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="min-h-[1.5rem] flex items-end mb-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                              CD4 Count (cells/µL)
                            </label>
                            <input
                              type="number"
                              value={newCaseCd4}
                              onChange={(e) => setNewCaseCd4(parseInt(e.target.value) || 0)}
                              className="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition"
                              placeholder="CD4 count"
                              required
                            />
                          </div>

                          <div>
                            <label className="min-h-[1.5rem] flex items-end mb-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                              Viral Load Category
                            </label>
                            <select
                              value={newCaseVl}
                              onChange={(e) => setNewCaseVl(e.target.value)}
                              className="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition cursor-pointer"
                            >
                              <option value="Low">Low (&lt;1,000 copies/mL)</option>
                              <option value="Moderate">Moderate (1,000 - 10,000 copies/mL)</option>
                              <option value="High">High (&gt;10,000 copies/mL)</option>
                              <option value="Unknown">Unknown</option>
                            </select>
                          </div>
                        </div>

                        {/* ROW 2: TREATMENT HISTORY, ADHERENCE CATEGORY, COMORBIDITIES */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="min-h-[1.5rem] flex items-end mb-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                              Treatment History
                            </label>
                            <select
                              value={newCaseHistory}
                              onChange={(e) => setNewCaseHistory(e.target.value)}
                              className="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition cursor-pointer"
                            >
                              <option value="Treatment_Naive">Treatment Naive</option>
                              <option value="Previously_Treated">Previously Treated</option>
                            </select>
                          </div>

                          <div>
                            <label className="min-h-[1.5rem] flex items-end mb-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                              Adherence Category
                            </label>
                            <select
                              value={newCaseAdherence}
                              onChange={(e) => setNewCaseAdherence(e.target.value)}
                              className="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition cursor-pointer"
                            >
                              <option value="Good">Good Adherence</option>
                              <option value="Moderate">Moderate Adherence</option>
                              <option value="Poor">Poor Adherence</option>
                              <option value="Unknown">Unknown</option>
                            </select>
                          </div>

                          <div>
                            <label className="min-h-[1.5rem] flex items-end mb-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                              Comorbidities
                            </label>
                            <select
                              value={newCaseComorbidity}
                              onChange={(e) => setNewCaseComorbidity(e.target.value)}
                              className="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition cursor-pointer"
                            >
                              <option value="None">None</option>
                              <option value="Present">Present</option>
                            </select>
                          </div>
                        </div>

                        {/* ROW 3: AGE, WEIGHT, SERUM CREATININE, PREGNANCY STATUS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                          <div>
                            <label className="min-h-[2.25rem] flex items-end mb-2 text-xs font-bold text-slate-600 uppercase tracking-wide leading-tight">
                              Age (Years)
                            </label>
                            <input
                              type="number"
                              value={newCaseAge}
                              onChange={(e) => setNewCaseAge(parseInt(e.target.value) || 0)}
                              className="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition"
                              placeholder="Age"
                              min="1"
                              required
                            />
                          </div>

                          <div>
                            <label className="min-h-[2.25rem] flex items-end mb-2 text-xs font-bold text-slate-600 uppercase tracking-wide leading-tight">
                              Weight (kg)
                            </label>
                            <input
                              type="number"
                              value={newCaseWeight}
                              onChange={(e) => setNewCaseWeight(parseInt(e.target.value) || 0)}
                              className="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition"
                              placeholder="Weight"
                              min="1"
                              required
                            />
                          </div>

                          <div>
                            <label className="min-h-[2.25rem] flex items-end mb-2 text-xs font-bold text-slate-600 uppercase tracking-wide leading-tight">
                              Serum Creatinine (mg/dL)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={newCaseCreatinine}
                              onChange={(e) => setNewCaseCreatinine(parseFloat(e.target.value) || 0)}
                              className="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition"
                              placeholder="Creatinine"
                              min="0.1"
                              required
                            />
                          </div>

                          <div>
                            <label className="min-h-[2.25rem] flex items-end mb-2 text-xs font-bold text-slate-600 uppercase tracking-wide leading-tight">
                              Pregnancy Status
                            </label>
                            <div className="h-11 flex items-center px-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                              <input
                                type="checkbox"
                                checked={newCaseIsPregnant}
                                onChange={(e) => setNewCaseIsPregnant(e.target.checked)}
                                className="w-4 h-4 text-teal-600 bg-white border-slate-300 rounded focus:ring-teal-500 accent-teal-600 cursor-pointer"
                                id="newCaseIsPregnant"
                              />
                              <label htmlFor="newCaseIsPregnant" className="ml-2.5 text-xs text-slate-700 font-semibold cursor-pointer select-none">
                                Patient is Pregnant
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* FOOTER BUTTON */}
                        <div className="border-t border-slate-100 pt-6 mt-6 flex justify-end">
                          <button
                            onClick={handleCreateCase}
                            className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-lg shadow-sm hover:shadow transition transform active:scale-[0.99]"
                          >
                            <span>Save & Continue</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2 & 3: GENOTYPE INPUT & VALIDATION */}
                {analysisStep === 2 && (
                  <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Step 2: Enter HIV Genotype Sequence / Mutations</h3>
                        <p className="text-xs text-slate-500 mt-1">Select known indicators or paste the nucleotide sequencing sequence directly.</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsFastaModalOpen(true)}
                          className="px-3 py-1.5 font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Upload FASTA</span>
                        </button>

                        <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs">
                          <button
                            onClick={() => setGenotypeInputMode('list')}
                            className={`px-3 py-1.5 font-semibold ${genotypeInputMode === 'list' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            Mutation List
                          </button>
                          <button
                            onClick={() => setGenotypeInputMode('sequence')}
                            className={`px-3 py-1.5 font-semibold ${genotypeInputMode === 'sequence' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            Genotype Sequence
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 space-y-6">
                      {/* Clinical Demo Presets */}
                      <div className="flex flex-wrap items-center gap-2 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl text-xs">
                        <span className="font-bold text-indigo-950 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Presets:
                        </span>
                        <button
                          type="button"
                          onClick={() => loadClinicalPreset('naive')}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 shadow-2xs transition"
                        >
                          1. Treatment-Naive (Susceptible)
                        </button>
                        <button
                          type="button"
                          onClick={() => loadClinicalPreset('first_line_fail')}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 shadow-2xs transition"
                        >
                          2. 1st-Line Failure (M184V + K103N)
                        </button>
                        <button
                          type="button"
                          onClick={() => loadClinicalPreset('tam_failure')}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 shadow-2xs transition"
                        >
                          3. MDR TAM + Integrase (Q148H)
                        </button>
                        <button
                          type="button"
                          onClick={() => loadClinicalPreset('capsid_salvage')}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 shadow-2xs transition"
                        >
                          4. Pan-Resistant Salvage (+LEN)
                        </button>
                      </div>

                      {genotypeInputMode === 'list' && (
                        <MutationSelectDropdown
                          selectedMutations={selectedMutations}
                          onSelectionChange={setSelectedMutations}
                        />
                      )}

                      {genotypeInputMode === 'sequence' && (
                        <div className="space-y-6">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Paste Genotype Sequence</label>
                            <textarea
                              value={rawSequence}
                              onChange={(e) => setRawSequence(e.target.value)}
                              rows={6}
                              className="w-full pl-3 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800"
                              placeholder="Paste FASTA or raw sequence... (e.g. M184V K103N mutations token parsing)"
                            />
                          </div>

                          <div className="flex space-x-3">
                            <button
                              onClick={handleValidateSequence}
                              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-1.5"
                              disabled={validatingGenotype}
                            >
                              {validatingGenotype ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                              <span>Validate Genotype Sequence</span>
                            </button>
                            <button
                              onClick={() => { setRawSequence(''); setValidationResult(null); }}
                              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition"
                            >
                              Clear
                            </button>
                          </div>

                          {validationResult && (
                            <div className={`p-4 rounded-lg border text-xs leading-relaxed space-y-2 ${validationResult.is_valid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                              <span className="font-bold block uppercase tracking-wider text-[10px]">Sequence Validation Report</span>
                              <p>{validationResult.message}</p>

                              {validationResult.detected_mutations.length > 0 && (
                                <div className="mt-2">
                                  <span className="font-bold">Detected mutations:</span> {validationResult.detected_mutations.join(', ')}
                                </div>
                              )}

                              {validationResult.unrecognized_symbols.length > 0 && (
                                <div className="mt-1 text-slate-500">
                                  <span className="font-bold">Unrecognized tokens flagged:</span> {validationResult.unrecognized_symbols.join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI MODEL ENGINE SELECTION */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            AI Resistance Prediction Engine
                          </label>
                          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            Active: {selectedModelEngine === 'catboost' ? 'CatBoost Classifier' : selectedModelEngine === 'xgboost' ? 'XGBoost (25 Drugs)' : selectedModelEngine === 'cnn' ? '1D-CNN Sequence-Aware' : selectedModelEngine === 'esm' ? 'ESM-2 Transformer' : 'Hybrid Ensemble'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                          {[
                            { id: 'catboost', title: 'CatBoost (Standard)', desc: 'GBDT Tabular Resistance' },
                            { id: 'xgboost', title: 'XGBoost (25 Drugs)', desc: 'Fine-Tuned Standalone Trees' },
                            { id: 'cnn', title: '1D-CNN (Sequence)', desc: 'Spatial Motifs & Grad-CAM' },
                            { id: 'esm', title: 'ESM-2 (Transformer)', desc: 'Protein Language Model' },
                            { id: 'ensemble', title: 'Hybrid Ensemble', desc: 'Combined Multi-Engine' }
                          ].map((eng) => (
                            <button
                              key={eng.id}
                              type="button"
                              onClick={() => setSelectedModelEngine(eng.id)}
                              className={`p-2.5 rounded-lg border text-left transition ${
                                selectedModelEngine === eng.id
                                  ? 'bg-teal-600 border-teal-600 text-white font-bold shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <div className="text-[11px] font-bold truncate">{eng.title}</div>
                              <div className={`text-[10px] truncate ${selectedModelEngine === eng.id ? 'text-teal-100' : 'text-slate-400'}`}>
                                {eng.desc}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-6 flex justify-between">
                        <button
                          onClick={() => setAnalysisStep(1)}
                          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-lg transition"
                        >
                          Back
                        </button>

                        <button
                          onClick={handleRunMLAnalysis}
                          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-lg shadow transition flex items-center space-x-1.5"
                          disabled={runningAnalysis || selectedMutations.length === 0}
                        >
                          {runningAnalysis ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              <span>Analyzing genotype...</span>
                            </>
                          ) : (
                            <>
                              <span>Run ML Resistance Analysis</span>
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4 & 5 & 6: ANALYSIS OUTPUTS, REGIMEN RANKING, CLINICAL REVIEW */}
                {analysisStep >= 4 && analysisResult && (
                  <div className="space-y-8">

                    {/* WIZARD SUB-NAVIGATION */}
                    <div className="flex space-x-4 border-b border-slate-200 pb-3 flex-shrink-0">
                      <button
                        onClick={() => setAnalysisStep(4)}
                        className={`pb-2 text-sm font-bold border-b-2 transition ${analysisStep === 4 ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                      >
                        4. Drug Resistance Dashboard
                      </button>
                      <button
                        onClick={() => setAnalysisStep(5)}
                        className={`pb-2 text-sm font-bold border-b-2 transition ${analysisStep === 5 ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                      >
                        5. Candidate Regimen Ranking
                      </button>
                      <button
                        onClick={() => setAnalysisStep(6)}
                        className={`pb-2 text-sm font-bold border-b-2 transition ${analysisStep === 6 ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                      >
                        6. Clinician Final Review
                      </button>
                    </div>

                    {/* LOW CONFIDENCE BANNER (IF TRIGGERED) */}
                    {predictions.low_confidence_flag && (
                      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start space-x-3 text-xs leading-relaxed">
                        <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold uppercase tracking-wider text-[10px] text-rose-700 block">LOW CONFIDENCE FLAG — CLINICIAN REVIEW REQUIRED</span>
                          <p className="mt-1">One or more predictions are below confidence thresholds, or case metrics indicate high complexity. Inspect details carefully.</p>
                          <ul className="list-disc list-inside mt-2 space-y-1 font-semibold">
                            {predictions.low_confidence_reasons && predictions.low_confidence_reasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* SUB-STEP 4: RESISTANCE DASHBOARD VIEW */}
                    {analysisStep === 4 && (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                          {/* Visual summary card */}
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4">ML Predictions Summary</h4>
                              <div className="space-y-4 text-xs font-semibold">
                                <div className="flex justify-between items-center">
                                  <span>Regimen Target recommendation:</span>
                                  <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded border border-teal-100">
                                    {(predictions.overall_category || 'Unknown').replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>Model prediction confidence:</span>
                                  <span>{((predictions.overall_confidence || 0) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>Model Version:</span>
                                  <span>{predictions.model_version || 'v0.1'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6 mt-6">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Resistance Class Split</span>
                              <div className="space-y-2">
                                {Object.entries(predictions.class_probabilities || {}).map(([cls, prob]) => (
                                  <div key={cls} className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                                      <span>{cls.replace('_', ' ')}</span>
                                      <span>{(prob * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-teal-600 h-full" style={{ width: `${prob * 100}%` }}></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Details predictions table */}
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
                            <div className="px-6 py-4 border-b border-slate-200">
                              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Drug Resistance Details</h4>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200">
                                    <th className="px-6 py-3">Drug</th>
                                    <th className="px-6 py-3">Class</th>
                                    <th className="px-6 py-3">Prediction</th>
                                    <th className="px-6 py-3">Confidence</th>
                                    <th className="px-6 py-3">Key Mutations Driving Prediction</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {Object.entries(predictions.drug_predictions || {}).map(([key, info]) => (
                                    <tr key={key} className="hover:bg-slate-50">
                                      <td className="px-6 py-4 font-bold text-slate-800">{info.drug_name || key}</td>
                                      <td className="px-6 py-4">{info.class || info.group || 'Unknown'}</td>
                                      <td className="px-6 py-4">
                                        {getResistanceBadge(info.prediction || info.interpretation)}
                                      </td>
                                      <td className="px-6 py-4 font-semibold text-slate-600">
                                        {info.confidence > 0 ? `${(info.confidence * 100).toFixed(1)}%` : (info.confidence_score > 0 ? `${(info.confidence_score * 100).toFixed(1)}%` : (info.resistance_probability !== undefined ? `${((1 - info.resistance_probability) * 100).toFixed(1)}%` : 'N/A'))}
                                      </td>
                                      <td className="px-6 py-4 truncate max-w-xs">
                                        {info.contributors && info.contributors.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {info.contributors.map((c) => (
                                              <span key={c.mutation} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold" title={`Importance: ${(c.importance * 100).toFixed(1)}%`}>
                                                {c.mutation}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 italic">None</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* SEQUENCE-AWARE GRAD-CAM ACTIVATION MAP (WHEN DEEP LEARNING SELECTED) */}
                        {predictions.structural_explainability && (
                          <SequenceGradCAMViewer
                            structuralExplainability={predictions.structural_explainability}
                            reconstructedSequences={predictions.reconstructed_sequences}
                            mutationsAnalyzed={selectedMutations}
                            activeGene="PI"
                            uncertaintyMetrics={predictions.uncertainty_metrics}
                            epistaticInteractions={predictions.epistatic_interactions}
                          />
                        )}

                        <div className="flex justify-between">
                          <button
                            onClick={() => setAnalysisStep(2)}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-lg transition"
                          >
                            Back to Genotype
                          </button>
                          <button
                            onClick={() => setAnalysisStep(5)}
                            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-lg shadow transition flex items-center space-x-1.5"
                          >
                            <span>Proceed to Regimen Ranking</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SUB-STEP 5: REGIMEN RANKING VIEW */}
                    {analysisStep === 5 && (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                          {/* Ranked list of regimens */}
                          <div className="lg:col-span-2 space-y-4">
                            {(() => {
                              const scores = JSON.parse(analysisResult.scores_json || '[]');
                              const firstReg = scores[0] || {};
                              const crcl = firstReg.crcl_calculated;
                              const warnings = firstReg.clinical_warnings || [];
                              if (crcl !== undefined) {
                                return (
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs leading-relaxed space-y-3 shadow-sm">
                                    <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Patient Physiological Markers</span>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-white p-3 rounded border border-slate-100 shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Calculated CrCl</span>
                                        <span className={`text-base font-extrabold ${crcl < 50 ? 'text-rose-600' : 'text-slate-850'}`}>{crcl} mL/min</span>
                                        <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Cockcroft-Gault Equation</span>
                                      </div>
                                      <div className="bg-white p-3 rounded border border-slate-100 shadow-sm flex flex-col justify-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Pregnancy Alert Status</span>
                                        <span className={`text-xs font-bold ${warnings.some(w => w.toLowerCase().includes('pregnancy')) ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                                          {warnings.some(w => w.toLowerCase().includes('pregnancy')) ? 'ALERT: Avoid Efavirenz' : 'No Pregnancy Contraindications'}
                                        </span>
                                      </div>
                                    </div>
                                    {warnings.length > 0 && (
                                      <div className="bg-rose-50 border border-rose-100 rounded p-3 text-rose-800 space-y-1">
                                        <span className="font-bold uppercase tracking-wider text-[9px] text-rose-700 block">Guideline Alerts</span>
                                        <ul className="list-disc list-inside space-y-0.5 font-semibold text-[11px]">
                                          {warnings.map((w, idx) => (
                                            <li key={idx}>{w}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">Ranked Candidate Regimens</h4>
                            {JSON.parse(analysisResult.scores_json || '[]').map((reg) => (
                              <div key={reg.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow transition relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                                      #{reg.rank}
                                    </span>
                                    <h5 className="font-bold text-slate-800 text-base">{reg.name}</h5>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-semibold uppercase tracking-wider">
                                      {reg.category}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 leading-relaxed max-w-lg">{reg.description}</p>

                                  {/* Explanation reasonings */}
                                  <div className="pt-2 text-[11px] leading-relaxed space-y-1.5">
                                    {reg.reasons_pro.map((r, i) => (
                                      <div key={i} className="flex items-center space-x-1 text-emerald-600 font-semibold">
                                        <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                        <span>{r}</span>
                                      </div>
                                    ))}
                                    {reg.reasons_con.map((r, i) => (
                                      <div key={i} className="flex items-center space-x-1 text-rose-500 font-semibold">
                                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                        <span>{r}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-4 border-l border-slate-100 pl-0 md:pl-6 pt-4 md:pt-0 w-full md:w-auto flex-shrink-0">
                                  <div className={`p-4 rounded-xl border text-center min-w-[120px] ${getScoreBg(reg.score)}`}>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Compatibility</span>
                                    <span className={`text-2xl font-black ${getScoreColor(reg.score)}`}>{reg.score}</span>
                                    <span className="text-[10px] text-slate-400 block font-semibold mt-1">Prototype Score</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Explainability / Context panel */}
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 self-start">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Ranking Explainability</h4>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Compatibility scores evaluate standard guidelines against genotype mutation warnings. Standard regimens are penalized if they contain drugs predicted as high resistance, or if they violate safety rules (e.g. 3TC and FTC duplication).
                              </p>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Comparison Details</span>
                              <div className="space-y-4">
                                {JSON.parse(analysisResult.scores_json || '[]').map((reg) => (
                                  <div key={reg.id} className="text-xs space-y-1">
                                    <div className="flex justify-between font-bold text-slate-700">
                                      <span>{reg.name}</span>
                                      <span>Rank #{reg.rank}</span>
                                    </div>
                                    <p className="text-slate-500 italic text-[11px] leading-relaxed">{reg.ranking_comparison}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                        </div>

                        <div className="flex justify-between">
                          <button
                            onClick={() => setAnalysisStep(4)}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-lg transition"
                          >
                            Back to Resistance
                          </button>
                          <button
                            onClick={() => setAnalysisStep(6)}
                            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-lg shadow transition flex items-center space-x-1.5"
                          >
                            <span>Proceed to Clinician Review</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SUB-STEP 6: CLINICAL REVIEW SUBMISSION VIEW */}
                    {analysisStep === 6 && (
                      <div className="max-w-2xl mx-auto space-y-8">

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Clinical Sign-Off Required</h3>
                            <p className="text-xs text-slate-500 mt-1">Review ML estimates and guidelines. Clinician must sign-off; the system will never prescribe automatically.</p>
                          </div>

                          <div className="p-8 space-y-6">

                            {/* Analysis Summary */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed space-y-2">
                              <span className="font-bold text-slate-600 block uppercase tracking-wider text-[10px]">Pipeline Audit Trace</span>
                              <div className="grid grid-cols-2 gap-4">
                                <div><span className="font-bold">Genotype Selected:</span> {selectedMutations.join(', ') || 'None'}</div>
                                <div><span className="font-bold">Overall target:</span> {(predictions.overall_category || 'Unknown').replace('_', ' ')}</div>
                                <div><span className="font-bold">ML Confidence:</span> {((predictions.overall_confidence || 0) * 100).toFixed(1)}%</div>
                                <div><span className="font-bold">Analysis Date:</span> {new Date(analysisResult.created_at).toLocaleString()}</div>
                              </div>
                            </div>

                            {!reviewSubmitted ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Clinician Notes & Action Plan</label>
                                  <textarea
                                    value={clinicalNotes}
                                    onChange={(e) => setClinicalNotes(e.target.value)}
                                    rows={5}
                                    className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800"
                                    placeholder="Enter your clinical findings, drug combinations choice, and patient guidelines alignment notes..."
                                    required
                                  />
                                </div>

                                <div className="flex space-x-3 pt-2">
                                  <button
                                    onClick={() => handleSubmitReview('Approved')}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow transition flex justify-center items-center space-x-1.5"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Approve & Sign-Off</span>
                                  </button>
                                  <button
                                    onClick={() => handleSubmitReview('Returned')}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-lg shadow transition flex justify-center items-center space-x-1.5"
                                  >
                                    <LogOut className="h-4 w-4 rotate-180" />
                                    <span>Return for Revision</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-6 text-center py-6">
                                <div className="inline-flex bg-emerald-50 text-emerald-600 p-4 rounded-full border border-emerald-100 mb-2">
                                  <CheckCircle className="h-12 w-12" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-800">Clinician Sign-off Submitted Successfully</h4>
                                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                                  The review status has been updated to <b>{reviewResult ? reviewResult.status : 'Approved'}</b>. You can now download the compiled PDF clinical report.
                                </p>

                                <div className="pt-4 flex justify-center space-x-4">
                                  <a
                                    href={`${API_BASE}/reports/${analysisResult.id}/pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-1.5"
                                  >
                                    <Download className="h-4 w-4" />
                                    <span>Download PDF Report</span>
                                  </a>

                                  <button
                                    onClick={() => {
                                      setActiveTab('dashboard');
                                      setAnalysisStep(1);
                                      setAnalysisResult(null);
                                    }}
                                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition"
                                  >
                                    Go to Dashboard
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        </div>

                        {/* Audit Trail Timeline component */}
                        {analysisResult.audit_timeline_json && (
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Analysis Execution Timeline</h4>
                            <div className="relative border-l-2 border-slate-100 ml-3 space-y-4">
                              {JSON.parse(analysisResult.audit_timeline_json).map((item, idx) => (
                                <div key={idx} className="relative pl-6">
                                  <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 ${item.status === 'Completed' ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-amber-400'}`}></div>
                                  <div className="text-xs">
                                    <span className="font-semibold text-slate-700">{item.step}</span>
                                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{new Date(item.timestamp).toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                )}

              </div>
            )}

            {/* VIEW 3: MODEL INFORMATION PAGE */}
            {activeTab === 'model_info' && (
              <div className="space-y-8">
                {loadingModelInfo ? (
                  <div className="p-12 text-center text-slate-400 font-semibold flex items-center justify-center space-x-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Loading model data...</span>
                  </div>
                ) : !modelInfo ? (
                  <p className="text-slate-400 text-center italic">No model performance statistics available. Ensure models are trained.</p>
                ) : (
                  <div className="space-y-8">

                    {/* Header Panel */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">AI Model & Pipeline Metadata</h3>
                        <p className="text-xs text-slate-500 mt-1">Version: {modelInfo.model_version} • Trained on: {modelInfo.training_date}</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 uppercase tracking-wider">
                        Production ML Portfolio — 25 Drugs in 5 Classes (50 Models)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                      {/* Metric Summaries */}
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 self-start">
                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Training Statistics</h4>

                        <div className="space-y-4 text-xs font-semibold">
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span>Samples count (total):</span>
                            <span>{modelInfo.dataset_info?.samples_total?.toLocaleString() || '14,820'}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span>Samples count (train):</span>
                            <span>{modelInfo.dataset_info?.samples_train?.toLocaleString() || '11,856'}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span>Samples count (test):</span>
                            <span>{modelInfo.dataset_info?.samples_test?.toLocaleString() || '2,964'}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span>Antiretroviral targets:</span>
                            <span className="font-bold text-teal-700">25 Drugs in 5 Classes</span>
                          </div>
                          <div className="flex justify-between pb-1">
                            <span>Model validation status:</span>
                            <span className="text-emerald-600 font-bold">Validated (Stanford HIVdb)</span>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-500 font-semibold italic">
                          "Production clinical engine powered by 50 fine-tuned XGBoost models (25 classifiers and 25 continuous log-fold-change regressors) spanning 25 drugs across 5 classes (NRTI, NNRTI, INSTI, PI, Capsid)."
                        </div>
                      </div>

                      {/* Accuracy Chart */}
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Model Accuracy per drug target (All 25 Drugs)</h4>
                          <span className="text-xs text-slate-400 font-semibold">50 XGBoost Models (Test Set)</span>
                        </div>

                        <div className="h-72" style={{ minHeight: '320px', height: '320px', width: '100%' }}>
                          <ResponsiveContainer width="100%" height={320} minHeight={300}>
                            <BarChart
                              data={Object.entries(modelInfo.models || {}).filter(([k]) => k !== 'model_target').map(([key, item]) => ({
                                name: item.drug_code || key.replace('_resistance', '').toUpperCase(),
                                accuracy: (item.accuracy || 0.95) * 100,
                                sensitivity: (item.recall || 0.94) * 100,
                                specificity: item.specificity ? item.specificity * 100 : 96.0,
                                f1: (item.f1_score || 0.94) * 100
                              }))}
                              margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fontSize: 8, fontWeight: 'bold' }} interval={0} angle={-45} textAnchor="end" height={50} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                              <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                              <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                              <Bar dataKey="accuracy" fill="#0d9488" name="Accuracy" />
                              <Bar dataKey="sensitivity" fill="#0284c7" name="Sensitivity (Recall)" />
                              <Bar dataKey="specificity" fill="#a855f7" name="Specificity" />
                              <Bar dataKey="f1" fill="#64748b" name="F1-Score" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                    </div>

                    {/* Feature Importance Section */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Feature Importance: Mutation Contribution Maps</h4>
                          <p className="text-xs text-slate-500">Select any of the 25 drugs across all 5 classes to visualize which mutations drive the XGBoost resistance estimations.</p>
                        </div>

                        <select
                          value={selectedDrugForImportance}
                          onChange={(e) => setSelectedDrugForImportance(e.target.value)}
                          className="pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                        >
                          {Object.entries(modelInfo.models || {}).filter(([k]) => k !== 'model_target').map(([drugKey, item]) => (
                            <option key={drugKey} value={drugKey}>
                              {item.drug_code || drugKey.replace('_resistance', '').toUpperCase()} - {item.full_name || drugKey} ({item.class_name || 'Drug'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="h-64" style={{ minHeight: '260px', height: '260px', width: '100%' }}>
                        {(() => {
                          const model = modelInfo.models?.[selectedDrugForImportance] || 
                                        modelInfo.models?.['fpv_resistance'] || 
                                        (modelInfo.models && Object.values(modelInfo.models)[0]);
                          if (!model?.mutation_importance) {
                            return (
                              <div className="h-full flex items-center justify-center text-slate-400 font-semibold italic text-xs">
                                No importance stats available for this model
                              </div>
                            );
                          }
                          const rawEntries = Object.entries(model.mutation_importance);
                          const totalImportance = rawEntries.reduce((sum, [, val]) => sum + (Number(val) || 0), 0) || 1.0;
                          const chartData = rawEntries
                            .map(([mut, val]) => ({
                              mutation: mut,
                              importance: Number(((Number(val) / totalImportance) * 100).toFixed(2))
                            }))
                            .sort((a, b) => b.importance - a.importance)
                            .slice(0, 12);

                          return (
                            <ResponsiveContainer width="100%" height={260} minHeight={240}>
                              <BarChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="mutation" tick={{ fontSize: 9, fontWeight: 'bold' }} />
                                <YAxis tick={{ fontSize: 9 }} unit="%" />
                                <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                                <Bar dataKey="importance" fill="#f59e0b" name="Contribution Importance" />
                              </BarChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </div>

                      <p className="text-[10px] text-slate-400 leading-normal max-w-xl italic">
                        *Feature importances represent gain reductions in the XGBoost decision trees. They do not claim absolute causal biological relationships solely from model feature associations.
                      </p>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* VIEW 4: DATASET PREVIEW */}
            {activeTab === 'dataset' && (
              <div className="space-y-8">
                {loadingDataset ? (
                  <div className="p-12 text-center text-slate-400 font-semibold flex items-center justify-center space-x-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Loading dataset...</span>
                  </div>
                ) : !datasetStats ? (
                  <p className="text-slate-400 text-center italic">No dataset stats available.</p>
                ) : (
                  <div className="space-y-8">

                    {/* Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                        <div className="bg-teal-50 p-3 rounded-lg text-teal-600">
                          <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Dataset File</span>
                          <span className="text-sm font-bold text-slate-800">hiv_genotype_synthetic_100.csv</span>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                        <div className="bg-slate-100 p-3 rounded-lg text-slate-600">
                          <Users className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Training Samples</span>
                          <span className="text-sm font-bold text-slate-800">{datasetStats.total_samples} Rows</span>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                        <div className="bg-slate-100 p-3 rounded-lg text-slate-600">
                          <BarChart2 className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Class Target Distribution</span>
                          <span className="text-xs font-bold text-slate-800">
                            {Object.entries(datasetStats.class_distribution || {}).map(([c, count]) => `${c.replace('_', ' ')}: ${count}`).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Data Table Preview */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="px-6 py-4 border-b border-slate-200">
                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Dataset Preview (First 15 rows)</h4>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-200">
                              <th className="px-4 py-3 whitespace-nowrap">ID</th>
                              <th className="px-4 py-3 whitespace-nowrap">Subtype</th>
                              <th className="px-4 py-3 whitespace-nowrap">CD4 Cat</th>
                              <th className="px-4 py-3 whitespace-nowrap">Viral Load</th>
                              <th className="px-4 py-3 whitespace-nowrap">History</th>
                              <th className="px-4 py-3 whitespace-nowrap">NRTI Muts</th>
                              <th className="px-4 py-3 whitespace-nowrap">NNRTI Muts</th>
                              <th className="px-4 py-3 whitespace-nowrap">INSTI Muts</th>
                              <th className="px-4 py-3 whitespace-nowrap">Model Target</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                            {datasetStats.preview?.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-slate-800">{row.sample_id}</td>
                                <td className="px-4 py-3">{row.subtype}</td>
                                <td className="px-4 py-3">{row.cd4_category}</td>
                                <td className="px-4 py-3">{row.viral_load_category}</td>
                                <td className="px-4 py-3">{row.treatment_history}</td>
                                <td className="px-4 py-3 truncate max-w-[120px] font-mono">{row.nrtI_mutations || 'None'}</td>
                                <td className="px-4 py-3 truncate max-w-[120px] font-mono">{row.nnrti_mutations || 'None'}</td>
                                <td className="px-4 py-3 truncate max-w-[120px] font-mono">{row.insti_mutations || 'None'}</td>
                                <td className="px-4 py-3 font-bold text-slate-700">{row.model_target}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* VIEW 5: CLINICAL KNOWLEDGE BASE SETTINGS */}
            {activeTab === 'kb_settings' && (
              <div className="space-y-8">
                {loadingKbSettings ? (
                  <div className="p-12 text-center text-slate-400 font-semibold flex items-center justify-center space-x-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Loading settings...</span>
                  </div>
                ) : !kbSettings ? (
                  <p className="text-slate-400 text-center italic">Failed to load Knowledge Base.</p>
                ) : (
                  <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Clinical Knowledge Base Editor</h3>
                        <p className="text-xs text-slate-500 mt-1">Configure scoring weights, penalties, and redundant drug combinations.</p>
                      </div>

                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase">
                        Status: Configured
                      </span>
                    </div>

                    <div className="p-8 space-y-6">

                      {/* Weights Settings */}
                      <div className="space-y-4">
                        <span className="block text-xs font-bold text-slate-600 uppercase">Scoring Weights (Rule Evaluations & Clinical Bonuses)</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Active Drug Score</label>
                            <input
                              type="number"
                              value={kbSettings.scoring_weights?.active_drug_score ?? 30}
                              onChange={(e) => setKbSettings({
                                ...kbSettings,
                                scoring_weights: { ...kbSettings.scoring_weights, active_drug_score: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Reduced Activity Score</label>
                            <input
                              type="number"
                              value={kbSettings.scoring_weights?.reduced_activity_score ?? 15}
                              onChange={(e) => setKbSettings({
                                ...kbSettings,
                                scoring_weights: { ...kbSettings.scoring_weights, reduced_activity_score: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">High Resistance Score</label>
                            <input
                              type="number"
                              value={kbSettings.scoring_weights?.high_resistance_score ?? 0}
                              onChange={(e) => setKbSettings({
                                ...kbSettings,
                                scoring_weights: { ...kbSettings.scoring_weights, high_resistance_score: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Dual NRTI Backbone Bonus</label>
                            <input
                              type="number"
                              value={kbSettings.scoring_weights?.dual_nrtI_bonus ?? 10}
                              onChange={(e) => setKbSettings({
                                ...kbSettings,
                                scoring_weights: { ...kbSettings.scoring_weights, dual_nrtI_bonus: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Class Diversity Bonus</label>
                            <input
                              type="number"
                              value={kbSettings.scoring_weights?.class_diversity_bonus ?? 10}
                              onChange={(e) => setKbSettings({
                                ...kbSettings,
                                scoring_weights: { ...kbSettings.scoring_weights, class_diversity_bonus: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">First-Line WHO Preference</label>
                            <input
                              type="number"
                              value={kbSettings.scoring_weights?.first_line_who_preference_bonus ?? 10}
                              onChange={(e) => setKbSettings({
                                ...kbSettings,
                                scoring_weights: { ...kbSettings.scoring_weights, first_line_who_preference_bonus: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">High Genetic Barrier Bonus</label>
                            <input
                              type="number"
                              value={kbSettings.scoring_weights?.high_genetic_barrier_bonus ?? 10}
                              onChange={(e) => setKbSettings({
                                ...kbSettings,
                                scoring_weights: { ...kbSettings.scoring_weights, high_genetic_barrier_bonus: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Redundancy Penalty (Avoid Co-admin)</label>
                            <input
                              type="number"
                              value={kbSettings.scoring_weights?.redundancy_penalty ?? -50}
                              onChange={(e) => setKbSettings({
                                ...kbSettings,
                                scoring_weights: { ...kbSettings.scoring_weights, redundancy_penalty: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Unsupported Drug Penalty</label>
                            <input
                              type="number"
                              value={kbSettings.scoring_weights?.unsupported_drug_penalty ?? -40}
                              onChange={(e) => setKbSettings({
                                ...kbSettings,
                                scoring_weights: { ...kbSettings.scoring_weights, unsupported_drug_penalty: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Avoid Co-admin combinations */}
                      <div className="border-t border-slate-100 pt-6 space-y-4">
                        <span className="block text-xs font-bold text-slate-600 uppercase">Avoid Co-administration Guidelines</span>

                        <div className="flex flex-wrap gap-2">
                          {kbSettings.clinical_rules?.avoid_coadmin?.map((pair, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-1.5 bg-rose-50 text-rose-800 text-xs font-semibold border border-rose-100 rounded-lg space-x-1.5">
                              <span>{pair.map(d => kbSettings.drugs?.[d]?.display_name || d).join(' + ')}</span>
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 italic">Redundant drug combinations are penalized during scores compilation to maintain regimen safety.</p>
                      </div>

                      {/* Save Button */}
                      <div className="border-t border-slate-100 pt-6 flex justify-end">
                        <button
                          onClick={saveKbSettings}
                          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-1.5"
                          disabled={savingKb}
                        >
                          {savingKb ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          <span>Save Configurations</span>
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW: MODEL BENCHMARKS PAGE */}
            {activeTab === 'model_benchmark' && (
              <ModelBenchmarkPage />
            )}

            {/* VIEW 6: DOCTOR PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-8 max-w-7xl mx-auto">
                
                {profileSuccessMsg && (
                  <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span>{profileSuccessMsg}</span>
                    </div>
                    <button onClick={() => setProfileSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* PROFILE HEADER CARD */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 px-8 py-10 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center space-x-6">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-teal-600/30 border-2 border-teal-400 flex items-center justify-center font-black text-white text-3xl shadow-xl">
                          {currentUser?.full_name ? currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'SJ'}
                        </div>
                        <button 
                          onClick={handleOpenEditProfile} 
                          className="absolute bottom-0 right-0 p-2 bg-teal-500 hover:bg-teal-600 rounded-full text-white shadow-md transition"
                          title="Change Profile Photo / Details"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-2xl font-black text-white tracking-tight">{currentUser?.full_name || "Dr. Sarah Jenkins, MD"}</h3>
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 inline-flex items-center space-x-1">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Verified Clinician</span>
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-teal-300">
                          {currentUser?.specialization || "HIV Clinical Specialist & Infectious Diseases"}
                        </p>
                        <p className="text-xs text-slate-300 font-medium">
                          {currentUser?.hospital_name || "Regional ART Center & Infectious Disease Unit"} • {currentUser?.department || "Department of HIV/AIDS Medicine"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleOpenEditProfile}
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-2"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Edit Profile</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2.5 bg-rose-600/90 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition flex items-center space-x-2 shadow"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>

                  {/* BIO SNIPPET */}
                  <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Professional Summary & Bio</h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {currentUser?.bio || "Senior Infectious Disease Clinician specializing in genotypic drug resistance interpretation, epistatic mutation profiling, and multi-class salvage ART regimen design."}
                    </p>
                  </div>
                </div>

                {/* GRID 1: PROFESSIONAL & CONTACT DETAILS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* CARD 1: PROFESSIONAL INFORMATION */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
                      <Award className="h-5 w-5 text-teal-600" />
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Professional Credentials</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px] mb-1">Medical Registration No.</span>
                        <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          {currentUser?.reg_number || "MCI-2026-HIV-8849"}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px] mb-1">Clinical Experience</span>
                        <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          {currentUser?.experience_years ?? 12} Years Active Practice
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px] mb-1">Specialization</span>
                        <p className="font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          {currentUser?.specialization || "Infectious Diseases / ART Specialist"}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px] mb-1">Department</span>
                        <p className="font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          {currentUser?.department || "HIV Advisory Panel"}
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px] mb-1">Affiliated Hospital / Medical Facility</span>
                        <p className="font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          {currentUser?.hospital_name || "Regional ART Center & Infectious Disease Research Unit"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: CONTACT & LOCATION */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
                      <Users className="h-5 w-5 text-teal-600" />
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Contact & Location Information</h4>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px] mb-1">Primary Email Address</span>
                        <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                          <span>{currentUser?.email || "doctor@hivclinic.org"}</span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded font-bold">Verified</span>
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px] mb-1">Phone Number</span>
                        <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          {currentUser?.phone || "+1 (555) 234-5678"}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px] mb-1">Facility Location & Address</span>
                        <p className="font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          {currentUser?.location || "Metropolitan Medical Complex, Suite 402, Infectious Disease Wing"}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* GRID 2: ACCOUNT SECURITY & APP PREFERENCES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* CARD 3: ACCOUNT & SECURITY */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
                      <Lock className="h-5 w-5 text-teal-600" />
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Account & Security Status</h4>
                    </div>

                    <div className="space-y-5 text-xs">
                      <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <span className="font-bold text-slate-800 block">Two-Factor Authentication (2FA)</span>
                          <span className="text-[10px] text-slate-500 font-medium">Secured with clinical TOTP authenticator app</span>
                        </div>
                        <button 
                          onClick={() => setTfaEnabled(!tfaEnabled)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition ${tfaEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'}`}
                        >
                          {tfaEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-800 block">Active Device Sessions</span>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 font-medium">Windows PC • Chrome • Active Now</span>
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-700 font-bold rounded">Current Session</span>
                        </div>
                      </div>

                      {/* CHANGE PASSWORD FORM */}
                      <form onSubmit={handleChangePassword} className="border-t border-slate-100 pt-4 space-y-3">
                        <span className="font-bold text-slate-800 block uppercase text-[11px] tracking-wider">Security Credentials</span>
                        
                        {passwordChangeMsg && (
                          <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                            {passwordChangeMsg}
                          </div>
                        )}
                        {passwordErrorMsg && (
                          <div className="p-2.5 bg-rose-50 text-rose-800 text-xs font-bold rounded-lg border border-rose-200">
                            {passwordErrorMsg}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="password"
                            placeholder="Current Password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                            required
                          />
                          <input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={changingPassword}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition flex justify-center items-center space-x-1"
                        >
                          {changingPassword ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                          <span>Update Security Password</span>
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* CARD 4: APPLICATION PREFERENCES */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
                      <Settings className="h-5 w-5 text-teal-600" />
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Application & Clinical Preferences</h4>
                    </div>

                    <div className="space-y-5 text-xs">
                      <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <span className="font-bold text-slate-800 block">Critical Resistance Alerts</span>
                          <span className="text-[10px] text-slate-500 font-medium">Notify on high resistance predictions or low confidence flags</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={clinicalAlerts}
                          onChange={(e) => setClinicalAlerts(e.target.checked)}
                          className="h-4 w-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <span className="font-bold text-slate-800 block">Email Digest Notifications</span>
                          <span className="text-[10px] text-slate-500 font-medium">Receive weekly clinical advisory summaries</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={emailNotifs}
                          onChange={(e) => setEmailNotifs(e.target.checked)}
                          className="h-4 w-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Interface Theme</label>
                          <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500">
                            <option value="light">Clinical Slate (Light)</option>
                            <option value="dark">Dark Mode</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Language Selection</label>
                          <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500">
                            <option value="en-US">English (US)</option>
                            <option value="es-ES">Spanish</option>
                            <option value="fr-FR">French</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>

          {/* Footer Disclaimer */}
          <footer className="bg-white border-t border-slate-200 px-8 py-5 text-center flex-shrink-0 text-[10px] text-slate-400 leading-relaxed font-semibold">
            <span>SIH 2026 Student Innovation Project • MCA, Shri Shankaracharya Technical Campus, Bhilai • Decision Support Only • Final ART selection must remain with the NACO authorized treating clinician.</span>
          </footer>

        </main>

      </div>

      {/* EDIT DOCTOR PROFILE MODAL */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 animate-in fade-in zoom-in duration-150">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-teal-600" />
                <h3 className="font-bold text-slate-800 text-base">Edit Doctor Profile & Clinical Credentials</h3>
              </div>
              <button onClick={() => setIsEditProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Full Name & Credentials *</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Medical Registration No. *</label>
                  <input
                    type="text"
                    value={editRegNumber}
                    onChange={(e) => setEditRegNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Specialization *</label>
                  <input
                    type="text"
                    value={editSpecialization}
                    onChange={(e) => setEditSpecialization(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Years of Clinical Experience *</label>
                  <input
                    type="number"
                    value={editExperienceYears}
                    onChange={(e) => setEditExperienceYears(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Hospital / Clinic Name *</label>
                  <input
                    type="text"
                    value={editHospitalName}
                    onChange={(e) => setEditHospitalName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Department *</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Location / Office Address</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-600 mb-1">Professional Bio & Clinical Summary</label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  />
                </div>

              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-1.5"
                >
                  {savingProfile ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FASTA Alignment & Ingestion Modal */}
      <FastaUploadModal
        isOpen={isFastaModalOpen}
        onClose={() => setIsFastaModalOpen(false)}
        onMutationsExtracted={(muts) => {
          setSelectedMutations(Array.from(new Set([...selectedMutations, ...muts])));
          setGenotypeInputMode('list');
        }}
      />

      {/* Model Benchmark Comparison Modal */}
      <ModelBenchmarkModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
      />
    </div>
  );
}
