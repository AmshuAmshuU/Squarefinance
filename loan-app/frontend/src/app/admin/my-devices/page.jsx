"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  ArrowLeft,
  Smartphone,
  Tablet,
  Laptop,
  MapPin,
  Pencil,
  Check,
  X,
  LogOut,
} from "lucide-react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { useUI } from "../../../context/UIContext";
import { refreshSession } from "../../../services/api";
import {
  getMyDevices,
  renameDevice,
  logoutDevice,
  logoutOtherDevices,
} from "../../../services/device.service";

const deviceIcon = (type) => {
  if (type === "phone") return Smartphone;
  if (type === "tablet") return Tablet;
  return Laptop;
};

const activeText = (d) => {
  if (!d.lastActiveAt) return "";
  const at = new Date(d.lastActiveAt);
  if (Date.now() - at.getTime() < 2 * 60 * 1000) return "Active now";
  return `Active ${formatDistanceToNowStrict(at)} ago`;
};

const MyDevicesPage = () => {
  const { isDarkMode } = useUI();
  const [data, setData] = useState({ count: 0, currentKnown: true, devices: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [confirm, setConfirm] = useState(null); // { type: "one", device } | { type: "others" }
  const [busy, setBusy] = useState(false);
  const triedRenew = useRef(false);

  const load = useCallback(async () => {
    try {
      let result = await getMyDevices();
      // an older login has no device id yet: renew it once, no re-login needed
      if (!result.currentKnown && !triedRenew.current) {
        triedRenew.current = true;
        if (await refreshSession()) result = await getMyDevices();
      }
      setData(result);
      setError("");
    } catch (err) {
      setError(err.message || "Couldn't load your devices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (d) => {
    setEditingId(d.id);
    setNameDraft(d.name || "");
  };

  const saveName = async (d) => {
    setBusy(true);
    try {
      await renameDevice(d.id, nameDraft);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message || "Couldn't save the name.");
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.type === "one") await logoutDevice(confirm.device.id);
      else await logoutOtherDevices();
      setConfirm(null);
      await load();
    } catch (err) {
      setConfirm(null);
      setError(err.message || "Couldn't log out.");
    } finally {
      setBusy(false);
    }
  };

  const others = data.devices.filter((d) => !d.isCurrent);

  return (
    <AuthGuard>
      <style jsx global>{`
        .devices-dark-mode {
          background-color: #0f172a;
        }
        .devices-dark-mode .bg-white {
          background-color: #1e293b !important;
        }
        .devices-dark-mode .bg-slate-50,
        .devices-dark-mode .bg-slate-100 {
          background-color: #334155 !important;
        }
        .devices-dark-mode .bg-green-100 {
          background-color: rgba(34, 197, 94, 0.2) !important;
        }
        .devices-dark-mode .text-slate-900,
        .devices-dark-mode .text-slate-800 {
          color: #f1f5f9 !important;
        }
        .devices-dark-mode .text-slate-700,
        .devices-dark-mode .text-slate-600 {
          color: #cbd5e1 !important;
        }
        .devices-dark-mode .text-slate-500,
        .devices-dark-mode .text-slate-400 {
          color: #94a3b8 !important;
        }
        .devices-dark-mode .border-slate-200,
        .devices-dark-mode .border-slate-100 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .devices-dark-mode input {
          background-color: #0f172a !important;
          color: #f1f5f9 !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
      `}</style>
      <div className={`min-h-screen bg-[#F8FAFC] flex transition-colors duration-300 ${isDarkMode ? "devices-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-6 px-4 sm:px-8">
            <div className="max-w-xl mx-auto">
              <div className="flex items-center gap-3 mb-5">
                <Link href="/admin/dashboard" aria-label="Back" className="text-slate-500 hover:text-slate-800">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">My devices</h1>
              </div>

              {loading ? (
                <div className="py-20 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 mb-4">
                    <p className="text-xs font-bold text-slate-400">Logged in now</p>
                    <p className="text-2xl font-black text-slate-900">
                      {data.count} {data.count === 1 ? "device" : "devices"}
                    </p>
                  </div>

                  {error && <p className="text-xs font-bold text-red-500 mb-3">{error}</p>}

                  <div className="space-y-3">
                    {data.devices.map((d) => {
                      const Icon = deviceIcon(d.deviceType);
                      const kind = [d.os, d.browser].filter(Boolean).join(" · ") + (d.installedApp ? " · App" : "");
                      const title = d.name || kind || "Unknown device";
                      const loc = d.location || { type: "none" };
                      const placeLabel =
                        loc.type === "exact"
                          ? loc.label || "Pinned location"
                          : loc.type === "approx"
                            ? loc.label
                            : d.locationStatus === "denied"
                              ? "Location is off on this device"
                              : "Location not available";
                      const subLoc =
                        loc.type === "exact" ? "Exact location" : loc.type === "approx" ? "Approx." : "";
                      return (
                        <div key={d.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                d.isCurrent ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              {editingId === d.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    autoFocus
                                    value={nameDraft}
                                    maxLength={40}
                                    onChange={(e) => setNameDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveName(d);
                                      if (e.key === "Escape") setEditingId(null);
                                    }}
                                    placeholder="Shop laptop"
                                    className="w-full min-w-0 px-2 py-1 text-sm font-bold border border-slate-200 rounded-lg outline-none focus:border-blue-400"
                                  />
                                  <button
                                    onClick={() => saveName(d)}
                                    disabled={busy}
                                    aria-label="Save name"
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    aria-label="Cancel"
                                    className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-black text-slate-900 truncate">{title}</span>
                                    {d.isCurrent && (
                                      <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                        This device
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] font-medium text-slate-400">
                                    {d.name ? kind : "No name yet"}
                                  </p>
                                </>
                              )}
                            </div>

                            {editingId !== d.id && (
                              <>
                                <button
                                  onClick={() => startEdit(d)}
                                  aria-label="Rename device"
                                  className="p-1.5 text-slate-400 hover:text-slate-700 shrink-0"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                {!d.isCurrent && (
                                  <button
                                    onClick={() => setConfirm({ type: "one", device: d })}
                                    className="px-3 py-1.5 text-xs font-black text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 shrink-0"
                                  >
                                    Log out
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                            <MapPin
                              className={`w-5 h-5 shrink-0 ${
                                loc.type === "exact" ? "text-green-600" : "text-slate-400"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 break-words">{placeLabel}</p>
                              <p className="text-[11px] font-medium text-slate-400">
                                {[subLoc, activeText(d)].filter(Boolean).join(" · ")}
                              </p>
                              <p className="text-[11px] font-medium text-slate-400">
                                Logged in {format(new Date(d.loggedInAt), "d MMM, h:mm a")}
                              </p>
                            </div>
                            {loc.type === "exact" && (
                              <a
                                href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 text-xs font-black text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 shrink-0"
                              >
                                View on map
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {data.currentKnown && others.length > 0 && (
                    <button
                      onClick={() => setConfirm({ type: "others" })}
                      className="w-full mt-5 flex items-center justify-center gap-2 py-3 text-sm font-black text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out all other devices
                    </button>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {confirm && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm ${isDarkMode ? "devices-dark-mode" : ""}`}>
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-black text-slate-900 mb-1">
              {confirm.type === "one"
                ? "Log out this device?"
                : `Log out ${others.length} other ${others.length === 1 ? "device" : "devices"}?`}
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              {confirm.type === "one"
                ? "It will need to sign in again."
                : "They'll need to sign in again. This device stays logged in."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 text-sm font-black text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={doConfirm}
                disabled={busy}
                className="flex-1 py-2.5 text-sm font-black text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
};

export default MyDevicesPage;
