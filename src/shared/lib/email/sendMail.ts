import { Resend } from "resend";

const sendMail = async (to: string, subject: string, html: string) => {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return;
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    console.error("RESEND_FROM_EMAIL is not set");
    return;
  }

  try {
    // Initialize Resend client lazily to avoid build-time errors
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("Error sending email:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};

export default sendMail;
