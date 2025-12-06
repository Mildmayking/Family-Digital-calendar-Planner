// Note: This file relies on the SDKs being loaded via script tags in index.html and exposed as F_ functions.

const { useState, useEffect, useRef } = React;
const lucide = window.lucide; 

// --- FIREBASE CONFIGURATION (Managed Service Model) ---
const firebaseConfig = {
  apiKey: "AIzaSyDcY8yQQOZ6lGG_x9A7V50FaKb2wIWFFWk",
  authDomain: "family-digital-calendar-hub.firebaseapp.com",
  projectId: "family-digital-calendar-hub",
  storageBucket: "family-digital-calendar-hub.firebasestorage.app",
  messagingSenderId: "495029760176",
  appId: "1:495029760176:web:67f87c6faa2eccdb1ecb75"
};

// --- Core Firebase and App Constants ---
let appInstance = null;
let authInstance = null;
let dbInstance = null;
const appId = "notebook-2026-family-v10-saas-final"; 
const NETLIFY_URL = "https://family-digital-calendar-planner.netlify.app/"; 

const COLLECTIONS = {
    MEMBERS: 'planner_members',
    EVENTS: 'planner_events',
    NOTES: 'planner_notes',
    LICENSES: 'active_licenses' 
};

// Initialize Firebase instances (called only once)
function initFirebase() {
    if (!appInstance && typeof window.F_initializeApp !== 'undefined') {
        appInstance = window.F_initializeApp(firebaseConfig);
        authInstance = window.F_getAuth(appInstance);
        dbInstance = window.F_getFirestore(appInstance);
    }
    return { app: appInstance, auth: authInstance, db: dbInstance };
}

// --- CONTENT UTILITIES ---
const BIBLE_VERSES = ["For I know the plans I have for you,” declares the LORD, “plans to prosper you and not to harm you, plans to give you hope and a future. - Jeremiah 29:11", "I can do all things through Christ who gives me strength. - Philippians 4:13", "Trust in the LORD with all your heart and lean not on your own understanding. - Proverbs 3:5", "Have I not commanded you? Be strong and courageous. Do not be afraid. - Joshua 1:9", "But those who hope in the LORD will renew their strength. They will soar on wings like eagles. - Isaiah 40:31", "Love is patient, love is kind. It does not envy, it does not boast, it is not proud. - 1 Corinthians 13:4", "The LORD is my shepherd, I lack nothing. - Psalm 23:1", "And we know that in all things God works for the good of those who love him. - Romans 8.28", "The name of the LORD is a fortified tower; the righteous run to it and are safe. - Proverbs 18:10", "Therefore do not worry about tomorrow, for tomorrow will worry about itself. - Matthew 6.34"];
const INSPIRATION_QUOTES = ["Your time is limited, so don't waste it living someone else's life.", "Success is not final, failure is not fatal: it is the courage to continue that counts.", "Believe you can and you're halfway there.", "Act as if what you do makes a difference. It does.", "Happiness is not something ready made. It comes from your own actions.", "The future belongs to those who believe in the beauty of their dreams.", "You don't choose your family. They are God's gift to you, as you are to them.", "It is not how much we have, but how much we enjoy, that makes happiness.", "The only person you are destined to become is the person you decide to be.", "Spread love everywhere you go. Let no one ever come to you without leaving happier."];
const EVENT_ICONS = [{ id: 'default', icon: lucide.Clock, label: 'General' }, { id: 'birthday', icon: lucide.Gift, label: 'Birthday' }, { id: 'school', icon: lucide.GraduationCap, label: 'School' }, { id: 'work', icon: lucide.Briefcase, label: 'Work' }, { id: 'sports', icon: lucide.Dumbbell, label: 'Sports' }, { id: 'meal', icon: lucide.Utensils, label: 'Meal' }, { id: 'travel', icon: lucide.Plane, label: 'Travel' }, { id: 'holiday', icon: lucide.Sun, label: 'Holiday' }, { id: 'church', icon: lucide.BookOpen, label: 'Devotion' }];
const THEMES = { ocean: { name: 'Ocean', bg: 'bg-cyan-50', text: 'text-slate-900', accent: 'bg-cyan-600', card: 'bg-white/90 backdrop-blur border-cyan-100', subtext: 'text-slate-500' }, midnight: { name: 'Midnight', bg: 'bg-slate-950', text: 'text-slate-100', accent: 'bg-indigo-600', card: 'bg-slate-900/90 backdrop-blur border-slate-700', subtext: 'text-slate-400' }, forest: { name: 'Forest', bg: 'bg-emerald-50', text: 'text-emerald-950', accent: 'bg-emerald-700', card: 'bg-white/90 backdrop-blur border-emerald-100', subtext: 'text-emerald-800' }, sunset: { name: 'Sunset', bg: 'bg-orange-50', text: 'text-stone-900', accent: 'bg-orange-600', card: 'bg-white/90 backdrop-blur border-orange-100', subtext: 'text-stone-600' }, lavender: { name: 'Lavender', bg: 'bg-purple-50', text: 'text-purple-950', accent: 'bg-purple-600', card: 'bg-white/90 backdrop-blur border-purple-100', subtext: 'text-purple-800' }, royal: { name: 'Royal', bg: 'bg-slate-50', text: 'text-slate-900', accent: 'bg-yellow-600', card: 'bg-white/90 backdrop-blur border-yellow-100', subtext: 'text-yellow-700' }, berry: { name: 'Berry', bg: 'bg-pink-50', text: 'text-pink-950', accent: 'bg-pink-600', card: 'bg-white/90 backdrop-blur border-pink-100', subtext: 'text-pink-800' }, sunrise: { name: 'Sunrise', bg: 'bg-rose-50', text: 'text-rose-900', accent: 'bg-rose-500', card: 'bg-white/90 backdrop-blur border-rose-100', subtext: 'text-rose-700' } };
const getContentForDate = (dateObj, type) => { const dateStr = dateObj.toDateString(); let hash = 0; for (let i = 0; i < dateStr.length; i++) hash = dateStr.charCodeAt(i) + ((hash << 5) - hash); const pool = type === 'bible' ? BIBLE_VERSES : INSPIRATION_QUOTES; return pool[Math.abs(hash) % pool.length]; };
const speakText = (text, voiceSettings) => { if (!text) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); const voices = window.speechSynthesis.getVoices(); const gender = voiceSettings?.gender || 'female'; let preferred = voices.find(v => v.lang.includes('en') && v.name.toLowerCase().includes(gender)); if (!preferred) preferred = voices.find(v => v.lang.includes('en')); u.voice = preferred || voices[0]; u.rate = voiceSettings?.rate || 1; u.pitch = voiceSettings?.pitch || 1; window.speechSynthesis.speak(u); };

