import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <SignIn 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl",
          },
        }}
      />
    </div>
  );
}
