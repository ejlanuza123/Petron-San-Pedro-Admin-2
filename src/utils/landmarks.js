// src/utils/landmarks.js

// Official Puerto Princesa City Barangays with GPS centroids & strict matching aliases
export const PUERTO_PRINCESA_BARANGAYS = [
  // Commercial & Urban Hubs
  { name: 'San Pedro', aliases: ['san pedro', 'brgy san pedro', 'barangay san pedro'], lat: 9.754820, lng: 118.748890 },
  { name: 'San Miguel', aliases: ['san miguel', 'brgy san miguel', 'barangay san miguel'], lat: 9.743330, lng: 118.739730 },
  { name: 'San Jose', aliases: ['san jose', 'brgy san jose', 'barangay san jose'], lat: 9.775000, lng: 118.748000 },
  { name: 'Tiniguiban', aliases: ['tiniguiban', 'brgy tiniguiban', 'barangay tiniguiban'], lat: 9.768000, lng: 118.742000 },
  { name: 'San Manuel', aliases: ['san manuel', 'brgy san manuel', 'barangay san manuel'], lat: 9.767098, lng: 118.748170 },
  { name: 'Santa Monica', aliases: ['santa monica', 'sta. monica', 'sta monica', 'brgy santa monica', 'brgy sta monica', 'brgy. sta. monica'], lat: 9.789000, lng: 118.736000 },
  { name: 'Bancao-Bancao', aliases: ['bancao-bancao', 'bancao bancao', 'bancao', 'brgy bancao-bancao'], lat: 9.732000, lng: 118.745000 },
  { name: 'Mandaragat', aliases: ['mandaragat', 'brgy mandaragat', 'barangay mandaragat'], lat: 9.743000, lng: 118.737000 },
  { name: 'Sicsican', aliases: ['sicsican', 'brgy sicsican', 'barangay sicsican'], lat: 9.805000, lng: 118.720000 },
  { name: 'Irawan', aliases: ['irawan', 'brgy irawan', 'barangay irawan'], lat: 9.799230, lng: 118.693720 },
  { name: 'Tagburos', aliases: ['tagburos', 'brgy tagburos', 'barangay tagburos'], lat: 9.825000, lng: 118.748000 },
  { name: 'Santa Lourdes', aliases: ['santa lourdes', 'sta. lourdes', 'sta lourdes', 'brgy santa lourdes'], lat: 9.845000, lng: 118.735000 },

  // Poblacion / Downtown Districts
  { name: 'Tagumpay', aliases: ['tagumpay', 'brgy tagumpay', 'barangay tagumpay'], lat: 9.739197, lng: 118.741160 },
  { name: 'Model', aliases: ['model', 'brgy model', 'barangay model'], lat: 9.740040, lng: 118.737270 },
  { name: 'Mabuhay', aliases: ['mabuhay', 'brgy mabuhay', 'barangay mabuhay'], lat: 9.739924, lng: 118.729580 },
  { name: 'Matiyaga', aliases: ['matiyaga', 'brgy matiyaga', 'barangay matiyaga'], lat: 9.743914, lng: 118.731650 },
  { name: 'Tanglaw', aliases: ['tanglaw', 'brgy tanglaw', 'barangay tanglaw'], lat: 9.739670, lng: 118.736970 },
  { name: 'Maligaya', aliases: ['maligaya', 'brgy maligaya', 'barangay maligaya'], lat: 9.740400, lng: 118.729900 },
  { name: 'Liwanag', aliases: ['liwanag', 'brgy liwanag', 'barangay liwanag'], lat: 9.740000, lng: 118.733000 },
  { name: 'Bagong Silang', aliases: ['bagong silang', 'brgy bagong silang'], lat: 9.740000, lng: 118.738000 },
  { name: 'Bagong Sikat', aliases: ['bagong sikat', 'brgy bagong sikat'], lat: 9.739000, lng: 118.732000 },
  { name: 'Bagong Pag-asa', aliases: ['bagong pag-asa', 'bagong pagasa', 'brgy bagong pag-asa'], lat: 9.742000, lng: 118.735000 },
  { name: 'Pagkakaisa', aliases: ['pagkakaisa', 'brgy pagkakaisa'], lat: 9.741000, lng: 118.730000 },
  { name: 'Milagrosa', aliases: ['milagrosa', 'brgy milagrosa'], lat: 9.747000, lng: 118.743000 },
  { name: 'Maningning', aliases: ['maningning', 'brgy maningning', 'barangay maningning'], lat: 9.745000, lng: 118.741000 },
  { name: 'Maunlad', aliases: ['maunlad', 'brgy maunlad'], lat: 9.746000, lng: 118.737000 },
  { name: 'Manggahan', aliases: ['manggahan', 'brgy manggahan'], lat: 9.748000, lng: 118.738000 },
  { name: 'Masipag', aliases: ['masipag', 'brgy masipag'], lat: 9.749000, lng: 118.739000 },
  { name: 'Princesa', aliases: ['princesa', 'brgy princesa'], lat: 9.743000, lng: 118.729000 },

  // Extended Corridors
  { name: 'Iwahig', aliases: ['iwahig', 'brgy iwahig'], lat: 9.742000, lng: 118.670000 },
  { name: 'Montible', aliases: ['montible', 'brgy montible'], lat: 9.715000, lng: 118.640000 },
  { name: 'Luzviminda', aliases: ['luzviminda', 'brgy luzviminda'], lat: 9.665000, lng: 118.678000 },
  { name: 'Mangingisda', aliases: ['mangingisda', 'brgy mangingisda'], lat: 9.702000, lng: 118.718000 },
  { name: 'Santa Cruz', aliases: ['santa cruz', 'sta. cruz', 'sta cruz', 'brgy santa cruz'], lat: 9.635000, lng: 118.665000 },
  { name: 'Bacungan', aliases: ['bacungan', 'brgy bacungan'], lat: 9.905000, lng: 118.705000 },
  { name: 'San Rafael', aliases: ['san rafael', 'brgy san rafael'], lat: 9.965000, lng: 118.780000 },
  { name: 'Cabayugan', aliases: ['cabayugan', 'brgy cabayugan'], lat: 10.180000, lng: 118.930000 },
  { name: 'Inagawan', aliases: ['inagawan', 'brgy inagawan'], lat: 9.550000, lng: 118.620000 }
];

