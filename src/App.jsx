import Header from "./components/Header";
import Footer from "./components/Footer";
import MapView from "./components/MapView";
import ReportsPage from "./components/ReportsPage";
import { Routes, Route } from "react-router-dom";

function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-center">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
        Keep your city clean, one report at a time.
      </h2>
      <p className="text-gray-400 max-w-2xl mx-auto mb-8">
        CleanCity lets residents flag litter, pollution, and hazards on a live map.
        Spot an issue, drop a pin, add a photo — and help your community respond
        faster.
      </p>
      <div className="grid sm:grid-cols-3 gap-4 text-left">
        <Feature
          title="1. Spot it"
          body="Open the map and click the exact location of the problem."
        />
        <Feature
          title="2. Report it"
          body="Add a title, category, and photo. No account needed."
        />
        <Feature
          title="3. Track it"
          body="Browse all community reports and filter by issue type."
        />
      </div>
      <a
        href="/map"
        className="inline-block mt-8 bg-teal-600 hover:bg-teal-500 text-white font-semibold px-6 py-3 rounded-lg transition"
      >
        Open the map
      </a>
    </div>
  );
}

function Feature({ title, body }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="font-bold text-teal-400 mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{body}</p>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 font-sans text-white">
      <Header />
      <main className="flex-grow w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
