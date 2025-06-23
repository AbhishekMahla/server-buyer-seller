const nodemailer = require("nodemailer");

//  Email service for sending notifications

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  //  Send an email

  async sendEmail(options) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    return await this.transporter.sendMail(mailOptions);
  }

  //  Send bid selection notification to seller

  async sendBidSelectionNotification(options) {
    return this.sendEmail({
      to: options.email,
      subject: `Your bid for ${options.projectTitle} has been selected!`,
      text: `Congratulations ${options.name}! Your bid for the project "${options.projectTitle}" has been selected. Please log in to your account to view the details and start working on the project.`,
      html: `
        <h1>Congratulations ${options.name}!</h1>
        <p>Your bid for the project <strong>${options.projectTitle}</strong> has been selected.</p>
        <p>Please log in to your account to view the details and start working on the project.</p>
        <p>Thank you for using our platform!</p>
      `,
    });
  }

  //  Send project completion notification

  async sendProjectCompletionNotification(options) {
    const subject = `Project ${options.projectTitle} has been completed!`;
    let text, html;

    if (options.role === "buyer") {
      text = `Dear ${options.name}, the project "${options.projectTitle}" has been marked as completed. Please log in to your account to leave a review for the seller.`;
      html = `
        <h1>Project Completed!</h1>
        <p>Dear ${options.name},</p>
        <p>The project <strong>${options.projectTitle}</strong> has been marked as completed.</p>
        <p>Please log in to your account to leave a review for the seller.</p>
        <p>Thank you for using our platform!</p>
      `;
    } else {
      text = `Congratulations ${options.name}! The project "${options.projectTitle}" has been marked as completed. The buyer has accepted your deliverables.`;
      html = `
        <h1>Project Completed!</h1>
        <p>Congratulations ${options.name}!</p>
        <p>The project <strong>${options.projectTitle}</strong> has been marked as completed.</p>
        <p>The buyer has accepted your deliverables.</p>
        <p>Thank you for using our platform!</p>
      `;
    }

    return this.sendEmail({
      to: options.email,
      subject,
      text,
      html,
    });
  }
}

module.exports = new EmailService();
