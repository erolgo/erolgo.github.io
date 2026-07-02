import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Navigation, 
  Search, 
  Mic, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  X, 
  Loader2,
  MapPin,
  Route as RouteIcon,
  Plus,
  Trash2,
  Map,
  GripVertical
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { BinaRecord } from "./types";

export default function App() {
  const API_BASE_URL = window.location.hostname.includes("github.io") 
    ? "https://erolgo-navigasyon-sistemi-970973845068.europe-west2.run.app" 
    : "";
    
  const [showSplash, setShowSplash] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BinaRecord | null>(null);
  
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterResults, setFilterResults] = useState<BinaRecord[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  
  const [routeOpen, setRouteOpen] = useState(false);
  const [routeInput, setRouteInput] = useState("");
  const [routeList, setRouteList] = useState<BinaRecord[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingFilter, setIsRecordingFilter] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Splash Timer
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // TTS Greeting
  const speak = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "tr-TR";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      speak("Erol Go'ya Hoşgeldiniz");
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
  }, [speak]);

  // Formatting
  const formatTitle = (str?: string) => {
    if (!str) return "";
    return str.toLocaleLowerCase("tr-TR").split(" ").map(w => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1)).join(" ");
  };

  const handleSearch = async (id?: string) => {
    const targetId = (id || searchId).trim();
    if (!targetId) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const apiUrl = `${API_BASE_URL}/api/bina/search?id=${targetId}`;
    console.log("Fetching from:", apiUrl);
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data && Array.isArray(data) && data.length > 0) {
        setResult(data[0]);
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else if (data && data.error) {
        setError(data.error === "Supabase API error" ? "Bina bulunamadı veya sistem meşgul." : data.error);
      } else {
        setError("Bina bulunamadı.");
      }
    } catch (err) {
      setError("Sistem hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSearch = useCallback(async (manualText?: string) => {
    const text = (manualText ?? filterText).trim();
    if (!text || text.length < 3) {
      setFilterResults([]);
      return;
    }

    setFilterLoading(true);
    const apiUrl = `${API_BASE_URL}/api/bina/filter?text=${encodeURIComponent(text)}`;
    console.log("Filtering from:", apiUrl);
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        setFilterResults(data);
      } else {
        setFilterResults([]);
      }
    } catch (err) {
      console.error(err);
      setFilterResults([]);
    } finally {
      setFilterLoading(false);
    }
  }, [filterText]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filterText.trim().length >= 3) {
        handleFilterSearch();
      } else {
        setFilterResults([]);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [filterText, handleFilterSearch]);

  const addToRoute = async () => {
    const id = routeInput.trim();
    if (!id) return;
    if (routeList.some(item => item["BİNA ID"].toString() === id)) {
      setRouteInput("");
      return;
    }

    setRouteLoading(true);
    const apiUrl = `${API_BASE_URL}/api/bina/search?id=${id}`;
    console.log("Route adding from:", apiUrl);
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      if (data && Array.isArray(data) && data.length > 0) {
        setRouteList(prev => [...prev, data[0]]);
        setRouteInput("");
      } else {
        alert("Bina ID bulunamadı.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRouteLoading(false);
    }
  };

  const startRoute = () => {
    if (routeList.length === 0) return;
    
    // Construct multi-stop URL
    const stops = routeList.map(item => {
      if (item.KOORDİNATLAR) return item.KOORDİNATLAR.trim().replace(/\s+/g, "");
      return encodeURIComponent(`${item.MAHALLE} ${item["CADDE / SOKAK"]} Erzurum`);
    });

    const destination = stops.pop();
    const waypoints = stops.join("|");
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ""}&travelmode=driving`;
    window.open(url, "_blank");
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Ses tanıma desteklenmiyor.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.onstart = () => {
      setIsRecording(true);
      speak("Dinliyorum...");
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => {
      setIsRecording(false);
      speak("Bir hata oluştu, lütfen tekrar deneyin.");
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const numbers = transcript.replace(/\D/g, "");
      if (numbers) {
        setSearchId(numbers);
        handleSearch(numbers);
      } else {
        speak("Lütfen bir bina numarası söyleyin.");
      }
    };
    recognition.start();
  };

  const handleVoiceFilter = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Ses tanıma desteklenmiyor.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.onstart = () => {
      setIsRecordingFilter(true);
      speak("Adresi söyleyin...");
    };
    recognition.onend = () => setIsRecordingFilter(false);
    recognition.onerror = () => {
      setIsRecordingFilter(false);
      speak("Hata oluştu.");
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setFilterText(transcript);
        setFilterOpen(true);
      }
    };
    recognition.start();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-[#1e3a8a] selection:text-white">
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1e3a8a] text-white"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-6 flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-white text-[#1e3a8a] shadow-2xl"
            >
              <Navigation size={64} />
            </motion.div>
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-5xl font-black"
            >
              ErolGo®
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.5 }}
              className="mt-4 tracking-[0.3em] font-bold"
            >
              HOŞGELDİNİZ
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-10 flex items-center justify-between">
          <div 
            onClick={() => window.location.reload()}
            className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e3a8a] text-white shadow-lg">
              <Navigation size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">ErolGo®</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NAVİGASYON SİSTEMİ</p>
            </div>
          </div>
          <span className="text-[10px] font-black text-slate-300">Coding by ETÜRK</span>
        </header>

        {/* Search Box */}
        <section className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-100 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-3 text-lg font-black font-sans">
              <Search className="text-[#1e3a8a]" size={20} />
              Bir Bina ID Sorgulayın..
            </h3>
            {loading && <Loader2 className="animate-spin text-[#1e3a8a]" size={20} />}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Bina ID giriniz..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full rounded-2xl bg-slate-50 px-5 py-4 font-sans text-lg font-black text-[#1e3a8a] outline-none ring-2 ring-transparent focus:bg-white focus:ring-[#1e3a8a] sm:text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button 
                onClick={handleVoiceSearch}
                className={`absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${isRecording ? "bg-red-500 text-white animate-pulse" : "bg-blue-50 text-[#1e3a8a]"}`}
              >
                <Mic size={20} />
              </button>
            </div>
            <button 
              onClick={() => handleSearch()}
              className="rounded-2xl bg-[#1e3a8a] py-4 px-8 font-black text-white shadow-lg active:scale-95 transition-transform"
            >
              Sorgula
            </button>
          </div>
          
          <AnimatePresence>
            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 text-xs font-bold text-red-500"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Tools Toggle Group */}
          <div className="mt-8 flex items-center justify-center gap-6 border-t border-slate-50 pt-6">
            <button 
              onClick={() => {
                setFilterOpen(!filterOpen);
                setRouteOpen(false);
              }}
              className={`flex items-center gap-2 text-sm font-black transition-all ${filterOpen ? "text-[#1e3a8a] scale-105" : "text-slate-400 hover:text-[#1e3a8a]"}`}
            >
              <Filter size={16} />
              Adres ile Filtrele
              {filterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <div className="h-4 w-[1px] bg-slate-200" />

            <button 
              onClick={() => {
                setRouteOpen(!routeOpen);
                setFilterOpen(false);
              }}
              className={`flex items-center gap-2 text-sm font-black transition-all ${routeOpen ? "text-[#1e3a8a] scale-105" : "text-slate-400 hover:text-[#1e3a8a]"}`}
            >
              <RouteIcon size={16} />
              Rota Planla
              {routeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          
          <motion.div 
            initial={false}
            animate={{ height: filterOpen ? "auto" : 0, opacity: filterOpen ? 1 : 0 }}
            className="w-full overflow-hidden"
          >
            <div className="pt-6 flex flex-col gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Mahalle, sokak veya bina adı yazın..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFilterSearch()}
                  className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-[#1e3a8a] outline-none ring-2 ring-transparent focus:bg-white focus:ring-[#1e3a8a]"
                />
                <button 
                  onClick={handleVoiceFilter}
                  className={`absolute right-12 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isRecordingFilter ? "bg-red-500 text-white animate-pulse" : "bg-blue-50 text-[#1e3a8a]"}`}
                >
                  <Mic size={14} />
                </button>
                <button 
                  onClick={() => handleFilterSearch()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-[#1e3a8a] p-2 text-white"
                >
                  {filterLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                </button>
              </div>
              
              {filterResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-inner">
                  {filterResults.map((item) => (
                    <button
                      key={item["BİNA ID"]}
                      onClick={() => {
                        setResult(item);
                        setFilterOpen(false);
                        setTimeout(() => {
                          resultRef.current?.scrollIntoView({ behavior: "smooth" });
                        }, 100);
                      }}
                      className="flex w-full flex-col border-b border-slate-50 p-4 text-left transition-colors hover:bg-blue-50 last:border-0"
                    >
                      <span className="text-sm font-black text-slate-800">
                        {formatTitle(item["BİNA ADI"] || item["SİTE ADI"] || "İsimsiz Bina")}
                        {item["BLOK ADI"] && ` - ${formatTitle(item["BLOK ADI"])}`}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {formatTitle(item.MAHALLE)}, {formatTitle(item["CADDE / SOKAK"])} No: {item["KAPI NO"]} 
                        {item["İLÇE"] && ` (${formatTitle(item["İLÇE"])})`}
                      </span>
                      <span className="mt-1 text-[9px] font-black text-[#1e3a8a]">ID: {item["BİNA ID"]}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {filterResults.length === 0 && filterText.length >= 3 && !filterLoading && (
                 <p className="p-4 text-center text-xs font-bold text-slate-400">Sonuç bulunamadı.</p>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={false}
            animate={{ height: routeOpen ? "auto" : 0, opacity: routeOpen ? 1 : 0 }}
            className="w-full overflow-hidden"
          >
            <div className="pt-6 flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Bina ID ekle..."
                    value={routeInput}
                    onChange={(e) => setRouteInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addToRoute()}
                    className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-[#1e3a8a] outline-none ring-2 ring-transparent focus:bg-white focus:ring-[#1e3a8a]"
                  />
                  {routeLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="animate-spin text-[#1e3a8a]" size={16} />
                    </div>
                  )}
                </div>
                <button 
                  onClick={addToRoute}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1e3a8a] text-white shadow-md active:scale-90 transition-transform"
                >
                  <Plus size={20} />
                </button>
              </div>

              {routeList.length > 0 && (
                <div className="flex flex-col gap-2 rounded-2xl bg-slate-50/50 p-4 ring-1 ring-slate-100">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-black text-[#1e3a8a] uppercase tracking-widest">GÜZERGAH DURAKLARI ({routeList.length})</p>
                    <button 
                      onClick={() => setRouteList([])}
                      className="text-[10px] font-black text-red-500 hover:underline"
                    >
                      TEMİZLE
                    </button>
                  </div>
                  
                  <Reorder.Group axis="y" values={routeList} onReorder={setRouteList} className="flex flex-col gap-2">
                    {routeList.map((item, index) => (
                      <Reorder.Item 
                        key={item["BİNA ID"]}
                        value={item}
                        className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 cursor-grab active:cursor-grabbing touch-none"
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="text-slate-300" size={16} />
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[10px] font-black text-[#1e3a8a]">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">
                              {formatTitle(item["BİNA ADI"] || item["SİTE ADI"] || "Bina")} 
                              {item["BİNA ID"]}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400">
                              {formatTitle(item.MAHALLE)} No: {item["KAPI NO"]}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setRouteList(prev => prev.filter(p => p["BİNA ID"] !== item["BİNA ID"]))}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>

                  <button 
                    onClick={startRoute}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a8a] py-3 text-sm font-black text-white shadow-lg active:scale-95 transition-transform"
                  >
                    <Map size={16} /> Rota Navigasyonunu Başlat
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </section>

        {/* Result Area */}
        <AnimatePresence>
          {result && (
            <motion.div 
              ref={resultRef}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-100"
            >
              <div className="bg-[#1e3a8a] p-6 text-white sm:p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black">
                        {formatTitle(result["BİNA ADI"] || result["SİTE ADI"] || "Bina Bilgisi")}
                      </h4>
                      <p className="text-[10px] font-bold opacity-70">ID: {result["BİNA ID"]}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setResult(null)}
                    className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <div className="mb-6">
                  <p className="text-[10px] font-black text-[#1e3a8a] mb-2 uppercase tracking-widest">ADRES BİLGİLERİ</p>
                  <p className="text-lg font-bold text-slate-800 leading-relaxed">
                    {[
                      result.MAHALLE ? formatTitle(result.MAHALLE) : null,
                      result["CADDE / SOKAK"] ? formatTitle(result["CADDE / SOKAK"]) : null,
                      result["KAPI NO"] ? `No: ${result["KAPI NO"]}` : null,
                      result["ESKİ KAPI NO"] && result["ESKİ KAPI NO"] !== "NULL" ? `(Eski No: ${result["ESKİ KAPI NO"]})` : null,
                      result["SİTE ADI"] ? formatTitle(result["SİTE ADI"]) : null,
                      result["BLOK ADI"] ? formatTitle(result["BLOK ADI"]) : null,
                      result["BİNA ADI"] ? formatTitle(result["BİNA ADI"]) : null,
                      `${formatTitle(result.İLÇE)} / ${formatTitle(result.İL || "Erzurum")}`
                    ].filter(Boolean).join(", ")}
                  </p>
                </div>
                
                <a 
                  href={result.LİNK || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.KOORDİNATLAR || "")}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#1e3a8a] py-4 font-black text-white shadow-xl active:scale-95 transition-transform mb-6"
                >
                  <Navigation size={20} /> Navigasyonu Başlat
                </a>
                
                {result.KOORDİNATLAR && (
                  <div className="relative h-[300px] rounded-[2rem] overflow-hidden border border-slate-100 shadow-inner group">
                    <iframe 
                      title="map"
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      src={`https://maps.google.com/maps?ll=${result.KOORDİNATLAR.trim().replace(/\s+/g, "")}&q=${result.KOORDİNATLAR.trim().replace(/\s+/g, "")}&z=19&t=k&output=embed`}
                    />
                    <div className="absolute bottom-4 right-4 bg-black/60 px-4 py-2 rounded-full text-[10px] font-black text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                      UYDU GÖRÜNÜMÜ
                    </div>
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-full text-[10px] font-black text-[#1e3a8a] shadow-sm backdrop-blur-sm">
                      <MapPin size={12} />
                      {result.KOORDİNATLAR}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-16 border-t border-slate-100 pt-8 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">
            ErolGo® NAVİGASYON SİSTEMİ • 2026
          </p>
        </footer>
      </main>
    </div>
  );
}
