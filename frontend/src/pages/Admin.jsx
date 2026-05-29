import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Admin() {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const [maps, setMaps] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("maps");

  const fetchMaps = () => {
    axios
      .get("/api/admin/maps", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMaps(res.data));
  };

  const fetchUsers = () => {
    axios
      .get("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data));
  };

  useEffect(() => {
    fetchMaps();
    fetchUsers();
  }, []);

  const updateMapStatus = async (id, status) => {
    await axios.patch(
      `/api/admin/maps/${id}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    fetchMaps();
  };

  const disableUser = async (id) => {
    await axios.patch(
      `/api/admin/users/${id}/disable`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    fetchUsers();
  };

  const statusColor = (status) => {
    if (status === "APPROVED") return "#81c784";
    if (status === "REJECTED") return "#e57373";
    return "#ffb74d";
  };

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Panel Admin</h1>
        <button onClick={() => navigate("/dashboard")}>← Dashboard</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={() => setTab("maps")}
          style={{
            padding: "8px 20px",
            background: tab === "maps" ? "#4fc3f7" : "#333",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Maps ({maps.filter((m) => m.status === "PENDING").length} en attente)
        </button>
        <button
          onClick={() => setTab("users")}
          style={{
            padding: "8px 20px",
            background: tab === "users" ? "#4fc3f7" : "#333",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Utilisateurs ({users.length})
        </button>
      </div>

      {tab === "maps" && (
        <div>
          <h2>Gestion des maps</h2>
          {maps.map((map) => (
            <div
              key={map.id}
              style={{
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "14px",
                marginBottom: "10px",
                background: "#1a1a2e",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>{map.title}</strong>
                  <span style={{ marginLeft: "10px", color: "#aaa" }}>
                    BPM : {map.bpm} | Auteur : {map.author}
                  </span>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span
                    style={{
                      color: statusColor(map.status),
                      fontWeight: "bold",
                    }}
                  >
                    {map.status}
                  </span>
                  {map.status !== "APPROVED" && (
                    <button
                      onClick={() => updateMapStatus(map.id, "APPROVED")}
                      style={{
                        background: "#81c784",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 10px",
                        cursor: "pointer",
                      }}
                    >
                      ✓ Approuver
                    </button>
                  )}
                  {map.status !== "REJECTED" && (
                    <button
                      onClick={() => updateMapStatus(map.id, "REJECTED")}
                      style={{
                        background: "#e57373",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 10px",
                        cursor: "pointer",
                      }}
                    >
                      ✗ Refuser
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div>
          <h2>Gestion des utilisateurs</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Username</th>
                <th style={th}>Email</th>
                <th style={th}>Rôle</th>
                <th style={th}>Inscrit le</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={td}>{u.username}</td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>
                    <span
                      style={{
                        color:
                          u.role === "ADMIN"
                            ? "gold"
                            : u.role === "DISABLED"
                              ? "#e57373"
                              : "white",
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td style={td}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={td}>
                    {u.role !== "ADMIN" && u.role !== "DISABLED" && (
                      <button
                        onClick={() => disableUser(u.id)}
                        style={{
                          background: "#e57373",
                          border: "none",
                          borderRadius: "4px",
                          padding: "4px 10px",
                          cursor: "pointer",
                        }}
                      >
                        Désactiver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = {
  padding: "8px",
  borderBottom: "1px solid #444",
  textAlign: "left",
  color: "#aaa",
};
const td = { padding: "8px", borderBottom: "1px solid #333" };

export default Admin;