// --- MAIN APP COMPONENT ---
function App() {
  const [user, setUser] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentMember, setCurrentMember] = useState(null); 
  const [events, setEvents] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('auth'); 
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [alertedEvents, setAlertedEvents] = useState(new Set()); // Fixed Set initialization
  
  const audioRef = useRef(null);
  const [firebaseRefs, setFirebaseRefs] = useState(null);

  useEffect(() => { 
    const refs = initFirebase();
    setFirebaseRefs(refs);

    if (audioRef.current) audioRef.current.volume = 0.15; 

    const initAuth = async () => { 
        if (!refs.auth) return;
        try { 
            // NOTE: window.F_signInWithCustomToken is used here to match the index.html setup
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await window.F_signInWithCustomToken(refs.auth, __initial_auth_token); 
            }
        } catch (e) {
             console.error("Custom auth token failed:", e);
        } 
    };
    
    if (refs.auth && refs.db) {
        initAuth();
        
        const unsub = window.F_onAuthStateChanged(refs.auth, async (u) => {
          if (u) {
            setUser(u); 
            const settingsSnap = await window.F_getDoc(window.F_doc(refs.db, 'artifacts', appId, 'users', u.uid, 'settings', 'config'));
            
            if (settingsSnap.exists() && settingsSnap.data().familyId) {
                setFamilyId(settingsSnap.data().familyId);
                setView('profiles'); 
            } else if (settingsSnap.exists() && settingsSnap.data().licenseVerified) {
                 setView('setup_family');
            } else {
                setView('license_gate');
            }
          } else { 
            setUser(null); 
            setFamilyId(null);
            setView('auth'); 
          }
          setLoading(false);
        });
        return () => unsub();
    } else {
         setLoading(false);
    }
    
  }, [firebaseRefs]); 

  // 2. REAL-TIME MEMBERS SYNC (CRITICAL)
  useEffect(() => {
    if (!familyId || !firebaseRefs) {
        setMembers([]);
        return;
    }
    const membersQuery = window.F_query(window.F_collection(firebaseRefs.db, 'artifacts', appId, 'public', 'data', COLLECTIONS.MEMBERS), window.F_where('familyId', '==', familyId));
    
    const unsub = window.F_onSnapshot(membersQuery, snap => {
        const currentMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMembers(currentMembers);
        
        if (currentMember) {
             const updatedCurrent = currentMembers.find(m => m.id === currentMember.id);
             if (updatedCurrent) {
                 setCurrentMember(updatedCurrent);
             } else {
                 setCurrentMember(null);
                 setView('profiles');
             }
        }
    }, (error) => {
        console.error("Failed to sync members:", error);
    });

    return () => unsub();
  }, [familyId, firebaseRefs, currentMember ? currentMember.id : null]); 

  // 3. EVENTS LISTENER
  useEffect(() => {
    if (!familyId || !firebaseRefs) return;
    const q = window.F_query(window.F_collection(firebaseRefs.db, 'artifacts', appId, 'public', 'data', COLLECTIONS.EVENTS), window.F_where('familyId', '==', familyId));
    return window.F_onSnapshot(q, snap => {
        const evs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setEvents(evs.sort((a,b) => a.startTime - b.startTime));
    });
  }, [familyId, firebaseRefs]);

  // --- ALARM SYSTEM (Runs every 30s when app is active) ---
  useEffect(() => {
    if (!currentMember || events.length === 0) return;

    const checkAlarms = () => {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        events.forEach(ev => {
            if (new Date(ev.startTime).getDate() === now.getDate() && new Date(ev.startTime).getMonth() === now.getMonth() && new Date(ev.startTime).getFullYear() === now.getFullYear() && new Date(ev.startTime).getHours() === currentHours && new Date(ev.startTime).getMinutes() === currentMinutes) {
                const alertKey = `${ev.id}-${currentHours}:${currentMinutes}`;
                if (!alertedEvents.has(alertKey)) {
                    let prefix = "";
                    if (ev.memberId === 'all') prefix = "Attention everyone, ";
                    else prefix = `${ev.memberName}, `;
                    const message = `${prefix} it is time for ${ev.title}.`;
                    speakText(message, currentMember.voiceSettings);
                    setAlertedEvents(prev => new Set(prev).add(alertKey));
                }
            }
        });
    };

    const intervalId = setInterval(checkAlarms, 30000); 
    return () => clearInterval(intervalId);
  }, [events, currentMember, alertedEvents]);

  const handleAuth = async (e, email, password, isLogin) => { 
      e.preventDefault(); 
      if (!firebaseRefs) return;
      try { 
          await (isLogin ? window.F_signInWithEmailAndPassword(firebaseRefs.auth, email, password) : window.F_createUserWithEmailAndPassword(firebaseRefs.auth, email, password));
      } catch (e) { 
          throw e;
      } 
  };
  
  const handleGuestLogin = async () => {
      throw new Error("Guest login is disabled for paid license access.");
  };
  
  // --- License Verification Function ---
  const verifyLicense = async (licenseKey) => {
      if (!firebaseRefs || !user || licenseKey.length !== 12) {
          throw new Error("Invalid key format.");
      }
      const licenseRef = window.F_doc(firebaseRefs.db, COLLECTIONS.LICENSES, licenseKey);
      
      try {
          const licenseSnap = await window.F_getDoc(licenseRef);
          
          if (!licenseSnap.exists()) {
              throw new Error("License key is invalid or not found.");
          }
          
          const licenseData = licenseSnap.data();
          
          if (licenseData.used) {
              throw new Error("This license key has already been used.");
          }
          
          await window.F_setDoc(licenseRef, { used: true, usedBy: user.uid, usedAt: Date.now() }, { merge: true });
          
          await window.F_setDoc(window.F_doc(firebaseRefs.db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), { 
              licenseVerified: true, 
              licenseId: licenseKey, 
              licenseType: licenseData.licenseType 
          }, { merge: true });
          
          setView('setup_family');

      } catch (e) {
          console.error("License verification failed:", e);
          throw e;
      }
  };

  // Generate a random 6-character code
  const generateFamilyCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleFamilySetup = async (mode, code) => {
      if (!firebaseRefs || !user) return;

      const fid = mode === 'create' ? generateFamilyCode() : code.toUpperCase().trim();
      
      const familyMembersQuery = window.F_query(window.F_collection(firebaseRefs.db, 'artifacts', appId, 'public', 'data', COLLECTIONS.MEMBERS), window.F_where('familyId', '==', fid));
      const snap = await window.F_getDocs(familyMembersQuery);
      
      if (mode === 'join' && snap.size >= 6) {
           throw new Error(`This family is full (${snap.size}/6). Cannot join.`);
      }
      
      await window.F_setDoc(window.F_doc(firebaseRefs.db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), { familyId: fid, joinedAt: Date.now() }, { merge: true });
      setFamilyId(fid);
      
      const isOwner = mode === 'create';
      
      if (isOwner) {
        await window.F_addDoc(window.F_collection(firebaseRefs.db, 'artifacts', appId, 'public', 'data', COLLECTIONS.MEMBERS), { 
            familyId: fid,
            name: user.email.split('@')[0], 
            role: 'parent', 
            gender: 'female', 
            theme: 'ocean', 
            contentPref: 'inspiration', 
            voiceSettings: { gender: 'female', rate: 1, pitch: 1 }, 
            avatar: '👑',
            createdBy: user.uid,
            ownerUid: user.uid
        });
      } else if (mode === 'join') {
          const userInFamilyQuery = window.F_query(window.F_collection(firebaseRefs.db, 'artifacts', appId, 'public', 'data', COLLECTIONS.MEMBERS), window.F_where('familyId', '==', fid), window.F_where('createdBy', '==', user.uid));
          const userInFamilySnap = await window.F_getDocs(userInFamilyQuery);

          if (userInFamilySnap.empty) {
               await window.F_addDoc(window.F_collection(firebaseRefs.db, 'artifacts', appId, 'public', 'data', COLLECTIONS.MEMBERS), { 
                   familyId: fid,
                   name: user.email.split('@')[0], 
                   role: 'child', 
                   gender: 'female', 
                   theme: 'ocean', 
                   contentPref: 'inspiration', 
                   voiceSettings: { gender: 'female', rate: 1, pitch: 1 }, 
                   avatar: '👤',
                   createdBy: user.uid,
                   ownerUid: snap.docs[0]?.data().ownerUid
               });
          }
      }
      
      setView('profiles');
  };

  const createMember = async (name, role, gender, theme, avatar) => {
      if (members.length >= 6 || !firebaseRefs) return; 
      await window.F_addDoc(window.F_collection(firebaseRefs.db, 'artifacts', appId, 'public', 'data', COLLECTIONS.MEMBERS), { 
          familyId, name, role, gender, theme, avatar, contentPref: 'inspiration', voiceSettings: { gender, rate: 1, pitch: 1 } 
      });
  };

  const toggleMusic = () => { if (audioRef.current) { isPlayingMusic?audioRef.current.pause():audioRef.current.play(); setIsPlayingMusic(!isPlayingMusic); }};

  if (loading || !firebaseRefs) return <div className="h-screen flex items-center justify-center"><lucide.Loader className="animate-spin text-blue-500"/></div>;
  
  if (!user || view === 'auth') return <AuthScreen onAuth={handleAuth} onGuestLogin={handleGuestLogin} />;
  
  if (view === 'license_gate') return <LicenseGate verifyLicense={verifyLicense} signOut={()=>window.F_signOut(authInstance)} />;

  if (view === 'setup_family') return <FamilySetupScreen onSetup={handleFamilySetup} signOut={()=>window.F_signOut(authInstance)} />;

  if (view === 'profiles') return <ProfileSelector members={members} onSelect={m=>{setCurrentMember(m); setView('home');}} onCreate={createMember} signOut={()=>window.F_signOut(authInstance)}/>;

  const theme = THEMES[currentMember?.theme || 'ocean'];

  return (
    <div className={`min-h-screen transition-colors duration-500 ${theme.bg} ${theme.text}`} style={{fontFamily: currentMember?.role==='child'?'"Comic Neue",cursive':'"Inter",sans-serif'}}>
      <audio ref={audioRef} loop src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112762.mp3" />
      <header className={`px-4 py-3 sticky top-0 z-30 flex justify-between items-center backdrop-blur-xl bg-opacity-90 border-b border-black/5 ${theme.bg}`}>
        <div className="flex items-center gap-3" onClick={() => setView('profiles')}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xl shadow-md border-2 border-white/40 ${theme.accent} text-white`}>{currentMember.avatar}</div>
            <div><h1 className="text-base font-bold leading-tight">{currentMember.name}</h1></div>
        </div>
        <button onClick={toggleMusic} className={`p-2 rounded-full ${theme.card} border border-black/5`}>{isPlayingMusic ? <lucide.Volume2 size={20} className={theme.accent.replace('bg-', 'text-')} /> : <lucide.VolumeX size={20} className="opacity-40" />}</button>
      </header>
      <main className="p-4 pb-32 max-w-xl mx-auto w-full min-h-[85vh]">
        {view === 'home' && <Dashboard member={currentMember} events={events} theme={theme} setView={setView} />}
        {view === 'notes' && <NotesManager member={currentMember} familyId={familyId} db={db} appId={appId} theme={theme} />}
        {view === 'planner' && <FamilyCalendar member={currentMember} members={members} events={events} familyId={familyId} db={db} appId={appId} theme={theme} />}
        {view === 'settings' && <SettingsScreen member={currentMember} members={members} familyId={familyId} db={db} appId={appId} theme={theme} onUpdate={setCurrentMember} onCreate={createMember} />}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 p-4">
        <div className={`max-w-xl mx-auto ${theme.card} border rounded-2xl p-2 flex justify-between shadow-2xl backdrop-blur-xl`}>
            {[{id:'home',icon:lucide.Home},{id:'notes',icon:lucide.PenTool},{id:'planner',icon:lucide.CalendarIcon},{id:'settings',icon:lucide.Settings}].map(i=>(
                <button key={i.id} onClick={()=>setView(i.id)} className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${view===i.id?'':'opacity-60'}`}>
                    <div className={`p-1.5 rounded-lg ${view===i.id?`${theme.accent} text-white shadow-lg -translate-y-1`:'text-current'}`}><i.icon size={24} strokeWidth={view===i.id?2.5:2}/></div>
                </button>
            ))}
        </div>
      </nav>
    </div>
  );
}

