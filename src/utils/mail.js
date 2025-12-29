import Mailgen from "mailgen";
import nodeMailer from "nodemailer";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "ProjectCamp",
      link: "https://www.youtube.com",
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailGenContent);
  const emailHtml = mailGenerator.generate(options.mailGenContent);

  const transporter = nodeMailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: "mail.projectcamp@example.com",
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error("Email service failed silently.");
  }
};

const emailVerificationContent = (userName, verificationUrl) => {
  return {
    body: {
      name: userName,
      intro: "Welcome to our App! We are excited to have you on board",
      action: {
        instructions:
          "To verify your account, please click on the button below",
        button: {
          color: "#22BC66",
          text: "Verify",
          link: verificationUrl,
        },
      },
      outro: "Need help? Just reply to this mail.",
    },
  };
};

const forgotPasswordMailContent = (userName, passwordResetUrl) => {
  return {
    body: {
      name: userName,
      intro: "We got a request to reset your password.",
      action: {
        instructions:
          "To reset your password, please click on the button below",
        button: {
          color: "#c6da18",
          text: "Reset",
          link: passwordResetUrl,
        },
      },
      outro: "Need help? Just reply to this mail.",
    },
  };
};

export { emailVerificationContent, forgotPasswordMailContent, sendEmail };
