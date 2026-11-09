// Head-office contact details shown on the Contact page. Leave a value empty to show a placeholder.
// Branch addresses and phone numbers are edited from the dashboard (Branch details), not here.
export const SITE = {
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || "",
  hours: process.env.NEXT_PUBLIC_CONTACT_HOURS || "",
  grievanceOfficer: process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER || "",
  grievanceEmail: process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL || "",
};
