import nodemailer from 'nodemailer';
import dns from 'node:dns';
import net from 'node:net';

dns.setDefaultResultOrder('ipv4first');

const isEmailConfigured = () => {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

const createTransporter = () => {
    if (!isEmailConfigured()) return null;
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
    });
};

const sendVerificationEmail = async (email, name, token) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const link = `${clientUrl}/verify-email?token=${token}`;

    if (!isEmailConfigured()) {
        console.log(`\n=== EMAIL VERIFICATION (SMTP not configured) ===`);
        console.log(`To: ${email}`);
        console.log(`Verification link: ${link}`);
        console.log(`============================================\n`);
        return;
    }

    const transporter = createTransporter();
    if (!transporter) return;

    await transporter.sendMail({
        from: `"Vync" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify your Vync account',
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #22c55e;">Welcome to Vync!</h2>
                <p>Hi ${name},</p>
                <p>Click the button below to verify your email address:</p>
                <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #22c55e; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0;">Verify Email</a>
                <p style="color: #6b7280; font-size: 13px;">Or copy this link: ${link}</p>
                <p style="color: #6b7280; font-size: 12px;">This link expires in 24 hours.</p>
            </div>
        `,
    });
};

const sendResetPasswordEmail = async (email, name, token) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const link = `${clientUrl}/reset-password?token=${token}`;

    if (!isEmailConfigured()) {
        console.log(`\n=== PASSWORD RESET (SMTP not configured) ===`);
        console.log(`To: ${email}`);
        console.log(`Reset link: ${link}`);
        console.log(`============================================\n`);
        return;
    }

    const transporter = createTransporter();
    if (!transporter) return;

    await transporter.sendMail({
        from: `"Vync" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset your Vync password',
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #22c55e;">Password Reset Request</h2>
                <p>Hi ${name},</p>
                <p>You requested to reset your password. Click the button below to set a new password:</p>
                <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #22c55e; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0;">Reset Password</a>
                <p style="color: #6b7280; font-size: 13px;">Or copy this link: ${link}</p>
                <p style="color: #6b7280; font-size: 12px;">This link expires in 1 hour.</p>
                <p style="color: #6b7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
            </div>
        `,
    });
};

const tcpConnectTest = (host, port, family) => new Promise((resolve) => {
    const socket = net.connect({ host, port, family });
    const finish = (r) => { socket.destroy(); resolve(r); };
    socket.setTimeout(10000, () => finish('timeout'));
    socket.on('connect', () => finish('connected'));
    socket.on('error', (e) => finish(e.code || e.message));
});

const verifySmtp = async () => {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587');
    const result = { configured: isEmailConfigured(), host, port };

    try { result.dnsA_ipv4 = await dns.promises.resolve4(host); } catch (e) { result.dnsA_ipv4 = e.code; }
    try { result.dnsAAAA_ipv6 = await dns.promises.resolve6(host); } catch (e) { result.dnsAAAA_ipv6 = e.code; }

    if (Array.isArray(result.dnsA_ipv4)) {
        result.tcp4_port587 = await tcpConnectTest(result.dnsA_ipv4[0], 587, 4);
        result.tcp4_configuredPort = await tcpConnectTest(result.dnsA_ipv4[0], port, 4);
    }
    if (Array.isArray(result.dnsAAAA_ipv6)) {
        result.tcp6 = await tcpConnectTest(result.dnsAAAA_ipv6[0], 587, 6);
    }

    if (!isEmailConfigured()) {
        result.smtpVerify = 'SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)';
        return result;
    }

    const transporter = createTransporter();
    if (!transporter) { result.smtpVerify = 'Transporter not created'; return result; }
    try {
        await transporter.verify();
        result.smtpVerify = 'OK';
    } catch (err) {
        result.smtpVerify = { error: err.message, code: err.code, response: err.response };
    } finally {
        transporter.close();
    }
    return result;
};

export { sendVerificationEmail, sendResetPasswordEmail, isEmailConfigured, verifySmtp };