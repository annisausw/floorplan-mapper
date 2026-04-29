/**
 * @file Cropped Image Modal Component
 * @description Modal dialog for displaying and downloading cropped route maps
 */

import React from "react";

interface CroppedImageModalProps {
  displayImgUrl: string | null;
  onDownload: () => void;
  onClose: () => void;
}

/**
 * CroppedImageModal Component
 * Displays generated cropped image with download option
 */
function CroppedImageModal({
  displayImgUrl,
  onDownload,
  onClose,
}: CroppedImageModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "white",
          padding: 30,
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: "90%",
          maxHeight: "90%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
        }}
      >
        <h2 style={{ margin: "0 0 20px 0", color: "#0f172a" }}>
          📸 Generated Route Map
        </h2>

        <div
          style={{
            background: "#f1f5f9",
            borderRadius: 8,
            padding: 10,
            overflow: "hidden",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          {displayImgUrl ? (
            <img
              src={displayImgUrl}
              alt="Cropped Route"
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                maxWidth: "100%",
                maxHeight: "60vh",
                objectFit: "contain",
                background: "white",
              }}
            />
          ) : (
            <div style={{ color: "#64748b", padding: 40 }}>
              Loading secure image...
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, width: "100%" }}>
          <button
            onClick={onDownload}
            style={{
              flex: 1,
              padding: "12px 20px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 14,
            }}
          >
            💾 Download High-Res PNG
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "12px 24px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 14,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CroppedImageModal;
