const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email notification for new contact form submission
const sendContactNotification = async (contactData) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `New Contact Form Submission - ${contactData.productQuestion}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #007bff; margin-top: 0;">Contact Information</h3>
            <p><strong>Name:</strong> ${contactData.name}</p>
            <p><strong>Email:</strong> ${contactData.email}</p>
            <p><strong>Phone:</strong> ${contactData.phoneNumber}</p>
            <p><strong>Product Question:</strong> ${contactData.productQuestion}</p>
          </div>
          
          <div style="background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px;">
            <h3 style="color: #007bff; margin-top: 0;">Message</h3>
            <p style="line-height: 1.6;">${contactData.message}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 5px;">
            <p style="margin: 0; font-size: 12px; color: #6c757d;">
              <strong>Submitted:</strong> ${new Date(contactData.createdAt).toLocaleString()}<br>
              <strong>IP Address:</strong> ${contactData.ipAddress || 'N/A'}<br>
              <strong>Source:</strong> ${contactData.source}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 12px;">
              This is an automated notification from your contact form system.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Contact notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending contact notification email:', error);
    return false;
  }
};

// Send confirmation email to the user
const sendContactConfirmation = async (contactData) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: contactData.email,
      subject: 'Thank you for contacting us!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Thank You for Your Message!
          </h2>
          
          <p>Dear ${contactData.name},</p>
          
          <p>Thank you for reaching out to us regarding <strong>${contactData.productQuestion}</strong>. 
          We have received your message and will get back to you within 24-48 hours.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #007bff; margin-top: 0;">Your Message Summary</h3>
            <p><strong>Subject:</strong> ${contactData.productQuestion}</p>
            <p><strong>Submitted:</strong> ${new Date(contactData.createdAt).toLocaleString()}</p>
          </div>
          
          <p>If you have any urgent questions, please don't hesitate to contact us directly.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 12px;">
              Best regards,<br>
              Your Company Team
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Contact confirmation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending contact confirmation email:', error);
    return false;
  }
};

module.exports = {
  sendContactNotification,
  sendContactConfirmation
};