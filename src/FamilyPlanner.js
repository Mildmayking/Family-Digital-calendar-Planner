// Note: This is standard JavaScript (ES6) ready for deployment.
// This version relies on the global 'firebase' object which is guaranteed to be loaded by index.html.

const { useState, useEffect, useRef } = React;
const lucide = window.lucide; // Ensure lucide is accessed from the global window object

// --- FIREBASE CONFIGURATION (Managed Service Model) ---
// This version uses the final configuration strings directly, which is the most reliable way 
// to ensure the browser loads them without complex environment variable conflicts.
const firebaseConfig = {
  apiKey: "AIzaSyDcY8yQQOZ6lGG_x9A7V50FaKb2wIWFFWk",
  authDomain: "family-digital-calendar-hub.firebaseapp.com",
  projectId: "family-digital-calendar-hub",
  
  // These values are low-security and can remain hardcoded:
  storageBucket: "family-digital-calendar-hub.firebasestorage.app",
  messagingSenderId: "495029760176",
  appId: "1:495029760176:web:67f87c6faa2eccdb1ecb75"
};

// --- Core Firebase and App Constants ---
let appInstance = null;
let authInstance = null;
let dbInstance = null;
const appId = "notebook-2026-family-v10-saas-final"; // App ID for data isolation
const NETLIFY_URL = "https://family-digital-calendar-planner.netlify.app/"; 

const COLLECTIONS = {
    MEMBERS: 'planner_members',
    EVENTS: 'planner_events',
    NOTES: 'planner_notes',
    LICENSES: 'active_licenses' // Collection for license keys
};

// Initialize Firebase instances (called only once)
function initFirebase() {
    if (!appInstance) {
        // We rely on the global 'firebase' object established by the dynamic SDK loading in index.html
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
            appInstance = firebase.initializeApp(firebaseConfig);
            authInstance = firebase.auth(appInstance);
            dbInstance = firebase.firestore(appInstance);
        } else {
             // Fallback for extreme rendering cases
             console.error("Firebase SDK objects not found globally. Check index.html loading.");
             return { app: null, auth: null, db: null };
        }
    }
    return { app: appInstance, auth: authInstance, db: dbInstance };
}

// --- CONTENT (Kept separate for cleaner structure) ---
const BIBLE_VERSES = [
    "For I know the plans I have for you,” declares the LORD, “plans to prosper you and not to harm you, plans to give you hope and a future. - Jeremiah 29:11",
    "I can do all things through Christ who gives me strength. - Philippians 4:13",
    "Trust in the LORD with all your heart and lean not on your own understanding. - Proverbs 3:5",
    "Have I not commanded you? Be strong and courageous. Do not be afraid. - Joshua 1:9",
    "But those who hope in the LORD will renew their strength. They will soar on wings like eagles. - Isaiah 40:31",
    "Love is patient, love is kind. It does not envy, it does not boast, it is not proud. - 1 Corinthians 13:4",
    "The LORD is my shepherd, I lack nothing. - Psalm 23:1",
    "And we know that in all things God works for the good of those who love him. - Romans 8.28",
    "The name of the LORD is a fortified tower; the righteous run to it and are safe. - Proverbs 18:10",
    "Therefore do not worry about tomorrow, for tomorrow will worry about itself. - Matthew 6.34"
];

const INSPIRATION_QUOTES = [
    "Your time is limited, so don't waste it living someone else's life.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Believe you can and you're halfway there.",
    "Act as if what you do makes a difference. It does.",
    "Happiness is not something ready made. It comes from your own actions.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "You don't choose your family. They are God's gift to you, as you are to them.",
    "It is not how much we have, but how much we enjoy, that makes happiness.",
    "The only person you are destined to become is the person you decide to be.",
    "Spread love everywhere you go. Let no one ever come to you without leaving happier."
];

const EVENT_ICONS = [
    { id: 'default', icon: lucide.Clock, label: 'General' },
    { id: 'birthday', icon: lucide.Gift, label: 'Birthday' },
    { id: 'school', icon: lucide.GraduationCap, label: 'School' },
    { id: 'work', icon: lucide.Briefcase, label: 'Work' },
    { id: 'sports', icon: lucide.Dumbbell, label: 'Sports' },
    { id: 'meal', icon: lucide.Utensils, label: 'Meal' },
    { id: 'travel', icon: lucide.Plane, label: 'Travel' },
    { id: 'holiday', icon: lucide.Sun, label: 'Holiday' },
    { id: 'church', icon: lucide.BookOpen, label: 'Devotion' },
];

