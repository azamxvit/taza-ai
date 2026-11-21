import { useState } from "react";
import { CATEGORIES } from "../categories";
import { compressImages } from "../compressUtils";

const MAX_PHOTOS = 5;

export default function ReportForm({ pos, onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("trash");
  const [images, setImages] = useState([]); // array of File
  const [previews, setPreviews] = useState([]); // array of object URLs
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) =>
      f.type.startsWith("image/")
    );
    setImages((prev) => {
      const next = [...prev, ...incoming].slice(0, MAX_PHOTOS);
      // rebuild previews from the new set
      setPreviews(next.map((f) => URL.createObjectURL(f)));
      return next;
    });
  };

  const removeAt = (idx) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setPreviews(next.map((f) => URL.createObjectURL(f)));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please add a short title.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Fast client-side pre-compress, then server re-optimizes (auto-orient).
      const compressed = await compressImages(images, { maxDim: 1280, quality: 0.8 });
      await onSubmit({
        title: title.trim(),
        desc: desc.trim(),
        category,
        lat: pos.lat,
        lng: pos.lng,
        images: compressed,
      });
      setTitle("");
      setDesc("");
      setCategory("trash");
      setImages([]);
      setPreviews([]);
    } catch (err) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Report this location</h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-white text-sm"
          >
            Cancel
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Lat {pos.lat.toFixed(5)}, Lng {pos.lng.toFixed(5)}
      </p>

      <input
        className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400"
        type="text"
        placeholder="Title (e.g. Overflowing bin)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <select
        className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <textarea
        className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400"
        placeholder="Description"
        rows={3}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />

      {/* Multi-photo upload (up to 5, any image type) */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Photos of the area ({images.length}/{MAX_PHOTOS})
        </label>
        <input
          className="text-sm text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-teal-600 file:text-white hover:file:bg-teal-500"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img
                  src={src}
                  alt={`preview ${i + 1}`}
                  className="w-full h-20 object-cover rounded border border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        disabled={loading}
        type="submit"
        className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold py-2 rounded transition"
      >
        {loading ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
