const postmark = require("postmark");

const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

exports.sendEmail = async (emailAddress, TemplateId, variables) => {
  try {
    await client.sendEmailWithTemplate({
      From: "bhavyamodhiya@theslayeraa.com",
      To: emailAddress,
      TemplateId: TemplateId,
      TemplateModel: variables,
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