const THEMES = {
    ocean: { name: 'Ocean', bg: 'bg-cyan-50', text: 'text-slate-900', accent: 'bg-cyan-600', card: 'bg-white/90 backdrop-blur border-cyan-100', subtext: 'text-slate-500' },
    midnight: { name: 'Midnight', bg: 'bg-slate-950', text: 'text-slate-100', accent: 'bg-indigo-600', card: 'bg-slate-900/90 backdrop-blur border-slate-700', subtext: 'text-slate-400' },
    forest: { name: 'Forest', bg: 'bg-emerald-50', text: 'text-emerald-950', accent: 'bg-emerald-700', card: 'bg-white/90 backdrop-blur border-emerald-100', subtext: 'text-emerald-800' },
    sunset: { name: 'Sunset', bg: 'bg-orange-50', text: 'text-stone-900', accent: 'bg-orange-600', card: 'bg-white/90 backdrop-blur border-orange-100', subtext: 'text-stone-600' },
    lavender: { name: 'Lavender', bg: 'bg-purple-50', text: 'text-purple-950', accent: 'bg-purple-600', card: 'bg-white/90 backdrop-blur border-purple-100', subtext: 'text-purple-800' },
    royal: { name: 'Royal', bg: 'bg-slate-50', text: 'text-slate-900', accent: 'bg-yellow-600', card: 'bg-white/90 backdrop-blur border-yellow-100', subtext: 'text-yellow-700' },
    berry: { name: 'Berry', bg: 'bg-pink-50', text: 'text-pink-950', accent: 'bg-pink-600', card: 'bg-white/90 backdrop-blur border-pink-100', subtext: 'text-pink-800' },
    sunrise: { name: 'Sunrise', bg: 'bg-rose-50', text: 'text-rose-900', accent: 'bg-rose-500', card: 'bg-white/90 backdrop-blur border-rose-100', subtext: 'text-rose-700' },
};

const getContentForDate = (dateObj, type) => {
  const dateStr = dateObj.toDateString();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  const pool = type === 'bible' ? BIBLE_VERSES : INSPIRATION_QUOTES;
  return pool[Math.abs(hash) % pool.length];
};