// Rich verified catalog of landmarks, parks, historical sites, hospitals, universities, fast food, and malls in Puerto Princesa City
export const PUERTO_PRINCESA_LANDMARKS = [
  // 1. Malls & Shopping Hubs
  { 
    name: 'SM City Puerto Princesa', 
    address: 'Malvar St. cor. Lacao St.',
    aliases: ['sm', 'sm city', 'sm mall', 'sm puerto princesa', 'sm palawan'], 
    category: 'Mall', 
    icon: '🛍️', 
    barangay: 'San Miguel', 
    lat: 9.743330, 
    lng: 118.739730 
  },
  { 
    name: 'Robinsons Place Palawan', 
    address: 'National Highway',
    aliases: ['robinsons', 'robinsons place', 'robinsons palawan', 'rob place'], 
    category: 'Mall', 
    icon: '🛍️', 
    barangay: 'San Manuel', 
    lat: 9.767098, 
    lng: 118.748170 
  },
  { 
    name: 'NCCC Mall Palawan', 
    address: '89 Lacao St.',
    aliases: ['nccc', 'nccc mall', 'nccc palawan', 'nccc lacao'], 
    category: 'Mall', 
    icon: '🛍️', 
    barangay: 'Tagumpay', 
    lat: 9.739197, 
    lng: 118.741160 
  },
  { 
    name: 'MCA Market Mall', 
    address: 'Puerto Princesa City',
    aliases: ['mca', 'mca market mall', 'mca mall'], 
    category: 'Mall', 
    icon: '🛒', 
    barangay: 'Tagumpay', 
    lat: 9.746150, 
    lng: 118.746870 
  },

  // 2. Fast Food & Popular Dining Landmarks
  { 
    name: 'McDonald\'s Palawan', 
    address: 'Rizal Ave., Puerto Princesa City',
    aliases: ['mcdo palawan', 'mcdonalds palawan', 'mcdo rizal', 'mcdonalds rizal', 'mcdo downtown'], 
    category: 'Dining', 
    icon: '🍔', 
    barangay: 'Tagumpay', 
    lat: 9.740176132174744, 
    lng: 118.73940002154445 
  },
  { 
    name: 'McDonald\'s Palawan Junction', 
    address: 'National Highway cor. North Road (Junction), San Pedro',
    aliases: ['mcdo junction', 'mcdonalds junction', 'mcdonalds palawan junction', 'mcdo san pedro', 'junction mcdo'], 
    category: 'Dining', 
    icon: '🍔', 
    barangay: 'San Pedro', 
    lat: 9.753730185345674, 
    lng: 118.74785456387198 
  },
  { 
    name: 'Jollibee Rizal', 
    address: 'Rizal Ave.',
    aliases: ['jollibee', 'jollibee rizal', 'jollibee downtown', 'jollibee tagumpay'], 
    category: 'Dining', 
    icon: '🍔', 
    barangay: 'Tagumpay', 
    lat: 9.740021399485999, 
    lng: 118.74086598152886 
  },
  { 
    name: 'Jollibee Malvar', 
    address: 'Malvar St.',
    aliases: ['jollibee malvar', 'jb malvar'], 
    category: 'Dining', 
    icon: '🍔', 
    barangay: 'San Miguel', 
    lat: 9.742523844423165, 
    lng: 118.7367720008129 
  },
  { 
    name: 'Jollibee Palawan Drive Thru', 
    address: 'National Highway, San Pedro / Tiniguiban',
    aliases: ['jollibee drive thru', 'jollibee national highway', 'jollibee san pedro drive thru', 'jb drive thru'], 
    category: 'Dining', 
    icon: '🍔', 
    barangay: 'San Pedro', 
    lat: 9.764932750900057, 
    lng: 118.74667786758137 
  },

  // 3. Coliseums & Sports Hubs
  { 
    name: 'Edward S. Hagedorn Coliseum', 
    address: 'Peneyra Rd.',
    aliases: ['edward s. hagedorn coliseum', 'city coliseum', 'coliseum', 'hagedorn coliseum'], 
    category: 'Coliseum', 
    icon: '🏟️', 
    barangay: 'San Pedro', 
    lat: 9.754820, 
    lng: 118.748890 
  },
  { 
    name: 'Balayong People\'s Park', 
    address: 'Santa Monica / San Pedro',
    aliases: ['balayong', 'balayong park', "balayong people's park", 'balayong stadium', 'balayong sports complex'], 
    category: 'Park', 
    icon: '🌳', 
    barangay: 'Santa Monica', 
    lat: 9.784258202779807, 
    lng: 118.73487571858728 
  },

  // 4. Universities & Higher Education
  { 
    name: 'Palawan State University Main (PSU Main)', 
    address: 'Tiniguiban Heights',
    aliases: ['psu', 'psu main', 'palawan state university', 'palawan state university main'], 
    category: 'University', 
    icon: '🎓', 
    barangay: 'Tiniguiban', 
    lat: 9.777481112300949, 
    lng: 118.73380407921788 
  },
  { 
    name: 'Western Philippines University (WPU)', 
    address: 'Rafols Rd., Sta. Monica',
    aliases: ['wpu', 'western philippines university', 'western philippine university', 'wpu sta monica'], 
    category: 'University', 
    icon: '🎓', 
    barangay: 'Santa Monica', 
    lat: 9.785296999552756, 
    lng: 118.72800809456353 
  },
  { 
    name: 'Holy Trinity University (HTU Main)', 
    address: 'Quezon St. / Rizal Ave.',
    aliases: ['htu', 'holy trinity', 'holy trinity university', 'htu main', 'htu quezon'], 
    category: 'University', 
    icon: '🎓', 
    barangay: 'Maligaya', 
    lat: 9.741520357606452, 
    lng: 118.73267535223547 
  },
  { 
    name: 'Holy Trinity University (Sta. Monica Campus)', 
    address: 'National Highway, Sta. Monica',
    aliases: ['htu sta monica', 'holy trinity university sta monica', 'htu sta. monica campus', 'holy trinity university sta. monica campus'], 
    category: 'University', 
    icon: '🎓', 
    barangay: 'Santa Monica', 
    lat: 9.793819697645192, 
    lng: 118.73666428107279 
  },

  // 5. Hospitals & Medical Hubs
  { 
    name: 'Ospital ng Palawan (ONP)', 
    address: '220 Malvar St.',
    aliases: ['onp', 'ospital ng palawan', 'onp hospital', 'ospital'], 
    category: 'Hospital', 
    icon: '🏥', 
    barangay: 'San Miguel', 
    lat: 9.747932255771385, 
    lng: 118.74426312339932 
  },
  { 
    name: 'MMG-PPC Cooperative Hospital', 
    address: 'Burgos St.',
    aliases: ['mmg hospital', 'mmg', 'cooperative hospital'], 
    category: 'Hospital', 
    icon: '🏥', 
    barangay: 'San Pedro', 
    lat: 9.756200, 
    lng: 118.747500 
  },
  { 
    name: 'Adventist Hospital Palawan', 
    address: 'San Pedro',
    aliases: ['adventist hospital', 'adventist', 'sanitarium'], 
    category: 'Hospital', 
    icon: '🏥', 
    barangay: 'San Pedro', 
    lat: 9.751200, 
    lng: 118.749100 
  },

  // 6. Markets & Commercial
  { 
    name: 'New Public Market', 
    address: 'Puerto Princesa City, Palawan',
    aliases: ['new public market', 'bagong palengke', 'new market', 'new public market maunlad'], 
    category: 'Market', 
    icon: '🧺', 
    barangay: 'Maunlad', 
    lat: 9.746323051427998, 
    lng: 118.73824423098698 
  },
  { 
    name: 'Old Public Market', 
    address: 'Valencia St. / Malvar St.',
    aliases: ['old public market', 'public market', 'old market', 'palengke'], 
    category: 'Market', 
    icon: '🧺', 
    barangay: 'Tagumpay', 
    lat: 9.7422666, 
    lng: 118.7333285 
  },

  // 7. Parks & Waterfront
  { 
    name: 'Mendoza Park', 
    address: 'H. Mendoza St.',
    aliases: ['mendoza park', 'mendoza', 'higinio mendoza'], 
    category: 'Park', 
    icon: '🌳', 
    barangay: 'Model', 
    lat: 9.740040, 
    lng: 118.737270 
  },
  { 
    name: 'Plaza Cuartel', 
    address: 'Taft St.',
    aliases: ['plaza cuartel', 'cuartel', 'cuartel plaza'], 
    category: 'Historical Park', 
    icon: '🏛️', 
    barangay: 'Mabuhay', 
    lat: 9.739924, 
    lng: 118.729580 
  },
  { 
    name: 'Puerto Princesa City Baywalk Park', 
    address: 'Sandoval St.',
    aliases: ['baywalk', 'city baywalk', 'baywalk park', 'puerto princesa baywalk'], 
    category: 'Park / Waterfront', 
    icon: '🌊', 
    barangay: 'Matiyaga', 
    lat: 9.743914, 
    lng: 118.731650 
  },
  { 
    name: 'Princess Eulalia Park', 
    address: 'Rizal Ave.',
    aliases: ['princess eulalia park', 'eulalia park'], 
    category: 'Park', 
    icon: '🌸', 
    barangay: 'Liwanag', 
    lat: 9.740000, 
    lng: 118.733000 
  },

  // 8. Government & Civic
  { 
    name: 'Palawan Provincial Capitol', 
    address: 'Fernandez St.',
    aliases: ['capitol', 'provincial capitol', 'palawan capitol', 'kapitolyo'], 
    category: 'Government', 
    icon: '🏛️', 
    barangay: 'Santa Monica', 
    lat: 9.739250, 
    lng: 118.744040 
  },
  { 
    name: 'Palawan Museum', 
    address: 'Valencia St.',
    aliases: ['palawan museum', 'museum', 'museo'], 
    category: 'Museum', 
    icon: '🏛️', 
    barangay: 'Tanglaw', 
    lat: 9.739670, 
    lng: 118.736970 
  },

  // 9. Transportation Hubs
  { 
    name: 'Puerto Princesa International Airport', 
    address: 'National Highway',
    aliases: ['airport', 'paliparan', 'pps airport', 'international airport'], 
    category: 'Airport', 
    icon: '✈️', 
    barangay: 'San Miguel', 
    lat: 9.742220, 
    lng: 118.758610 
  },
  { 
    name: 'Puerto Princesa Port (City Pier)', 
    address: 'Port Area, Tagumpay',
    aliases: ['pier', 'city pier', 'puerto princesa port', 'port'], 
    category: 'Port', 
    icon: '⚓', 
    barangay: 'Tagumpay', 
    lat: 9.737000, 
    lng: 118.729000 
  },
  { 
    name: 'San Jose Integrated Bus & Jeepney Terminal', 
    address: 'San Jose',
    aliases: ['san jose terminal', 'bus terminal', 'san jose market'], 
    category: 'Terminal', 
    icon: '🚌', 
    barangay: 'San Jose', 
    lat: 9.783329, 
    lng: 118.7425823 
  },

  // 10. Churches & Religious
  { 
    name: 'Immaculate Conception Cathedral', 
    address: 'Taft St.',
    aliases: ['cathedral', 'immaculate conception', 'katedral'], 
    category: 'Church', 
    icon: '⛪', 
    barangay: 'Maligaya', 
    lat: 9.740400, 
    lng: 118.729900 
  },

  // 11. Tourism & Attractions
  { 
    name: 'Palawan Wildlife Rescue & Conservation Center', 
    address: 'South Road, Irawan',
    aliases: ['crocodile farm', 'croc farm'], 
    category: 'Attraction', 
    icon: '🐊', 
    barangay: 'Irawan', 
    lat: 9.799230, 
    lng: 118.693720 
  },
  { 
    name: 'Honda Bay Wharf', 
    address: 'Sta. Lourdes',
    aliases: ['honda bay', 'honda bay wharf'], 
    category: 'Wharf', 
    icon: '🚤', 
    barangay: 'Santa Lourdes', 
    lat: 9.890380, 
    lng: 118.808800 
  }
];

/**
 * Calculate Haversine distance in kilometers between two GPS coordinates
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance in meters or kilometers
 */
export function formatDistanceHuman(distanceKm) {
  if (distanceKm == null || isNaN(distanceKm)) return null;
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Find the nearest Puerto Princesa landmark to a coordinate
 */
export function detectNearestLandmark(latitude, longitude, maxDistanceKm = 5.0) {
  if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return null;
  let closest = null;
  let minDistance = Infinity;

  for (const lm of PUERTO_PRINCESA_LANDMARKS) {
    if (lm.lat && lm.lng) {
      const dist = calculateDistanceKm(latitude, longitude, lm.lat, lm.lng);
      if (dist != null && dist < minDistance) {
        minDistance = dist;
        closest = {
          ...lm,
          distanceKm: dist,
          formattedDistance: formatDistanceHuman(dist)
        };
      }
    }
  }

  if (closest && minDistance <= maxDistanceKm) {
    return closest;
  }
  return null;
}
