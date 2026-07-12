const { google } = require("googleapis");

// Initialize OAuth2 client once
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const GMAIL_USER = process.env.GMAIL_USER;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "https://developers.google.com/oauthplayground",
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

// Pre-initialize Gmail API instance
const gmail = google.gmail({ version: "v1", auth: oauth2Client });

const sendOTP = async (email, otp) => {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !GMAIL_USER) {
    console.error(
      "CRITICAL: Gmail OAuth2 credentials missing from environment!",
    );
    throw new Error("Email configuration missing");
  }

  try {
    const subject = "Password Reset Request - Square Finance";
    const from = GMAIL_USER;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
                .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb; }
                .header { background-color: #2563eb; padding: 30px; text-align: center; color: white; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
                .content { padding: 40px; }
                .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #111827; }
                .instruction { font-size: 16px; color: #4b5563; margin-bottom: 32px; }
                .otp-container { background-color: #f3f4f6; border: 2px dashed #2563eb; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 32px; }
                .otp-code { font-size: 36px; font-weight: 800; color: #2563eb; letter-spacing: 0.25em; margin: 0; }
                .expiry-note { font-size: 14px; color: #ef4444; font-weight: 600; text-align: center; margin-bottom: 24px; }
                .footer { padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; }
                .footer p { font-size: 12px; color: #9ca3af; margin: 4px 0; }
                .security-notice { font-size: 12px; color: #6b7280; margin-top: 24px; font-style: italic; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Square Finance</h1>
                </div>
                <div class="content">
                    <p class="greeting">Password Reset Request</p>
                    <p class="instruction">We received a request to reset the password for your account. Please use the verification code below to complete the process:</p>
                    
                    <div class="otp-container">
                        <p class="otp-code">${otp}</p>
                    </div>
                    
                    <p class="expiry-note">This code expires in 2 minutes for security reasons.</p>
                    
                    <p class="security-notice">If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 Square Finance. All rights reserved.</p>
                    <p>Securing your financial future.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    // MIME format for sending via Gmail API
    const str = [
      'Content-Type: text/html; charset="UTF-8"\n',
      "MIME-Version: 1.0\n",
      "Content-Transfer-Encoding: 7bit\n",
      "to: ",
      email,
      "\n",
      "from: ",
      from,
      "\n",
      "subject: ",
      subject,
      "\n\n",
      htmlContent,
    ].join("");

    const encodedMessage = Buffer.from(str)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`OTP sent to ${email} via Gmail REST API:`, result.data.id);
    return result.data;
  } catch (error) {
    console.error("Error sending email via REST API:", error);
    throw error;
  }
};

const sendInquiryEmail = async (inquiryData) => {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !GMAIL_USER) {
    throw new Error("Email configuration missing");
  }

  const { fullName, phoneNumber, loanType, message } = inquiryData;

  try {
    const subject = `New Loan Inquiry: ${loanType} - ${fullName}`;
    const from = GMAIL_USER;
    const to = "squarefinance2025@gmail.com";

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
                .header { border-bottom: 2px solid #2563eb; margin-bottom: 20px; padding-bottom: 10px; }
                .header h1 { color: #2563eb; margin: 0; font-size: 20px; }
                .field { margin-bottom: 15px; }
                .label { font-weight: bold; color: #4b5563; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
                .value { font-size: 16px; color: #111827; margin-top: 4px; }
                .message-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px; }
                .footer { margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New Vehicle Loan Inquiry</h1>
                </div>
                <div class="field">
                    <div class="label">Full Name</div>
                    <div class="value">${fullName}</div>
                </div>
                <div class="field">
                    <div class="label">Phone Number</div>
                    <div class="value">${phoneNumber}</div>
                </div>
                <div class="field">
                    <div class="label">Loan Type</div>
                    <div class="value">${loanType}</div>
                </div>
                <div class="message-box">
                    <div class="label">Message</div>
                    <div class="value">${message || "No additional message provided."}</div>
                </div>
                <div class="footer">
                    <p>&copy; 2026 Square Finance. Received from Landing Page.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const str = [
      'Content-Type: text/html; charset="UTF-8"\n',
      "MIME-Version: 1.0\n",
      "Content-Transfer-Encoding: 7bit\n",
      "to: ", to, "\n",
      "from: ", from, "\n",
      "subject: ", subject, "\n\n",
      htmlContent,
    ].join("");

    const encodedMessage = Buffer.from(str)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending inquiry email:", error);
    throw error;
  }
};

module.exports = { sendOTP, sendInquiryEmail };
