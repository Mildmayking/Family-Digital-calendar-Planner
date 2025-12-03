import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, PenTool, Calendar as CalendarIcon, Settings, Home, 
  Volume2, VolumeX, LogOut, Check, Heart, BookOpen,
  Users, UserPlus, ListChecks, Loader, Trash2, PlayCircle, Clock, Bell, User
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, signInAnonymously 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, where, 
  onSnapshot, deleteDoc, doc, setDoc, updateDoc, getDoc, orderBy, getDocs 
} from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyChMD-MrvSSiAP_WmhR7PvRC6W7DK45tiA",
  authDomain: "notebook-planner-ce07a.firebaseapp.com",
  projectId: "notebook-planner-ce07a",
  storageBucket: "notebook-planner-ce07a.firebasestorage.app",
  messagingSenderId: "214315138804",
  appId: "1:214315138804:web:84d3dba638af75acf0e8a1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "notebook-2026-family-v2"; 

// --- CONTENT DATABASES ---
const BIBLE_VERSES = [
  "For I know the plans I have for you, declares the Lord, plans to prosper you. - Jeremiah 29:11",
  "I can do all things through Christ who strengthens me. - Philippians 4:13",
  "Trust in the Lord with all your heart. - Proverbs 3:5",
  "Be strong and courageous. Do not be afraid. - Joshua 1:9",
  "The Lord is my shepherd, I lack nothing. - Psalm 23:1",
  "Love is patient, love is kind. - 1 Corinthians 13:4",
  "This is the day that the Lord has made; let us rejoice and be glad in it. - Psalm 118:24"
];

const INSPIRATION_QUOTES = [
  "Your time is limited, so don't waste it living someone else's life.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Believe you can and you're halfway there.",
  "Act as if what you do makes a difference. It does.",
  "Keep your face always toward the sunshine and shadows will fall behind you.",
  "What you get by achieving your goals is not as important as what you become.",
  "Happiness is not something ready made. It comes from your own actions."
];

const generateDailyContent = (date, type) => {
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const pool = type === 'bible' ? BIBLE_VERSES : INSPIRATION_QUOTES;
  return pool[dayOfYear % pool.length];
};

