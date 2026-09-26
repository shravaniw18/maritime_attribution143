// POLARIS High-Tech Maritime Forensic GIS Engine Controller
let map;
let currentCaseId = "case_01_gulf_mexico";
let caseSummary = null;
let detectionData = null;
let driftData = null;
let candidatesData = [];
let selectedMmsi = null;
let activePanelId = "workflow";

// Basemaps
let baseLayers = {};
let currentBaseLayer = "dark";

// Overlay Layers
let spillLayer = L.featureGroup();
let heatmapLayer = null;
let ellipseLayer = L.featureGroup();
let probRingsLayer = L.featureGroup();
let contourLayer = L.featureGroup();
let currentVectorLayer = L.featureGroup();
let particleLayer = L.featureGroup();
let vesselLayer = L.featureGroup();
let animMarkerLayer = L.featureGroup();
let rulerLayer = L.featureGroup();

// Timeline & Measure State
let timelineHour = 0.0;
let isPlaying = false;
let playTimer = null;
let playSpeed = 1;
let isMeasuring = false;
let measurePoints = [];

// Active Weights
let currentWeights = {
    weight_spatial: 0.30,
    weight_temporal: 0.25,
    weight_trajectory: 0.20,
    weight_anomaly: 0.15,
    weight_vessel_type: 0.10,
    penalty_ais_gap: 0.10
};

let currentTheme = localStorage.getItem("polaris_theme") || "dark";

document.addEventListener("DOMContentLoaded", () => {
    initMap();
    setupEventListeners();
    initTheme();
    loadCaseData(currentCaseId);
    if (window.lucide) lucide.createIcons();
});

/* ── View Navigation (Landing vs Console) ── */
function showLandingView() {
    const landing = document.getElementById("landing-screen");
    const simView = document.getElementById("simulation-view");
    if (landing && simView) {
        simView.classList.add("hidden");
        landing.classList.remove("hidden");
    }
}

function showConsoleView() {
    const landing = document.getElementById("landing-screen");
    const simView = document.getElementById("simulation-view");
    if (landing && simView) {
        landing.classList.add("hidden");
        simView.classList.remove("hidden");
        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 100);
    }
}

/* ── Dynamic Right Panel Switcher ── */
function setActivePanel(panelId) {
    activePanelId = panelId;
    const panels = ["workflow", "evidence", "drift", "vessels"];
    panels.forEach(p => {
        const btn = document.getElementById(`btn-tab-${p}`);
        const panel = document.getElementById(`panel-${p}`);
        if (btn) btn.classList.toggle("active", p === panelId);
        if (panel) panel.classList.toggle("hidden", p !== panelId);
    });
}

function initMap() {
    baseLayers["dark"] = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
        className: "map-dark-tiles"
    });
    baseLayers["sat"] = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "&copy; Esri, Maxar",
        maxZoom: 18
    });
    baseLayers["topo"] = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenTopoMap",
        maxZoom: 17
    });
    baseLayers["light"] = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18
    });

    map = L.map("gis-map", {
        center: [28.38, -89.15],
        zoom: 9,
        zoomControl: true,
        layers: [baseLayers["dark"], spillLayer, ellipseLayer, probRingsLayer, contourLayer, currentVectorLayer, particleLayer, vesselLayer, animMarkerLayer, rulerLayer]
    });
    currentBaseLayer = "dark";

    map.on("mousemove", (e) => {
        const lat = e.latlng.lat.toFixed(4);
        const lon = e.latlng.lng.toFixed(4);
        const coordsEl = document.getElementById("cursor-coords");
        const depthEl = document.getElementById("cursor-depth");
        if (coordsEl) coordsEl.innerText = `Lat: ${lat}° | Lon: ${lon}°`;
        if (depthEl) {
            const estDepth = Math.round(75 + Math.abs(Math.sin(e.latlng.lat * 10) * 850));
            depthEl.innerText = `Depth: ~${estDepth} m`;
        }
    });

    map.on("click", (e) => {
        if (!isMeasuring) return;
        measurePoints.push(e.latlng);
        if (measurePoints.length === 1) {
            const m = L.circleMarker(e.latlng, { radius: 5, color: "#22d3ee", fillColor: "#0d9488", fillOpacity: 0.9 });
            rulerLayer.addLayer(m);
            showToast("Click second point on map to measure");
        } else if (measurePoints.length === 2) {
            const p1 = measurePoints[0];
            const p2 = measurePoints[1];
            const dKm = (p1.distanceTo(p2) / 1000).toFixed(2);
            const dNm = (dKm * 0.539957).toFixed(2);

            const line = L.polyline([p1, p2], { color: "#22d3ee", weight: 2.5, dashArray: "5, 5" });
            const mid = [(p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2];
            const tip = L.tooltip({ permanent: true, direction: "top" })
                .setLatLng(mid)
                .setContent(`<b>${dKm} km (${dNm} NM)</b>`);
            
            rulerLayer.addLayer(line);
            rulerLayer.addLayer(tip);
            showToast(`Distance: ${dKm} km (${dNm} NM)`);
            isMeasuring = false;
            measurePoints = [];
            const btn = document.getElementById("btn-measure-tool");
            if (btn) btn.classList.remove("bg-teal-500/30");
        }
    });
}

async function loadCaseData(caseId) {
    try {
        currentCaseId = caseId;
        const [summaryRes, detRes, driftRes, candRes] = await Promise.all([
            fetch("/api/cases").then(r => r.json()),
            fetch(`/api/detection/${caseId}`).then(r => r.json()),
            fetch(`/api/drift/${caseId}`).then(r => r.json()),
            fetch(`/api/attribution/${caseId}`).then(r => r.json())
        ]);

        caseSummary = summaryRes.find(c => c.case_id === caseId) || summaryRes[0];
        detectionData = detRes;
        driftData = driftRes;
        candidatesData = candRes;
        selectedMmsi = candidatesData.length > 0 ? candidatesData[0].mmsi : null;

        updateSidebarMetadata();
        renderSpillLayer();
        renderDriftLayers();
        renderVesselLayers();
        renderCandidateList();
        renderCandidateDetail();
        fitAllLayers();
        updateActiveWeightsUI();
        showToast(`Loaded scenario: ${caseSummary.title}`);
    } catch (err) {
        console.error("Error loading case:", err);
        showToast("Error loading case data");
    }
}

