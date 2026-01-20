import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HiHome, HiPlus, HiXMark, HiMagnifyingGlass, HiArrowLeft, HiArrowRight } from 'react-icons/hi2';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import './SetupWizard.css';

const APPLIANCE_LIBRARY = [
    { type: 'LED Bulb', wattage: 9, category: 'lighting' },
    { type: 'CFL Bulb', wattage: 15, category: 'lighting' },
    { type: 'Tube Light', wattage: 40, category: 'lighting' },
    { type: 'Incandescent Bulb', wattage: 60, category: 'lighting' },
    { type: 'Normal Fan', wattage: 75, category: 'cooling' },
    { type: 'BLDC Fan', wattage: 35, category: 'cooling' },
    { type: 'Table Fan', wattage: 50, category: 'cooling' },
    { type: '1 Ton 3 Star AC', wattage: 1200, category: 'cooling' },
    { type: '1 Ton 5 Star AC', wattage: 900, category: 'cooling' },
    { type: '1.5 Ton 3 Star AC', wattage: 1700, category: 'cooling' },
    { type: '1.5 Ton 5 Star AC', wattage: 1500, category: 'cooling' },
    { type: '2 Ton 3 Star AC', wattage: 2200, category: 'cooling' },
    { type: '2 Ton 5 Star AC', wattage: 2000, category: 'cooling' },
    { type: 'Geyser 15L', wattage: 2000, category: 'heating' },
    { type: 'Geyser 25L', wattage: 2500, category: 'heating' },
    { type: 'Room Heater', wattage: 2000, category: 'heating' },
    { type: 'Iron Box', wattage: 1000, category: 'heating' },
    { type: 'Refrigerator Single Door', wattage: 150, category: 'kitchen' },
    { type: 'Refrigerator Double Door', wattage: 250, category: 'kitchen' },
    { type: 'Induction Cooktop', wattage: 1500, category: 'kitchen' },
    { type: 'Microwave Oven', wattage: 1200, category: 'kitchen' },
    { type: 'Mixer Grinder', wattage: 500, category: 'kitchen' },
    { type: 'Electric Kettle', wattage: 1500, category: 'kitchen' },
    { type: 'Toaster', wattage: 800, category: 'kitchen' },
    { type: 'Rice Cooker', wattage: 700, category: 'kitchen' },
    { type: 'Dishwasher', wattage: 1800, category: 'kitchen' },
    { type: 'LED TV 32 inch', wattage: 50, category: 'electronics' },
    { type: 'LED TV 43 inch', wattage: 80, category: 'electronics' },
    { type: 'LED TV 55 inch', wattage: 110, category: 'electronics' },
    { type: 'Desktop Computer', wattage: 150, category: 'electronics' },
    { type: 'Laptop', wattage: 65, category: 'electronics' },
    { type: 'Monitor', wattage: 40, category: 'electronics' },
    { type: 'Printer', wattage: 50, category: 'electronics' },
    { type: 'WiFi Router', wattage: 10, category: 'electronics' },
    { type: 'Set Top Box', wattage: 15, category: 'electronics' },
    { type: 'Gaming Console', wattage: 150, category: 'electronics' },
    { type: 'Mobile Charger', wattage: 18, category: 'electronics' },
    { type: 'Tablet Charger', wattage: 24, category: 'electronics' },
    { type: 'Washing Machine', wattage: 500, category: 'other' },
    { type: 'Vacuum Cleaner', wattage: 1000, category: 'other' },
    { type: 'Water Pump', wattage: 750, category: 'other' },
];