const speakText = (text, voiceSettings) => {
  if (!text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const gender = voiceSettings?.gender || 'female';
  let preferred = voices.find(v => v.lang.includes('en') && v.name.toLowerCase().includes(gender));
  if (!preferred) preferred = voices.find(v => v.lang.includes('en'));
  u.voice = preferred || voices[0];
  u.rate = voiceSettings?.rate || 1;
  u.pitch = voiceSettings?.pitch || 1;
  window.speechSynthesis.speak(u);
};

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
  const [alertedEvents, setAlertedEvents] = useState(new Set()); 
  
  const audioRef = useRef(null);
  const [firebaseRefs, setFirebaseRefs] = useState(null);

  useEffect(() => { 
    const refs = initFirebase();
    setFirebaseRefs(refs);

    if (audioRef.current) audioRef.current.volume = 0.15; 

    const initAuth = async () => { 
        if (!refs.auth) return;
        try { 
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await refs.auth.signInWithCustomToken(__initial_auth_token); 
            }
        } catch (e) {
             console.error("Custom auth token failed:", e);
        } 
    };
    
    // Only proceed if Firebase fully initialized
    if (refs.auth && refs.db) {
        initAuth();
        
        const unsub = refs.auth.onAuthStateChanged(async (u) => {
          if (u) {
            setUser(u); 
            const settingsSnap = await refs.db.collection('artifacts').doc(appId).collection('users').doc(u.uid).collection('settings').doc('config').get();
            
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
         // If initFirebase failed, set loading false to avoid infinite spinner.
         setLoading(false);
    }
    
  }, [firebaseRefs]); // Depend on firebaseRefs to ensure auth runs only after init

  // 2. REAL-TIME MEMBERS SYNC (CRITICAL)
  useEffect(() => {
    if (!familyId || !firebaseRefs) {
        setMembers([]);
        return;
    }
    const membersQuery = firebaseRefs.db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.MEMBERS).where('familyId', '==', familyId);
    
    const unsub = membersQuery.onSnapshot(snap => {
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
    const q = firebaseRefs.db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.EVENTS).where('familyId', '==', familyId);
    return q.onSnapshot(snap => {
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
            const evDate = new Date(ev.startTime);
            if (evDate.getDate() === now.getDate() &&
                evDate.getMonth() === now.getMonth() &&
                evDate.getFullYear() === now.getFullYear() &&
                evDate.getHours() === currentHours &&
                evDate.getMinutes() === currentMinutes) {
                
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

    const intervalId = setInterval(checkAlarms, 30000); // Check every 30 seconds
    return () => clearInterval(intervalId);
  }, [events, currentMember, alertedEvents]);

  const handleAuth = async (e, email, password, isLogin) => { 
      e.preventDefault(); 
      if (!firebaseRefs) return;
      try { 
          if (isLogin) {
              await firebaseRefs.auth.signInWithEmailAndPassword(email, password); 
          } else {
              await firebaseRefs.auth.createUserWithEmailAndPassword(email, password);
          }
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
      const licenseRef = firebaseRefs.db.collection(COLLECTIONS.LICENSES).doc(licenseKey);
      
      try {
          // 1. Check if license key exists and is unused
          const licenseSnap = await licenseRef.get();
          
          if (!licenseSnap.exists()) {
              throw new Error("License key is invalid or not found.");
          }
          
          const licenseData = licenseSnap.data();
          
          if (licenseData.used) {
              throw new Error("This license key has already been used.");
          }
          
          // 2. Consume the license key
          await licenseRef.set({ used: true, usedBy: user.uid, usedAt: Date.now() }, { merge: true });
          
          // 3. Update user settings to mark license as verified and store the licenseType
          await firebaseRefs.db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('settings').doc('config').set({ 
              licenseVerified: true, 
              licenseId: licenseKey, 
              licenseType: licenseData.licenseType // Store the type: 'annual', 'monthly', 'lifetime'
          }, { merge: true });
          
          // Success: Redirect to family setup
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
      
      // Check for license limit enforcement
      const familyMembersQuery = firebaseRefs.db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.MEMBERS).where('familyId', '==', fid).get();
      const snap = await familyMembersQuery;
      
      if (mode === 'join' && snap.size >= 6) {
           throw new Error(`This family is full (${snap.size}/6). Cannot join.`);
      }
      
      // Save family ID to user's private settings
      await firebaseRefs.db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('settings').doc('config').set({ familyId: fid, joinedAt: Date.now() }, { merge: true });
      setFamilyId(fid);
      
      const isOwner = mode === 'create';
      
      if (isOwner) {
        await firebaseRefs.db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.MEMBERS).add({ 
            familyId: fid,
            name: user.email.split('@')[0], // Use email prefix as default name for owner
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
          const userInFamilyQuery = firebaseRefs.db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.MEMBERS).where('familyId', '==', fid).where('createdBy', '==', user.uid).get();
          const userInFamilySnap = await userInFamilyQuery;

          if (userInFamilySnap.empty) {
               await firebaseRefs.db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.MEMBERS).add({ 
                   familyId: fid,
                   name: user.email.split('@')[0], // Use email prefix as default name for member
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
      await firebaseRefs.db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTIONS.MEMBERS).add({ 
          familyId, name, role, gender, theme, avatar, contentPref: 'inspiration', voiceSettings: { gender, rate: 1, pitch: 1 } 
      });
  };

  const toggleMusic = () => { if (audioRef.current) { isPlayingMusic?audioRef.current.pause():audioRef.current.play(); setIsPlayingMusic(!isPlayingMusic); }};

  if (loading || !firebaseRefs || !firebaseRefs.auth || !firebaseRefs.db) return <div className="h-screen flex items-center justify-center"><lucide.Loader className="animate-spin text-blue-500"/></div>;
  
  if (!user || view === 'auth') return <AuthScreen onAuth={handleAuth} onGuestLogin={handleGuestLogin} />;
  
  if (view === 'license_gate') return <LicenseGate verifyLicense={verifyLicense} signOut={()=>firebaseRefs.auth.signOut()} />;

  if (view === 'setup_family') return <FamilySetupScreen onSetup={handleFamilySetup} signOut={()=>firebaseRefs.auth.signOut()} />;

  if (view === 'profiles') return <ProfileSelector members={members} onSelect={m=>{setCurrentMember(m); setView('home');}} onCreate={createMember} signOut={()=>firebaseRefs.auth.signOut()}/>;

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
