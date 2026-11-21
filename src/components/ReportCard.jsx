import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { categoryById } from "../categories";
import ImageGallery from "./ImageGallery";
import { hasUpvoted, markUpvoted } from "../upvoteStore";

function fallbackImage(title) {
  const t = encodeURIComponent((title || "Report").split(" ")[0]);
  return `https://placehold.co/400x200/22C55E/FFFFFF?text=${t}`;
}

export default function ReportCard({ report, onDelete, onResolve, onUpvote, onOpen }) {
  const cat = categoryById(report.category);
  const photos = (report.imageUrls && report.imageUrls.length ? report.imageUrls : report.imageUrl ? [report.imageUrl] : []);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [upvoted, setUpvoted] = useState(() => hasUpvoted(report._id));
  const resolved = report.status === "resolved";
  const navigate = useNavigate();

  const guard = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      setMenu(false);
    }
  };

  return (
    <div
      className={`relative bg-gray-800 rounded-xl shadow-lg border transition ${
        resolved ? "border-green-700/60 opacity-90" : "border-gray-700 hover:border-teal-500"
      }`}
    >
      <div className="relative rounded-t-xl overflow-hidden">
        {photos.length > 0 ? (
          <ImageGallery images={photos} alt={report.title} />
        ) : (
          <img
            src={fallbackImage(report.title)}
            alt={report.title}
            onClick={() => onOpen && onOpen(report)}
            className="w-full h-44 object-cover cursor-pointer"
          />
        )}
        {resolved && (
          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full bg-green-600 text-white shadow z-10">
            ✓ Resolved
          </span>
        )}
        <span
          className="absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full z-10"
          style={{ backgroundColor: cat.color + "22", color: cat.color }}
        >
          {cat.label}
        </span>
      </div>

      <div className="p-4">
        <h2
          className="font-bold text-lg text-white truncate cursor-pointer"
          onClick={() => onOpen && onOpen(report)}
        >
          {report.title}
        </h2>
        <p className="text-gray-400 text-sm mb-3 line-clamp-3">
          {report.desc || "No description provided."}
        </p>
        <div className="text-xs text-teal-400 font-mono bg-gray-900/60 p-2 rounded inline-block">
          Lat {Number(report.lat).toFixed(4)}, Lng {Number(report.lng).toFixed(4)}
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              if (upvoted) return;
              setUpvoted(true);
              markUpvoted(report._id);
              guard(() => onUpvote(report._id));
            }}
            disabled={busy || upvoted}
            className={`text-xs font-semibold px-3 py-1.5 rounded border transition disabled:opacity-60 ${
              upvoted
                ? "bg-blue-600/30 text-blue-200 border-blue-700/50 cursor-default"
                : "bg-blue-600/20 text-blue-300 border-blue-700/50 hover:bg-blue-600/30"
            }`}
            title={upvoted ? "You already confirmed this" : "I see this too"}
          >
            ▲ I see this ({report.upvotes || 0})
          </button>

          <button
            onClick={() => navigate(`/map#focus=${report._id}`)}
            className="text-xs font-semibold px-3 py-1.5 rounded bg-purple-600/20 text-purple-300 border border-purple-700/50 hover:bg-purple-600/30"
            title="Show this report on the map"
          >
            📍 View in map
          </button>

          {!resolved && (
            <button
              onClick={() => guard(() => onResolve(report._id, "solved"))}
              disabled={busy}
              className="text-xs font-semibold px-3 py-1.5 rounded bg-green-600/20 text-green-300 border border-green-700/50 hover:bg-green-600/30 disabled:opacity-50"
            >
              ✓ Mark solved
            </button>
          )}

          {/* More menu — anchored to the button (not bottom-right) */}
          <div className="relative">
            <button
              onClick={() => setMenu((m) => !m)}
              disabled={busy}
              className="text-xs font-semibold px-3 py-1.5 rounded bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600 disabled:opacity-50"
            >
              ⋯ More
            </button>
            {menu && (
              <div className="absolute right-0 mt-1 z-20 w-44 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                <button
                  onClick={() => guard(() => onResolve(report._id, "false"))}
                  className="block w-full text-left px-3 py-2 text-sm text-amber-300 hover:bg-gray-800"
                >
                  ⚑ Report as false
                </button>
                <button
                  onClick={() => guard(() => onDelete(report._id))}
                  className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800"
                >
                  🗑 Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