// --- AUTH & SETUP SCREENS ---
const AuthScreen = ({ onAuth, onGuestLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [isLogin, setIsLogin] = useState(true);

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setAuthError('');
        try {
            await onAuth(e, email, password, isLogin);
        } catch (e) {
            setAuthError(e.message);
        }
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 flex flex-col items-center justify-center p-6 text-white">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/10 shadow-2xl">
                <h1 className="text-3xl font-bold text-center mb-8">Family Hub</h1>
                {authError && <div className="bg-red-500/20 p-4 rounded-xl mb-4 text-center text-sm">{authError}</div>}
                
                {/* ACCOUNT AUTH FORM */}
                <form onSubmit={handleAuthSubmit} className="space-y-4 mb-6">
                    <input className="w-full p-4 bg-black/20 rounded-xl border border-white/10 text-white placeholder-white/50" placeholder="Email (Required for Paid Access)" value={email} onChange={e=>setEmail(e.target.value)}/>
                    <input className="w-full p-4 bg-black/20 rounded-xl border border-white/10 text-white placeholder-white/50" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>
                    {/* SAAS MODEL: Login is primary, Signup triggers payment assumption */}
                    <button className="w-full bg-white text-indigo-900 py-4 rounded-xl font-bold shadow-lg mt-4">{isLogin?'Log In':'Sign Up (License Required)'}</button>
                </form>

                {/* TOGGLE/ALTERNATIVE AUTH */}
                <button onClick={()=>setIsLogin(!isLogin)} className="w-full text-xs opacity-60 hover:opacity-100 mb-6">{isLogin?"New User? Sign Up":"Existing User? Log In"}</button>
                
                {/* INSTRUCTION (Simplified) */}
                <p className="text-xs text-white/50 pt-4 text-center flex items-center justify-center gap-1">
                    <lucide.Users size={12}/>
                    Access requires a registered account to manage your family license.
                </p>
            </div>
        </div>
    );
};

