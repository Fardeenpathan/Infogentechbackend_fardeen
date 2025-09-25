const Contact = require('../models/Contact');

const { sendContactNotification, sendContactConfirmation } = require('../utils/emailService');

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
const submitContactForm = async (req, res, next) => {

  try {
    const { name, email, phoneNumber, productQuestion, message, captcha } = req.body;

    if (!captcha) {
      return res.status(400).json({ success: false, message: "Captcha is required" });
    }

    const captchaRes = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captcha}`,
    });

    const captchaData = await captchaRes.json();

    if (!captchaData.success) {
      return res.status(400).json({ success: false, message: "Captcha verification failed" });
    }

    const ipAddress =
      req.headers["x-forwarded-for"] 
      req.connection?.remoteAddress 
      req.socket?.remoteAddress ||
      (req.connection?.socket ? req.connection.socket.remoteAddress : null);

    const userAgent = req.headers["user-agent"];

    const contact = await Contact.create({
      name,
      email,
      phoneNumber,
      productQuestion,
      message,
      ipAddress,
      userAgent,
      source: "website",
    });

    // console.log("New contact form submission:", contact);

    res.status(201).json({
      success: true,
      message: "Contact form submitted successfully. We will get back to you soon!",
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        productQuestion: contact.productQuestion,
        status: contact.status,
        createdAt: contact.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitContactForm
};