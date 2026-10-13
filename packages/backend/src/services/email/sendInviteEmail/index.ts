import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface IParams {
  transport: Transporter;
  from: string;
  to: string;
  workspaceName: string;
  tempPassword: string;
  frontendUrl: string;
}

export const sendInviteEmail = async ({
  transport,
  from,
  to,
  workspaceName,
  tempPassword,
  frontendUrl,
}: IParams) => {
  const signInUrl = `${frontendUrl}/sign-in?email=${encodeURIComponent(to)}`;

  const info = await transport.sendMail({
    from,
    to,
    subject: `You've been invited to ${workspaceName} — Tayemno`,
    text: [
      `You've been invited to the workspace "${workspaceName}".`,
      "",
      `Email: ${to}`,
      `Temporary password: ${tempPassword}`,
      "",
      `Sign in at: ${signInUrl}`,
      "",
      "You will be required to change your password after your first sign-in.",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2>You've been invited to ${workspaceName}</h2>
        <p>Use the credentials below to sign in:</p>
        <table style="margin: 16px 0;">
          <tr><td style="color: #666; padding-right: 12px;">Email</td><td><strong>${to}</strong></td></tr>
          <tr><td style="color: #666; padding-right: 12px;">Password</td><td><strong>${tempPassword}</strong></td></tr>
        </table>
        <p><a href="${signInUrl}" style="display: inline-block; padding: 10px 20px; background: #228be6; color: #fff; text-decoration: none; border-radius: 4px;">Sign in</a></p>
        <p style="color: #666; margin-top: 16px;">You will be required to change your password after your first sign-in.</p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("Preview URL:", previewUrl);
  }
};
