"use client";

import Link from "next/link";

import { GoogleButton } from "@/components/buttons/auth/google";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
};

export function AuthForm({ mode }: AuthFormProps) {
  const isSignUp = mode === "sign-up";
  const { isLoading, signInForm, signUpForm, handleSignIn, handleSignUp } = useAuth();
  const form = isSignUp ? signUpForm : signInForm;
  const errors = form.formState.errors;
  const inputClass = "h-9 bg-background";

  return (
    <div className="w-full max-w-[430px]">
      <Card className="rounded-lg border-border bg-card shadow-xl shadow-black/5 dark:shadow-black/35">
        <CardContent className="p-8">
          <div className="mb-5 space-y-1.5">
            <h1 className="text-xl font-semibold text-foreground">
              {isSignUp ? "Create a S2C Account" : "Sign in to S2C"}
            </h1>
            <p className="text-sm leading-5 text-muted-foreground">
              {isSignUp ? "Welcome! Create an account to get started" : "Welcome back! Sign in to continue"}
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={isSignUp ? signUpForm.handleSubmit(handleSignUp) : signInForm.handleSubmit(handleSignIn)}
          >
            {isSignUp ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-xs text-muted-foreground">
                      Firstname
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      className={cn(inputClass, signUpForm.formState.errors.firstName && "border-destructive")}
                      {...signUpForm.register("firstName")}
                    />
                    {signUpForm.formState.errors.firstName && (
                      <p className="text-xs text-destructive">{signUpForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-xs text-muted-foreground">
                      Lastname
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      className={cn(inputClass, signUpForm.formState.errors.lastName && "border-destructive")}
                      {...signUpForm.register("lastName")}
                    />
                    {signUpForm.formState.errors.lastName && (
                      <p className="text-xs text-destructive">{signUpForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-xs text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    className={cn(inputClass, signUpForm.formState.errors.email && "border-destructive")}
                    {...signUpForm.register("email")}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.email.message}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={cn(inputClass, signInForm.formState.errors.email && "border-destructive")}
                  {...signInForm.register("email")}
                />
                {signInForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{signInForm.formState.errors.email.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="password" className="text-xs text-muted-foreground">
                  Password
                </Label>
                {!isSignUp && (
                  <Link href="#" className="text-xs text-muted-foreground transition hover:text-foreground">
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className={cn(inputClass, errors.password && "border-destructive")}
                {...(isSignUp ? signUpForm.register("password") : signInForm.register("password"))}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {errors.root && <p className="text-center text-xs text-destructive">{errors.root.message}</p>}

            <Button type="submit" disabled={isLoading} className="h-9 w-full">
              {isLoading ? (
                <>
                  <Spinner />
                  {isSignUp ? "Creating account" : "Signing in"}
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium text-muted-foreground">Or continue with</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-3">
            <GoogleButton />
          </div>
        </CardContent>
      </Card>

      <div className="mt-3 rounded-lg border bg-card px-6 py-4 text-center text-xs text-muted-foreground shadow-sm">
        {isSignUp ? "Have an account?" : "Don't have an account?"}{" "}
        <Link href={isSignUp ? "/sign-in" : "/sign-up"} className="font-medium text-foreground hover:underline">
          {isSignUp ? "Sign in" : "Sign up"}
        </Link>
      </div>
    </div>
  );
}
