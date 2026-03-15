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
  Timestamp,
  browserPopupRedirectResolver,
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
  Check,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Navigation
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

// --- Utils ---

const formatWhatsAppNumber = (number: string) => {
  let cleanNumber = number.replace(/\D/g, '');
  cleanNumber = cleanNumber.replace(/^0+/, '');
  if (cleanNumber.length === 10) {
    cleanNumber = '91' + cleanNumber;
  }
  return cleanNumber;
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

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
      <label className="text-sm font-medium text-stone-300 flex items-center gap-1">
        <MapPin size={16} className="text-emerald-500" />
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="h-48 w-full rounded-xl overflow-hidden border border-stone-700 shadow-inner relative">
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
        <div className="absolute bottom-2 right-2 z-[1000] bg-stone-900/90 backdrop-blur px-2 py-1 rounded text-[10px] text-stone-400 border border-stone-700">
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
  const [isExpanded, setIsExpanded] = useState(false);
  const whatsappUrl = `https://wa.me/${formatWhatsAppNumber(ride.whatsapp)}?text=${encodeURIComponent(
    `Hi, I saw your LiftBook ride request from ${ride.pickup_text || 'your location'} to ${ride.destination_text || 'destination'}. Are you still looking for a lift?`
  )}`;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => setIsExpanded(!isExpanded)}
      className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-4 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-500 text-xs uppercase tracking-wider font-semibold">
              <Clock size={14} />
              {format(new Date(ride.departure_time), 'MMM d, h:mm a')}
            </div>
            {ride.name && (
              <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter">
                {ride.name}
              </span>
            )}
            {ride.uid === 'guest' && (
              <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter ml-2">
                Guest
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2 flex-wrap">
            <span className="text-emerald-600">{ride.pickup_text || "Current Location"}</span>
            <ChevronRight size={16} className={`text-stone-300 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            <span className="text-blue-600">{ride.destination_text || "Destination"}</span>
          </h3>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1 shrink-0">
          <IndianRupee size={14} />
          {ride.offer_price}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4"
          >
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

            <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(ride);
                    }}
                    className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition-colors touch-manipulation active:scale-95"
                    title="Edit Ride"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(ride.id);
                    }}
                    className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors touch-manipulation active:scale-95"
                    title="Delete Ride"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isExpanded && (
        <div className="text-[10px] text-stone-400 text-center font-medium uppercase tracking-widest pt-1 group-hover:text-emerald-500 transition-colors">
          Tap to see details
        </div>
      )}
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
        className="bg-stone-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        <div className="p-4 border-b border-stone-800 flex justify-between items-center sticky top-0 bg-stone-900 z-10">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Ride Request' : 'Post Ride Request'}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-stone-800 rounded-full transition-colors touch-manipulation active:scale-90 text-stone-400"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {showSafety ? (
            <div className="space-y-6 py-4">
              <div className="bg-amber-900/20 border border-amber-900/30 p-4 rounded-2xl flex gap-3">
                <AlertCircle className="text-amber-500 shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-bold text-amber-200">Safety Disclaimer</h3>
                  <p className="text-sm text-amber-100 leading-relaxed">
                    LiftBook only displays ride requests posted by users. LiftBook does not arrange rides and does not handle payments. Users are responsible for their own safety and agreements.
                  </p>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-all"
              >
                I Understand, Post Ride
              </button>
              <button 
                type="button"
                onClick={() => setShowSafety(false)}
                className="w-full text-stone-400 font-medium py-2"
              >
                Go Back
              </button>
            </div>
          ) : (
            <>
              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-300">Your Name <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="text"
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 rounded-xl border border-stone-700 bg-stone-800 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-300">WhatsApp Number <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="tel"
                    placeholder="e.g. 9876543210"
                    className="w-full px-4 py-3 rounded-xl border border-stone-700 bg-stone-800 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    value={formData.whatsapp}
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-300">Gender <span className="text-red-500">*</span></label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-stone-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-stone-800 text-white"
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value})}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-300">Passengers <span className="text-red-500">*</span></label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-stone-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-stone-800 text-white"
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
                    className="w-full px-4 py-3 rounded-xl border border-stone-700 bg-stone-800 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
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
                    className="w-full px-4 py-3 rounded-xl border border-stone-700 bg-stone-800 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    value={formData.destination_text}
                    onChange={e => setFormData({...formData, destination_text: e.target.value})}
                  />
                </div>
              </div>

              {/* Offer & Time */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-300">Offer Price (₹) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
                    <input 
                      required
                      type="number"
                      min="0"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-700 bg-stone-800 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      value={formData.offer_price}
                      onChange={e => setFormData({...formData, offer_price: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-300">Departure Time <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="datetime-local"
                    className="w-full px-4 py-3 rounded-xl border border-stone-700 bg-stone-800 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    value={formData.departure_time}
                    onChange={e => setFormData({...formData, departure_time: e.target.value})}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-300">Ride Notes (Optional)</label>
                <textarea 
                  placeholder="e.g. Airport drop, Urgent ride"
                  className="w-full px-4 py-3 rounded-xl border border-stone-700 bg-stone-800 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all h-24 resize-none"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-all"
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
  const [loginError, setLoginError] = useState<string | null>(null);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Filtering & Sorting State
  const [pickupSearch, setPickupSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [priceFilter, setPriceFilter] = useState<number>(5000);
  const [seatsFilter, setSeatsFilter] = useState<number>(1);
  const [sortBy, setSortBy] = useState<'latest' | 'price' | 'nearest'>('latest');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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
    setLoginError(null);
    console.log("Starting login process with resolver...");
    try {
      await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      console.log("Login successful");
    } catch (error: any) {
      console.error("Login failed", error);
      
      if (error.code === 'auth/popup-blocked') {
        setLoginError("Sign-in popup was blocked. Please enable popups or open in a new tab.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.log("User closed the popup");
      } else if (error.code === 'auth/operation-not-supported-in-this-environment' || error.code === 'auth/unauthorized-domain') {
        setLoginError("This environment restricts sign-in. Please open the app in a new tab.");
      } else {
        setLoginError(`Sign-in failed. Try opening in a new tab.`);
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

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting location", error);
          alert("Could not get your location. Please check your browser permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const filteredRides = rides
    .filter(ride => {
      const matchesPickup = (ride.pickup_text?.toLowerCase() || '').includes(pickupSearch.toLowerCase());
      const matchesDestination = (ride.destination_text?.toLowerCase() || '').includes(destinationSearch.toLowerCase());
      const matchesPrice = ride.offer_price <= priceFilter;
      const matchesSeats = ride.passenger_count >= seatsFilter;
      return matchesPickup && matchesDestination && matchesPrice && matchesSeats;
    })
    .sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'price') {
        return a.offer_price - b.offer_price;
      }
      if (sortBy === 'nearest' && userLocation) {
        const distA = getDistance(userLocation[0], userLocation[1], a.pickup_lat, a.pickup_lng);
        const distB = getDistance(userLocation[0], userLocation[1], b.pickup_lat, b.pickup_lng);
        return distA - distB;
      }
      return 0;
    });

  const handlePostRide = async (data: Partial<Ride>) => {
    try {
      if (editingRide) {
        await updateDoc(doc(db, 'rides', editingRide.id), {
          ...data,
          updated_at: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'rides'), {
          ...data,
          uid: user?.uid || 'guest',
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
      <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-black shadow-xl shadow-stone-900/50">
        {/* Header */}
        <header className="bg-black border-b border-stone-800 sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-xl text-white">
              <MapPin size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">LiftBook</h1>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="p-2 text-stone-400 hover:text-emerald-400 transition-colors relative"
              title="Share App"
            >
              {showShareFeedback ? <Check size={20} className="text-emerald-400" /> : <Share size={20} />}
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
                className="w-10 h-10 rounded-full border-2 border-emerald-600"
                referrerPolicy="no-referrer"
              />
              <button 
                type="button"
                onClick={logout}
                className="p-3 text-stone-500 hover:text-stone-300 transition-colors touch-manipulation active:scale-95"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={login}
                className="flex items-center gap-2 bg-white text-black px-5 py-3 rounded-xl font-bold text-sm hover:bg-stone-100 transition-all touch-manipulation active:scale-95 shadow-lg shadow-white/10 border border-stone-200"
              >
                <LogIn size={18} />
                Sign In
              </button>
            </div>
          )}
          </div>
        </header>

        {/* Main Feed */}
        <main className="flex-1 p-6 space-y-6 pb-24 bg-black">
          <div className="flex justify-between items-end">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Recent Ride Requests</h2>
              <p className="text-sm text-stone-400">Find someone to share a lift with.</p>
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-emerald-600 text-white' : 'bg-stone-900 text-stone-400 hover:text-white'}`}
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>

          {/* Filters & Search */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4 bg-stone-900/50 p-4 rounded-2xl border border-stone-800"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                    <input 
                      type="text"
                      placeholder="From (Pickup)..."
                      className="w-full pl-10 pr-10 py-2 bg-stone-900 border border-stone-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      value={pickupSearch}
                      onChange={(e) => setPickupSearch(e.target.value)}
                    />
                    <button 
                      onClick={handleLocateMe}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-500 hover:text-emerald-500 transition-colors"
                      title="Use current location"
                    >
                      <Navigation size={14} />
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                    <input 
                      type="text"
                      placeholder="To (Destination)..."
                      className="w-full pl-10 pr-4 py-2 bg-stone-900 border border-stone-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      value={destinationSearch}
                      onChange={(e) => setDestinationSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Max Price (₹{priceFilter})</label>
                    <input 
                      type="range"
                      min="0"
                      max="5000"
                      step="100"
                      className="w-full accent-emerald-600"
                      value={priceFilter}
                      onChange={(e) => setPriceFilter(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Min Seats ({seatsFilter}+)</label>
                    <input 
                      type="range"
                      min="1"
                      max="10"
                      className="w-full accent-emerald-600"
                      value={seatsFilter}
                      onChange={(e) => setSeatsFilter(parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 flex bg-stone-900 rounded-xl p-1 border border-stone-800">
                    {(['latest', 'price', 'nearest'] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          if (option === 'nearest' && !userLocation) {
                            handleLocateMe();
                          }
                          setSortBy(option);
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${sortBy === option ? 'bg-emerald-600 text-white' : 'text-stone-500 hover:text-stone-300'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {sortBy === 'nearest' && !userLocation && (
                    <button 
                      onClick={handleLocateMe}
                      className="p-2 bg-stone-900 text-emerald-500 rounded-xl border border-stone-800 hover:bg-stone-800 transition-colors"
                      title="Get Current Location"
                    >
                      <Navigation size={20} />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="popLayout">
            {filteredRides.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 space-y-4"
              >
                <div className="bg-stone-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-stone-600">
                  <Info size={32} />
                </div>
                <p className="text-stone-400 font-medium">No ride requests match your filters.</p>
              </motion.div>
            ) : (
              filteredRides.map(ride => (
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
        <footer className="p-6 text-center text-xs text-stone-500 border-t border-stone-800 bg-black">
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
          setEditingRide(null);
          setIsFormOpen(true);
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
