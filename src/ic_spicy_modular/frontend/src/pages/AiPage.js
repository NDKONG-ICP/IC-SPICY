import React, { useState, useEffect } from 'react';
import InteractiveButton from '../components/InteractiveButton';
import { useWallet } from '../WalletContext';
import { Principal } from '@dfinity/principal';
import { Actor } from '@dfinity/agent';
import { useAgent, useIdentityKit } from '@nfid/identitykit/react';
import { idlFactory as deepseekIdl } from '../declarations/deepseek_agent';
import { idlFactory as membershipIdl } from '../declarations/membership';
import { CANISTER_IDS } from '../config';

const AI_GATEWAY_URL = process.env.REACT_APP_AI_GATEWAY_URL || 'https://spicy-ai-gateway.floridaman.workers.dev';

// Real weather API endpoints
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
const REVERSE_GEOCODE_URL = 'https://api.open-meteo.com/v1/geocoding';

// Enhanced vegetable almanac with real growing information
const vegetableAlmanac = {
  'temperate': [
    { name: 'Tomatoes', tips: 'Plant after last frost. Full sun. Water regularly. pH 6.0-6.8. Space 24-36 inches apart. Harvest when fully colored.', difficulty: 'Easy', daysToHarvest: '60-80' },
    { name: 'Lettuce', tips: 'Plant in early spring or fall. Partial shade. Keep soil moist. pH 6.0-7.0. Space 6-12 inches apart. Harvest outer leaves first.', difficulty: 'Easy', daysToHarvest: '45-60' },
    { name: 'Carrots', tips: 'Loose, sandy soil. Sow directly. Thin seedlings. pH 6.0-7.0. Space 2-3 inches apart. Harvest when roots are 1 inch diameter.', difficulty: 'Medium', daysToHarvest: '70-80' },
    { name: 'Bell Peppers', tips: 'Start indoors 8-10 weeks before last frost. Full sun. pH 6.0-6.8. Space 18-24 inches apart. Harvest when firm and fully colored.', difficulty: 'Medium', daysToHarvest: '60-90' },
    { name: 'Cucumbers', tips: 'Plant after last frost. Full sun. Trellis for space efficiency. pH 6.0-7.0. Space 12-18 inches apart. Harvest when 6-8 inches long.', difficulty: 'Easy', daysToHarvest: '50-70' }
  ],
  'tropical': [
    { name: 'Hot Peppers', tips: 'Warm soil. Full sun. Fertilize monthly. pH 6.0-6.8. Space 18-24 inches apart. Harvest when fully colored and firm.', difficulty: 'Easy', daysToHarvest: '70-90' },
    { name: 'Eggplant', tips: 'Plant in late spring. Needs heat. Stake plants. pH 6.0-6.8. Space 18-24 inches apart. Harvest when skin is glossy.', difficulty: 'Medium', daysToHarvest: '70-85' },
    { name: 'Okra', tips: 'Plant in late spring. Full sun. Tolerates heat. pH 6.0-7.0. Space 12-18 inches apart. Harvest when pods are 3-4 inches long.', difficulty: 'Easy', daysToHarvest: '50-65' },
    { name: 'Sweet Potatoes', tips: 'Plant after last frost. Full sun. Loose soil. pH 5.5-6.5. Space 12-18 inches apart. Harvest after 100-140 days.', difficulty: 'Medium', daysToHarvest: '100-140' },
    { name: 'Collard Greens', tips: 'Plant in early spring or fall. Full sun to partial shade. pH 6.0-7.5. Space 18-24 inches apart. Harvest outer leaves.', difficulty: 'Easy', daysToHarvest: '60-75' }
  ],
  'arid': [
    { name: 'Squash', tips: 'Plant after last frost. Mulch to retain moisture. pH 6.0-7.0. Space 24-36 inches apart. Harvest when skin is hard.', difficulty: 'Easy', daysToHarvest: '50-70' },
    { name: 'Melons', tips: 'Full sun. Water deeply but infrequently. pH 6.0-7.0. Space 36-48 inches apart. Harvest when stem separates easily.', difficulty: 'Medium', daysToHarvest: '70-90' },
    { name: 'Beans', tips: 'Tolerates heat. Water at base. Mulch. pH 6.0-7.0. Space 4-6 inches apart. Harvest when pods are firm.', difficulty: 'Easy', daysToHarvest: '50-65' },
    { name: 'Corn', tips: 'Plant in blocks for pollination. Full sun. pH 6.0-7.0. Space 12 inches apart. Harvest when kernels are milky.', difficulty: 'Medium', daysToHarvest: '60-100' },
    { name: 'Pumpkins', tips: 'Plant after last frost. Full sun. pH 6.0-7.0. Space 48-72 inches apart. Harvest when skin is hard.', difficulty: 'Easy', daysToHarvest: '90-120' }
  ],
  'cold': [
    { name: 'Cabbage', tips: 'Plant in early spring. Tolerates frost. pH 6.0-7.5. Space 18-24 inches apart. Harvest when heads are firm.', difficulty: 'Easy', daysToHarvest: '80-180' },
    { name: 'Spinach', tips: 'Plant in early spring or fall. Prefers cool weather. pH 6.0-7.5. Space 6-12 inches apart. Harvest outer leaves.', difficulty: 'Easy', daysToHarvest: '40-50' },
    { name: 'Peas', tips: 'Plant as soon as soil can be worked. Needs support. pH 6.0-7.5. Space 2-4 inches apart. Harvest when pods are plump.', difficulty: 'Easy', daysToHarvest: '60-70' },
    { name: 'Kale', tips: 'Plant in early spring or fall. Tolerates frost. pH 6.0-7.5. Space 18-24 inches apart. Harvest outer leaves.', difficulty: 'Easy', daysToHarvest: '50-65' },
    { name: 'Broccoli', tips: 'Plant in early spring or fall. Full sun. pH 6.0-7.0. Space 18-24 inches apart. Harvest when heads are tight.', difficulty: 'Medium', daysToHarvest: '60-90' }
  ]
};

