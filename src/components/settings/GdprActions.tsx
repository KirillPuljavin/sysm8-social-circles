"use client";

import { useState } from "react";

export default function GdprActions() {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/user/export", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const data = await response.json();

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `thecord-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to export data. Please try again.");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Deletion failed");
      }

      // Redirect to logout after successful deletion
      window.location.href = "/.auth/logout";
    } catch (error) {
      alert("Failed to delete account. Please try again.");
      console.error("Deletion error:", error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-lg">
      {/* Data Export */}
      <div>
        <h3 className="text-lg font-semibold mb-sm">Export Your Data</h3>
        <p className="text-sm text-secondary mb-md">
          Download all your personal data in JSON format, including profile information,
          server memberships, and messages.
        </p>
        <button
          onClick={handleExportData}
          disabled={isExporting}
          className="btn btn-primary"
        >
          {isExporting ? "Exporting..." : "Download Data Export"}
        </button>
      </div>

      <div className="divider"></div>

      {/* Account Deletion */}
      <div>
        <h3 className="text-lg font-semibold mb-sm text-error">Delete Account</h3>
        <p className="text-sm text-secondary mb-md">
          Permanently delete your account and all associated data. This action cannot be undone.
          All servers you own will be deleted, and you will be removed from all other servers.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-danger"
          >
            Delete My Account
          </button>
        ) : (
          <div className="alert alert-error p-lg">
            <p className="text-base font-semibold mb-md">
              ⚠️ Are you absolutely sure?
            </p>
            <p className="text-sm mb-md">
              This will permanently delete your account, all servers you own, and remove you
              from all other servers. This action is irreversible.
            </p>
            <div className="flex gap-md">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="btn btn-danger"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Everything"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