function updateSidebarMetadata() {
    if (!detectionData || !driftData) return;
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

    setText("meta-mission", detectionData.satellite_mission);
    setText("meta-acq-time", new Date(detectionData.acquisition_time).toISOString().replace("T", " ").substring(0, 16) + " UTC");
    setText("meta-centroid", `${detectionData.centroid_lat.toFixed(3)}°N, ${detectionData.centroid_lon.toFixed(3)}°E`);
    setText("meta-extent", `${detectionData.surface_area_sqkm.toFixed(2)} km²`);
    setText("meta-confidence", `${(detectionData.detection_confidence * 100).toFixed(1)}%`);
    setText("meta-oil-prob", `${(detectionData.oil_probability * 100).toFixed(1)}%`);
    setText("meta-spill-area", `${detectionData.surface_area_sqkm.toFixed(1)} km²`);
    setText("meta-lookalike", `${(detectionData.lookalike_probability * 100).toFixed(1)}% (Low)`);
    setText("meta-snr", `${detectionData.speckle_snr_db.toFixed(1)} dB`);

    setText("meta-origin-coord", `${driftData.most_probable_origin_lat.toFixed(3)}°N, ${driftData.most_probable_origin_lon.toFixed(3)}°E`);
    const winStart = new Date(driftData.origin_time_window_start).toISOString().substring(11, 16);
    const winEnd = new Date(driftData.origin_time_window_end).toISOString().substring(11, 16);
    setText("meta-origin-window", `${winStart} – ${winEnd} UTC`);
    setText("meta-spatial-unc", `±${driftData.spatial_uncertainty_km.toFixed(1)} km (95%)`);
    setText("meta-currents", `${driftData.ocean_current_mean_mps.toFixed(2)} m/s (CMEMS)`);
    setText("meta-winds", `${driftData.wind_speed_mean_mps.toFixed(1)} m/s (ERA5)`);
    setText("meta-candidate-count", `${candidatesData.length} Vessels`);
    setText("candidate-header-count", `${candidatesData.length} Vessels Evaluated`);
}

function renderSpillLayer() {
    spillLayer.clearLayers();
    if (!detectionData || !detectionData.polygon_geojson) return;
    const geoJson = L.geoJSON(detectionData.polygon_geojson, {
        style: {
            color: "#ef4444",
            weight: 2,
            fillColor: "#991b1b",
            fillOpacity: 0.65
        }
    }).bindPopup(`
        <div class="text-xs p-1">
            <div class="font-bold text-red-400 uppercase text-[10px]">Detected Mineral Oil Slick</div>
            <div class="text-slate-200 mt-1">Area: <b>${detectionData.surface_area_sqkm.toFixed(2)} km²</b></div>
            <div class="text-slate-300">Confidence: <b>${(detectionData.detection_confidence * 100).toFixed(1)}%</b></div>
            <div class="text-slate-400 text-[10px] mt-1">${detectionData.satellite_mission} SAR</div>
        </div>
    `);
    spillLayer.addLayer(geoJson);
}