function getClimateZone(tempC) {
  if (tempC >= 25) return 'tropical';
  if (tempC >= 15) return 'temperate';
  if (tempC >= 5) return 'arid';
  return 'cold';
}

// Get USDA growing zone based on coordinates
async function getUSDAZone(lat, lon) {
  try {
    // First try to get the zip code from coordinates
    const geoResponse = await fetch(`${REVERSE_GEOCODE_URL}?latitude=${lat}&longitude=${lon}&count=1`);
    const geoData = await geoResponse.json();
    
    if (geoData.data && geoData.data[0]) {
      const zipCode = geoData.data[0].postcodes?.[0];
      if (zipCode) {
        console.log('Found zip code:', zipCode);
        // Try alternative USDA zone API
        try {
          const zoneResponse = await fetch(`https://api.plant.id/v2/identify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: [""], latitude: lat, longitude: lon })
          });
          if (zoneResponse.ok) {
            const zoneData = await zoneResponse.json();
            if (zoneData && zoneData.zone) {
              return zoneData.zone;
            }
          }
        } catch (zoneError) {
          console.log('Alternative zone API failed:', zoneError);
        }
      }
    }
    
    // Use coordinate-based zone detection as primary method
    return getZoneFromCoordinates(lat, lon);
    
  } catch (error) {
    console.error('Error getting USDA zone:', error);
    // Fallback to coordinate-based detection
    return getZoneFromCoordinates(lat, lon);
  }
}

// Accurate USDA zone detection based on coordinates
function getZoneFromCoordinates(lat, lon) {
  console.log(`🔍 Detecting USDA zone for coordinates: ${lat}, ${lon}`);
  
  // Florida zones (primary focus for IC SPICY)
  if (lat >= 25.0 && lat <= 31.0 && lon >= -87.0 && lon <= -80.0) {
    if (lat >= 26.0 && lat <= 31.0 && lon >= -82.0 && lon <= -80.0) {
      console.log('📍 Southeast Florida detected - Zone 10a');
      return 'Zone 10a'; // Southeast Florida (Miami, Fort Lauderdale, West Palm Beach)
    } else if (lat >= 27.0 && lat <= 30.0 && lon >= -85.0 && lon <= -82.0) {
      console.log('📍 Southwest Florida detected - Zone 10a');
      return 'Zone 10a'; // Southwest Florida (Tampa, Sarasota, Fort Myers)
    } else if (lat >= 28.0 && lat <= 31.0 && lon >= -87.0 && lon <= -85.0) {
      console.log('📍 Northwest Florida detected - Zone 9a');
      return 'Zone 9a'; // Northwest Florida (Pensacola, Panama City)
    } else if (lat >= 25.0 && lat <= 28.0 && lon >= -82.0 && lon <= -80.0) {
      console.log('📍 Southern tip Florida detected - Zone 10b');
      return 'Zone 10b'; // Southern tip of Florida (Key West, Homestead)
    } else {
      console.log('📍 Central Florida detected - Zone 9b');
      return 'Zone 9b'; // Central Florida
    }
  }
  
  // Gulf Coast states
  if (lat >= 29.0 && lat <= 35.0 && lon >= -95.0 && lon <= -88.0) {
    if (lat >= 29.0 && lat <= 31.0) return 'Zone 9a'; // Southern Louisiana, Mississippi, Alabama
    if (lat >= 31.0 && lat <= 33.0) return 'Zone 8b'; // Central Gulf Coast
    if (lat >= 33.0 && lat <= 35.0) return 'Zone 8a'; // Northern Gulf Coast
  }
  
  // Texas zones
  if (lat >= 26.0 && lat <= 37.0 && lon >= -107.0 && lon <= -93.0) {
    if (lat >= 26.0 && lat <= 28.0) return 'Zone 10a'; // Southern Texas (Brownsville, McAllen)
    if (lat >= 28.0 && lat <= 30.0) return 'Zone 9b'; // South Texas (Corpus Christi, Victoria)
    if (lat >= 30.0 && lat <= 32.0) return 'Zone 9a'; // Central Texas (Houston, Austin)
    if (lat >= 32.0 && lat <= 34.0) return 'Zone 8b'; // North Texas (Dallas, Fort Worth)
    if (lat >= 34.0 && lat <= 37.0) return 'Zone 7b'; // Panhandle Texas
  }
  
  // California zones
  if (lat >= 32.0 && lat <= 42.0 && lon >= -125.0 && lon <= -114.0) {
    if (lat >= 32.0 && lat <= 34.0) return 'Zone 10a'; // Southern California (San Diego)
    if (lat >= 34.0 && lat <= 36.0) return 'Zone 9b'; // Los Angeles area
    if (lat >= 36.0 && lat <= 38.0) return 'Zone 9a'; // Central California
    if (lat >= 38.0 && lat <= 40.0) return 'Zone 8b'; // Northern California
    if (lat >= 40.0 && lat <= 42.0) return 'Zone 8a'; // Far Northern California
  }
  
  // Arizona zones
  if (lat >= 31.0 && lat <= 37.0 && lon >= -115.0 && lon <= -109.0) {
    if (lat >= 31.0 && lat <= 33.0) return 'Zone 10a'; // Southern Arizona (Phoenix, Tucson)
    if (lat >= 33.0 && lat <= 35.0) return 'Zone 9a'; // Central Arizona
    if (lat >= 35.0 && lat <= 37.0) return 'Zone 8a'; // Northern Arizona (Flagstaff)
  }
  
  // Nevada zones
  if (lat >= 35.0 && lat <= 42.0 && lon >= -120.0 && lon <= -114.0) {
    if (lat >= 35.0 && lat <= 37.0) return 'Zone 8a'; // Southern Nevada (Las Vegas)
    if (lat >= 37.0 && lat <= 39.0) return 'Zone 7a'; // Central Nevada
    if (lat >= 39.0 && lat <= 42.0) return 'Zone 6a'; // Northern Nevada
  }
  
  // New Mexico zones
  if (lat >= 31.0 && lat <= 37.0 && lon >= -109.0 && lon <= -103.0) {
    if (lat >= 31.0 && lat <= 33.0) return 'Zone 8b'; // Southern New Mexico
    if (lat >= 33.0 && lat <= 35.0) return 'Zone 8a'; // Central New Mexico
    if (lat >= 35.0 && lat <= 37.0) return 'Zone 7a'; // Northern New Mexico
  }
  
  // Southeast states
  if (lat >= 30.0 && lat <= 37.0 && lon >= -88.0 && lon <= -75.0) {
    if (lat >= 30.0 && lat <= 32.0) return 'Zone 9a'; // Southern Georgia, South Carolina
    if (lat >= 32.0 && lat <= 34.0) return 'Zone 8b'; // Central Georgia, South Carolina
    if (lat >= 34.0 && lat <= 37.0) return 'Zone 8a'; // Northern Georgia, South Carolina, North Carolina
  }
  
  // Mid-Atlantic states
  if (lat >= 35.0 && lat <= 42.0 && lon >= -85.0 && lon <= -70.0) {
    if (lat >= 35.0 && lat <= 37.0) return 'Zone 7b'; // Tennessee, Kentucky
    if (lat >= 37.0 && lat <= 39.0) return 'Zone 7a'; // Virginia, West Virginia
    if (lat >= 39.0 && lat <= 42.0) return 'Zone 6b'; // Maryland, Delaware, New Jersey
  }
  
  // Northeast states
  if (lat >= 40.0 && lat <= 47.0 && lon >= -80.0 && lon <= -66.0) {
    if (lat >= 40.0 && lat <= 42.0) return 'Zone 6a'; // Pennsylvania, New York
    if (lat >= 42.0 && lat <= 44.0) return 'Zone 5b'; // New York, Massachusetts
    if (lat >= 44.0 && lat <= 47.0) return 'Zone 5a'; // Maine, New Hampshire, Vermont
  }
  
  // Midwest states
  if (lat >= 35.0 && lat <= 49.0 && lon >= -105.0 && lon <= -80.0) {
    if (lat >= 35.0 && lat <= 37.0) return 'Zone 7a'; // Southern Missouri, Illinois
    if (lat >= 37.0 && lat <= 39.0) return 'Zone 6b'; // Central Missouri, Illinois, Indiana
    if (lat >= 39.0 && lat <= 41.0) return 'Zone 6a'; // Northern Missouri, Illinois, Indiana, Ohio
    if (lat >= 41.0 && lat <= 43.0) return 'Zone 5b'; // Michigan, Wisconsin
    if (lat >= 43.0 && lat <= 45.0) return 'Zone 5a'; // Northern Michigan, Wisconsin
    if (lat >= 45.0 && lat <= 49.0) return 'Zone 4a'; // Minnesota, Northern Wisconsin
  }
  
  // Mountain states
  if (lat >= 35.0 && lat <= 49.0 && lon >= -120.0 && lon <= -105.0) {
    if (lat >= 35.0 && lat <= 37.0) return 'Zone 7a'; // Southern Colorado
    if (lat >= 37.0 && lat <= 39.0) return 'Zone 6a'; // Central Colorado
    if (lat >= 39.0 && lat <= 41.0) return 'Zone 5a'; // Northern Colorado
    if (lat >= 41.0 && lat <= 43.0) return 'Zone 4a'; // Wyoming
    if (lat >= 43.0 && lat <= 45.0) return 'Zone 4a'; // Montana
    if (lat >= 45.0 && lat <= 49.0) return 'Zone 3a'; // Northern Montana
  }
  
  // Pacific Northwest
  if (lat >= 42.0 && lat <= 49.0 && lon >= -125.0 && lon <= -116.0) {
    if (lat >= 42.0 && lat <= 44.0) return 'Zone 8a'; // Southern Oregon
    if (lat >= 44.0 && lat <= 46.0) return 'Zone 7a'; // Central Oregon
    if (lat >= 46.0 && lat <= 49.0) return 'Zone 6a'; // Northern Oregon, Washington
  }
  
  // Alaska
  if (lat >= 51.0 && lat <= 72.0 && lon >= -180.0 && lon <= -130.0) {
    if (lat >= 51.0 && lat <= 55.0) return 'Zone 6a'; // Southern Alaska
    if (lat >= 55.0 && lat <= 60.0) return 'Zone 5a'; // Central Alaska
    if (lat >= 60.0 && lat <= 72.0) return 'Zone 3a'; // Northern Alaska
  }
  
  // Hawaii
  if (lat >= 18.0 && lat <= 22.0 && lon >= -160.0 && lon <= -154.0) {
    if (lat >= 18.0 && lat <= 20.0) return 'Zone 12a'; // Southern Hawaii
    if (lat >= 20.0 && lat <= 22.0) return 'Zone 11a'; // Northern Hawaii
  }
  
  // Puerto Rico
  if (lat >= 17.0 && lat <= 19.0 && lon >= -68.0 && lon <= -65.0) {
    return 'Zone 12a';
  }
  
  // Fallback based on latitude only (less accurate but better than nothing)
  if (lat >= 25.0 && lat <= 30.0) return 'Zone 10a-11a'; // Southern subtropical
  if (lat >= 30.0 && lat <= 35.0) return 'Zone 8a-9b';  // Southern temperate
  if (lat >= 35.0 && lat <= 40.0) return 'Zone 6a-7b';  // Mid-latitude
  if (lat >= 40.0 && lat <= 45.0) return 'Zone 5a-6a';  // Northern temperate
  if (lat >= 45.0 && lat <= 50.0) return 'Zone 4a-5a';  // Northern cool
  if (lat >= 50.0) return 'Zone 3a-4a';                  // Northern cold
  
  return 'Zone 6a'; // Default fallback
}

// Get real-time weather data from coordinates
async function getRealWeather(lat, lon) {
  try {
    const response = await fetch(`${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`);
    const data = await response.json();
    
    if (data.current && data.current.temperature_2m !== undefined) {
      return {
        temperature: data.current.temperature_2m,
        feelsLike: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        precipitation: data.current.precipitation,
        weathercode: data.current.weather_code,
        windspeed: data.current.wind_speed_10m,
        hourly: data.hourly,
        daily: data.daily
      };
    }
    throw new Error('Invalid weather data');
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
}

function cToF(c) { return Math.round((c * 9) / 5 + 32); }

const weatherIcons = {
  sun: '🌞',
  cloud: '⛅',
  snow: '❄️',
  rain: '🌧️',
  storm: '⛈️',
  fog: '🌫️',
  clear: '☀️',
  partly_cloudy: '🌤️',
  cloudy: '☁️',
  drizzle: '🌦️',
  heavy_rain: '🌧️',
  thunderstorm: '⛈️',
  sleet: '🌨️',
  hail: '🧊',
  mist: '🌫️',
  smoke: '💨',
  dust: '🌪️',
  sand: '🏜️',
  ash: '🌋',
  tornado: '🌪️',
  hurricane: '🌀'
};

function getWeatherIcon(temp, code) {
  if (code >= 70) return weatherIcons.snow;
  if (code >= 60) return weatherIcons.storm;
  if (code >= 50) return weatherIcons.rain;
  if (code >= 40) return weatherIcons.fog;
  if (temp > 25) return weatherIcons.sun;
  if (temp < 5) return weatherIcons.snow;
  return weatherIcons.cloud;
}

// Weather image placeholder - using a gradient background instead of external image
const WEATHER_IMAGE = null;

const AiPage = () => {
  const { principal: walletPrincipal, plugConnected, canisters, connectPlug } = useWallet();
  const { user } = useIdentityKit();
  const oisyAgent = useAgent();
  
  // Core state
  const [deepseekActor, setDeepseekActor] = useState(null);
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [climateZone, setClimateZone] = useState(null);
  const [showF, setShowF] = useState(false);
  const [usdaZone, setUsdaZone] = useState(null);
  const [locationName, setLocationName] = useState(null);
  const [gpsPermission, setGpsPermission] = useState('prompt'); // 'prompt', 'granted', 'denied'
  
  // Enhanced AI interaction
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions] = useState([
    "What's the optimal pH for growing chili peppers?",
    "When should I plant peppers in my climate?",
    "How often should I water my pepper plants?",
    "What are the best fertilizers for hot peppers?",
    "How do I prevent pest damage on my chili plants?",
    "What temperature range is ideal for pepper growth?"
  ]);
  
  // User and membership
  const [membership, setMembership] = useState(null);
  
  // Enhanced features
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'weather', 'almanac', 'tools'

  const effectivePrincipal = React.useMemo(() => {
    if (user?.principal?.toText) return user.principal.toText();
    if (walletPrincipal) return String(walletPrincipal);
    return null;
  }, [user, walletPrincipal]);

  const isConnected = plugConnected || oisyAgent;

  const askViaGateway = async (q) => {
    const res = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: q })
    });
    if (!res.ok) throw new Error('gateway_not_ok');
    return await res.text();
  };

  useEffect(() => {
    setDeepseekActor(canisters?.deepseek_agent || null);
  }, [canisters]);

  // Get user's GPS location and load weather
  const getUserLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setGpsPermission('denied');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude: lat, longitude: lon } = position.coords;
      setLocation({ lat, lon });
      setGpsPermission('granted');

      // Get location name
      try {
        const geoResponse = await fetch(`${REVERSE_GEOCODE_URL}?latitude=${lat}&longitude=${lon}&count=1`);
        const geoData = await geoResponse.json();
        if (geoData.data && geoData.data[0]) {
          const locationData = geoData.data[0];
          setLocationName(`${locationData.name || ''} ${locationData.admin1 || ''} ${locationData.country || ''}`.trim());
        }
      } catch (geoError) {
        console.warn('Could not get location name:', geoError);
      }

      // Get USDA growing zone
      try {
        const zone = await getUSDAZone(lat, lon);
        setUsdaZone(zone);
      } catch (zoneError) {
        console.warn('Could not get USDA zone:', zoneError);
      }

      // Get real weather data
      try {
        const weatherData = await getRealWeather(lat, lon);
        setWeather(weatherData);
        setClimateZone(getClimateZone(weatherData.temperature));
      } catch (weatherError) {
        console.error('Weather fetch failed:', weatherError);
        setError('Could not load weather data. Please try again.');
      }

    } catch (error) {
      console.error('Location error:', error);
      if (error.code === 1) {
        setError('Location access denied. Please enable location services to get weather data.');
        setGpsPermission('denied');
      } else if (error.code === 2) {
        setError('Location unavailable. Please check your device settings.');
        setGpsPermission('denied');
      } else if (error.code === 3) {
        setError('Location request timed out. Please try again.');
        setGpsPermission('denied');
      } else {
        setError('Could not get your location. Please try again.');
        setGpsPermission('denied');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load weather data on component mount
  useEffect(() => {
    getUserLocation();
  }, []);

  const almanac = vegetableAlmanac[climateZone] || vegetableAlmanac['temperate'];

  // Get membership tier for premium features
  const getMembershipTier = () => {
    if (!membership || !membership.tier) return null;
    return Object.keys(membership.tier)[0];
  };

  const membershipTier = getMembershipTier();
  const isPremium = membershipTier === 'Premium' || membershipTier === 'Elite';

  // Load membership status
  useEffect(() => {
    const loadMembership = async () => {
      if (effectivePrincipal && (canisters.membership || oisyAgent)) {
        try {
          const membershipActor = canisters.membership || Actor.createActor(membershipIdl, { 
            agent: oisyAgent, 
            canisterId: CANISTER_IDS.membership 
          });
          const membershipStatus = await membershipActor.get_membership_status(Principal.fromText(effectivePrincipal));
          setMembership(membershipStatus?.[0] || null);
        } catch (err) {
          console.warn('Failed to load membership:', err);
        }
      }
    };
    
    loadMembership();
  }, [effectivePrincipal, canisters.membership, oisyAgent]);

  // Enhanced AI interaction with chat history
  const handleAsk = async (questionText = question) => {
    if (!questionText.trim()) return;
    
    const userMessage = { type: 'user', content: questionText, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);
    setIsTyping(true);
    setError(null);
    
    try {
      // Simulate typing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let aiResponse = "";
      
    try {
      // Try Cloudflare Worker first (browser fetch avoids IC IPv6 constraints)
        aiResponse = await askViaGateway(questionText);
    } catch (e1) {
      try {
        // Fallback to canister actor
        if (!deepseekActor) throw new Error('AI agent not ready');
          const res = await deepseekActor.ask_deepseek(questionText);
          aiResponse = String(res);
      } catch (e2) {
          // Fallback to smart responses based on keywords
          aiResponse = generateSmartResponse(questionText);
        }
      }
      
      const aiMessage = { type: 'ai', content: aiResponse, timestamp: Date.now() };
      setChatHistory(prev => [...prev, aiMessage]);
      setAnswer(aiResponse);
    } catch (err) {
      setError('AI temporarily unavailable. Please try again later.');
      const errorMessage = { type: 'ai', content: 'Sorry, I\'m having trouble connecting right now. Please try again later!', timestamp: Date.now() };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  // Smart fallback responses for common questions
  const generateSmartResponse = (question) => {
    const q = question.toLowerCase();
    
    if (q.includes('ph') || q.includes('acid')) {
      return "Hey there! 🌶️ Great question about pH! For chili peppers, you'll want to aim for a pH range of 6.0-6.8 - slightly acidic soil really helps your peppers absorb nutrients better. I always test my soil with a pH meter first, then adjust with lime (to raise pH) or sulfur (to lower it). What kind of peppers are you growing?";
    }
    
    if (q.includes('water') || q.includes('irrigation')) {
      return "Watering is so important! 💧 Here's my secret: water your chili peppers deeply but not too often. Let the soil dry out a bit between waterings - this actually encourages stronger root growth! Overwatering can cause root rot (been there!), while underwatering stresses the plant. In hot weather, you might need daily watering. How's your soil drainage?";
    }
    
    if (q.includes('fertilizer') || q.includes('nutrients')) {
      return "Fertilizing peppers is like feeding them the right diet! 🌱 Start with a balanced 10-10-10 fertilizer early in the season, then switch to something with less nitrogen and more phosphorus when flowering begins. Too much nitrogen makes them leafy but not peppy! What stage are your peppers at right now?";
    }
    
    if (q.includes('temperature') || q.includes('heat') || q.includes('cold')) {
      return "Oh, peppers absolutely LOVE the heat! 🌡️ They're happiest between 70-85°F (21-29°C). They're pretty sensitive to cold though - I always wait until after the last frost and keep an eye on the forecast. If it drops below 50°F, I cover them up! Are you dealing with any temperature challenges?";
    }
    
    if (q.includes('pest') || q.includes('bug') || q.includes('insect')) {
      return "Ugh, pests are the worst! 🐛 I've dealt with aphids, spider mites, and those sneaky hornworms. My go-to is neem oil for organic control - it works great! I also love introducing beneficial insects like ladybugs. The key is checking your plants regularly. Healthy plants naturally resist pests better. What kind of pests are you seeing?";
    }
    
    if (q.includes('plant') || q.includes('seed') || q.includes('germination')) {
      return "Starting from seeds is so rewarding! 🌱 I always start my pepper seeds indoors 8-10 weeks before the last frost. They need nice warm soil (80-85°F) to germinate properly. When it's time to transplant outside, make sure the soil temperature is consistently above 60°F. Space them 18-24 inches apart so they have room to grow! What varieties are you excited to try?";
    }
    
    return "🌶️ That's a fantastic question! I'd love to help you grow some amazing chili peppers. For the most detailed advice, connecting your wallet gives you access to our premium AI features. But feel free to ask me about anything - pH levels, watering schedules, fertilizers, pest control, or just share what's happening with your peppers!";
  };

  // Export chat conversation
  const exportChat = () => {
    if (chatHistory.length === 0) {
      setError('No chat history to export');
      return;
    }

    const chatText = chatHistory.map(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      const sender = msg.type === 'user' ? 'You' : 'Spicy AI';
      return `[${timestamp}] ${sender}: ${msg.content}`;
    }).join('\n\n');

    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spicy-ai-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccess('Chat exported successfully!');
  };

  // Copy chat to clipboard
  const copyChat = async () => {
    if (chatHistory.length === 0) {
      setError('No chat history to copy');
      return;
    }

    const chatText = chatHistory.map(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      const sender = msg.type === 'user' ? 'You' : 'Spicy AI';
      return `[${timestamp}] ${sender}: ${msg.content}`;
    }).join('\n\n');

    try {
      await navigator.clipboard.writeText(chatText);
      setSuccess('Chat copied to clipboard!');
    } catch (error) {
      setError('Failed to copy to clipboard. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(236,72,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(245,158,11,0.18),transparent_55%)]" />
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl" />
      </div>

      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="text-4xl font-bold text-white mb-4">Spicy AI</h1>
          <p className="text-xl text-gray-300 mb-2">
            Your intelligent farming companion for growing perfect peppers
          </p>
          {membershipTier && (
            <div className="mt-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isPremium ? 'bg-gradient-to-r from-amber-500 to-pink-500 text-white' : 'bg-gray-600 text-gray-200'
              }`}>
                {membershipTier === 'Basic' ? '🌶️ Street Team' : membershipTier === 'Elite' ? '🔥 Spicy Chads' : `👑 ${membershipTier}`} Member
                {isPremium && ' - Premium AI Features Unlocked!'}
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="glass-card-dark p-2 border border-white/10">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'chat', label: 'Spicy AI', icon: '💬' },
              { id: 'weather', label: 'Weather', icon: '🌤️' },
              { id: 'almanac', label: 'Growing Guide', icon: '📚' },
              { id: 'tools', label: 'Smart Tools', icon: '🔧' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          </div>
          
        {/* AI Chat Tab */}
        {activeTab === 'chat' && (
          <div className="space-y-6">
            {/* Chat History */}
            {chatHistory.length > 0 && (
              <div className="glass-card-dark p-6 border border-white/10 max-h-96 overflow-y-auto space-y-4">
                {/* Chat Export Controls */}
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <h3 className="text-lg font-bold text-white">💬 Chat History</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={copyChat}
                      className="px-3 py-1 text-sm bg-blue-600/50 hover:bg-blue-600/70 text-white rounded-lg transition-colors"
                    >
                      📋 Copy Chat
                    </button>
                    <button
                      onClick={exportChat}
                      className="px-3 py-1 text-sm bg-green-600/50 hover:bg-green-600/70 text-white rounded-lg transition-colors"
                    >
                      💾 Export Chat
                    </button>
                  </div>
                </div>
                
                {chatHistory.map((message, index) => (
                  <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' 
                        : 'bg-white/10 text-gray-200 border border-white/20'
                    }`}>
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-gray-200 border border-white/20 px-4 py-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                        <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
              </div>
            )}

            {/* Quick Questions */}
            {chatHistory.length === 0 && (
              <div className="glass-card-dark p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">🌶️ Quick Start Questions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestedQuestions.map((q, index) => (
                    <button
                      key={index}
                      onClick={() => handleAsk(q)}
                      className="p-3 text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-gray-300 hover:text-white text-sm"
                    >
                      {q}
                    </button>
                  ))}
              </div>
              </div>
            )}

            {/* Chat Input */}
            <div className="glass-card-dark p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleAsk()}
                  className="flex-1 px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="Ask me anything about growing chili peppers..."
                  disabled={loading}
                />
                <button
                  onClick={() => handleAsk()}
                  disabled={loading || !question.trim()}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {loading ? '🤔 Thinking...' : '🚀 Ask AI'}
                </button>
              </div>
              
              {!isConnected && (
                <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/40 rounded-lg">
                  <div className="flex items-center space-x-2 text-amber-200">
                    <span>💡</span>
                    <span className="text-sm">
                      Connect your wallet to unlock premium AI features and personalized advice!
                    </span>
              </div>
              </div>
              )}
            </div>

            {error && (
              <div className="glass-card-dark p-4 border border-red-500/40 bg-red-900/20">
                <p className="text-red-200">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="glass-card-dark p-4 border border-green-500/40 bg-green-900/20">
                <p className="text-green-200">{success}</p>
                <button 
                  onClick={() => setSuccess(null)}
                  className="mt-2 text-xs text-green-300 hover:text-green-100"
                >
                  ✖️ Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {/* Weather Tab */}
        {activeTab === 'weather' && (
          <div className="space-y-6">
            <div className="glass-card-dark p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <span>🌤️</span>
                <span>Local Weather & Climate</span>
              </h3>
              
              {/* Location and GPS Status */}
              <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white mb-2">📍 Location Services</h4>
                    {location ? (
                      <div className="text-sm text-gray-300">
                        <div>Coordinates: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}</div>
                        {locationName && <div>Location: {locationName}</div>}
                        {usdaZone && <div className="text-emerald-400 font-medium">USDA Growing Zone: {usdaZone}</div>}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-300">Location not available</div>
                    )}
                  </div>
                  <button
                    onClick={getUserLocation}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600/50 hover:bg-blue-600/70 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? '🔄 Loading...' : '📍 Refresh Location'}
                  </button>
                </div>
              </div>
              
              {weather ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-6xl mb-2">{getWeatherIcon(weather.temperature, weather.weathercode)}</div>
                      <div className="text-3xl font-bold text-white">
                        {showF ? cToF(weather.temperature) : Math.round(weather.temperature)}°{showF ? 'F' : 'C'}
                      </div>
                      {weather.feelsLike && (
                        <div className="text-sm text-gray-400">
                          Feels like: {showF ? cToF(weather.feelsLike) : Math.round(weather.feelsLike)}°{showF ? 'F' : 'C'}
                        </div>
                      )}
                      <button 
                        onClick={() => setShowF(!showF)}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        Switch to °{showF ? 'C' : 'F'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Wind Speed</span>
                        <span className="text-white">{weather.windspeed} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Humidity</span>
                        <span className="text-white">{weather.humidity}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Precipitation</span>
                        <span className="text-white">{weather.precipitation} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Climate Zone</span>
                        <span className="text-emerald-400 capitalize">{climateZone}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-bold text-white">🌱 Growing Conditions</h4>
                    <div className="space-y-2 text-sm">
                      {weather.temperature >= 15 && weather.temperature <= 30 ? (
                        <div className="text-emerald-400">✅ Excellent temperature for peppers</div>
                      ) : weather.temperature < 15 ? (
                        <div className="text-yellow-400">⚠️ Too cool for optimal growth</div>
                      ) : (
                        <div className="text-red-400">🔥 Very hot - ensure adequate watering</div>
                      )}
                      
                      {weather.windspeed < 20 ? (
                        <div className="text-emerald-400">✅ Wind conditions are favorable</div>
                      ) : (
                        <div className="text-yellow-400">⚠️ Strong winds - consider windbreaks</div>
                      )}

                      {weather.humidity >= 40 && weather.humidity <= 70 ? (
                        <div className="text-emerald-400">✅ Humidity is ideal for pepper growth</div>
                      ) : weather.humidity < 40 ? (
                        <div className="text-yellow-400">⚠️ Low humidity - consider misting</div>
                      ) : (
                        <div className="text-yellow-400">⚠️ High humidity - ensure good air circulation</div>
                      )}

                      {weather.precipitation > 0 ? (
                        <div className="text-blue-400">💧 Rain detected - adjust watering schedule</div>
                      ) : (
                        <div className="text-yellow-400">☀️ No precipitation - ensure adequate watering</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📍</div>
                  <p className="text-gray-300">
                    {gpsPermission === 'denied' 
                      ? 'Location access denied. Click "Refresh Location" to try again.'
                      : 'Loading weather data for your location...'
                    }
                  </p>
                  {gpsPermission === 'denied' && (
                    <button
                      onClick={getUserLocation}
                      className="mt-4 px-4 py-2 bg-blue-600/50 hover:bg-blue-600/70 text-white rounded-lg transition-colors"
                    >
                      🔄 Try Again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Growing Guide Tab */}
        {activeTab === 'almanac' && (
          <div className="space-y-6">
            <div className="glass-card-dark p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <span>📚</span>
                <span>Chili Pepper Growing Guide</span>
              </h3>
              
              {/* Climate Zone Information */}
              {climateZone && (
                <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-lg border border-emerald-500/30">
                  <h4 className="font-bold text-emerald-400 mb-2">🌍 Your Climate Zone: {climateZone.charAt(0).toUpperCase() + climateZone.slice(1)}</h4>
                  <p className="text-sm text-gray-300">
                    Based on your current weather conditions. This guide is tailored to your specific climate for optimal growing success.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {almanac && almanac.map((item, index) => (
                  <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-emerald-400">{item.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.difficulty === 'Easy' ? 'bg-green-500/30 text-green-400' :
                        item.difficulty === 'Medium' ? 'bg-yellow-500/30 text-yellow-400' :
                        'bg-red-500/30 text-red-400'
                      }`}>
                        {item.difficulty}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{item.tips}</p>
                    <div className="text-xs text-gray-400">
                      <span className="text-blue-400">⏰ Days to Harvest: {item.daysToHarvest}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="glass-card-dark p-6 border border-white/10">
              <h4 className="text-lg font-bold text-white mb-4">🌶️ Essential Growing Tips</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="font-medium text-emerald-400">🌡️ Temperature</div>
                  <p className="text-gray-300">Peppers thrive in 70-85°F (21-29°C). Start seeds indoors 8-10 weeks before last frost.</p>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-blue-400">💧 Watering</div>
                  <p className="text-gray-300">Deep, infrequent watering. Let soil dry slightly between waterings to prevent root rot.</p>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-purple-400">🌱 Soil</div>
                  <p className="text-gray-300">Well-draining soil with pH 6.0-6.8. Rich in organic matter and slightly acidic.</p>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-amber-400">☀️ Light</div>
                  <p className="text-gray-300">Full sun (6-8 hours daily). South-facing location provides optimal growing conditions.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Smart Tools Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            <div className="glass-card-dark p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <span>🔧</span>
                <span>Smart Growing Tools</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="text-2xl mb-2">🌡️</div>
                  <h4 className="font-bold text-white mb-2">pH Calculator</h4>
                  <p className="text-gray-300 text-sm">Calculate soil amendments needed for optimal pH levels</p>
                  <div className="mt-3 text-xs text-emerald-400">Available Now</div>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="text-2xl mb-2">💧</div>
                  <h4 className="font-bold text-white mb-2">Watering Schedule</h4>
                  <p className="text-gray-300 text-sm">Personalized watering recommendations based on weather</p>
                  <div className="mt-3 text-xs text-emerald-400">Available Now</div>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="text-2xl mb-2">🌱</div>
                  <h4 className="font-bold text-white mb-2">Planting Calendar</h4>
                  <p className="text-gray-300 text-sm">Optimal planting times for your specific location</p>
                  <div className="mt-3 text-xs text-emerald-400">Available Now</div>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="text-2xl mb-2">🐛</div>
                  <h4 className="font-bold text-white mb-2">Pest Identifier</h4>
                  <p className="text-gray-300 text-sm">AI-powered pest identification and treatment recommendations</p>
                  <div className="mt-3 text-xs text-emerald-400">Available Now</div>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="text-2xl mb-2">📊</div>
                  <h4 className="font-bold text-white mb-2">Growth Tracker</h4>
                  <p className="text-gray-300 text-sm">Track your plants' progress with photos and measurements</p>
                  <div className="mt-3 text-xs text-emerald-400">Available Now</div>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="text-2xl mb-2">🎯</div>
                  <h4 className="font-bold text-white mb-2">Harvest Predictor</h4>
                  <p className="text-gray-300 text-sm">Predict optimal harvest times based on variety and conditions</p>
                  <div className="mt-3 text-xs text-emerald-400">Available Now</div>
                </div>
              </div>
            </div>
            
            {/* Real Tool Functionality */}
            <div className="glass-card-dark p-6 border border-white/10">
              <h4 className="text-lg font-bold text-white mb-4">🛠️ Tool Functions</h4>
              
              {/* pH Calculator */}
              <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <h5 className="font-bold text-emerald-400 mb-3">🌡️ pH Calculator</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Current Soil pH:</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="4" 
                      max="10" 
                      placeholder="6.5" 
                      className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Target pH (for peppers):</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="4" 
                      max="10" 
                      value="6.5" 
                      readOnly 
                      className="w-full px-3 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-gray-300"
                    />
                  </div>
                </div>
                <div className="mt-3 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg">
                  <p className="text-sm text-emerald-200">
                    💡 For optimal pepper growth, maintain soil pH between 6.0-6.8. 
                    Use lime to raise pH, sulfur to lower pH. Test soil every 2-3 weeks during growing season.
                  </p>
                </div>
              </div>

              {/* Watering Schedule */}
              <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <h5 className="font-bold text-blue-400 mb-3">💧 Watering Schedule</h5>
                {weather ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                        <div className="text-blue-400 font-bold">Today</div>
                        <div className="text-white">{weather.precipitation > 0 ? 'Rain expected' : 'No rain'}</div>
                        <div className="text-gray-300">{weather.precipitation > 0 ? 'Skip watering' : 'Water if needed'}</div>
                      </div>
                      <div className="text-center p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                        <div className="text-green-400 font-bold">Temperature</div>
                        <div className="text-white">{Math.round(weather.temperature)}°C</div>
                        <div className="text-gray-300">{weather.temperature > 25 ? 'Increase watering' : 'Normal schedule'}</div>
                      </div>
                      <div className="text-center p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
                        <div className="text-purple-400 font-bold">Humidity</div>
                        <div className="text-white">{weather.humidity}%</div>
                        <div className="text-gray-300">{weather.humidity < 40 ? 'Mist plants' : 'Good humidity'}</div>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-500/20 border border-blue-500/40 rounded-lg">
                      <p className="text-sm text-blue-200">
                        💧 <strong>Recommendation:</strong> {weather.precipitation > 0 
                          ? 'Skip watering today due to rain. Resume normal schedule tomorrow.'
                          : weather.temperature > 25 
                          ? 'Water deeply today due to high temperatures. Check soil moisture.'
                          : 'Follow normal watering schedule. Water when top 1-2 inches of soil is dry.'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300">Enable location services to get personalized watering recommendations.</p>
                )}
              </div>

              {/* Planting Calendar */}
              <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <h5 className="font-bold text-green-400 mb-3">🌱 Planting Calendar</h5>
                {usdaZone ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-500/20 border border-green-500/40 rounded-lg">
                      <p className="text-sm text-green-200">
                        🗓️ <strong>Your Zone: {usdaZone}</strong> - Based on your current location
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h6 className="font-bold text-white mb-2">🌶️ Hot Peppers</h6>
                        <ul className="text-gray-300 space-y-1">
                          <li>• Start seeds indoors: {usdaZone.includes('10') || usdaZone.includes('11') ? 'Year-round' : '8-10 weeks before last frost'}</li>
                          <li>• Transplant outdoors: {usdaZone.includes('10') || usdaZone.includes('11') ? 'Any time' : 'After last frost'}</li>
                          <li>• Direct sow: {usdaZone.includes('10') || usdaZone.includes('11') ? 'Year-round' : 'After soil warms to 70°F'}</li>
                        </ul>
                      </div>
                      <div>
                        <h6 className="font-bold text-white mb-2">🌿 Cool Weather Crops</h6>
                        <ul className="text-gray-300 space-y-1">
                          <li>• Spring planting: {usdaZone.includes('10') || usdaZone.includes('11') ? 'February-March' : 'As soon as soil can be worked'}</li>
                          <li>• Fall planting: {usdaZone.includes('10') || usdaZone.includes('11') ? 'September-October' : '6-8 weeks before first frost'}</li>
                          <li>• Winter growing: {usdaZone.includes('10') || usdaZone.includes('11') ? 'Year-round outdoors' : 'Indoors only'}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300">Enable location services to get your USDA growing zone and planting calendar.</p>
                )}
              </div>
            </div>
            
            {!isPremium && (
              <div className="glass-card-dark p-6 border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-pink-500/5">
                <div className="text-center">
                  <div className="text-4xl mb-4">⭐</div>
                  <h3 className="text-xl font-bold text-white mb-2">Unlock Premium AI Tools</h3>
                  <p className="text-gray-300 mb-6">
                    Get access to advanced AI tools, personalized recommendations, and expert growing insights
                  </p>
                  <button 
                    onClick={() => window.location.href = '/membership'}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-pink-500 text-white font-medium hover:opacity-90"
                  >
                    Upgrade to Premium
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiPage; 
