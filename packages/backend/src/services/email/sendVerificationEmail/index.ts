import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export const sendVerificationEmail = async (
  transport: Transporter,
  from: string,
  to: string,
  code: string,
) => {
  const info = await transport.sendMail({
    from,
    to,
    subject: "Verify your email — Tayemno",
    text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center;">${code}</p>
        <p style="color: #666;">This code expires in 15 minutes.</p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("Preview URL:", previewUrl);
  }
};