// --- HELPER: TTS ---
const speakText = (text, voiceSettings) => {
  if (!text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const gender = voiceSettings?.gender || 'female';
  
  let preferred = voices.find(v => 
    v.lang.includes('en') && v.name.toLowerCase().includes(gender === 'male' ? 'male' : 'female')
  );
  if (!preferred) preferred = voices.find(v => v.lang.includes('en'));

  u.voice = preferred || voices[0];
  u.rate = voiceSettings?.rate || 1;
  u.pitch = voiceSettings?.pitch || 1;
  window.speechSynthesis.speak(u);
};

// --- THEMES ---
const THEMES = {
  midnight: { name: 'Midnight', bg: 'bg-slate-950', text: 'text-slate-100', accent: 'bg-indigo-600', card: 'bg-slate-900 border-slate-700' },
  ocean: { name: 'Ocean', bg: 'bg-blue-50', text: 'text-slate-900', accent: 'bg-cyan-700', card: 'bg-white shadow-xl border-blue-100' },
  forest: { name: 'Forest', bg: 'bg-emerald-50', text: 'text-emerald-950', accent: 'bg-emerald-700', card: 'bg-white shadow-xl border-emerald-100' },
  sunset: { name: 'Sunset', bg: 'bg-orange-50', text: 'text-stone-900', accent: 'bg-orange-600', card: 'bg-white shadow-xl border-orange-100' },
  lavender: { name: 'Lavender', bg: 'bg-purple-50', text: 'text-purple-950', accent: 'bg-purple-700', card: 'bg-white shadow-xl border-purple-100' },
  rose: { name: 'Rose', bg: 'bg-rose-50', text: 'text-rose-950', accent: 'bg-rose-600', card: 'bg-white shadow-xl border-rose-100' },
  coffee: { name: 'Coffee', bg: 'bg-stone-100', text: 'text-stone-800', accent: 'bg-stone-600', card: 'bg-[#e8e4dc]' },
  minimal: { name: 'Luxe', bg: 'bg-neutral-100', text: 'text-black', accent: 'bg-black', card: 'bg-white shadow-sm border-gray-200' }
};

// --- COMPONENTS ---

const DrawingCanvas = ({ color, strokeWidth, onSave }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const contextRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    contextRef.current = ctx;
  }, []);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = strokeWidth;
    }
  }, [color, strokeWidth]);

  const start = (e) => { 
      e.preventDefault(); 
      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      contextRef.current.beginPath(); 
      contextRef.current.moveTo(clientX - rect.left, clientY - rect.top); 
      setIsDrawing(true); 
  };
  
  const move = (e) => { 
      e.preventDefault(); 
      if(!isDrawing) return; 
      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      contextRef.current.lineTo(clientX - rect.left, clientY - rect.top); 
      contextRef.current.stroke(); 
  };
  
  const stop = () => { contextRef.current.closePath(); setIsDrawing(false); if(onSave) onSave(canvasRef.current.toDataURL()); };
  const clear = () => contextRef.current.clearRect(0,0,canvasRef.current.width, canvasRef.current.height);

  return (
    <div className="relative w-full h-80 bg-white rounded-2xl shadow-inner border border-gray-200 overflow-hidden touch-none">
       <canvas ref={canvasRef} className="w-full h-full cursor-crosshair"
        onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={move} onTouchEnd={stop} />
      <button onClick={clear} className="absolute top-3 right-3 p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition shadow-sm"><Trash2 size={16} /></button>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentMember, setCurrentMember] = useState(null); // The active profile
  const [loading, setLoading] = useState(true);
  
  // App View State
  const [view, setView] = useState('profiles'); // profiles, home, notes, planner, settings
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioRef = useRef(null);

  // Auth Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = 0.15; }, []);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setFamilyId(currentUser.uid); // Family ID = Admin User ID
        
        // Check License & Load Members
        const userRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'settings', 'account');
        const snap = await getDoc(userRef);
        
        if (snap.exists() && snap.data().licenseValid) {
            // Load Family Members
            const memRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'members');
            const memSnap = await getDocs(memRef);
            const memList = memSnap.docs.map(d => ({id: d.id, ...d.data()}));
            setMembers(memList);
            setView('profiles');
        } else {
            setView('license'); // Needs License
        }
      } else {
        setUser(null);
        setView('auth');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Alarm System (Global) - Checks every 30 seconds
  useEffect(() => {
    if (!currentMember || !familyId) return;
    
    const interval = setInterval(async () => {
        const now = new Date();
        // Format current time as HH:MM
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
        
        // Find events for TODAY
        const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(); endOfDay.setHours(23,59,59,999);
        
        const q = query(
            collection(db, 'artifacts', appId, 'users', familyId, 'events'),
            where('startTime', '>=', startOfDay.getTime()),
            where('startTime', '<=', endOfDay.getTime())
        );
        
        const snap = await getDocs(q);
        snap.forEach(async (docSnap) => {
            const event = docSnap.data();
            const eventDate = new Date(event.startTime);
            const eventTimeStr = eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
            
            // If time matches and not already alerted
            if (eventTimeStr === timeString && !event.alerted) {
                // Determine if this alarm is for the current user
                if (event.memberId === 'all' || event.memberId === currentMember.id) {
                    const msg = `Attention ${currentMember.name}. You have ${event.title} starting now.`;
                    speakText(msg, currentMember.voiceSettings);
                    
                    // Mark as alerted in DB to prevent repeat
                    await updateDoc(doc(db, 'artifacts', appId, 'users', familyId, 'events', docSnap.id), { alerted: true });
                }
            }
        });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [currentMember, familyId]);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlayingMusic) audioRef.current.pause();
      else audioRef.current.play().catch(console.error);
      setIsPlayingMusic(!isPlayingMusic);
    }
  };

  // --- ACTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Create Admin Profile (Dad/Parent)
        const adminMember = {
            name: 'Dad', role: 'parent', theme: 'midnight', contentPref: 'inspiration',
            voiceSettings: { gender: 'male', rate: 1, pitch: 1 },
            avatar: '👨'
        };
        await setDoc(doc(db, 'artifacts', appId, 'users', cred.user.uid, 'settings', 'account'), {
          email, licenseValid: false, createdAt: new Date()
        });
        // Add initial member
        await addDoc(collection(db, 'artifacts', appId, 'users', cred.user.uid, 'members'), adminMember);
      }
    } catch (err) { 
        if (err.code === 'auth/operation-not-allowed') {
            try {
               const anon = await signInAnonymously(auth);
               // Create Admin Profile (Dad/Parent) for Guest
                const adminMember = {
                    name: 'Dad', role: 'parent', theme: 'midnight', contentPref: 'inspiration',
                    voiceSettings: { gender: 'male', rate: 1, pitch: 1 },
                    avatar: '👨'
                };
                await setDoc(doc(db, 'artifacts', appId, 'users', anon.user.uid, 'settings', 'account'), {
                  email: 'guest@demo.com', licenseValid: false, createdAt: new Date()
                });
                await addDoc(collection(db, 'artifacts', appId, 'users', anon.user.uid, 'members'), adminMember);
            } catch (e) { setAuthError("Login failed."); }
        } else {
            setAuthError(err.message.replace('Firebase: ', '')); 
        }
    }
  };

  const redeemLicense = async () => {
    if (licenseKey === 'PRO-2026-DEMO') {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'account'), { licenseValid: true });
      window.location.reload(); 
    } else {
      setAuthError('Invalid Key. Try PRO-2026-DEMO');
    }
  };

  const createMember = async (name, role, theme, avatar) => {
      if (members.length >= 8) return alert("Family limit reached (Max 8)");
      const newMem = {
          name, role, theme, avatar,
          contentPref: 'inspiration',
          voiceSettings: { gender: role === 'parent' ? 'female' : 'female', rate: 1, pitch: 1 }
      };
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'members'), newMem);
      
      const memRef = collection(db, 'artifacts', appId, 'users', user.uid, 'members');
      const memSnap = await getDocs(memRef);
      setMembers(memSnap.docs.map(d => ({id: d.id, ...d.data()})));
  };

  const selectProfile = (member) => {
      setCurrentMember(member);
      setView('home');
  };

  // --- RENDER ---
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader className="animate-spin"/></div>;

  if (!user || view === 'auth') return <AuthScreen email={email} setEmail={setEmail} password={password} setPassword={setPassword} isLogin={isLogin} setIsLogin={setIsLogin} handleAuth={handleAuth} error={authError} />;
  
  if (view === 'license') return <LicenseScreen licenseKey={licenseKey} setLicenseKey={setLicenseKey} redeemLicense={redeemLicense} error={authError} signOut={()=>signOut(auth)}/>;

  if (view === 'profiles' || !currentMember) return <ProfileSelector members={members} onSelect={selectProfile} onCreate={createMember} signOut={()=>signOut(auth)} />;

  const theme = THEMES[currentMember.theme || 'ocean'];
  const fontClass = currentMember.role === 'child' ? { fontFamily: '"Comic Neue", cursive' } : { fontFamily: '"Inter", sans-serif' };

  return (
    <div className={`min-h-screen transition-all duration-700 ${theme.bg} ${theme.text}`} style={fontClass}>
      <audio ref={audioRef} loop src="[https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112762.mp3](https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112762.mp3)" />

      {/* Header */}
      <header className={`px-6 py-4 sticky top-0 z-20 flex justify-between items-center backdrop-blur-md bg-opacity-95 border-b border-gray-100/10`}>
        <div className="flex items-center gap-2" onClick={() => setView('profiles')}>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-lg shadow-sm border border-white/30 cursor-pointer">
                {currentMember.avatar || '👤'}
            </div>
            <div>
                <h1 className="text-sm font-bold leading-none">{currentMember.name}'s Planner</h1>
                <p className="text-[10px] opacity-70">Tap to switch profile</p>
            </div>
        </div>
        <button onClick={toggleMusic} className={`p-2.5 rounded-full backdrop-blur-md bg-white/20 hover:bg-white/30 transition shadow-sm border border-white/20`}>
            {isPlayingMusic ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-28 max-w-lg mx-auto w-full">
        {view === 'home' && <Dashboard member={currentMember} theme={theme} />}
        {view === 'notes' && <NotesManager member={currentMember} familyId={familyId} db={db} appId={appId} theme={theme} />}
        {view === 'planner' && <FamilyCalendar member={currentMember} members={members} familyId={familyId} db={db} appId={appId} theme={theme} />}
        {view === 'settings' && <SettingsScreen member={currentMember} familyId={familyId} db={db} appId={appId} theme={theme} onUpdate={setCurrentMember} />}
      </main>

      {/* Navigation */}
      <nav className={`fixed bottom-6 left-4 right-4 max-w-lg mx-auto ${theme.card} border rounded-2xl px-2 py-2 flex justify-around items-center shadow-2xl shadow-black/5 z-30`}>
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'notes', icon: PenTool, label: 'Notes' },
          { id: 'planner', icon: CalendarIcon, label: 'Calendar' },
          { id: 'settings', icon: Settings, label: 'Settings' }
        ].map(item => (
          <button key={item.id} onClick={() => setView(item.id)} className={`relative px-6 py-3 rounded-xl transition-all duration-300 ${view === item.id ? `${theme.accent} text-white shadow-lg scale-105` : 'opacity-60 hover:opacity-100 hover:bg-gray-50/10'}`}>
            <item.icon size={22} strokeWidth={2.5} />
            {view === item.id && <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 animate-fade-in">{item.label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}

// --- SUB-SCREENS ---

const AuthScreen = ({email, setEmail, password, setPassword, isLogin, setIsLogin, handleAuth, error}) => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-800 flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20">
            <h1 className="text-3xl font-bold text-center mb-2">Family Hub 2026</h1>
            <p className="text-center opacity-70 mb-8">One planner for everyone.</p>
            {error && <div className="bg-red-500/20 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
            <form onSubmit={handleAuth} className="space-y-4">
                <input type="email" placeholder="Family Email" required className="w-full p-4 bg-black/20 rounded-xl border border-white/10 focus:border-white/50 outline-none text-white placeholder-white/30" value={email} onChange={e=>setEmail(e.target.value)}/>
                <input type="password" placeholder="Password" required className="w-full p-4 bg-black/20 rounded-xl border border-white/10 focus:border-white/50 outline-none text-white placeholder-white/30" value={password} onChange={e=>setPassword(e.target.value)}/>
                <button type="submit" className="w-full bg-white text-indigo-900 py-4 rounded-xl font-bold hover:bg-opacity-90 transition">{isLogin ? 'Enter Hub' : 'Create Family Account'}</button>
            </form>
            <button onClick={()=>setIsLogin(!isLogin)} className="w-full mt-4 text-sm opacity-50 hover:opacity-100">{isLogin ? "New Family? Start here" : "Have an account? Log in"}</button>
        </div>
    </div>
);

const LicenseScreen = ({licenseKey, setLicenseKey, redeemLicense, error, signOut}) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold text-center mb-6">Activate Family Plan</h2>
            {error && <div className="text-red-500 text-sm text-center mb-4">{error}</div>}
            <input type="text" placeholder="License Key (e.g. PRO-2026-DEMO)" className="w-full p-4 bg-gray-100 rounded-xl mb-4 text-center tracking-widest uppercase font-bold" value={licenseKey} onChange={e=>setLicenseKey(e.target.value)}/>
            <button onClick={redeemLicense} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">Activate</button>
            <button onClick={signOut} className="w-full mt-4 text-gray-400">Sign Out</button>
        </div>
    </div>
);

const ProfileSelector = ({ members, onSelect, onCreate, signOut }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('child');
    const [newTheme, setNewTheme] = useState('ocean');

    const handleCreate = () => {
        if(!newName) return;
        const avatar = newRole === 'parent' ? (Math.random() > 0.5 ? '👨' : '👩') : (Math.random() > 0.5 ? '👦' : '👧');
        onCreate(newName, newRole, newTheme, avatar);
        setIsAdding(false);
        setNewName('');
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
            <h1 className="text-3xl font-bold mb-10">Who is using the planner?</h1>
            
            <div className="grid grid-cols-2 gap-6 w-full max-w-md">
                {members.map(m => (
                    <button key={m.id} onClick={()=>onSelect(m)} className="flex flex-col items-center gap-3 group">
                        <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${m.theme === 'midnight' ? 'from-slate-700 to-slate-900' : m.theme === 'ocean' ? 'from-cyan-400 to-blue-500' : 'from-pink-400 to-rose-500'} flex items-center justify-center text-4xl shadow-lg group-hover:scale-105 transition border-2 border-transparent group-hover:border-white`}>
                            {m.avatar}
                        </div>
                        <span className="font-bold text-lg">{m.name}</span>
                    </button>
                ))}
                
                {members.length < 8 && (
                    <button onClick={()=>setIsAdding(true)} className="flex flex-col items-center gap-3 group opacity-70 hover:opacity-100">
                        <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center text-3xl group-hover:border-white transition">
                            <UserPlus />
                        </div>
                        <span className="font-medium">Add Member</span>
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
                    <div className="bg-slate-800 p-6 rounded-3xl w-full max-w-sm border border-slate-700">
                        <h3 className="text-xl font-bold mb-4">New Family Member</h3>
                        <div className="space-y-4">
                            <input className="w-full p-3 rounded-xl bg-black/30 border border-slate-600 text-white" placeholder="Name" value={newName} onChange={e=>setNewName(e.target.value)}/>
                            <div className="flex gap-2">
                                <button onClick={()=>setNewRole('parent')} className={`flex-1 p-2 rounded-lg ${newRole==='parent'?'bg-indigo-600':'bg-slate-700'}`}>Parent</button>
                                <button onClick={()=>setNewRole('child')} className={`flex-1 p-2 rounded-lg ${newRole==='child'?'bg-indigo-600':'bg-slate-700'}`}>Child</button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {Object.keys(THEMES).map(t => (
                                    <button key={t} onClick={()=>setNewTheme(t)} className={`h-8 rounded-full bg-${t==='midnight'?'slate-900':t==='ocean'?'blue-400':t==='forest'?'green-500':'purple-500'} border-2 ${newTheme===t?'border-white':'border-transparent'}`}/>
                                ))}
                            </div>
                            <button onClick={handleCreate} className="w-full bg-white text-slate-900 font-bold py-3 rounded-xl mt-4">Create Profile</button>
                            <button onClick={()=>setIsAdding(false)} className="w-full text-gray-400 py-2">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            
            <button onClick={signOut} className="fixed bottom-8 text-sm opacity-50 hover:opacity-100">Log Out of Family</button>
        </div>
    );
};

// --- FEATURE VIEWS ---

const Dashboard = ({ member, theme }) => {
    const today = new Date();
    const content = generateDailyContent(today, member.contentPref || 'inspiration');
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className={`p-8 rounded-[2rem] ${theme.accent} text-white shadow-xl relative overflow-hidden`}>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="opacity-80 text-xs font-bold uppercase mb-1">{dateStr}</p>
                            <h2 className="text-3xl font-bold mb-4">Hi, {member.name}!</h2>
                        </div>
                        <div className="text-4xl opacity-20">{member.avatar}</div>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20">
                        <div className="flex justify-between items-start gap-4 mb-2">
                            <span className="text-xs uppercase tracking-wider opacity-70 flex items-center gap-1">
                                {member.contentPref === 'bible' ? <><BookOpen size={12}/> Daily Verse</> : <><Heart size={12}/> Daily Inspiration</>}
                            </span>
                            <button onClick={() => speakText(content, member.voiceSettings)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition"><Volume2 size={16} /></button>
                        </div>
                        <p className={`text-lg leading-relaxed ${member.role==='child' ? 'font-comic' : 'font-serif italic'}`}>"{content}"</p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className={`${theme.card} p-5 rounded-2xl border flex flex-col items-center justify-center gap-2 h-32`}>
                    <Users size={32} className="text-gray-400"/>
                    <span className="font-bold text-gray-600">Family Status</span>
                </div>
                <div className={`${theme.card} p-5 rounded-2xl border flex flex-col items-center justify-center gap-2 h-32`}>
                    <ListChecks size={32} className="text-gray-400"/>
                    <span className="font-bold text-gray-600">My Tasks</span>
                </div>
            </div>
        </div>
    );
};

const FamilyCalendar = ({ member, members, familyId, db, appId, theme }) => {
    const [events, setEvents] = useState([]);
    const [newEvent, setNewEvent] = useState('');
    const [selectedAssignee, setSelectedAssignee] = useState(member.id); // Default to self
    const [eventTime, setEventTime] = useState('12:00');

    // Load Events
    useEffect(() => {
        if (!familyId) return;
        const q = query(collection(db, 'artifacts', appId, 'users', familyId, 'events'), orderBy('startTime'));
        const unsub = onSnapshot(q, snap => {
            setEvents(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });
        return () => unsub();
    }, [familyId]);

    const addEvent = async () => {
        if (!newEvent) return;
        
        // Parse time to timestamp for today
        const [hours, mins] = eventTime.split(':');
        const eventDate = new Date();
        eventDate.setHours(parseInt(hours), parseInt(mins), 0, 0);

        const assignedMember = members.find(m => m.id === selectedAssignee);

        await addDoc(collection(db, 'artifacts', appId, 'users', familyId, 'events'), {
            title: newEvent,
            startTime: eventDate.getTime(),
            memberId: selectedAssignee,
            memberName: assignedMember ? assignedMember.name : 'Everyone',
            alerted: false,
            createdAt: Date.now()
        });
        setNewEvent('');
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Family Calendar</h2>
            
            {/* Add Event Box */}
            <div className={`${theme.card} p-4 rounded-2xl border space-y-3`}>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button 
                        onClick={()=>setSelectedAssignee('all')}
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${selectedAssignee==='all' ? theme.accent + ' text-white border-transparent' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
                    >
                        👨‍👩‍👧‍👦 Everyone
                    </button>
                    {members.map(m => (
                        <button 
                            key={m.id} 
                            onClick={()=>setSelectedAssignee(m.id)}
                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border flex items-center gap-1 ${selectedAssignee===m.id ? theme.accent + ' text-white border-transparent' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
                        >
                            {m.avatar} {m.name}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input type="time" value={eventTime} onChange={e=>setEventTime(e.target.value)} className="bg-gray-50 border rounded-xl px-2 text-sm"/>
                    <input placeholder="Activity (e.g. Math Class)" className="flex-1 bg-gray-50 border rounded-xl px-3 text-sm" value={newEvent} onChange={e=>setNewEvent(e.target.value)}/>
                    <button onClick={addEvent} className={`${theme.accent} text-white p-2 rounded-xl`}><Check size={20}/></button>
                </div>
            </div>

            {/* Event List */}
            <div className="space-y-3">
                {events.map(ev => {
                    const isForMe = ev.memberId === member.id || ev.memberId === 'all';
                    // Find member color style
                    const owner = members.find(m => m.id === ev.memberId);
                    const ownerTheme = owner ? THEMES[owner.theme] : THEMES['minimal'];
                    
                    return (
                        <div key={ev.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition ${isForMe ? 'bg-white shadow-md' : 'bg-gray-50 opacity-70 grayscale'}`}>
                            <div className="flex flex-col items-center min-w-[50px]">
                                <span className="text-xs font-bold text-gray-400">{new Date(ev.startTime).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${ev.memberId==='all' ? 'bg-gray-800' : (ownerTheme?.accent || 'bg-gray-400')}`}>
                                        {ev.memberName}
                                    </span>
                                </div>
                                <p className="font-bold text-gray-800">{ev.title}</p>
                            </div>
                            <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'users',familyId,'events',ev.id))} className="text-gray-300 hover:text-red-400"><Trash2 size={16}/></button>
                        </div>
                    );
                })}
                {events.length === 0 && <div className="text-center p-10 text-gray-400">No events today.</div>}
            </div>
        </div>
    );
};

// Re-using NotesManager with small tweak to receive familyId
const NotesManager = ({ member, familyId, db, appId, theme }) => {
  // ... (Same logic as before, but saving to family sub-collection)
  const [notes, setNotes] = useState([]);
  const [isEditor, setIsEditor] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognition = useRef(null);

  useEffect(() => {
    if(!familyId) return;
    // Query notes where 'authorId' == member.id
    const q = query(collection(db, 'artifacts', appId, 'users', familyId, 'notes'), where('authorId', '==', member.id));
    const unsub = onSnapshot(q, snap => setNotes(snap.docs.map(d=>({id:d.id, ...d.data()}))));
    return () => unsub();
  }, [familyId, member.id]);

  useEffect(() => {
    if (window.webkitSpeechRecognition || window.SpeechRecognition) {
      const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognition.current = new SR();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.onresult = e => {
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) if(e.results[i].isFinal) final += e.results[i][0].transcript;
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
      await addDoc(collection(db, 'artifacts', appId, 'users', familyId, 'notes'), {
          title: title || 'Untitled', content, authorId: member.id, createdAt: Date.now()
      });
      setIsEditor(false); setTitle(''); setContent('');
  };

  if (isEditor) return (
      <div className={`h-[80vh] flex flex-col ${theme.card} rounded-[2rem] shadow-2xl border border-white/20 overflow-hidden relative`}>
          <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-white/50 backdrop-blur-sm">
              <button onClick={()=>setIsEditor(false)} className="text-gray-500">Cancel</button>
              <button onClick={save} className={`${theme.accent} text-white px-4 py-2 rounded-xl font-bold`}>Save</button>
          </div>
          <div className="p-6 flex-1 relative">
              <input className="text-2xl font-bold bg-transparent outline-none w-full mb-4" placeholder="Title..." value={title} onChange={e=>setTitle(e.target.value)}/>
              <textarea className="w-full h-full bg-transparent outline-none resize-none" placeholder="Type or speak..." value={content} onChange={e=>setContent(e.target.value)}/>
              <button onClick={toggleMic} className={`absolute bottom-6 right-6 p-4 rounded-full shadow-xl transition ${isListening ? 'bg-red-500 animate-pulse' : theme.accent} text-white`}>
                  {isListening ? <MicOff/> : <Mic/>}
              </button>
          </div>
      </div>
  );

  return (
      <div className="space-y-4">
          <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Notes</h2>
              <button onClick={()=>setIsEditor(true)} className={`${theme.accent} text-white p-3 rounded-xl`}><PenTool size={20}/></button>
          </div>
          <div className="grid gap-3">
              {notes.map(n => (
                  <div key={n.id} className={`${theme.card} p-4 rounded-xl border`}>
                      <div className="flex justify-between items-start">
                          <h3 className="font-bold">{n.title}</h3>
                          <div className="flex gap-2">
                              <button onClick={()=>speakText(n.content, member.voiceSettings)} className="text-gray-400 hover:text-blue-500"><PlayCircle size={18}/></button>
                              <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'users',familyId,'notes',n.id))} className="text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                          </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{n.content}</p>
                  </div>
              ))}
          </div>
      </div>
  );
};

const SettingsScreen = ({ member, familyId, db, appId, theme, onUpdate }) => {
    const updatePref = async (field, value) => {
        const newData = { ...member, [field]: value };
        onUpdate(newData); // Optimistic UI
        // In real app, we update the specific member document in the 'members' subcollection
        // For this demo we just update local state mostly, but here is the DB call:
        await setDoc(doc(db, 'artifacts', appId, 'users', familyId, 'members', member.id), newData, { merge: true });
    };

    return (
        <div className="space-y-6 pb-20">
            <h2 className="text-2xl font-bold">Settings</h2>
            
            {/* Daily Content Pref */}
            <section className={`${theme.card} p-6 rounded-[2rem] border`}>
                <h3 className="font-bold mb-4 flex items-center gap-2"><BookOpen size={18}/> Daily Content</h3>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={()=>updatePref('contentPref', 'inspiration')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${member.contentPref!=='bible' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Quotes</button>
                    <button onClick={()=>updatePref('contentPref', 'bible')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${member.contentPref==='bible' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Bible Verses</button>
                </div>
            </section>

            {/* Theme */}
            <section className={`${theme.card} p-6 rounded-[2rem] border`}>
                <h3 className="font-bold mb-4 flex items-center gap-2"><Palette size={18}/> My Theme</h3>
                <div className="grid grid-cols-4 gap-2">
                    {Object.entries(THEMES).map(([k, t]) => (
                        <button key={k} onClick={()=>updatePref('theme', k)} className={`h-12 rounded-lg ${t.bg} border-2 ${member.theme===k ? 'border-indigo-500 scale-105' : 'border-transparent opacity-50'}`}/>
                    ))}
                </div>
            </section>

            {/* Voice */}
            <section className={`${theme.card} p-6 rounded-[2rem] border space-y-4`}>
                <h3 className="font-bold flex items-center gap-2"><Music size={18}/> Voice</h3>
                <div className="flex gap-2">
                    <button onClick={()=>updatePref('voiceSettings', {...member.voiceSettings, gender: 'female'})} className={`flex-1 py-2 border rounded-xl text-sm font-bold ${member.voiceSettings?.gender!=='male' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white'}`}>Female</button>
                    <button onClick={()=>updatePref('voiceSettings', {...member.voiceSettings, gender: 'male'})} className={`flex-1 py-2 border rounded-xl text-sm font-bold ${member.voiceSettings?.gender==='male' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white'}`}>Male</button>
                </div>
            </section>
        </div>
    );
};