export default function SetupWizard() {
    const navigate = useNavigate();
    const firstRoomInputRef = useRef(null);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [appliances, setAppliances] = useState(APPLIANCE_LIBRARY);

    // Form data
    const [homeData, setHomeData] = useState({ name: 'My Home', totalRooms: 3 });
    const [rooms, setRooms] = useState([]);
    const [existingHomeId, setExistingHomeId] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (step === 2) {
            setTimeout(() => {
                firstRoomInputRef.current?.focus();
            }, 50);
        }
    }, [step]);

    useEffect(() => {
        const checkExistingHome = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: homes, error } = await supabase
                    .from('ps_homes')
                    .select('*, ps_rooms(*, ps_appliances(*))')
                    .order('created_at');

                if (error) throw error;

                if (homes && homes.length > 0) {
                    const existingHome = homes[0];
                    setExistingHomeId(existingHome.id);

                    setHomeData({
                        name: existingHome.name,
                        totalRooms: existingHome.total_rooms || existingHome.ps_rooms?.length || 3
                    });

                    const roomsData = existingHome.ps_rooms || [];
                    if (roomsData.length > 0) {
                        const formattedRooms = roomsData.map(room => ({
                            id: room.id,
                            name: room.name,
                            type: room.type,
                            appliances: (room.ps_appliances || []).map(app => ({
                                id: app.id,
                                name: app.name,
                                type: app.type || app.name,
                                wattage: app.wattage,
                                isExisting: true
                            }))
                        }));
                        setRooms(formattedRooms);
                    }
                }
            } catch (error) {
                console.error('Error checking existing home:', error);
            } finally {
                setIsInitialLoading(false);
            }
        };

        checkExistingHome();
    }, []);

    const handleHomeSubmit = () => {
        if (!homeData.name || !homeData.name.trim()) {
            toast.error('Home name is mandatory');
            return;
        }
        if (!homeData.totalRooms || homeData.totalRooms < 1) {
            toast.error('Please enter a valid number of rooms');
            return;
        }

        // Check if we already have rooms loaded (from existing home)
        if (rooms.length > 0) {
            // If total rooms changed, adjust the rooms array
            if (rooms.length !== homeData.totalRooms) {
                const newRooms = [...rooms];
                
                if (homeData.totalRooms > rooms.length) {
                    // Add new rooms
                    for (let i = rooms.length; i < homeData.totalRooms; i++) {
                        newRooms.push({
                            name: '',
                            type: '',
                            appliances: []
                        });
                    }
                } else {
                    // Remove extra rooms
                    newRooms.splice(homeData.totalRooms);
                }
                
                setRooms(newRooms);
            }
            // If count is the same, keep existing rooms with their appliances
            setStep(2);
            return;
        }

        // Initialize rooms only if we don't have any (fresh setup)
        const initialRooms = [];
        for (let i = 0; i < homeData.totalRooms; i++) {
            initialRooms.push({
                name: '',
                type: '',
                appliances: []
            });
        }
        setRooms(initialRooms);
        setStep(2);
    };

    const handleRoomsSubmit = () => {
        const incompleteRoom = rooms.find(r => !r.name?.trim() || !r.type?.trim());
        if (incompleteRoom) {
            toast.error('All room names and types are mandatory');
            return;
        }
        setStep(3);
    };

    const updateRoom = (index, field, value) => {
        const newRooms = [...rooms];
        newRooms[index][field] = value;
        setRooms(newRooms);
    };

    const toggleAppliance = (roomIndex, appliance) => {
        const newRooms = [...rooms];
        const roomAppliances = newRooms[roomIndex].appliances;
        const existingIndex = roomAppliances.findIndex(a => a.type === appliance.type);

        if (existingIndex >= 0) {
            roomAppliances.splice(existingIndex, 1);
        } else {
            roomAppliances.push({
                name: appliance.type,
                type: appliance.type,
                wattage: appliance.wattage
            });
        }
        setRooms(newRooms);
    };

    // Custom appliance form state
    const [customApplianceForm, setCustomApplianceForm] = useState({});

    // Search state for common appliances
    const [applianceSearch, setApplianceSearch] = useState({});

    const updateCustomForm = (roomIndex, field, value) => {
        setCustomApplianceForm(prev => ({
            ...prev,
            [roomIndex]: {
                ...prev[roomIndex],
                [field]: value
            }
        }));
    };

    const addCustomAppliance = (roomIndex) => {
        const form = customApplianceForm[roomIndex];
        if (!form?.name || !form?.wattage) return;

        const newRooms = [...rooms];
        newRooms[roomIndex].appliances.push({
            name: form.name,
            type: form.name.toLowerCase().replace(/\s+/g, '_'),
            wattage: parseInt(form.wattage),
            isCustom: true
        });
        setRooms(newRooms);

        // Reset form
        setCustomApplianceForm(prev => ({
            ...prev,
            [roomIndex]: { name: '', wattage: '' }
        }));
    };

    const removeAppliance = (roomIndex, applianceIndex) => {
        const newRooms = [...rooms];
        newRooms[roomIndex].appliances.splice(applianceIndex, 1);
        setRooms(newRooms);
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Ensure profile exists in ps_users (Foreign Key requirement)
            const { data: profile } = await supabase
                .from('ps_users')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (!profile) {
                const { error: profileError } = await supabase
                    .from('ps_users')
                    .insert({
                        id: user.id,
                        email: user.email,
                        name: user.user_metadata?.name || user.email.split('@')[0]
                    });
                if (profileError) throw profileError;
            }

            let homeId;

            if (existingHomeId) {
                homeId = existingHomeId;
                // Update home name and room count
                await supabase
                    .from('ps_homes')
                    .update({ 
                        name: homeData.name,
                        total_rooms: parseInt(homeData.totalRooms)
                    })
                    .eq('id', homeId);

                // For simplicity, we'll clear existing rooms and rebuild
                // This matches the original logic
                await supabase.from('ps_rooms').delete().eq('home_id', homeId);
            } else {
                // Create new home
                const { data: newHome, error: homeError } = await supabase
                    .from('ps_homes')
                    .insert({
                        name: homeData.name,
                        total_rooms: parseInt(homeData.totalRooms),
                        user_id: user.id
                    })
                    .select()
                    .single();

                if (homeError) throw homeError;
                homeId = newHome.id;
                
                // Also create an initial billing cycle for the new home
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 60);
                
                await supabase.from('ps_billing_cycles').insert({
                    home_id: homeId,
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                    is_active: true
                });
            }

            // Create all rooms
            const roomsToInsert = rooms.map(room => ({
                home_id: homeId,
                name: room.name,
                type: room.type
            }));

            const { data: createdRooms, error: roomsError } = await supabase
                .from('ps_rooms')
                .insert(roomsToInsert)
                .select();

            if (roomsError) throw roomsError;

            // Create appliances for each room
            const appliancesToInsert = [];
            for (let i = 0; i < rooms.length; i++) {
                const roomData = rooms[i];
                const createdRoom = createdRooms[i];

                if (roomData.appliances.length > 0) {
                    roomData.appliances.forEach(app => {
                        appliancesToInsert.push({
                            room_id: createdRoom.id,
                            name: app.name,
                            type: app.type || app.name,
                            wattage: parseFloat(app.wattage) || 100
                        });
                    });
                }
            }

            if (appliancesToInsert.length > 0) {
                const { error: appsError } = await supabase
                    .from('ps_appliances')
                    .insert(appliancesToInsert);
                if (appsError) throw appsError;
            }

            navigate('/dashboard');
        } catch (error) {
            console.error('Setup wizard error:', error);
            toast.error(error.message || 'Failed to save configuration');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="wizard-container">
            <Link to="/dashboard" className="wizard-home-btn" title="Back to Dashboard">
                <HiHome />
            </Link>
            <div className={`wizard-card ${isInitialLoading ? 'is-loading' : ''}`}>
                <div className="wizard-header">
                    <h1 className="wizard-title-fade">
                        {isInitialLoading ? 'Loading Details...' : (existingHomeId ? 'Edit Your Home' : 'Set Up Your Home')}
                    </h1>
                    <div className="step-indicator">
                        <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
                        <div className="step-line"></div>
                        <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
                        <div className="step-line"></div>
                        <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
                    </div>
                </div>

                {isInitialLoading ? (
                    <div className="wizard-step loading-step">
                        <div className="skeleton-group">
                            <div className="skeleton-label"></div>
                            <div className="skeleton-input"></div>
                        </div>
                        <div className="skeleton-group">
                            <div className="skeleton-label"></div>
                            <div className="skeleton-input"></div>
                        </div>
                        <div className="skeleton-button"></div>
                    </div>
                ) : (
                    <>
                        {step === 1 && (
                    <div className="wizard-step">
                        <h2>Home Details</h2>
                        <div className="form-group">
                            <label>Home Name</label>
                            <input
                                type="text"
                                value={homeData.name}
                                onChange={(e) => setHomeData({ ...homeData, name: e.target.value })}
                                placeholder="My Home"
                            />
                        </div>
                        <div className="form-group">
                            <label>Number of Rooms</label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={homeData.totalRooms}
                                onChange={(e) => setHomeData({ ...homeData, totalRooms: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0) })}
                                onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                onWheel={(e) => e.target.blur()}
                            />
                        </div>
                        <button onClick={handleHomeSubmit} className="btn-primary btn-icon-right">
                            Next <HiArrowRight />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="wizard-step">
                        <h2>Configure Rooms</h2>
                        <div className="rooms-grid">
                            {rooms.map((room, index) => (
                                <div key={index} className="room-card">
                                    <input
                                        ref={index === 0 ? firstRoomInputRef : null}
                                        type="text"
                                        value={room.name}
                                        onChange={(e) => updateRoom(index, 'name', e.target.value)}
                                        className="room-name-input"
                                        placeholder={`Room ${index + 1}`}
                                    />
                                    <div className="room-type-wrapper" style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            value={room.type}
                                            onChange={(e) => updateRoom(index, 'type', e.target.value)}
                                            className="room-type-input"
                                            list="room-type-suggestions"
                                            placeholder="Room Type"
                                            style={{ width: '100%' }} // Ensure it matches select styling
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <datalist id="room-type-suggestions">
                            <option value="Bedroom" />
                            <option value="Hall" />
                            <option value="Kitchen" />
                            <option value="Bathroom" />
                            <option value="Balcony" />
                            <option value="Dining Room" />
                            <option value="Garage" />
                            <option value="Office" />
                            <option value="Utility Room" />
                        </datalist>

                        <div className="wizard-nav">
                            <button onClick={() => setStep(1)} className="btn-secondary btn-icon-left">
                                <HiArrowLeft /> Back
                            </button>
                            <button onClick={handleRoomsSubmit} className="btn-primary btn-icon-right">
                                Next <HiArrowRight />
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="wizard-step">
                        <h2>Add Appliances</h2>
                        {rooms.map((room, roomIndex) => {
                            return (
                                <div key={roomIndex} className="room-section">
                                    <h3>{room.name} ({room.type})</h3>
                                    
                                    {/* Selected Appliances */}
                                    {room.appliances.length > 0 && (
                                        <div className="selected-appliances">
                                            <p className="section-label">Selected Appliances:</p>
                                            <div className="selected-list">
                                                {room.appliances.map((app, appIdx) => (
                                                    <div key={appIdx} className="selected-appliance-tag">
                                                        <span>{app.name} ({app.wattage}W)</span>
                                                        <button 
                                                            className="remove-btn"
                                                            onClick={() => removeAppliance(roomIndex, appIdx)}
                                                        >
                                                            <HiXMark />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add Custom Appliance */}
                                    <div className="add-custom-appliance">
                                        <p className="section-label">Add Custom Appliance:</p>
                                        <div className="custom-appliance-form">
                                            <input
                                                type="text"
                                                placeholder="Appliance name"
                                                value={customApplianceForm[roomIndex]?.name || ''}
                                                onChange={(e) => updateCustomForm(roomIndex, 'name', e.target.value)}
                                                className="custom-input"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Wattage"
                                                value={customApplianceForm[roomIndex]?.wattage || ''}
                                                onChange={(e) => updateCustomForm(roomIndex, 'wattage', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                                                onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                                onWheel={(e) => e.target.blur()}
                                                className="custom-input wattage-input"
                                            />
                                            <button 
                                                className="add-custom-btn"
                                                onClick={() => addCustomAppliance(roomIndex)}
                                                disabled={!customApplianceForm[roomIndex]?.name || !customApplianceForm[roomIndex]?.wattage}
                                            >
                                                <HiPlus /> Add
                                            </button>
                                        </div>
                                    </div>

                                    {/* Common Appliances Library */}
                                    <p className="section-label">Or select from common appliances:</p>
                                    <div className="appliance-search-bar">
                                        <HiMagnifyingGlass className="search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Search appliances..."
                                            value={applianceSearch[roomIndex] || ''}
                                            onChange={(e) => setApplianceSearch(prev => ({
                                                ...prev,
                                                [roomIndex]: e.target.value
                                            }))}
                                            className="appliance-search-input"
                                        />
                                    </div>
                                    <div className="appliances-grid-container">
                                        <div className="appliances-grid">
                                            {appliances
                                                .filter(appliance => 
                                                    !applianceSearch[roomIndex] || 
                                                    appliance.type.toLowerCase().includes(applianceSearch[roomIndex].toLowerCase())
                                                )
                                                .map((appliance, appIndex) => {
                                                    const isSelected = room.appliances.some(a => a.type === appliance.type);
                                                    return (
                                                        <div
                                                            key={appIndex}
                                                            className={`appliance-card ${isSelected ? 'selected' : ''}`}
                                                            onClick={() => toggleAppliance(roomIndex, appliance)}
                                                        >
                                                            <div className="appliance-name">{appliance.type}</div>
                                                            <div className="appliance-power">{appliance.wattage}W</div>
                                                            {isSelected && <div className="check-mark">✓</div>}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="wizard-nav">
                            <button onClick={() => setStep(2)} className="btn-secondary btn-icon-left" disabled={loading}>
                                <HiArrowLeft /> Back
                            </button>
                            <button onClick={handleFinish} className="btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : (existingHomeId ? 'Save Changes' : 'Finish Setup')}
                            </button>
                        </div>
                    </div>
                )}
                    </>
                )}
            </div>
        </div>
    );
}
