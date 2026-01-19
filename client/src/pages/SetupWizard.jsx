import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HiHome, HiPlus, HiXMark, HiMagnifyingGlass } from 'react-icons/hi2';
import api from '../api';
import './SetupWizard.css';

export default function SetupWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [appliances, setAppliances] = useState([]);

    // Form data
    const [homeData, setHomeData] = useState({ name: 'My Home', totalRooms: 3 });
    const [rooms, setRooms] = useState([]);
    const [existingHomeId, setExistingHomeId] = useState(null); // Track existing home to prevent duplicates

    useEffect(() => {
        // Fetch appliance library
        const fetchAppliances = async () => {
            try {
                const response = await api.get('/api/appliances/library');
                setAppliances(response.data);
            } catch (error) {
                console.error('Error fetching appliances:', error);
            }
        };

        // Check if user already has a home configured
        const checkExistingHome = async () => {
            try {
                console.log('🔍 Checking for existing home...');
                const response = await api.get('/api/homes');
                if (response.data && response.data.length > 0) {
                    const existingHome = response.data[0];
                    console.log('✅ Found existing home:', existingHome.name);

                    // Store existing home ID to prevent duplicate creation
                    setExistingHomeId(existingHome.id);

                    // Populate form with existing data
                    setHomeData({
                        name: existingHome.name,
                        totalRooms: existingHome.totalRooms || existingHome.rooms?.length || 3
                    });

                    // Populate rooms if they exist
                    const roomsData = existingHome.rooms || existingHome.Rooms || [];
                    if (roomsData.length > 0) {
                        const formattedRooms = roomsData.map(room => ({
                            id: room.id,
                            name: room.name,
                            type: room.type,
                            appliances: (room.appliances || room.Appliances || []).map(app => ({
                                id: app.id,
                                name: app.name,
                                // Use type if available, otherwise use name (for library matching)
                                type: app.type || app.name,
                                wattage: app.wattage,
                                isExisting: true // Mark as existing appliance
                            }))
                        }));
                        setRooms(formattedRooms);
                        console.log(`✅ Loaded ${formattedRooms.length} existing rooms with appliances:`, 
                            formattedRooms.map(r => ({ name: r.name, appliances: r.appliances.length })));
                    }
                } else {
                    console.log('ℹ️ No existing home found - starting fresh');
                }
            } catch (error) {
                console.error('⚠️ Error checking existing home:', error);
                // Not critical - user can still create new
            }
        };

        fetchAppliances();
        checkExistingHome();
    }, []);

    const handleHomeSubmit = () => {
        // Check if we already have rooms loaded (from existing home)
        if (rooms.length > 0) {
            // If total rooms changed, adjust the rooms array
            if (rooms.length !== homeData.totalRooms) {
                const newRooms = [...rooms];
                
                if (homeData.totalRooms > rooms.length) {
                    // Add new rooms
                    for (let i = rooms.length; i < homeData.totalRooms; i++) {
                        newRooms.push({
                            name: `Room ${i + 1}`,
                            type: 'bedroom',
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
                name: `Room ${i + 1}`,
                type: 'bedroom',
                appliances: []
            });
        }
        setRooms(initialRooms);
        setStep(2);
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

    const initCustomForm = (roomIndex) => {
        if (!customApplianceForm[roomIndex]) {
            setCustomApplianceForm(prev => ({
                ...prev,
                [roomIndex]: { name: '', wattage: '' }
            }));
        }
    };

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
            let homeId;

            if (existingHomeId) {
                // Use existing home - don't create a new one!
                homeId = existingHomeId;
                console.log('✅ Using existing home ID:', homeId);

                // Update home name if changed
                await api.put(`/api/homes/${homeId}`, homeData);

                // Delete existing rooms (this will cascade to delete appliances)
                const currentHome = await api.get(`/api/homes/${homeId}`);
                const existingRooms = currentHome.data.rooms || [];
                
                console.log(`🗑️ Deleting ${existingRooms.length} existing rooms...`);
                for (const room of existingRooms) {
                    await api.delete(`/api/rooms/${room.id}`);
                }
                console.log('✅ Existing rooms deleted');
            } else {
                // Create new home only if one doesn't exist
                console.log('📝 Creating new home...');
                const homeResponse = await api.post('/api/homes', homeData);
                homeId = homeResponse.data.id;
                console.log('✅ Created new home with ID:', homeId);
            }

            // Prepare rooms data
            const roomsData = rooms.map(room => ({
                name: room.name,
                type: room.type,
                squareFootage: 100
            }));

            // Create all rooms at once
            const roomsResponse = await api.post(`/api/homes/${homeId}/rooms`, {
                rooms: roomsData
            });

            console.log(`✅ Created ${roomsResponse.data.length} rooms`);

            // Create appliances for each room
            for (let i = 0; i < rooms.length; i++) {
                const room = rooms[i];
                const createdRoom = roomsResponse.data[i];

                if (room.appliances.length > 0) {
                    const appliancesData = room.appliances.map(app => {
                        // Ensure type field exists and is not empty
                        const applianceType = app.type || app.name;

                        if (!applianceType) {
                            console.error('❌ Appliance missing type:', app);
                            throw new Error('Appliance data is invalid - missing type');
                        }

                        return {
                            name: app.name || applianceType,
                            type: applianceType,
                            wattage: app.wattage || 100 // Default to 100W if missing
                        };
                    });

                    console.log(`📤 Creating ${appliancesData.length} appliances for ${room.name}`);

                    await api.post(`/api/homes/${homeId}/rooms/${createdRoom.id}/appliances`, {
                        appliances: appliancesData
                    });

                    console.log(`✅ Appliances created for ${room.name}`);
                }
            }

            navigate('/dashboard');
        } catch (error) {
            console.error('❌ Setup wizard error:', error);
            console.error('Error details:', error.response?.data);
            console.error('Error message:', error.message);

            let errorMessage = 'Failed to save configuration. ';

            if (error.response?.data?.error) {
                errorMessage += error.response.data.error;
            } else if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Please try again.';
            }

            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="wizard-container">
            <Link to="/dashboard" className="wizard-home-btn" title="Back to Dashboard">
                <HiHome />
            </Link>
            <div className="wizard-card">
                <div className="wizard-header">
                    <h1>{existingHomeId ? 'Edit Your Home' : 'Set Up Your Home'}</h1>
                    <div className="step-indicator">
                        <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
                        <div className="step-line"></div>
                        <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
                        <div className="step-line"></div>
                        <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
                    </div>
                </div>

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
                                onChange={(e) => setHomeData({ ...homeData, totalRooms: parseInt(e.target.value) })}
                            />
                        </div>
                        <button onClick={handleHomeSubmit} className="btn-primary">
                            Next →
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
                                        type="text"
                                        value={room.name}
                                        onChange={(e) => updateRoom(index, 'name', e.target.value)}
                                        className="room-name-input"
                                    />
                                    <select
                                        value={room.type}
                                        onChange={(e) => updateRoom(index, 'type', e.target.value)}
                                        className="room-type-select"
                                    >
                                        <option value="bedroom">Bedroom</option>
                                        <option value="hall">Hall</option>
                                        <option value="kitchen">Kitchen</option>
                                        <option value="bathroom">Bathroom</option>
                                        <option value="balcony">Balcony</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                        <div className="wizard-nav">
                            <button onClick={() => setStep(1)} className="btn-secondary">
                                ← Back
                            </button>
                            <button onClick={() => setStep(3)} className="btn-primary">
                                Next →
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="wizard-step">
                        <h2>Add Appliances</h2>
                        {rooms.map((room, roomIndex) => {
                            initCustomForm(roomIndex);
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
                                                onChange={(e) => updateCustomForm(roomIndex, 'wattage', e.target.value)}
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
                            <button onClick={() => setStep(2)} className="btn-secondary" disabled={loading}>
                                ← Back
                            </button>
                            <button onClick={handleFinish} className="btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : (existingHomeId ? 'Save Changes' : 'Finish Setup')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
