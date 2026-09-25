export type CaseStatus =
  | 'ACTIVE INVESTIGATION'
  | 'RESOLVED & CLOSED'
  | 'PENDING AIS DATA'
  | 'ARCHIVED CASE';

export type CaseSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface CaseItem {
  id: string;
  title: string;
  date: string;
  status: CaseStatus;
  region: string;
  severity: CaseSeverity;
  center: [number, number]; // [lat, lng]
  spillAreaKm2: number;
  confidence: number;
  satellite: string;
  sensor: string;
  estimatedVolumeBbl?: number;
  dischargeType?: string;
  incidentSummary?: string;
}

export interface CandidateVessel {
  id: string;
  name: string;
  mmsi: string;
  type: string;
  flag: string;
  flagCode: string;
  lastPort: string;
  destination: string;
  spatialScore: number;
  temporalScore: number;
  behaviorScore: number;
  overallScore: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  wordingLabel: 'Priority Investigative Candidate';
  imo?: string;
  callSign?: string;
  cpaToOriginKm?: number;
  timeToOriginDeltaH?: number;
  anomalies: string[];
  track: Array<{
    timeH: number; // -48 to 0
    lat: number;
    lng: number;
    speedKnots: number;
    heading: number;
  }>;
  behaviorDetails?: {
    aisGapCount: number;
    maxGapDurationHours: number;
    speedAnomalies: number;
    courseDeviations: number;
    loiteringEvents: number;
  };
}

export interface SarImage {
  id: string;
  platform: 'Sentinel-1A' | 'Sentinel-1B' | 'RADARSAT-2' | 'Iceye-X4' | 'Capella-7';
  mode: 'IW GRD' | 'EW GRD' | 'ScanSAR' | 'Stripmap' | 'Spotlight';
  location: string;
  acquiredDate: string;
  size: string;
  polarization: 'VV + VH' | 'HH + HV' | 'VV' | 'HH';
  resolution: string;
  thumbnail: string;
  coordinates: [number, number];
  oilProbability: number;
  lookalikeProbability: number;
  leeFilterApplied: boolean;
  orbitPass: 'Ascending' | 'Descending';
  sceneCenter: string;
}

export interface ReportItem {
  id: string;
  caseId: string;
  title: string;
  date: string;
  type: 'Evidentiary Package' | 'Preliminary Assessment' | 'Forensic Drift Summary' | 'AIS Attribution Analysis';
  status: 'Final' | 'Draft' | 'Archived';
  sha256: string;
  fileSize: string;
  investigator: string;
  pages: number;
  classification: string;
  summary: string;
}

export interface DriftParticle {
  id: number;
  // path through time [-48h to 0h]
  positions: Array<{
    timeH: number;
    lat: number;
    lng: number;
  }>;
}

export interface UncertaintyEllipse {
  timeH: number;
  label: string;
  center: [number, number];
  radiusXKm: number;
  radiusYKm: number;
  angleDeg: number;
}

export interface IsoRing {
  probability: number; // 0.75, 0.90, 0.95
  label: string;
  points: [number, number][];
}

export interface MapLayerVisibility {
  spill: boolean;
  heatmap: boolean;
  bathymetry: boolean;
  oceanCurrents: boolean;
  uncertaintyEllipses: boolean;
  isoRings: boolean;
  particles: boolean;
  aisTracks: boolean;
  geoLabels: boolean;
}

export interface SimulationParams {
  windSpeed: number; // knots [0-45]
  windDirection: number; // deg [0-360]
  currentSpeed: number; // m/s [0.0-3.0]
  currentDirection: number; // deg [0-360]
  durationHours: number; // hours [6-96]
  particlesCount: number; // 100 - 2000
  windageFactor: number; // default 0.031
}

export interface SimulationResult {
  status: 'pending' | 'running' | 'complete';
  durationHours: number;
  windSpeed: number;
  windDirection: number;
  currentSpeed: number;
  currentDirection: number;
  displacementKm: number;
  originCenter: [number, number];
  confidenceRadiusKm: number;
  particlesAdvected: number;
  driftVector: { u: number; v: number; netSpeedKnots: number; netBearingDeg: number };
  sampleTrajectories: Array<Array<[number, number]>>;
  timestamp: string;
}
