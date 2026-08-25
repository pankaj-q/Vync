import nodemailer from 'nodemailer';
import dns from 'node:dns';
import net from 'node:net';

dns.setDefaultResultOrder('ipv4first');

const isGmailAPI = () => Boolean(process.env.GMAIL_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const isSmtp = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const emailProvider = () => (isGmailAPI() ? 'gmail-api' : isSmtp() ? 'smtp' : null);
const isEmailConfigured = () => Boolean(emailProvider());
const senderEmail = () => process.env.SMTP_USER || 'codepankaj84@gmail.com';

const getAccessToken = async () => {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: process.env.GMAIL_REFRESH_TOKEN,
            grant_type: 'refresh_token',
        }),
    });
    if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.access_token;
};

const sendViaGmailAPI = async ({ to, subject, html }) => {
    const accessToken = await getAccessToken();
    const from = senderEmail();
    const emailParts = [
        `From: Vync <${from}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(html).toString('base64'),
    ];
    const raw = Buffer.from(emailParts.join('\r\n')).toString('base64url');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Gmail API ${res.status}: ${body.slice(0, 300)}`);
    }
    return res.json();
};

const createTransporter = () => nodemailer.createTransport({
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

const sendEmail = async ({ to, subject, html }) => {
    if (isGmailAPI()) return sendViaGmailAPI({ to, subject, html });
    const transporter = createTransporter();
    return transporter.sendMail({
        from: `"Vync" <${senderEmail()}>`,
        to,
        subject,
        html,
    });
};

const otpTemplate = (name, otp, purpose) => `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; text-align: center;">
        <h2 style="color: #22c55e;">Vync</h2>
        <p style="font-size: 15px; color: #374151;">Hi ${name},</p>
        <p style="font-size: 14px; color: #6b7280;">Your ${purpose} code is:</p>
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827; margin: 24px 0; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">${otp}</div>
        <p style="font-size: 13px; color: #9ca3af;">This code expires in 10 minutes.</p>
        <p style="font-size: 13px; color: #9ca3af;">Do not share this code with anyone.</p>
    </div>
`;

const sendVerificationOTP = async (email, name, otp) => {
    if (!isEmailConfigured()) {
        console.log(`\n=== EMAIL VERIFICATION OTP (no email provider configured) ===`);
        console.log(`To: ${email}`);
        console.log(`OTP: ${otp}`);
        console.log(`============================================================\n`);
        return;
    }
    return sendEmail({
        to: email,
        subject: 'Your Vync verification code',
        html: otpTemplate(name, otp, 'verification'),
    });
};

const sendResetPasswordOTP = async (email, name, otp) => {
    if (!isEmailConfigured()) {
        console.log(`\n=== PASSWORD RESET OTP (no email provider configured) ===`);
        console.log(`To: ${email}`);
        console.log(`OTP: ${otp}`);
        console.log(`========================================================\n`);
        return;
    }
    return sendEmail({
        to: email,
        subject: 'Your Vync password reset code',
        html: otpTemplate(name, otp, 'password reset'),
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
    const provider = emailProvider();
    const result = { provider, configured: isEmailConfigured() };

    if (provider === 'gmail-api') {
        result.sender = senderEmail();
        result.note = 'Using Gmail API via HTTPS — no SMTP ports involved';
        try {
            await getAccessToken();
            result.tokenRefresh = 'OK';
        } catch (e) {
            result.tokenRefresh = e.message;
        }
        return result;
    }

    if (!provider) return result;

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587');
    Object.assign(result, { host, port });

    try { result.dnsA_ipv4 = await dns.promises.resolve4(host); } catch (e) { result.dnsA_ipv4 = e.code; }
    try { result.dnsAAAA_ipv6 = await dns.promises.resolve6(host); } catch (e) { result.dnsAAAA_ipv6 = e.code; }

    if (Array.isArray(result.dnsA_ipv4)) {
        result.tcp4_port587 = await tcpConnectTest(result.dnsA_ipv4[0], 587, 4);
        result.tcp4_configuredPort = await tcpConnectTest(result.dnsA_ipv4[0], port, 4);
    }
    if (Array.isArray(result.dnsAAAA_ipv6)) {
        result.tcp6 = await tcpConnectTest(result.dnsAAAA_ipv6[0], 587, 6);
    }

    try {
        const t = createTransporter();
        await t.verify();
        result.smtpVerify = 'OK';
        t.close();
    } catch (err) {
        result.smtpVerify = { error: err.message, code: err.code, response: err.response };
    }
    return result;
};

const sendTestEmail = async (to) => {
    if (!isEmailConfigured()) return { ok: false, error: 'No email provider configured' };
    try {
        const info = await sendEmail({
            to,
            subject: 'Vync delivery test',
            html: `<p>If you received this, email sending works. (${new Date().toISOString()})</p>`,
        });
        return { ok: true, messageId: info?.messageId || info?.id, response: info?.response };
    } catch (err) {
        return { ok: false, error: err.message, code: err.code };
    }
};

export { sendVerificationOTP, sendResetPasswordOTP, isEmailConfigured, verifySmtp, sendTestEmail };
