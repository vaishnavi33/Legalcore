// Head-office contact details shown on the Contact page. Leave a value empty to show a placeholder.
// Branch addresses and phone numbers are edited from the dashboard (Branch details), not here.
export const SITE = {
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || "",
  hours: "Monday to Saturday, 9:30 am to 6:30 pm",
};
