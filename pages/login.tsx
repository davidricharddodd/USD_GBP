import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { useAuth } from "../helpers/useAuth";
import { OAuthButtonGroup } from "../components/OAuthButtonGroup";
import styles from "./login.module.css";

export default function Login() {
  const { authState } = useAuth();

  // Redirect to the dashboard if the user is already authenticated
  if (authState.type === "authenticated") {
    return <Navigate to="/" replace />;
  }

  // Render the login interface (even if authState is loading, as requested)
  return (
    <div className={styles.container}>
      <Helmet>
        <title>Terminal Access | USD/GBP Tracker</title>
      </Helmet>

      <main className={styles.card}>
        <div className={styles.header}>
          <div className={styles.systemStatus}>
            <span className={styles.statusDot} />
            SECURE TERMINAL ACCESS
          </div>
          <h1 className={styles.title}>USD to GBP Tracker</h1>
          <p className={styles.subtitle}>
            Authenticate to access high-precision FX monitoring.
          </p>
        </div>

        <div className={styles.authSection}>
          <OAuthButtonGroup />
        </div>

        <div className={styles.footer}>
          <span>STATUS: ENCRYPTED</span>
          <span>v1.0.0</span>
        </div>
      
        <div style={{ marginTop: '1rem', textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>
          <a href="/admin-login" style={{ color: 'inherit' }}>Admin login</a>
        </div>
      </main>
    </div>
  );
}