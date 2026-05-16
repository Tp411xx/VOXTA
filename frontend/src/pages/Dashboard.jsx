import { useNavigate } from "react-router-dom";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div>
      <h1>Bienvenue {user?.username} !</h1>
      <p>Rôle : {user?.role}</p>
      <button onClick={() => navigate("/maps")}>Voir les maps</button>;
      <button onClick={handleLogout}>Se déconnecter</button>
    </div>
  );
}

export default Dashboard;