function renderDriftLayers() {
    ellipseLayer.clearLayers();
    probRingsLayer.clearLayers();
    contourLayer.clearLayers();
    currentVectorLayer.clearLayers();
    particleLayer.clearLayers();
    if (heatmapLayer) map.removeLayer(heatmapLayer);
    if (!driftData) return;

    if (driftData.density_heatmap_grid && driftData.density_heatmap_grid.length > 0) {
        const heatPoints = driftData.density_heatmap_grid.map(p => [p[0], p[1], p[2] * 0.8]);
        heatmapLayer = L.heatLayer(heatPoints, {
            radius: 26,
            blur: 18,
            maxZoom: 14,
            gradient: { 0.2: "#0284c7", 0.5: "#f59e0b", 0.8: "#ef4444" }
        }).addTo(map);
    }

    if (driftData.depth_contours) {
        driftData.depth_contours.forEach(c => {
            const line = L.polyline(c.coordinates, {
                color: "#22d3ee",
                weight: 1.2,
                opacity: 0.45,
                dashArray: "3, 6"
            }).bindTooltip(`Isobath: -${c.depth_m} m`, { sticky: true });
            contourLayer.addLayer(line);
        });
    }

    if (driftData.current_vectors) {
        driftData.current_vectors.forEach(v => {
            const arrowIcon = L.divIcon({
                className: "current-arrow",
                html: `<div style="transform: rotate(${v.direction_deg}deg);"><svg class="w-4 h-4 text-teal-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 16h6v6h4v-6h6z"/></svg></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            const m = L.marker([v.lat, v.lon], { icon: arrowIcon })
                .bindTooltip(`Current: ${v.speed_knots} kts @ ${v.direction_deg}°`, { sticky: true });
            currentVectorLayer.addLayer(m);
        });
    }

    if (driftData.probability_rings) {
        driftData.probability_rings.forEach(r => {
            const ring = L.polygon(r.coordinates, {
                color: "#f59e0b",
                weight: 1.5,
                dashArray: "4, 4",
                fillColor: "#f59e0b",
                fillOpacity: 0.05
            }).bindTooltip(`Probability Boundary: ${r.confidence_percent}%`, { sticky: true });
            probRingsLayer.addLayer(ring);
        });
    }

    if (driftData.ellipses) {
        driftData.ellipses.forEach((ell, idx) => {
            const isFinal = (idx === driftData.ellipses.length - 1);
            const circle = L.circle([ell.centroid_lat, ell.centroid_lon], {
                radius: ell.semi_major_km * 1000,
                color: isFinal ? "#f59e0b" : "#0284c7",
                weight: isFinal ? 2 : 1,
                dashArray: isFinal ? null : "4, 4",
                fillColor: isFinal ? "#f59e0b" : "#0284c7",
                fillOpacity: isFinal ? 0.2 : 0.04
            }).bindTooltip(`Hindcast ${ell.time_offset_hours}h (±${ell.semi_major_km} km)`, { sticky: true });
            ellipseLayer.addLayer(circle);
        });
    }

    const originIcon = L.divIcon({
        className: "origin-pulse",
        html: `<div class="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center"><div class="w-1.5 h-1.5 rounded-full bg-slate-900"></div></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
    const originMarker = L.marker([driftData.most_probable_origin_lat, driftData.most_probable_origin_lon], { icon: originIcon })
        .bindPopup(`<div class="text-xs p-1"><b class="text-amber-400">Probable Spill Origin Zone</b><br>Peak Release: ${new Date(driftData.most_probable_release_time).toUTCString().substring(17, 22)} UTC<br>Uncertainty: ±${driftData.spatial_uncertainty_km} km</div>`);
    ellipseLayer.addLayer(originMarker);

    if (driftData.sample_trajectories) {
        driftData.sample_trajectories.forEach(traj => {
            const latlngs = traj.steps.map(s => [s.lat, s.lon]);
            const polyline = L.polyline(latlngs, { color: "#38bdf8", weight: 1, opacity: 0.4 });
            particleLayer.addLayer(polyline);
        });
    }
}

function renderVesselLayers() {
    vesselLayer.clearLayers();
    if (!candidatesData || candidatesData.length === 0) return;

    candidatesData.forEach((cand, idx) => {
        const isTop = (idx === 0 && cand.overall_score >= 0.70);
        const trackColor = isTop ? "#ef4444" : (cand.overall_score >= 0.55 ? "#f59e0b" : "#64748b");
        const waypoints = cand.waypoints || [];
        const latlngs = waypoints.map(w => [w.lat, w.lon]);

        if (latlngs.length > 1) {
            const polyline = L.polyline(latlngs, {
                color: trackColor,
                weight: isTop ? 2.5 : 1.5,
                opacity: isTop ? 0.85 : 0.5,
                dashArray: isTop ? null : "3, 3"
            }).bindTooltip(`<b>${cand.vessel_name}</b> (${cand.vessel_type})<br>Score: ${Math.round(cand.overall_score * 100)}%`, { sticky: true });
            polyline.on("click", () => selectCandidate(cand.mmsi));
            vesselLayer.addLayer(polyline);
        }
    });
    updateAnimatedPositions();
}

function updateAnimatedPositions() {
    animMarkerLayer.clearLayers();
    if (!candidatesData || !caseSummary) return;
    const tObs = new Date(caseSummary.detection_timestamp);
    const targetTime = new Date(tObs.getTime() + timelineHour * 3600 * 1000);

    candidatesData.forEach((cand, idx) => {
        const waypoints = cand.waypoints || [];
        if (waypoints.length === 0) return;
        const pos = getInterpolatedVesselPosition(waypoints, targetTime);
        if (pos) {
            const isSelected = (cand.mmsi === selectedMmsi);
            const isTop = (idx === 0 && cand.overall_score >= 0.70);
            const markerBg = isTop ? "bg-red-500" : (cand.overall_score >= 0.55 ? "bg-amber-500" : "bg-slate-400");
            const borderStyle = isSelected ? "border-2 border-white ring-2 ring-teal-400 shadow-xl scale-125" : "border border-slate-900";

            const vesselIcon = L.divIcon({
                className: "vessel-marker",
                html: `
                    <div class="relative flex items-center justify-center">
                        <div class="w-5 h-5 rounded-full ${markerBg} ${borderStyle} flex items-center justify-center text-slate-950 font-bold text-[9px] shadow">
                            <svg class="w-3 h-3 text-slate-950 transform" style="transform: rotate(${pos.cog}deg);" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L4 20l8-4 8 4L12 2z"/>
                            </svg>
                        </div>
                        ${isSelected ? `<span class="absolute -top-5 whitespace-nowrap bg-slate-900 text-teal-300 px-1.5 py-0.5 rounded text-[9px] border border-teal-500 font-bold">${cand.vessel_name}</span>` : ""}
                    </div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            const marker = L.marker([pos.lat, pos.lon], { icon: vesselIcon, zIndexOffset: isSelected ? 500 : 100 })
                .bindTooltip(`<b>${cand.vessel_name}</b><br>SOG: ${pos.sog} kts | COG: ${pos.cog}°<br>Score: ${Math.round(cand.overall_score * 100)}%`, { sticky: true });
            marker.on("click", () => selectCandidate(cand.mmsi));
            animMarkerLayer.addLayer(marker);
        }
    });

    if (driftData && driftData.sample_trajectories) {
        driftData.sample_trajectories.forEach(traj => {
            const pt = traj.steps.find(s => Math.abs(s.time_offset_hours - timelineHour) < 0.35);
            if (pt) {
                const pMarker = L.circleMarker([pt.lat, pt.lon], { radius: 2.5, color: "#38bdf8", fillColor: "#0284c7", fillOpacity: 0.8, weight: 1 });
                animMarkerLayer.addLayer(pMarker);
            }
        });
    }
}

function getInterpolatedVesselPosition(waypoints, targetTime) {
    for (let i = 0; i < waypoints.length - 1; i++) {
        const t1 = new Date(waypoints[i].timestamp);
        const t2 = new Date(waypoints[i+1].timestamp);
        if (targetTime >= t1 && targetTime <= t2) {
            const factor = (targetTime - t1) / Math.max(1, (t2 - t1));
            const lat = waypoints[i].lat + factor * (waypoints[i+1].lat - waypoints[i].lat);
            const lon = waypoints[i].lon + factor * (waypoints[i+1].lon - waypoints[i].lon);
            const sog = waypoints[i].sog_knots + factor * (waypoints[i+1].sog_knots - waypoints[i].sog_knots);
            const cog = waypoints[i].cog_degrees;
            return { lat, lon, sog: sog.toFixed(1), cog: Math.round(cog) };
        }
    }
    return {
        lat: waypoints[waypoints.length - 1].lat,
        lon: waypoints[waypoints.length - 1].lon,
        sog: waypoints[waypoints.length - 1].sog_knots,
        cog: Math.round(waypoints[waypoints.length - 1].cog_degrees)
    };
}

function renderCandidateList() {
    const container = document.getElementById("candidate-list-container");
    if (!container) return;
    container.innerHTML = "";

    candidatesData.forEach((cand, idx) => {
        const isSelected = (cand.mmsi === selectedMmsi);
        const rankNumber = String(idx + 1).padStart(2, "0");

        const card = document.createElement("div");
        card.id = `cand-card-${cand.mmsi}`;
        card.className = `p-2 rounded border cursor-pointer transition flex items-center justify-between text-xs ${
            isSelected 
                ? "bg-slate-800 border-teal-400 shadow-md ring-1 ring-teal-400/50"
                : "bg-slate-900/80 border-slate-800 hover:bg-slate-800 hover:border-slate-700"
        }`;

        const scorePercent = Math.round(cand.overall_score * 100);
        const scoreBadgeClass = (scorePercent >= 70) 
            ? "bg-red-500/20 text-red-400 border-red-500/30" 
            : (scorePercent >= 50) 
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-slate-700 text-slate-400 border-slate-600";

        const rp = cand.general_risk_profile;
        const riskLevel = (rp && rp.risk_level) ? rp.risk_level : "UNKNOWN";
        const riskLabel = {
            "LOW": "Low Risk", "MEDIUM": "Med Risk", "HIGH": "High Risk",
            "ELEVATED": "Elevated", "INSUFFICIENT_DATA": "No History", "UNKNOWN": "—"
        }[riskLevel] || "—";
        const riskBadgeHtml = `<span class="risk-badge risk-${riskLevel}">${riskLabel}</span>`;

        card.innerHTML = `
            <div class="flex items-center space-x-2 min-w-0">
                <span class="font-pixel text-slate-400 text-[10px] font-bold">#${rankNumber}</span>
                <div class="min-w-0">
                    <div class="font-bold text-slate-200 truncate flex items-center space-x-1">
                        <span>${cand.vessel_name}</span>
                        ${cand.flagged_by_analyst ? `<i data-lucide="flag" class="w-3 h-3 text-amber-400 inline"></i>` : ""}
                    </div>
                    <div class="text-[10px] text-slate-400 font-mono">MMSI ${cand.mmsi} &bull; ${cand.vessel_type}</div>
                </div>
            </div>
            <div class="flex flex-col items-end space-y-1 shrink-0">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border font-pixel ${scoreBadgeClass}">${scorePercent}%</span>
                ${riskBadgeHtml}
            </div>
        `;
        card.addEventListener("click", () => selectCandidate(cand.mmsi));
        container.appendChild(card);
    });
    if (window.lucide) lucide.createIcons();
}

function selectCandidate(mmsi) {
    selectedMmsi = mmsi;
    setActivePanel("vessels");
    renderCandidateList();
    renderCandidateDetail();
    updateAnimatedPositions();

    const cand = candidatesData.find(c => c.mmsi === mmsi);
    if (cand && cand.waypoints && cand.waypoints.length > 0) {
        const lats = cand.waypoints.map(w => w.lat);
        const lons = cand.waypoints.map(w => w.lon);
        const bounds = L.latLngBounds(
            [Math.min(...lats), Math.min(...lons)],
            [Math.max(...lats), Math.max(...lons)]
        );
        map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 11, duration: 0.8 });
    }
}

function renderCandidateDetail() {
    const cand = candidatesData.find(c => c.mmsi === selectedMmsi) || candidatesData[0];
    if (!cand) return;

    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

    setText("detail-vessel-name", cand.vessel_name);
    setText("detail-mmsi-imo", `${cand.mmsi} / ${cand.imo || "N/A"}`);
    setText("detail-vessel-type", cand.vessel_type);
    setText("detail-flag", cand.flag_country);
    setText("detail-cpa", `${cand.closest_approach_km} km (${new Date(cand.time_of_closest_approach).toUTCString().substring(17, 22)} UTC)`);

    const overallPct = Math.round((cand.overall_score || 0) * 100);
    const overallEl = document.getElementById("detail-overall-score");
    if (overallEl) {
        overallEl.innerText = `${overallPct}%`;
        overallEl.className = `font-mono font-bold text-lg ${overallPct >= 70 ? "text-red-400" : overallPct >= 50 ? "text-amber-400" : "text-teal-400"}`;
    }

    const rp = cand.general_risk_profile;
    const riskSlot = document.getElementById("detail-risk-badge-slot");
    const riskBreakdown = document.getElementById("detail-risk-breakdown");
    if (riskSlot) {
        const riskLevel = (rp && rp.risk_level) ? rp.risk_level : "UNKNOWN";
        const riskLabel = {
            "LOW": "Low Risk", "MEDIUM": "Medium Risk", "HIGH": "High Risk",
            "ELEVATED": "Elevated Risk", "INSUFFICIENT_DATA": "Insufficient History", "UNKNOWN": "—"
        }[riskLevel] || "—";
        riskSlot.innerHTML = `<span class="risk-badge risk-${riskLevel}">${riskLabel}</span>`;
    }

    if (rp && rp.data_sufficiency && rp.data_sufficiency.has_sufficient_data && riskBreakdown) {
        riskBreakdown.classList.remove("hidden");
        const gapEl = document.getElementById("risk-gap-val");
        const speedEl = document.getElementById("risk-speed-val");
        const loiterEl = document.getElementById("risk-loiter-val");
        const hoursEl = document.getElementById("risk-hours-val");
        const factorsEl = document.getElementById("risk-factors-list");
        if (gapEl && rp.gap_analysis) gapEl.innerText = `${rp.gap_analysis.gap_severity} (${rp.gap_analysis.total_gaps_detected} gaps)`;
        if (speedEl && rp.speed_anomaly_analysis) speedEl.innerText = `${rp.speed_anomaly_analysis.anomaly_severity} (${rp.speed_anomaly_analysis.anomalies_detected})`;
        if (loiterEl && rp.loiter_analysis) loiterEl.innerText = `${rp.loiter_analysis.loiter_severity} (${rp.loiter_analysis.loiter_events} pts)`;
        if (hoursEl) hoursEl.innerText = `${(rp.historical_hours || 0).toFixed(0)} h tracked`;
        if (factorsEl) {
            factorsEl.innerHTML = (rp.risk_factors || [])
                .map(f => `<div class="flex items-start gap-1"><span class="text-amber-400 shrink-0">•</span><span>${f}</span></div>`)
                .join("");
        }
    } else if (riskBreakdown) {
        riskBreakdown.classList.add("hidden");
    }

    renderSogSparkline(cand.waypoints || []);

    const pBadge = document.getElementById("detail-priority-badge");
    if (pBadge) {
        pBadge.innerText = `${cand.priority_tier} PRIORITY`;
        pBadge.className = `px-2 py-0.5 rounded text-[10px] font-bold font-pixel border ${
            cand.priority_tier === "HIGH"
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : (cand.priority_tier === "MEDIUM"
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-slate-700 text-slate-400 border-slate-600")
        }`;
    }

    const subs = cand.sub_scores || {};
    const setBar = (valId, barId, val) => {
        const pct = Math.round(Math.max(0, Math.min(1, val)) * 100);
        const vEl = document.getElementById(valId);
        const bEl = document.getElementById(barId);
        if (vEl) vEl.innerText = `${pct}%`;
        if (bEl) bEl.style.width = `${pct}%`;
    };
    setBar("score-spatial-val", "score-spatial-bar", subs.spatial_compatibility || 0);
    setBar("score-temporal-val", "score-temporal-bar", subs.temporal_compatibility || 0);
    setBar("score-traj-val", "score-traj-bar", subs.trajectory_consistency || 0);
    setBar("score-anom-val", "score-anom-bar", subs.behavioral_anomaly || 0);
    setBar("score-type-val", "score-type-bar", subs.vessel_compatibility || 0);

    const evList = document.getElementById("detail-evidence-list");
    if (evList) {
        evList.innerHTML = "";
        (cand.evidence_points || []).forEach(pt => {
            const li = document.createElement("li");
            li.innerText = pt;
            evList.appendChild(li);
        });
    }

    const anomContainer = document.getElementById("detail-anomaly-container");
    if (anomContainer) {
        anomContainer.innerHTML = "";
        if (!cand.anomaly_flags || cand.anomaly_flags.length === 0) {
            anomContainer.innerHTML = `<div class="text-[10px] text-slate-500 italic bg-slate-900/60 p-1.5 rounded border border-slate-800">No anomalous kinematic signatures detected.</div>`;
        } else {
            cand.anomaly_flags.forEach(anom => {
                const div = document.createElement("div");
                div.className = "bg-amber-500/10 border border-amber-500/30 rounded p-1.5 text-[10px] text-amber-300";
                div.innerHTML = `<b>${anom.flag_type}:</b> ${anom.description}`;
                anomContainer.appendChild(div);
            });
        }
    }
}

function renderSogSparkline(waypoints) {
    const container = document.getElementById("sog-sparkline-container");
    const summaryEl = document.getElementById("detail-sog-summary");
    if (!container || waypoints.length === 0) {
        if (container) container.innerHTML = `<span class="text-slate-500 text-[9px]">No SOG profile</span>`;
        return;
    }
    const speeds = waypoints.map(w => w.sog_knots);
    const minSpd = Math.min(...speeds);
    const maxSpd = Math.max(...speeds, 18.0);
    const avgSpd = (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1);
    if (summaryEl) summaryEl.innerText = `MIN ${minSpd.toFixed(1)} KTS | AVG ${avgSpd} KTS`;

    const w = 300;
    const h = 32;
    const pts = speeds.map((s, idx) => {
        const x = (idx / (speeds.length - 1)) * (w - 10) + 5;
        const y = h - ((s - minSpd) / Math.max(1, (maxSpd - minSpd))) * (h - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");

    container.innerHTML = `
        <svg class="w-full h-full" viewBox="0 0 ${w} ${h}">
            <polyline fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" points="${pts}"/>
        </svg>
    `;
}

function showToast(msg) {
    const toast = document.getElementById("toast-notification");
    const text = document.getElementById("toast-message");
    if (!toast || !text) return;
    text.innerText = msg;
    toast.classList.remove("opacity-0", "-translate-y-4", "pointer-events-none");
    toast.classList.add("opacity-100", "translate-y-0");
    setTimeout(() => {
        toast.classList.remove("opacity-100", "translate-y-0");
        toast.classList.add("opacity-0", "-translate-y-4", "pointer-events-none");
    }, 3000);
}

function updateActiveWeightsUI() {
    const strip = document.getElementById("active-weights-strip");
    if (!strip) return;
    strip.innerHTML = `
        <span class="px-1 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">Spat: ${currentWeights.weight_spatial.toFixed(2)}</span>
        <span class="px-1 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">Temp: ${currentWeights.weight_temporal.toFixed(2)}</span>
        <span class="px-1 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">Traj: ${currentWeights.weight_trajectory.toFixed(2)}</span>
        <span class="px-1 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">Anom: ${currentWeights.weight_anomaly.toFixed(2)}</span>
        <span class="px-1 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Type: ${currentWeights.weight_vessel_type.toFixed(2)}</span>
    `;
}

/* ── Light / Dark Theme Support (Checked & Verified) ── */
function initTheme() {
    applyTheme(currentTheme, false);
}

function toggleTheme() {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("polaris_theme", currentTheme);
    applyTheme(currentTheme, true);
    showToast(`Switched to ${currentTheme.toUpperCase()} mode`);
}

function applyTheme(theme, isUserAction = false) {
    const sun = document.getElementById("theme-toggle-icon-sun");
    const moon = document.getElementById("theme-toggle-icon-moon");

    if (theme === "light") {
        document.body.classList.add("light-mode");
        document.documentElement.classList.add("light-mode");
        if (sun) sun.classList.add("hidden");
        if (moon) moon.classList.remove("hidden");
        setBasemapStyle("light", "btn-basemap-light");
    } else {
        document.body.classList.remove("light-mode");
        document.documentElement.classList.remove("light-mode");
        if (moon) moon.classList.add("hidden");
        if (sun) sun.classList.remove("hidden");
        setBasemapStyle("dark", "btn-basemap-dark");
    }
}

function setBasemapStyle(key, activeBtnId) {
    ["btn-basemap-dark", "btn-basemap-sat", "btn-basemap-topo", "btn-basemap-light"].forEach(id => {
        const b = document.getElementById(id);
        if (b) b.className = "px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700";
    });
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) activeBtn.className = "px-2 py-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/50 font-bold";
    if (currentBaseLayer && baseLayers[currentBaseLayer] && map) map.removeLayer(baseLayers[currentBaseLayer]);
    if (baseLayers[key] && map) {
        baseLayers[key].addTo(map);
        baseLayers[key].bringToBack();
        currentBaseLayer = key;
    }
}

function setupEventListeners() {
    const caseSelector = document.getElementById("case-selector");
    if (caseSelector) {
        caseSelector.addEventListener("change", (e) => {
            loadCaseData(e.target.value);
        });
    }

    // Basemaps Switchers
    document.getElementById("btn-basemap-dark").addEventListener("click", () => setBasemapStyle("dark", "btn-basemap-dark"));
    document.getElementById("btn-basemap-sat").addEventListener("click", () => setBasemapStyle("sat", "btn-basemap-sat"));
    document.getElementById("btn-basemap-topo").addEventListener("click", () => setBasemapStyle("topo", "btn-basemap-topo"));
    document.getElementById("btn-basemap-light").addEventListener("click", () => setBasemapStyle("light", "btn-basemap-light"));

    // Measure Ruler Tool
    document.getElementById("btn-measure-tool").addEventListener("click", () => {
        isMeasuring = !isMeasuring;
        measurePoints = [];
        rulerLayer.clearLayers();
        const btn = document.getElementById("btn-measure-tool");
        if (isMeasuring) {
            btn.classList.add("bg-teal-500/30");
            showToast("Ruler Active: Click first point on map");
        } else {
            btn.classList.remove("bg-teal-500/30");
            showToast("Ruler cancelled");
        }
    });

    // Layer Toggles
    document.getElementById("layer-spill").addEventListener("change", (e) => { if (e.target.checked) map.addLayer(spillLayer); else map.removeLayer(spillLayer); });
    document.getElementById("layer-origin-heat").addEventListener("change", (e) => { if (heatmapLayer) { if (e.target.checked) map.addLayer(heatmapLayer); else map.removeLayer(heatmapLayer); } });
    document.getElementById("layer-contours").addEventListener("change", (e) => { if (e.target.checked) map.addLayer(contourLayer); else map.removeLayer(contourLayer); });
    document.getElementById("layer-current-vectors").addEventListener("change", (e) => { if (e.target.checked) map.addLayer(currentVectorLayer); else map.removeLayer(currentVectorLayer); });
    document.getElementById("layer-ellipses").addEventListener("change", (e) => { if (e.target.checked) map.addLayer(ellipseLayer); else map.removeLayer(ellipseLayer); });
    document.getElementById("layer-prob-rings").addEventListener("change", (e) => { if (e.target.checked) map.addLayer(probRingsLayer); else map.removeLayer(probRingsLayer); });
    document.getElementById("layer-particles").addEventListener("change", (e) => { if (e.target.checked) map.addLayer(particleLayer); else map.removeLayer(particleLayer); });
    document.getElementById("layer-ais-tracks").addEventListener("change", (e) => { if (e.target.checked) map.addLayer(vesselLayer); else map.removeLayer(vesselLayer); });

    // Zoom Shortcuts
    document.getElementById("btn-fit-spill").addEventListener("click", () => { if (spillLayer.getLayers().length > 0) map.fitBounds(spillLayer.getBounds(), { padding: [50, 50] }); });
    document.getElementById("btn-fit-origin").addEventListener("click", () => { if (driftData) map.flyTo([driftData.most_probable_origin_lat, driftData.most_probable_origin_lon], 10); });
    document.getElementById("btn-fit-all").addEventListener("click", fitAllLayers);

    // Timeline Scrubber Controls
    const slider = document.getElementById("timeline-slider");
    slider.addEventListener("input", (e) => {
        timelineHour = parseFloat(e.target.value);
        updateTimelineDisplay();
        updateAnimatedPositions();
    });
    document.getElementById("btn-play-pause").addEventListener("click", togglePlayPause);
    document.getElementById("btn-step-back").addEventListener("click", () => {
        timelineHour = Math.max(-48.0, timelineHour - 2.0);
        slider.value = timelineHour;
        updateTimelineDisplay();
        updateAnimatedPositions();
    });
    document.getElementById("btn-step-forward").addEventListener("click", () => {
        timelineHour = Math.min(0.0, timelineHour + 2.0);
        slider.value = timelineHour;
        updateTimelineDisplay();
        updateAnimatedPositions();
    });
    document.getElementById("btn-speed-1x").addEventListener("click", () => setSpeed(1));
    document.getElementById("btn-speed-2x").addEventListener("click", () => setSpeed(2));

    // Modals Controls
    document.getElementById("btn-open-weights").addEventListener("click", openWeightsModal);
    document.getElementById("btn-close-weights").addEventListener("click", closeWeightsModal);
    setupWeightSliders();
    document.getElementById("btn-apply-weights").addEventListener("click", applyWeightRecomputation);
    document.getElementById("btn-reset-weights").addEventListener("click", resetWeightSliders);

    document.getElementById("btn-open-graph").addEventListener("click", openGraphModal);
    document.getElementById("btn-close-graph").addEventListener("click", () => document.getElementById("modal-graph").removeAttribute("data-open"));

    document.getElementById("btn-open-report").addEventListener("click", openReportModal);
    document.getElementById("btn-close-report").addEventListener("click", () => document.getElementById("modal-report").removeAttribute("data-open"));
    document.getElementById("btn-copy-markdown").addEventListener("click", copyReportMarkdown);

    document.getElementById("btn-flag-candidate").addEventListener("click", () => toggleAnalystFlag(true));
    document.getElementById("btn-exclude-candidate").addEventListener("click", () => toggleAnalystFlag(false));
}

function updateTimelineDisplay() {
    const label = document.getElementById("timeline-current-label");
    if (!label || !caseSummary) return;
    const tObs = new Date(caseSummary.detection_timestamp);
    const curTime = new Date(tObs.getTime() + timelineHour * 3600 * 1000);
    const timeStr = curTime.toISOString().replace("T", " ").substring(0, 16) + " UTC";
    label.innerText = `T ${timelineHour.toFixed(1)}h (${timeStr})`;
}

function togglePlayPause() {
    isPlaying = !isPlaying;
    const icon = document.getElementById("play-icon");
    if (isPlaying) {
        if (icon) icon.setAttribute("data-lucide", "pause");
        if (timelineHour >= 0.0) timelineHour = -48.0;
        playTimer = setInterval(stepAnimation, 400 / playSpeed);
    } else {
        if (icon) icon.setAttribute("data-lucide", "play");
        clearInterval(playTimer);
    }
    if (window.lucide) lucide.createIcons();
}

function stepAnimation() {
    timelineHour += 0.5;
    if (timelineHour > 0.0) {
        timelineHour = 0.0;
        togglePlayPause();
    }
    const slider = document.getElementById("timeline-slider");
    if (slider) slider.value = timelineHour;
    updateTimelineDisplay();
    updateAnimatedPositions();
}

function setSpeed(spd) {
    playSpeed = spd;
    const b1 = document.getElementById("btn-speed-1x");
    const b2 = document.getElementById("btn-speed-2x");
    if (b1) b1.className = (spd === 1) ? "px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold" : "px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700";
    if (b2) b2.className = (spd === 2) ? "px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold" : "px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700";
    if (isPlaying) { clearInterval(playTimer); playTimer = setInterval(stepAnimation, 400 / playSpeed); }
}

function fitAllLayers() {
    if (!detectionData || !driftData) return;
    const bounds = L.latLngBounds(
        [detectionData.centroid_lat, detectionData.centroid_lon],
        [driftData.most_probable_origin_lat, driftData.most_probable_origin_lon]
    );
    map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 10, duration: 1.0 });
}

function openWeightsModal() { document.getElementById("modal-weights").setAttribute("data-open", "true"); }
function closeWeightsModal() { document.getElementById("modal-weights").removeAttribute("data-open"); }

function setupWeightSliders() {
    const bindSlider = (id, valId, key) => {
        const s = document.getElementById(id);
        if (s) {
            s.addEventListener("input", (e) => {
                const valEl = document.getElementById(valId);
                if (valEl) valEl.innerText = parseFloat(e.target.value).toFixed(2);
                currentWeights[key] = parseFloat(e.target.value);
            });
        }
    };
    bindSlider("slider-weight-spatial", "slider-val-spatial", "weight_spatial");
    bindSlider("slider-weight-temporal", "slider-val-temporal", "weight_temporal");
    bindSlider("slider-weight-trajectory", "slider-val-trajectory", "weight_trajectory");
    bindSlider("slider-weight-anomaly", "slider-val-anomaly", "weight_anomaly");
    bindSlider("slider-weight-type", "slider-val-type", "weight_vessel_type");
    bindSlider("slider-weight-gap", "slider-val-gap", "penalty_ais_gap");
}

async function applyWeightRecomputation() {
    try {
        const res = await fetch(`/api/attribution/${currentCaseId}/recompute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentWeights)
        });
        candidatesData = await res.json();
        renderCandidateList();
        renderCandidateDetail();
        renderVesselLayers();
        updateActiveWeightsUI();
        closeWeightsModal();
        showToast("Attribution weights applied & candidates re-ranked!");
    } catch (err) {
        console.error("Error recomputing weights:", err);
        showToast("Error recalculating weights");
    }
}

function resetWeightSliders() {
    currentWeights = { weight_spatial: 0.30, weight_temporal: 0.25, weight_trajectory: 0.20, weight_anomaly: 0.15, weight_vessel_type: 0.10, penalty_ais_gap: 0.10 };
    const setVal = (id, valId, v) => {
        const s = document.getElementById(id);
        const txt = document.getElementById(valId);
        if (s) s.value = v;
        if (txt) txt.innerText = v.toFixed(2);
    };
    setVal("slider-weight-spatial", "slider-val-spatial", 0.30);
    setVal("slider-weight-temporal", "slider-val-temporal", 0.25);
    setVal("slider-weight-trajectory", "slider-val-trajectory", 0.20);
    setVal("slider-weight-anomaly", "slider-val-anomaly", 0.15);
    setVal("slider-weight-type", "slider-val-type", 0.10);
    setVal("slider-weight-gap", "slider-val-gap", 0.10);
    updateActiveWeightsUI();
}

async function openGraphModal() {
    const container = document.getElementById("graph-content-body");
    if (!container) return;
    container.innerHTML = `<div class="text-slate-400 text-xs p-2">Loading evidence graph...</div>`;
    document.getElementById("modal-graph").setAttribute("data-open", "true");

    try {
        const g = await fetch(`/api/cases/${currentCaseId}/evidence-graph`).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        });

        const nodeTypeOrder = ["SATELLITE", "SPILL", "DRIFT", "ORIGIN", "VESSEL", "ANOMALY"];
        const byType = {};
        for (const t of nodeTypeOrder) byType[t] = [];
        for (const n of (g.nodes || [])) {
            const bucket = byType[n.node_type] ?? (byType[n.node_type] = []);
            bucket.push(n);
        }

        let nodesHtml = "";
        for (const t of nodeTypeOrder) {
            const group = byType[t] || [];
            if (!group.length) continue;
            nodesHtml += `<div class="mb-3">
                <div class="text-[10px] font-pixel font-bold uppercase tracking-wider text-teal-400 mb-1">${t} (${group.length})</div>
                <div class="grid grid-cols-2 gap-1.5">
                    ${group.map(n => `
                        <div class="p-2 bg-slate-900 rounded border border-slate-800 space-y-0.5">
                            <div class="font-semibold text-slate-200 text-[11px] leading-snug">${n.label}</div>
                            ${Object.entries(n.properties || {}).map(([k, v]) =>
                                `<div class="text-[10px] text-slate-500 font-mono truncate">${k}: <span class="text-slate-400">${String(v).substring(0, 40)}</span></div>`
                            ).join("")}
                        </div>`).join("")}
                </div>
            </div>`;
        }

        const edgesHtml = (g.edges || []).map(e => {
            const confPct = Math.round((e.confidence || 0) * 100);
            return `<div class="flex items-start justify-between gap-2 p-1.5 bg-slate-900 rounded border border-slate-800 font-mono">
                <span class="text-[10px] text-slate-300">
                    <span class="text-teal-400">${e.source}</span> &rarr; <span class="text-amber-300">${e.target}</span>
                    <span class="block text-[9px] text-slate-500">${e.relation}</span>
                </span>
                <span class="font-bold text-[11px] text-teal-400">${confPct}%</span>
            </div>`;
        }).join("");

        container.innerHTML = `
            <div class="space-y-4 text-xs font-sans">
                <div>
                    <div class="font-pixel text-teal-400 font-bold mb-2 uppercase">Evidence Nodes (${(g.nodes||[]).length})</div>
                    ${nodesHtml || '<p class="text-slate-500 text-[10px]">No nodes.</p>'}
                </div>
                <div>
                    <div class="font-pixel text-teal-400 font-bold mb-2 uppercase">Evidentiary Linkages (${(g.edges||[]).length})</div>
                    <div class="space-y-1">${edgesHtml || '<p class="text-slate-500 text-[10px]">No edges.</p>'}</div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error("Evidence graph load failed:", err);
        container.innerHTML = `<div class="text-red-400 text-xs p-2">Failed to load evidence graph: ${err.message}</div>`;
    }
}

async function openReportModal() {
    try {
        const [jsonRes, mdRes] = await Promise.all([
            fetch(`/api/report/${currentCaseId}`).then(r => r.json()),
            fetch(`/api/report/${currentCaseId}/markdown`).then(r => r.text())
        ]);
        const h1 = document.getElementById("modal-report-hash");
        const h2 = document.getElementById("provenance-hash-display");
        const body = document.getElementById("report-content-body");
        if (h1) h1.innerText = `SHA-256: ${jsonRes.provenance_hash_sha256}`;
        if (h2) h2.innerText = `SHA-256: ${jsonRes.provenance_hash_sha256.substring(0, 16)}...`;
        if (body) body.innerText = mdRes;
        document.getElementById("modal-report").setAttribute("data-open", "true");
    } catch (err) {
        console.error("Error loading report:", err);
    }
}

function copyReportMarkdown() {
    const textEl = document.getElementById("report-content-body");
    if (!textEl) return;
    navigator.clipboard.writeText(textEl.innerText).then(() => {
        showToast("Investigation brief copied to clipboard!");
    });
}

async function toggleAnalystFlag(isFlag) {
    if (!selectedMmsi) return;
    try {
        const body = isFlag ? { mmsi: selectedMmsi, flagged: true } : { mmsi: selectedMmsi, excluded: true };
        await fetch(`/api/attribution/${currentCaseId}/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const cand = candidatesData.find(c => c.mmsi === selectedMmsi);
        if (cand) {
            if (isFlag) cand.flagged_by_analyst = !cand.flagged_by_analyst;
            else cand.excluded_by_analyst = !cand.excluded_by_analyst;
        }
        renderCandidateList();
        showToast(isFlag ? "Candidate flagged as lead" : "Candidate excluded from ranking");
    } catch (err) {
        console.error("Error updating review:", err);
    }
}

/* ── Theme Toggling Logic ── */
function initTheme() {
    applyTheme(currentTheme);
}

function applyTheme(themeName) {
    if (themeName === "light") {
        document.body.classList.add("light-theme");
        document.body.classList.remove("dark-theme");
    } else {
        document.body.classList.add("dark-theme");
        document.body.classList.remove("light-theme");
    }

    // Toggle icon (sun/moon) if it exists
    const sunIcon = document.getElementById("theme-toggle-icon-sun");
    const moonIcon = document.getElementById("theme-toggle-icon-moon");
    if (sunIcon && moonIcon) {
        if (themeName === "light") {
            sunIcon.classList.add("hidden");
            moonIcon.classList.remove("hidden");
        } else {
            moonIcon.classList.add("hidden");
            sunIcon.classList.remove("hidden");
        }
    }

    // Switch basemap if available
    if (map && baseLayers["light"] && baseLayers["dark"]) {
        if (themeName === "light" && currentBaseLayer !== "light") {
            map.removeLayer(baseLayers[currentBaseLayer]);
            map.addLayer(baseLayers["light"]);
            currentBaseLayer = "light";
        } else if (themeName === "dark" && currentBaseLayer !== "dark") {
            map.removeLayer(baseLayers[currentBaseLayer]);
            map.addLayer(baseLayers["dark"]);
            currentBaseLayer = "dark";
        }
    }
}

function toggleTheme() {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("polaris_theme", currentTheme);
    applyTheme(currentTheme);
    showToast(`Switched to ${currentTheme} theme`);
}
