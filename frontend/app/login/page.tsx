import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Sign In" };

export default function Login() {
  return <AuthForm mode="login" />;
}
