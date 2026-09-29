import { StateData, AnonymizedReport } from "./types";
import {
  ALL_INDIA_STATES,
  ALL_DISTRICT_COORDS,
  getDistrictCoordinates,
  getSoilProfileWithFallback,
  getNearestKvkContact,
} from "./data/indiaData";
import { getLocalizedFallbackAdvisory } from "./data/panIndiaAdvisory";

export {
  ALL_INDIA_STATES,
  ALL_DISTRICT_COORDS,
  getDistrictCoordinates,
  getSoilProfileWithFallback,
  getNearestKvkContact,
  getLocalizedFallbackAdvisory,
};
export const SEEDED_STATES: StateData[] = ALL_INDIA_STATES;
export const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = ALL_DISTRICT_COORDS;

// Pan-India synthetic records covering all agro-climatic zones across India
export function generateSyntheticReports(): AnonymizedReport[] {
  const reports: AnonymizedReport[] = [];

  const cropsByRegion: Record<string, string[]> = {
    // Himalayan & Hill states
    "Himachal Pradesh": ["Apple", "Maize", "Kidney Beans (Rajma)", "Barley", "Ginger"],
    "Jammu and Kashmir": ["Apple", "Saffron", "Walnut", "Rice", "Mustard"],
    Uttarakhand: ["Finger Millet (Ragi)", "Basmati Rice", "Soybean", "Apple"],
    
    // Coastal & Southern states
    Kerala: ["Black Pepper", "Cardamom", "Coconut", "Banana", "Rice", "Cassava"],
    "Tamil Nadu": ["Rice", "Sugarcane", "Groundnut", "Banana", "Cotton", "Millets"],
    Karnataka: ["Maize", "Ragi", "Coffee", "Sunflower", "Sugarcane", "Pigeonpea"],
    "Andhra Pradesh": ["Rice", "Chilli", "Cotton", "Groundnut", "Tobacco", "Sweet Orange"],
    Telangana: ["Cotton", "Rice", "Maize", "Chilli", "Turmeric"],
    Puducherry: ["Rice", "Sugarcane", "Groundnut", "Banana"],
    
    // Arid & Western states
    Rajasthan: ["Pearl Millet (Bajra)", "Mustard", "Cluster Bean (Guar)", "Wheat", "Cumin", "Moth Bean"],
    Gujarat: ["Cotton", "Groundnut", "Castor", "Wheat", "Cumin", "Sesame"],
    Maharashtra: ["Cotton", "Sugarcane", "Soybean", "Grapes", "Onion", "Tur (Arhar)"],
    Goa: ["Cashew", "Coconut", "Rice", "Arecanut"],

    // Gangetic Plains & Central
    Punjab: ["Wheat", "Rice (Basmati)", "Cotton", "Maize", "Mustard"],
    Haryana: ["Wheat", "Mustard", "Rice", "Cotton", "Pearl Millet"],
    "Uttar Pradesh": ["Wheat", "Sugarcane", "Rice", "Potato", "Mustard", "Lentil"],
    "Madhya Pradesh": ["Soybean", "Wheat", "Gram (Chickpea)", "Mustard", "Garlic", "Coriander"],
    Bihar: ["Rice", "Wheat", "Maize", "Lentil", "Jute", "Litchi"],
    Chhattisgarh: ["Rice", "Maize", "Black Gram", "Kodo Millet"],

    // Eastern & Northeastern states
    "West Bengal": ["Rice", "Jute", "Tea", "Potato", "Mustard", "Pointed Gourd"],
    Odisha: ["Rice", "Groundnut", "Mustard", "Ragi", "Green Gram"],
    Assam: ["Tea", "Rice (Joha)", "Jute", "Ginger", "Turmeric", "Mustard"],
    Meghalaya: ["Turmeric (Lakadong)", "Ginger", "Orange", "Rice", "Arecanut"],
    Tripura: ["Rice", "Rubber", "Pineapple", "Jute"],
    "Arunachal Pradesh": ["Large Cardamom", "Ginger", "Apple", "Rice", "Millets"],

    // Island territories
    "Andaman and Nicobar Islands": ["Coconut", "Arecanut", "Black Pepper", "Banana", "Clove"],
  };

  const diseasesByCrop: Record<string, string[]> = {
    Rice: ["Blast Disease (Pyricularia oryzae)", "Bacterial Leaf Blight", "Brown Spot", "Sheath Blight"],
    Wheat: ["Yellow Rust (Puccinia striiformis)", "Leaf Rust", "Powdery Mildew", "Karnal Bunt"],
    Cotton: ["Bollworm Infestation", "Cotton Leaf Curl Virus", "Aphids & Jassids", "Bacterial Blight"],
    Sugarcane: ["Red Rot (Colletotrichum falcatum)", "Whip Smut", "Grassy Shoot Disease"],
    Soybean: ["Yellow Mosaic Virus", "Charcoal Rot", "Anthracnose"],
    Apple: ["Apple Scab (Venturia inaequalis)", "Powdery Mildew", "Alternaria Leaf Blotch", "Fire Blight"],
    "Black Pepper": ["Quick Wilt (Phytophthora capsici)", "Pollu Disease", "Slow Decline"],
    Cardamom: ["Azhukal Rot", "Cardamom Mosaic (Katte Disease)", "Clump Rot"],
    Coconut: ["Bud Rot (Phytophthora)", "Root Wilt Disease", "Stem Bleeding"],
    Tea: ["Red Rust", "Blister Blight (Exobasidium vexans)", "Black Rot"],
    "Pearl Millet (Bajra)": ["Downy Mildew (Green Ear)", "Ergot (Claviceps fusiformis)", "Blast"],
    "Cluster Bean (Guar)": ["Bacterial Blight", "Alternaria Leaf Spot", "Powdery Mildew"],
    Mustard: ["White Rust (Albugo candida)", "Alternaria Blight", "Downy Mildew"],
    Chilli: ["Anthracnose Fruit Rot", "Chilli Leaf Curl Virus", "Powdery Mildew"],
    Banana: ["Sigatoka Leaf Spot", "Panama Wilt (Fusarium)", "Banana Bunchy Top"],
    Maize: ["Fall Armyworm", "Turcicum Leaf Blight", "Common Rust"],
    Potato: ["Late Blight (Phytophthora infestans)", "Early Blight", "Black Scurf"],
    Onion: ["Purple Blotch (Alternaria porri)", "Stemphylium Blight", "Basal Rot"],
    Groundnut: ["Tikka Leaf Spot", "Rust", "Collar Rot"],
    "Turmeric (Lakadong)": ["Leaf Spot", "Rhizome Rot", "Taphrina Leaf Spot"],
    Ginger: ["Soft Rot (Pythium)", "Bacterial Wilt", "Phyllosticta Leaf Spot"],
  };

  // Diverse test locations representing every geographical quadrant of India
  const panIndiaDistricts = [
    // North (Himalayan & Plains)
    { state: "Punjab", district: "Ludhiana" },
    { state: "Punjab", district: "Bathinda" },
    { state: "Himachal Pradesh", district: "Kangra" },
    { state: "Himachal Pradesh", district: "Shimla" },
    { state: "Jammu and Kashmir", district: "Baramulla" },
    { state: "Haryana", district: "Karnal" },

    // South (Coastal, Ghats, Peninsula, UT)
    { state: "Kerala", district: "Ernakulam" },
    { state: "Kerala", district: "Wayanad" },
    { state: "Tamil Nadu", district: "Coimbatore" },
    { state: "Tamil Nadu", district: "Thanjavur" },
    { state: "Karnataka", district: "Dharwad" },
    { state: "Karnataka", district: "Mandya" },
    { state: "Telangana", district: "Warangal" },
    { state: "Andhra Pradesh", district: "Guntur" },
    { state: "Puducherry", district: "Puducherry" },
    { state: "Puducherry", district: "Karaikal" },

    // West (Arid, Plateau, Coastal)
    { state: "Rajasthan", district: "Jodhpur" },
    { state: "Rajasthan", district: "Jaipur" },
    { state: "Rajasthan", district: "Jaisalmer" },
    { state: "Maharashtra", district: "Nashik" },
    { state: "Maharashtra", district: "Pune" },
    { state: "Maharashtra", district: "Nagpur" },
    { state: "Gujarat", district: "Rajkot" },
    { state: "Gujarat", district: "Surat" },

    // East & Northeast
    { state: "West Bengal", district: "Nadia" },
    { state: "West Bengal", district: "Murshidabad" },
    { state: "Bihar", district: "Patna" },
    { state: "Bihar", district: "Muzaffarpur" },
    { state: "Odisha", district: "Cuttack" },
    { state: "Assam", district: "Kamrup" },
    { state: "Assam", district: "Jorhat" },
    { state: "Meghalaya", district: "East Khasi Hills" },
    { state: "Tripura", district: "West Tripura" },

    // Central & Islands
    { state: "Madhya Pradesh", district: "Indore" },
    { state: "Uttar Pradesh", district: "Varanasi" },
    { state: "Uttar Pradesh", district: "Lucknow" },
    { state: "Andaman and Nicobar Islands", district: "South Andaman" },
  ];

  const now = new Date();
  const totalReportsToGenerate = 320;

  for (let i = 0; i < totalReportsToGenerate; i++) {
    const rDist = panIndiaDistricts[i % panIndiaDistricts.length];
    const coords = getDistrictCoordinates(rDist.district, rDist.state);
    
    const crops = cropsByRegion[rDist.state] || ["Rice", "Wheat", "Maize"];
    const crop = crops[Math.floor((i * 5) % crops.length)];
    
    const cropDiseases = diseasesByCrop[crop] || [
      "Fungal Leaf Spot (Cercospora spp.)",
      "Powdery Mildew",
      "Bacterial Blight",
      "Root Rot Complex"
    ];
    const disease = cropDiseases[Math.floor((i * 11) % cropDiseases.length)];
    
    const dateOffsetDays = (i * 3) % 28;
    const reportDate = new Date(now.getTime() - dateOffsetDays * 24 * 60 * 60 * 1000);
    
    // Controlled geographical jitter around the actual district coordinates
    const latJitter = Math.sin(i * 1.618) * 0.08;
    const lngJitter = Math.cos(i * 1.618) * 0.08;

    reports.push({
      id: `rep_pan_${i}`,
      state: rDist.state,
      district: rDist.district,
      crop,
      disease,
      date: reportDate.toISOString(),
      latitude: Number((coords.lat + latJitter).toFixed(4)),
      longitude: Number((coords.lng + lngJitter).toFixed(4)),
    });
  }

  return reports;
}

export const INITIAL_ANONYMIZED_REPORTS = generateSyntheticReports();
