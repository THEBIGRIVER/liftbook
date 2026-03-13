import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  User
} from './firebase';
import { 
  Plus, 
  LogOut, 
  LogIn, 
  MapPin, 
  Users, 
  Clock, 
  IndianRupee, 
  MessageCircle, 
  Edit2, 
  Trash2, 
  X, 
  ChevronRight,
  AlertCircle,
  Info,
  Share,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet icon issue
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Types ---

interface Ride {
  id: string;
  name?: string;
  whatsapp: string;
  gender: string;
  passenger_count: number;
  pickup_text?: string;
  pickup_lat: number;
  pickup_lng: number;
  destination_text?: string;
  destination_lat: number;
  destination_lng: number;
  offer_price: number;
  departure_time: string;
  notes?: string;
  created_at: string;
  uid: string;
}

// --- Context ---

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

const useAuth = () => useContext(AuthContext);

// --- Components ---

const MapPicker = ({ 
  label, 
  position, 
  onChange 
}: { 
  label: string; 
  position: [number, number] | null; 
  onChange: (pos: [number, number]) => void 
}) => {
  function LocationMarker() {
    const map = useMapEvents({
      click(e) {
        onChange([e.latlng.lat, e.latlng.lng]);
      },
    });

    return position === null ? null : (
      <Marker position={position} />
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-stone-700 flex items-center gap-1">
        <MapPin size={16} className="text-emerald-600" />
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="h-48 w-full rounded-xl overflow-hidden border border-stone-200 shadow-inner relative">
        <MapContainer 
          center={position || [22.5726, 88.3639]} 
          zoom={13} 
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker />
        </MapContainer>
        <div className="absolute bottom-2 right-2 z-[1000] bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] text-stone-500 border border-stone-200">
          Tap map to set location
        </div>
      </div>
    </div>
  );
};

const RideCard = ({ 
  ride, 
  onEdit, 
  onDelete, 
  isOwner 
}: { 
  ride: Ride; 
  onEdit: (ride: Ride) => void; 
  onDelete: (id: string) => Promise<void> | void;
  isOwner: boolean;
  key?: React.Key;
}) => {
  const whatsappUrl = `https://wa.me/${ride.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hi, I saw your LiftBook ride request from ${ride.pickup_text || 'your location'} to ${ride.destination_text || 'destination'}. Are you still looking for a lift?`
  )}`;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-4 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 text-stone-500 text-xs uppercase tracking-wider font-semibold">
            <Clock size={14} />
            {format(new Date(ride.departure_time), 'MMM d, h:mm a')}
          </div>
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2 flex-wrap">
            <span className="text-emerald-600">{ride.pickup_text || "Current Location"}</span>
            <ChevronRight size={16} className="text-stone-300" />
            <span className="text-blue-600">{ride.destination_text || "Destination"}</span>
          </h3>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
          <IndianRupee size={14} />
          {ride.offer_price}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-2 border-y border-stone-50">
        <div className="flex items-center gap-2 text-stone-600">
          <Users size={18} className="text-stone-400" />
          <span className="text-sm font-medium">{ride.passenger_count} Passengers</span>
        </div>
        <div className="flex items-center gap-2 text-stone-600">
          <div className={`w-2 h-2 rounded-full ${ride.gender === 'Male' ? 'bg-blue-400' : ride.gender === 'Female' ? 'bg-pink-400' : 'bg-purple-400'}`} />
          <span className="text-sm font-medium">{ride.gender}</span>
        </div>
      </div>

      {ride.notes && (
        <p className="text-sm text-stone-500 italic">"{ride.notes}"</p>
      )}

      <div className="flex gap-2 pt-2">
        <a 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-100"
        >
          <MessageCircle size={20} />
          Contact on WhatsApp
        </a>
        
        {isOwner && (
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => onEdit(ride)}
              className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition-colors touch-manipulation active:scale-95"
              title="Edit Ride"
            >
              <Edit2 size={20} />
            </button>
            <button 
              type="button"
              onClick={() => onDelete(ride.id)}
              className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors touch-manipulation active:scale-95"
              title="Delete Ride"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const RideForm = ({ 
  initialData, 
  onClose, 
  onSubmit 
}: { 
  initialData?: Ride | null; 
  onClose: () => void;
  onSubmit: (data: Partial<Ride>) => void;
}) => {
  const [formData, setFormData] = useState<Partial<Ride>>(initialData || {
    name: '',
    whatsapp: '',
    gender: 'Male',
    passenger_count: 1,
    pickup_text: '',
    pickup_lat: 22.5726,
    pickup_lng: 88.3639,
    destination_text: '',
    destination_lat: 22.5826,
    destination_lng: 88.3739,
    offer_price: 100,
    departure_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: '',
  });

  const [step, setStep] = useState(1);
  const [showSafety, setShowSafety] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSafety && !initialData) {
      setShowSafety(true);
    } else {
      onSubmit(formData);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        <div className="p-4 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-stone-900">
            {initialData ? 'Edit Ride Request' : 'Post Ride Request'}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-stone-100 rounded-full transition-colors touch-manipulation active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {showSafety ? (
            <div className="space-y-6 py-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3">
                <AlertCircle className="text-amber-600 shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-bold text-amber-900">Safety Disclaimer</h3>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    LiftBook only displays ride requests posted by users. LiftBook does not arrange rides and does not handle payments. Users are responsible for their own safety and agreements.
                  </p>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
              >
                I Understand, Post Ride
              </button>
              <button 
                type="button"
                onClick={() => setShowSafety(false)}
                className="w-full text-stone-500 font-medium py-2"
              >
                Go Back
              </button>
            </div>
          ) : (
            <>
              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">WhatsApp Number <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="tel"
                    placeholder="e.g. 9876543210"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    value={formData.whatsapp}
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Gender <span className="text-red-500">*</span></label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value})}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Passengers <span className="text-red-500">*</span></label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                      value={formData.passenger_count}
                      onChange={e => setFormData({...formData, passenger_count: parseInt(e.target.value)})}
                    >
                      {[1, 2, 3, 4, 5, 6, 10, 12, 20].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <MapPicker 
                    label="Pickup Location" 
                    position={formData.pickup_lat ? [formData.pickup_lat, formData.pickup_lng!] : null}
                    onChange={pos => setFormData({...formData, pickup_lat: pos[0], pickup_lng: pos[1]})}
                  />
                  <input 
                    type="text"
                    placeholder="Pickup Landmark (Optional)"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    value={formData.pickup_text}
                    onChange={e => setFormData({...formData, pickup_text: e.target.value})}
                  />
                </div>

                <div className="space-y-4">
                  <MapPicker 
                    label="Destination Location" 
                    position={formData.destination_lat ? [formData.destination_lat, formData.destination_lng!] : null}
                    onChange={pos => setFormData({...formData, destination_lat: pos[0], destination_lng: pos[1]})}
                  />
                  <input 
                    type="text"
                    placeholder="Destination Landmark (Optional)"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    value={formData.destination_text}
                    onChange={e => setFormData({...formData, destination_text: e.target.value})}
                  />
                </div>
              </div>

              {/* Offer & Time */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">Offer Price (₹) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input 
                      required
                      type="number"
                      min="0"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      value={formData.offer_price}
                      onChange={e => setFormData({...formData, offer_price: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">Departure Time <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="datetime-local"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    value={formData.departure_time}
                    onChange={e => setFormData({...formData, departure_time: e.target.value})}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">Ride Notes (Optional)</label>
                <textarea 
                  placeholder="e.g. Airport drop, Urgent ride"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all h-24 resize-none"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
              >
                {initialData ? 'Update Ride' : 'Post Ride'}
              </button>
            </>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<Ride[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [showShareFeedback, setShowShareFeedback] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'rides'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ridesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ride[];
      setRides(ridesData);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    console.log("Starting login process...");
    try {
      await signInWithPopup(auth, googleProvider);
      console.log("Login successful");
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-blocked') {
        alert("Sign-in popup was blocked by your browser. Please allow popups for this site or try a different browser.");
      } else {
        alert("Sign-in failed. Please try again.");
      }
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'LiftBook - Community Ride Board',
      text: 'Check out LiftBook, a community ride board where you can find and offer lifts!',
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        setShowShareFeedback(true);
        setTimeout(() => setShowShareFeedback(false), 2000);
      }
    } catch (error) {
      console.error("Error sharing", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handlePostRide = async (data: Partial<Ride>) => {
    if (!user) return;
    try {
      if (editingRide) {
        await updateDoc(doc(db, 'rides', editingRide.id), {
          ...data,
          updated_at: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'rides'), {
          ...data,
          uid: user.uid,
          created_at: new Date().toISOString()
        });
      }
      setIsFormOpen(false);
      setEditingRide(null);
    } catch (error) {
      console.error("Failed to save ride", error);
      alert("Failed to save ride. Please check your permissions.");
    }
  };

  const handleDeleteRide = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this ride?")) return;
    try {
      await deleteDoc(doc(db, 'rides', id));
    } catch (error) {
      console.error("Failed to delete ride", error);
      alert("Failed to delete ride.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-stone-50 shadow-xl shadow-stone-200/50">
        {/* Header */}
        <header className="bg-white border-b border-stone-100 sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-xl text-white">
              <MapPin size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-stone-900">LiftBook</h1>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="p-2 text-stone-500 hover:text-emerald-600 transition-colors relative"
              title="Share App"
            >
              {showShareFeedback ? <Check size={20} className="text-emerald-600" /> : <Share size={20} />}
              <AnimatePresence>
                {showShareFeedback && (
                  <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap"
                  >
                    Link Copied!
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            
          {user ? (
            <div className="flex items-center gap-3">
              <img 
                src={user.photoURL || ''} 
                alt={user.displayName || ''} 
                className="w-10 h-10 rounded-full border-2 border-emerald-100"
                referrerPolicy="no-referrer"
              />
              <button 
                type="button"
                onClick={logout}
                className="p-3 text-stone-400 hover:text-stone-600 transition-colors touch-manipulation active:scale-95"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={login}
              className="flex items-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-stone-800 transition-all touch-manipulation active:scale-95 shadow-lg shadow-stone-200"
            >
              <LogIn size={18} />
              Sign In
            </button>
          )}
          </div>
        </header>

        {/* Main Feed */}
        <main className="flex-1 p-6 space-y-6 pb-24">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-stone-900">Recent Ride Requests</h2>
            <p className="text-sm text-stone-500">Find someone to share a lift with.</p>
          </div>

          <AnimatePresence mode="popLayout">
            {rides.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 space-y-4"
              >
                <div className="bg-stone-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-stone-400">
                  <Info size={32} />
                </div>
                <p className="text-stone-500 font-medium">No ride requests yet. Be the first!</p>
              </motion.div>
            ) : (
              rides.map(ride => (
                <RideCard 
                  key={ride.id} 
                  ride={ride} 
                  isOwner={user?.uid === ride.uid}
                  onEdit={(r) => {
                    setEditingRide(r);
                    setIsFormOpen(true);
                  }}
                  onDelete={handleDeleteRide}
                />
              ))
            )}
          </AnimatePresence>
        </main>

        {/* Footer Info */}
        <footer className="p-6 text-center text-xs text-stone-400 border-t border-stone-100 bg-white">
          <p>© 2026 LiftBook Community. Ride safe.</p>
        </footer>
      </div>

      {/* Floating Action Button - Moved outside main container for better mobile responsiveness */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          console.log("FAB clicked");
          if (!user) {
            login();
          } else {
            setEditingRide(null);
            setIsFormOpen(true);
          }
        }}
        className="fixed bottom-8 right-8 z-[60] bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl shadow-emerald-200 flex items-center gap-2 font-bold cursor-pointer touch-manipulation active:bg-emerald-700"
      >
        <Plus size={24} />
        <span className="hidden sm:inline">Post Ride</span>
      </motion.button>

      {/* Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <RideForm 
            initialData={editingRide}
            onClose={() => {
              setIsFormOpen(false);
              setEditingRide(null);
            }}
            onSubmit={handlePostRide}
          />
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}
