import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Create Account" };

export default function Register() {
  return <AuthForm mode="register" />;
}
