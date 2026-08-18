import nodemailer from 'nodemailer';

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

const verifySmtp = async () => {
    if (!isEmailConfigured()) return { ok: false, error: 'SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)' };
    const transporter = createTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not created' };
    try {
        await transporter.verify();
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message, code: err.code, response: err.response };
    } finally {
        transporter.close();
    }
};

export { sendVerificationEmail, sendResetPasswordEmail, isEmailConfigured, verifySmtp };