import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const socketServerUrl = (import.meta.env.VITE_SOCKET_URL || "").replace(
  /\/$/,
  "",
);
const socketClientModule = `${socketServerUrl}/socket.io/socket.io.esm.min.js`;

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function BanListener() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return undefined;
    }

    let socket;
    let cancelled = false;

    const redirectToLogin = (message = "Votre compte a ete desactive") => {
      clearSession();
      socket?.disconnect();
      navigate("/login", {
        replace: true,
        state: { error: message },
      });
    };

    import(/* @vite-ignore */ socketClientModule).then(({ io }) => {
      if (cancelled) {
        return;
      }

      socket = io(socketServerUrl || undefined, {
        auth: { token },
      });

      socket.on("user-disabled", (payload) => {
        redirectToLogin(payload?.message);
      });

      socket.on("connect_error", (err) => {
        if (
          ["Compte desactive", "Token invalide", "Token manquant"].includes(
            err.message,
          )
        ) {
          redirectToLogin(err.message);
        }
      });
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [location.pathname, navigate]);

  return null;
}

export default BanListener;
