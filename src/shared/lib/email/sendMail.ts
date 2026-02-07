import { Resend } from "resend";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("email");

const sendMail = async (to: string, subject: string, html: string) => {
  if (!process.env.RESEND_API_KEY) {
    logger.error("RESEND_API_KEY is not set");
    return;
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    logger.error("RESEND_FROM_EMAIL is not set");
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
      logger.error("Error sending email", error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error("Failed to send email", error);
    throw error;
  }
};

export default sendMail;
