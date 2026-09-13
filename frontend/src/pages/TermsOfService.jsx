import { Link } from "react-router-dom";

function TermsOfService() {
  return (
    <div className="register-container" style={{ maxWidth: 640 }}>
      <h2 style={{ textAlign: "center" }}>Terms of Service</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 24 }}>Last updated: September 13, 2026</p>

      <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-primary)" }}>
        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>1. Acceptance of Terms</h3>
        <p>By accessing or using Vync, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>2. Use of the Service</h3>
        <p>Vync provides a messaging and chat platform. You agree to use it only for lawful purposes and in a manner that does not infringe the rights of others.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>3. Accounts</h3>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate information when registering.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>4. Prohibited Conduct</h3>
        <p>You may not use the service to send spam, harass others, distribute malware, or engage in any illegal activity.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>5. Termination</h3>
        <p>We may suspend or terminate access to the service for violations of these terms at our sole discretion.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>6. Disclaimer of Warranties</h3>
        <p>The service is provided "as is" without warranties of any kind, express or implied.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>7. Limitation of Liability</h3>
        <p>Vync shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>8. Changes to These Terms</h3>
        <p>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the revised terms.</p>

        <h3 style={{ color: "#22c55e", margin: "16px 0 8px" }}>9. Contact</h3>
        <p>Questions about these terms: <a href="mailto:codepankaj84@gmail.com" style={{ color: "#22c55e" }}>codepankaj84@gmail.com</a></p>
      </div>

      <p style={{ textAlign: "center", marginTop: 24 }}>
        <Link to="/" style={{ color: "#22c55e", fontSize: 14 }}>Back to Register</Link>
      </p>
    </div>
  );
}

export default TermsOfService;