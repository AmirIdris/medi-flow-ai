import { getUserProfile } from "@/actions/user-action";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const profileResult = await getUserProfile();
  
  if (!profileResult.success) {
    redirect("/sign-in");
  }
  
  const { user } = profileResult;
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold">Account Information</h2>
          
          <div className="flex items-center space-x-4">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-16 h-16",
                },
              }}
            />
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">
              Member since {new Date(user?.createdAt || new Date()).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold">Subscription</h2>
          
          <div>
            <p className="text-2xl font-bold text-primary">{user?.plan}</p>
            <p className="text-sm text-muted-foreground mt-1">Current Plan</p>
          </div>
          
          <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Upgrade Plan
          </button>
        </div>
      </div>
      
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data
        </p>
        <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90">
          Delete Account
        </button>
      </div>
    </div>
  );
}
