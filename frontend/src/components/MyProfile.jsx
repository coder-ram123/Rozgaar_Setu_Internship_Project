import React from "react";
import { useSelector } from "react-redux";

const MyProfile = () => {
  const { user } = useSelector((state) => state.user);

  if (!user) {
    return <div>Loading your profile...</div>; // Display a loading state if user is not available
  }

  return (
    <div className="account_components">
      <h3>My Profile</h3>
      <div>
        <label>Full Name</label>
        <input type="text" disabled value={user.name || "N/A"} />
      </div>
      <div>
        <label>Email Address</label>
        <input type="email" disabled value={user.email || "N/A"} />
      </div>
      {user.role === "Job Seeker" && (
        <div>
          <label>My Preferred Job Niches</label>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            <input
              type="text"
              disabled
              value={(user.niches && user.niches.firstNiche) || "N/A"}
            />
            <input
              type="text"
              disabled
              value={(user.niches && user.niches.secondNiche) || "N/A"}
            />
            <input
              type="text"
              disabled
              value={(user.niches && user.niches.thirdNiche) || "N/A"}
            />
          </div>
        </div>
      )}
      <div>
        <label>Phone Number</label>
        <input type="number" disabled value={user.phone || "N/A"} />
      </div>
      <div>
        <label>Address</label>
        <input type="text" disabled value={user.address || "N/A"} />
      </div>
      <div>
        <label>Role</label>
        <input type="text" disabled value={user.role || "N/A"} />
      </div>
      <div>
        <label>Joined On</label>
        <input
          type="text"
          disabled
          value={
            user.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "N/A"
          }
        />
      </div>
    </div>
  );
};

export default MyProfile;
