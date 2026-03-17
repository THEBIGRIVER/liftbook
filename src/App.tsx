import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  auth, 
  db, 
  signInAnonymously,
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
  Navigation,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays } from 'date-fns';
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

interface MockProfile {
  name: string;
  whatsapp: string;
  uid: string;
}

const AuthContext = createContext<{
  user: User | null;
  mockProfile: MockProfile | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}>({
  user: null,
  mockProfile: null,
  loading: true,
  login: () => {},
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
      <label className="text-sm font-semibold text-white/70 flex items-center gap-1">
        <MapPin size={16} className="text-white" />
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="h-48 w-full rounded-xl overflow-hidden border-transparent bg-white/5 relative">
        <MapContainer 
          center={position || [22.5726, 88.3639]} 
          zoom={13} 
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <LocationMarker />
        </MapContainer>
        <div className="absolute bottom-2 right-2 z-[1000] bg-black/90 backdrop-blur px-2 py-1 rounded text-[10px] text-white/60 font-medium shadow-sm border border-white/10">
          Tap map to set location
        </div>
      </div>
    </div>
  );
};

const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void; 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#121212] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-white/70 mb-6">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const AlertModal = ({ 
  isOpen, 
  title, 
  message, 
  onClose 
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onClose: () => void; 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#121212] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-white/70 mb-6">{message}</p>
        <button 
          onClick={onClose}
          className="w-full py-3 rounded-xl font-semibold text-black bg-white hover:bg-gray-200 transition-colors"
        >
          OK
        </button>
      </motion.div>
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
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-black font-bold text-lg">
            {ride.name?.charAt(0) || (ride.uid === 'guest' ? 'G' : 'A')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-black text-lg tracking-tight">{ride.name || 'Anonymous'}</h3>
              {ride.uid === 'guest' && (
                <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase tracking-widest font-bold">Guest</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500 font-medium">
              <Clock size={14} />
              {format(new Date(ride.created_at), 'MMM d, h:mm a')}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-black tracking-tight flex items-center justify-end">
            ₹{ride.offer_price}
          </div>
          <div className="text-[11px] text-gray-500 uppercase tracking-widest font-bold mt-1">
            {ride.passenger_count} Seat{ride.passenger_count > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Route Timeline */}
      <div className="relative pl-6 space-y-5 my-6">
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-300" />
        <div className="relative">
          <div className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-black ring-4 ring-white" />
          <p className="text-base font-semibold text-black leading-tight">{ride.pickup_text || "Current Location"}</p>
          <p className="text-sm text-gray-500 font-medium mt-1 flex items-center gap-1">
            {format(new Date(ride.departure_time), 'MMM d, h:mm a')}
          </p>
        </div>
        <div className="relative">
          <div className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 bg-black ring-4 ring-white" />
          <p className="text-base font-semibold text-black leading-tight">{ride.destination_text || "Destination"}</p>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-gray-100 space-y-4">
              <div className="flex gap-3">
                <div className="flex items-center gap-2 text-black bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium">
                  <Users size={16} />
                  {ride.passenger_count} Passengers
                </div>
                <div className="flex items-center gap-2 text-black bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium">
                  <div className={`w-2 h-2 rounded-full ${ride.gender === 'Male' ? 'bg-blue-500' : ride.gender === 'Female' ? 'bg-pink-500' : 'bg-purple-500'}`} />
                  {ride.gender}
                </div>
              </div>

              {ride.notes && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-600 leading-relaxed">"{ride.notes}"</p>
                </div>
              )}

              <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-2 flex-1">
                  <a 
                    href={`tel:${ride.whatsapp}`}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-black py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors text-base"
                  >
                    <Phone size={20} />
                    Call
                  </a>
                  <a 
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-black hover:bg-gray-800 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors text-base"
                  >
                    <MessageCircle size={20} />
                    WhatsApp
                  </a>
                </div>
                
                {isOwner && (
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(ride);
                      }}
                      className="p-3.5 bg-gray-100 hover:bg-gray-200 text-black rounded-xl transition-colors"
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
                      className="p-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                      title="Delete Ride"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const { mockProfile } = useAuth();
  const [formData, setFormData] = useState<Partial<Ride>>(initialData || {
    name: mockProfile?.name || '',
    whatsapp: mockProfile?.whatsapp || '',
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
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-[#121212] w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/10"
      >
        <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#121212] z-10">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Ride Request' : 'Post Ride Request'}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors touch-manipulation active:scale-90 text-white/50"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {showSafety ? (
            <div className="space-y-6 py-4">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3">
                <AlertCircle className="text-amber-500 shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-bold text-amber-500">Safety Disclaimer</h3>
                  <p className="text-sm text-amber-500/80 leading-relaxed">
                    LiftBook only displays ride requests posted by users. LiftBook does not arrange rides and does not handle payments. Users are responsible for their own safety and agreements.
                  </p>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-[#FF0000] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#CC0000] transition-all"
              >
                I Understand, Post Ride
              </button>
              <button 
                type="button"
                onClick={() => setShowSafety(false)}
                className="w-full text-white/50 font-medium py-2 hover:text-white transition-colors"
              >
                Go Back
              </button>
            </div>
          ) : (
            <>
              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/70">Your Name <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="text"
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 rounded-xl border-transparent bg-white/5 text-white focus:ring-2 focus:ring-white focus:bg-white/10 outline-none transition-all font-medium placeholder:text-white/40"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/70">WhatsApp Number <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="tel"
                    placeholder="e.g. 9876543210"
                    className="w-full px-4 py-3 rounded-xl border-transparent bg-white/5 text-white focus:ring-2 focus:ring-white focus:bg-white/10 outline-none transition-all font-medium placeholder:text-white/40"
                    value={formData.whatsapp}
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/70">Gender <span className="text-red-500">*</span></label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border-transparent focus:ring-2 focus:ring-white focus:bg-white/10 outline-none transition-all bg-white/5 text-white font-medium"
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value})}
                    >
                      <option className="bg-[#121212]">Male</option>
                      <option className="bg-[#121212]">Female</option>
                      <option className="bg-[#121212]">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/70">Passengers <span className="text-red-500">*</span></label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border-transparent focus:ring-2 focus:ring-white focus:bg-white/10 outline-none transition-all bg-white/5 text-white font-medium"
                      value={formData.passenger_count}
                      onChange={e => setFormData({...formData, passenger_count: parseInt(e.target.value)})}
                    >
                      {[1, 2, 3, 4, 5, 6, 10, 12, 20].map(n => (
                        <option key={n} value={n} className="bg-[#121212]">{n}</option>
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
                    className="w-full px-4 py-3 rounded-xl border-transparent bg-white/5 text-white focus:ring-2 focus:ring-white focus:bg-white/10 outline-none transition-all font-medium placeholder:text-white/40"
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
                    className="w-full px-4 py-3 rounded-xl border-transparent bg-white/5 text-white focus:ring-2 focus:ring-white focus:bg-white/10 outline-none transition-all font-medium placeholder:text-white/40"
                    value={formData.destination_text}
                    onChange={e => setFormData({...formData, destination_text: e.target.value})}
                  />
                </div>
              </div>

              {/* Offer & Time */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/70">Offer Price (₹) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                    <input 
                      required
                      type="number"
                      min="0"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-transparent bg-white/5 text-white focus:ring-2 focus:ring-white focus:bg-white/10 outline-none transition-all font-medium"
                      value={formData.offer_price}
                      onChange={e => setFormData({...formData, offer_price: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/70">Departure Time <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="datetime-local"
                    className="w-full px-4 py-3 rounded-xl border-transparent bg-white/5 text-white focus:ring-2 focus:ring-white focus:bg-white/10 outline-none transition-all font-medium [color-scheme:dark]"
                    value={formData.departure_time}
                    onChange={e => setFormData({...formData, departure_time: e.target.value})}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/70">Ride Notes (Optional)</label>
                <textarea 
                  placeholder="e.g. Airport drop, Urgent ride"
                  className="w-full px-4 py-3 rounded-xl border-transparent bg-white/5 text-white focus:ring-2 focus:ring-white focus:bg-white/10 outline-none transition-all h-24 resize-none font-medium placeholder:text-white/40"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-[#FF0000] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#CC0000] transition-all"
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

const LoginModal = ({ 
  onClose, 
  onLogin 
}: { 
  onClose: () => void; 
  onLogin: (name: string, whatsapp: string) => void;
}) => {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && whatsapp.trim().length >= 10) {
      onLogin(name.trim(), whatsapp.trim());
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#121212] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#121212]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <LogIn size={20} className="text-white" />
            Sign In
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/70">Your Name <span className="text-red-500">*</span></label>
              <input 
                required
                type="text"
                placeholder="e.g. John Doe"
                className="w-full px-4 py-3 rounded-xl border-transparent bg-white/5 text-white focus:ring-2 focus:ring-white focus:bg-white/10 outline-none transition-all font-medium placeholder:text-white/40"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/70">WhatsApp Number <span className="text-red-500">*</span></label>
              <input 
                required
                type="tel"
                placeholder="e.g. 9876543210"
                className="w-full px-4 py-3 rounded-xl border-transparent bg-white/5 text-white focus:ring-2 focus:ring-white focus:bg-white/10 outline-none transition-all font-medium placeholder:text-white/40"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={!name.trim() || whatsapp.trim().length < 10}
            className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Continue
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [mockProfile, setMockProfile] = useState<MockProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<Ride[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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

  // Modal States
  const [alertModal, setAlertModal] = useState<{isOpen: boolean; title: string; message: string}>({isOpen: false, title: '', message: ''});
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});

  useEffect(() => {
    const savedProfile = localStorage.getItem('liftbook_mock_profile');
    if (savedProfile) {
      try {
        setMockProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Failed to parse mock profile");
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'rides'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const validRides: Ride[] = [];
      
      snapshot.docs.forEach(docSnapshot => {
        const rideData = { id: docSnapshot.id, ...docSnapshot.data() } as Ride;
        const rideDate = new Date(rideData.departure_time);
        
        if (differenceInDays(now, rideDate) >= 3) {
          // Automatically delete rides that are 3 days older than the ride date
          deleteDoc(doc(db, 'rides', rideData.id)).catch(err => console.error("Failed to auto-delete old ride", err));
        } else {
          validRides.push(rideData);
        }
      });
      
      setRides(validRides);
    });
    return unsubscribe;
  }, []);

  const login = () => {
    setIsLoginModalOpen(true);
  };

  const handleMockLogin = async (name: string, whatsapp: string) => {
    try {
      let mockUid = localStorage.getItem('liftbook_mock_uid');
      if (!mockUid) {
        mockUid = 'mock_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('liftbook_mock_uid', mockUid);
      }
      const profile = { name, whatsapp, uid: mockUid };
      setMockProfile(profile);
      localStorage.setItem('liftbook_mock_profile', JSON.stringify(profile));
      setIsLoginModalOpen(false);
    } catch (error) {
      console.error("Login failed", error);
      setLoginError("Sign-in failed. Please try again.");
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
      if (user) {
        await signOut(auth);
      }
      setMockProfile(null);
      localStorage.removeItem('liftbook_mock_profile');
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
          setAlertModal({ isOpen: true, title: "Location Error", message: "Could not get your location. Please check your browser permissions." });
        }
      );
    } else {
      setAlertModal({ isOpen: true, title: "Location Error", message: "Geolocation is not supported by your browser." });
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
          uid: mockProfile?.uid || 'guest',
          created_at: new Date().toISOString()
        });
      }
      setIsFormOpen(false);
      setEditingRide(null);
    } catch (error) {
      console.error("Failed to save ride", error);
      setAlertModal({ isOpen: true, title: "Error", message: "Failed to save ride. Please check your permissions." });
    }
  };

  const handleDeleteRide = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Ride",
      message: "Are you sure you want to delete this ride?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'rides', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error("Failed to delete ride", error);
          setAlertModal({ isOpen: true, title: "Error", message: "Failed to delete ride." });
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full"
        />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, mockProfile, loading, login, logout }}>
      <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-black shadow-2xl shadow-white/5 relative">
        {/* Header */}
        <header className="sticky top-0 z-40 px-6 py-4 flex justify-between items-center bg-black border-b border-white/10 shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tighter text-white flex items-center gap-1">
              <img src="/icon.svg" alt="LiftBook Logo" className="w-8 h-8 rounded-lg" />
              iftBook
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className="p-2.5 text-white hover:bg-white/10 rounded-full transition-all relative"
              title="Share App"
            >
              {showShareFeedback ? <Check size={20} className="text-white" /> : <Share size={20} />}
              <AnimatePresence>
                {showShareFeedback && (
                  <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-white text-black font-bold text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap shadow-xl"
                  >
                    Link Copied!
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            
          {mockProfile ? (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold uppercase">
                {mockProfile.name.charAt(0)}
              </div>
              <button 
                type="button"
                onClick={logout}
                className="p-2.5 text-white hover:bg-white/10 rounded-full transition-all touch-manipulation active:scale-95"
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
                className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-gray-200 transition-all touch-manipulation active:scale-95"
              >
                <LogIn size={18} />
                Sign In
              </button>
            </div>
          )}
          </div>
        </header>

        {/* Main Feed */}
        <main className="flex-1 p-6 space-y-6 pb-32">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-white tracking-tight">Activity</h2>
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-full transition-all ${showFilters ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
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
                className="overflow-hidden space-y-4 bg-[#121212] p-5 rounded-2xl border border-white/10"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input 
                      type="text"
                      placeholder="From (Pickup)..."
                      className="w-full pl-11 pr-10 py-3 bg-white/5 border-transparent rounded-xl text-white outline-none focus:ring-2 focus:ring-white focus:bg-white/10 transition-all placeholder:text-white/40 text-sm font-medium"
                      value={pickupSearch}
                      onChange={(e) => setPickupSearch(e.target.value)}
                    />
                    <button 
                      onClick={handleLocateMe}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white transition-colors"
                      title="Use current location"
                    >
                      <Navigation size={16} />
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input 
                      type="text"
                      placeholder="To (Destination)..."
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border-transparent rounded-xl text-white outline-none focus:ring-2 focus:ring-white focus:bg-white/10 transition-all placeholder:text-white/40 text-sm font-medium"
                      value={destinationSearch}
                      onChange={(e) => setDestinationSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest flex justify-between">
                      <span>Max Price</span>
                      <span className="text-white font-bold">₹{priceFilter}</span>
                    </label>
                    <input 
                      type="range"
                      min="0"
                      max="5000"
                      step="100"
                      className="w-full accent-white"
                      value={priceFilter}
                      onChange={(e) => setPriceFilter(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest flex justify-between">
                      <span>Min Seats</span>
                      <span className="text-white font-bold">{seatsFilter}+</span>
                    </label>
                    <input 
                      type="range"
                      min="1"
                      max="10"
                      className="w-full accent-white"
                      value={seatsFilter}
                      onChange={(e) => setSeatsFilter(parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <div className="flex-1 flex bg-white/5 rounded-xl p-1">
                    {(['latest', 'price', 'nearest'] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          if (option === 'nearest' && !userLocation) {
                            handleLocateMe();
                          }
                          setSortBy(option);
                        }}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all capitalize ${sortBy === option ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {sortBy === 'nearest' && !userLocation && (
                    <button 
                      onClick={handleLocateMe}
                      className="p-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors"
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
                className="text-center py-32 space-y-6"
              >
                <div className="bg-white/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-white/40">
                  <Info size={40} strokeWidth={1.5} />
                </div>
                <p className="text-white/50 font-medium text-sm">No ride requests match your filters.</p>
              </motion.div>
            ) : (
              filteredRides.map(ride => (
                <RideCard 
                  key={ride.id} 
                  ride={ride} 
                  isOwner={mockProfile?.uid === ride.uid}
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
        <footer className="p-8 text-center text-[10px] text-white/40 uppercase tracking-widest font-bold border-t border-white/10 bg-black">
          <p>© 2026 LiftBook. Ride safe.</p>
        </footer>
      </div>

      {/* Floating Action Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          console.log("FAB clicked");
          setEditingRide(null);
          setIsFormOpen(true);
        }}
        className="fixed bottom-8 right-8 z-[60] bg-[#FF0000] text-white px-6 py-4 rounded-full shadow-xl shadow-[#FF0000]/20 flex items-center gap-2 font-bold cursor-pointer touch-manipulation active:bg-[#CC0000]"
      >
        <Plus size={20} strokeWidth={3} />
        <span>Post Ride</span>
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

      <AnimatePresence>
        {isLoginModalOpen && (
          <LoginModal 
            onClose={() => setIsLoginModalOpen(false)} 
            onLogin={handleMockLogin} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.isOpen && (
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alertModal.isOpen && (
          <AlertModal
            isOpen={alertModal.isOpen}
            title={alertModal.title}
            message={alertModal.message}
            onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
          />
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}
