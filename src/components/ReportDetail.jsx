import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect } from "react";
import { coloredIcon } from "../leafletIcon";
import { categoryById } from "../categories";
import ImageGallery from "./ImageGallery";

function FlyTo({ pos }) {
  const map = useMap();
  useEffect(() => {
    map.setView(pos, 15);
  }, [map, pos]);
  return null;
}

export default function ReportDetail({ report, onClose, onResolve, onUpvote, onDelete }) {
  if (!report) return null;
  const cat = categoryById(report.category);
  const resolved = report.status === "resolved";
  const photos = (report.imageUrls && report.imageUrls.length ? report.imageUrls : report.imageUrl ? [report.imageUrl] : []);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {photos.length > 0 ? (
            <div className="p-3">
              <ImageGallery images={photos} alt={report.title} />
            </div>
          ) : (
            <div className="w-full h-64 bg-gray-800 flex items-center justify-center text-gray-500">
              No photo
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-gray-900/80 text-white hover:bg-gray-700"
          >
            ✕
          </button>
          {resolved && (
            <span className="absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full bg-green-600 text-white">
              ✓ Resolved
            </span>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: cat.color + "22", color: cat.color }}
            >
              {cat.label}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(report.createdAt).toLocaleString()}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{report.title}</h2>
          <p className="text-gray-300 mb-4">{report.desc || "No description provided."}</p>

          <div className="text-xs text-teal-400 font-mono bg-gray-800/60 p-2 rounded inline-block mb-4">
            Lat {Number(report.lat).toFixed(4)}, Lng {Number(report.lng).toFixed(4)}
          </div>

          <div className="h-56 rounded-lg overflow-hidden mb-4">
            <MapContainer
              center={[report.lat, report.lng]}
              zoom={15}
              className="h-full w-full"
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <Marker position={[report.lat, report.lng]} icon={coloredIcon(cat.color)} />
              <FlyTo pos={[report.lat, report.lng]} />
            </MapContainer>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onUpvote(report._id)}
              className="text-sm font-semibold px-4 py-2 rounded bg-blue-600/20 text-blue-300 border border-blue-700/50 hover:bg-blue-600/30"
            >
              ▲ I see this ({report.upvotes || 0})
            </button>
            {!resolved && (
              <button
                onClick={() => onResolve(report._id, "solved")}
                className="text-sm font-semibold px-4 py-2 rounded bg-green-600/20 text-green-300 border border-green-700/50 hover:bg-green-600/30"
              >
                ✓ Mark solved
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                window.location.href = `/map?focus=${report._id}`;
              }}
              className="text-sm font-semibold px-4 py-2 rounded bg-purple-600/20 text-purple-300 border border-purple-700/50 hover:bg-purple-600/30"
            >
              📍 View in map
            </button>
            <button
              onClick={() => {
                onResolve(report._id, "false");
                onClose();
              }}
              className="text-sm font-semibold px-4 py-2 rounded bg-amber-600/20 text-amber-300 border border-amber-700/50 hover:bg-amber-600/30"
            >
              ⚑ Report as false
            </button>
            <button
              onClick={() => {
                onDelete(report._id);
                onClose();
              }}
              className="text-sm font-semibold px-4 py-2 rounded bg-red-600/20 text-red-300 border border-red-700/50 hover:bg-red-600/30"
            >
              🗑 Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
