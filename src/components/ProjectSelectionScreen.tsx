import React, { useState, useMemo } from "react";
import { HOSPITAL_DATA } from "../../test_data/hospital";
import { apiService } from "../services/APIService";

type ExplorerView = "HOSPITALS" | "BUILDINGS" | "FLOORS";

export function ProjectSelectionScreen({
  user,
  onSelectProject,
  onLogout,
}: any) {
  const [view, setView] = useState<ExplorerView>("HOSPITALS");
  const [searchQuery, setSearchQuery] = useState("");

  // Selection Breadcrumbs - ensure these store the FULL object
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);

  // --- Logic ---

  const filteredHospitals = useMemo(() => {
    return HOSPITAL_DATA.filter((h) =>
      h.hospital.toLowerCase().includes(searchQuery.toLowerCase()),
    ).sort((a, b) => a.hospital.localeCompare(b.hospital));
  }, [searchQuery]);

  const enterHospital = (hospital: any) => {
    setSelectedHospital(hospital);
    setView("BUILDINGS");
    setSearchQuery("");
  };

  const enterBuilding = (building: any) => {
    setSelectedBuilding(building);
    setView("FLOORS");
  };

  const goBackToHospitals = () => {
    setSelectedHospital(null);
    setSelectedBuilding(null);
    setView("HOSPITALS");
  };

  const goBackToBuildings = () => {
    setSelectedBuilding(null);
    setView("BUILDINGS");
  };

  const handleAddFloor = async (floorName: string) => {
    if (!selectedHospital || !selectedBuilding) return;

    try {
      // Pass ONE object to fix the "Expected 1 argument, but got 3" error
      const result = await apiService.createMap({
        name: floorName, // e.g., "Floor 3"
        hospitalId: selectedHospital.id,
        hospitalName: selectedHospital.hospital,
        buildingId: selectedBuilding.id,
        buildingName: selectedBuilding.name,
      });

      onSelectProject(result.mapId);
    } catch (err) {
      alert(err);
    }
  };

  return (
    <div style={pageWrapperStyle}>
      {" "}
      {/* Scroll fix here */}
      <div style={contentContainerStyle}>
        {/* 1. Nav & Breadcrumbs */}
        <div style={navHeaderStyle}>
          <div style={breadcrumbStyle}>
            <span onClick={goBackToHospitals} style={crumbLinkStyle}>
              All Hospitals
            </span>

            {/* Logic Check: Ensure selectedHospital is not null before accessing .hospital */}
            {selectedHospital && (
              <>
                <span style={separatorStyle}> / </span>
                <span
                  onClick={view === "FLOORS" ? goBackToBuildings : undefined}
                  style={view === "FLOORS" ? crumbLinkStyle : currentCrumbStyle}
                >
                  {selectedHospital.hospital}
                </span>
              </>
            )}

            {selectedBuilding && (
              <>
                <span style={separatorStyle}> / </span>
                <span style={currentCrumbStyle}>{selectedBuilding.name}</span>
              </>
            )}
          </div>
          <button onClick={onLogout} style={logoutButtonStyle}>
            Sign Out
          </button>
        </div>

        {/* 2. Search / Header */}
        <div style={actionBarStyle}>
          {view === "HOSPITALS" ? (
            <input
              type="text"
              placeholder="Search 41 hospitals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchBarStyle}
            />
          ) : (
            <h2 style={viewTitleStyle}>
              {view === "BUILDINGS"
                ? "Select Building"
                : `Select Floor in ${selectedBuilding?.name}`}
            </h2>
          )}
        </div>

        {/* 3. The Explorer Grid */}
        <div style={gridStyle}>
          {view === "HOSPITALS" &&
            filteredHospitals.map((h) => (
              <div
                key={h.id}
                style={folderStyle}
                onClick={() => enterHospital(h)}
              >
                <div style={iconStyle}>🏥</div>
                <div style={folderNameStyle}>{h.hospital}</div>
                <div style={folderDetailStyle}>
                  {h.buildings.length} Buildings
                </div>
              </div>
            ))}

          {view === "BUILDINGS" &&
            selectedHospital?.buildings.map((b: any) => (
              <div
                key={b.name}
                style={folderStyle}
                onClick={() => enterBuilding(b)}
              >
                <div style={iconStyle}>🏢</div>
                <div style={folderNameStyle}>{b.name}</div>
                <div style={folderDetailStyle}>{b.total_floors} Floors</div>
              </div>
            ))}

          {view === "FLOORS" &&
            selectedBuilding?.floor_list.map((f: string) => (
              <div key={f} style={fileStyle} onClick={() => handleAddFloor(f)}>
                <div style={iconStyle}>📍</div>
                <div style={folderNameStyle}>{f}</div>
                <div style={createLabelStyle}>Create Project +</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// --- Style Fixes ---

const pageWrapperStyle: React.CSSProperties = {
  height: "100vh", // Enforce full screen height
  overflowY: "auto", // Enable vertical scrolling
  background: "#f1f5f9",
  fontFamily: "Inter, system-ui",
  display: "block", // Standard block behavior
};

const contentContainerStyle: React.CSSProperties = {
  padding: "40px",
  maxWidth: "1200px",
  margin: "0 auto",
  minHeight: "100%", // Ensure it stretches
};

const navHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "20px",
  alignItems: "center",
};
const breadcrumbStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#64748b",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
};
const crumbLinkStyle: React.CSSProperties = {
  cursor: "pointer",
  color: "#3b82f6",
  textDecoration: "none",
  borderBottom: "1px solid #3b82f6",
};
const separatorStyle: React.CSSProperties = {
  margin: "0 8px",
  color: "#cbd5e1",
};
const currentCrumbStyle: React.CSSProperties = { color: "#1e293b" };

const actionBarStyle: React.CSSProperties = { marginBottom: "30px" };
const searchBarStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 20px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  fontSize: "16px",
  outline: "none",
  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
};
const viewTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  color: "#1e293b",
  fontWeight: 800,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "24px",
  paddingBottom: "40px", // Extra space at bottom for scrolling comfort
};

const folderStyle: React.CSSProperties = {
  background: "white",
  padding: "30px 20px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  textAlign: "center",
  cursor: "pointer",
  transition: "transform 0.2s, box-shadow 0.2s",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};

const fileStyle: React.CSSProperties = {
  ...folderStyle,
  border: "2px dashed #3b82f6",
  background: "#eff6ff",
};

const iconStyle: React.CSSProperties = {
  fontSize: "48px",
  marginBottom: "12px",
};
const folderNameStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#1e293b",
  marginBottom: "4px",
  fontSize: "16px",
};
const folderDetailStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
};
const createLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#3b82f6",
  fontWeight: "bold",
  marginTop: "12px",
  textTransform: "uppercase",
};
const logoutButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  background: "white",
  color: "#ef4444",
  border: "1px solid #fca5a5",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};
