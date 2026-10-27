'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

// INTERACTIVE PASSWORD BEAM INPUT COMPONENT
function PasswordBeamInput({ 
  value, 
  onChange, 
  onFocus, 
  onBlur, 
  placeholder = "••••••••", 
  required = true,
  minLength = 6
}) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = (e) => {
    e.preventDefault();
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      <div className="relative z-10 flex items-center">
        <input
          type={showPassword ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pr-12 text-sm font-mono transition-all focus:outline-none relative z-10 ${
            showPassword 
              ? 'bg-[#1f0808] text-white border-2 border-[#ff3333] shadow-[0_0_20px_rgba(255,51,51,0.5)]' 
              : 'bg-[#1a0808] text-white border border-[#2b0808] focus:border-[#7a0000]'
          }`}
        />

        {/* EYE TOGGLE BUTTON */}
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute right-3.5 p-1 text-[#ff3333] hover:text-white transition-colors cursor-pointer select-none focus:outline-none z-30"
          aria-label="Toggle password visibility"
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className={`w-5 h-5 transition-transform duration-200 ${showPassword ? 'scale-110 text-white' : 'text-[#ff3333]'}`}
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" fill={showPassword ? "#ff3333" : "currentColor"} />
            </svg>
          </div>
        </button>

        {/* LIGHT BEAM SHOOTING DIRECTLY FROM THE EYE */}
        {showPassword && (
          <div
            className="absolute top-0 right-8 bottom-0 left-0 pointer-events-none z-20 transition-all duration-300"
            style={{
              background: 'linear-gradient(270deg, rgba(255, 51, 51, 0.45) 0%, rgba(255, 51, 51, 0.15) 70%, transparent 100%)',
              clipPath: 'polygon(100% 50%, 0 0, 0 100%)',
            }}
          />
        )}
      </div>
    </div>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(false);
  const [accountType, setAccountType] = useState('personal');
  const [documentFile, setDocumentFile] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', schoolCode: '', specificClassId: '' });
  const [status, setStatus] = useState({ loading: false, message: '', success: false });

  // Robot Interactive States
  const [mood, setMood] = useState('idle');
  const [isTurned, setIsTurned] = useState(false);
  const [speechText, setSpeechText] = useState("Greetings trader. I am Volt, guardian of Bull Run.");
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const [headTilt, setHeadTilt] = useState({ rx: 0, ry: 0 });
  const [passScore, setPassScore] = useState(0);

  // Forgot Password System States
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [confirmEmailInput, setConfirmEmailInput] = useState('');

  useEffect(() => {
    setIsLogin(searchParams.get('mode') === 'login');
    setIsForgotMode(false);
  }, [searchParams]);

  const say = (text) => setSpeechText(text);

  const followInputLength = (valLength) => {
    const ratio = Math.min(valLength / 22, 1);
    setEyePos({ x: -6 + 12 * ratio, y: 5 });
    setHeadTilt({ rx: -8, ry: -5 + 10 * ratio });
  };

  const handlePasswordInput = (val) => {
    setFormData((prev) => ({ ...prev, password: val }));
    let score = 0;
    if (val.length >= 8) score++;
    if (/[a-z]/.test(val) && /[A-Z]/.test(val)) score++;
    if (/\d/.test(val)) score++;
    if (/[^a-zA-Z0-9]/.test(val)) score++;
    if (val.length > 0 && score === 0) score = 1;
    setPassScore(score);
  };

  const handleSchoolCodeBlur = async (code) => {
    if (!code) return;
    const { data, error } = await supabase
      .from('school_classes')
      .select('id, class_name')
      .eq('school_code', code.toUpperCase());
    
    if (!error && data) {
      setAvailableClasses(data);
      say(`Found ${data.length} classroom tracks for hub ${code.toUpperCase()}!`);
    }
  };

  const initForgotPasswordFlow = () => {
    const rawEmail = formData.email.trim();
    if (!rawEmail || !rawEmail.includes('@')) {
      setStatus({ loading: false, message: 'Please input your email address above first.', success: false });
      say("Type your email address above so I can compute the security mask.");
      return;
    }

    const [username, domain] = rawEmail.split('@');
    if (username.length <= 2) {
      setMaskedEmail(`${username[0]}***@${domain}`);
    } else {
      setMaskedEmail(`${username[0]}${'*'.repeat(username.length - 2)}${username[username.length - 1]}@${domain}`);
    }
    
    setTargetEmail(rawEmail.toLowerCase());
    setIsForgotMode(true);
    setStatus({ loading: false, message: '', success: false });
    say("Security override initialized. Type your full email to verify.");
  };

  // PASSWORD RESET REQUEST HANDLER (WITH ROBUST ERROR HANDLING & ORIGIN DETECTION)
  const handlePasswordResetRequest = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, message: '', success: false });

    if (confirmEmailInput.trim().toLowerCase() !== targetEmail) {
      setStatus({ loading: false, message: 'The confirmation email handle does not match.', success: false });
      say("Access denied! Email handle mismatch detected.");
      return;
    }

    try {
      // Safely resolve redirect origin across environments
      const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://bullrun-arena.vercel.app';
      const redirectUrl = `${redirectOrigin}/auth/update-password`;

      const { data, error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error("Supabase Reset Password Error:", error);
        throw error;
      }

      setStatus({
        loading: false,
        message: 'Security link dispatched! Check your Gmail inbox to reset credentials.',
        success: true
      });
      setMood('success');
      say("Token dispatched! Open your email inbox to proceed.");
      setConfirmEmailInput('');
    } catch (err) {
      console.error("Password Reset Error Details:", err);
      setStatus({ 
        loading: false, 
        message: err.message || 'Dispatch fault encountered. Please check your Supabase Auth configuration.', 
        success: false 
      });
      say(`Dispatch fault: ${err.message || 'Verification failed.'}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, message: '', success: false });
    setMood('pressed');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        
        setMood('success');
        say(`Credentials verified! Access granted, ${formData.email.split('@')[0]}.`);
        setTimeout(() => {
          window.location.href = '/simulator';
        }, 800);
      } else {
        let uploadedUrl = null;

        if (accountType === 'teacher' && documentFile) {
          const fileExt = documentFile.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('teacher-proofs')
            .upload(fileName, documentFile);

          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabase.storage
            .from('teacher-proofs')
            .getPublicUrl(fileName);
            
          uploadedUrl = publicUrlData.publicUrl;
        }

        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: accountType,
            schoolCode: formData.schoolCode.toUpperCase(),
            specificClassId: formData.specificClassId || null,
            documentUrl: uploadedUrl
          }),
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Fault in submission.');

        const { error: autoLoginError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (autoLoginError) throw autoLoginError;

        setMood('success');
        say(`Account registered! Initializing ₹50,000 sandbox wallet.`);

        setStatus({ 
          loading: false, 
          message: accountType === 'teacher' 
            ? 'Account built! Coordinator approval pending.' 
            : accountType === 'student'
            ? 'Success! Awaiting class manager approval to activate portfolio.'
            : 'Account active! Logging you into your sandbox portfolio...', 
          success: true 
        });

        setTimeout(() => {
          window.location.href = '/simulator';
        }, 1000);
      }
    } catch (err) {
      setStatus({ loading: false, message: err.message, success: false });
      setMood('watching');
      say("Access rejected! Please verify input credentials.");
    }
  };

  const passLabels = ['NOT LOOKING', 'WEAK SIGNAL', 'MODERATE', 'STRONG BULL', 'FORT KNOX'];

  return (
    <div className="flex flex-col items-center justify-center relative font-sans">
      
      {/* ROBOT ANIMATED GUARD CONTAINER */}
      <div className="relative mb-[-20px] z-10 flex flex-col items-center select-none">
        
        {/* SPEECH BUBBLE */}
        <div className="mb-3 px-4 py-2 bg-[#0f0505] border-2 border-[#7a0000] text-slate-200 text-xs font-bold rounded-2xl shadow-xl max-w-[280px] text-center relative animate-fadeInFast">
          <span>{speechText}</span>
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#7a0000]" />
        </div>

        {/* ANTENNA */}
        <div className="flex flex-col items-center">
          <div className={`w-3.5 h-3.5 rounded-full border-2 border-[#7a0000] transition-colors duration-300 ${mood === 'success' ? 'bg-emerald-500 animate-pulse' : mood === 'excited' ? 'bg-amber-400 animate-ping' : 'bg-[#ff3333]'}`} />
          <div className="w-1 h-5 bg-[#7a0000] rounded-full" />
        </div>

        {/* 3D ROBOT HEAD */}
        <div 
          className="w-36 h-32 relative transition-transform duration-300 ease-out"
          style={{
            transform: `perspective(700px) rotateX(${headTilt.rx}deg) rotateY(${headTilt.ry}deg)`,
          }}
        >
          <div className="absolute top-10 -left-2.5 w-3.5 h-10 bg-[#1a0808] border-2 border-[#7a0000] rounded-lg" />
          <div className="absolute top-10 -right-2.5 w-3.5 h-10 bg-[#1a0808] border-2 border-[#7a0000] rounded-lg" />

          <div className={`w-full h-full bg-[#0f0505] border-2 border-[#7a0000] rounded-[32px] shadow-2xl relative overflow-hidden transition-transform duration-700 ${isTurned ? '[transform:rotateY(180deg)]' : ''}`}>
            
            <div className={`absolute inset-0 p-4 flex flex-col items-center justify-center ${isTurned ? 'hidden' : 'block'}`}>
              <div className="w-full h-full bg-black border border-[#2b0808] rounded-2xl flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                <div className="absolute inset-x-0 h-[2px] bg-[#ff3333]/30 animate-pulse top-2" />

                <div 
                  className="flex gap-6 transition-transform duration-200"
                  style={{ transform: `translate(${eyePos.x}px, ${eyePos.y}px)` }}
                >
                  <div className={`w-4 h-6 rounded-lg transition-all duration-300 ${mood === 'happy' || mood === 'success' ? 'h-3 bg-emerald-400 rounded-t-full border-2 border-emerald-400' : mood === 'pressed' ? 'h-3 bg-[#ff3333] rounded-b-full' : 'bg-[#ff3333] shadow-[0_0_10px_#ff3333]'}`} />
                  <div className={`w-4 h-6 rounded-lg transition-all duration-300 ${mood === 'happy' || mood === 'success' ? 'h-3 bg-emerald-400 rounded-t-full border-2 border-emerald-400' : mood === 'pressed' ? 'h-3 bg-[#ff3333] rounded-b-full' : 'bg-[#ff3333] shadow-[0_0_10px_#ff3333]'}`} />
                </div>

                <div className={`flex justify-between w-full px-4 absolute bottom-5 transition-opacity duration-300 ${mood === 'happy' || mood === 'success' ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="w-3 h-1.5 rounded-full bg-emerald-500/80" />
                  <div className="w-3 h-1.5 rounded-full bg-emerald-500/80" />
                </div>

                <div className={`transition-all duration-300 ${mood === 'watching' ? 'w-2 h-2 rounded-full bg-[#ff3333]' : mood === 'happy' || mood === 'success' ? 'w-6 h-2 bg-emerald-400 rounded-b-full' : 'w-4 h-1 bg-[#ff3333] rounded-full'}`} />
              </div>
            </div>

            <div className={`absolute inset-0 p-3 bg-black flex flex-col items-center justify-center gap-2 text-center ${isTurned ? 'block [transform:rotateY(180deg)]' : 'hidden'}`}>
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7a0000] animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((lvl) => (
                  <div key={lvl} className={`w-3.5 h-4 rounded-sm transition-colors duration-200 ${passScore >= lvl ? (passScore === 4 ? 'bg-emerald-500' : passScore >= 2 ? 'bg-amber-400' : 'bg-rose-600') : 'bg-[#2b0808]'}`} />
                ))}
              </div>
              <p className="text-[9px] font-mono font-black text-slate-300 uppercase tracking-widest">{passLabels[passScore]}</p>
            </div>

          </div>
        </div>
      </div>

      {/* CARD FORM WRAPPER */}
      <div className="w-full max-w-md bg-[#0f0505] border-2 border-[#2b0808] rounded-3xl p-8 shadow-2xl space-y-6 relative z-20">
        <div className="absolute -top-4 left-10 w-10 h-6 bg-[#1a0808] border-2 border-[#7a0000] rounded-xl z-30" />
        <div className="absolute -top-4 right-10 w-10 h-6 bg-[#1a0808] border-2 border-[#7a0000] rounded-xl z-30" />

        {isLogin && isForgotMode ? (
          /* FORGOT PASSWORD FLOW */
          <div className="space-y-6 animate-fadeInFast">
            <div className="text-center space-y-1">
              <h1 className="font-black text-2xl text-white">Security Reset Matrix</h1>
              <p className="text-xs text-slate-400">Confirm identity for target payload: <span className="text-[#ff3333] font-mono font-bold">{maskedEmail}</span></p>
            </div>

            <form onSubmit={handlePasswordResetRequest} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-1 font-mono">Verify Full Email Handle</label>
                <input 
                  type="email" 
                  required 
                  value={confirmEmailInput}
                  className="w-full px-4 py-3 bg-[#1a0808] border border-[#2b0808] text-white rounded-xl text-sm font-mono focus:outline-none focus:border-[#7a0000]" 
                  placeholder="Type your email exactly to unlock" 
                  onChange={(e) => setConfirmEmailInput(e.target.value)} 
                  onFocus={() => { setIsTurned(false); setMood('watching'); say("Verification input detected. Be precise."); }}
                />
              </div>

              {status.message && (
                <p className={`text-xs font-bold p-3 rounded-xl border ${status.success ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-400' : 'bg-rose-950/40 border-rose-900/40 text-rose-400'}`}>
                  {status.message}
                </p>
              )}

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => { setIsForgotMode(false); setStatus({ message: '', success: false, loading: false }); say("Returned to main terminal login."); }}
                  className="w-1/3 py-3 bg-[#1a0808] border border-[#2b0808] hover:bg-[#2b0808] text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer font-mono"
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  disabled={status.loading || !confirmEmailInput} 
                  className="w-2/3 py-3 bg-[#7a0000] hover:bg-[#a30000] text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-md cursor-pointer font-mono"
                >
                  {status.loading ? 'Dispatching...' : 'Dispatch Token Link'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* LOGIN / SIGNUP FORM */
          <>
            <div className="text-center space-y-1">
              <h1 className="font-black text-2xl text-white">{isLogin ? 'Welcome Back' : 'Create Your Wallet'}</h1>
              <p className="text-xs text-slate-400">{isLogin ? 'Access your trading workspace.' : 'Initialize your ₹50,000 sandbox portfolio.'}</p>
            </div>

            {!isLogin && (
              <div className="grid grid-cols-3 gap-1 bg-[#1a0808] p-1 border border-[#2b0808] rounded-xl font-mono">
                {['personal', 'student', 'teacher'].map((type) => (
                  <button
                    key={type} type="button" onClick={() => { setAccountType(type); say(`Switched to ${type} track initialization.`); }}
                    className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${accountType === type ? 'bg-[#7a0000] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-1 font-mono">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full px-4 py-3 bg-[#1a0808] border border-[#2b0808] text-white rounded-xl text-sm focus:outline-none focus:border-[#7a0000]" 
                    placeholder="Alex Mercer" 
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      followInputLength(e.target.value.length);
                    }} 
                    onFocus={() => { setIsTurned(false); setMood('watching'); say("A visitor! State your official trader name."); }}
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-1 font-mono">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email} 
                  className="w-full px-4 py-3 bg-[#1a0808] border border-[#2b0808] text-white rounded-xl text-sm focus:outline-none focus:border-[#7a0000] font-mono" 
                  placeholder="alex@campus.edu" 
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    followInputLength(e.target.value.length);
                  }} 
                  onFocus={() => { setIsTurned(false); setMood('watching'); say("Type your email address. I don't send spam!"); }}
                />
              </div>

              {!isLogin && (accountType === 'student' || accountType === 'teacher') && (
                <div className="animate-fadeInFast">
                  <label className="block text-[11px] font-black uppercase text-[#ff3333] tracking-wider mb-1 font-mono">Master School Hub Code</label>
                  <input type="text" required className="w-full px-4 py-3 bg-[#1a0808] border border-[#2b0808] text-white rounded-xl text-sm font-mono uppercase focus:outline-none focus:border-[#7a0000]" placeholder="E.G. DPS-MUMBAI" 
                    onChange={(e) => setFormData({ ...formData, schoolCode: e.target.value })}
                    onBlur={(e) => handleSchoolCodeBlur(e.target.value)} 
                    onFocus={() => { setIsTurned(false); setMood('watching'); say("Enter your institutional school code."); }}
                  />
                </div>
              )}

              {!isLogin && accountType === 'student' && availableClasses.length > 0 && (
                <div className="animate-fadeInFast">
                  <label className="block text-[11px] font-black uppercase text-emerald-400 tracking-wider mb-1 font-mono">Select Your Classroom</label>
                  <select required className="w-full px-4 py-3 bg-[#1a0808] border border-[#2b0808] text-white rounded-xl text-sm focus:outline-none focus:border-[#7a0000]" onChange={(e) => setFormData({ ...formData, specificClassId: e.target.value })}>
                    <option value="">-- Choose Class --</option>
                    {availableClasses.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0f0505] text-white">{c.class_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {!isLogin && accountType === 'teacher' && (
                <div className="animate-fadeInFast">
                  <label className="block text-[11px] font-black uppercase text-amber-400 tracking-wider mb-1 font-mono">Upload Appointment Letter Proof (PDF/Image)</label>
                  <input type="file" required accept="image/*,application/pdf" className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1a0808] file:text-amber-400" onChange={(e) => setDocumentFile(e.target.files[0])} />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider font-mono">Security Password</label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={initForgotPasswordFlow}
                      className="text-[10px] font-bold text-[#ff3333] hover:underline focus:outline-none font-mono cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>

                <PasswordBeamInput 
                  value={formData.password}
                  onChange={(e) => handlePasswordInput(e.target.value)}
                  onFocus={() => { setIsTurned(true); setMood('watching'); say("A secret key? Turning around so I don't peek!"); }}
                  onBlur={() => setIsTurned(false)}
                  required={!isForgotMode}
                  minLength={6}
                />
              </div>

              {status.message && (
                <p className={`text-xs font-bold p-3 rounded-xl border ${status.success ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-400' : 'bg-rose-950/40 border-rose-900/40 text-rose-400'}`}>
                  {status.message}
                </p>
              )}

              <button 
                type="submit" 
                disabled={status.loading} 
                onMouseEnter={() => { setMood('excited'); say("Ready to initialize execution?"); }}
                onMouseLeave={() => setMood('idle')}
                className="w-full py-4 bg-[#7a0000] hover:bg-[#a30000] text-white font-black rounded-xl text-sm transition-all disabled:opacity-50 shadow-md uppercase tracking-wider cursor-pointer font-mono"
              >
                {status.loading ? 'Syncing Workspace...' : isLogin ? 'Sign In' : 'Register Account'}
              </button>
            </form>

            <div className="text-center text-xs text-slate-400 pt-2 border-t border-[#2b0808]">
              {isLogin ? (
                <>Don&apos;t have an account? <button onClick={() => { window.history.replaceState(null, '', '/signup'); setIsLogin(false); say("Switched to signup mode."); }} className="text-[#ff3333] font-bold hover:underline cursor-pointer">Register here</button></>
              ) : (
                <>Already have an account? <button onClick={() => { window.history.replaceState(null, '', '/signup?mode=login'); setIsLogin(true); say("Switched to login terminal."); }} className="text-[#ff3333] font-bold hover:underline cursor-pointer">Login here</button></>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <main className="min-h-screen bg-black text-slate-100 antialiased pt-28 pb-12">
      <Navbar />
      <section className="max-w-md mx-auto px-6">
        <Suspense fallback={<div className="w-full text-center py-12 text-xs font-bold text-slate-500 font-mono">Loading Terminal...</div>}>
          <SignupForm />
        </Suspense>
      </section>
    </main>
  );
}