const LicenseGate = ({ verifyLicense, signOut }) => {
    const [licenseKey, setLicenseKey] = useState('');
    const [gateError, setGateError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    
    const formatKey = (value) => {
        const clean = value.replace(/[^A-Z0-9]/g, '').toUpperCase();
        if (clean.length > 12) return licenseKey;

        let formatted = '';
        for (let i = 0; i < clean.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += '-';
            formatted += clean[i];
        }
        return formatted;
    }

    const handleVerify = async (e) => {
        e.preventDefault();
        setIsVerifying(true);
        setGateError('');
        try {
            // Remove dashes for verification
            const cleanKey = licenseKey.replace(/-/g, '');
            await verifyLicense(cleanKey);
        } catch (e) {
            setGateError(e.message || "Verification failed. Check your key.");
        } finally {
            setIsVerifying(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/10 shadow-2xl text-center">
                <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2"><lucide.Command size={32}/> Activate License</h1>
                <p className="text-white/60 mb-6">Please enter the 12-character license key purchased from our store to activate your family's calendar.</p>
                
                {gateError && <div className="bg-red-500/20 p-4 rounded-xl mb-4 text-sm">{gateError}</div>}
                
                <form onSubmit={handleVerify} className="space-y-4">
                    <input 
                        className="w-full p-4 bg-black/30 rounded-xl text-center text-xl tracking-widest font-mono text-white placeholder-white/50" 
                        placeholder="XXXX-XXXX-XXXX" 
                        value={licenseKey} 
                        onChange={e => setLicenseKey(formatKey(e.target.value))}
                        maxLength={14} // 12 chars + 2 dashes
                    />
                    <button type="submit" disabled={isVerifying || licenseKey.replace(/-/g, '').length !== 12} className="w-full bg-yellow-500 text-indigo-900 py-4 rounded-xl font-bold shadow-lg mt-4 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isVerifying ? <lucide.Loader size={20} className="animate-spin"/> : <lucide.Check size={20}/>}
                        {isVerifying ? 'Verifying...' : 'Activate License'}
                    </button>
                </form>
                <button onClick={signOut} className="mt-12 text-sm opacity-40 hover:opacity-100 flex items-center justify-center gap-2 w-full"><lucide.LogOut size={16}/> Sign Out</button>
            </div>
        </div>
    );
};


const FamilySetupScreen = ({ onSetup, signOut }) => {
    
    const [mode, setMode] = useState(null); // 'create' or 'join'
    const [code, setCode] = useState('');
    const [setupError, setSetupError] = useState('');

    useEffect(() => {
        const pendingCode = localStorage.getItem('pendingFamilyCode');
        if (pendingCode) {
            setCode(pendingCode);
            setMode('join');
            localStorage.removeItem('pendingFamilyCode');
        }
    }, []);

    const handleSetupAttempt = async (mode, code) => {
        setSetupError('');
        try {
            await onSetup(mode, code);
        } catch (e) {
            setSetupError(e.message);
        }
    }


    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md text-center">
                <h1 className="text-3xl font-bold mb-2">Connect to Family</h1>
                <p className="text-white/60 mb-8">Choose whether to start a new calendar (if you are the primary user) or join an existing one using your shared family code.</p>
                {setupError && <div className="bg-red-500/20 p-4 rounded-xl mb-4 text-center text-sm">{setupError}</div>}

                {!mode ? (
                    <div className="space-y-4">
                        <button onClick={()=>handleSetupAttempt('create')} className="w-full p-6 bg-indigo-600 rounded-2xl font-bold text-lg hover:bg-indigo-500 transition shadow-lg flex flex-col items-center gap-2">
                            <lucide.Home size={32}/>
                            Start New Family (Owner)
                        </button>
                        <button onClick={()=>setMode('join')} className="w-full p-6 bg-white/10 rounded-2xl font-bold text-lg hover:bg-white/20 transition border border-white/5 flex flex-col items-center gap-2">
                            <lucide.Users size={32}/>
                            Join Existing Family (Member)
                        </button>
                    </div>
                ) : (
                    <div className="bg-white/10 p-8 rounded-2xl border border-white/10">
                        <h2 className="text-xl font-bold mb-4">{mode === 'create' ? 'Confirm New Family' : 'Enter Shared Family Code'}</h2>
                        {mode === 'join' && 
                            <input className="w-full p-4 bg-black/30 rounded-xl text-center text-2xl tracking-widest font-mono mb-4 border border-white/20" placeholder="6-DIGIT CODE" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={6} />
                        }
                        <button onClick={()=>handleSetupAttempt(mode, code)} disabled={mode === 'join' && code.length < 6} className="w-full bg-white text-indigo-900 py-4 rounded-xl font-bold disabled:opacity-50">
                            {mode === 'create' ? 'Create Calendar' : 'Join Family'}
                        </button>
                        <button onClick={()=>setMode(null)} className="mt-4 text-sm opacity-60">Back</button>
                    </div>
                )}
                <button onClick={signOut} className="mt-12 w-full py-4 text-white/40 hover:opacity-100 flex items-center justify-center gap-2"><lucide.LogOut size={16}/> Sign Out</button>
            </div>
        </div>
    );
};

const ProfileSelector = ({ members, onSelect, onCreate, signOut }) => {
    const [add, setAdd] = useState(false);
    const [name, setName] = useState('');
    const [role, setRole] = useState('child');
    const [gender, setGender] = useState('female');
    const [addError, setAddError] = useState('');
    const familyIsFull = members.length >= 6;

    const handleCreate = async (modalName, modalRole, modalGender) => {
        if(!modalName) return;
        setAddError('');
        try {
            const av = modalRole==='parent' ? (modalGender==='male'?'👨':'👩') : (modalGender==='male'?'👦':'👧');
            await onCreate(modalName, modalRole, modalGender, 'ocean', av);
            setAdd(false); setName('');
        } catch (e) {
            setAddError(e.message);
        }
    };

    const AddMemberModal = () => {
        const [modalName, setModalName] = useState('');
        const [modalRole, setModalRole] = useState('child');
        const [modalGender, setModalGender] = useState('female');

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-sm bg-white p-6 rounded-[2rem] shadow-2xl border">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-black">New Member</h3>
                        <button onClick={() => setShowAddModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200">{e(lucide.X, { size: 18, className: "text-gray-500" })}</button>
                    </div>
                    <div className="space-y-4">
                        <div >
                            <label className="text-xs font-bold text-gray-400 mb-1 block">NAME</label>
                            <input className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 text-black focus:border-indigo-500 outline-none" placeholder="e.g. Liam" value={modalName} onChange={evt => setModalName(evt.target.value)} />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ROLE</label>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button onClick={() => setModalRole('parent')} className={`flex-1 p-3 rounded-lg font-bold text-xs transition ${modalRole === 'parent' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>Parent</button>
                                    <button onClick={() => setModalRole('child')} className={`flex-1 p-3 rounded-lg font-bold text-xs transition ${modalRole === 'child' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>Child</button>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-500 mb-1 block">GENDER</label>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button onClick={() => setModalGender('male')} className={`flex-1 p-3 rounded-lg font-bold text-xs transition ${modalGender === 'male' ? 'bg-blue-600 text-white' : 'bg-slate-700'}` }>Boy</button>
                                    <button onClick={() => setModalGender('female')} className={`flex-1 p-3 rounded-lg font-bold text-xs transition ${modalGender === 'female' ? 'bg-pink-600 text-white' : 'bg-slate-700'}` }>Girl</button>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => handleCreate(modalName, modalRole, modalGender)} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl mt-4 hover:scale-[1.02] transition shadow-lg shadow-indigo-200">Create Profile</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold text-center mb-8">Who's here?</h1>
                {addError && <div className="bg-red-500/20 p-4 rounded-xl mb-4 text-center text-sm">{addError}</div>}
                
                <div className="grid grid-cols-2 gap-4">
                    {members.map(m => e('button', { key: m.id, onClick: () => onSelect(m), className: "flex flex-col items-center gap-2 p-6 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/5 transition" },
                        e('div', { className: "text-5xl mb-2" }, m.avatar),
                        e('span', { className: "font-bold text-lg" }, m.name)
                    ))}
                    {!familyIsFull && e('button', { onClick: () => setAdd(true), className: "flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-white/10 text-white/40 hover:text-white hover:border-white/40 transition" }, e(lucide.UserPlus, { size: 40 }), e('span', { className: "font-bold" }, "Add"))}
                </div>
                {familyIsFull && e('p', { className: "text-sm text-center text-red-300 mt-4" }, e(lucide.AlertCircle, { size: 16, className: "inline-block mr-1" }), " License limit (6 members) reached for this family.")}

                <button onClick={signOut} className="mt-12 w-full py-4 text-white/40 hover:text-white flex justify-center gap-2" >{e(lucide.LogOut, { size: 18 })} Sign Out</button>
            </div>
            {add && e(AddMemberModal, { handleCreate })}
        </div>
    );
};

const Dashboard = ({ member, events, theme, setView, db, appId }) => {
    const today = new Date();
    const content = getContentForDate(today, member?.contentPref || 'inspiration');
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    const todaysEvents = events.filter(ev => {
        const evDate = new Date(ev.startTime);
        return evDate.getDate() === today.getDate() && evDate.getMonth() === today.getMonth() && evDate.getFullYear() === today.getFullYear();
    });

    const EventList = e('div', { className: `${theme.card} rounded-[2rem] border overflow-hidden shadow-sm` },
        todaysEvents.map((ev, idx) => {
             const Icon = EVENT_ICONS.find(i => i.id === ev.icon)?.icon || lucide.Clock;
             return e('div', { key: ev.id, className: `flex items-center gap-4 p-4 ${idx !== todaysEvents.length - 1 ? 'border-b border-black/5' : ''}` },
                e('div', { className: "text-center w-12" },
                    e('div', { className: "text-xs font-bold opacity-50" }, new Date(ev.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).split(' ')[1]),
                    e('div', { className: "text-lg font-bold leading-none" }, new Date(ev.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).split(' ')[0])
                ),
                e('div', { className: `p-3 rounded-2xl ${theme.bg} text-current` }, e(Icon, { size: 20, className: theme.subtext })),
                e('div', { className: "flex-1 min-w-0" },
                    e('h4', { className: "font-bold truncate" }, ev.title),
                    e('div', { className: "flex items-center gap-2 text-xs opacity-60" },
                        e('span', { className: "bg-black/5 px-2 py-0.5 rounded-md truncate max-w-[100px]" }, ev.memberName)
                    )
                )
            );
        })
    );

    return e('div', { className: "space-y-6 animate-fade-in-up" },
        e('div', { className: `p-6 md:p-8 rounded-[2rem] ${theme.accent} text-white shadow-xl relative overflow-hidden group` },
            e('div', { className: "absolute top-0 right-0 p-8 opacity-10 transform translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-700" }, e(lucide.Heart, { size: 150, fill: "currentColor" })),
            e('div', { className: "relative z-10" },
                e('p', { className: "opacity-90 text-xs font-bold uppercase tracking-widest mb-1" }, dateStr),
                e('h2', { className: "text-2xl md:text-4xl font-bold" }, "Hi, ", member.name, "!"),
                e('div', { className: "bg-white/15 backdrop-blur-md p-5 rounded-2xl border border-white/20 shadow-inner" },
                    e('div', { className: "flex justify-between items-start gap-4 mb-3" },
                        e('span', { className: "text-[10px] uppercase tracking-wider font-bold opacity-80 flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-full" },
                            member.contentPref === 'bible' ? e(lucide.BookOpen, { size: 10 }) : e(lucide.Heart, { size: 10 }),
                            member.contentPref === 'bible' ? ' Verse' : ' Quote'
                        ),
                        e('button', { onClick: () => speakText(content, member.voiceSettings), className: "bg-white/20 hover:bg-white/30 p-2 rounded-full transition active:scale-95" }, e(lucide.Volume2, { size: 16 }))
                    ),
                    e('p', { className: `text-sm md:text-base leading-relaxed opacity-95 ${member.role === 'child' ? 'font-comic' : 'font-serif italic'}` }, "\"", content, "\"")
                )
            )
        ),
        e('div', { className: "space-y-3" },
            e('h3', { className: "text-lg font-bold px-2 opacity-80 flex items-center gap-2" }, e(lucide.Clock, { size: 18 }), " Today's Schedule"),
            todaysEvents.length === 0 ? (
                e('div', { className: `${theme.card} p-6 rounded-[2rem] border border-dashed border-gray-300 flex flex-col items-center justify-center text-center opacity-50` },
                    e('div', { className: "mb-2 bg-black/5 p-3 rounded-full" }, e(lucide.Sun, { size: 24 })),
                    e('p', { className: "text-sm font-bold" }, "Nothing scheduled for today!"),
                    e('p', { className: "text-xs" }, "Enjoy your free time.")
                )
            ) : EventList
        ),
        e('div', { className: "grid grid-cols-2 gap-4" },
            e('button', { onClick: () => setView('planner'), className: `${theme.card} p-5 rounded-[2rem] border flex flex-col items-center justify-center gap-3 h-32 hover:scale-[1.02] transition-all duration-300 group` },
                e('div', { className: `p-3 rounded-full ${theme.bg} ${theme.text} group-hover:bg-opacity-80` }, e(lucide.CalendarIcon, { size: 24, strokeWidth: 1.5 })),
                e('span', { className: "font-bold text-sm opacity-80" }, "Full Calendar")
            ),
            e('button', { onClick: () => setView('notes'), className: `${theme.card} p-5 rounded-[2rem] border flex flex-col items-center justify-center gap-3 h-32 hover:scale-[1.02] transition-all duration-300 group` },
                e('div', { className: `p-3 rounded-full ${theme.bg} ${theme.text} group-hover:bg-opacity-80` }, e(lucide.PenTool, { size: 24, strokeWidth: 1.5 })),
                e('span', { className: "font-bold text-sm opacity-80" }, "My Notes")
            )
        )
    );
};

const FamilyCalendar = ({ member, members, events, theme, db, appId }) => {
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [selectedAssignee, setSelectedAssignee] = useState(member.id); 
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventIcon, setNewEventIcon] = useState('default');
    const [newEventTime, setNewEventTime] = useState('12:00');
    const [isMicActive, setIsMicActive] = useState(false); 

    const startDictation = () => {
        const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
        if (!SR) return;
        
        const dictation = new SR();
        dictation.lang = 'en-US';
        dictation.continuous = false;
        dictation.interimResults = false;

        dictation.onstart = () => setIsMicActive(true);
        dictation.onend = () => setIsMicActive(false);
        dictation.onresult = (evt) => {
            const text = evt.results[0][0].transcript;
            setNewEventTitle(text);
        };
        dictation.start();
    };

    const changeMonth = (offset) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const getEventsForDay = (day) => {
        return events.filter(ev => {
            const evDate = new Date(ev.startTime);
            return evDate.getDate() === day && evDate.getMonth() === currentDate.getMonth() && evDate.getFullYear() === currentDate.getFullYear() &&
                (selectedAssignee === 'all' || ev.memberId === selectedAssignee || ev.memberId === 'all');
        });
    };

    const handleAddEvent = async () => {
        if (!newEventTitle || !selectedDate) return;
        const [hours, mins] = newEventTime.split(':');
        const eventDateTime = new Date(selectedDate);
        eventDateTime.setHours(parseInt(hours), parseInt(mins), 0, 0);

                const assignedMember = members.find(m => m.id === selectedAssignee);
                const memberName = selectedAssignee === 'all' ? 'Everyone' : (assignedMember ? assignedMember.name : 'Unknown');

                await db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.EVENTS).add({
                    familyId, title: newEventTitle, startTime: eventDateTime.getTime(), memberId: selectedAssignee, memberName, icon: newEventIcon, createdAt: Date.now()
                });
                setNewEventTitle('');
            };

            const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            const blanks = Array.from({ length: firstDay }, (_, i) => i);
            const modalContent = selectedDate ? getContentForDate(selectedDate, member.contentPref || 'inspiration') : '';

            const CalendarGrid = e('div', { className: "grid grid-cols-7 p-2 bg-white/50 min-h-[300px]" },
                blanks.map((_, i) => e('div', { key: `blank-${i}`, className: "p-2 h-20 sm:h-24" })),
                days.map(day => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                    return e('div', { 
                        key: `day-${day}`, 
                        onClick: () => { setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)); setShowModal(true); setNewEventTitle(''); }, 
                        className: `relative p-1 h-20 sm:h-24 border border-transparent hover:bg-black/5 hover:border-black/5 rounded-xl cursor-pointer transition-colors flex flex-col items-center justify-start gap-1` 
                    },
                        e('span', { className: `text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? theme.accent + ' text-white' : 'opacity-70'}` }, day),
                        e('div', { className: "flex flex-wrap justify-center gap-1 w-full" },
                            dayEvents.slice(0, 3).map((ev) => {
                                const Icon = EVENT_ICONS.find(i => i.id === ev.icon)?.icon || lucide.Clock; 
                                return e('div', { key: ev.id, className: `w-1.5 h-1.5 sm:w-4 sm:h-4 rounded-full sm:rounded-md ${theme.accent} sm:bg-opacity-10 sm:text-indigo-600 flex items-center justify-center` }, e(Icon, { size: 10, className: "hidden sm:block" }))
                            }),
                            dayEvents.length > 3 && e('div', { className: "text-[8px] font-bold text-gray-400" }, "+")
                        )
                    );
                })
            );

            const ModalContent = e('div', { className: `w-full max-w-sm ${theme.card} p-6 rounded-[2rem] shadow-2xl border max-h-[85vh] overflow-y-auto` },
                e('div', { className: "flex justify-between items-center mb-4" },
                    e('div', null, e('h3', { className: "text-xl font-bold" }, selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric'})), e('p', { className: `text-xs ${theme.subtext}` }, "Daily Wisdom")),
                    e('button', { onClick: () => setShowModal(false), className: "p-2 bg-gray-100 rounded-full hover:bg-gray-200" }, e(lucide.X, { size: 18 }))
                ),
                e('div', { className: `${theme.accent} bg-opacity-10 p-4 rounded-xl mb-6 border border-current border-opacity-10` },
                    e('div', { className: "flex justify-between items-start gap-2 mb-2" },
                        e('span', { className: "text-[10px] uppercase font-bold tracking-wider opacity-60" }, member.contentPref === 'bible' ? 'Verse of the Day' : 'Daily Inspiration'),
                        e('button', { onClick: () => speakText(modalContent, member.voiceSettings), className: "opacity-50 hover:opacity-100" }, e(lucide.Volume2, { size: 14 }))
                    ),
                    e('p', { className: "text-sm font-medium italic leading-relaxed opacity-90" }, "\"", modalContent, "\"")
                ),
                e('div', { className: "mb-6 space-y-2" },
                    e('h4', { className: "text-xs font-bold uppercase opacity-50 mb-2" }, "Events"),
                    getEventsForDay(selectedDate?.getDate() || 0).length === 0 ? e('p', { className: "text-center text-sm opacity-50 py-4 italic border-2 border-dashed border-gray-200 rounded-xl" }, "No events planned.") : 
                    getEventsForDay(selectedDate?.getDate() || 0).map(ev => {
                        const Icon = EVENT_ICONS.find(i => i.id === ev.icon)?.icon || lucide.Clock;
                        return e('div', { key: ev.id, className: "flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-black/5" },
                            e('div', { className: `p-2 rounded-full ${theme.accent} text-white` }, e(Icon, { size: 14 })),
                            e('div', { className: "flex-1" },
                                e('p', { className: "text-sm font-bold leading-tight" }, ev.title),
                                e('p', { className: "text-[10px] opacity-60" }, new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
                            ),
                            e('button', { onClick: (evt) => { evt.stopPropagation(); db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.EVENTS).doc(ev.id).delete(); } , className: "text-gray-400 hover:text-red-500" }, e(lucide.Trash2, { size: 16 }))
                        );
                    })
                ),
                e('div', { className: "space-y-4 pt-4 border-t border-black/10" },
                    e('div', { className: "relative" },
                        e('input', { autoFocus: true, className: "w-full p-3 rounded-xl border outline-none text-sm font-medium bg-white text-black border-gray-200 pr-10", placeholder: "Event title...", value: newEventTitle, onChange: evt => setNewEventTitle(evt.target.value) }),
                        e('button', { onClick: startDictation, className: `absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${isMicActive ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}` }, e(lucide.Mic, { size: 16 }))
                    ),
                    e('div', { className: "flex gap-2" },
                        e('input', { type: "time", className: "flex-1 p-3 rounded-xl border outline-none text-sm font-medium bg-white text-black border-gray-200", value: newEventTime, onChange: evt => setNewEventTime(evt.target.value) }),
                        e('div', { className: "flex bg-gray-100 rounded-xl p-1 gap-1 overflow-x-auto max-w-[150px]" }, EVENT_ICONS.slice(1).map(ic => e('button', { key: ic.id, onClick: () => setNewEventIcon(newEventIcon === ic.id ? 'default' : ic.id), className: `p-2 rounded-lg transition-all flex-shrink-0 ${newEventIcon === ic.id ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`, title: ic.label }, e(ic.icon, { size: 18 }))))
                    ),
                    e('button', { onClick: handleAddEvent, className: `w-full py-3 rounded-xl ${theme.accent} text-white font-bold shadow-lg flex items-center justify-center gap-2` }, e(lucide.Save, { size: 18 }), " Save Event")
                )
            );

            return e('div', { className: "space-y-6 h-full flex flex-col relative" },
                e('div', { className: "flex justify-between items-center mb-2" },
                    e('div', null, e('h2', { className: "text-2xl font-bold leading-none" }, currentDate.toLocaleString('default', { month: 'long' })), e('p', { className: `text-sm ${theme.subtext}` }, currentDate.getFullYear())),
                    e('div', { className: "flex gap-2 items-center" },
                        e('button', { onClick: () => changeMonth(-1), className: `p-2 rounded-xl ${theme.card} border hover:bg-black/5` }, e(lucide.ChevronLeft, { size: 20 })),
                        e('button', { onClick: () => changeMonth(1), className: `p-2 rounded-xl ${theme.card} border hover:bg-black/5` }, e(lucide.ChevronRight, { size: 20 }))
                    )
                ),
                e('div', { className: "flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4" },
                    e('button', { onClick: () => setSelectedAssignee('all'), className: `px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${selectedAssignee === 'all' ? theme.accent + ' text-white border-transparent shadow-md' : 'bg-white text-gray-600 border-gray-200'}` }, "Everyone"),
                    members.map(m => e('button', { key: m.id, onClick: () => setSelectedAssignee(m.id), className: `px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border flex items-center gap-1.5 transition-all ${selectedAssignee === m.id ? theme.accent + ' text-white border-transparent shadow-md' : 'bg-white text-gray-600 border-gray-200'}` }, e('span', null, m.avatar), " ", m.name))
                ),
                e('div', { className: `${theme.card} rounded-[2rem] border overflow-hidden shadow-sm flex-1` },
                    e('div', { className: "grid grid-cols-7 p-4 border-b border-black/5 bg-black/5" }, ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => e('div', { key: i, className: "text-center text-xs font-bold opacity-50" }, d))),
                    CalendarGrid
                ),
                showModal && e('div', { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" }, ModalContent)
            );
        };

        const NotesManager = ({ member, familyId, db, appId, theme }) => {
            const [notes, setNotes] = useState([]);
            const [isEditor, setIsEditor] = useState(false);
            const [title, setTitle] = useState('');
            const [content, setContent] = useState('');
            const [isListening, setIsListening] = useState(false);
            const recognition = useRef(null);

            useEffect(() => {
                if(!familyId) return;
                const q = db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.NOTES).where('familyId', '==', familyId).where('authorId', '==', member.id);
                const unsub = q.onSnapshot(s => setNotes(s.docs.map(d=>({id:d.id, ...d.data()}))));
                return () => unsub();
            }, [familyId, member.id]);

            useEffect(() => {
                if (window.webkitSpeechRecognition || window.SpeechRecognition) {
                    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
                    recognition.current = new SR();
                    recognition.current.continuous = true;
                    recognition.current.onresult = evt => {
                        let final = '';
                        for (let i = evt.resultIndex; i < evt.results.length; ++i) if(evt.results[i].isFinal) final += evt.results[i][0].transcript;
                        if(final) setContent(p => p + ' ' + final);
                    };
                }
            }, []);

            const toggleMic = () => {
                if (isListening) { recognition.current.stop(); setIsListening(false); }
                else { recognition.current.start(); setIsListening(true); }
            };

            const save = async () => {
                if(!title && !content) return;
                await db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.NOTES).add({
                    familyId, title: title || 'Untitled', content, authorId: member.id, createdAt: Date.now()
                });
                setIsEditor(false); setTitle(''); setContent('');
            };

            const Editor = e('div', { className: `h-[75vh] flex flex-col ${theme.card} rounded-[2rem] shadow-2xl border border-white/20 overflow-hidden relative` },
                e('div', { className: "p-4 flex justify-between items-center border-b border-gray-100 bg-white/50 backdrop-blur-sm" },
                    e('button', { onClick: () => setIsEditor(false), className: `${theme.subtext} font-medium` }, "Cancel"),
                    e('button', { onClick: save, className: `${theme.accent} text-white px-6 py-2 rounded-xl font-bold shadow-md` }, "Save")
                ),
                e('div', { className: "p-6 flex-1 relative flex flex-col" },
                    e('input', { className: `text-2xl font-bold bg-transparent outline-none w-full mb-4 ${theme.text}`, placeholder: "Title...", value: title, onChange: evt => setTitle(evt.target.value) }),
                    e('textarea', { className: `w-full flex-1 bg-transparent outline-none resize-none ${theme.text} opacity-80`, placeholder: "Type or speak...", value: content, onChange: evt => setContent(evt.target.value) }),
                    e('button', { onClick: toggleMic, className: `absolute bottom-6 right-6 p-4 rounded-full shadow-xl transition hover:scale-110 active:scale-90 ${isListening ? 'bg-red-500 animate-pulse text-white' : `${theme.accent} text-white`}` },
                        e(lucide.Mic, { size: 16 })
                    )
                )
            );

            if (isEditor) return Editor;

            return e('div', { className: "space-y-4" },
                e('div', { className: "flex justify-between items-center mb-2" },
                    e('h2', { className: "text-2xl font-bold px-2" }, "My Notes"),
                    e('button', { onClick: () => setIsEditor(true), className: `${theme.accent} text-white p-3 rounded-xl shadow-md hover:brightness-110 transition active:scale-95` }, e(lucide.PenTool, { size: 20 }))
                ),
                e('div', { className: "grid gap-3" },
                    notes.map(n => e('div', { key: n.id, className: `${theme.card} p-5 rounded-[2rem] border shadow-sm relative group` },
                        e('h3', { className: "font-bold mb-1" }, n.title),
                        e('p', { className: "text-sm opacity-70 line-clamp-3" }, n.content),
                        e('button', { 
                            onClick: (evt) => { evt.stopPropagation(); db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.NOTES).doc(n.id).delete(); }, 
                            className: "absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition" 
                        }, e(lucide.Trash2, { size: 16 }))
                    )),
                    notes.length === 0 && e('div', { className: "text-center py-12 opacity-40" }, "No notes yet. Use voice to add one!")
                )
            );
        };

        const SettingsScreen = ({ member, members, familyId, auth, theme, onUpdate, onCreate }) => {
            const [showAddModal, setShowAddModal] = useState(false);
            const [newName, setNewName] = useState('');
            const [newRole, setNewRole] = useState('child');
            const [newGender, setNewGender] = useState('female');
            const [copied, setCopied] = useState(false);

            const [contentPref, setContentPref] = useState(member?.contentPref || 'inspiration');
            const [voiceGender, setVoiceGender] = useState(member?.voiceSettings?.gender || 'female');
            const [voiceSpeed, setVoiceSpeed] = useState(member?.voiceSettings?.rate || 1);
            const [voicePitch, setVoicePitch] = useState(member?.voiceSettings?.pitch || 1);

            const updatePref = async (field, value) => {
                const newData = { ...member, [field]: value };
                onUpdate(newData); 
                await db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.MEMBERS).doc(member.id).set(newData, { merge: true });
            };

            const updateContentPref = async (newPref) => {
                setContentPref(newPref);
                const newData = { ...member, contentPref: newPref };
                onUpdate(newData);
                await db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.MEMBERS).doc(member.id).set(newData, { merge: true });
            };

            const updateVoiceGender = async (newGender) => {
                setVoiceGender(newGender);
                const newVoice = { ...member.voiceSettings, gender: newGender };
                const newData = { ...member, voiceSettings: newVoice };
                onUpdate(newData);
                await db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.MEMBERS).doc(member.id).set(newData, { merge: true });
            };

            const updateVoiceSliders = async () => {
                const newVoice = { gender: voiceGender, rate: voiceSpeed, pitch: voicePitch };
                const newData = { ...member, voiceSettings: newVoice };
                onUpdate(newData);
                await db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.MEMBERS).doc(member.id).set(newData, { merge: true });
                speakText("Voice settings updated.", newVoice);
            };

            const handleAddMember = () => {
                if (!newName) return;
                let avatar = '👤';
                if (newRole === 'parent') avatar = newGender === 'male' ? '👨' : '👩';
                else avatar = newGender === 'male' ? '👦' : '👧';
                
                onCreate(newName, newRole, newGender, 'ocean', avatar); 
                setShowAddModal(false);
                setNewName('');
            };
            
            const copyCode = () => {
                const appLink = NETLIFY_URL; 
                const smartLink = `${appLink}?familyId=${familyId}`;
                const shareMessage = `Join our Family Hub Calendar!
App Link (Click to Join): ${smartLink}
Family Code (Manual Fallback): ${familyId}`;
                
                const setCopiedState = () => { setCopied(true); setTimeout(() => setCopied(false), 3000); };
                navigator.clipboard.writeText(shareMessage).then(setCopiedState).catch(() => {
                    const textarea = document.createElement('textarea');
                    textarea.value = shareMessage;
                    document.body.appendChild(textarea);
                    document.body.removeChild(textarea);
                    setCopiedState();
                });
            };

            const AddMemberModal = e('div', { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" },
                e('div', { className: "w-full max-w-sm bg-white p-6 rounded-[2rem] shadow-2xl border" },
                    e('div', { className: "flex justify-between items-center mb-6" },
                        e('h3', { className: "text-xl font-bold text-black" }, "New Member"),
                        e('button', { onClick: () => setShowAddModal(false), className: "bg-gray-100 p-2 rounded-full hover:bg-gray-200" }, e(lucide.X, { size: 18, className: "text-gray-500" }))
                    ),
                    e('div', { className: "space-y-4" },
                        e('div', null,
                            e('label', { className: "text-xs font-bold text-gray-400 mb-1 block" }, "NAME"),
                            e('input', { className: "w-full p-4 rounded-xl bg-gray-50 border border-gray-200 text-black focus:border-indigo-500 outline-none", placeholder: "e.g. Liam", value: newName, onChange: evt => setNewName(evt.target.value) })
                        ),
                        e('div', { className: "flex gap-4" },
                            e('div', { className: "flex-1" },
                                e('label', { className: "text-xs font-bold text-slate-500 mb-1 block" }, "ROLE"),
                                e('div', { className: "flex bg-gray-100 p-1 rounded-xl" },
                                    e('button', { onClick: () => setNewRole('parent'), className: `flex-1 p-3 rounded-lg font-bold text-xs transition ${newRole === 'parent' ? 'bg-indigo-600 text-white' : 'text-gray-400'}` }, "Parent"),
                                    e('button', { onClick: () => setNewRole('child'), className: `flex-1 p-3 rounded-lg font-bold text-xs transition ${newRole === 'child' ? 'bg-indigo-600 text-white' : 'text-gray-400'}` }, "Child")
                                )
                            ),
                            e('div', { className: "flex-1" },
                                e('label', { className: "text-xs font-bold text-slate-500 mb-1 block" }, "GENDER"),
                                e('div', { className: "flex bg-gray-100 p-1 rounded-xl" },
                                    e('button', { onClick: () => setNewGender('male'), className: `flex-1 p-3 rounded-lg font-bold text-xs transition ${newGender === 'male' ? 'bg-blue-600 text-white' : 'bg-slate-700'}` }, "Boy"),
                                    e('button', { onClick: () => setNewGender('female'), className: `flex-1 p-3 rounded-lg font-bold text-xs transition ${newGender === 'female' ? 'bg-pink-600 text-white' : 'bg-slate-700'}` }, "Girl")
                                )
                            )
                        ),
                        e('button', { onClick: handleAddMember, className: "w-full bg-indigo-600 text-white font-bold py-4 rounded-xl mt-4 hover:scale-[1.02] transition shadow-lg shadow-indigo-200" }, "Create Profile")
                    )
                )
            );

            return e('div', { className: "space-y-6 pb-20" },
                e('h2', { className: "text-2xl font-bold px-2" }, "Settings"),
                
                e('section', { className: `${theme.card} p-6 rounded-[2rem] border overflow-hidden` },
                    e('h3', { className: "font-bold mb-4 flex items-center gap-2" }, e(lucide.Share2, { size: 18, className: "text-green-500" }), " Share Family"),
                    e('p', { className: "text-xs opacity-60 mb-3" }, "Tap to share the automatic join link and code with a family member."),
                    e('button', { onClick: copyCode, className: "w-full bg-black/5 p-4 rounded-xl flex items-center justify-between group hover:bg-black/10 transition active:scale-95" },
                        e('div', { className: "flex flex-col items-start overflow-hidden" },
                            e('span', { className: "text-[10px] uppercase font-bold text-gray-400" }, "Family ID"),
                            e('code', { className: "font-mono font-bold text-xl tracking-widest text-gray-800" }, familyId)
                        ),
                        copied ? e('div', { className: "flex items-center gap-1 text-green-600 font-bold text-xs" }, e(lucide.Check, { size: 18 }), " Copied!") : e(lucide.Copy, { size: 18, className: "opacity-40 group-hover:opacity-100" })
                    )
                ),

                e('section', { className: `${theme.card} p-6 rounded-[2rem] border` },
                    e('h3', { className: "font-bold mb-4 flex items-center gap-2" }, e(lucide.Sliders, { size: 18, className: "text-blue-500" }), " My Preferences"),
                    e('div', { className: "space-y-4" },
                        e('div', null,
                            e('label', { className: "text-xs font-bold opacity-50 mb-2 block" }, "DAILY CONTENT"),
                            e('div', { className: "flex bg-black/5 p-1 rounded-xl" },
                                e('button', { onClick: () => updateContentPref('inspiration'), className: `flex-1 py-2 rounded-lg text-xs font-bold transition ${contentPref === 'inspiration' ? 'bg-white shadow text-black' : 'opacity-50'}` }, "Quotes"),
                                e('button', { onClick: () => updateContentPref('bible'), className: `flex-1 py-2 rounded-lg text-xs font-bold transition ${contentPref === 'bible' ? 'bg-white shadow text-black' : 'opacity-50'}` }, "Bible Verses")
                            )
                        ),
                        e('div', null,
                            e('label', { className: "text-xs font-bold opacity-50 mb-2 block flex justify-between" }, "VOICE ASSISTANT ", e(lucide.Speaker, { size: 12 })),
                            e('div', { className: "flex bg-black/5 p-1 rounded-xl mb-2" },
                                e('button', { onClick: () => updateVoiceGender('female'), className: `flex-1 p-3 rounded-lg font-bold text-xs transition ${voiceGender === 'female' ? 'bg-white shadow text-pink-600' : 'opacity-50'}` }, "Female"),
                                e('button', { onClick: () => updateVoiceGender('male'), className: `flex-1 p-3 rounded-lg font-bold text-xs transition ${voiceGender === 'male' ? 'bg-white shadow text-blue-600' : 'opacity-50'}` }, "Male")
                            ),
                            e('div', { className: "flex gap-2" },
                                e('div', { className: "flex-1" },
                                    e('label', { className: "text-[10px] font-bold opacity-40" }, "Speed"),
                                    e('input', { type: "range", min: "0.5", max: "2", step: "0.1", value: voiceSpeed, onChange: evt => setVoiceSpeed(parseFloat(evt.target.value)), className: "w-full accent-indigo-600" })
                                ),
                                e('div', { className: "flex-1" },
                                    e('label', { className: "text-[10px] font-bold opacity-40" }, "Pitch"),
                                    e('input', { type: "range", min: "0.5", max: "2", step: "0.1", value: voicePitch, onChange: evt => setVoicePitch(parseFloat(evt.target.value)), className: "w-full accent-indigo-600" })
                                )
                            ),
                            e('button', { onClick: updateVoiceSliders, className: "w-full py-2 bg-black/5 rounded-lg text-[10px] font-bold hover:bg-black/10 transition mt-2" }, "Test & Save Voice Settings")
                        )
                    )
                ),

                e('section', { className: `${theme.card} p-6 rounded-[2rem] border` },
                    e('div', { className: "flex justify-between items-center mb-4" },
                        e('h3', { className: "font-bold flex items-center gap-2" }, e(lucide.Users, { size: 18, className: "text-indigo-500" }), " Family Members"),
                        e('span', { className: "text-xs font-bold opacity-50 bg-black/5 px-2 py-1 rounded-full" }, members.length, " / 6")
                    ),
                    e('div', { className: "flex flex-wrap gap-4" },
                        members.map(m => e('div', { key: m.id, className: "flex flex-col items-center gap-2" },
                            e('div', { className: "w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl border border-black/10 shadow-sm" }, m.avatar),
                            e('span', { className: `text-[10px] font-bold opacity-70 truncate max-w-[60px] ${theme.subtext}` }, m.name)
                        )),
                        members.length < 6 && e('button', { onClick: () => setShowAddModal(true), className: "flex flex-col items-center justify-center gap-2 opacity-60 hover:opacity-100 transition group" },
                            e('div', { className: "w-14 h-14 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-400 group-hover:border-indigo-500 group-hover:text-indigo-500" }, e(lucide.UserPlus, { size: 24 })),
                            e('span', { className: "text-[10px] font-bold" }, "Add New")
                        )
                    )
                ),

                e('section', { className: `${theme.card} p-6 rounded-[2rem] border` },
                    e('h3', { className: "font-bold mb-4 flex items-center gap-2" }, e(lucide.Palette, { size: 18, className: "text-pink-500" }), " Theme"),
                    e('div', { className: "grid grid-cols-4 gap-2" },
                        Object.entries(THEMES).map(([k, t]) => e('button', { key: k, onClick: () => updatePref('theme', k), className: `h-12 rounded-xl ${t.bg} border-2 relative overflow-hidden transition-all duration-300 ${member.theme === k ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-2 scale-105 shadow-md' : 'border-black/5 hover:border-black/20'}` },
                            e('div', { className: `absolute bottom-0 right-0 w-6 h-6 ${t.accent} opacity-20 rounded-tl-xl` })
                        ))
                    )
                ),
                showAddModal && AddMemberModal
            );
        };
        
        // Render the main App component
        ReactDOM.render(e(App, null), document.getElementById('root'));

    </script>
</body>
</html>
