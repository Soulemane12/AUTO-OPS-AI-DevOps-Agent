"use client";

import { useState, useEffect } from "react";

interface RealIncident {
  id: string;
  filename: string;
  line?: number;
  error_type: string;
  message: string;
  traceback: string;
  code: string;
  status: "received" | "logged" | "planned" | "patch_proposed" | "sandbox_started" | "testing_patch" | "tested_ok" | "test_failed" | "tests_passed" | "awaiting_approval" | "pr_created" | "completed" | "failed";
  plan?: string;
  patch?: string;
  tests_passed?: boolean;
  test_output?: string;
  workspace_url?: string;
  pr_url?: string;
  audio_url?: string;
  created_at: string;
  updated_at: string;
}

interface TimelineItem {
  step: string;
  status: "completed" | "running" | "pending" | "failed";
  timestamp?: string;
}

interface IncidentDetailResponse {
  incident: RealIncident;
  timeline: TimelineItem[];
  timestamp: string;
}


function getStatusColor(status: RealIncident["status"]): string {
  switch (status) {
    case "received":
    case "logged":
      return "bg-yellow-100 text-yellow-800";
    case "planned":
    case "patch_proposed":
    case "sandbox_started":
    case "testing_patch":
      return "bg-blue-100 text-blue-800";
    case "tested_ok":
    case "tests_passed":
      return "bg-green-100 text-green-800";
    case "awaiting_approval":
      return "bg-purple-100 text-purple-800";
    case "pr_created":
    case "completed":
      return "bg-green-100 text-green-800";
    case "test_failed":
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function Dashboard() {
  const [selectedIncident, setSelectedIncident] = useState<RealIncident | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineItem[]>([]);
  const [incidents, setIncidents] = useState<RealIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  // Fetch incidents from API
  const fetchIncidents = async () => {
    try {
      const response = await fetch('/api/incidents');
      if (response.ok) {
        const data = await response.json();
        setIncidents(data.incidents || []);

        // If no incident selected and we have incidents, select the first one
        if (!selectedIncident && data.incidents.length > 0) {
          selectIncident(data.incidents[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch detailed incident data
  const selectIncident = async (incident: RealIncident) => {
    try {
      const response = await fetch(`/api/incidents/${incident.id}`);
      if (response.ok) {
        const data: IncidentDetailResponse = await response.json();
        setSelectedIncident(data.incident);
        setSelectedTimeline(data.timeline);
      }
    } catch (error) {
      console.error('Failed to fetch incident details:', error);
      // Fallback to basic incident data
      setSelectedIncident(incident);
      setSelectedTimeline([]);
    }
  };

  // Polling mechanism
  useEffect(() => {
    // Initial fetch
    fetchIncidents();

    // Set up polling every 4 seconds
    const interval = setInterval(() => {
      fetchIncidents();

      // Refresh selected incident details if one is selected
      if (selectedIncident) {
        selectIncident(selectedIncident);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedIncident?.id]);

  const handleRefresh = () => {
    console.log("Refreshing incidents...");
    fetchIncidents();
  };

  const handleManualCompletion = async () => {
    if (!selectedIncident) return;
    setIsCompleting(true);
    try {
      const response = await fetch(`/api/incidents/${selectedIncident.id}/complete`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete incident');
      }

      console.log(`Incident ${selectedIncident.id} manually completed`);
      await fetchIncidents();
      if (data.incident) {
        await selectIncident(data.incident);
      }
      alert('Incident marked as completed. GitHub PR and voice summary have been triggered.');
    } catch (error: any) {
      console.error('Failed to complete incident:', error);
      alert(error?.message || 'Failed to manually complete incident.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleClearIncidents = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/incidents/clear', { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear incidents');
      }
      console.log('Incidents cleared');
      await fetchIncidents();
      setSelectedIncident(null);
      setSelectedTimeline([]);
      alert(data.message || 'All incidents cleared.');
    } catch (error: any) {
      console.error('Failed to clear incidents:', error);
      alert(error?.message || 'Failed to clear incidents.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleTriggerDemoError = async () => {
    setIsTriggering(true);
    try {
      const payload = {
        filename: "auto-ops-demo-python/app.py",
        error_type: "KeyError",
        message: "'customer'",
        traceback: "Traceback (most recent call last):\n  File \"auto-ops-demo-python/app.py\", line 6, in <module>\n    print(checkout(data))\n  File \"auto-ops-demo-python/app.py\", line 2, in checkout\n    return order['customer']['id']\nKeyError: 'customer'",
        code: `def checkout(order):\n    return order["customer"]["id"]  # will error if keys missing\n\nif __name__ == "__main__":\n    data = {}  # guaranteed KeyError\n    print(checkout(data))`
      };

      const response = await fetch('/api/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to Find Error');
      }

      console.log('Demo error triggered:', data.incidentId);
      alert('Demo incident created. Watch the timeline to approve it.');
      fetchIncidents();
    } catch (error: any) {
      console.error('Failed to Find Error:', error);
      alert(error?.message || 'Failed to Find Error.');
    } finally {
      setIsTriggering(false);
    }
  };

  const playVoiceSummary = async (incidentId: string) => {
    try {
      console.log(`Playing voice summary for incident ${incidentId}`);

      // Fetch the audio from our API endpoint
      const response = await fetch(`/api/incidents/${incidentId}/audio`);

      if (!response.ok) {
        if (response.status === 404) {
          alert("Voice summary not available for this incident yet.");
          return;
        }
        throw new Error("Failed to fetch voice summary");
      }

      const contentType = response.headers.get("content-type");

      if (contentType?.includes("audio/")) {
        // Real audio response
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.play().catch((error) => {
          console.error("Error playing audio:", error);
          alert("Failed to play voice summary. Check browser audio permissions.");
        });

        // Clean up object URL after audio ends
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(audioUrl);
        });
      } else {
        // Mock response
        const data = await response.json();
        if (data.mock) {
          const summaryText = data.summary_text || data.message;
          const modalContent = `🎤 VOICE SUMMARY (Demo Mode)\n\n${summaryText}\n\n🎭 In production, this would be played as actual speech using ElevenLabs TTS with Rachel's voice.\n\nThe AUTO-OPS system successfully completed the full workflow:\n✅ Error detected and analyzed by Claude\n✅ Patch generated and tested in Daytona\n✅ Pull request created for CodeRabbit review\n✅ Voice summary generated`;
          alert(modalContent);
        }
      }
    } catch (error) {
      console.error("Error playing voice summary:", error);
      alert("Failed to load voice summary. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Auto-Ops Dashboard</h1>
          <p className="text-sm text-gray-600">Incident monitoring and automation</p>
        </div>
      </header>

        <div className="flex h-[calc(100vh-80px)]">
          {/* Left Panel - Incident List */}
          <div className="w-1/2 bg-white border-r">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">Incidents</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTriggerDemoError}
                    disabled={isTriggering}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                  >
                    {isTriggering ? 'Triggering…' : 'Find Error'}
                  </button>
                  <button
                    onClick={handleClearIncidents}
                    disabled={isClearing}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
                  >
                    {isClearing ? 'Clearing…' : 'Clear All'}
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

          <div className="overflow-y-auto h-full">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                Loading incidents...
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No incidents found.</p>
                <p className="text-sm">Run the error reporter to create incidents.</p>
              </div>
            ) : (
              incidents.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => selectIncident(incident)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedIncident?.id === incident.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {incident.filename}:{incident.line || '?'}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            incident.status
                          )}`}
                        >
                          {incident.status}
                        </span>
                      </div>
                      <p className="text-sm text-red-600 font-mono">
                        {incident.error_type}: {incident.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(incident.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Agent Console */}
        <div className="w-1/2 bg-white">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Agent Console</h2>
            {selectedIncident && (
              <p className="text-sm text-gray-600">
                {selectedIncident.filename}:{selectedIncident.line || '?'}
              </p>
            )}
          </div>

          <div className="p-6 overflow-y-auto h-full">
            {selectedIncident ? (
              <div className="space-y-4">
                <div className="mb-6">
                  <h3 className="text-base font-medium text-gray-900 mb-2">
                    Error Details
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 font-mono text-sm">
                      {selectedIncident.message}
                    </p>
                    <p className="text-red-600 text-sm mt-1">
                      File: {selectedIncident.filename}, Line: {selectedIncident.line}
                    </p>
                  </div>
                </div>

                {selectedIncident.status === "awaiting_approval" && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h3 className="text-base font-medium text-purple-900 mb-2">
                      Manual Approval Required
                    </h3>
                    <p className="text-sm text-purple-800 mb-3">
                      AUTO-OPS paused after all tests passed. Approve to create the GitHub PR and generate the voice summary.
                    </p>
                    <button
                      onClick={handleManualCompletion}
                      disabled={isCompleting}
                      className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-60"
                    >
                      {isCompleting ? "Completing…" : "Approve and Complete"}
                    </button>
                  </div>
                )}

                {selectedIncident.pr_url && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-base font-medium text-green-900 mb-2">
                      GitHub Pull Request
                    </h3>
                    <p className="text-sm text-green-800 mb-3">
                      View the AUTO-OPS fix that was pushed for this incident.
                    </p>
                    <a
                      href={selectedIncident.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-700"
                    >
                      Open Pull Request
                    </a>
                  </div>
                )}

                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-4">
                    Resolution Timeline
                  </h3>
                  <div className="space-y-3">
                    {selectedTimeline.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            item.status === "completed"
                              ? "bg-green-500"
                              : item.status === "running"
                              ? "bg-blue-500 animate-pulse"
                              : "bg-gray-300"
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm ${
                                item.status === "completed"
                                  ? "text-gray-900"
                                  : item.status === "running"
                                  ? "text-blue-900 font-medium"
                                  : "text-gray-500"
                              }`}
                            >
                              {item.status === "completed" ? "✅" : item.status === "running" ? "🔄" : "⏳"}{" "}
                              {item.step}
                            </span>
                            {item.timestamp && (
                              <span className="text-xs text-gray-500">
                                {item.timestamp}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voice Summary Section */}
                {selectedIncident.status === "completed" && selectedIncident.audio_url && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-base font-medium text-gray-900 mb-3">
                      🎤 Voice Summary
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Listen to an AI-generated summary of this incident resolution.
                    </p>
                    <button
                      onClick={() => playVoiceSummary(selectedIncident.id)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      🔊 Play Voice Summary
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-12">
                <p>Select an incident to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
